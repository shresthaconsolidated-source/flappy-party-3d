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
  socket?: any;
}

const BASE_GRAVITY = -0.0009;
const BASE_JUMP_FORCE = 0.04;
const BASE_PIPE_SPEED = 0.02;
const BIRD_X = 0;

function getDifficultyMultiplier(score: number) {
  return 1 + Math.floor(score / 5) * 0.15;
}

function GameLoop({ roomState, onFlap, onDie, localPlayerId, jumpTrigger, onUpdatePosition, onScoreUpdate, socket }: GameSceneProps) {
  const [localY, setLocalY] = useState(0);
  const velocityRef = useRef(0);
  const positionYRef = useRef(0);
  const scoreRef = useRef(0);
  const isAliveRef = useRef(true);
  const scrollXRef = useRef(0);
  const passedPipesRef = useRef<Set<string>>(new Set());
  const targetYRef = useRef<Record<string, number>>({});
  const smoothedYRef = useRef<Record<string, number>>({});
  const [tick, setTick] = useState(0);
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
        setLocalY(0);
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
        velocityRef.current = BASE_JUMP_FORCE * multiplier;
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
    // Decay juice
    if (shakeRef.current > 0) shakeRef.current -= delta * 3;
    if (flash > 0) setFlash(f => Math.max(0, f - delta * 4));

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
        velocityRef.current += currentGravity;
        positionYRef.current += velocityRef.current;
        if (positionYRef.current < -4.65 || positionYRef.current > 4.65) triggerDeath();
    }

    if (isPlaying) {
        scrollXRef.current += currentPipeSpeed * 60 * delta;
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

    // Sync others
    if (roomState) {
        Object.values(roomState.players).forEach(p => {
            if (p.id !== localPlayerId) {
                targetYRef.current[p.id] = p.position[1];
                smoothedYRef.current[p.id] = THREE.MathUtils.lerp(smoothedYRef.current[p.id] ?? p.position[1], targetYRef.current[p.id], 0.35);
            }
        });
    }

    // Camera follow
    if (!isPlayer && isPlaying) {
        const aliveBirds = Object.values(roomState?.players || {}).filter(p => p.isAlive);
        if (aliveBirds.length > 0) {
            const avgY = aliveBirds.reduce((acc, p) => acc + (p.id === localPlayerId ? positionYRef.current : (smoothedYRef.current[p.id] || 0)), 0) / aliveBirds.length;
            const targetCamY = Math.min(Math.max(avgY * 0.5, -2), 2);
            state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, targetCamY, 0.05);
        }
        state.camera.lookAt(2, 0, 0);
    }

    if (isPlayer && isAliveRef.current) setLocalY(positionYRef.current);
    else setTick(t => t + 1);
  });

  useEffect(() => {
    if (roomState?.state !== 'PLAYING' || !isAliveRef.current || !onUpdatePosition) return;
    const interval = setInterval(() => onUpdatePosition(positionYRef.current), 100);
    return () => clearInterval(interval);
  }, [roomState?.state, onUpdatePosition]);

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
          position={[BIRD_X, localY, 0]} 
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

      <Particles key={`j-${jumpKey}`} position={[BIRD_X, localY, 0]} color="#fff" type="jump" count={10} />
      {crashPos && <Particles position={crashPos} color="#f00" type="crash" count={40} />}
      {roomState?.obstacles.map(pipe => <Pipe key={pipe.id} x={pipe.x - scrollXRef.current} gapY={pipe.gapY} />)}
    </>
  );
}

export function GameScene(props: GameSceneProps) {
  return (
    <div className="w-full h-full bg-slate-950 overflow-hidden relative">
      <Canvas shadows camera={{ position: [5, 0, 12], fov: 45 }} dpr={[1, 2]}>
        <Suspense fallback={null}>
          <GameLoop {...props} />
        </Suspense>
      </Canvas>
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_150px_rgba(0,0,0,0.4)]" />
    </div>
  );
}
