"use client";

import { useGameRoom } from "@/hooks/useGameRoom";
import { GameScene } from "@/components/game/GameScene";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState, use } from "react";
import { Users, Trophy } from "lucide-react";

export default function HostPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params);
  const { roomState, updatePosition, socket } = useGameRoom(roomId);
  const [origin, setOrigin] = useState("");
  const [isLocalhost, setIsLocalhost] = useState(false);
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
    setIsLocalhost(window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
    // Check if already authenticated in session
    if (sessionStorage.getItem(`auth_${roomId}`) === "true") {
        setIsAuthenticated(true);
    }
  }, [roomId]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "Admin123") {
        setIsAuthenticated(true);
        sessionStorage.setItem(`auth_${roomId}`, "true");
        setError("");
    } else {
        setError("Invalid Access Key");
    }
  };

  const joinUrl = `${origin}/play/${roomId}`;
  const players = roomState ? Object.values(roomState.players) : [];
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const topPlayer = sortedPlayers[0];
  const isPlaying = roomState?.state === 'PLAYING' || roomState?.state === 'GAME_OVER';
  const [killFeed, setKillFeed] = useState<{ id: string, name: string, time: number }[]>([]);

  // Track deaths for Kill Feed
  useEffect(() => {
    if (!roomState) return;
    const deadPlayers = Object.values(roomState.players).filter(p => !p.isAlive);
    
    deadPlayers.forEach(p => {
        if (!killFeed.find(k => k.id === p.id)) {
            setKillFeed(prev => [...prev, { id: p.id, name: p.name, time: Date.now() }]);
        }
    });

    // Cleanup old messages
    const now = Date.now();
    const activeKills = killFeed.filter(k => now - k.time < 5000);
    if (activeKills.length !== killFeed.length) {
        setKillFeed(activeKills);
    }
  }, [roomState?.players]);

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950 text-white font-sans p-6">
        <div className="bg-white/5 backdrop-blur-3xl rounded-[3rem] p-12 shadow-2xl border border-white/10 w-full max-w-md animate-in fade-in zoom-in duration-500">
           <h1 className="text-4xl font-black mb-8 tracking-tighter uppercase italic leading-none text-center">
              Host <br/> Access
           </h1>
           <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em] ml-4">Access Key</label>
                 <input 
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-center text-2xl font-black tracking-[0.3em] outline-none focus:border-sky-500 transition-colors"
                    placeholder="••••••••"
                 />
              </div>
              {error && <p className="text-red-400 text-center text-[10px] font-black uppercase tracking-widest animate-bounce">{error}</p>}
              <button 
                type="submit"
                className="w-full bg-sky-500 hover:bg-sky-400 text-white font-black py-4 rounded-2xl shadow-lg transition-all active:scale-95 uppercase italic tracking-widest"
              >
                Launch Dashboard
              </button>
           </form>
        </div>
      </div>
    );
  }

  if (!roomState) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-sky-900 text-white font-sans">
        <div className="text-2xl animate-pulse font-black uppercase tracking-widest">Initializing Room...</div>
      </div>
    );
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-sky-900">
      {/* 3D View */}
      <div className="absolute inset-0">
        <GameScene roomState={roomState} onUpdatePosition={updatePosition} socket={socket} />
      </div>

      {/* Overlays */}
      <div className="absolute inset-0 flex flex-col md:flex-row p-4 md:p-10 pointer-events-none overflow-y-auto sm:overflow-hidden">
        {/* Left Side: Room Info & Players */}
        <div className="flex flex-col w-96 space-y-8 pointer-events-auto">
          <div className="bg-white/10 backdrop-blur-3xl rounded-[3rem] p-10 shadow-2xl border border-white/20">
            <h1 className="text-5xl font-black text-white mb-8 tracking-tighter uppercase italic leading-none">
              Flappy <br/> Party 3D
            </h1>
            <div className="space-y-6">
              <div className="bg-white/5 rounded-3xl p-6 flex flex-col items-center justify-center border border-white/10 shadow-inner">
                <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em] mb-2">Access Code</span>
                <span className="text-5xl font-black text-white tracking-[0.2em]">{roomId}</span>
              </div>
              
              <div className="bg-amber-400/10 rounded-3xl p-6 flex flex-col items-center justify-center border border-amber-400/20 shadow-2xl">
                <span className="text-[10px] font-black text-amber-400 uppercase tracking-[0.5em] mb-2">World Record</span>
                <div className="flex items-center gap-3">
                    <Trophy className="w-6 h-6 text-amber-400" />
                    <span className="text-5xl font-black text-amber-400 tracking-tighter italic">{roomState.allTimeBest || 0}</span>
                </div>
              </div>

              <div className="bg-white p-4 rounded-[2.5rem] shadow-2xl flex justify-center border-8 border-white/10">
                <QRCodeSVG value={joinUrl} size={220} />
              </div>
              <p className="text-center text-sm font-black text-white/60 uppercase tracking-widest mt-4">Scan to Join</p>
              
              {isLocalhost && (
                <div className="mt-4 p-4 bg-amber-400/10 border border-amber-400/20 rounded-2xl text-amber-400/80 text-[10px] font-black text-center leading-relaxed uppercase tracking-widest">
                  ⚠️ Phone scan won't work on "localhost". <br/>
                  Use your IP address (e.g. 192.168.x.x)
                </div>
              )}
            </div>
          </div>

          <div className="bg-black/20 backdrop-blur-2xl rounded-[3rem] p-10 shadow-2xl border border-white/10 flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-black text-white flex items-center gap-4">
                <div className="bg-sky-500/20 p-2 rounded-xl">
                    <Users className="w-6 h-6 text-sky-400" />
                </div>
                Players ({players.length})
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {players.length === 0 ? (
                <p className="text-sky-300/40 text-center italic mt-16 font-bold uppercase tracking-widest text-sm">Joining...</p>
              ) : (
                players.map(player => (
                  <div key={player.id} className={`flex items-center justify-between p-4 rounded-2xl transition-all duration-500 border ${player.isAlive ? 'bg-white/5 border-white/10' : 'bg-red-500/10 border-red-500/20 grayscale opacity-40'}`}>
                    <div className="flex items-center gap-4">
                      <div className="w-4 h-4 rounded-full shadow-lg" style={{ backgroundColor: player.color }} />
                      <span className="font-black text-white text-lg tracking-tight truncate max-w-[140px] uppercase italic">{player.name}</span>
                    </div>
                    <span className={`text-[10px] font-black px-3 py-1 rounded-full tracking-widest ${player.isAlive ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-500 border border-red-500/30'}`}>
                      {player.isAlive ? 'READY' : 'CRASHED'}
                    </span>
                  </div>
                ))
              )}
            </div>
            
            <div className="mt-8">
                {players.length < 2 ? (
                    <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-400 text-xs font-black text-center animate-pulse uppercase tracking-[0.2em]">
                        Need 1 more player...
                    </div>
                ) : roomState.state === 'WAITING' ? (
                    <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-2xl text-green-400 text-xs font-black text-center animate-pulse uppercase tracking-[0.2em]">
                        Ready to launch!
                    </div>
                ) : null}
            </div>
          </div>
        </div>

        {/* Right Side: Leaderboard */}
        {isPlaying && (
          <div className="ml-auto w-80 space-y-6 pointer-events-auto">
            <div className="bg-white/10 backdrop-blur-3xl rounded-[3rem] p-10 shadow-2xl border border-white/20 animate-in slide-in-from-right-20 duration-500">
              <div className="flex items-center gap-3 mb-8">
                <Trophy className="w-8 h-8 text-amber-400" />
                <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter leading-none">Leaderboard</h2>
              </div>
              <div className="space-y-4">
                {sortedPlayers.slice(0, 5).map((player, index) => (
                  <div key={player.id} className="flex items-center justify-between group transition-transform hover:translate-x-1">
                    <div className="flex items-center gap-4">
                      <span className={`text-xl font-black ${index === 0 ? 'text-amber-400' : 'text-white/40'}`}>
                        0{index + 1}
                      </span>
                      <span className="font-black text-white text-lg tracking-tight uppercase italic">{player.name}</span>
                    </div>
                    <span className="text-2xl font-black text-white tracking-tighter">{Math.floor(player.score)}</span>
                  </div>
                ))}
              </div>
            </div>

            {roomState.state === 'GAME_OVER' && topPlayer && (
                 <div className="bg-amber-400 rounded-[3rem] p-10 shadow-[0_20px_50px_rgba(251,191,36,0.3)] border-4 border-white animate-in zoom-in duration-500 text-center">
                    <p className="text-amber-900 font-black text-[10px] uppercase tracking-[0.5em] mb-2">Round Champion</p>
                    <h3 className="text-4xl font-black text-amber-950 uppercase italic tracking-tighter mb-4 line-clamp-1">{topPlayer.name}</h3>
                    <div className="bg-white/30 rounded-2xl py-2 px-4 inline-block font-black text-amber-900 text-3xl">
                        {Math.floor(topPlayer.score)} PTS
                    </div>
                 </div>
            )}
          </div>
        )}
      </div>

      {/* Global Status Footer */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-none">
        {roomState.state === 'STARTING' ? (
             <div className="flex flex-col items-center bg-white/10 backdrop-blur-xl px-12 py-6 rounded-full border border-white/20 shadow-2xl">
                <div className="flex items-center gap-4 mb-1">
                  <span className="text-white font-black text-5xl italic tracking-tighter">{roomState.countdown}</span>
                  <p className="text-white font-black text-xl uppercase tracking-[0.5em] animate-pulse italic">Starting...</p>
                </div>
             </div>
        ) : roomState.state === 'WAITING' && (
             <div className="bg-white/5 backdrop-blur-md px-8 py-3 rounded-full border border-white/10 opacity-40">
                <p className="text-white text-[10px] font-black uppercase tracking-[0.8em]">Lobby Active • Global Sync Online</p>
             </div>
        )}
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }

        @media (max-height: 500px) and (orientation: landscape) {
            .w-96 { width: 300px !important; }
            .w-80 { width: 250px !important; }
            .p-10 { padding: 1.25rem !important; }
            .p-6 { padding: 1rem !important; }
            .text-5xl { font-size: 2rem !important; }
            .text-4xl { font-size: 1.5rem !important; }
            .text-2xl { font-size: 1.1rem !important; }
            .mb-8 { margin-bottom: 0.75rem !important; }
            .space-y-8 { gap: 1rem !important; }
            .space-y-6 { gap: 0.75rem !important; }
            canvas { opacity: 0.3; } /* Lighten background scene to focus on UI on small screens */
            .rounded-[3rem] { border-radius: 1.5rem !important; }
        }
      `}</style>
    </div>
  );
}
