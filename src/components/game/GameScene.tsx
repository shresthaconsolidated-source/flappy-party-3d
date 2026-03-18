"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useState, useRef, useEffect, useCallback, Suspense, useMemo } from "react";
import * as THREE from "three";
import { Bird } from "./Bird";
import { Pipe } from "./Pipe";
import { Environment } from "./Environment";
import { Particles } from "./Particles";
import { Text, ContactShadows } from "@react-three/drei";
import type { RoomState, Player } from "../../types/game";

interface GameSceneProps {
  roomState: RoomState | null;
  onFlap?: () => void;
  onDie?: (score: number) => void;
  localPlayerId?: string;
  jumpTrigger?: number;
  onUpdatePosition?: (y: number) => void;
  onScoreUpdate?: (score: number) => void;
  playerPositions?: Record<string, number>;
  socket?: any;
}

const BASE_GRAVITY = -0.054; // Adjusted for delta (approx 1/60th of previous)
const BASE_JUMP_FORCE = 2.4; // Adjusted for delta
const BASE_PIPE_SPEED = 1.2;  // Adjusted for delta
const BIRD_X = 0;

function getDifficultyMultiplier(score: number) {
  return 1 + Math.floor(score / 10) * 0.15;
}

function GameLoop({ roomState, onFlap, onDie, localPlayerId, jumpTrigger, onUpdatePosition, onScoreUpdate, playerPositions, socket }: GameSceneProps) {
  const [localYState, setLocalYState] = useState(0); // Only for initial render or big jumps if needed
  const velocityRef = useRef(0);
  const positionYRef = useRef(0);
  const scoreRef = useRef(0);
  const isAliveRef = useRef(true);
  const scrollXRef = useRef(0);
  const passedPipesRef = useRef<Set<string>>(new Set());
  const smoothedYRef = useRef<Record<string, number>>({});
  const [jumpKey, setJumpKey] = useState(0);
  const [crashPos, setCrashPos] = useState<[number, number, number] | null>(null);
  const shakeRef = useRef(0);
  const [flash, setFlash] = useState(0);
  const [emojis, setEmojis] = useState<{ id: string, char: string, x: number, startTime: number }[]>([]);

  // Listen for Emojis
  useEffect(() => {
    if (!socket) return;
    const handleMessage = (e: MessageEvent) => {
        try {
            const data = JSON.parse(e.data);
            if (data.type === 'EMOJI') {
                setEmojis(prev => [...prev.slice(-10), { 
                    id: Math.random().toString(), 
                    char: data.emoji, 
                    x: (Math.random() - 0.5) * 8,
                    startTime: Date.now() 
                }]);
            }
        } catch(err) {}
    };
    socket.addEventListener('message', handleMessage);
    return () => socket.removeEventListener('message', handleMessage);
  }, [socket]);

  useEffect(() => {
    if (roomState?.state === 'STARTING') {
        positionYRef.current = 0;
        velocityRef.current = 0;
        scoreRef.current = 0;
        isAliveRef.current = true;
        scrollXRef.current = 0;
        passedPipesRef.current.clear();
        setLocalYState(0);
        setCrashPos(null);
        shakeRef.current = 0;
        setFlash(0);
    }
  }, [roomState?.state]);

  const triggerDeath = useCallback(() => {
      if (!isAliveRef.current) return;
      isAliveRef.current = false;
      shakeRef.current = 1.0;
      setFlash(1);
      setCrashPos([BIRD_X, positionYRef.current, 0]);
      onDie?.(scoreRef.current);
  }, [onDie]);

  const jump = useCallback(() => {
    if (roomState?.state === 'PLAYING' && isAliveRef.current) {
        const multiplier = getDifficultyMultiplier(scoreRef.current);
        velocityRef.current = BASE_JUMP_FORCE * multiplier * 0.016; // Normalize for jump impulse
        setJumpKey(k => k + 1);
        shakeRef.current = Math.max(shakeRef.current, 0.1);
    }
  }, [roomState?.state]);

  useEffect(() => {
    if (jumpTrigger) jump();
  }, [jumpTrigger, jump]);

  const handleInput = useCallback(() => {
    if (roomState?.state === 'PLAYING' && isAliveRef.current) {
        jump();
        onFlap?.();
    }
  }, [roomState?.state, jump, onFlap]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.code === 'Space') handleInput();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleInput]);

  useFrame((state, delta) => {
    const d = Math.min(delta, 0.1); // Cap delta to prevent massive jumps on lag spike
    
    // Decay juice
    if (shakeRef.current > 0) shakeRef.current -= d * 3;
    if (flash > 0) setFlash(f => Math.max(0, f - d * 4));

    // Apply Shake
    if (shakeRef.current > 0) {
        state.camera.position.x += (Math.random() - 0.5) * shakeRef.current * 0.4;
        state.camera.position.y += (Math.random() - 0.5) * shakeRef.current * 0.4;
    }

    const isPlayer = !!localPlayerId;
    const isPlaying = roomState?.state === 'PLAYING';

    const maxScore = roomState ? Math.max(...Object.values(roomState.players).map(p => p.score), 0) : 0;
    const effectiveScore = (isPlayer && isAliveRef.current) ? scoreRef.current : maxScore;
    
    const multiplier = getDifficultyMultiplier(effectiveScore);
    const currentPipeSpeed = BASE_PIPE_SPEED * multiplier;
    const currentGravity = BASE_GRAVITY * multiplier;

    if (isPlayer && isAliveRef.current && isPlaying) {
        velocityRef.current += currentGravity * d;
        positionYRef.current += velocityRef.current;
        if (positionYRef.current < -4.65 || positionYRef.current > 4.65) triggerDeath();
    }

    if (isPlaying) {
        scrollXRef.current += currentPipeSpeed * d;
    }

    if (isPlayer && isAliveRef.current && isPlaying) {
        roomState!.obstacles.forEach(pipe => {
            const pipeX = pipe.x - scrollXRef.current;
            if (pipeX < BIRD_X && !passedPipesRef.current.has(pipe.id)) {
                passedPipesRef.current.add(pipe.id);
                scoreRef.current += 1;
                onScoreUpdate?.(scoreRef.current);
            }
            if (Math.abs(pipeX - BIRD_X) < 0.9) {
                if (positionYRef.current > pipe.gapY + 0.9 || positionYRef.current < pipe.gapY - 0.9) triggerDeath();
            }
        });
    }

    // Sync others with lerp scaled by delta
    if (playerPositions) {
        Object.keys(playerPositions).forEach(id => {
            if (id !== localPlayerId) {
                const targetY = playerPositions[id];
                smoothedYRef.current[id] = THREE.MathUtils.lerp(
                    smoothedYRef.current[id] ?? targetY, 
                    targetY, 
                    1 - Math.exp(-15 * d) // Frame-rate independent lerp
                );
            }
        });
    }

    // Camera follow
    if (!isPlayer && isPlaying) {
        const aliveBirds = Object.values(roomState?.players || {}).filter(p => p.isAlive);
        if (aliveBirds.length > 0) {
            const avgY = aliveBirds.reduce((acc, p) => {
                const y = p.id === localPlayerId ? positionYRef.current : (smoothedYRef.current[p.id] || 0);
                return acc + y;
            }, 0) / aliveBirds.length;
            
            const targetCamY = Math.min(Math.max(avgY * 0.5, -2), 2);
            state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, targetCamY, 1 - Math.exp(-3 * d));
        }
        state.camera.lookAt(2, 0, 0);
    }

    if (isPlayer && isAliveRef.current) {
        if (Math.abs(localYState - positionYRef.current) > 0.01) {
            setLocalYState(positionYRef.current);
        }
    }
  });

  useEffect(() => {
    if (roomState?.state !== 'PLAYING' || !isAliveRef.current || !onUpdatePosition) return;
    const interval = setInterval(() => {
        onUpdatePosition(positionYRef.current);
    }, 32); // Sync at ~30fps for balance between smoothness and bandwidth
    return () => clearInterval(interval);
  }, [roomState?.state, onUpdatePosition]);

  const pipes = useMemo(() => {
    return roomState?.obstacles.map(pipe => (
        <Pipe key={pipe.id} x={pipe.x - scrollXRef.current} gapY={pipe.gapY} />
    )) || [];
  }, [roomState?.obstacles]);

  return (
    <>
      <Environment />
      
      {/* Others */}
      {roomState && Object.values(roomState.players).map(player => {
        if (player.id === localPlayerId || !player.isAlive) return null;
        return (
          <Bird 
            key={player.id} 
            position={[BIRD_X, smoothedYRef.current[player.id] ?? player.position[1], 0]} 
            color={player.color} 
            name={player.name} 
            score={player.score}
          />
        );
      })}

      {/* Local */}
      {roomState?.players[localPlayerId || '']?.isAlive && (
        <Bird 
          position={[BIRD_X, localYState, 0]} 
          color={roomState.players[localPlayerId!].color} 
          name={roomState.players[localPlayerId!].name}
          score={roomState.players[localPlayerId!].score}
          isLocal
        />
      )}

      {/* Floating Emojis */}
      {emojis.map(e => {
        const age = (Date.now() - e.startTime) / 2000;
        if (age > 1) return null;
        return (
          <Text key={e.id} position={[e.x, -2 + age * 8, -2]} fontSize={0.6} fillOpacity={1 - age}>
            {e.char}
          </Text>
        );
      })}

      <Particles key={`j-${jumpKey}`} position={[BIRD_X, localYState, 0]} color="#fff" type="jump" count={10} />
      {crashPos && <Particles position={crashPos} color="#f00" type="crash" count={40} />}
      {roomState?.obstacles.map(pipe => <Pipe key={pipe.id} x={pipe.x - scrollXRef.current} gapY={pipe.gapY} />)}
    </>
  );
}

export function GameScene(props: GameSceneProps) {
  const [fov, setFov] = useState(45);

  useEffect(() => {
    const handleResize = () => {
        const isLandscape = window.innerWidth > window.innerHeight;
        setFov(isLandscape ? 55 : 45); // Wilder view for landscape
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="w-full h-full bg-slate-950 overflow-hidden relative">
      <Canvas shadows camera={{ position: [5, 0, 12], fov }} dpr={[1, 2]}>
        <Suspense fallback={null}>
          <GameLoop {...props} />
        </Suspense>
      </Canvas>
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_150px_rgba(0,0,0,0.4)]" />
    </div>
  );
}
