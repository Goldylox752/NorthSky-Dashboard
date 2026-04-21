import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// ---------- In‑Memory Data Stores ----------
const leads = [];        // { id, name, contact, postalCode, service, city, status, createdAt, highestBid, winner, forSale, salePrice, soldTo, soldAt }
const bids = [];         // { id, leadId, contractorId, amount, timestamp }
const contractors = new Map(); // socketId -> { id, city, status, lastSeen }
const auctions = new Map(); // leadId -> { city, status, highestBid, winner, bids, expiresAt }

// Helper: update lead record with latest auction data
function updateLeadFromAuction(leadId) {
  const auction = auctions.get(leadId);
  if (!auction) return;
  const lead = leads.find(l => l.id === leadId);
  if (lead) {
    lead.status = auction.status === "live" ? "active" : "closed";
    lead.highestBid = auction.highestBid;
    lead.winner = auction.winner;
  }
}

function startAuction(leadId, city) {
  const durationMs = 60 * 1000;
  auctions.set(leadId, {
    city,
    status: "live",
    highestBid: 0,
    winner: null,
    bids: [],
    expiresAt: Date.now() + durationMs,
  });
  const lead = leads.find(l => l.id === leadId);
  if (lead) lead.status = "active";
  io.to(city).emit("auction_started", { leadId, expiresAt: Date.now() + durationMs });
  setTimeout(() => closeAuction(leadId), durationMs);
}

function closeAuction(leadId) {
  const auction = auctions.get(leadId);
  if (!auction || auction.status !== "live") return;
  auction.status = "closed";
  updateLeadFromAuction(leadId);
  io.to(auction.city).emit("auction_closed", {
    leadId,
    winnerId: auction.winner || "none",
    price: auction.highestBid,
  });
  setTimeout(() => auctions.delete(leadId), 60000);
}

// ---------- REST Endpoints ----------
// Get all leads (admin)
app.get("/api/leads", (req, res) => {
  res.json(leads);
});

// Get leads that are for sale (public for contractors)
app.get("/api/leads/for-sale", (req, res) => {
  const forSaleLeads = leads.filter(l => l.forSale === true && !l.soldTo);
  res.json(forSaleLeads);
});

// Get all bids
app.get("/api/bids", (req, res) => {
  res.json(bids);
});

// Get online contractors
app.get("/api/contractors", (req, res) => {
  const online = Array.from(contractors.values()).filter(c => c.status === "online");
  res.json(online);
});

// Create a new lead (also starts auction)
app.post("/api/leads", (req, res) => {
  const { name, contact, postalCode, service = "roof inspection", city = "unknown" } = req.body;
  if (!name || !contact || !postalCode) {
    return res.status(400).json({ success: false, error: "Missing fields" });
  }
  const leadId = uuidv4();
  const newLead = {
    id: leadId,
    name,
    contact,
    postalCode,
    service,
    city,
    status: "active",
    createdAt: new Date().toISOString(),
    highestBid: 0,
    winner: null,
    forSale: false,
    salePrice: null,
    soldTo: null,
    soldAt: null,
  };
  leads.unshift(newLead);
  startAuction(leadId, city);
  res.json({ success: true, leadId });
});

// Mark a lead as for sale (or remove from sale)
app.post("/api/leads/:id/set-for-sale", (req, res) => {
  const { id } = req.params;
  const { forSale, price } = req.body;
  const lead = leads.find(l => l.id === id);
  if (!lead) {
    return res.status(404).json({ success: false, error: "Lead not found" });
  }
  if (forSale === true) {
    if (!price || price <= 0) {
      return res.status(400).json({ success: false, error: "Valid price required" });
    }
    lead.forSale = true;
    lead.salePrice = price;
  } else {
    lead.forSale = false;
    lead.salePrice = null;
  }
  res.json({ success: true, lead });
});

// Purchase a lead (contractor buys instantly)
app.post("/api/leads/:id/purchase", (req, res) => {
  const { id } = req.params;
  const { contractorId, paymentMethod } = req.body; // paymentMethod can be "stripe" or "mock"
  const lead = leads.find(l => l.id === id);
  if (!lead) {
    return res.status(404).json({ success: false, error: "Lead not found" });
  }
  if (!lead.forSale) {
    return res.status(400).json({ success: false, error: "Lead not available for sale" });
  }
  if (lead.soldTo) {
    return res.status(400).json({ success: false, error: "Lead already sold" });
  }
  if (!contractorId) {
    return res.status(400).json({ success: false, error: "Contractor ID required" });
  }

  // In a real implementation, you would integrate Stripe here.
  // For now, we simulate successful payment.
  // Example Stripe integration would create a PaymentIntent and confirm.
  
  // Mark as sold
  lead.soldTo = contractorId;
  lead.soldAt = new Date().toISOString();
  lead.forSale = false; // once sold, remove from store
  // Optionally close any active auction for this lead
  if (auctions.has(lead.id)) {
    closeAuction(lead.id);
  }
  // Return lead contact info to buyer
  res.json({
    success: true,
    lead: {
      id: lead.id,
      name: lead.name,
      contact: lead.contact,
      service: lead.service,
      postalCode: lead.postalCode,
      price: lead.salePrice,
    },
  });
});

// Force close an auction (admin)
app.post("/api/auctions/close/:leadId", (req, res) => {
  const { leadId } = req.params;
  const auction = auctions.get(leadId);
  if (!auction) {
    return res.status(404).json({ success: false, error: "Auction not found" });
  }
  if (auction.status !== "live") {
    return res.status(400).json({ success: false, error: "Auction already closed" });
  }
  closeAuction(leadId);
  res.json({ success: true, message: "Auction force closed" });
});

// Legacy endpoint for contractor dashboard (compatibility)
app.post("/lead", (req, res) => {
  const { name, contact, postalCode, service, city } = req.body;
  if (!name || !contact || !postalCode) {
    return res.status(400).json({ success: false, error: "Missing fields" });
  }
  const leadId = uuidv4();
  const newLead = {
    id: leadId,
    name,
    contact,
    postalCode,
    service: service || "roof inspection",
    city: city || "unknown",
    status: "active",
    createdAt: new Date().toISOString(),
    highestBid: 0,
    winner: null,
    forSale: false,
    salePrice: null,
    soldTo: null,
    soldAt: null,
  };
  leads.unshift(newLead);
  startAuction(leadId, newLead.city);
  res.json({ success: true, leadId });
});

// ---------- Socket.io Events ----------
io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on("join_city", (city) => {
    if (!city) return;
    const contractorId = socket.id;
    contractors.set(socket.id, {
      id: contractorId,
      city,
      status: "online",
      lastSeen: Date.now(),
    });
    socket.join(city);
    socket.emit("joined", { city, contractorId });
  });

  socket.on("bid", ({ leadId, contractorId, amount }) => {
    const auction = auctions.get(leadId);
    if (!auction || auction.status !== "live") {
      socket.emit("bid_error", { message: "No active auction for this lead" });
      return;
    }
    if (amount <= auction.highestBid) {
      socket.emit("bid_error", { message: `Bid must be > $${auction.highestBid}` });
      return;
    }
    auction.highestBid = amount;
    auction.winner = contractorId;
    auction.bids.push({ contractorId, amount, timestamp: Date.now() });
    bids.push({
      id: uuidv4(),
      leadId,
      contractorId,
      amount,
      timestamp: Date.now(),
    });
    updateLeadFromAuction(leadId);
    io.to(auction.city).emit("new_bid", { leadId, highestBid: amount, contractorId });
  });

  socket.on("disconnect", () => {
    console.log(`Socket disconnected: ${socket.id}`);
    contractors.delete(socket.id);
  });
});

// Serve static pages (admin panel and auction OS)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));