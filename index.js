<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>NorthSky · Real‑Time Lead Auction Marketplace</title>
  <script src="https://cdn.socket.io/4.7.5/socket.io.min.js"></script>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    :root {
      --bg: #0a0c12;
      --surface: #11131c;
      --surface-hover: #181c28;
      --text: #edf2f8;
      --text-muted: #8e9aaf;
      --border: rgba(255, 255, 255, 0.06);
      --accent: #2dd4bf;
      --accent-dark: #14b8a6;
      --good: #22c55e;
      --warn: #f59e0b;
      --gradient: linear-gradient(135deg, #0f172a 0%, #020617 100%);
    }

    body {
      background: var(--gradient);
      color: var(--text);
      font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
      line-height: 1.5;
      padding: 2rem 1rem;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
    }

    .header {
      text-align: center;
      margin-bottom: 3rem;
    }

    .badge {
      display: inline-block;
      background: rgba(45, 212, 191, 0.12);
      backdrop-filter: blur(4px);
      padding: 0.3rem 1rem;
      border-radius: 40px;
      font-size: 0.75rem;
      font-weight: 500;
      letter-spacing: 0.5px;
      color: var(--accent);
      border: 1px solid rgba(45, 212, 191, 0.3);
      margin-bottom: 1rem;
    }

    h1 {
      font-size: 2.5rem;
      font-weight: 700;
      background: linear-gradient(to right, #fff, #94a3b8);
      background-clip: text;
      -webkit-background-clip: text;
      color: transparent;
    }

    .sub {
      color: var(--text-muted);
      margin-top: 0.5rem;
      font-size: 1rem;
    }

    /* Two column layout */
    .marketplace-grid {
      display: grid;
      grid-template-columns: 1fr 1.2fr;
      gap: 1.8rem;
      margin-bottom: 2.5rem;
    }

    @media (max-width: 900px) {
      .marketplace-grid {
        grid-template-columns: 1fr;
      }
    }

    /* Cards */
    .card {
      background: rgba(17, 19, 28, 0.7);
      backdrop-filter: blur(12px);
      border: 1px solid var(--border);
      border-radius: 1.8rem;
      padding: 1.6rem;
      transition: all 0.2s ease;
    }

    .card-header {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      margin-bottom: 1.5rem;
      font-weight: 600;
      font-size: 1.25rem;
      border-bottom: 1px solid var(--border);
      padding-bottom: 0.75rem;
    }

    .form-group {
      margin-bottom: 1.2rem;
    }

    label {
      display: block;
      font-size: 0.85rem;
      font-weight: 500;
      color: var(--text-muted);
      margin-bottom: 0.3rem;
    }

    input, select {
      width: 100%;
      padding: 0.8rem 1rem;
      background: #0b0e17;
      border: 1px solid var(--border);
      border-radius: 1rem;
      color: white;
      font-size: 0.95rem;
      transition: 0.2s;
    }

    input:focus, select:focus {
      outline: none;
      border-color: var(--accent);
      box-shadow: 0 0 0 2px rgba(45, 212, 191, 0.2);
    }

    button {
      width: 100%;
      padding: 0.9rem;
      background: var(--accent);
      border: none;
      border-radius: 1.2rem;
      font-weight: 700;
      font-size: 1rem;
      color: #020617;
      cursor: pointer;
      transition: 0.15s;
      margin-top: 0.5rem;
    }

    button:hover {
      background: var(--accent-dark);
      transform: translateY(-1px);
    }

    button.secondary {
      background: #2d3748;
      color: white;
    }

    button.secondary:hover {
      background: #4a5568;
    }

    .status-panel {
      margin-top: 1.2rem;
      padding: 0.8rem;
      background: rgba(0,0,0,0.3);
      border-radius: 1rem;
      font-size: 0.85rem;
    }

    .connection-status {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      background: #1e293b;
      padding: 0.25rem 0.8rem;
      border-radius: 30px;
      font-size: 0.7rem;
      font-weight: 600;
    }

    .auction-info {
      background: rgba(45, 212, 191, 0.05);
      border-radius: 1rem;
      padding: 0.8rem;
      margin-bottom: 1rem;
    }

    .bid-row {
      display: flex;
      gap: 0.6rem;
      margin-top: 0.5rem;
    }

    .bid-row input {
      flex: 1;
    }

    .bid-row button {
      width: auto;
      padding: 0 1.2rem;
      margin-top: 0;
    }

    .bid-history {
      margin-top: 1rem;
      font-size: 0.8rem;
      color: var(--text-muted);
      max-height: 180px;
      overflow-y: auto;
    }

    .bid-item {
      padding: 0.4rem 0;
      border-bottom: 1px solid var(--border);
    }

    .highlight {
      color: var(--accent);
      font-weight: 700;
    }

    .timer {
      font-family: monospace;
      font-size: 1.2rem;
      font-weight: 800;
      color: var(--warn);
    }

    .flex-between {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    /* Ecosystem */
    .ecosystem-section {
      margin-top: 2rem;
      padding-top: 1rem;
      border-top: 1px solid var(--border);
    }

    .ecosystem-title {
      font-size: 1.5rem;
      font-weight: 600;
      margin-bottom: 1.5rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .ecosystem-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 1.2rem;
    }

    .ecosystem-card {
      background: rgba(17, 19, 28, 0.7);
      backdrop-filter: blur(8px);
      border: 1px solid var(--border);
      border-radius: 1.5rem;
      padding: 1.2rem;
      transition: all 0.2s ease;
      text-decoration: none;
      color: var(--text);
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .ecosystem-card:hover {
      border-color: var(--accent);
      transform: translateY(-3px);
      background: rgba(45, 212, 191, 0.08);
    }

    .ecosystem-name {
      font-weight: 700;
      font-size: 1.1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .ecosystem-desc {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .live-badge-sm {
      background: var(--good);
      color: #020617;
      font-size: 0.6rem;
      padding: 0.2rem 0.5rem;
      border-radius: 30px;
      font-weight: 700;
    }

    .footer {
      text-align: center;
      margin-top: 2rem;
      font-size: 0.75rem;
      color: var(--text-muted);
    }
  </style>
</head>
<body>
<div class="container">
  <div class="header">
    <div class="badge">⚡ REAL‑TIME AI LEAD MARKETPLACE + ECOSYSTEM</div>
    <h1>NorthSky Auction OS</h1>
    <div class="sub">Homeowners generate leads → Contractors bid live for high‑value links</div>
  </div>

  <div class="marketplace-grid">
    <!-- LEFT: Homeowner Lead Form -->
    <div class="card">
      <div class="card-header">
        <span>🏠</span> New Lead Request
      </div>
      <div class="form-group">
        <label>Full name</label>
        <input type="text" id="leadName" placeholder="John Carter">
      </div>
      <div class="form-group">
        <label>Phone / Email</label>
        <input type="text" id="leadContact" placeholder="+1 (587) 123-4567">
      </div>
      <div class="form-group">
        <label>Postal code</label>
        <input type="text" id="leadPostal" placeholder="T2X 1A1">
      </div>
      <div class="form-group">
        <label>Service needed</label>
        <select id="leadService">
          <option value="roof inspection">Roof inspection</option>
          <option value="leak check">Leak check</option>
          <option value="insurance claim">Insurance claim</option>
          <option value="full replacement">Full replacement</option>
        </select>
      </div>
      <button id="submitLeadBtn">✨ Generate Lead & Start Auction</button>
      <div class="status-panel" id="leadStatus">
        <span>📡 Ready – submit a lead to open a 60s auction.</span>
      </div>
    </div>

    <!-- RIGHT: Contractor Bidding Console -->
    <div class="card">
      <div class="card-header">
        <span>🔨</span> Live Contractor Auction
        <span style="margin-left: auto;" id="socketStatus" class="connection-status">⚪ Disconnected</span>
      </div>
      
      <!-- Contractor identity & city -->
      <div class="form-group">
        <label>Your contractor ID</label>
        <input type="text" id="contractorId" placeholder="e.g., RooferPro_42">
      </div>
      <div class="form-group">
        <label>Your city (market)</label>
        <input type="text" id="cityName" placeholder="Calgary, Edmonton, Austin..." value="Calgary">
      </div>
      <button id="joinMarketBtn" class="secondary">🌍 Join Auction Market</button>

      <div id="auctionPanel" style="margin-top: 1.5rem;">
        <div class="auction-info" id="currentLeadInfo">
          <span style="color:#8e9aaf;">💡 No active auction. Submit a lead or wait for one.</span>
        </div>

        <div id="bidControls" style="display: none;">
          <div class="bid-row">
            <input type="number" id="bidAmount" placeholder="Your bid $" step="10" min="0">
            <button id="placeBidBtn">💰 Bid</button>
          </div>
          <div id="bidFeedback" style="font-size:0.75rem; margin-top: 6px;"></div>
        </div>

        <div class="bid-history" id="bidHistoryList">
          <div class="bid-item">⏳ No bids yet — be the first!</div>
        </div>
      </div>
    </div>
  </div>

  <!-- NORTHSKY ECOSYSTEM SHOWCASE -->
  <div class="ecosystem-section">
    <div class="ecosystem-title">
      <span>🌌</span> NorthSky Ecosystem
      <span style="font-size: 0.7rem; background: #1e293b; padding: 0.2rem 0.6rem; border-radius: 30px;">All live tools</span>
    </div>
    <div class="ecosystem-grid">
      <a href="https://north-sky-ai.vercel.app/" target="_blank" rel="noopener noreferrer" class="ecosystem-card">
        <div class="ecosystem-name">
          <span>🧠</span> NorthSky AI
          <span class="live-badge-sm">LIVE</span>
        </div>
        <div class="ecosystem-desc">AI lead scoring & conversion layer</div>
      </a>
      <a href="https://northsky-drones.vercel.app" target="_blank" rel="noopener noreferrer" class="ecosystem-card">
        <div class="ecosystem-name">
          <span>🚁</span> NorthSky Drones
          <span class="live-badge-sm">LIVE</span>
        </div>
        <div class="ecosystem-desc">Aerial inspection & imaging platform</div>
      </a>
      <a href="https://goldylox752.github.io/RoofFlow-AI/" target="_blank" rel="noopener noreferrer" class="ecosystem-card">
        <div class="ecosystem-name">
          <span>🏠</span> RoofFlow AI
          <span class="live-badge-sm">LIVE</span>
        </div>
        <div class="ecosystem-desc">Roofing lead engine + automated funnels</div>
      </a>
      <a href="https://north-sky-utilities.vercel.app" target="_blank" rel="noopener noreferrer" class="ecosystem-card">
        <div class="ecosystem-name">
          <span>⚙️</span> NorthSky Utilities
          <span class="live-badge-sm">LIVE</span>
        </div>
        <div class="ecosystem-desc">Contractor tools & operational suite</div>
      </a>
      <a href="https://contractor-dashboard-ten.vercel.app" target="_blank" rel="noopener noreferrer" class="ecosystem-card">
        <div class="ecosystem-name">
          <span>📊</span> Contractor Dashboard
          <span class="live-badge-sm">LIVE</span>
        </div>
        <div class="ecosystem-desc">Real‑time bid management & analytics</div>
      </a>
    </div>
  </div>

  <div class="footer">
    ⚡ Powered by NorthSky AI | Real‑time WebSocket auctions | Bids final when timer ends
  </div>
</div>

<script>
  // ---------- GLOBALS ----------
  let socket = null;
  let contractorId = "";
  let currentCity = "";
  let activeLeadId = null;
  let expiresAt = null;
  let timerInterval = null;
  let currentHighestBid = 0;

  // DOM elements
  const socketStatusSpan = document.getElementById("socketStatus");
  const contractorIdInput = document.getElementById("contractorId");
  const cityNameInput = document.getElementById("cityName");
  const joinMarketBtn = document.getElementById("joinMarketBtn");
  const submitLeadBtn = document.getElementById("submitLeadBtn");
  const leadNameInput = document.getElementById("leadName");
  const leadContactInput = document.getElementById("leadContact");
  const leadPostalInput = document.getElementById("leadPostal");
  const leadServiceSelect = document.getElementById("leadService");
  const leadStatusDiv = document.getElementById("leadStatus");
  const currentLeadInfoDiv = document.getElementById("currentLeadInfo");
  const bidControlsDiv = document.getElementById("bidControls");
  const bidAmountInput = document.getElementById("bidAmount");
  const placeBidBtn = document.getElementById("placeBidBtn");
  const bidFeedbackSpan = document.getElementById("bidFeedback");
  const bidHistoryList = document.getElementById("bidHistoryList");

  // Helper: add bid history entry
  function addBidHistory(bidder, amount, isNew = true) {
    const entry = document.createElement("div");
    entry.className = "bid-item";
    entry.innerHTML = `💰 <strong>${escapeHtml(bidder)}</strong> – $${amount.toFixed(2)} <span style="font-size:0.7rem;">(just now)</span>`;
    if (isNew) {
      bidHistoryList.prepend(entry);
    } else {
      bidHistoryList.appendChild(entry);
    }
    // keep last 15 bids
    while (bidHistoryList.children.length > 15) bidHistoryList.removeChild(bidHistoryList.lastChild);
  }

  function clearBidHistory() {
    bidHistoryList.innerHTML = '<div class="bid-item">⏳ No bids yet — be the first!</div>';
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
      if (m === '&') return '&amp;';
      if (m === '<') return '&lt;';
      if (m === '>') return '&gt;';
      return m;
    });
  }

  // Timer updater
  function startTimerUpdater() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      if (!expiresAt) {
        const timerElem = document.querySelector("#currentLeadInfo .timer");
        if (timerElem) timerElem.innerText = "—";
        return;
      }
      const diff = expiresAt - Date.now();
      if (diff <= 0) {
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = null;
        const timerElem = document.querySelector("#currentLeadInfo .timer");
        if (timerElem) timerElem.innerText = "CLOSED";
        return;
      }
      const seconds = Math.floor(diff / 1000);
      const timerElem = document.querySelector("#currentLeadInfo .timer");
      if (timerElem) timerElem.innerText = `${seconds}s`;
    }, 500);
  }

  // Update auction UI based on current state
  function updateAuctionUI() {
    if (!activeLeadId) {
      currentLeadInfoDiv.innerHTML = `<span style="color:#8e9aaf;">💡 No active auction. Submit a lead or wait for one.</span>`;
      bidControlsDiv.style.display = "none";
      return;
    }

    bidControlsDiv.style.display = "block";
    const timeDisplay = expiresAt ? (expiresAt - Date.now() > 0 ? `${Math.floor((expiresAt - Date.now()) / 1000)}s` : "CLOSED") : "—";
    currentLeadInfoDiv.innerHTML = `
      <div class="flex-between">
        <strong>📌 Lead ID:</strong> <span>${activeLeadId.slice(0,8)}...</span>
        <strong>💰 Highest bid:</strong> <span class="highlight">$${currentHighestBid.toFixed(2)}</span>
        <strong>⏱️ Timer:</strong> <span class="timer">${timeDisplay}</span>
      </div>
    `;
    startTimerUpdater();
  }

  // Socket event handlers
  function initSocket() {
    // Connect to the same origin (where backend serves this page)
    socket = io({ transports: ["websocket", "polling"] });

    socket.on("connect", () => {
      socketStatusSpan.innerHTML = "🟢 Connected";
      socketStatusSpan.style.background = "#22c55e20";
      socketStatusSpan.style.border = "1px solid #22c55e";
      if (currentCity && contractorId) {
        socket.emit("join_city", currentCity);
      }
    });

    socket.on("disconnect", () => {
      socketStatusSpan.innerHTML = "⚪ Disconnected";
      socketStatusSpan.style.background = "";
      socketStatusSpan.style.border = "";
    });

    // New auction started
    socket.on("auction_started", (data) => {
      activeLeadId = data.leadId;
      expiresAt = data.expiresAt;
      currentHighestBid = 0;
      clearBidHistory();
      updateAuctionUI();
      bidFeedbackSpan.innerHTML = "🆕 New auction opened! Place your bid.";
    });

    // New bid received
    socket.on("new_bid", (data) => {
      if (data.leadId === activeLeadId) {
        currentHighestBid = data.highestBid;
        updateAuctionUI();
        addBidHistory(data.contractorId, data.highestBid, true);
        if (data.contractorId === contractorId) {
          bidFeedbackSpan.innerHTML = "✅ Your bid placed successfully!";
        } else {
          bidFeedbackSpan.innerHTML = `🔔 ${data.contractorId} bid $${data.highestBid}`;
        }
        setTimeout(() => {
          if (bidFeedbackSpan.innerHTML !== "❌ Auction closed") bidFeedbackSpan.innerHTML = "";
        }, 3000);
      }
    });

    // Auction closed
    socket.on("auction_closed", (data) => {
      if (data.leadId === activeLeadId) {
        bidControlsDiv.style.display = "none";
        const winnerText = data.winnerId === contractorId ? "🏆 YOU WON!" : `Winner: ${data.winnerId || "none"}`;
        currentLeadInfoDiv.innerHTML += `<div style="margin-top: 12px; background:#1e293b; padding:8px; border-radius:12px;">🔔 Auction closed. ${winnerText} | Final price: $${data.price}</div>`;
        bidFeedbackSpan.innerHTML = "❌ Auction closed";
        activeLeadId = null;
        expiresAt = null;
        if (timerInterval) clearInterval(timerInterval);
      }
    });

    socket.on("bid_error", (msg) => {
      bidFeedbackSpan.innerHTML = `⚠️ ${msg.message || "Bid rejected"}`;
      setTimeout(() => { if (bidFeedbackSpan.innerHTML !== "❌ Auction closed") bidFeedbackSpan.innerHTML = ""; }, 2500);
    });
  }

  // Join city (contractor)
  function joinMarket() {
    const newContractor = contractorIdInput.value.trim();
    const newCity = cityNameInput.value.trim();
    if (!newContractor || !newCity) {
      alert("Enter contractor ID and city");
      return;
    }
    contractorId = newContractor;
    currentCity = newCity;

    if (!socket || !socket.connected) {
      initSocket();
      socket.once("connect", () => {
        socket.emit("join_city", currentCity);
        socketStatusSpan.innerHTML = "🟢 Connected";
      });
    } else {
      socket.emit("join_city", currentCity);
    }
    localStorage.setItem("northsky_contractor_id", contractorId);
    localStorage.setItem("northsky_city", currentCity);
    bidFeedbackSpan.innerHTML = `Joined market: ${currentCity} as ${contractorId}`;
  }

  // Submit lead (homeowner)
  async function submitLead() {
    const name = leadNameInput.value.trim();
    const contact = leadContactInput.value.trim();
    const postal = leadPostalInput.value.trim();
    const service = leadServiceSelect.value;
    const city = currentCity || cityNameInput.value.trim() || "unknown";

    if (!contact || contact.length < 4) {
      leadStatusDiv.innerHTML = `<span style="color:#f97316;">⚠️ Please provide a valid phone/email.</span>`;
      return;
    }

    leadStatusDiv.innerHTML = `⏳ Creating lead & starting auction...`;
    try {
      const response = await fetch("/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, contact, postalCode: postal, service, city })
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Backend error");

      leadStatusDiv.innerHTML = `✅ Lead created! Auction started. Lead ID: ${data.leadId.slice(0,8)}...<br>City: ${city} | Contractors can now bid.`;
      // Clear form
      leadNameInput.value = "";
      leadContactInput.value = "";
      leadPostalInput.value = "";
    } catch (err) {
      console.error(err);
      leadStatusDiv.innerHTML = `<span style="color:#ef4444;">❌ Error: ${err.message}. Make sure backend is running.</span>`;
    }
  }

  // Place bid
  function placeBid() {
    if (!socket || !socket.connected) {
      bidFeedbackSpan.innerHTML = "⚠️ Socket not connected. Join a city first.";
      return;
    }
    if (!activeLeadId) {
      bidFeedbackSpan.innerHTML = "⚠️ No active auction in your city.";
      return;
    }
    const amount = parseFloat(bidAmountInput.value);
    if (isNaN(amount) || amount <= 0) {
      bidFeedbackSpan.innerHTML = "⚠️ Enter a valid bid amount (>0)";
      return;
    }
    if (amount <= currentHighestBid) {
      bidFeedbackSpan.innerHTML = `⚠️ Bid must exceed $${currentHighestBid.toFixed(2)}`;
      return;
    }
    socket.emit("bid", {
      leadId: activeLeadId,
      contractorId: contractorId,
      amount: amount
    });
    bidAmountInput.value = "";
  }

  // Load saved contractor data
  function loadSavedData() {
    const savedContractor = localStorage.getItem("northsky_contractor_id");
    const savedCity = localStorage.getItem("northsky_city");
    if (savedContractor) contractorIdInput.value = savedContractor;
    if (savedCity) cityNameInput.value = savedCity;
  }

  // Event listeners
  submitLeadBtn.addEventListener("click", submitLead);
  joinMarketBtn.addEventListener("click", joinMarket);
  placeBidBtn.addEventListener("click", placeBid);
  bidAmountInput.addEventListener("keypress", (e) => { if (e.key === "Enter") placeBid(); });

  // Auto-connect on page load if contractor exists
  loadSavedData();
  if (contractorIdInput.value.trim() && cityNameInput.value.trim()) {
    setTimeout(() => joinMarket(), 500);
  } else {
    socketStatusSpan.innerHTML = "⚪ Not joined";
  }
</script>
</body>
</html>