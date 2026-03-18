import PartySocket from "partysocket";
import { useEffect, useState, useCallback, useRef } from "react";
import type { RoomState, ClientMessage, ServerMessage } from "../types/game";

const getPartyHost = () => {
  if (process.env.NEXT_PUBLIC_PARTY_URL) {
    return process.env.NEXT_PUBLIC_PARTY_URL.replace(/^https?:\/\//, "");
  }
  if (typeof window !== 'undefined') {
    // Fallback for development if env var is missing
    return `${window.location.hostname}:1999`;
  }
  return "localhost:1999";
};

export function useGameRoom(roomId: string) {
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const socketRef = useRef<PartySocket | null>(null);
  const playerPositionsRef = useRef<Record<string, number>>({});

  useEffect(() => {
    const socket = new PartySocket({
      host: getPartyHost(),
      room: roomId,
    });

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data) as ServerMessage;
      
      if (message.type === 'STATE' || (message as any).type === 'STATE_UPDATE') {
        const state = (message as any).state || (message as any).roomState;
        setRoomState(state);
        // Sync initial positions
        if (state?.players) {
            Object.values(state.players).forEach((p: any) => {
                playerPositionsRef.current[p.id] = p.position[1];
            });
        }
      } else if (message.type === 'PLAYER_MOVED') {
        playerPositionsRef.current[message.id] = message.y;
      }
    };

    socketRef.current = socket;

    // Heartbeat to keep session alive even if just watching
    const heartbeat = setInterval(() => {
        socket.send(JSON.stringify({ type: 'HEARTBEAT' }));
    }, 10000);

    return () => {
      clearInterval(heartbeat);
      socket.close();
    };
  }, [roomId]);

  const join = useCallback((name: string, color?: string) => {
    socketRef.current?.send(JSON.stringify({ type: 'JOIN', name, color }));
  }, []);

  const flap = useCallback(() => {
    socketRef.current?.send(JSON.stringify({ type: 'FLAP' }));
  }, []);

  const die = useCallback((score: number) => {
    socketRef.current?.send(JSON.stringify({ type: 'DIE', score }));
  }, []);

  const startGame = useCallback(() => {
    socketRef.current?.send(JSON.stringify({ type: 'START_GAME' }));
  }, []);

  const restart = useCallback(() => {
    socketRef.current?.send(JSON.stringify({ type: 'RESTART' }));
  }, []);

  const updatePosition = useCallback((y: number) => {
    socketRef.current?.send(JSON.stringify({ type: 'UPDATE_POSITION', y }));
  }, []);

  const updateScore = useCallback((score: number) => {
    socketRef.current?.send(JSON.stringify({ type: 'UPDATE_SCORE', score }));
  }, []);

  return {
    roomState,
    join,
    flap,
    die,
    startGame,
    restart,
    updatePosition,
    updateScore,
    playerPositions: playerPositionsRef.current,
    socket: socketRef.current
  };
}
