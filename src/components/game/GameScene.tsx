"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import * as THREE from "three";
import { Bird } from "./Bird";
import { Pipe } from "./Pipe";
import { Environment } from "./Environment";
import type { RoomState, Player } from "../../types/game";

interface GameSceneProps {
  roomState: RoomState | null;
  onFlap?: () => void;
  onDie?: (score: number) => void;
  localPlayerId?: string;
  jumpTrigger?: number; // New prop to trigger jumps from parent
  onUpdatePosition?: (y: number) => void;
  onScoreUpdate?: (score: number) => void;
}

const BASE_GRAVITY = -0.0012;
const BASE_JUMP_FORCE = 0.045;
const BASE_PIPE_SPEED = 0.02; // Bumping speed as requested
const BIRD_X = 0;

function getDifficultyMultiplier(score: number) {
  // Increase speed by 15% every 5 points
  return 1 + Math.floor(score / 5) * 0.15;
}

function GameLoop({ roomState, onFlap, onDie, localPlayerId, jumpTrigger, onUpdatePosition, onScoreUpdate }: GameSceneProps) {
  const [localY, setLocalY] = useState(0);
  const velocityRef = useRef(0);
  const positionYRef = useRef(0);
  const scoreRef = useRef(0);
  const isAliveRef = useRef(true);
  const scrollXRef = useRef(0);
  const lastTimeRef = useRef(Date.now());
  const passedPipesRef = useRef<Set<string>>(new Set());
  const targetYRef = useRef<Record<string, number>>({});
  const smoothedYRef = useRef<Record<string, number>>({});
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (roomState?.state === 'STARTING') {
        positionYRef.current = 0;
        velocityRef.current = 0;
        scoreRef.current = 0;
        isAliveRef.current = true;
        scrollXRef.current = 0;
        passedPipesRef.current.clear();
        lastTimeRef.current = Date.now();
        setLocalY(0);
    }
  }, [roomState?.state]);

  const jump = useCallback(() => {
    if (roomState?.state === 'PLAYING' && isAliveRef.current) {
        const multiplier = getDifficultyMultiplier(scoreRef.current);
        velocityRef.current = BASE_JUMP_FORCE * multiplier;
    }
  }, [roomState?.state]);

  // Handle local jump trigger from prop
  useEffect(() => {
    if (jumpTrigger) {
        jump();
    }
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
    const isPlayer = !!localPlayerId;
    const isPlaying = roomState?.state === 'PLAYING';

    // 1. Calculate current speed based on score (Universal for sync)
    const maxScore = roomState ? Math.max(...Object.values(roomState.players).map(p => p.score), 0) : 0;
    const effectiveScore = (isPlayer && isAliveRef.current) ? scoreRef.current : maxScore;
    
    const multiplier = getDifficultyMultiplier(effectiveScore);
    const currentPipeSpeed = BASE_PIPE_SPEED * multiplier;
    const currentGravity = BASE_GRAVITY * multiplier;

    if (isPlayer && isAliveRef.current && isPlaying) {
        // 2. Physics (only if actually playing)
        velocityRef.current += currentGravity;
        positionYRef.current += velocityRef.current;
        
        // Floor/Ceiling collision (Bird radius effectively 0.35)
        if (positionYRef.current < -4.65 || positionYRef.current > 4.65) {
            isAliveRef.current = false;
            onDie?.(scoreRef.current);
        }
    }

    // 3. Accumulate scrollX to prevent jumps when speed changes (Everyone needs this)
    if (isPlaying) {
        scrollXRef.current += currentPipeSpeed * 60 * delta;
    }

    if (isPlayer && isAliveRef.current && isPlaying) {
        // 4. Scoring & Collision
        roomState.obstacles.forEach(pipe => {
            const pipeX = pipe.x - scrollXRef.current;
            
            // Scoring
            if (pipeX < BIRD_X && !passedPipesRef.current.has(pipe.id)) {
                passedPipesRef.current.add(pipe.id);
                scoreRef.current += 1;
                onScoreUpdate?.(scoreRef.current);
            }

            // Collision (Bird radius: 0.35, Pipe Cap radius: 0.6, Gap: 2.5/2 = 1.25)
            // Horizontal check (0.35 + 0.6 = 0.95, using 0.9 for a slightly more forgiving but tight feel)
            if (Math.abs(pipeX - BIRD_X) < 0.9) {
                // Vertical check (1.25 - 0.35 = 0.9)
                if (positionYRef.current > pipe.gapY + 0.9 || positionYRef.current < pipe.gapY - 0.9) {
                    isAliveRef.current = false;
                    onDie?.(scoreRef.current);
                }
            }
        });
    }

    // 5. Update smoothed positions for others
    if (roomState) {
        Object.values(roomState.players).forEach(p => {
            if (p.id !== localPlayerId) {
                targetYRef.current[p.id] = p.position[1];
                if (smoothedYRef.current[p.id] === undefined) {
                    smoothedYRef.current[p.id] = p.position[1];
                }
                smoothedYRef.current[p.id] = THREE.MathUtils.lerp(
                    smoothedYRef.current[p.id],
                    targetYRef.current[p.id],
                    0.2 // Smoothing factor
                );
            }
        });
    }

    // 6. Camera Sway on Host
    if (!isPlayer && isPlaying) {
        state.camera.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.2;
        state.camera.lookAt(0, 0, 0);
    }

    // 7. Render update
    if (isPlayer && isAliveRef.current) {
        setLocalY(positionYRef.current);
    } else {
        // Force host to re-render to update pipe/other bird positions at 60fps
        setTick(t => t + 1);
    }
  });

  // Broadcast position periodically (limit frequency to avoid server flood)
  useEffect(() => {
    if (roomState?.state !== 'PLAYING' || !isAliveRef.current || !onUpdatePosition) return;

    const interval = setInterval(() => {
        onUpdatePosition(positionYRef.current);
    }, 150); // Lowered frequency to 6.6fps to save bandwidth

    return () => clearInterval(interval);
  }, [roomState?.state, onUpdatePosition]);

  return (
    <>
      <Environment />
      
      {/* Other Players */}
      {roomState && Object.values(roomState.players).map(player => {
        if (player.id === localPlayerId) return null;
        if (!player.isAlive) return null;
        
        const y = smoothedYRef.current[player.id] ?? player.position[1];
        
        return (
          <Bird 
            key={player.id} 
            position={[BIRD_X, y, 0]} 
            color={player.color} 
            name={player.name} 
          />
        );
      })}

      {/* Local Player */}
      {roomState?.players[localPlayerId || '']?.isAlive && (
        <Bird 
          position={[BIRD_X, localY, 0]} 
          color={roomState.players[localPlayerId!].color} 
          name={roomState.players[localPlayerId!].name}
          isLocal
        />
      )}

      {/* Obstacles */}
      {roomState?.obstacles.map(pipe => {
        return (
          <Pipe key={pipe.id} x={pipe.x - scrollXRef.current} gapY={pipe.gapY} />
        );
      })}
    </>
  );
}

export function GameScene(props: GameSceneProps) {
    return (
        <div className="w-full h-full bg-sky-400">
            <Canvas shadows camera={{ position: [0, 0, 10], fov: 50 }}>
                <Suspense fallback={null}>
                    <GameLoop {...props} />
                </Suspense>
            </Canvas>
            
            {/* HUD */}
            <div className="absolute top-4 left-4 text-white font-bold text-2xl drop-shadow-md">
                {props.roomState?.state === 'PLAYING' && (
                    <div>Score: {Math.floor(props.roomState.players[props.localPlayerId!]?.score || 0)}</div>
                )}
            </div>
        </div>
    );
}
