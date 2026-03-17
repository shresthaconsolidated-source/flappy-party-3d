"use client";

import { useGameRoom } from "@/hooks/useGameRoom";
import { GameScene } from "@/components/game/GameScene";
import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Wifi, Trophy, ChevronRight, Bird as BirdIcon, LogOut, RotateCcw, Play, Maximize, Minimize } from "lucide-react";

export default function PlayerPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params);
  const { roomState, join, flap, die, socket, updatePosition, updateScore, startGame, restart } = useGameRoom(roomId);
  const router = useRouter();
  const [name, setName] = useState("");
  const [hasJoined, setHasJoined] = useState(false);
  const [jumpTrigger, setJumpTrigger] = useState(0);
  const [isAcknowledged, setIsAcknowledged] = useState(false);
  const [persistentBest, setPersistentBest] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedColor, setSelectedColor] = useState("#38bdf8");
  const localPlayerId = socket?.id;

  const BIRD_COLORS = ["#f87171", "#38bdf8", "#4ade80", "#fbbf24", "#a78bfa", "#f472b6", "#ffffff"];

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
        try {
            await document.documentElement.requestFullscreen();
            if (screen.orientation && (screen.orientation as any).lock) {
                await (screen.orientation as any).lock('landscape').catch(() => {});
            }
            setIsFullscreen(true);
        } catch (e) {
            console.error("Fullscreen failed:", e);
        }
    } else {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Load persistent best
  useEffect(() => {
    const saved = localStorage.getItem('flappy_pb');
    if (saved) setPersistentBest(parseInt(saved));
  }, []);

  // Update persistent best
  useEffect(() => {
    const localPlayer = localPlayerId ? roomState?.players[localPlayerId] : null;
    if (localPlayer && localPlayer.score > persistentBest) {
        setPersistentBest(localPlayer.score);
        localStorage.setItem('flappy_pb', localPlayer.score.toString());
    }
  }, [roomState?.players, localPlayerId, persistentBest]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      join(name, selectedColor);
      setHasJoined(true);
    }
  };

  const sendEmoji = (emoji: string) => {
    socket?.send(JSON.stringify({ type: 'emoji', emoji, playerId: localPlayerId }));
  };

  const handleFlap = () => {
    if (roomState?.state === 'PLAYING') {
      flap();
      setJumpTrigger(j => j + 1);
    }
  };

  const handleQuit = () => {
    router.push('/');
  };

  // Reset acknowledgment when a new round starts
  useEffect(() => {
    if (roomState?.state === 'STARTING') {
      setIsAcknowledged(false);
    }
  }, [roomState?.state]);

  if (!roomState) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950 text-white p-6 text-center">
        <div className="text-xl font-bold animate-pulse flex flex-col items-center">
            <Wifi className="w-12 h-12 mb-4 text-sky-400" />
            <span className="tracking-[0.3em] uppercase opacity-50">Syncing Room...</span>
            <span className="text-4xl font-black italic mt-2">{roomId}</span>
        </div>
      </div>
    );
  }

  if (!hasJoined) {
    return (
      <div className="min-h-screen bg-slate-950 p-4 flex flex-col items-center justify-center font-sans overflow-y-auto">
        <div className="w-full max-w-sm bg-white/5 backdrop-blur-3xl rounded-[3rem] p-8 shadow-2xl border border-white/10 flex flex-col max-h-[90vh]">
          <div className="flex flex-col items-center mb-6 flex-shrink-0">
            <div className="w-16 h-16 bg-sky-500/20 rounded-full flex items-center justify-center mb-4 border border-sky-400/30">
              <BirdIcon className="w-8 h-8 text-sky-400" />
            </div>
            <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase leading-none text-center">
                Flappy <br/> Party 3D
            </h1>
          </div>

          <form onSubmit={handleJoin} className="space-y-4 overflow-y-auto pr-2">
            <div className="space-y-1">
              <label className="block text-[8px] font-black text-white/40 uppercase tracking-[0.4em] mb-1 ml-4">Callsign</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={12}
                placeholder="SKY-KING"
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-xl font-black text-white placeholder:text-white/10 focus:outline-none focus:border-sky-500 transition-all text-center uppercase italic"
                autoFocus
                required
              />
            </div>
            <div className="space-y-4">
              <label className="block text-[8px] font-black text-white/40 uppercase tracking-[0.4em] mb-1 ml-4 text-center">Select Bird Color</label>
              <div className="flex justify-center gap-3 flex-wrap">
                {BIRD_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSelectedColor(c)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${selectedColor === c ? 'scale-125 border-white' : 'border-transparent opacity-50 hover:opacity-100'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-sky-500 hover:bg-sky-400 text-white font-black py-5 rounded-[2rem] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 text-xl italic tracking-tighter"
            >
              LAUNCH
              <ChevronRight className="w-6 h-6" />
            </button>
          </form>
        </div>
        
        <p className="mt-8 text-white/20 font-black text-[10px] tracking-[0.5em] uppercase">V2.0 Premium Experience</p>
      </div>
    );
  }

  const localPlayer = localPlayerId ? roomState.players[localPlayerId] : null;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 touch-none" onClick={handleFlap}>
      {/* 3D View */}
      <div className="absolute inset-0">
        <GameScene 
          roomState={roomState} 
          localPlayerId={localPlayerId} 
          onFlap={flap}
          onDie={(score) => die(score)}
          jumpTrigger={jumpTrigger}
          onUpdatePosition={updatePosition}
          onScoreUpdate={updateScore}
          socket={socket}
        />
      </div>

      {/* Interface Layer */}
      <div className="absolute inset-0 z-10 flex flex-col pointer-events-none p-4 safe-area-inset">
        {/* Top HUD - Landscape Friendly */}
        <div className="flex justify-between items-start w-full gap-4">
            <div className="flex items-start gap-2">
                <div className="bg-white/5 backdrop-blur-2xl rounded-2xl p-2 sm:p-3 border border-white/10 shadow-2xl min-w-[60px] sm:min-w-[80px]">
                    <p className="text-[6px] sm:text-[7px] font-black text-white/40 uppercase tracking-[0.3em] mb-0 sm:mb-1">Score</p>
                    <p className="text-lg sm:text-2xl font-black text-white leading-none italic">{localPlayer?.score || 0}</p>
                </div>
                
                <div className="hidden sm:flex flex-col gap-1">
                    <div className="bg-amber-400/10 backdrop-blur-2xl rounded-xl p-1.5 border border-amber-400/20 shadow-2xl flex items-center gap-2">
                        <Trophy className="w-2.5 h-2.5 text-amber-400" />
                        <div className="text-right">
                            <p className="text-[5px] font-black text-amber-400/50 uppercase tracking-[0.2em]">Record</p>
                            <p className="text-sm font-black text-amber-400 leading-none italic">{roomState.allTimeBest || 0}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Compact Stats for Mobile Landscape */}
            <div className="flex sm:hidden items-center gap-2 bg-black/20 backdrop-blur-xl px-3 py-1.5 rounded-full border border-white/10">
                 <div className="flex items-center gap-1 border-r border-white/10 pr-2">
                    <Trophy className="w-2.5 h-2.5 text-amber-400" />
                    <span className="text-[10px] font-black text-amber-400">{roomState.allTimeBest || 0}</span>
                 </div>
                 <div className="flex items-center gap-1">
                    <span className="text-[8px] font-black text-white/30 uppercase">PB</span>
                    <span className="text-[10px] font-black text-white">{persistentBest}</span>
                 </div>
            </div>
            
            {/* Fullscreen Toggle */}
            <div className="relative group">
                {!isFullscreen && (
                    <div className="absolute -inset-1 bg-sky-500/30 rounded-2xl blur animate-pulse pointer-events-none" />
                )}
                <button 
                    onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
                    className={`relative pointer-events-auto backdrop-blur-xl p-3 rounded-2xl border transition-all active:scale-90 ${
                        isFullscreen 
                        ? 'bg-white/10 border-white/20 hover:bg-white/20' 
                        : 'bg-sky-500 border-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.4)] hover:bg-sky-400'
                    }`}
                >
                    {isFullscreen ? (
                        <Minimize className="w-5 h-5 text-white" />
                    ) : (
                        <div className="flex items-center gap-2 px-1">
                            <Maximize className="w-5 h-5 text-white" />
                            <span className="text-[10px] font-black text-white uppercase tracking-widest hidden sm:block">Full Screen</span>
                        </div>
                    )}
                </button>
                
                {/* Visual Invitation (Click Gesture) */}
                {!isFullscreen && (
                    <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 pointer-events-none animate-bounce">
                        <div className="bg-sky-500 text-white text-[8px] font-black py-1 px-3 rounded-full shadow-lg uppercase tracking-tighter italic">Tap for Landscape</div>
                        <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[6px] border-b-sky-500 mx-auto -mt-6 rotate-180" />
                    </div>
                )}
            </div>
        </div>

        {/* Center Messages */}
        <div className="flex-1 flex flex-col items-center justify-center text-center p-2">
            {roomState.state === 'WAITING' && (
                <div className="bg-white/5 backdrop-blur-3xl rounded-[2.5rem] p-6 shadow-2xl border border-white/10 w-full max-w-sm animate-in fade-in zoom-in duration-500 pointer-events-auto flex flex-col max-h-full overflow-y-auto">
                    <div className="w-12 h-12 bg-sky-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-sky-400/30 flex-shrink-0">
                        <BirdIcon className="w-6 h-6 text-sky-400" />
                    </div>
                    <h2 className="text-2xl font-black text-white italic mb-1 uppercase tracking-tighter">Ready?</h2>
                    <p className="text-white/40 font-bold text-[8px] mb-6 uppercase tracking-widest">Waiting for launch...</p>
                    
                    <button 
                        onClick={(e) => { e.stopPropagation(); startGame(); }}
                        onPointerDown={(e) => e.stopPropagation()}
                        className={`w-full py-4 rounded-3xl font-black text-xl flex items-center justify-center gap-3 transition-all duration-300 flex-shrink-0 ${
                            Object.keys(roomState.players).length >= 1 
                            ? 'bg-sky-500 text-white shadow-lg active:scale-95' 
                            : 'bg-white/5 text-white/10 cursor-not-allowed border border-white/10'
                        }`}
                    >
                        START GAME
                    </button>
                </div>
            )}

            {roomState.state === 'GAME_OVER' && (
                <div className="bg-white/5 backdrop-blur-3xl rounded-[2.5rem] p-6 shadow-2xl border border-white/10 w-full max-w-sm animate-in fade-in zoom-in duration-500 pointer-events-auto flex flex-col max-h-full overflow-y-auto">
                    <h2 className="text-3xl font-black text-white italic mb-1 uppercase tracking-tighter leading-none">ROUND <br/> OVER</h2>
                    <p className="text-white/40 font-black text-[10px] mb-10 uppercase tracking-[0.4em]">Final Results Certified</p>

                    <div className="bg-white/5 rounded-2xl p-4 my-4 flex-shrink-0">
                        <p className="text-2xl font-black text-white">{localPlayer?.score || 0} PTS</p>
                    </div>

                    <div className="space-y-3">
                        <button 
                            onClick={(e) => { e.stopPropagation(); restart(); }}
                            onPointerDown={(e) => e.stopPropagation()}
                            className="w-full bg-white text-slate-950 font-black py-4 rounded-3xl shadow-xl active:scale-95 transition-all text-xl italic uppercase"
                        >
                            <RotateCcw className="w-6 h-6" />
                            RE-ENTRY
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleQuit(); }}
                            className="w-full bg-white/5 text-white/30 py-3 rounded-2xl text-[8px] uppercase tracking-widest border border-white/5"
                        >
                            <LogOut className="w-3 h-3 mr-2" />
                            Return to Base
                        </button>
                    </div>
                </div>
            )}

            {roomState.state === 'STARTING' && (
                <div className="relative">
                    <div className="text-9xl font-black text-white drop-shadow-[0_0_50px_rgba(255,255,255,0.5)] animate-in zoom-in duration-300 italic tracking-tighter">
                        {roomState.countdown}
                    </div>
                </div>
            )}

            {localPlayer && !localPlayer.isAlive && roomState.state === 'PLAYING' && !isAcknowledged && (
                <div className="bg-red-600/10 backdrop-blur-3xl rounded-[2.5rem] p-6 shadow-2xl border border-red-500/20 animate-in slide-in-from-bottom-20 duration-500 w-full max-w-sm pointer-events-auto flex flex-col max-h-full overflow-y-auto">
                    <h2 className="text-4xl font-black text-white italic mb-1 uppercase tracking-tighter">CRASHED!</h2>
                    <p className="text-red-400 font-black text-[8px] mb-4 uppercase tracking-[0.5em]">Score: {localPlayer.score}</p>
                    
                    <div className="bg-white/5 rounded-[2rem] p-6 mb-8 border border-white/5 text-center">
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-1">Final Score</p>
                        <p className="text-6xl font-black text-white leading-none italic">{localPlayer.score}</p>
                    </div>

                    <div className="flex flex-col gap-4">
                        <button 
                            onClick={(e) => { e.stopPropagation(); setIsAcknowledged(true); }}
                            className="w-full bg-white text-red-600 font-black py-4 rounded-3xl shadow-xl active:scale-95 transition-all text-xl italic uppercase"
                        >
                            <Play className="w-6 h-6 fill-current" />
                            SPECTATE
                        </button>
                        <div className="p-4 bg-white/5 rounded-2xl text-center border border-white/5">
                            <p className="text-white/30 font-black text-[10px] uppercase tracking-widest animate-pulse">
                                Engaging Live Feedback...
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* Bottom Bar: Instructions or Reactions */}
        <div className="flex flex-col items-center gap-2 mb-2 sm:mb-4">
            {roomState.state === 'PLAYING' && localPlayer?.isAlive && (
                <p className="text-white font-black text-xl italic uppercase tracking-tighter drop-shadow-2xl animate-bounce pointer-events-none opacity-40">
                    TAP TO THRUST
                </p>
            )}

            {/* Emoji Reaction Bar (Visible when Dead or Spectating) */}
            {(roomState.state === 'PLAYING' && (!localPlayer?.isAlive || isAcknowledged)) && (
                <div className="bg-white/5 backdrop-blur-2xl rounded-full p-1 border border-white/10 flex items-center gap-1 pointer-events-auto shadow-2xl animate-in slide-in-from-bottom-5 duration-500">
                    <p className="text-[8px] font-black text-white/30 uppercase tracking-widest ml-4 mr-2 hidden sm:block">React</p>
                    {[ '🔥', '👏', '❤️', '😱', '😂', '👑' ].map(emoji => (
                        <button
                            key={emoji}
                            onClick={(e) => { e.stopPropagation(); sendEmoji(emoji); }}
                            onPointerDown={(e) => e.stopPropagation()}
                            className="w-10 h-10 flex items-center justify-center text-xl hover:scale-125 transition-transform active:scale-90 bg-white/5 rounded-full"
                        >
                            {emoji}
                        </button>
                    ))}
                </div>
            )}
        </div>
      </div>
      
      <style jsx global>{`
        .safe-area-inset {
            padding-bottom: max(1rem, env(safe-area-inset-bottom));
            padding-top: max(1rem, env(safe-area-inset-top));
            padding-left: max(1rem, env(safe-area-inset-left));
            padding-right: max(1rem, env(safe-area-inset-right));
        }
        @media (orientation: landscape) {
            .max-w-sm { 
                max-width: 450px;
                margin: auto;
            }
        }
        @media (max-height: 450px) and (orientation: landscape) {
            .max-w-sm { 
                max-width: 400px;
                transform: scale(0.9);
                transform-origin: center center;
            }
            h2 { font-size: 1.25rem !important; line-height: 1.2 !important; }
            h3 { font-size: 1.1rem !important; }
            .text-3xl { font-size: 1.5rem !important; }
            .text-2xl { font-size: 1.25rem !important; }
            .text-9xl { font-size: 5rem !important; }
            .p-6 { padding: 1rem !important; }
            .mb-10 { margin-bottom: 1rem !important; }
            .mb-8 { margin-bottom: 0.75rem !important; }
            .mb-6 { margin-bottom: 0.5rem !important; }
            .my-4 { margin-top: 0.5rem !important; margin-bottom: 0.5rem !important; }
            .py-4 { padding-top: 0.75rem !important; padding-bottom: 0.75rem !important; }
            .text-6xl { font-size: 3rem !important; }
            .rounded-[2.5rem] { border-radius: 2rem !important; }
        }
      `}</style>
    </div>
  );
}
