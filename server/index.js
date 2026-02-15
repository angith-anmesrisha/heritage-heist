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
// UPDATED COMMODITIES LIST (Tech Removed; 4 New Added)
const COMMODITIES = [
    { name: "Gold", price: 2000, total_supply: 50, available: 50 },
    { name: "Platinum", price: 2800, total_supply: 40, available: 40 }, // New: High Value
    { name: "Oil", price: 800, total_supply: 100, available: 100 },
    { name: "Silver", price: 1200, total_supply: 80, available: 80 },   // New: Mid Value
    { name: "Copper", price: 400, total_supply: 150, available: 150 },  // New: Industrial
    { name: "Agri", price: 500, total_supply: 200, available: 200 },
    { name: "Livestock", price: 600, total_supply: 150, available: 150 }, // New: Agri-adjacent
    { name: "Rare Earth", price: 3000, total_supply: 30, available: 30 },
];

const TEAMS_CONFIG = [
    // Tech teams reassigned to new commodities
    { id: "usa", name: "USA", special: "Platinum", password: "usa" },     // Was Tech
    { id: "china", name: "China", special: "Rare Earth", password: "china" },
    { id: "india", name: "India", special: "Agri", password: "india" },
    { id: "saudi", name: "Saudi Arabia", special: "Oil", password: "saudi" },
    { id: "uk", name: "UK", special: "Gold", password: "uk" },
    { id: "germany", name: "Germany", special: "Silver", password: "germany" }, // Was Tech
    { id: "japan", name: "Japan", special: "Copper", password: "japan" },     // Was Tech
    { id: "russia", name: "Russia", special: "Oil", password: "russia" },
    { id: "brazil", name: "Brazil", special: "Livestock", password: "brazil" }, // Was Agri
    { id: "france", name: "France", special: "Gold", password: "france" },
    { id: "uae", name: "UAE", special: "Oil", password: "uae" },
    { id: "australia", name: "Australia", special: "Rare Earth", password: "aus" },
];

// --- 2. GAME STATE ---
let gameState = {
    marketOpen: false,
    commodities: {}, 
    teams: {},       
    tradeLog: []     
};

function resetGame() {
    gameState.marketOpen = false;
    gameState.tradeLog = [];
    
    // Reset Commodities
    COMMODITIES.forEach(c => {
        gameState.commodities[c.name] = { ...c };
    });

    // Reset Teams
    TEAMS_CONFIG.forEach(t => {
        gameState.teams[t.id] = {
            id: t.id,
            name: t.name,
            special: t.special, 
            cash: 10000, 
            portfolio: {},
            trades_this_phase: {} 
        };
        // Initialize portfolio for ALL commodities
        COMMODITIES.forEach(c => gameState.teams[t.id].portfolio[c.name] = 0);
    });
    console.log("GAME RESET TRIGGERED");
}

resetGame();

// --- 3. SECURITY HELPER ---
function sanitizeStateForPlayer(fullState) {
    const safeState = JSON.parse(JSON.stringify(fullState));
    Object.values(safeState.teams).forEach(t => {
        delete t.special; 
    });
    return safeState;
}

// --- 4. SOCKET LOGIC ---
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

    socket.on('trade', ({ teamId, commodityName, quantity, type }) => {
        if (!gameState.marketOpen) return;

        const team = gameState.teams[teamId];
        const market = gameState.commodities[commodityName];
        
        if (!team || !market) return;

        // Trade Limits
        if (!team.trades_this_phase[commodityName]) team.trades_this_phase[commodityName] = 0;
        if (team.trades_this_phase[commodityName] >= 5) {
            socket.emit('error', 'Limit Reached: Max 5 trades per commodity this phase!');
            return;
        }

        if (type === 'BUY') {
            const cost = market.price * quantity;
            if (team.cash < cost) { socket.emit('error', 'Insufficient Funds'); return; }
            if ((team.portfolio[commodityName] + quantity) > (market.total_supply * 0.40)) { socket.emit('error', 'Anti-Monopoly Rule: >40% Supply'); return; }
            if ((team.portfolio[commodityName] * market.price + cost) > (6000)) { socket.emit('error', 'Risk Mgmt: Max 60% capital rule'); return; }

            team.cash -= cost;
            team.portfolio[commodityName] += quantity;
            market.available -= quantity;
            team.trades_this_phase[commodityName]++;
        } else if (type === 'SELL') {
            if (team.portfolio[commodityName] < quantity) { socket.emit('error', 'Not enough units'); return; }
            const revenue = market.price * quantity;
            team.cash += revenue;
            team.portfolio[commodityName] -= quantity;
            market.available += quantity;
            team.trades_this_phase[commodityName]++;
        }

        io.emit('update_state', sanitizeStateForPlayer(gameState));
        io.emit('update_admin_state', gameState);
    });

    // --- ADMIN ACTIONS ---
    socket.on('admin_action', (action) => {
        switch(action.type) {
            case 'OPEN_MARKET':
                gameState.marketOpen = true;
                Object.values(gameState.teams).forEach(t => t.trades_this_phase = {});
                break;
            case 'CLOSE_MARKET':
                gameState.marketOpen = false;
                break;
            case 'SHOCK': 
                Object.keys(gameState.commodities).forEach(k => {
                    gameState.commodities[k].price = Math.floor(gameState.commodities[k].price * action.multiplier);
                });
                break;
            case 'RESET_GAME':
                resetGame();
                break;
        }
        
        io.emit('update_state', sanitizeStateForPlayer(gameState));
        io.emit('update_admin_state', gameState);
    });
});

server.listen(3001, () => {
    console.log('SERVER RUNNING ON PORT 3001');
});
