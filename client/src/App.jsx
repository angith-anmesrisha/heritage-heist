import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { TrendingUp, TrendingDown, AlertTriangle, ShieldCheck, Lock, LogOut, RotateCcw, Eye, Newspaper, Minus, Plus, BarChart3, Zap, Send, Megaphone, X } from 'lucide-react';

const socket = io(import.meta.env.VITE_SERVER_URL);

// --- CONFIGURATION ---


// --- PRICE CHART COMPONENT ---
function PriceChart({ data, width = 300, height = 100, timeframeTicks }) {
  if (!data || data.length < 2) return (
    <div className="flex items-center justify-center text-gray-600 text-xs font-mono border border-dashed border-gray-800 rounded" style={{ width, height }}>
      WAITING FOR DATA...
    </div>
  );

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  
  // Chart dimensions
  const chartH = height - 20; // reserve 20px for x-axis labels
  const chartW = width;

  const stepX = chartW / (data.length - 1);

  // Generate path
  const points = data.map((v, i) => {
    const x = i * stepX;
    // Invert Y: 0 is top, height is bottom
    const y = chartH - ((v - min) / range) * chartH; 
    return `${x},${y}`;
  }).join(' ');

  const lastPrice = data[data.length - 1];
  const prevPrice = data[data.length - 2];
  const color = lastPrice >= prevPrice ? '#10b981' : '#ef4444'; // emerald or red

  // Generate X-Axis Time Labels
  // We want to show labels at specific intervals: 1m, 5m, 15m, 30m, 1h ago from NOW (right side)
  const labels = [];
  
  // Define possible label points (ticks back from present)
  const potentialLabels = [
    { text: 'Now', ticks: 0 },
    { text: '1m', ticks: 20 },
    { text: '5m', ticks: 100 },
    { text: '15m', ticks: 300 },
    { text: '30m', ticks: 600 },
    { text: '1h', ticks: 1200 },
    { text: '2h', ticks: 2400 },
    { text: '3h', ticks: 3600 }
  ];

  potentialLabels.forEach(l => {
     // Calculate where this label falls on the X-axis (0 to chartW)
     // If we are showing 'timeframeTicks' total history (e.g. 100 ticks for 5m view)
     // The 'Now' label is at x = chartW (index = length-1)
     // The '1m' label is at index = length-1 - 20
     
     // Only show label if it is within the current visible timeframe
     if (l.ticks <= timeframeTicks) {
        const xPos = chartW - (l.ticks / timeframeTicks) * chartW;
        labels.push({ x: xPos, text: l.text });
     }
  });

  return (
    <div className="relative select-none" style={{ width, height }}>
      
      {/* Chart Area */}
      <svg width={width} height={height} className="overflow-visible">
        {/* Background Grid */}
        <line x1="0" y1="0" x2={width} y2="0" stroke="#374151" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
        <line x1="0" y1={chartH} x2={width} y2={chartH} stroke="#374151" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
        
        {/* X-Axis Labels & Vertical Grid Lines */}
        {labels.map((l, i) => (
          <g key={i} transform={`translate(${l.x}, 0)`}>
            <line y1="0" y2={chartH} stroke="#374151" strokeWidth="1" strokeDasharray="2 2" opacity="0.2" />
            <text x="0" y={chartH + 12} textAnchor="middle" fill="#6B7280" fontSize="9" fontWeight="bold" style={{textShadow: '0px 0px 2px black'}}>{l.text}</text>
          </g>
        ))}

        {/* The Data Line */}
        <polyline 
            fill="none" 
            stroke={color} 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            points={points} 
            vectorEffect="non-scaling-stroke"
            filter="drop-shadow(0px 0px 4px rgba(0,0,0,0.5))"
        />
        
        {/* Current Price Dot */}
        <circle cx={chartW} cy={chartH - ((lastPrice - min) / range) * chartH} r="3" fill={color} stroke="white" strokeWidth="1" />
      </svg>

      {/* Y-Axis Price Labels (Overlay) */}
      <div className="absolute right-1 top-0 text-[10px] font-mono font-bold text-gray-400 bg-black/60 px-1 rounded">{max.toLocaleString()}</div>
      <div className="absolute right-1 bottom-[20px] text-[10px] font-mono font-bold text-gray-400 bg-black/60 px-1 rounded">{min.toLocaleString()}</div>
    </div>
  );
}

// --- PRICE CHANGE BADGES (1min = 20 ticks, 5min = 100 ticks) ---

function PriceChangeBadge({ current, previous, label }) {
  if (previous == null || current == null) return null;
  const pctChange = ((current - previous) / previous) * 100;
  if (Math.abs(pctChange) < 0.01) return (
    <span className="text-gray-500 text-[10px]">{label} 0.0%</span>
  );
  const isUp = pctChange > 0;
  return (
    <span className={`text-[10px] font-bold flex items-center gap-0.5 ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
      {isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
      {label} {isUp ? '+' : ''}{pctChange.toFixed(1)}%
    </span>
  );
}

function PriceChange({ history }) {
  if (!history || history.length < 2) return null;
  const current = history[history.length - 1];
  // 1 min ago = 20 ticks back, 5 min ago = 100 ticks back
  const oneMinAgo = history.length > 20 ? history[history.length - 21] : history[0];
  const fiveMinAgo = history.length > 100 ? history[history.length - 101] : history[0];
  return (
    <div className="flex flex-col items-end gap-0.5">
      <PriceChangeBadge current={current} previous={oneMinAgo} label="1m" />
      <PriceChangeBadge current={current} previous={fiveMinAgo} label="5m" />
    </div>
  );
}

// --- SENTIMENT INDICATOR ---
function SentimentBadge({ pressure }) {
  if (!pressure) return null;
  const net = pressure.buyVolume - pressure.sellVolume;
  if (Math.abs(net) < 0.5) return <span className="text-[10px] text-gray-500 uppercase">Neutral</span>;
  if (net > 0) return <span className="text-[10px] text-emerald-400 uppercase font-bold">Buying Pressure</span>;
  return <span className="text-[10px] text-red-400 uppercase font-bold">Selling Pressure</span>;
}

// --- TRADE TICKER (marquee that only appends new trades) ---
function TradeTicker({ tradeFeed }) {
  const [items, setItems] = useState([]);
  const lastSeenRef = useRef(0);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!tradeFeed || tradeFeed.length === 0) return;
    const newItems = tradeFeed.filter(t => t.timestamp > lastSeenRef.current);
    if (newItems.length === 0) return;
    lastSeenRef.current = Math.max(...newItems.map(t => t.timestamp));
    setItems(prev => {
      const updated = [...prev, ...newItems.map(t => ({ ...t, id: t.timestamp + Math.random() }))];
      // Keep last 30 items max to avoid unbounded growth
      return updated.slice(-30);
    });
  }, [tradeFeed]);

  // Auto-remove items older than 60s
  useEffect(() => {
    const interval = setInterval(() => {
      const cutoff = Date.now() - 60000;
      setItems(prev => prev.filter(t => t.timestamp > cutoff));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="bg-gray-900/60 border border-gray-800/40 rounded-xl py-2 px-3 overflow-hidden">
      <div ref={containerRef} className="flex whitespace-nowrap gap-6 animate-marquee">
        {items.map(t => (
          <span key={t.id} className={`text-sm inline-flex items-center gap-1 shrink-0 ${t.type === 'BUY' ? 'text-emerald-300' : 'text-red-300'}`}>
            <span className={`font-bold ${t.type === 'BUY' ? 'text-emerald-500' : 'text-red-500'}`}>
              {t.type === 'BUY' ? '▲' : '▼'}
            </span>
            {t.message}
            <span className="text-gray-700 ml-4">|</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// --- NEWS TICKER ---
function NewsTicker({ events, broadcastNews, tradeFeed }) {
  const hasEvents = events && events.length > 0;
  const hasBroadcast = broadcastNews && broadcastNews.length > 0;
  return (
    <div className="space-y-2 mb-6">
      {hasBroadcast && (
        <div className="bg-blue-950/40 border border-blue-800/40 rounded-xl p-3 flex items-start gap-3">
          <Megaphone size={18} className="text-blue-400 mt-0.5 shrink-0" />
          <div className="flex flex-col gap-1">
            {broadcastNews.map((n, i) => (
              <span key={i} className="text-blue-200 text-sm">{n.message}</span>
            ))}
          </div>
        </div>
      )}
      {hasEvents && (
        <div className="bg-yellow-950/40 border border-yellow-800/40 rounded-xl p-3 flex items-start gap-3">
          <Newspaper size={18} className="text-yellow-500 mt-0.5 shrink-0" />
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            {events.map((e, i) => (
              <span key={i} className="text-yellow-300 text-sm">
                <span className="font-bold text-yellow-500">[{e.commodity}]</span> {e.headline}
                <span className="text-yellow-600 text-xs ml-1">({e.ticksRemaining} ticks)</span>
              </span>
            ))}
          </div>
        </div>
      )}
      <TradeTicker tradeFeed={tradeFeed} />
    </div>
  );
}

// --- QUANTITY SELECTOR ---
function QuantitySelector({ value, onChange, max }) {
  return (
    <div className="flex items-center gap-2 bg-black/40 rounded-lg px-3 py-2 border border-gray-800/50">
      <button
        onClick={() => onChange(Math.max(1, value - 1))}
        className="text-gray-400 hover:text-white transition-colors"
      >
        <Minus size={14} />
      </button>
      <span className="font-mono font-bold text-white w-6 text-center">{value}</span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        className="text-gray-400 hover:text-white transition-colors"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}

// --- BID/ASK DISPLAY ---
function BidAskBar({ bidPrice, askPrice, spreadPct }) {
  const spreadDisplay = spreadPct ? (spreadPct * 100).toFixed(1) : '?';
  return (
    <div className="flex items-center justify-between text-[11px] font-mono gap-2">
      <div className="flex items-center gap-1">
        <span className="text-gray-500 uppercase text-[9px]">Bid</span>
        <span className="text-red-400 font-bold">{(bidPrice || 0).toLocaleString()}</span>
      </div>
      <div className="text-gray-600 text-[9px]">spread {spreadDisplay}%</div>
      <div className="flex items-center gap-1">
        <span className="text-gray-500 uppercase text-[9px]">Ask</span>
        <span className="text-emerald-400 font-bold">{(askPrice || 0).toLocaleString()}</span>
      </div>
    </div>
  );
}

function App() {
  const [view, setView] = useState('login');
  const [teamId, setTeamId] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [adminPassInput, setAdminPassInput] = useState('');
  const [quantities, setQuantities] = useState({});
  const [adminNewsInput, setAdminNewsInput] = useState('');
  const [shockValues, setShockValues] = useState({}); // { commodityName: "30" }

  const [gameState, setGameState] = useState(null);
  const [adminState, setAdminState] = useState(null);
  const [config, setConfig] = useState([]);
  const [chartTimeframe, setChartTimeframe] = useState(20); // Default 1m (20 ticks)
  const [warningMessage, setWarningMessage] = useState(null); // { message: string, type: 'trial' | 'admin', expiresAt: number }
  const [now, setNow] = useState(Date.now());

  // Update 'now' every second to force re-render for countdowns
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Clear expired warnings automatically (for admin alerts)
  useEffect(() => {
    if (warningMessage && warningMessage.expiresAt && warningMessage.type !== 'trial') {
       if (now > warningMessage.expiresAt) {
          setWarningMessage(null);
       }
    }
    // For trial, we don't clear automatically here because we want the persistent overlay logic
    // actually, let's just use the overlay logic to decide what to show
  }, [now, warningMessage]);

  useEffect(() => {

    socket.on('init', (data) => {
      setConfig(data.config);
      setGameState(data.state);
    });

    socket.on('login_approved', (id) => {
      setView('dashboard');
    });

    socket.on('admin_login_approved', () => {
      setView('admin');
    });

    socket.on('trial_warning', ({ message, duration }) => {
       const audio = new Audio('/trial_siren.mp3'); 
       audio.play().catch(e => console.log("Audio play failed", e));
       
       // Set warning message with expiration time
       const expiresAt = Date.now() + duration;
       setWarningMessage({ message, type: 'trial', expiresAt });
    });

    socket.on('admin_alert', ({ team, message }) => {
       const audio = new Audio('/trial_siren.mp3'); 
       audio.play().catch(e => console.log("Audio play failed", e));
       // Admin alerts still clear after 5s or when acknowledged
       setWarningMessage({ message: `⚠️ ${message}`, type: 'admin', expiresAt: Date.now() + 5000 });
    });

    socket.on('update_state', (state) => setGameState(state));


    socket.on('update_admin_state', (state) => setAdminState(state));
    socket.on('game_reset', (data) => {
      setConfig(data.config);
      setGameState(data.state);
      setAdminState(data.adminState);
    });
    socket.on('error', (msg) => alert(msg));

    return () => socket.off();
  }, []);

  const handleTeamLogin = () => {
    if (!teamId || !passwordInput) {
      alert("Please select a team and enter password");
      return;
    }
    socket.emit('request_login', { teamId, password: passwordInput });
  };

  const handleAdminLogin = () => {
    if (!adminPassInput) {
      alert("Please enter the admin passcode");
      return;
    }
    socket.emit('request_admin_login', { password: adminPassInput });
    setAdminPassInput('');
  };

  const handleLogout = () => {
    if (confirm("TERMINATE SESSION?\n\nThis will disconnect you from the market.")) {
      window.location.reload();
    }
  };

  const handleGameReset = () => {
    if (confirm("WARNING: FACTORY RESET\n\nThis will wipe ALL progress, money, and trades.\nAre you absolutely sure?")) {
      if (confirm("Double Check: This cannot be undone. Reset Game?")) {
        socket.emit('admin_action', { type: 'RESET_GAME' });
      }
    }
  };

  const getQty = (commName) => quantities[commName] || 1;
  const setQty = (commName, val) => setQuantities(prev => ({ ...prev, [commName]: val }));

  if (!gameState) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center text-blue-500 font-mono animate-pulse">
      Connecting to Trade Server...
    </div>
  );

  const warningOverlay = warningMessage && (warningMessage.type !== 'trial' || now < warningMessage.expiresAt) ? (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Flashing Background */}
      <div className="absolute inset-0 bg-yellow-900/90 animate-pulse backdrop-blur-md"></div>
      
      {/* Warning Content */}
      <div className="relative bg-black border-4 border-yellow-500 rounded-2xl p-8 max-w-2xl text-center shadow-[0_0_100px_rgba(234,179,8,0.5)] animate-bounce z-[101]">
        <AlertTriangle size={80} className="text-yellow-500 mx-auto mb-6 animate-pulse" />
        <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-4">
          {warningMessage.type === 'trial' ? 'COURT SUMMONS' : 'SECURITY ALERT'}
        </h2>
        <p className="text-xl font-bold text-yellow-500 font-mono leading-relaxed mb-6">
          {warningMessage.message}
        </p>

        {warningMessage.type === 'trial' ? (
          <div className="mt-4">
             <div className="text-2xl font-mono font-bold text-red-500 mb-2">BAN ACTIVE FOR</div>
             <div className="text-5xl font-black text-white tracking-widest">
               {Math.max(0, Math.ceil((warningMessage.expiresAt - now) / 1000))}s
             </div>
             <p className="text-gray-500 text-xs mt-4 uppercase tracking-widest animate-pulse">DO NOT CLOSE THIS WINDOW</p>
          </div>
        ) : (
          <button 
            onClick={() => setWarningMessage(null)}
            className="bg-yellow-600 hover:bg-yellow-500 text-black font-black px-8 py-3 rounded text-lg uppercase tracking-widest transition-transform hover:scale-105"
          >
            ACKNOWLEDGE
          </button>
        )}
      </div>
    </div>
  ) : null;

  // --- VIEW 1: PLAYER LOGIN ---

  if (view === 'login') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 font-sans">
        <div className="bg-gray-900 p-8 rounded-2xl border border-gray-800 w-full max-w-md shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600"></div>

          <h1 className="text-4xl font-black text-white mb-2 text-center tracking-tighter">HERITAGE<span className="text-blue-500">HEIST</span></h1>
          <p className="text-center text-gray-500 mb-8 text-sm uppercase tracking-widest">Global Trade Simulation</p>

          <div className="space-y-4">
            <div>
              <label className="block text-gray-400 text-xs font-bold mb-2 uppercase ml-1">Select Nation</label>
              <select
                className="w-full p-4 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-blue-500 outline-none"
                onChange={(e) => setTeamId(e.target.value)}
                value={teamId}
              >
                <option value="">-- Choose Sovereignty --</option>
                {config.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-gray-400 text-xs font-bold mb-2 uppercase ml-1">Access Code</label>
              <input
                type="password"
                placeholder="ENTER PASSWORD"
                className="w-full p-4 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-blue-500 outline-none font-mono tracking-widest"
                onChange={(e) => setPasswordInput(e.target.value)}
                value={passwordInput}
              />
            </div>

            <button
              onClick={handleTeamLogin}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white p-4 rounded-lg font-bold tracking-wide transition-all transform hover:scale-[1.02] shadow-lg shadow-blue-900/20"
            >
              INITIATE TRADING TERMINAL
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-800 text-center">
            <button onClick={() => setView('admin_login')} className="text-gray-600 text-xs hover:text-white uppercase tracking-widest transition-colors flex items-center justify-center gap-2 mx-auto">
              <Lock size={12} /> Secure Admin Channel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- VIEW 2: ADMIN PASSWORD GATE ---
  if (view === 'admin_login') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 font-mono">
        <div className="bg-gray-900 p-8 rounded-xl border border-red-900/30 w-full max-w-sm text-center">
          <div className="mx-auto bg-red-900/20 w-16 h-16 rounded-full flex items-center justify-center mb-6 text-red-500">
            <Lock size={32} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">RESTRICTED ACCESS</h2>
          <p className="text-red-400 text-xs mb-6 uppercase tracking-widest">Authorized Personnel Only</p>

          <input
            type="password"
            placeholder="ENTER PASSCODE"
            value={adminPassInput}
            onChange={(e) => setAdminPassInput(e.target.value)}
            className="w-full bg-black border border-gray-700 text-white p-3 rounded text-center mb-4 focus:border-red-500 outline-none tracking-[0.5em] font-bold"
          />

          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setView('login')} className="p-3 rounded bg-gray-800 text-gray-400 hover:text-white">BACK</button>
            <button onClick={handleAdminLogin} className="p-3 rounded bg-red-700 text-white font-bold hover:bg-red-600">UNLOCK</button>
          </div>
        </div>
      </div>
    )
  }

    // --- VIEW 3: ADMIN PANEL ---
    if (view === 'admin') {
      const currentData = adminState || gameState;
      const commodityNames = Object.keys(currentData.commodities);
  
      return (
        <div className="min-h-screen bg-black text-white font-mono p-6 relative">
          {warningOverlay}

        <div className="flex justify-between items-center mb-8 bg-gray-900/50 p-4 rounded-lg border border-red-900/30">
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse"></div>
            <div>
              <h1 className="text-2xl font-bold text-red-500 tracking-tight">ADMIN COMMAND CENTER</h1>
              <p className="text-xs text-red-400 opacity-70">REAL-TIME SURVEILLANCE | TICK #{currentData.tickCount || 0}</p>
            </div>
          </div>
          <button onClick={() => window.location.reload()} className="text-gray-500 hover:text-white text-sm">LOGOUT</button>
        </div>

        {/* NEWS TICKER */}
        <NewsTicker events={currentData.activeEvents} broadcastNews={currentData.broadcastNews} tradeFeed={currentData.tradeFeed} />

        {/* CONTROLS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <button
            onClick={() => socket.emit('admin_action', { type: currentData.marketOpen ? 'CLOSE_MARKET' : 'OPEN_MARKET' })}
            className={`p-6 rounded-lg font-bold text-xl border-b-4 transition-all active:border-b-0 active:translate-y-1 ${currentData.marketOpen ? 'bg-red-900 border-red-950 text-red-100 hover:bg-red-800' : 'bg-emerald-700 border-emerald-900 text-emerald-100 hover:bg-emerald-600'}`}
          >
            {currentData.marketOpen ? 'FREEZE MARKET' : 'OPEN MARKET'}
          </button>
          <button onClick={() => socket.emit('admin_action', { type: 'SHOCK', multiplier: 1.5 })} className="bg-blue-900 border-b-4 border-blue-950 hover:bg-blue-800 p-6 rounded-lg font-bold text-blue-100">
            BOOM (x1.5)
          </button>
          <button onClick={() => socket.emit('admin_action', { type: 'SHOCK', multiplier: 0.5 })} className="bg-orange-900 border-b-4 border-orange-950 hover:bg-orange-800 p-6 rounded-lg font-bold text-orange-100">
            CRASH (x0.5)
          </button>
          <button onClick={() => socket.emit('admin_action', { type: 'SHOCK', multiplier: 1.25 })} className="bg-purple-900 border-b-4 border-purple-950 hover:bg-purple-800 p-6 rounded-lg font-bold text-purple-100">
            SURGE (x1.25)
          </button>
        </div>

        {/* ADMIN NEWS BROADCAST */}
        <div className="bg-gray-900 rounded-xl border border-blue-900/30 p-4 mb-8">
          <h2 className="text-sm font-bold text-blue-400 uppercase tracking-wider mb-3 flex items-center gap-2"><Megaphone size={14} /> Broadcast News to All Players</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={adminNewsInput}
              onChange={(e) => setAdminNewsInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && adminNewsInput.trim()) {
                  socket.emit('admin_action', { type: 'BROADCAST_NEWS', message: adminNewsInput });
                  setAdminNewsInput('');
                }
              }}
              placeholder="Type a news headline to broadcast..."
              className="flex-1 bg-black border border-gray-700 text-white p-3 rounded focus:border-blue-500 outline-none text-sm"
            />
            <button
              onClick={() => {
                if (adminNewsInput.trim()) {
                  socket.emit('admin_action', { type: 'BROADCAST_NEWS', message: adminNewsInput });
                  setAdminNewsInput('');
                }
              }}
              className="bg-blue-700 hover:bg-blue-600 text-white px-4 rounded font-bold flex items-center gap-2"
            >
              <Send size={14} /> Send
            </button>
            <button
              onClick={() => socket.emit('admin_action', { type: 'CLEAR_NEWS' })}
              className="bg-gray-800 hover:bg-gray-700 text-gray-400 px-3 rounded flex items-center gap-1 text-xs"
            >
              <X size={12} /> Clear
            </button>
          </div>
        </div>

        {/* TARGETED COMMODITY SHOCKS */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 mb-8">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2"><Zap size={14} /> Targeted Commodity Shocks</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {commodityNames.map(name => {
              const val = shockValues[name] || '';
              return (
                <div key={name} className="flex items-center gap-1.5 bg-gray-800/50 rounded-lg px-3 py-2">
                  <span className="text-xs text-gray-300 font-bold w-20 truncate">{name}</span>
                  <input
                    type="number"
                    value={val}
                    onChange={(e) => setShockValues(prev => ({ ...prev, [name]: e.target.value }))}
                    placeholder="%"
                    className="w-16 bg-black border border-gray-700 text-white px-2 py-1 rounded text-xs text-center focus:border-blue-500 outline-none"
                  />
                  <button
                    onClick={() => {
                      const pct = parseFloat(val);
                      if (!isNaN(pct) && pct !== 0 && pct > -100 && pct < 100) {
                        socket.emit('admin_action', { type: 'SHOCK', commodity: name, multiplier: 1 + pct / 100 });
                      }
                    }}
                    disabled={!val || isNaN(parseFloat(val)) || parseFloat(val) === 0 || parseFloat(val) <= -100 || parseFloat(val) >= 100}
                    className="text-[10px] bg-blue-900/50 hover:bg-blue-800 disabled:bg-gray-900 disabled:text-gray-600 text-blue-300 px-2 py-1 rounded font-bold"
                  >
                    Apply
                  </button>
                </div>
              );
            })}
          </div>
          <p className="text-gray-600 text-[10px] mt-2">Enter percentage between -99 and +99 (e.g. 30 for +30%, -50 for -50%)</p>
        </div>

        {/* MARKET OVERVIEW WITH BID/ASK + SPARKLINES */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden mb-8">
          <div className="p-4 border-b border-gray-800 bg-gray-800/50">
            <h2 className="text-sm font-bold text-gray-300 flex items-center gap-2"><BarChart3 size={16} /> MARKET OVERVIEW</h2>
          </div>
          <div className="grid grid-cols-8 bg-gray-950 p-3 text-gray-500 text-[10px] font-bold uppercase tracking-wider">
            <span>Commodity</span>
            <span className="text-right">Mid</span>
            <span className="text-right text-red-400">Bid</span>
            <span className="text-right text-emerald-400">Ask</span>
            <span className="text-right">Spread</span>
            <span className="text-right">Available</span>
            <span className="text-center">Trend</span>
            <span className="text-center">Sentiment</span>
          </div>
          <div className="divide-y divide-gray-800">
            {commodityNames.map(name => {
              const c = currentData.commodities[name];
              const history = currentData.priceHistory?.[name] || [];
              const pressure = currentData.orderPressure?.[name];
              return (
                <div key={name} className="grid grid-cols-8 p-3 items-center hover:bg-gray-800/30">
                  <span className="font-bold text-white">{name}</span>
                  <span className="font-mono text-blue-300 text-right">{c.price.toLocaleString()}</span>
                  <span className="font-mono text-red-400 text-right">{(c.bidPrice || 0).toLocaleString()}</span>
                  <span className="font-mono text-emerald-400 text-right">{(c.askPrice || 0).toLocaleString()}</span>
                  <span className="font-mono text-gray-500 text-right">{c.spreadPct ? (c.spreadPct * 100).toFixed(1) : '?'}%</span>
                  <span className={`font-mono text-right ${c.available < 10 ? 'text-red-400' : 'text-gray-400'}`}>{c.available}/{c.total_supply}</span>
                  <span className="flex justify-center"><PriceChart data={history.slice(-20)} width={80} height={24} timeframeTicks={20} /></span>
                  <span className="flex justify-center"><SentimentBadge pressure={pressure} /></span>
                </div>
              );
            })}
          </div>
        </div>

        {/* LEADERBOARD */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden mb-8">
          <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-800/50">
            <h2 className="text-lg font-bold text-gray-300 flex items-center gap-2"><Eye size={18} /> LIVE VALUATION FEED</h2>
          </div>

          <div className="grid grid-cols-4 bg-gray-950 p-3 text-gray-500 text-xs font-bold uppercase tracking-wider">
            <span>Nation Team</span>
            <span className="text-right">Liquid Cash</span>
            <span className="text-right text-purple-400">Special</span>
            <span className="text-right">True Net Worth</span>
          </div>

          <div className="divide-y divide-gray-800">
            {Object.values(currentData.teams)
              .sort((a, b) => {
                const getVal = (t) => t.cash + Object.entries(t.portfolio).reduce((acc, [k, data]) => {
                   const price = (currentData.commodities[k].bidPrice || currentData.commodities[k].price);
                   const mult = t.specialCommodity === k ? 1.2 : 1.0;
                   return acc + (data.qty * price * mult);
                }, 0);
                return getVal(b) - getVal(a);
              })
              .map(t => {
                let totalVal = t.cash;
                Object.entries(t.portfolio).forEach(([comm, data]) => {
                  const price = currentData.commodities[comm].bidPrice || currentData.commodities[comm].price;
                  const mult = t.specialCommodity === comm ? 1.2 : 1.0;
                  totalVal += (data.qty * price * mult);
                });

                return (
                  <div key={t.id} className="grid grid-cols-4 p-4 hover:bg-gray-800/50 transition-colors items-center">
                    <span className="font-bold text-white text-lg">{t.name}</span>
                    <span className="font-mono text-gray-400 text-right">{t.cash.toLocaleString()}</span>
                    <span className="font-mono text-purple-400 text-right text-xs uppercase">{t.specialCommodity || '-'}</span>
                    <span className="font-mono font-bold text-green-400 text-right text-xl">{totalVal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  </div>
                )
              })}
          </div>

        </div>

        {/* TEAM MANAGEMENT & SPECIAL COMMODITIES */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden mb-8">
            <div className="p-4 border-b border-gray-800 bg-gray-800/50">
               <h2 className="text-sm font-bold text-gray-300 flex items-center gap-2"><Zap size={16} /> TEAM MANAGEMENT</h2>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
               {Object.values(currentData.teams).map(t => (
                  <div key={t.id} className="bg-black/40 p-4 rounded-lg border border-gray-800 space-y-3 relative group hover:border-blue-500/30 transition-colors">
                     <div className="flex justify-between items-center border-b border-gray-800 pb-2 mb-2">
                         <span className="text-white font-bold text-sm tracking-tight">{t.name}</span>
                         <span className={`font-mono text-xs font-bold ${t.cash >= 0 ? 'text-green-400' : 'text-red-400'}`}>{t.cash.toLocaleString()}</span>
                     </div>
                     
                     {/* SPECIAL COMMODITY */}
                     <div className="space-y-1">
                         <label className="text-[9px] text-purple-400 uppercase font-bold tracking-wider">Special Commodity (1.2x)</label>
                         <select 
                            className="w-full bg-gray-900 text-gray-300 text-xs border border-gray-700 rounded p-1.5 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 transition-all"
                            value={t.specialCommodity || ""}
                            onChange={(e) => {
                               socket.emit('admin_action', { 
                                  type: 'SET_SPECIAL_COMMODITY', 
                                  teamId: t.id, 
                                  commodityName: e.target.value || null 
                               });
                            }}
                         >
                            <option value="">-- None --</option>
                            {commodityNames.map(c => (
                               <option key={c} value={c}>{c}</option>
                            ))}
                         </select>
                     </div>

                     {/* CASH ADJUSTMENT */}
                     <div className="space-y-1">
                         <label className="text-[9px] text-blue-400 uppercase font-bold tracking-wider">Adjust Cash Fund</label>
                         <div className="relative">
                             <input 
                                type="number" 
                                placeholder="+/- Amount (Enter)"
                                className="w-full bg-black border border-gray-700 text-white px-2 py-1.5 rounded text-xs focus:border-blue-500 outline-none pr-8"
                                onKeyDown={(e) => {
                                    if(e.key === 'Enter') {
                                        const val = parseInt(e.target.value);
                                        if(!isNaN(val) && val !== 0) {
                                            socket.emit('admin_action', { type: 'ADJUST_CASH', teamId: t.id, amount: val });
                                            e.target.value = '';
                                        }
                                    }
                                }}
                             />
                             <div className="absolute right-2 top-1.5 text-gray-600 pointer-events-none text-[10px]">↵</div>
                         </div>
                     </div>
                  </div>
               ))}
            </div>
        </div>



        {/* DANGER ZONE */}
        <div className="border-t border-gray-800 pt-8 mt-8 text-center">
          <button
            onClick={handleGameReset}
            className="group flex items-center justify-center gap-2 mx-auto bg-transparent border border-red-900 text-red-900 hover:bg-red-950 hover:text-red-500 px-6 py-3 rounded uppercase tracking-widest text-xs font-bold transition-all"
          >
            <RotateCcw size={14} className="group-hover:rotate-180 transition-transform duration-500" />
            Factory Reset Game
          </button>
          <p className="text-gray-600 text-[10px] mt-2 uppercase">Warning: Irreversible Action</p>
        </div>
      </div>
    );
  }

    // --- VIEW 4: PLAYER DASHBOARD ---
    const myTeam = gameState.teams[teamId];
  
    // Calculate portfolio value at BID prices (realistic liquidation value)
    let portfolioValue = myTeam.cash;
    const holdingsBreakdown = [];
    
    // Safely access portfolio entries
    if (myTeam && myTeam.portfolio) {
      Object.entries(myTeam.portfolio).forEach(([comm, data]) => {
        // data is now { qty: number, avgPrice: number }
        // Ensure data is valid object, fallback if server hasn't updated yet for existing sessions
        const qty = typeof data === 'object' ? data.qty : data;
        const avgPrice = typeof data === 'object' ? data.avgPrice : 0;

        if (qty > 0) {
          const bidPrice = gameState.commodities[comm].bidPrice || gameState.commodities[comm].price;
          // Apply Special Commodity Multiplier (1.2x)
          const mult = myTeam.specialCommodity === comm ? 1.2 : 1.0;
          const value = qty * bidPrice * mult;
          
          portfolioValue += value;
          holdingsBreakdown.push({ 
             name: comm, 
             qty, 
             value,
             avgPrice,
             isSpecial: myTeam.specialCommodity === comm 
          });
        }
      });
    }

  
    const timeframes = [
      { label: '1m', ticks: 20 },
      { label: '5m', ticks: 100 },
      { label: '30m', ticks: 600 },
      { label: '1h', ticks: 1200 },
      { label: '2h', ticks: 2400 },
      { label: '3h', ticks: 3600 },
    ];
  
    return (
      <div className="min-h-screen bg-gray-950 text-white p-4 font-sans pb-20 relative">
        {warningOverlay}
        
        {/* NEWS TICKER */}
        <NewsTicker events={gameState.activeEvents} broadcastNews={gameState.broadcastNews} tradeFeed={gameState.tradeFeed} />


      <header className="flex flex-col md:flex-row justify-between items-stretch gap-4 mb-6">

        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-xl flex-1 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <ShieldCheck size={100} />
          </div>

          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight">{myTeam.name}</h1>
            </div>

            <button
              onClick={handleLogout}
              className="relative flex items-center gap-2 bg-gray-800 hover:bg-red-900/50 text-gray-400 hover:text-red-400 px-4 py-2 rounded-lg text-xs font-bold tracking-widest uppercase transition-all border border-transparent hover:border-red-900/50 cursor-pointer z-50"
            >
              <LogOut size={14} className="pointer-events-none" /> 
              <span className="pointer-events-none">Terminate</span>
            </button>
          </div>
        </div>

        {/* PORTFOLIO SUMMARY */}
        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-xl min-w-[300px] flex flex-col justify-center">
          <div className="flex justify-between items-center mb-2">
            <div className="text-gray-400 text-xs uppercase tracking-widest">Cash</div>
            <div className="text-2xl font-mono text-green-400 font-bold tracking-tighter">{myTeam.cash.toLocaleString()}</div>
          </div>
          <div className="flex justify-between items-center mb-2">
            <div className="text-gray-400 text-xs uppercase tracking-widest">Holdings <span className="text-gray-600">(at bid)</span></div>
            <div className="text-lg font-mono text-blue-300 font-bold">{(portfolioValue - myTeam.cash).toLocaleString()}</div>
          </div>
          <div className="border-t border-gray-800 pt-2 flex justify-between items-center">
            <div className="text-gray-300 text-xs uppercase tracking-widest font-bold">Net Worth</div>
            <div className="text-2xl font-mono text-white font-black">{portfolioValue.toLocaleString()}</div>
          </div>
          {holdingsBreakdown.length > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-800/50 flex flex-wrap gap-x-3 gap-y-1">
              {holdingsBreakdown.map(h => (
                <span key={h.name} className={`text-[10px] ${h.isSpecial ? 'text-purple-400 font-bold border border-purple-500/50 rounded px-1' : 'text-gray-500'}`}>
                  {h.name}{h.isSpecial ? ' (★)' : ''}: <span className={h.isSpecial ? 'text-white' : 'text-gray-300'}>{h.qty}</span> ({h.value.toLocaleString()})
                </span>
              ))}

            </div>
          )}
        </div>
      </header>

      {!gameState.marketOpen && (
        <div className="animate-pulse bg-red-950/50 border border-red-900/50 text-red-400 p-4 rounded-xl mb-8 text-center font-bold flex items-center justify-center gap-3 shadow-[0_0_15px_rgba(220,38,38,0.2)]">
          <AlertTriangle /> MARKET CLOSED - TRADING SUSPENDED <AlertTriangle />
        </div>
      )}

      <div className="flex justify-center mb-6">
        <div className="inline-flex bg-gray-900 border border-gray-800 rounded-lg p-1">
          {timeframes.map((tf) => (
            <button
              key={tf.label}
              onClick={() => setChartTimeframe(tf.ticks)}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                chartTimeframe === tf.ticks
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.values(gameState.commodities).map(comm => {
          const history = gameState.priceHistory?.[comm.name] || [];
          const pressure = gameState.orderPressure?.[comm.name];
          const qty = getQty(comm.name);
          // Handle new data structure { qty, avgPrice, realizedPnL, totalCostSold } vs legacy/fallback
          const portfolioData = myTeam.portfolio[comm.name] || { qty: 0, avgPrice: 0, realizedPnL: 0, totalCostSold: 0 };
          const held = typeof portfolioData === 'object' ? portfolioData.qty : portfolioData;
          const avgBuyPrice = typeof portfolioData === 'object' ? portfolioData.avgPrice : 0;
          const realizedPnL = typeof portfolioData === 'object' ? (portfolioData.realizedPnL || 0) : 0;
          const totalCostSold = typeof portfolioData === 'object' ? (portfolioData.totalCostSold || 0) : 0;

          const sellQty = Math.min(qty, held);
          const askPrice = comm.askPrice || comm.price;
          const bidPrice = comm.bidPrice || comm.price;

          // Calculate Unrealized Return (Current Holdings)
          let unrealizedReturnVal = 0;
          let unrealizedReturnPct = 0;
          if (held > 0 && avgBuyPrice > 0) {
             const currentVal = held * bidPrice;
             const investedVal = held * avgBuyPrice;
             unrealizedReturnVal = currentVal - investedVal;
             unrealizedReturnPct = (unrealizedReturnVal / investedVal) * 100;
          }

          // Calculate Realized Return (Trading History)
          let realizedReturnPct = 0;
          if (totalCostSold > 0) {
              realizedReturnPct = (realizedPnL / totalCostSold) * 100;
          }

          return (
            <div key={comm.name} className="relative bg-gray-900 rounded-xl p-6 border border-gray-800 shadow-lg hover:border-gray-700 transition-all hover:-translate-y-1 group">


              <div className="flex justify-between items-start mb-3 border-b border-gray-800 pb-3">
                <div>
                  <h3 className="text-2xl font-bold text-white group-hover:text-blue-400 transition-colors">{comm.name}</h3>
                  <p className="text-xs text-gray-500 mt-1">Supply: {comm.available}/{comm.total_supply}</p>
                  <div className="mt-1"><SentimentBadge pressure={pressure} /></div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-mono text-blue-300">{comm.price.toLocaleString()}</div>
                  <PriceChange history={history} />
                  <div className={`text-xs font-bold mt-1 ${comm.available < 10 ? 'text-red-500 animate-pulse' : 'text-emerald-500'}`}>
                    {comm.available <= 0 ? 'SOLD OUT' : `${comm.available} LEFT`}
                  </div>
                </div>
              </div>

              {/* BID / ASK BAR */}
              <div className="bg-black/40 rounded-lg px-3 py-2 mb-3 border border-gray-800/50">
                <BidAskBar bidPrice={bidPrice} askPrice={askPrice} spreadPct={comm.spreadPct} />
              </div>

              {/* SPARKLINE (dynamic timeframe) */}
              {history.length >= 2 && (
                <div className="bg-black/40 rounded-lg p-3 mb-3 border border-gray-800/50 flex items-center justify-center">
                  <PriceChart data={history.slice(-chartTimeframe)} width={280} height={80} timeframeTicks={chartTimeframe} />
                </div>
              )}


              <div className="bg-black/40 p-4 rounded-lg mb-4 border border-gray-800/50">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-gray-500 text-xs uppercase font-bold">Your Portfolio</span>
                    <span className="font-mono font-bold text-xl text-white">{held} <span className="text-xs text-gray-600 font-normal">qty</span></span>
                </div>
                
                {/* Average Return Display */}
                {held > 0 && (
                    <div className="flex justify-between items-center border-t border-gray-800 pt-2 mt-2">
                        <div className="flex flex-col">
                            <span className="text-[9px] text-gray-500 uppercase">Avg Buy Price</span>
                            <span className="text-xs font-mono text-gray-300">{avgBuyPrice.toLocaleString()}</span>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-[9px] text-gray-500 uppercase">Return</span>
                            <span className={`text-xs font-mono font-bold ${unrealizedReturnVal >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {unrealizedReturnVal > 0 ? '+' : ''}{unrealizedReturnVal.toLocaleString()} ({unrealizedReturnPct.toFixed(1)}%)
                            </span>
                        </div>
                    </div>
                )}
              </div>


              {/* QUANTITY SELECTOR */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-400 text-xs uppercase">Quantity</span>
                <QuantitySelector value={qty} onChange={(v) => setQty(comm.name, v)} max={10} />
                <div className="text-right text-xs font-mono leading-tight">
                  <div className="text-emerald-400">Buy: {(askPrice * qty).toLocaleString()}</div>
                  <div className="text-red-400">Sell: {(bidPrice * sellQty).toLocaleString()}{sellQty < qty && held > 0 ? ` (x${sellQty})` : ''}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => socket.emit('trade', { teamId, commodityName: comm.name, quantity: qty, type: 'BUY' })}
                  disabled={!gameState.marketOpen || comm.available < qty || myTeam.cash < askPrice * qty}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-emerald-900/20"
                >
                  <TrendingUp size={18} /> BUY {qty > 1 ? `x${qty}` : ''}
                </button>
                <button
                  onClick={() => socket.emit('trade', { teamId, commodityName: comm.name, quantity: sellQty, type: 'SELL' })}
                  disabled={!gameState.marketOpen || held <= 0}
                  className="bg-red-600 hover:bg-red-500 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-red-900/20"
                >
                  <TrendingDown size={18} /> SELL {sellQty > 1 ? `x${sellQty}` : ''}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default App;
