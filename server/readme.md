n

**Powered by E-Cell BIMTECH**

A real-time, full-stack trading simulation platform designed for "Round 2: Deal Breaker". This application allows 12 teams to buy, sell, and negotiate commodities under strict market rules, while an Admin controls the economy.

---

## 📋 Prerequisites

Before running the app, ensure you have **Node.js** installed on the host computer.
* **Download:** [nodejs.org](https://nodejs.org/) (LTS Version recommended).
* **Verify:** Open terminal and type `node -v`.

---

## 🚀 Installation Guide

This project is split into two parts: the **Server** (Backend) and the **Client** (Frontend). You must install dependencies for both.

### 1. Install Server Dependencies
Open your terminal/command prompt and run:
```bash
cd server
npm install

```

### 2. Install Client Dependencies

Open a **new** terminal window (or go back using `cd ..`) and run:

```bash
cd client
npm install

```

---

## 🖥️ How to Run the App (The "Two Terminal" Rule)

To play the game, you must have **TWO** terminals running simultaneously.

### Terminal 1: The Backend (Brain)

```bash
cd server
npx nodemon index.js

```

*You should see: `SERVER RUNNING ON PORT 3001*`

### Terminal 2: The Frontend (Face)

```bash
cd client
npm run dev

```

*You should see: `Local: http://localhost:5173/*`

---

## 🌐 How to Connect (Live Event Setup)

### For the Host (Admin)

Open your browser and go to: `http://localhost:5173`

### For Participants (Other Laptops/Phones)

1. Ensure all devices are connected to the **same Wi-Fi network**.
2. Find the Host's **IPv4 Address**:
* **Windows:** Open Command Prompt -> type `ipconfig` -> Look for "IPv4 Address" (e.g., `192.168.1.5`).
* **Mac:** Open Terminal -> type `ipconfig getifaddr en0`.


3. Participants should open their browser and type: `http://YOUR_IP_ADDRESS:5173` (e.g., `http://192.168.1.5:5173`).

---

## 🔑 Access Credentials

### 🛡️ Admin Portal

* **Password:** `admin`
* **Capabilities:** Open/Close Market, Trigger Shocks, View True Leaderboard, Factory Reset.

### 🌍 Team Logins


---

## 📜 Game Rules (Enforced Automatically)

The system automatically blocks any trade that violates these rules:

1. **Initial Capital:** ₹10,000 per team.
2. **No Debt:** Cannot spend more than available cash.
3. **Anti-Monopoly:** Cannot hold more than **40%** of the total supply of any single commodity.
4. **Risk Management:** Cannot invest more than **60%** of total capital in a single commodity.
5. **Trade Frequency:** Maximum **5 trades** per commodity, per market phase.

---

## 🎮 Admin Control Panel Guide

1. **🟢 OPEN MARKET:** Enables buy/sell buttons for all players.
2. **🛑 FREEZE MARKET:** Disables all trading immediately.
3. **🚀 BOOM (x1.5):** Multiplies all commodity prices by 1.5.
4. **📉 CRASH (x0.5):** Multiples all commodity prices by 0.5.
5. **⚡ SURGE (x1.25):** Multiples prices by 1.25 (Supply Shock).
6. **☢️ FACTORY RESET:** Wipes all trades, resets cash to ₹10,000, and restores original prices. Use this to restart the round.

---

## 🛠️ Troubleshooting

* **"Connecting to Trade Server..." is stuck:**
* Make sure the Backend Terminal (Terminal 1) is running.
* If playing on a network, ensure Windows Firewall isn't blocking Node.js.


* **"Access Denied" on Login:**
* Check the password list above. Passwords are case-sensitive.


* **Changes not showing?**
* Refresh the page. The app uses real-time sockets, but a refresh ensures you have the latest code.



```

```