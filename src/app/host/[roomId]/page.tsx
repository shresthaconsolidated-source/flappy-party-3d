"use client";

import { useGameRoom } from "@/hooks/useGameRoom";
import { GameScene } from "@/components/game/GameScene";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState, use } from "react";
import { Users, Trophy, Play, RefreshCcw } from "lucide-react";

export default function HostPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params);
  const { roomState, startGame, restart, updatePosition } = useGameRoom(roomId);
  const [origin, setOrigin] = useState("");
  const [isLocalhost, setIsLocalhost] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
    setIsLocalhost(window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
  }, []);

  const joinUrl = `${origin}/play/${roomId}`;
  const players = roomState ? Object.values(roomState.players) : [];
  const alivePlayers = players.filter(p => p.isAlive);
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const topPlayer = sortedPlayers[0];

  if (!roomState) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-sky-900 text-white">
        <div className="text-2xl animate-pulse">Connecting to Room...</div>
      </div>
    );
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-sky-400">
      {/* 3D View */}
      <div className="absolute inset-0">
        <GameScene roomState={roomState} onUpdatePosition={updatePosition} />
      </div>

      {/* Overlays */}
      <div className="absolute inset-0 flex p-8 pointer-events-none">
        {/* Left Side: Room Info & Players */}
        <div className="flex flex-col w-80 space-y-6 pointer-events-auto">
          <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-2xl border-4 border-sky-600">
            <h1 className="text-3xl font-black text-sky-600 mb-4 tracking-tighter uppercase italic">
              Flappy Party 3D
            </h1>
            <div className="space-y-4">
              <div className="bg-sky-100 rounded-xl p-4 flex flex-col items-center justify-center border-2 border-sky-200">
                <span className="text-xs font-bold text-sky-500 uppercase tracking-widest">Room Code</span>
                <span className="text-4xl font-black text-sky-700 tracking-widest">{roomId}</span>
              </div>
              <div className="bg-white p-2 rounded-xl shadow-inner flex justify-center border-2 border-sky-100">
                <QRCodeSVG value={joinUrl} size={180} />
              </div>
              <p className="text-center text-sm font-medium text-sky-600">Scan to Join & Play!</p>
              
              {isLocalhost && (
                <div className="mt-4 p-3 bg-red-100 border-2 border-red-200 rounded-xl text-red-600 text-[10px] font-bold text-center leading-tight uppercase tracking-wider">
                  ⚠️ Phone scan won't work on "localhost". <br/>
                  Access this screen via your IP address <br/>
                  (e.g., http://192.168.x.x:3001)
                </div>
              )}
            </div>
          </div>

          <div className="bg-sky-900/80 backdrop-blur-md rounded-2xl p-6 shadow-2xl border-2 border-sky-400/50 flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <Users className="w-6 h-6 text-sky-400" />
                Players ({players.length})
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
              {players.length === 0 ? (
                <p className="text-sky-300 text-center italic mt-10">Waiting for players...</p>
              ) : (
                players.map(player => (
                  <div key={player.id} className={`flex items-center justify-between p-3 rounded-xl transition-all ${player.isAlive ? 'bg-white/10' : 'bg-red-500/20 grayscale opacity-60'}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: player.color }} />
                      <span className="font-bold text-white truncate max-w-[120px]">{player.name}</span>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${player.isAlive ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                      {player.isAlive ? 'ALIVE' : 'DEAD'}
                    </span>
                  </div>
                ))
              )}
            </div>
            {players.length < 2 && (
                <div className="mt-4 p-3 bg-amber-500/20 border-2 border-amber-500/50 rounded-xl text-amber-300 text-sm font-bold text-center animate-pulse">
                    Waiting for at least 2 players...
                </div>
            )}
            {players.length >= 2 && roomState.state === 'WAITING' && (
                <div className="mt-4 p-4 bg-green-500/20 border-2 border-green-500/50 rounded-xl text-green-300 text-sm font-bold text-center animate-pulse">
                    Room is ready! Start from your phone.
                </div>
            )}
          </div>
        </div>

        {/* Center: Status & Leaderboard */}
        <div className="flex-1 flex flex-col items-center">
            {roomState.state === 'STARTING' && (
                <div className="mt-20 flex flex-col items-center bg-white/10 backdrop-blur-sm p-12 rounded-[4rem] border-4 border-white/20">
                    <span className="text-white text-3xl font-black mb-4 drop-shadow-2xl uppercase tracking-[0.3em] opacity-80">
                        {roomState.countdown > 5 ? "Wait for others or get ready!" : "Get Ready!"}
                    </span>
                    <span className="text-[12rem] font-black text-white drop-shadow-[0_10px_0_rgba(0,0,0,0.5)] leading-none animate-bounce flex items-center gap-4">
                        {roomState.countdown}
                        <span className="text-4xl opacity-50">s</span>
                    </span>
                </div>
            )}

            {roomState.state === 'GAME_OVER' && (
                <div className="mt-20 flex flex-col items-center bg-white/95 backdrop-blur-xl p-10 rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] border-8 border-sky-400 max-w-2xl w-full pointer-events-auto">
                    <Trophy className="w-24 h-24 text-yellow-500 mb-6 animate-bounce" />
                    <h2 className="text-6xl font-black text-sky-900 mb-2 uppercase italic italic">Game Over!</h2>
                    {topPlayer && (
                        <div className="text-center mb-8">
                            <p className="text-xl font-bold text-sky-500 uppercase tracking-widest">Winner</p>
                            <p className="text-5xl font-black text-sky-700">{topPlayer.name}</p>
                            <p className="text-2xl font-black text-sky-400 mt-2">{topPlayer.score} Points</p>
                        </div>
                    )}
                    <p className="text-sky-600 font-bold text-lg animate-pulse uppercase tracking-widest">
                        Check your phone to Play Again!
                    </p>
                </div>
            )}
        </div>

        {/* Right Side: High Score Dashboard */}
        <div className="w-80 space-y-6">
            <div className="bg-yellow-400 rounded-2xl p-6 shadow-2xl border-4 border-yellow-600 flex flex-col items-center text-yellow-900">
                <Trophy className="w-12 h-12 mb-2" />
                <span className="text-xs font-black uppercase tracking-widest opacity-80">Room High Score</span>
                <span className="text-5xl font-black my-2">
                    {Math.max(...players.map(p => p.highScore), 0)}
                </span>
                {topPlayer && (
                    <span className="text-sm font-bold bg-yellow-600/20 px-3 py-1 rounded-full">
                        BY {topPlayer.name.toUpperCase()}
                    </span>
                )}
            </div>

            <div className="bg-sky-900/80 backdrop-blur-md rounded-2xl p-6 shadow-2xl border-2 border-sky-400/50">
                <h2 className="text-xl font-black text-white flex items-center gap-2 mb-4">
                    <Trophy className="w-6 h-6 text-yellow-500" />
                    Leaderboard
                </h2>
                <div className="space-y-3">
                    {sortedPlayers.slice(0, 5).map((player, i) => (
                        <div key={player.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl font-black text-sky-500 w-6 italic">#{i+1}</span>
                                <span className="font-bold text-white truncate max-w-[120px]">{player.name}</span>
                            </div>
                            <span className="font-black text-sky-400">{player.score}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
