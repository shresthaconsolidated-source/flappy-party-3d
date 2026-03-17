"use client";

import { useGameRoom } from "@/hooks/useGameRoom";
import { GameScene } from "@/components/game/GameScene";
import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Wifi, Trophy, ChevronRight, Bird as BirdIcon, LogOut, RotateCcw, Play } from "lucide-react";

export default function PlayerPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params);
  const { roomState, join, flap, die, socket, updatePosition, updateScore, startGame, restart } = useGameRoom(roomId);
  const router = useRouter();
  const [name, setName] = useState("");
  const [hasJoined, setHasJoined] = useState(false);
  const [jumpTrigger, setJumpTrigger] = useState(0);
  const [isAcknowledged, setIsAcknowledged] = useState(false);
  const localPlayerId = socket?.id;

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      join(name);
      setHasJoined(true);
    }
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
      <div className="flex items-center justify-center min-h-screen bg-sky-600 text-white p-6 text-center">
        <div className="text-xl font-bold animate-bounce flex flex-col items-center">
            <Wifi className="w-12 h-12 mb-4" />
            Connecting to Room {roomId}...
        </div>
      </div>
    );
  }

  if (!hasJoined) {
    return (
      <div className="min-h-screen bg-sky-400 p-6 flex flex-col items-center justify-center">
        <div className="w-full max-w-sm bg-white rounded-[2.5rem] p-8 shadow-2xl border-b-8 border-sky-600">
          <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center mb-4 shadow-lg border-4 border-yellow-200">
              <BirdIcon className="w-12 h-12 text-yellow-900" />
            </div>
            <h1 className="text-3xl font-black text-sky-900 italic tracking-tighter uppercase">Join Room</h1>
            <p className="text-sky-500 font-bold uppercase tracking-widest text-xs mt-1">Code: {roomId}</p>
          </div>

          <form onSubmit={handleJoin} className="space-y-6">
            <div>
              <label className="block text-xs font-black text-sky-700 uppercase tracking-widest mb-2 ml-4">Enter Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={12}
                placeholder="COOL BIRD..."
                className="w-full bg-sky-50 border-4 border-sky-100 rounded-2xl py-4 px-6 text-xl font-bold text-sky-900 placeholder:text-sky-300 focus:outline-none focus:border-sky-400 transition-all"
                autoFocus
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-sky-600 hover:bg-sky-500 text-white font-black py-4 rounded-3xl shadow-[0_6px_0_rgb(30,58,138)] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 text-2xl"
            >
              READY!
              <ChevronRight className="w-8 h-8" />
            </button>
          </form>
        </div>
        
        <p className="mt-8 text-white font-bold text-sm tracking-widest opacity-80 uppercase">Party Mode Enabled</p>
      </div>
    );
  }

  const localPlayer = localPlayerId ? roomState.players[localPlayerId] : null;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-sky-900 touch-none" onClick={handleFlap}>
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
        />
      </div>

      {/* Touch Overlay */}
      <div className="absolute inset-0 z-10 flex flex-col pointer-events-none p-6">
        {/* Top HUD */}
        <div className="flex justify-between items-start">
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-5 border border-white/20 shadow-2xl">
                <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.3em] mb-1">Current Score</p>
                <p className="text-4xl font-black text-white leading-none tracking-tight">{localPlayer?.score || 0}</p>
            </div>
            <div className="bg-amber-400/20 backdrop-blur-xl rounded-3xl p-5 border border-amber-400/30 shadow-2xl flex items-center gap-4">
                <div className="bg-amber-400 rounded-xl p-2 shadow-lg">
                    <Trophy className="w-5 h-5 text-amber-900" />
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black text-amber-400/60 uppercase tracking-[0.3em]">Personal Best</p>
                    <p className="text-2xl font-black text-amber-500 leading-none tracking-tight">{localPlayer?.highScore || 0}</p>
                </div>
            </div>
        </div>

        {/* Center Messages */}
        <div className="flex-1 flex flex-col items-center justify-center text-center">
            {roomState.state === 'WAITING' && (
                <div className="bg-white/10 backdrop-blur-2xl rounded-[3rem] p-10 shadow-2xl border border-white/20 w-full max-w-sm animate-in fade-in zoom-in duration-500 pointer-events-auto">
                    <div className="w-20 h-20 bg-sky-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-sky-400/30">
                        <BirdIcon className="w-10 h-10 text-sky-400 animate-bounce" />
                    </div>
                    <h2 className="text-3xl font-black text-white italic mb-3 uppercase tracking-tighter">Waiting for Players</h2>
                    <p className="text-sky-300 font-bold text-base mb-8 opacity-80">The party is about to start. Get ready to fly!</p>
                    
                        <button 
                            onClick={(e) => { e.stopPropagation(); startGame(); }}
                            onPointerDown={(e) => e.stopPropagation()}
                            className={`w-full py-5 rounded-[2rem] font-black text-2xl flex items-center justify-center gap-3 transition-all duration-300 ${
                                Object.keys(roomState.players).length >= 1 
                                ? 'bg-white text-sky-900 shadow-[0_8px_20px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-95' 
                                : 'bg-white/5 text-white/20 cursor-not-allowed border border-white/10'
                            }`}
                        >
                            <Play className="fill-current w-6 h-6" />
                            START GAME
                        </button>
                </div>
            )}

            {roomState.state === 'GAME_OVER' && (
                <div className="bg-white/10 backdrop-blur-2xl rounded-[3rem] p-10 shadow-2xl border border-white/20 w-full max-w-sm animate-in fade-in zoom-in duration-500 pointer-events-auto">
                    <div className="w-24 h-24 bg-amber-400/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-amber-400/30">
                        <Trophy className="w-12 h-12 text-amber-400 animate-pulse" />
                    </div>
                    <h2 className="text-4xl font-black text-white italic mb-2 uppercase tracking-tighter">Round Over!</h2>
                    <p className="text-sky-200 font-bold mb-10 opacity-70 italic text-lg line-clamp-2">"That was an epic flight!"</p>

                    <div className="space-y-4">
                        <button 
                            onClick={(e) => { e.stopPropagation(); restart(); }}
                            onPointerDown={(e) => e.stopPropagation()}
                            className="w-full bg-white text-sky-900 font-black py-5 rounded-[2rem] shadow-[0_8px_25px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 text-2xl"
                        >
                            <RotateCcw className="w-6 h-6" />
                            PLAY AGAIN
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleQuit(); }}
                            className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-3xl border border-white/10 transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-[0.2em] opacity-60"
                        >
                            <LogOut className="w-4 h-4" />
                            Leave Room
                        </button>
                    </div>
                </div>
            )}

            {roomState.state === 'STARTING' && (
                <div className="relative">
                    <div className="absolute inset-0 bg-white/20 blur-[100px] rounded-full scale-150 animate-pulse" />
                    <div className="relative text-[12rem] font-black text-white drop-shadow-2xl animate-in zoom-in duration-300">
                        {roomState.countdown}
                    </div>
                </div>
            )}

            {localPlayer && !localPlayer.isAlive && roomState.state === 'PLAYING' && !isAcknowledged && (
                <div className="bg-red-500/20 backdrop-blur-2xl rounded-[3rem] p-10 shadow-2xl border border-red-500/30 animate-in slide-in-from-bottom-20 duration-700 w-full max-w-sm pointer-events-auto">
                    <h2 className="text-5xl font-black text-white italic mb-2 uppercase tracking-tighter">Crashed!</h2>
                    <p className="text-red-400 font-black text-xl mb-8 uppercase tracking-widest">Game Over</p>
                    
                    <div className="bg-white/5 rounded-[2rem] p-6 mb-8 border border-white/10 text-center">
                        <p className="text-xs font-black text-white/40 uppercase tracking-[0.3em] mb-2">Total Points</p>
                        <p className="text-6xl font-black text-white leading-none tracking-tight">{localPlayer.score}</p>
                    </div>

                    <div className="space-y-4">
                        <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/5">
                            <p className="text-white/60 font-bold text-sm uppercase tracking-widest animate-pulse">
                                Spectating others...
                            </p>
                        </div>
                        <button 
                            onClick={(e) => { e.stopPropagation(); setIsAcknowledged(true); }}
                            className="w-full bg-white text-red-600 font-black py-5 rounded-[2rem] shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 text-2xl"
                        >
                            <Play className="w-6 h-6 fill-current" />
                            SPECTATE
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleQuit(); }}
                            className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-3xl border border-white/10 transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-[0.2em] opacity-40"
                        >
                            <LogOut className="w-4 h-4" />
                            Leave
                        </button>
                    </div>
                </div>
            )}
        </div>

        {/* Bottom Instructions */}
        {roomState.state === 'PLAYING' && localPlayer?.isAlive && (
            <div className="mb-10 text-center">
                <p className="text-white font-black text-2xl italic uppercase tracking-tighter drop-shadow-2xl animate-bounce">
                    Tap to Fly
                </p>
            </div>
        )}
      </div>
      
      <style jsx global>{`
        @keyframes pulse-ring {
          0% { transform: scale(0.8); opacity: 0.5; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        .tap-effect { position: absolute; pointer-events: none; border: 4px solid white; border-radius: 50%; opacity: 0; }
      `}</style>
    </div>
  );
}
