export type GameState = 'WAITING' | 'STARTING' | 'PLAYING' | 'GAME_OVER';

export interface Player {
  id: string;
  name: string;
  score: number;
  highScore: number;
  isAlive: boolean;
  color: string;
  position: [number, number, number];
  lastActive: number; // For AFK pruning
}

export interface Obstacle {
  id: string;
  x: number;
  gapY: number;
}

export interface RoomState {
  state: GameState;
  players: Record<string, Player>;
  obstacles: Obstacle[];
  startTime: number | null;
  countdown: number;
  lastObstacleX: number;
}

export type ServerMessage =
  | { type: 'STATE'; state: RoomState }
  | { type: 'PLAYER_MOVED'; id: string; y: number }
  | { type: 'GAME_START'; startTime: number }
  | { type: 'PLAYER_FLAP'; playerId: string }
  | { type: 'PLAYER_DIED'; playerId: string; score: number }
  | { type: 'EMOJI'; emoji: string; playerId: string };

export type ClientMessage =
  | { type: 'JOIN'; name: string; color?: string }
  | { type: 'FLAP' }
  | { type: 'DIE'; score: number }
  | { type: 'UPDATE_SCORE'; score: number }
  | { type: 'START_GAME' }
  | { type: 'RESTART' }
  | { type: 'UPDATE_POSITION'; y: number }
  | { type: 'EMOJI'; emoji: string }
  | { type: 'HEARTBEAT' };
