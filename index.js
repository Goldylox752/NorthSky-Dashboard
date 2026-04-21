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

// In-memory auctions
const auctions = new Map();

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
  io.to(city).emit("auction_started", { leadId, expiresAt: Date.now() + durationMs });
  setTimeout(() => closeAuction(leadId), durationMs);
}

function closeAuction(leadId) {
  const auction = auctions.get(leadId);
  if (!auction || auction.status !== "live") return;
  auction.status = "closed";
  io.to(auction.city).emit("auction_closed", {
    leadId,
    winnerId: auction.winner || "none",
    price: auction.highestBid,
  });
  setTimeout(() => auctions.delete(leadId), 60000);
}

app.post("/lead", (req, res) => {
  const { name, contact, postalCode, service = "roof inspection", city = "unknown" } = req.body;
  if (!name || !contact || !postalCode) {
    return res.status(400).json({ success: false, error: "Missing fields" });
  }
  const leadId = uuidv4();
  startAuction(leadId, city);
  res.json({ success: true, leadId });
});

io.on("connection", (socket) => {
  socket.on("join_city", (city) => {
    if (city) socket.join(city);
  });
  socket.on("bid", ({ leadId, contractorId, amount }) => {
    const auction = auctions.get(leadId);
    if (!auction || auction.status !== "live" || amount <= auction.highestBid) {
      socket.emit("bid_error", { message: "Bid rejected" });
      return;
    }
    auction.highestBid = amount;
    auction.winner = contractorId;
    auction.bids.push({ contractorId, amount, timestamp: Date.now() });
    io.to(auction.city).emit("new_bid", { leadId, highestBid: amount, contractorId });
  });
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server on http://localhost:${PORT}`));