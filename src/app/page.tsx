"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bird, Play, Users, Layout } from "lucide-react";

export default function LandingPage() {
  const [roomId, setRoomId] = useState("");
  const router = useRouter();

  const createRoom = () => {
    const newRoomId = Math.random().toString(36).substring(7).toUpperCase();
    router.push(`/host/${newRoomId}`);
  };

  const joinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomId.trim()) {
      router.push(`/play/${roomId.toUpperCase()}`);
    }
  };

  return (
    <main className="min-h-screen bg-sky-400 flex flex-col items-center justify-center p-6 text-sky-900 overflow-y-auto scrollbar-hide">
      <div className="w-full max-w-2xl my-auto space-y-8 sm:space-y-12 text-center py-8">
        {/* Logo Section */}
        <div className="relative inline-block">
          <div className="absolute -inset-4 bg-white/20 blur-3xl rounded-full"></div>
          <div className="relative flex flex-col items-center">
            <div className="w-24 h-24 bg-yellow-400 rounded-full flex items-center justify-center mb-6 shadow-2xl border-4 border-white animate-bounce">
              <Bird className="w-14 h-14 text-yellow-900" />
            </div>
            <h1 className="text-7xl font-black italic tracking-tighter uppercase drop-shadow-2xl">
              Flappy Party <span className="text-white drop-shadow-[0_4px_0_rgba(0,0,0,0.2)]">3D</span>
            </h1>
            <p className="text-xl font-bold uppercase tracking-[0.3em] opacity-80 mt-2">Real-time Multiplayer Arcade</p>
          </div>
        </div>

        {/* Action Cards */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Host Card */}
          <div className="bg-white/95 backdrop-blur-xl rounded-[3rem] p-10 shadow-2xl border-b-8 border-sky-600 flex flex-col items-center group hover:-translate-y-2 transition-transform">
            <div className="w-16 h-16 bg-sky-100 rounded-2xl flex items-center justify-center mb-6 text-sky-600 group-hover:scale-110 transition-transform">
              <Layout className="w-10 h-10" />
            </div>
            <h2 className="text-3xl font-black italic uppercase mb-2">Host a Screen</h2>
            <p className="text-sky-500 font-bold text-sm mb-8">For TVs, Projectors, or Shared Displays</p>
            <button 
              onClick={createRoom}
              className="w-full bg-sky-600 hover:bg-sky-500 text-white font-black py-5 rounded-3xl shadow-[0_6px_0_rgb(30,58,138)] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-3 text-2xl"
            >
              <Play className="fill-current" />
              CREATE ROOM
            </button>
          </div>

          {/* Join Card */}
          <div className="bg-sky-900/90 backdrop-blur-xl rounded-[3rem] p-10 shadow-2xl border-b-8 border-sky-950 flex flex-col items-center group hover:-translate-y-2 transition-transform">
            <div className="w-16 h-16 bg-sky-800 rounded-2xl flex items-center justify-center mb-6 text-sky-400 group-hover:scale-110 transition-transform">
              <Users className="w-10 h-10" />
            </div>
            <h2 className="text-3xl font-black italic uppercase mb-2 text-white">Join as Player</h2>
            <p className="text-sky-400 font-bold text-sm mb-8">Play on your Phone or Mobile Device</p>
            
            <form onSubmit={joinRoom} className="w-full space-y-4">
              <input 
                type="text"
                placeholder="ROOM CODE"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full bg-sky-950/50 border-2 border-sky-700 rounded-2xl py-4 px-6 text-xl font-bold text-white placeholder:text-sky-700 text-center uppercase tracking-widest focus:outline-none focus:border-sky-400 transition-all shadow-inner"
              />
              <button 
                type="submit"
                className="w-full bg-yellow-400 hover:bg-yellow-300 text-yellow-950 font-black py-5 rounded-3xl shadow-[0_6px_0_rgb(202,138,4)] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-3 text-2xl"
              >
                JOIN PARTY
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="text-white/60 font-bold uppercase tracking-widest text-xs">
          Built with React Three Fiber & PartyKit
        </div>
      </div>
      <style jsx>{`
        @media (max-height: 500px) and (orientation: landscape) {
            .text-7xl { font-size: 3rem !important; }
            .w-24.h-24 { width: 3rem !important; height: 3rem !important; margin-bottom: 0.5rem !important; }
            .w-14.h-14 { width: 1.5rem !important; height: 1.5rem !important; }
            h2 { font-size: 1.25rem !important; }
            p { font-size: 0.75rem !important; margin-bottom: 0.5rem !important; }
            .p-10 { padding: 1.5rem !important; border-radius: 2rem !important; }
            .space-y-12 { gap: 1rem !important; }
            .grid { gap: 1rem !important; }
            button { padding: 0.75rem !important; font-size: 1.25rem !important; border-radius: 1.5rem !important; }
            input { padding: 0.75rem !important; }
        }
      `}</style>
    </main>
  );
}
