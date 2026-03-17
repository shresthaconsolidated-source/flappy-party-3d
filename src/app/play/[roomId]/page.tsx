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
    <div className="relative w-screen h-screen overflow-hidden bg-sky-400 touch-none" onClick={handleFlap}>
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
            <div className="bg-sky-900/40 backdrop-blur-md rounded-2xl p-4 border-2 border-white/20">
                <p className="text-[10px] font-black text-sky-200 uppercase tracking-[0.2em] mb-1">Score</p>
                <p className="text-3xl font-black text-white leading-none">{localPlayer?.score || 0}</p>
            </div>
            <div className="bg-yellow-400/90 backdrop-blur-md rounded-2xl p-4 border-2 border-yellow-200 shadow-lg flex items-center gap-3">
                <Trophy className="w-5 h-5 text-yellow-900" />
                <div className="text-right">
                    <p className="text-[10px] font-black text-yellow-900 uppercase tracking-[0.2em]">Best</p>
                    <p className="text-xl font-black text-yellow-900 leading-none">{localPlayer?.highScore || 0}</p>
                </div>
            </div>
        </div>

        {/* Center Messages */}
        <div className="flex-1 flex flex-col items-center justify-center text-center">
            {roomState.state === 'WAITING' && (
                <div className="bg-white/95 rounded-[2rem] p-8 shadow-2xl border-b-8 border-sky-600 w-full max-w-xs animate-in fade-in zoom-in duration-300 pointer-events-auto">
                    <BirdIcon className="w-12 h-12 text-sky-400 mx-auto mb-4" />
                    <h2 className="text-2xl font-black text-sky-900 italic mb-2 uppercase">Waiting...</h2>
                    <p className="text-sky-500 font-bold text-sm mb-6">Waiting for more players to join the party!</p>
                    
                        <button 
                            onClick={(e) => { e.stopPropagation(); startGame(); }}
                            onPointerDown={(e) => e.stopPropagation()}
                            className={`w-full py-4 rounded-3xl font-black text-xl flex items-center justify-center gap-2 transition-all ${
                                Object.keys(roomState.players).length >= 1 
                                ? 'bg-sky-600 text-white shadow-[0_6px_0_rgb(30,58,138)] active:translate-y-1 active:shadow-none' 
                                : 'bg-sky-200 text-sky-400 cursor-not-allowed'
                            }`}
                        >
                            <Play className="fill-current" />
                            START GAME
                        </button>
                </div>
            )}

            {roomState.state === 'GAME_OVER' && (
                <div className="bg-white/95 rounded-[2rem] p-8 shadow-2xl border-b-8 border-sky-600 w-full max-w-xs animate-in fade-in zoom-in duration-300 pointer-events-auto">
                    <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4 animate-bounce" />
                    <h2 className="text-3xl font-black text-sky-900 italic mb-2 uppercase">Round Over!</h2>
                    <p className="text-sky-500 font-bold mb-8">The host screen shows the winner!</p>

                    <div className="space-y-3">
                        <button 
                            onClick={(e) => { e.stopPropagation(); restart(); }}
                            onPointerDown={(e) => e.stopPropagation()}
                            className="w-full bg-sky-600 text-white font-black py-4 rounded-2xl shadow-[0_6px_0_rgb(30,58,138)] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 text-lg"
                        >
                            <RotateCcw className="w-5 h-5" />
                            PLAY AGAIN
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleQuit(); }}
                            className="w-full bg-sky-100 text-sky-600 font-bold py-3 rounded-2xl transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-widest"
                        >
                            <LogOut className="w-4 h-4" />
                            Quit Room
                        </button>
                    </div>
                </div>
            )}

            {roomState.state === 'STARTING' && (
                <div className="text-[10rem] font-black text-white drop-shadow-[0_8px_0_rgba(0,0,0,0.3)] animate-pulse">
                    {roomState.countdown}
                </div>
            )}

            {localPlayer && !localPlayer.isAlive && roomState.state === 'PLAYING' && !isAcknowledged && (
                <div className="bg-red-500 rounded-[2.5rem] p-8 shadow-2xl border-b-8 border-red-800 animate-in slide-in-from-bottom-20 duration-500 w-full max-w-xs pointer-events-auto">
                    <h2 className="text-4xl font-black text-white italic mb-2 uppercase">Crashed!</h2>
                    <p className="text-red-100 font-bold text-lg mb-6 leading-tight">You're out for this round.</p>
                    <div className="bg-white/20 rounded-2xl p-4 mb-6">
                        <p className="text-xs font-black text-white uppercase tracking-widest opacity-80 mb-1">Final Score</p>
                        <p className="text-4xl font-black text-white leading-none">{localPlayer.score}</p>
                    </div>

                    <div className="space-y-3">
                        <div className="bg-white/10 rounded-xl p-3 mb-2 text-center">
                            <p className="text-white font-bold text-xs uppercase tracking-widest animate-pulse">
                                Waiting for others to finish...
                            </p>
                        </div>
                        <button 
                            onClick={(e) => { e.stopPropagation(); setIsAcknowledged(true); }}
                            className="w-full bg-white text-red-600 font-black py-4 rounded-2xl shadow-[0_4px_0_rgb(153,27,27)] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 text-lg"
                        >
                            <Play className="w-5 h-5 fill-current" />
                            SPECTATE
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleQuit(); }}
                            className="w-full bg-red-800/40 hover:bg-red-800/60 text-white font-bold py-3 rounded-2xl border-2 border-white/20 transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-widest"
                        >
                            <LogOut className="w-4 h-4" />
                            Quit Room
                        </button>
                    </div>
                </div>
            )}
        </div>

        {/* Bottom Instructions */}
        {roomState.state === 'PLAYING' && localPlayer?.isAlive && (
            <div className="mb-10 text-center animate-bounce">
                <p className="text-white font-black text-xl italic uppercase tracking-tighter drop-shadow-md">
                    Tap to Jump!
                </p>
            </div>
        )}
      </div>
      
      {/* Visual Feedback for Tap */}
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
