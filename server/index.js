require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// --- 1. GAME CONFIGURATION ---
const COMMODITIES = [
    { name: "Gold", basePrice: 2000, total_supply: 50 },
    { name: "Platinum", basePrice: 2800, total_supply: 40 },
    { name: "Oil", basePrice: 800, total_supply: 100 },
    { name: "Silver", basePrice: 1200, total_supply: 80 },
    { name: "Copper", basePrice: 400, total_supply: 150 },
    { name: "Agri", basePrice: 500, total_supply: 200 },
    { name: "Livestock", basePrice: 600, total_supply: 150 },
    { name: "Rare Earth", basePrice: 3000, total_supply: 30 },
];

// Starting net worth target: 30,000 per team
// Cash = 30000 - sum(holdings * basePrice)
const TARGET_NET_WORTH = 30000;

const TEAMS_CONFIG = [
    { id: "usa", name: "USA", password: process.env.PASSWORD_USA,
      startHoldings: { "Gold": 2, "Platinum": 3, "Oil": 3, "Copper": 2 } },
    { id: "china", name: "China", password: process.env.PASSWORD_CHINA,
      startHoldings: { "Rare Earth": 5, "Copper": 4, "Silver": 2, "Agri": 3 } },
    { id: "india", name: "India", password: process.env.PASSWORD_INDIA,
      startHoldings: { "Agri": 5, "Livestock": 2, "Silver": 2, "Copper": 2 } },
    { id: "saudi", name: "Saudi Arabia", password: process.env.PASSWORD_SAUDI,
      startHoldings: { "Oil": 6, "Gold": 2 } },
    { id: "uk", name: "UK", password: process.env.PASSWORD_UK,
      startHoldings: { "Gold": 3, "Platinum": 2, "Silver": 2 } },
    { id: "germany", name: "Germany", password: process.env.PASSWORD_GERMANY,
      startHoldings: { "Silver": 3, "Copper": 3, "Platinum": 2 } },
    { id: "japan", name: "Japan", password: process.env.PASSWORD_JAPAN,
      startHoldings: { "Copper": 4, "Rare Earth": 2, "Silver": 2 } },
    { id: "russia", name: "Russia", password: process.env.PASSWORD_RUSSIA,
      startHoldings: { "Oil": 5, "Gold": 2, "Rare Earth": 2 } },
    { id: "brazil", name: "Brazil", password: process.env.PASSWORD_BRAZIL,
      startHoldings: { "Livestock": 4, "Agri": 3, "Copper": 2 } },
    { id: "france", name: "France", password: process.env.PASSWORD_FRANCE,
      startHoldings: { "Gold": 3, "Agri": 2, "Livestock": 2 } },
    { id: "uae", name: "UAE", password: process.env.PASSWORD_UAE,
      startHoldings: { "Oil": 4, "Gold": 3 } },
    { id: "australia", name: "Australia", password: process.env.PASSWORD_AUSTRALIA,
      startHoldings: { "Rare Earth": 3, "Gold": 2, "Livestock": 2, "Copper": 2 } },
];

// --- BID-ASK SPREAD ENGINE CONFIG ---
const TICK_INTERVAL = 3000;
const PRICE_HISTORY_LENGTH = 100; // 100 ticks * 3s = 5 minutes of history

// Spread: percentage of midPrice. Wider when liquidity is low.
const BASE_SPREAD_PCT = 0.02;       // 2% base spread at full liquidity
const MAX_SPREAD_PCT = 0.15;        // 15% max spread when nearly sold out

// Price impact: how much the midPrice moves per unit traded.
// impact = midPrice * IMPACT_FACTOR * (quantity / available)
// Scarce commodities move more per trade (dividing by available).
const IMPACT_FACTOR = 0.08;         // 8% base impact when buying the last unit

// Price floor: midPrice can't drop below this fraction of the original basePrice
const PRICE_FLOOR_RATIO = 0.10;

// --- NEWS/EVENTS CONFIG (admin-triggered only) ---
const NEWS_EVENTS = [
    { headline: "Gold reserves discovered in West Africa!", commodity: "Gold", multiplier: 0.85, duration: 5 },
    { headline: "Central banks increase gold purchases!", commodity: "Gold", multiplier: 1.20, duration: 4 },
    { headline: "New platinum mine collapses in South Africa!", commodity: "Platinum", multiplier: 1.30, duration: 4 },
    { headline: "Platinum demand drops as EV adoption surges!", commodity: "Platinum", multiplier: 0.80, duration: 5 },
    { headline: "Middle East tensions spike — oil supply disrupted!", commodity: "Oil", multiplier: 1.35, duration: 4 },
    { headline: "New oil fields discovered in the Arctic!", commodity: "Oil", multiplier: 0.75, duration: 5 },
    { headline: "Silver demand surges for solar panel manufacturing!", commodity: "Silver", multiplier: 1.25, duration: 4 },
    { headline: "Massive silver stockpile released by government!", commodity: "Silver", multiplier: 0.80, duration: 4 },
    { headline: "Copper theft wave hits infrastructure projects!", commodity: "Copper", multiplier: 1.20, duration: 3 },
    { headline: "New copper recycling technology reduces demand!", commodity: "Copper", multiplier: 0.85, duration: 4 },
    { headline: "Severe drought devastates global crop yields!", commodity: "Agri", multiplier: 1.40, duration: 5 },
    { headline: "Record harvest season across major producers!", commodity: "Agri", multiplier: 0.75, duration: 4 },
    { headline: "Disease outbreak threatens global livestock!", commodity: "Livestock", multiplier: 1.30, duration: 4 },
    { headline: "Lab-grown meat gains regulatory approval!", commodity: "Livestock", multiplier: 0.80, duration: 5 },
    { headline: "China restricts rare earth exports!", commodity: "Rare Earth", multiplier: 1.40, duration: 4 },
    { headline: "New rare earth deposits found in Scandinavia!", commodity: "Rare Earth", multiplier: 0.80, duration: 5 },
];

// --- 2. GAME STATE ---
let gameState = {
    marketOpen: false,
    commodities: {},
    teams: {},
    tradeLog: [],
    priceHistory: {},
    orderPressure: {},    // cumulative buy/sell volume for sentiment display
    activeEvents: [],
    broadcastNews: [],    // [{ message, timestamp }] admin custom news
    tradeFeed: [],        // [{ message, type, timestamp }] live trade notifications
    tickCount: 0,
};

let tickTimer = null;

function resetGame() {
    gameState.marketOpen = false;
    gameState.tradeLog = [];
    gameState.tickCount = 0;
    gameState.activeEvents = [];
    gameState.broadcastNews = [];
    gameState.tradeFeed = [];

    // Step 1: Reset commodities to base state
    COMMODITIES.forEach(c => {
        gameState.commodities[c.name] = {
            name: c.name,
            basePrice: c.basePrice,
            midPrice: c.basePrice,
            price: c.basePrice,
            askPrice: 0,
            bidPrice: 0,
            spreadPct: BASE_SPREAD_PCT,
            total_supply: c.total_supply,
            available: c.total_supply,
        };
        gameState.priceHistory[c.name] = [c.basePrice];
        gameState.orderPressure[c.name] = { buyVolume: 0, sellVolume: 0 };
    });

    // Step 2: Initialize teams and assign holdings (reduce available supply)
    TEAMS_CONFIG.forEach(t => {
        gameState.teams[t.id] = {
            id: t.id,
            name: t.name,
            cash: 0, // will be set in step 4
            portfolio: {}
        };
        COMMODITIES.forEach(c => gameState.teams[t.id].portfolio[c.name] = 0);

        if (t.startHoldings) {
            Object.entries(t.startHoldings).forEach(([commName, qty]) => {
                const market = gameState.commodities[commName];
                if (market && market.available >= qty) {
                    gameState.teams[t.id].portfolio[commName] = qty;
                    market.available -= qty;
                }
            });
        }
    });

    // Step 3: Recalculate bid/ask with correct available supply
    COMMODITIES.forEach(c => updateBidAsk(c.name));

    // Step 4: Set cash so that cash + sum(holdings * bidPrice) = TARGET exactly
    TEAMS_CONFIG.forEach(t => {
        let holdingsValue = 0;
        Object.entries(gameState.teams[t.id].portfolio).forEach(([commName, qty]) => {
            if (qty > 0) {
                holdingsValue += qty * gameState.commodities[commName].bidPrice;
            }
        });
        gameState.teams[t.id].cash = TARGET_NET_WORTH - holdingsValue;
    });

    if (tickTimer) {
        clearInterval(tickTimer);
        tickTimer = null;
    }

    console.log("GAME RESET TRIGGERED");
}

resetGame();

// --- 3. BID-ASK SPREAD PRICING ENGINE ---

// Calculate the spread percentage based on available liquidity.
// When most supply is available, spread is narrow (BASE_SPREAD_PCT).
// When supply is nearly gone, spread widens toward MAX_SPREAD_PCT.
function calculateSpread(commodity) {
    const { total_supply, available } = commodity;
    if (available <= 0) return MAX_SPREAD_PCT;
    const liquidityRatio = available / total_supply; // 1.0 = full, 0.0 = empty
    // Linear interpolation: full liquidity → base spread, zero → max spread
    return BASE_SPREAD_PCT + (1 - liquidityRatio) * (MAX_SPREAD_PCT - BASE_SPREAD_PCT);
}

// Recalculate bid/ask from the current midPrice.
// midPrice itself only changes when a trade executes or admin triggers a shock.
function updateBidAsk(commodityName) {
    const c = gameState.commodities[commodityName];
    const spreadPct = calculateSpread(c);
    c.spreadPct = spreadPct;

    // Event multiplier affects displayed prices but NOT the stored midPrice
    let eventMult = 1.0;
    for (const event of gameState.activeEvents) {
        if (event.commodity === commodityName) eventMult *= event.multiplier;
    }

    const effectiveMid = c.midPrice * eventMult;
    c.askPrice = Math.round(effectiveMid * (1 + spreadPct / 2));
    c.bidPrice = Math.max(1, Math.round(effectiveMid * (1 - spreadPct / 2)));
    c.price = Math.round(effectiveMid); // displayed "mid" price
}

// Apply price impact from a trade. This is the ONLY thing that moves midPrice.
// Buy  → midPrice goes UP
// Sell → midPrice goes DOWN
// Impact scales with: quantity traded / available liquidity
function applyTradeImpact(commodityName, quantity, isBuy) {
    const c = gameState.commodities[commodityName];
    const available = Math.max(c.available, 1); // avoid division by zero

    // impact per unit = midPrice * IMPACT_FACTOR / totalSupply
    // total impact = impact_per_unit * quantity * (totalSupply / available)
    // This means: buying 1 unit when 100 are available is mild,
    // buying 1 unit when 5 are available is massive.
    const scarcityMultiplier = c.total_supply / available;
    const impactPct = IMPACT_FACTOR * (quantity / c.total_supply) * scarcityMultiplier;

    if (isBuy) {
        c.midPrice *= (1 + impactPct);
    } else {
        c.midPrice *= (1 - impactPct);
    }

    // Enforce price floor
    const floor = c.basePrice * PRICE_FLOOR_RATIO;
    if (c.midPrice < floor) c.midPrice = floor;

    updateBidAsk(commodityName);
}

// Recalculate all bid/ask (used after events change or admin shock)
function refreshAllPrices() {
    COMMODITIES.forEach(c => updateBidAsk(c.name));
}

// --- 4. MARKET TICK SYSTEM ---
// Ticks only snapshot price history, decay events, and broadcast state.
// NO random price changes — prices are purely trade-driven.
function marketTick() {
    if (!gameState.marketOpen) return;

    gameState.tickCount++;

    // Snapshot current prices into history
    COMMODITIES.forEach(c => {
        const history = gameState.priceHistory[c.name];
        history.push(gameState.commodities[c.name].price);
        if (history.length > PRICE_HISTORY_LENGTH) {
            history.shift();
        }
    });

    // Expire broadcast news and trade feed older than 60 seconds
    const now = Date.now();
    gameState.broadcastNews = gameState.broadcastNews.filter(n => now - n.timestamp < 60000);
    gameState.tradeFeed = gameState.tradeFeed.filter(n => now - n.timestamp < 60000);

    // Decay active events
    let eventsChanged = false;
    gameState.activeEvents = gameState.activeEvents.filter(e => {
        e.ticksRemaining--;
        if (e.ticksRemaining <= 0) eventsChanged = true;
        return e.ticksRemaining > 0;
    });
    if (eventsChanged) refreshAllPrices();

    // Broadcast state
    io.emit('update_state', sanitizeStateForPlayer(gameState));
    io.emit('update_admin_state', JSON.parse(JSON.stringify(gameState)));
}

function startTickTimer() {
    if (tickTimer) clearInterval(tickTimer);
    tickTimer = setInterval(marketTick, TICK_INTERVAL);
}

function stopTickTimer() {
    if (tickTimer) {
        clearInterval(tickTimer);
        tickTimer = null;
    }
}

// --- 5. SECURITY HELPER ---
function sanitizeStateForPlayer(fullState) {
    const safeState = {
        marketOpen: fullState.marketOpen,
        commodities: fullState.commodities,
        teams: {},
        priceHistory: fullState.priceHistory,
        orderPressure: fullState.orderPressure,
        activeEvents: fullState.activeEvents,
        broadcastNews: fullState.broadcastNews,
        tradeFeed: fullState.tradeFeed,
        tickCount: fullState.tickCount,
    };
    Object.values(fullState.teams).forEach(t => {
        safeState.teams[t.id] = { ...t };
    });
    return JSON.parse(JSON.stringify(safeState));
}

// --- 6. SOCKET LOGIC ---
io.on('connection', (socket) => {

    socket.emit('init', {
        config: TEAMS_CONFIG.map(t => ({ id: t.id, name: t.name })),
        state: sanitizeStateForPlayer(gameState)
    });

    socket.on('request_login', ({ teamId, password }) => {
        const teamConfig = TEAMS_CONFIG.find(t => t.id === teamId);
        if (teamConfig && teamConfig.password === password) {
            socket.emit('login_approved', teamId);
        } else {
            socket.emit('error', 'ACCESS DENIED: INVALID PASSWORD');
        }
    });

    socket.on('request_admin_login', ({ password }) => {
        if (password === process.env.ADMIN_PASSWORD) {
            socket.isAdmin = true;
            socket.emit('admin_login_approved');
            socket.emit('update_admin_state', JSON.parse(JSON.stringify(gameState)));
        } else {
            socket.emit('error', 'ACCESS DENIED: INCORRECT CREDENTIALS');
        }
    });

    socket.on('trade', ({ teamId, commodityName, quantity, type }) => {
        if (!gameState.marketOpen) return;

        const team = gameState.teams[teamId];
        const market = gameState.commodities[commodityName];

        if (!team || !market) return;

        // Validate quantity (1-10)
        quantity = Math.max(1, Math.min(10, Math.floor(quantity || 1)));

        if (type === 'BUY') {
            if (market.available < quantity) {
                socket.emit('error', `Only ${market.available} units available!`);
                return;
            }

            // Buyer pays the ASK price (higher side of spread)
            const cost = market.askPrice * quantity;
            if (team.cash < cost) { socket.emit('error', 'Insufficient Funds'); return; }

            // Anti-monopoly: can't hold > 40% of total supply
            if ((team.portfolio[commodityName] + quantity) > (market.total_supply * 0.40)) {
                socket.emit('error', 'Anti-Monopoly Rule: >40% Supply');
                return;
            }

            // EXECUTE BUY
            team.cash -= cost;
            team.portfolio[commodityName] += quantity;
            market.available -= quantity;

            // Track volume for sentiment display
            gameState.orderPressure[commodityName].buyVolume += quantity;

            // Move midPrice UP based on trade impact
            applyTradeImpact(commodityName, quantity, true);

            // Trade feed notification
            gameState.tradeFeed.push({
                message: `${team.name} bought ${quantity} ${commodityName} @ ${market.askPrice.toLocaleString()}`,
                type: 'BUY',
                timestamp: Date.now(),
            });
            if (gameState.tradeFeed.length > 20) gameState.tradeFeed = gameState.tradeFeed.slice(-20);

        } else if (type === 'SELL') {
            // Clamp sell quantity to actual holdings
            const held = team.portfolio[commodityName];
            if (held <= 0) {
                socket.emit('error', 'No units to sell');
                return;
            }
            if (quantity > held) quantity = held;

            // Seller receives the BID price (lower side of spread)
            const revenue = market.bidPrice * quantity;

            // EXECUTE SELL
            team.cash += revenue;
            team.portfolio[commodityName] -= quantity;
            market.available += quantity;

            // Track volume for sentiment display
            gameState.orderPressure[commodityName].sellVolume += quantity;

            // Move midPrice DOWN based on trade impact
            applyTradeImpact(commodityName, quantity, false);

            // Trade feed notification
            gameState.tradeFeed.push({
                message: `${team.name} sold ${quantity} ${commodityName} @ ${market.bidPrice.toLocaleString()}`,
                type: 'SELL',
                timestamp: Date.now(),
            });
            if (gameState.tradeFeed.length > 20) gameState.tradeFeed = gameState.tradeFeed.slice(-20);
        }

        io.emit('update_state', sanitizeStateForPlayer(gameState));
        io.emit('update_admin_state', JSON.parse(JSON.stringify(gameState)));
    });

    // --- ADMIN ACTIONS ---
    socket.on('admin_action', (action) => {
        if (!socket.isAdmin) {
            socket.emit('error', 'ACCESS DENIED: Not authenticated as admin');
            return;
        }
        switch (action.type) {
            case 'OPEN_MARKET':
                gameState.marketOpen = true;
                startTickTimer();
                break;
            case 'CLOSE_MARKET':
                gameState.marketOpen = false;
                stopTickTimer();
                break;
            case 'SHOCK':
                // Clamp multiplier: never allow <= 0 (i.e. -100% or worse) or >= 2 (i.e. +100% or more)
                if (!action.multiplier || action.multiplier <= 0.01 || action.multiplier >= 2) {
                    socket.emit('error', 'Shock rejected: percentage must be between -99% and +99%');
                    return;
                }
                // Targeted or global shock — directly moves midPrice
                if (action.commodity) {
                    const m = gameState.commodities[action.commodity];
                    if (m) {
                        m.midPrice = m.midPrice * action.multiplier;
                        m.basePrice = Math.round(m.basePrice * action.multiplier);
                        updateBidAsk(action.commodity);
                    }
                } else {
                    Object.keys(gameState.commodities).forEach(k => {
                        const m = gameState.commodities[k];
                        m.midPrice = m.midPrice * action.multiplier;
                        m.basePrice = Math.round(m.basePrice * action.multiplier);
                        updateBidAsk(k);
                    });
                }
                break;
            case 'TRIGGER_EVENT':
                if (action.eventIndex !== undefined && NEWS_EVENTS[action.eventIndex]) {
                    const template = NEWS_EVENTS[action.eventIndex];
                    gameState.activeEvents = gameState.activeEvents.filter(e => e.commodity !== template.commodity);
                    gameState.activeEvents.push({
                        headline: template.headline,
                        commodity: template.commodity,
                        multiplier: template.multiplier,
                        ticksRemaining: template.duration,
                    });
                    refreshAllPrices();
                }
                break;
            case 'BROADCAST_NEWS':
                if (action.message && action.message.trim()) {
                    // Clean up expired news first
                    const broadcastNow = Date.now();
                    gameState.broadcastNews = gameState.broadcastNews.filter(n => broadcastNow - n.timestamp < 60000);
                    gameState.broadcastNews.push({
                        message: action.message.trim(),
                        timestamp: broadcastNow,
                    });
                    // Keep last 10 messages
                    if (gameState.broadcastNews.length > 10) {
                        gameState.broadcastNews = gameState.broadcastNews.slice(-10);
                    }
                }
                break;
            case 'CLEAR_NEWS':
                gameState.broadcastNews = [];
                break;
            case 'RESET_GAME':
                resetGame();
                // Emit dedicated reset event so clients can atomically replace all state
                io.emit('game_reset', {
                    config: TEAMS_CONFIG.map(t => ({ id: t.id, name: t.name })),
                    state: sanitizeStateForPlayer(gameState),
                    adminState: JSON.parse(JSON.stringify(gameState)),
                });
                return; // skip the normal emit below — game_reset handles it
        }

        io.emit('update_state', sanitizeStateForPlayer(gameState));
        io.emit('update_admin_state', JSON.parse(JSON.stringify(gameState)));
    });
});

server.listen(3001, () => {
    console.log('SERVER RUNNING ON PORT 3001');
});
