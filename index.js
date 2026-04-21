import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
import { createClient } from "@supabase/supabase-js";
import twilio from "twilio";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
// Serve static frontend files (optional – you can also use a separate HTML file)
app.use(express.static(path.join(__dirname, "public")));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

/* =========================
   SUPABASE
========================= */
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

/* =========================
   TWILIO (optional)
========================= */
let smsClient = null;
if (process.env.TWILIO_SID && process.env.TWILIO_AUTH) {
  smsClient = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH);
}

/* =========================
   ACTIVE AUCTIONS (memory layer)
========================= */
const auctions = new Map(); // leadId -> auction object

/* =========================
   HELPER: Start auction
========================= */
function startAuction(leadId, city) {
  const durationMs = 60 * 1000; // 60 seconds

  auctions.set(leadId, {
    city,
    status: "live",
    highestBid: 0,
    winner: null,
    bids: [],
    expiresAt: Date.now() + durationMs
  });

  // Notify all contractors in that city
  io.to(city).emit("auction_started", {
    leadId,
    expiresAt: Date.now() + durationMs
  });

  // Schedule auction closing
  setTimeout(() => closeAuction(leadId), durationMs);
}

/* =========================
   CLOSE AUCTION & PERSIST
========================= */
async function closeAuction(leadId) {
  const auction = auctions.get(leadId);
  if (!auction || auction.status !== "live") return;

  auction.status = "closed";
  const winnerId = auction.winner;
  const finalPrice = auction.highestBid;

  // Update Supabase lead record
  await supabase
    .from("leads")
    .update({
      status: "sold",
      final_price: finalPrice,
      winner: winnerId,
      closed_at: new Date().toISOString()
    })
    .eq("id", leadId);

  // Notify all contractors in the city
  io.to(auction.city).emit("auction_closed", {
    leadId,
    winnerId: winnerId || "none",
    price: finalPrice
  });

  // Optional: send SMS to winner (if Twilio configured and winner's phone known)
  if (winnerId && smsClient) {
    try {
      // You would fetch contractor phone from a 'contractors' table
      // This is a placeholder – implement as needed
      const { data: contractor } = await supabase
        .from("contractors")
        .select("phone")
        .eq("id", winnerId)
        .single();
      if (contractor?.phone) {
        await smsClient.messages.create({
          body: `🏆 You won lead ${leadId} for $${finalPrice}! Contact the customer now.`,
          from: process.env.TWILIO_PHONE,
          to: contractor.phone
        });
      }
    } catch (err) {
      console.error("SMS failed:", err.message);
    }
  }

  // Clean up from memory after 1 minute
  setTimeout(() => auctions.delete(leadId), 60000);
}

/* =========================
   API: Create lead & start auction
========================= */
app.post("/lead", async (req, res) => {
  try {
    const {
      name,
      contact,
      postalCode,
      service = "roof inspection",
      city = "unknown"
    } = req.body;

    if (!name || !contact || !postalCode) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }

    const leadId = uuidv4();

    const lead = {
      id: leadId,
      name,
      contact,
      postal_code: postalCode,
      service,
      city,
      status: "auction",
      created_at: new Date().toISOString()
    };

    const { error } = await supabase.from("leads").insert([lead]);
    if (error) throw error;

    // Start auction in memory and broadcast
    startAuction(leadId, city);

    return res.json({
      success: true,
      leadId,
      message: "Auction started"
    });
  } catch (err) {
    console.error("Lead creation error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* =========================
   API: Get auction status (for debugging)
========================= */
app.get("/auction/:leadId", (req, res) => {
  const auction = auctions.get(req.params.leadId);
  if (!auction) return res.status(404).json({ error: "Auction not found" });
  res.json(auction);
});

/* =========================
   SOCKET.IO CONNECTION HANDLER
========================= */
io.on("connection", (socket) => {
  console.log(`🟢 Contractor connected: ${socket.id}`);

  // Join a city room
  socket.on("join_city", (city) => {
    if (!city) return;
    socket.join(city);
    console.log(`📍 ${socket.id} joined city: ${city}`);
    socket.emit("city_joined", { city, status: "ok" });
  });

  // Place a bid
  socket.on("bid", async ({ leadId, contractorId, amount }) => {
    const auction = auctions.get(leadId);
    if (!auction) {
      socket.emit("bid_error", { message: "Auction not active" });
      return;
    }
    if (auction.status !== "live") {
      socket.emit("bid_error", { message: "Auction already closed" });
      return;
    }
    if (amount <= auction.highestBid) {
      socket.emit("bid_error", { message: `Bid must be > $${auction.highestBid}` });
      return;
    }

    // Update auction state
    auction.highestBid = amount;
    auction.winner = contractorId;
    auction.bids.push({
      contractorId,
      amount,
      timestamp: Date.now()
    });

    // Broadcast to everyone in the same city
    io.to(auction.city).emit("new_bid", {
      leadId,
      highestBid: amount,
      contractorId
    });

    console.log(`💰 New bid on ${leadId}: $${amount} by ${contractorId}`);
  });

  socket.on("disconnect", () => {
    console.log(`🔴 Contractor disconnected: ${socket.id}`);
  });
});

/* =========================
   HEALTH CHECK & FRONTEND ROUTING
========================= */
app.get("/", (req, res) => {
  // If you have an index.html in /public, serve it
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", system: "NorthSky Auction Engine", timestamp: new Date().toISOString() });
});

/* =========================
   START SERVER
========================= */
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Auction Engine running on http://localhost:${PORT}`);
  console.log(`   - WebSocket ready for contractors`);
  console.log(`   - POST /lead to create auctions`);
});