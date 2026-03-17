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
  const [persistentBest, setPersistentBest] = useState(0);
  const localPlayerId = socket?.id;

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
      join(name);
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
      <div className="min-h-screen bg-slate-950 p-6 flex flex-col items-center justify-center font-sans">
        <div className="w-full max-w-sm bg-white/5 backdrop-blur-3xl rounded-[3rem] p-10 shadow-2xl border border-white/10">
          <div className="flex flex-col items-center mb-8">
            <div className="w-24 h-24 bg-sky-500/20 rounded-full flex items-center justify-center mb-6 border border-sky-400/30 shadow-inner">
              <BirdIcon className="w-12 h-12 text-sky-400" />
            </div>
            <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase leading-none text-center">
                Flappy <br/> Party 3D
            </h1>
            <p className="text-sky-400 font-black uppercase tracking-[0.4em] text-[10px] mt-4 opacity-60 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-ping" />
                Lobby {roomId}
            </p>
          </div>

          <form onSubmit={handleJoin} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-white/40 uppercase tracking-[0.4em] mb-2 ml-6">Your Callsign</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={12}
                placeholder="SKY-KING"
                className="w-full bg-white/5 border border-white/10 rounded-[2rem] py-5 px-8 text-2xl font-black text-white placeholder:text-white/10 focus:outline-none focus:border-sky-500 focus:bg-white/10 transition-all text-center uppercase italic"
                autoFocus
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-sky-500 hover:bg-sky-400 text-white font-black py-6 rounded-[2.5rem] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 text-2xl italic tracking-tighter"
            >
              LAUNCH
              <ChevronRight className="w-8 h-8" />
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
        <div className="flex justify-between items-start w-full">
            <div className="bg-white/5 backdrop-blur-2xl rounded-3xl p-4 border border-white/10 shadow-2xl min-w-[100px]">
                <p className="text-[8px] font-black text-white/40 uppercase tracking-[0.3em] mb-1">Score</p>
                <p className="text-3xl font-black text-white leading-none italic">{localPlayer?.score || 0}</p>
            </div>
            <div className="bg-amber-400/10 backdrop-blur-2xl rounded-3xl p-4 border border-amber-400/20 shadow-2xl flex items-center gap-3">
                <div className="text-right">
                    <p className="text-[8px] font-black text-amber-400/50 uppercase tracking-[0.3em]">Record</p>
                    <p className="text-2xl font-black text-amber-400 leading-none italic">{persistentBest}</p>
                </div>
                <div className="bg-amber-400/20 rounded-xl p-2">
                    <Trophy className="w-4 h-4 text-amber-400" />
                </div>
            </div>
        </div>

        {/* Center Messages */}
        <div className="flex-1 flex flex-col items-center justify-center text-center">
            {roomState.state === 'WAITING' && (
                <div className="bg-white/5 backdrop-blur-3xl rounded-[3rem] p-10 shadow-2xl border border-white/10 w-full max-w-sm animate-in fade-in zoom-in duration-500 pointer-events-auto">
                    <div className="w-20 h-20 bg-sky-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-sky-400/30">
                        <BirdIcon className="w-10 h-10 text-sky-400 animate-bounce" />
                    </div>
                    <h2 className="text-3xl font-black text-white italic mb-2 uppercase tracking-tighter">Prepare For Flight</h2>
                    <p className="text-white/40 font-bold text-sm mb-8 uppercase tracking-widest">Awaiting Launch Signal...</p>
                    
                    <button 
                        onClick={(e) => { e.stopPropagation(); startGame(); }}
                        onPointerDown={(e) => e.stopPropagation()}
                        className={`w-full py-5 rounded-[2rem] font-black text-2xl flex items-center justify-center gap-3 transition-all duration-300 ${
                            Object.keys(roomState.players).length >= 1 
                            ? 'bg-sky-500 text-white shadow-lg hover:scale-105 active:scale-95' 
                            : 'bg-white/5 text-white/10 cursor-not-allowed border border-white/10'
                        }`}
                    >
                        <Play className="fill-current w-6 h-6" />
                        START GAME
                    </button>
                </div>
            )}

            {roomState.state === 'GAME_OVER' && (
                <div className="bg-white/5 backdrop-blur-3xl rounded-[3rem] p-10 shadow-2xl border border-white/10 w-full max-w-sm animate-in fade-in zoom-in duration-500 pointer-events-auto">
                    <div className="w-20 h-20 bg-amber-400/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-amber-400/30">
                        <Trophy className="w-10 h-10 text-amber-400" />
                    </div>
                    <h2 className="text-4xl font-black text-white italic mb-2 uppercase tracking-tighter leading-none">ROUND <br/> ENDED</h2>
                    <p className="text-white/40 font-black text-[10px] mb-10 uppercase tracking-[0.4em]">Final Results Certified</p>

                    <div className="space-y-4">
                        <button 
                            onClick={(e) => { e.stopPropagation(); restart(); }}
                            onPointerDown={(e) => e.stopPropagation()}
                            className="w-full bg-white text-slate-950 font-black py-5 rounded-[2rem] shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 text-2xl italic tracking-tighter"
                        >
                            <RotateCcw className="w-6 h-6" />
                            RE-ENTRY
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleQuit(); }}
                            className="w-full bg-white/5 hover:bg-white/10 text-white/40 font-black py-4 rounded-3xl border border-white/5 transition-all text-[10px] uppercase tracking-[0.4em]"
                        >
                            <LogOut className="w-3 h-3 mr-2" />
                            Return to Base
                        </button>
                    </div>
                </div>
            )}

            {roomState.state === 'STARTING' && (
                <div className="relative scale-150">
                    <div className="text-[12rem] font-black text-white drop-shadow-[0_0_50px_rgba(255,255,255,0.5)] animate-in zoom-in duration-300 italic tracking-tighter">
                        {roomState.countdown}
                    </div>
                </div>
            )}

            {localPlayer && !localPlayer.isAlive && roomState.state === 'PLAYING' && !isAcknowledged && (
                <div className="bg-red-600/10 backdrop-blur-3xl rounded-[3rem] p-10 shadow-2xl border border-red-500/20 animate-in slide-in-from-bottom-20 duration-700 w-full max-w-sm pointer-events-auto">
                    <h2 className="text-5xl font-black text-white italic mb-2 uppercase tracking-tighter">DOWNED!</h2>
                    <p className="text-red-400 font-black text-[10px] mb-8 uppercase tracking-[0.5em]">System Failure</p>
                    
                    <div className="bg-white/5 rounded-[2rem] p-6 mb-8 border border-white/5 text-center">
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-1">Final Score</p>
                        <p className="text-6xl font-black text-white leading-none italic">{localPlayer.score}</p>
                    </div>

                    <div className="flex flex-col gap-4">
                        <button 
                            onClick={(e) => { e.stopPropagation(); setIsAcknowledged(true); }}
                            className="w-full bg-white text-red-600 font-black py-5 rounded-[2rem] shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 text-2xl italic tracking-tighter"
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
        <div className="flex flex-col items-center gap-4 mb-4 sm:mb-8">
            {roomState.state === 'PLAYING' && localPlayer?.isAlive && (
                <p className="text-white font-black text-2xl italic uppercase tracking-tighter drop-shadow-2xl animate-bounce pointer-events-none opacity-60">
                    TAP TO THRUST
                </p>
            )}

            {/* Emoji Reaction Bar (Visible when Dead or Spectating) */}
            {(roomState.state === 'PLAYING' && (!localPlayer?.isAlive || isAcknowledged)) && (
                <div className="bg-white/5 backdrop-blur-2xl rounded-full p-2 border border-white/10 flex items-center gap-2 pointer-events-auto shadow-2xl animate-in slide-in-from-bottom-5 duration-500">
                    <p className="text-[8px] font-black text-white/30 uppercase tracking-widest ml-4 mr-2 hidden sm:block">React</p>
                    {[ '🔥', '👏', '❤️', '😱', '😂', '👑' ].map(emoji => (
                        <button
                            key={emoji}
                            onClick={(e) => { e.stopPropagation(); sendEmoji(emoji); }}
                            onPointerDown={(e) => e.stopPropagation()}
                            className="w-12 h-12 flex items-center justify-center text-2xl hover:scale-125 transition-transform active:scale-90 bg-white/5 rounded-full"
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
            padding-bottom: env(safe-area-inset-bottom);
            padding-top: env(safe-area-inset-top);
            padding-left: env(safe-area-inset-left);
            padding-right: env(safe-area-inset-right);
        }
        @media (orientation: landscape) {
            .safe-area-inset {
                padding-left: max(1rem, env(safe-area-inset-left));
                padding-right: max(1rem, env(safe-area-inset-right));
            }
            .max-w-sm { 
                max-width: 500px;
                margin: auto;
            }
        }
      `}</style>
    </div>
  );
}
