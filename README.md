# Heritage Heist

Real-time multiplayer commodity trading simulation with:

- **Backend:** Node.js + Express + Socket.IO
- **Frontend:** React + Vite + Tailwind CSS
- **Modes:** Team player dashboard + Admin command center

---

## Project Structure

```text
heritage-heist/
├── server/   # Socket.IO game engine + admin controls
└── client/   # React/Vite frontend UI
```

---

## Core Features

- Real-time market updates over WebSockets
- 12 team logins + admin login
- Dynamic commodity pricing with:
  - bid/ask spread
  - liquidity-driven spread widening
  - trade-impact price movement
- Live portfolio/net-worth tracking
- Price history charts (1m to 3h views)
- Admin controls:
  - open/freeze market
  - global shocks (boom/crash/surge)
  - targeted commodity shocks
  - broadcast/clear news
  - factory reset
  - set team special commodity (1.2×)
  - adjust team cash
- Trial/ban mechanic for excessive Arms & Ammunition holdings

---

## Prerequisites

- Node.js (LTS recommended)
- npm

Check installed versions:

```bash
node -v
npm -v
```

---

## Environment Variables

### Server (`server/.env`)

Create from example:

```bash
cp server/.env.example server/.env
```

Required keys:

- `ADMIN_PASSWORD`
- `PASSWORD_USA`
- `PASSWORD_CHINA`
- `PASSWORD_INDIA`
- `PASSWORD_SAUDI`
- `PASSWORD_UK`
- `PASSWORD_GERMANY`
- `PASSWORD_JAPAN`
- `PASSWORD_RUSSIA`
- `PASSWORD_BRAZIL`
- `PASSWORD_FRANCE`
- `PASSWORD_UAE`
- `PASSWORD_AUSTRALIA`

### Client (`client/.env`)

Create from example:

```bash
cp client/.env.example client/.env
```

Set:

```
VITE_SERVER_URL=http://localhost:3001
```

---

## Installation

### 1) Install backend dependencies

```bash
cd server
npm install
```

### 2) Install frontend dependencies

```bash
cd client
npm install
```

---

## Run in Development

Use two terminals.

### Terminal A — Backend

```bash
cd server
npm run dev
```

Backend listens on `http://localhost:3001`.

### Terminal B — Frontend

```bash
cd client
npm run dev
```

Frontend runs on Vite default (usually `http://localhost:5173`).

---

## Build & Preview (Frontend)

```bash
cd client
npm run build
npm run preview
```

---

## Linting

Frontend lint:

```bash
cd client
npm run lint
```

---

## Backend Scripts

From `server/`:

| Script | Description |
|---|---|
| `npm run dev` | Run with nodemon |
| `npm start` | Run with node |
| `npm run pm2:start` | Start PM2 app |
| `npm run pm2:stop` | Stop PM2 app |
| `npm run pm2:restart` | Restart PM2 app |
| `npm run pm2:logs` | View PM2 logs |
| `npm run pm2:status` | PM2 status |

---

## Frontend Scripts

From `client/`:

| Script | Description |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run preview` | Preview production build |

---

## Gameplay / Engine Notes

- Market starts **closed**. Admin must open it to enable trading.
- Trade quantity is clamped to **1–10**.
- Buy uses **ask price**; sell uses **bid price**.
- Enforced checks include:
  - insufficient funds prevention
  - anti-monopoly cap (>40% of total commodity supply is blocked)
- Server emits continuous `update_state`; admin additionally receives full `update_admin_state`.

---

## Networking (LAN Setup)

If participants connect from other devices:

1. Host and participants must be on the same LAN/Wi-Fi.
2. Set client `VITE_SERVER_URL` to the host machine's backend URL (e.g. `http://192.168.x.x:3001`).
3. Start the backend on the host, then start the frontend.

---

## Deployment Notes

- PM2 config: `server/ecosystem.config.js`
- Caddy reverse proxy example: `server/Caddyfile`

---

## Testing Status

No automated test suite is currently implemented. Backend `npm test` is a placeholder and exits with an error by design.

---

## Security Notes

- Do **not** commit `.env` files.
- Set strong admin/team passwords for live use.
- Current server CORS is permissive (`origin: "*"`) — restrict this for production deployments.
