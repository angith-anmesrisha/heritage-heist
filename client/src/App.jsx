import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { TrendingUp, TrendingDown, AlertTriangle, ShieldCheck, Lock, Eye, EyeOff, Key, LogOut, RotateCcw } from 'lucide-react';

const socket = io('http://localhost:3001');

// --- CONFIGURATION ---
const ADMIN_PASSWORD = "Angi@Ecell2026"; 

function App() {
  const [view, setView] = useState('login'); 
  const [teamId, setTeamId] = useState('');
  const [passwordInput, setPasswordInput] = useState(''); 
  const [adminPassInput, setAdminPassInput] = useState(''); 
  
  const [gameState, setGameState] = useState(null);
  const [adminState, setAdminState] = useState(null);
  const [config, setConfig] = useState([]);

  useEffect(() => {
    socket.on('init', (data) => {
      setConfig(data.config);
      setGameState(data.state);
    });

    socket.on('login_approved', (id) => {
        setView('dashboard');
    });

    socket.on('update_state', (state) => setGameState(state));
    socket.on('update_admin_state', (state) => setAdminState(state));
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
    if (adminPassInput === ADMIN_PASSWORD) {
        setView('admin');
        setAdminPassInput(''); 
    } else {
        alert("ACCESS DENIED: INCORRECT CREDENTIALS");
        setAdminPassInput('');
    }
  };

  const handleLogout = () => {
      if (confirm("⚠️ TERMINATE SESSION?\n\nThis will disconnect you from the market.")) {
          window.location.reload(); 
      }
  };

  // --- NEW: RESET FUNCTION ---
  const handleGameReset = () => {
    if (confirm("☢️ WARNING: FACTORY RESET ☢️\n\nThis will wipe ALL progress, money, and trades.\nAre you absolutely sure?")) {
        if (confirm("Double Check: This cannot be undone. Reset Game?")) {
            socket.emit('admin_action', { type: 'RESET_GAME' });
        }
    }
  };

  if (!gameState) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center text-blue-500 font-mono animate-pulse">
      Connecting to Trade Server...
    </div>
  );

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

  // --- VIEW 3: ADMIN PANEL (GOD MODE) ---
  if (view === 'admin') {
    const currentData = adminState || gameState; 
    
    return (
      <div className="min-h-screen bg-black text-white font-mono p-6">
        <div className="flex justify-between items-center mb-8 bg-gray-900/50 p-4 rounded-lg border border-red-900/30">
            <div className="flex items-center gap-3">
                <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse"></div>
                <div>
                    <h1 className="text-2xl font-bold text-red-500 tracking-tight">ADMIN COMMAND CENTER</h1>
                    <p className="text-xs text-red-400 opacity-70">REAL-TIME SURVEILLANCE • GOD MODE ACTIVE</p>
                </div>
            </div>
            <button onClick={() => window.location.reload()} className="text-gray-500 hover:text-white text-sm">LOGOUT</button>
        </div>

        {/* CONTROLS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <button 
                onClick={() => socket.emit('admin_action', { type: currentData.marketOpen ? 'CLOSE_MARKET' : 'OPEN_MARKET' })}
                className={`p-6 rounded-lg font-bold text-xl border-b-4 transition-all active:border-b-0 active:translate-y-1 ${currentData.marketOpen ? 'bg-red-900 border-red-950 text-red-100 hover:bg-red-800' : 'bg-emerald-700 border-emerald-900 text-emerald-100 hover:bg-emerald-600'}`}
            >
                {currentData.marketOpen ? '🛑 FREEZE MARKET' : '🟢 OPEN MARKET'}
            </button>
            <button onClick={() => socket.emit('admin_action', { type: 'SHOCK', multiplier: 1.5 })} className="bg-blue-900 border-b-4 border-blue-950 hover:bg-blue-800 p-6 rounded-lg font-bold text-blue-100">
                🚀 BOOM (x1.5)
            </button>
            <button onClick={() => socket.emit('admin_action', { type: 'SHOCK', multiplier: 0.5 })} className="bg-orange-900 border-b-4 border-orange-950 hover:bg-orange-800 p-6 rounded-lg font-bold text-orange-100">
                📉 CRASH (x0.5)
            </button>
             <button onClick={() => socket.emit('admin_action', { type: 'SHOCK', multiplier: 1.25 })} className="bg-purple-900 border-b-4 border-purple-950 hover:bg-purple-800 p-6 rounded-lg font-bold text-purple-100">
                ⚡ SURGE (x1.25)
            </button>
        </div>

        {/* LEADERBOARD */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden mb-8">
            <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-800/50">
                <h2 className="text-lg font-bold text-gray-300 flex items-center gap-2"><Eye size={18}/> LIVE VALUATION FEED</h2>
                <span className="text-xs text-gray-500">Auto-refreshing...</span>
            </div>
            
            <div className="grid grid-cols-4 bg-gray-950 p-3 text-gray-500 text-xs font-bold uppercase tracking-wider">
              <span>Nation Team</span>
              <span>Hidden Specialty</span>
              <span className="text-right">Liquid Cash</span>
              <span className="text-right">True Net Worth</span>
            </div>
            
            <div className="divide-y divide-gray-800">
            {Object.values(currentData.teams)
                .sort((a, b) => {
                     const valA = a.cash + Object.entries(a.portfolio).reduce((acc, [k, v]) => acc + (v * currentData.commodities[k].price * (k===a.special?1.2:1)), 0);
                     const valB = b.cash + Object.entries(b.portfolio).reduce((acc, [k, v]) => acc + (v * currentData.commodities[k].price * (k===b.special?1.2:1)), 0);
                     return valB - valA;
                })
                .map(t => {
                    let totalVal = t.cash;
                    Object.entries(t.portfolio).forEach(([comm, qty]) => {
                        const price = currentData.commodities[comm].price;
                        const multiplier = (comm === t.special) ? 1.2 : 1.0;
                        totalVal += (qty * price * multiplier);
                    });

                    return (
                        <div key={t.id} className="grid grid-cols-4 p-4 hover:bg-gray-800/50 transition-colors items-center">
                            <span className="font-bold text-white text-lg">{t.name}</span>
                            <span className="text-yellow-500 font-mono text-sm flex items-center gap-1">
                                {t.special ? <Lock size={12}/> : <AlertTriangle size={12}/>} 
                                {t.special || "ERR"}
                            </span>
                            <span className="font-mono text-gray-400 text-right">₹{t.cash.toLocaleString()}</span>
                            <span className="font-mono font-bold text-green-400 text-right text-xl">₹{totalVal.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                        </div>
                    )
            })}
            </div>
        </div>

        {/* --- DANGER ZONE (RESET BUTTON) --- */}
        <div className="border-t border-gray-800 pt-8 mt-8 text-center">
             <button 
                onClick={handleGameReset}
                className="group flex items-center justify-center gap-2 mx-auto bg-transparent border border-red-900 text-red-900 hover:bg-red-950 hover:text-red-500 px-6 py-3 rounded uppercase tracking-widest text-xs font-bold transition-all"
             >
                <RotateCcw size={14} className="group-hover:rotate-180 transition-transform duration-500"/> 
                Factory Reset Game
             </button>
             <p className="text-gray-600 text-[10px] mt-2 uppercase">Warning: Irreversible Action</p>
        </div>

      </div>
    );
  }

  // --- VIEW 4: PLAYER DASHBOARD ---
  const myTeam = gameState.teams[teamId];
  
  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 font-sans pb-20">
      <header className="flex flex-col md:flex-row justify-between items-stretch gap-4 mb-6">
        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-xl flex-1 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <ShieldCheck size={100} />
            </div>
            
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-black text-white tracking-tight">{myTeam.name}</h1>
                <div className="mt-2 flex items-center gap-2 text-sm text-yellow-600 bg-yellow-900/10 w-fit px-3 py-1 rounded-full border border-yellow-900/30">
                  <Lock size={14} className="animate-pulse"/> 
                  <span className="font-bold tracking-wide">SPECIALTY: CLASSIFIED</span>
                </div>
              </div>
              
              <button 
                onClick={handleLogout}
                className="flex items-center gap-2 bg-gray-800 hover:bg-red-900/50 text-gray-400 hover:text-red-400 px-4 py-2 rounded-lg text-xs font-bold tracking-widest uppercase transition-all border border-transparent hover:border-red-900/50"
              >
                <LogOut size={14} /> Terminate
              </button>
            </div>
        </div>

        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-xl min-w-[300px] flex flex-col justify-center text-right">
            <div className="text-gray-400 text-xs uppercase tracking-widest mb-1">Available Capital</div>
            <div className="text-4xl font-mono text-green-400 font-bold tracking-tighter">₹{myTeam.cash.toLocaleString()}</div>
        </div>
      </header>

      {!gameState.marketOpen && (
          <div className="animate-pulse bg-red-950/50 border border-red-900/50 text-red-400 p-4 rounded-xl mb-8 text-center font-bold flex items-center justify-center gap-3 shadow-[0_0_15px_rgba(220,38,38,0.2)]">
              <AlertTriangle /> MARKET CLOSED - TRADING SUSPENDED <AlertTriangle />
          </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.values(gameState.commodities).map(comm => (
          <div key={comm.name} className="relative bg-gray-900 rounded-xl p-6 border border-gray-800 shadow-lg hover:border-gray-700 transition-all hover:-translate-y-1 group">
            
            <div className="flex justify-between items-start mb-6 border-b border-gray-800 pb-4">
                <div>
                    <h3 className="text-2xl font-bold text-white group-hover:text-blue-400 transition-colors">{comm.name}</h3>
                    <p className="text-xs text-gray-500 mt-1">Global Supply Cap: {comm.total_supply}</p>
                </div>
                <div className="text-right">
                    <div className="text-2xl font-mono text-blue-300">₹{comm.price}</div>
                    <div className={`text-xs font-bold mt-1 ${comm.available < 10 ? 'text-red-500' : 'text-emerald-500'}`}>
                      {comm.available} UNITS LEFT
                    </div>
                </div>
            </div>

            <div className="bg-black/40 p-4 rounded-lg mb-6 flex justify-between items-center border border-gray-800/50">
                <span className="text-gray-500 text-xs uppercase font-bold">Your Portfolio</span>
                <span className="font-mono font-bold text-xl text-white">{myTeam.portfolio[comm.name]} <span className="text-xs text-gray-600 font-normal">qty</span></span>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <button 
                    onClick={() => socket.emit('trade', { teamId, commodityName: comm.name, quantity: 1, type: 'BUY' })}
                    disabled={!gameState.marketOpen || comm.available <= 0}
                    className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-emerald-900/20"
                >
                    <TrendingUp size={18}/> BUY
                </button>
                <button 
                    onClick={() => socket.emit('trade', { teamId, commodityName: comm.name, quantity: 1, type: 'SELL' })}
                    disabled={!gameState.marketOpen || myTeam.portfolio[comm.name] <= 0}
                    className="bg-red-600 hover:bg-red-500 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-red-900/20"
                >
                    <TrendingDown size={18}/> SELL
                </button>
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-800 flex justify-between items-center opacity-60 hover:opacity-100 transition-opacity">
              <span className="text-[10px] text-gray-500 uppercase tracking-widest">Phase Limits</span>
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className={`h-1.5 w-4 rounded-full transition-colors ${i < (myTeam.trades_this_phase[comm.name] || 0) ? 'bg-blue-500' : 'bg-gray-800'}`}></div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;