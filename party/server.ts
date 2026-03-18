import type { Party, Request, Server, Connection } from "partykit/server";
import type { RoomState, ClientMessage, ServerMessage, Player, Obstacle } from "../src/types/game";

const OBSTACLE_SPACING = 5;
const INITIAL_OBSTACLE_X = 4; // Approx 3 seconds delay at current speed
const GLOBAL_STATS_ROOM = "global-stats";

export default class FlappyServer implements Server {
  state: RoomState;

  constructor(public party: Party) {
    this.state = {
      state: 'WAITING',
      players: {},
      obstacles: [],
      startTime: null,
      countdown: 0,
      lastObstacleX: INITIAL_OBSTACLE_X,
      allTimeBest: 0
    };
  }

  async onStart() {
    // Load from Global Stats Room instead of local room storage
    try {
      const statsRoom = this.party.context.parties.main.get(GLOBAL_STATS_ROOM);
      const res = await statsRoom.fetch("/get-stats", {
        method: "GET"
      });

      if (res.ok) {
        const data = await res.json() as any;
        if (data.score !== undefined && data.score !== null) {
          console.log(`[GLOBAL STORAGE] Loaded World Record: ${data.score} by ${data.holder}`);
          this.state.allTimeBest = Number(data.score);
          this.state.allTimeBestHolder = data.holder || "None";
        }
      } else {
        console.log("[GLOBAL STORAGE] No Global Record found. Initializing to 0.");
        this.state.allTimeBest = 0;
        this.state.allTimeBestHolder = "None";
      }
      this.broadcastState();
    } catch (err) {
      console.error("[GLOBAL STORAGE] Failed to load global record:", err);
      this.state.allTimeBest = 0;
      this.state.allTimeBestHolder = "None";
    }

    // Periodic pruning to remove "ghost" players even if no messages are sent
    setInterval(() => {
      this.broadcastState();
    }, 5000);
  }

  onConnect(conn: Connection) {
    // Prune any players that don't have active connections to prevent "ghosts"
    const activeIds = new Set([...this.party.getConnections()].map(c => c.id));
    let changed = false;
    for (const id in this.state.players) {
        if (!activeIds.has(id)) {
            delete this.state.players[id];
            changed = true;
        }
    }
    
    conn.send(JSON.stringify({ type: 'STATE', state: this.state }));
    if (changed) this.broadcastState();
  }

  onClose(conn: Connection) {
    console.log(`Connection closed: ${conn.id}`);
    
    if (this.state.players[conn.id]) {
      // If they leave mid-game, mark them dead so the round can end for others
      if (this.state.state === 'PLAYING') {
        this.state.players[conn.id].isAlive = false;
        this.checkGameEnd();
      }
      delete this.state.players[conn.id];
    }
    
    // Final check for remaining connections
    const connections = [...this.party.getConnections()];
    if (connections.length === 0) {
      this.resetGame();
    }
    
    this.broadcastState();
  }

  onMessage(message: string, conn: Connection) {
    const data = JSON.parse(message) as ClientMessage;
    
    // Update activity timestamp for any message
    if (this.state.players[conn.id]) {
        this.state.players[conn.id].lastActive = Date.now();
    }

    switch (data.type) {
      case 'JOIN':
        const name = data.name || `Player ${conn.id.slice(0, 4)}`;
        
        // Remove any existing player with the same name to prevent duplicates/ghosts
        let removedOld = false;
        for (const oldId in this.state.players) {
            if (this.state.players[oldId].name === name && oldId !== conn.id) {
                console.log(`Replacing old session for ${name} (${oldId} -> ${conn.id})`);
                delete this.state.players[oldId];
                removedOld = true;
            }
        }

        this.state.players[conn.id] = {
          id: conn.id,
          name: name,
          score: 0,
          highScore: 0,
          isAlive: true,
          color: data.color || `hsl(${Math.random() * 360}, 70%, 50%)`,
          position: [0, 0, 0],
          lastActive: Date.now()
        };
        
        if (Object.keys(this.state.players).length === 1 && this.state.state === 'WAITING') {
          this.startCountdown(15);
        }
        
        this.broadcastState();
        break;

      case 'HEARTBEAT':
        // Activity already updated above
        break;

      case 'START_GAME':
        if (Object.keys(this.state.players).length >= 1 && (this.state.state === 'WAITING' || this.state.state === 'GAME_OVER')) {
          this.startCountdown(3);
        }
        break;

      case 'FLAP':
        if (this.state.state === 'PLAYING' && this.state.players[conn.id]?.isAlive) {
          this.party.broadcast(JSON.stringify({ type: 'PLAYER_FLAP', playerId: conn.id }));
        }
        break;

      case 'DIE':
        if (this.state.players[conn.id]) {
          this.state.players[conn.id].isAlive = false;
          this.state.players[conn.id].score = data.score;
          if (data.score > this.state.players[conn.id].highScore) {
            this.state.players[conn.id].highScore = data.score;
          }
          
          // Persistent Global All-Time Best
          if (data.score > (this.state.allTimeBest || 0)) {
            console.log(`[RECORD] New GLOBAL World Record on DIE! ${data.score} by ${this.state.players[conn.id].name}`);
            this.state.allTimeBest = data.score;
            this.state.allTimeBestHolder = this.state.players[conn.id].name;
            
            // Update Global Room Storage via fetch
            const statsRoom = this.party.context.parties.main.get(GLOBAL_STATS_ROOM);
            statsRoom.fetch("/put-stats", {
                method: "POST",
                body: JSON.stringify({ score: data.score, holder: this.state.allTimeBestHolder }),
                headers: { "Content-Type": "application/json" }
            }).catch(err => console.error("Failed to update global stats:", err));
          }

          this.broadcastState();
          this.checkGameEnd();
        }
        break;

      case 'UPDATE_POSITION':
        if (this.state.players[conn.id]) {
            this.state.players[conn.id].position[1] = data.y;
            // Send only the position update to all clients to save bandwidth
            this.party.broadcast(JSON.stringify({
                type: 'PLAYER_MOVED',
                id: conn.id,
                y: data.y
            }), [conn.id]); // Exclude sender
        }
        break;
      case 'UPDATE_SCORE':
        if (this.state.players[conn.id]) {
            this.state.players[conn.id].score = data.score;
            
            // Check for record on every score increment too
            if (data.score > (this.state.allTimeBest || 0)) {
                console.log(`[RECORD] New GLOBAL World Record on UPDATE! ${data.score} by ${this.state.players[conn.id].name}`);
                this.state.allTimeBest = data.score;
                this.state.allTimeBestHolder = this.state.players[conn.id].name;
                
                // Update Global Room Storage via fetch
                const statsRoom = this.party.context.parties.main.get(GLOBAL_STATS_ROOM);
                statsRoom.fetch("/put-stats", {
                    method: "POST",
                    body: JSON.stringify({ score: data.score, holder: this.state.allTimeBestHolder }),
                    headers: { "Content-Type": "application/json" }
                }).catch(err => console.error("Failed to update global stats:", err));
            }
            this.broadcastState();
        }
        break;

      case 'RESTART':
        this.resetGame();
        break;

      case 'EMOJI':
        this.party.broadcast(JSON.stringify({ 
            type: 'EMOJI', 
            emoji: data.emoji, 
            playerId: conn.id 
        }));
        break;
    }
  }

  startCountdown(seconds: number) {
    this.state.state = 'STARTING';
    this.state.countdown = seconds;
    this.broadcastState();

    const interval = setInterval(() => {
      // If everyone left during countdown, stop it
      if (Object.keys(this.state.players).length === 0) {
        clearInterval(interval);
        this.resetGame();
        return;
      }

      this.state.countdown--;
      if (this.state.countdown <= 0) {
        clearInterval(interval);
        this.startGame();
      } else {
        this.broadcastState();
      }
    }, 1000);
  }

  startGame() {
    this.state.state = 'PLAYING';
    this.state.startTime = Date.now();
    this.state.obstacles = [];
    this.state.lastObstacleX = INITIAL_OBSTACLE_X;
    
    // Reset players
    for (const id in this.state.players) {
        this.state.players[id].isAlive = true;
        this.state.players[id].score = 0;
    }

    // Generate initial obstacles
    for (let i = 0; i < 20; i++) {
        this.addObstacle();
    }

    this.broadcastState();

    this.spawnObstacleLoop();
  }

  spawnObstacleLoop() {
    if (this.state.state !== 'PLAYING') return;

    this.addObstacle();
    this.broadcastState();

    // Calculate next spawn time based on highest score
    const maxScore = Math.max(...Object.values(this.state.players).map(p => p.score), 0);
    const multiplier = 1 + Math.floor(maxScore / 10) * 0.15; // Faster spawn every 10 pts
    const interval = Math.max(1500, 4000 / multiplier);

    setTimeout(() => this.spawnObstacleLoop(), interval);
  }

  addObstacle() {
    const nextX = this.state.obstacles.length === 0 
      ? INITIAL_OBSTACLE_X 
      : this.state.lastObstacleX + OBSTACLE_SPACING;
    
    this.state.obstacles.push({
      id: Math.random().toString(36).substring(7),
      x: nextX,
      gapY: (Math.random() - 0.5) * 6
    });
    
    this.state.lastObstacleX = nextX;

    // Prune obstacles to keep state small (keep last 50 to avoid gaps)
    if (this.state.obstacles.length > 50) {
        this.state.obstacles = this.state.obstacles.slice(-50);
    }
  }

  checkGameEnd() {
    const alivePlayers = Object.values(this.state.players).filter(p => p.isAlive);
    if (alivePlayers.length === 0 && this.state.state === 'PLAYING') {
        this.state.state = 'GAME_OVER';
        this.broadcastState();
    }
  }

  resetGame() {
    this.state.state = 'WAITING';
    this.state.obstacles = [];
    this.state.startTime = null;
    this.state.countdown = 0;
    
    // Reset player scores
    for (const id in this.state.players) {
        this.state.players[id].score = 0;
        this.state.players[id].isAlive = true;
    }

    this.broadcastState();
  }

  broadcastState() {
    this.pruneInactivePlayers();
    this.party.broadcast(JSON.stringify({ type: 'STATE', state: this.state }));
  }

  pruneInactivePlayers() {
    const now = Date.now();
    const activeConnections = new Set([...this.party.getConnections()].map(c => c.id));
    let changed = false;

    for (const id in this.state.players) {
        const player = this.state.players[id];
        // Remove if: no socket connection OR inactive for > 5s
        if (!activeConnections.has(id) || (now - player.lastActive > 5000)) {
            console.log(`Pruning inactive/ghost player: ${player.name} (${id})`);
            delete this.state.players[id];
            changed = true;
        }
    }

    if (changed && Object.keys(this.state.players).length === 0) {
        this.resetGame();
    }
    return changed;
  }

  async onRequest(req: Request) {
    if (this.party.id !== GLOBAL_STATS_ROOM) {
        return new Response("Not a stats room", { status: 404 });
    }

    const url = new URL(req.url);
    if (url.pathname === "/get-stats") {
        const [score, holder] = await Promise.all([
            this.party.storage.get<number>("allTimeBest"),
            this.party.storage.get<string>("allTimeBestHolder")
        ]);
        return new Response(JSON.stringify({ score, holder }), {
            headers: { "Content-Type": "application/json" }
        });
    }

    if (url.pathname === "/put-stats" && req.method === "POST") {
        const { score, holder } = await req.json() as any;
        const currentScore = await this.party.storage.get<number>("allTimeBest") || 0;
        if (score > currentScore) {
            await Promise.all([
                this.party.storage.put("allTimeBest", score),
                this.party.storage.put("allTimeBestHolder", holder)
            ]);
            return new Response("OK");
        }
        return new Response("No update needed");
    }

    return new Response("Not found", { status: 404 });
  }
}
