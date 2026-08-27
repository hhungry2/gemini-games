import React, { useState, useEffect, useRef, useCallback } from 'react';
import { sound } from '../utils/audio';
import {
  ArrowLeft,
  Play,
  RotateCcw,
  Trophy,
  Crown,
  Swords,
  Volume2,
  VolumeX,
} from 'lucide-react';

const HIGH_SCORE_KEY = 'paperio_high_score';
const HIGH_KILLS_KEY = 'paperio_high_kills';
const MAX_PERCENT_KEY = 'paperio_max_percent';

interface PaperIoGameProps {
  onBackToHub: () => void;
  isDark: boolean;
  isFullscreen?: boolean;
}

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

interface Position {
  x: number;
  y: number;
}

interface Item {
  id: number;
  x: number;
  y: number;
  type: 'speed' | 'shield' | 'bomb' | 'star';
  duration: number;
}

interface Character {
  id: number;
  name: string;
  isPlayer: boolean;
  x: number;
  y: number;
  dir: Direction;
  nextDir: Direction;
  speed: number;
  baseSpeed: number;
  color: {
    main: string;
    trail: string;
    territory: string;
    border: string;
    glow: string;
  };
  trail: Position[];
  isAlive: boolean;
  territoryCount: number;
  territoryPercent: number;
  kills: number;
  score: number;
  respawnTimer: number;
  hasShield: boolean;
  speedBoostTimer: number;
  aiState?: 'EXPAND' | 'RETURN' | 'ATTACK';
  targetPos?: Position;
  aiStepCount?: number;
}

interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  opacity: number;
  scale: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  maxLife: number;
  life: number;
}

interface KillFeedItem {
  id: number;
  killer: string;
  victim: string;
  killerColor: string;
  time: number;
}

const MAP_GRID = 90;
const CELL_SIZE = 24;
const WORLD_SIZE = MAP_GRID * CELL_SIZE;

const PLAYER_SKINS = [
  {
    name: 'ネオングリーン (Emerald)',
    main: '#10b981',
    trail: '#34d399',
    territory: 'rgba(16, 185, 129, 0.45)',
    border: '#059669',
    glow: 'rgba(16, 185, 129, 0.6)',
  },
  {
    name: 'シアンブルー (Cyan)',
    main: '#06b6d4',
    trail: '#38bdf8',
    territory: 'rgba(6, 182, 212, 0.45)',
    border: '#0891b2',
    glow: 'rgba(6, 182, 212, 0.6)',
  },
  {
    name: 'ネオンピンク (Pink)',
    main: '#ec4899',
    trail: '#f472b6',
    territory: 'rgba(236, 72, 153, 0.45)',
    border: '#db2777',
    glow: 'rgba(236, 72, 153, 0.6)',
  },
  {
    name: 'サンセットゴールド (Gold)',
    main: '#f59e0b',
    trail: '#fbbf24',
    territory: 'rgba(245, 158, 11, 0.45)',
    border: '#d97706',
    glow: 'rgba(245, 158, 11, 0.6)',
  },
  {
    name: 'サイバーパープル (Violet)',
    main: '#8b5cf6',
    trail: '#a78bfa',
    territory: 'rgba(139, 92, 246, 0.45)',
    border: '#7c3aed',
    glow: 'rgba(139, 92, 246, 0.6)',
  },
];

const BOT_CONFIGS = [
  {
    name: 'Red Blaze',
    main: '#ef4444',
    trail: '#f87171',
    territory: 'rgba(239, 68, 68, 0.4)',
    border: '#dc2626',
    glow: 'rgba(239, 68, 68, 0.5)',
  },
  {
    name: 'Cyber Blue',
    main: '#3b82f6',
    trail: '#60a5fa',
    territory: 'rgba(59, 130, 246, 0.4)',
    border: '#2563eb',
    glow: 'rgba(59, 130, 246, 0.5)',
  },
  {
    name: 'Solar Orange',
    main: '#f97316',
    trail: '#fb923c',
    territory: 'rgba(249, 115, 22, 0.4)',
    border: '#ea580c',
    glow: 'rgba(249, 115, 22, 0.5)',
  },
  {
    name: 'Violet Shadow',
    main: '#a855f7',
    trail: '#c084fc',
    territory: 'rgba(168, 85, 247, 0.4)',
    border: '#9333ea',
    glow: 'rgba(168, 85, 247, 0.5)',
  },
  {
    name: 'Neon Lime',
    main: '#84cc16',
    trail: '#a3e635',
    territory: 'rgba(132, 204, 22, 0.4)',
    border: '#65a30d',
    glow: 'rgba(132, 204, 22, 0.5)',
  },
  {
    name: 'Aqua Marine',
    main: '#14b8a6',
    trail: '#2dd4bf',
    territory: 'rgba(20, 184, 166, 0.4)',
    border: '#0d9488',
    glow: 'rgba(20, 184, 166, 0.5)',
  },
];

export const PaperIoGame: React.FC<PaperIoGameProps> = ({
  onBackToHub,
  isDark,
  isFullscreen = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const minimapCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // ゲームステート
  const [gameState, setGameState] = useState<'title' | 'playing' | 'gameover' | 'victory'>('title');
  const [selectedSkin, setSelectedSkin] = useState(0);
  const [botCount, setBotCount] = useState(6);
  const [botDifficulty, setBotDifficulty] = useState<'easy' | 'normal' | 'hard'>('normal');

  // スコア・統計情報
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [kills, setKills] = useState(0);
  const [highKills, setHighKills] = useState(0);
  const [territoryPercent, setTerritoryPercent] = useState(0);
  const [maxPercent, setMaxPercent] = useState(0);
  const [leaderboard, setLeaderboard] = useState<
    Array<{ name: string; percent: number; color: string; isPlayer: boolean; kills: number }>
  >([]);
  const [killFeed, setKillFeed] = useState<KillFeedItem[]>([]);
  const [isMuted, setIsMuted] = useState(false);

  // 内部状態 (Ref)
  const stateRef = useRef({
    grid: new Uint8Array(MAP_GRID * MAP_GRID),
    trailGrid: new Uint8Array(MAP_GRID * MAP_GRID),
    characters: [] as Character[],
    items: [] as Item[],
    particles: [] as Particle[],
    floatingTexts: [] as FloatingText[],
    killFeedList: [] as KillFeedItem[],
    camera: { x: WORLD_SIZE / 2, y: WORLD_SIZE / 2 },
    nextItemId: 1,
    nextTextId: 1,
    nextKillId: 1,
    itemSpawnTimer: 0,
    screenShake: 0,
    lastTime: performance.now(),
    isGameActive: false,
  });

  // ハイスコア読み込み
  useEffect(() => {
    const sScore = localStorage.getItem(HIGH_SCORE_KEY);
    if (sScore) setHighScore(parseInt(sScore, 10) || 0);

    const sKills = localStorage.getItem(HIGH_KILLS_KEY);
    if (sKills) setHighKills(parseInt(sKills, 10) || 0);

    const sPercent = localStorage.getItem(MAX_PERCENT_KEY);
    if (sPercent) setMaxPercent(parseFloat(sPercent) || 0);
  }, []);

  // ハイスコア更新
  const updateRecords = useCallback((finalScore: number, finalKills: number, finalPercent: number) => {
    setHighScore((prev) => {
      const next = Math.max(prev, finalScore);
      localStorage.setItem(HIGH_SCORE_KEY, next.toString());
      return next;
    });
    setHighKills((prev) => {
      const next = Math.max(prev, finalKills);
      localStorage.setItem(HIGH_KILLS_KEY, next.toString());
      return next;
    });
    setMaxPercent((prev) => {
      const next = Math.max(prev, finalPercent);
      localStorage.setItem(MAX_PERCENT_KEY, next.toFixed(1));
      return next;
    });
  }, []);

  // 浮遊テキスト追加
  const addFloatingText = (x: number, y: number, text: string, color: string) => {
    const s = stateRef.current;
    s.floatingTexts.push({
      id: s.nextTextId++,
      x,
      y,
      text,
      color,
      opacity: 1.0,
      scale: 1.2,
    });
  };

  // パーティクル発生
  const createParticles = (x: number, y: number, color: string, count = 15, speed = 4) => {
    const s = stateRef.current;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = (Math.random() * 0.7 + 0.3) * speed;
      s.particles.push({
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        color,
        size: Math.random() * 5 + 3,
        alpha: 1.0,
        life: 0,
        maxLife: Math.random() * 25 + 20,
      });
    }
  };

  // 初期スポーン領地（4x4）の作成
  const spawnInitialTerritory = (charId: number, centerX: number, centerY: number) => {
    const s = stateRef.current;
    const half = 2;
    for (let dy = -half; dy <= half; dy++) {
      for (let dx = -half; dx <= half; dx++) {
        const gx = centerX + dx;
        const gy = centerY + dy;
        if (gx >= 0 && gx < MAP_GRID && gy >= 0 && gy < MAP_GRID) {
          s.grid[gy * MAP_GRID + gx] = charId;
        }
      }
    }
  };

  // ゲーム初期化
  const initGame = () => {
    const s = stateRef.current;
    s.grid.fill(0);
    s.trailGrid.fill(0);
    s.particles = [];
    s.floatingTexts = [];
    s.items = [];
    s.killFeedList = [];
    s.isGameActive = true;
    s.screenShake = 0;

    const chars: Character[] = [];

    // プレイヤー作成
    const pStartX = Math.floor(MAP_GRID * 0.3 + Math.random() * MAP_GRID * 0.4);
    const pStartY = Math.floor(MAP_GRID * 0.3 + Math.random() * MAP_GRID * 0.4);
    spawnInitialTerritory(1, pStartX, pStartY);

    const playerSkin = PLAYER_SKINS[selectedSkin];
    chars.push({
      id: 1,
      name: 'YOU',
      isPlayer: true,
      x: (pStartX + 0.5) * CELL_SIZE,
      y: (pStartY + 0.5) * CELL_SIZE,
      dir: 'UP',
      nextDir: 'UP',
      speed: 3.2,
      baseSpeed: 3.2,
      color: playerSkin,
      trail: [],
      isAlive: true,
      territoryCount: 25,
      territoryPercent: 0.3,
      kills: 0,
      score: 0,
      respawnTimer: 0,
      hasShield: false,
      speedBoostTimer: 0,
    });

    // ボット作成
    const baseBotSpeed = botDifficulty === 'easy' ? 2.6 : botDifficulty === 'hard' ? 3.4 : 3.0;

    for (let i = 0; i < botCount; i++) {
      const bId = i + 2;
      const bConfig = BOT_CONFIGS[i % BOT_CONFIGS.length];

      let bX = 0;
      let bY = 0;
      let valid = false;
      for (let attempt = 0; attempt < 50; attempt++) {
        bX = Math.floor(6 + Math.random() * (MAP_GRID - 12));
        bY = Math.floor(6 + Math.random() * (MAP_GRID - 12));
        const distToPlayer = Math.hypot(bX - pStartX, bY - pStartY);
        if (distToPlayer > 12) {
          valid = true;
          break;
        }
      }
      if (!valid) {
        bX = Math.floor(10 + i * 12) % (MAP_GRID - 12);
        bY = Math.floor(10 + i * 10) % (MAP_GRID - 12);
      }

      spawnInitialTerritory(bId, bX, bY);

      chars.push({
        id: bId,
        name: bConfig.name,
        isPlayer: false,
        x: (bX + 0.5) * CELL_SIZE,
        y: (bY + 0.5) * CELL_SIZE,
        dir: ['UP', 'DOWN', 'LEFT', 'RIGHT'][Math.floor(Math.random() * 4)] as Direction,
        nextDir: 'UP',
        speed: baseBotSpeed,
        baseSpeed: baseBotSpeed,
        color: bConfig,
        trail: [],
        isAlive: true,
        territoryCount: 25,
        territoryPercent: 0.3,
        kills: 0,
        score: 0,
        respawnTimer: 0,
        hasShield: false,
        speedBoostTimer: 0,
        aiState: 'EXPAND',
        aiStepCount: 0,
      });
    }

    s.characters = chars;
    s.camera = { x: chars[0].x, y: chars[0].y };

    setScore(0);
    setKills(0);
    setTerritoryPercent(0.3);
    setGameState('playing');
  };

  // アイテムスポーン
  const spawnRandomItem = () => {
    const s = stateRef.current;
    if (s.items.length >= 8) return;

    const types: Array<'speed' | 'shield' | 'bomb' | 'star'> = ['speed', 'shield', 'bomb', 'star'];
    const type = types[Math.floor(Math.random() * types.length)];
    const gx = Math.floor(3 + Math.random() * (MAP_GRID - 6));
    const gy = Math.floor(3 + Math.random() * (MAP_GRID - 6));

    s.items.push({
      id: s.nextItemId++,
      x: (gx + 0.5) * CELL_SIZE,
      y: (gy + 0.5) * CELL_SIZE,
      type,
      duration: 600,
    });
  };

  // 囲み込みキャプチャアルゴリズム (Boundary BFS Flood Fill)
  const captureTerritory = (char: Character) => {
    const s = stateRef.current;
    const charId = char.id;

    // 1. トレイル上のセルをすべて自分の領地に変換
    let capturedFromTrail = 0;
    for (const p of char.trail) {
      if (p.x >= 0 && p.x < MAP_GRID && p.y >= 0 && p.y < MAP_GRID) {
        const idx = p.y * MAP_GRID + p.x;
        if (s.grid[idx] !== charId) {
          s.grid[idx] = charId;
          capturedFromTrail++;
        }
        s.trailGrid[idx] = 0;
      }
    }
    char.trail = [];

    // 2. マップ外周から非所有セルに対して Flood Fill を行い、「外側」セルを特定
    const visited = new Uint8Array(MAP_GRID * MAP_GRID);
    const queue: number[] = [];

    for (let x = 0; x < MAP_GRID; x++) {
      const topIdx = 0 * MAP_GRID + x;
      if (s.grid[topIdx] !== charId) {
        visited[topIdx] = 1;
        queue.push(x, 0);
      }
      const botIdx = (MAP_GRID - 1) * MAP_GRID + x;
      if (s.grid[botIdx] !== charId && visited[botIdx] === 0) {
        visited[botIdx] = 1;
        queue.push(x, MAP_GRID - 1);
      }
    }

    for (let y = 1; y < MAP_GRID - 1; y++) {
      const leftIdx = y * MAP_GRID + 0;
      if (s.grid[leftIdx] !== charId && visited[leftIdx] === 0) {
        visited[leftIdx] = 1;
        queue.push(0, y);
      }
      const rightIdx = y * MAP_GRID + (MAP_GRID - 1);
      if (s.grid[rightIdx] !== charId && visited[rightIdx] === 0) {
        visited[rightIdx] = 1;
        queue.push(MAP_GRID - 1, y);
      }
    }

    let head = 0;
    const dxs = [1, -1, 0, 0];
    const dys = [0, 0, 1, -1];

    while (head < queue.length) {
      const qx = queue[head++];
      const qy = queue[head++];

      for (let i = 0; i < 4; i++) {
        const nx = qx + dxs[i];
        const ny = qy + dys[i];

        if (nx >= 0 && nx < MAP_GRID && ny >= 0 && ny < MAP_GRID) {
          const nIdx = ny * MAP_GRID + nx;
          if (visited[nIdx] === 0 && s.grid[nIdx] !== charId) {
            visited[nIdx] = 1;
            queue.push(nx, ny);
          }
        }
      }
    }

    // 3. visited === 0 かつ 自分の領地でないセルはすべて囲まれた内側！
    let newlyCaptured = 0;
    for (let y = 0; y < MAP_GRID; y++) {
      for (let x = 0; x < MAP_GRID; x++) {
        const idx = y * MAP_GRID + x;
        if (visited[idx] === 0 && s.grid[idx] !== charId) {
          s.grid[idx] = charId;
          newlyCaptured++;
        }
      }
    }

    const totalCaptured = capturedFromTrail + newlyCaptured;
    if (totalCaptured > 0) {
      const addedScore = totalCaptured * 15;
      char.score += addedScore;

      if (char.isPlayer) {
        setScore((prev) => prev + addedScore);
        sound.playPaperCapture(totalCaptured);

        const earnedPercent = (totalCaptured / (MAP_GRID * MAP_GRID)) * 100;
        if (earnedPercent >= 0.3) {
          addFloatingText(char.x, char.y - 20, `+${earnedPercent.toFixed(1)}%`, '#10b981');
        }
      }
    }
  };

  // キャラクター死亡処理
  const killCharacter = (victim: Character, killer: Character | null) => {
    const s = stateRef.current;
    victim.isAlive = false;

    // トレイルのクリア
    for (const p of victim.trail) {
      const idx = p.y * MAP_GRID + p.x;
      if (s.trailGrid[idx] === victim.id) {
        s.trailGrid[idx] = 0;
      }
    }
    victim.trail = [];

    // 領地のクリア（中立化）
    for (let i = 0; i < s.grid.length; i++) {
      if (s.grid[i] === victim.id) {
        s.grid[i] = 0;
      }
    }

    createParticles(victim.x, victim.y, victim.color.main, 35, 6);

    if (killer) {
      killer.kills += 1;
      killer.score += 500;

      const feedItem: KillFeedItem = {
        id: s.nextKillId++,
        killer: killer.name,
        victim: victim.name,
        killerColor: killer.color.main,
        time: Date.now(),
      };
      s.killFeedList.unshift(feedItem);
      if (s.killFeedList.length > 5) s.killFeedList.pop();
      setKillFeed([...s.killFeedList]);

      if (killer.isPlayer) {
        sound.playPaperKill();
        s.screenShake = 12;
        addFloatingText(victim.x, victim.y - 30, `KILL! +500`, '#fbbf24');
        setKills((prev) => prev + 1);
        setScore((prev) => prev + 500);
      }
    }

    if (victim.isPlayer) {
      sound.playPaperDie();
      s.screenShake = 20;
      setGameState('gameover');
      updateRecords(victim.score, victim.kills, victim.territoryPercent);
    } else {
      victim.respawnTimer = 180;
    }
  };

  // ボットのリスポーン
  const respawnBot = (bot: Character) => {
    const bX = Math.floor(6 + Math.random() * (MAP_GRID - 12));
    const bY = Math.floor(6 + Math.random() * (MAP_GRID - 12));

    spawnInitialTerritory(bot.id, bX, bY);
    bot.x = (bX + 0.5) * CELL_SIZE;
    bot.y = (bY + 0.5) * CELL_SIZE;
    bot.dir = ['UP', 'DOWN', 'LEFT', 'RIGHT'][Math.floor(Math.random() * 4)] as Direction;
    bot.nextDir = bot.dir;
    bot.isAlive = true;
    bot.trail = [];
    bot.hasShield = false;
    bot.speedBoostTimer = 0;
    bot.aiState = 'EXPAND';
    bot.aiStepCount = 0;
  };

  // ボットAI
  const updateBotAI = (bot: Character) => {
    const s = stateRef.current;
    const gx = Math.floor(bot.x / CELL_SIZE);
    const gy = Math.floor(bot.y / CELL_SIZE);

    if (gx < 0 || gx >= MAP_GRID || gy < 0 || gy >= MAP_GRID) return;

    bot.aiStepCount = (bot.aiStepCount || 0) + 1;

    let targetTrailPos: Position | null = null;
    let minTrailDist = 999;
    const searchRadius = botDifficulty === 'hard' ? 8 : botDifficulty === 'normal' ? 5 : 3;

    for (let dy = -searchRadius; dy <= searchRadius; dy++) {
      for (let dx = -searchRadius; dx <= searchRadius; dx++) {
        const sx = gx + dx;
        const sy = gy + dy;
        if (sx >= 0 && sx < MAP_GRID && sy >= 0 && sy < MAP_GRID) {
          const tOwner = s.trailGrid[sy * MAP_GRID + sx];
          if (tOwner > 0 && tOwner !== bot.id) {
            const d = Math.hypot(dx, dy);
            if (d < minTrailDist) {
              minTrailDist = d;
              targetTrailPos = { x: sx, y: sy };
            }
          }
        }
      }
    }

    const isOutsideTerritory = s.grid[gy * MAP_GRID + gx] !== bot.id;
    const trailLength = bot.trail.length;
    const maxSafeTrail = botDifficulty === 'hard' ? 18 : botDifficulty === 'normal' ? 12 : 8;

    if (targetTrailPos && minTrailDist <= 6 && trailLength < maxSafeTrail) {
      bot.aiState = 'ATTACK';
      bot.targetPos = targetTrailPos;
    } else if (isOutsideTerritory && trailLength > maxSafeTrail) {
      bot.aiState = 'RETURN';
    } else if (!isOutsideTerritory) {
      bot.aiState = 'EXPAND';
    }

    const getPossibleDirs = (curDir: Direction): Direction[] => {
      const dirs: Direction[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
      const opposites: Record<Direction, Direction> = {
        UP: 'DOWN',
        DOWN: 'UP',
        LEFT: 'RIGHT',
        RIGHT: 'LEFT',
      };
      return dirs.filter((d) => d !== opposites[curDir]);
    };

    const validDirs = getPossibleDirs(bot.dir).filter((d) => {
      let nx = gx;
      let ny = gy;
      if (d === 'UP') ny--;
      if (d === 'DOWN') ny++;
      if (d === 'LEFT') nx--;
      if (d === 'RIGHT') nx++;

      if (nx <= 1 || nx >= MAP_GRID - 2 || ny <= 1 || ny >= MAP_GRID - 2) return false;

      const tOwner = s.trailGrid[ny * MAP_GRID + nx];
      if (tOwner === bot.id) return false;

      return true;
    });

    if (validDirs.length === 0) return;

    if (bot.aiState === 'RETURN') {
      let bestDir = validDirs[0];
      let bestDist = 9999;
      for (const d of validDirs) {
        let nx = gx;
        let ny = gy;
        if (d === 'UP') ny--;
        if (d === 'DOWN') ny++;
        if (d === 'LEFT') nx--;
        if (d === 'RIGHT') nx++;

        if (s.grid[ny * MAP_GRID + nx] === bot.id) {
          bestDir = d;
          break;
        }

        let localDist = 999;
        for (let r = 1; r <= 8; r++) {
          for (let ty = -r; ty <= r; ty++) {
            for (let tx = -r; tx <= r; tx++) {
              const cx = nx + tx;
              const cy = ny + ty;
              if (cx >= 0 && cx < MAP_GRID && cy >= 0 && cy < MAP_GRID) {
                if (s.grid[cy * MAP_GRID + cx] === bot.id) {
                  localDist = Math.min(localDist, Math.hypot(tx, ty));
                }
              }
            }
          }
          if (localDist < 999) break;
        }

        if (localDist < bestDist) {
          bestDist = localDist;
          bestDir = d;
        }
      }
      bot.nextDir = bestDir;
    } else if (bot.aiState === 'ATTACK' && bot.targetPos) {
      let bestDir = validDirs[0];
      let bestDist = 9999;
      for (const d of validDirs) {
        let nx = gx;
        let ny = gy;
        if (d === 'UP') ny--;
        if (d === 'DOWN') ny++;
        if (d === 'LEFT') nx--;
        if (d === 'RIGHT') nx++;

        const dist = Math.hypot(nx - bot.targetPos.x, ny - bot.targetPos.y);
        if (dist < bestDist) {
          bestDist = dist;
          bestDir = d;
        }
      }
      bot.nextDir = bestDir;
    } else {
      if (bot.aiStepCount % 12 === 0 || Math.random() < 0.1) {
        bot.nextDir = validDirs[Math.floor(Math.random() * validDirs.length)];
      }
    }
  };

  // メインゲームループ
  useEffect(() => {
    let animationFrameId: number;

    const gameLoop = () => {
      const s = stateRef.current;
      const now = performance.now();
      s.lastTime = now;

      if (gameState === 'playing' && s.isGameActive) {
        s.itemSpawnTimer++;
        if (s.itemSpawnTimer > 180) {
          s.itemSpawnTimer = 0;
          spawnRandomItem();
        }

        for (let i = s.items.length - 1; i >= 0; i--) {
          s.items[i].duration--;
          if (s.items[i].duration <= 0) {
            s.items.splice(i, 1);
          }
        }

        for (const char of s.characters) {
          if (!char.isAlive) {
            if (!char.isPlayer && char.respawnTimer > 0) {
              char.respawnTimer--;
              if (char.respawnTimer <= 0) {
                respawnBot(char);
              }
            }
            continue;
          }

          if (char.speedBoostTimer > 0) {
            char.speedBoostTimer--;
            char.speed = char.baseSpeed * 1.5;
          } else {
            char.speed = char.baseSpeed;
          }

          if (!char.isPlayer) {
            updateBotAI(char);
          }

          char.dir = char.nextDir;

          let vx = 0;
          let vy = 0;
          if (char.dir === 'UP') vy = -char.speed;
          if (char.dir === 'DOWN') vy = char.speed;
          if (char.dir === 'LEFT') vx = -char.speed;
          if (char.dir === 'RIGHT') vx = char.speed;

          char.x += vx;
          char.y += vy;

          if (
            char.x < CELL_SIZE / 2 ||
            char.x > WORLD_SIZE - CELL_SIZE / 2 ||
            char.y < CELL_SIZE / 2 ||
            char.y > WORLD_SIZE - CELL_SIZE / 2
          ) {
            killCharacter(char, null);
            continue;
          }

          const gx = Math.floor(char.x / CELL_SIZE);
          const gy = Math.floor(char.y / CELL_SIZE);
          const cellIdx = gy * MAP_GRID + gx;
          const isOwnTerritory = s.grid[cellIdx] === char.id;

          // アイテム取得判定
          for (let itIdx = s.items.length - 1; itIdx >= 0; itIdx--) {
            const item = s.items[itIdx];
            const dist = Math.hypot(char.x - item.x, char.y - item.y);
            if (dist < CELL_SIZE) {
              s.items.splice(itIdx, 1);
              createParticles(item.x, item.y, '#f59e0b', 20, 5);

              if (char.isPlayer) {
                sound.playPaperItem();
              }

              if (item.type === 'speed') {
                char.speedBoostTimer = 360;
                if (char.isPlayer) addFloatingText(char.x, char.y - 20, 'SPEED BOOST!', '#38bdf8');
              } else if (item.type === 'shield') {
                char.hasShield = true;
                if (char.isPlayer) addFloatingText(char.x, char.y - 20, 'SHIELD ON!', '#10b981');
              } else if (item.type === 'bomb') {
                const r = 3;
                let bombCaptured = 0;
                for (let dy = -r; dy <= r; dy++) {
                  for (let dx = -r; dx <= r; dx++) {
                    const bx = gx + dx;
                    const by = gy + dy;
                    if (bx >= 0 && bx < MAP_GRID && by >= 0 && by < MAP_GRID) {
                      s.grid[by * MAP_GRID + bx] = char.id;
                      bombCaptured++;
                    }
                  }
                }
                char.score += bombCaptured * 10;
                if (char.isPlayer) {
                  sound.playPaperCapture(bombCaptured);
                  addFloatingText(char.x, char.y - 20, `TERRITORY BOMB! +${bombCaptured}`, '#f43f5e');
                }
              } else if (item.type === 'star') {
                char.score += 300;
                if (char.isPlayer) {
                  setScore((prev) => prev + 300);
                  addFloatingText(char.x, char.y - 20, '+300 BONUS!', '#fbbf24');
                }
              }
            }
          }

          // トレイル衝突判定
          const hitTrailOwnerId = s.trailGrid[cellIdx];
          if (hitTrailOwnerId > 0) {
            const hitChar = s.characters.find((c) => c.id === hitTrailOwnerId);
            if (hitChar && hitChar.isAlive) {
              if (hitChar.id === char.id) {
                killCharacter(char, null);
                continue;
              } else {
                if (hitChar.hasShield) {
                  hitChar.hasShield = false;
                  createParticles(hitChar.x, hitChar.y, '#38bdf8', 25, 5);
                  if (hitChar.isPlayer) addFloatingText(hitChar.x, hitChar.y - 25, 'SHIELD BROKEN!', '#38bdf8');
                } else {
                  killCharacter(hitChar, char);
                }
              }
            }
          }

          if (!isOwnTerritory) {
            const lastTrail = char.trail[char.trail.length - 1];
            if (!lastTrail || lastTrail.x !== gx || lastTrail.y !== gy) {
              char.trail.push({ x: gx, y: gy });
              s.trailGrid[cellIdx] = char.id;
            }
          } else {
            if (char.trail.length > 0) {
              captureTerritory(char);
            }
          }
        }

        const counts = new Uint32Array(s.characters.length + 2);
        const totalTiles = MAP_GRID * MAP_GRID;
        for (let i = 0; i < s.grid.length; i++) {
          const owner = s.grid[i];
          if (owner > 0 && owner < counts.length) {
            counts[owner]++;
          }
        }

        const lBoard = s.characters
          .filter((c) => c.isAlive)
          .map((c) => {
            const count = counts[c.id] || 0;
            const pct = (count / totalTiles) * 100;
            c.territoryCount = count;
            c.territoryPercent = pct;
            return {
              name: c.name,
              percent: pct,
              color: c.color.main,
              isPlayer: c.isPlayer,
              kills: c.kills,
            };
          })
          .sort((a, b) => b.percent - a.percent);

        setLeaderboard(lBoard);

        const playerChar = s.characters.find((c) => c.isPlayer);
        if (playerChar && playerChar.isAlive) {
          setTerritoryPercent(playerChar.territoryPercent);
          setMaxPercent((prev) => Math.max(prev, playerChar.territoryPercent));

          if (playerChar.territoryPercent >= 75) {
            setGameState('victory');
            updateRecords(playerChar.score + 5000, playerChar.kills, playerChar.territoryPercent);
          }
        }

        if (playerChar && playerChar.isAlive) {
          s.camera.x += (playerChar.x - s.camera.x) * 0.1;
          s.camera.y += (playerChar.y - s.camera.y) * 0.1;
        }

        if (s.screenShake > 0) {
          s.screenShake *= 0.9;
          if (s.screenShake < 0.2) s.screenShake = 0;
        }

        for (let i = s.particles.length - 1; i >= 0; i--) {
          const p = s.particles[i];
          p.x += p.vx;
          p.y += p.vy;
          p.vx *= 0.95;
          p.vy *= 0.95;
          p.life++;
          p.alpha = 1 - p.life / p.maxLife;
          if (p.life >= p.maxLife) {
            s.particles.splice(i, 1);
          }
        }

        for (let i = s.floatingTexts.length - 1; i >= 0; i--) {
          const ft = s.floatingTexts[i];
          ft.y -= 0.8;
          ft.opacity -= 0.02;
          ft.scale = Math.max(1.0, ft.scale - 0.01);
          if (ft.opacity <= 0) {
            s.floatingTexts.splice(i, 1);
          }
        }
      }

      renderGame();
      renderMinimap();

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [gameState, botDifficulty]);

  // レンダリング (メインCanvas)
  const renderGame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const s = stateRef.current;
    const width = canvas.width;
    const height = canvas.height;

    ctx.fillStyle = isDark ? '#090d16' : '#f1f5f9';
    ctx.fillRect(0, 0, width, height);

    ctx.save();

    if (s.screenShake > 0) {
      const shakeX = (Math.random() - 0.5) * s.screenShake;
      const shakeY = (Math.random() - 0.5) * s.screenShake;
      ctx.translate(shakeX, shakeY);
    }

    ctx.translate(width / 2 - s.camera.x, height / 2 - s.camera.y);

    // 1. ワールド外枠 & 背景
    ctx.fillStyle = isDark ? '#0f172a' : '#ffffff';
    ctx.fillRect(0, 0, WORLD_SIZE, WORLD_SIZE);

    const viewLeft = Math.max(0, Math.floor((s.camera.x - width / 2) / CELL_SIZE));
    const viewRight = Math.min(MAP_GRID, Math.ceil((s.camera.x + width / 2) / CELL_SIZE));
    const viewTop = Math.max(0, Math.floor((s.camera.y - height / 2) / CELL_SIZE));
    const viewBottom = Math.min(MAP_GRID, Math.ceil((s.camera.y + height / 2) / CELL_SIZE));

    ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = viewLeft; x <= viewRight; x++) {
      ctx.moveTo(x * CELL_SIZE, viewTop * CELL_SIZE);
      ctx.lineTo(x * CELL_SIZE, viewBottom * CELL_SIZE);
    }
    for (let y = viewTop; y <= viewBottom; y++) {
      ctx.moveTo(viewLeft * CELL_SIZE, y * CELL_SIZE);
      ctx.lineTo(viewRight * CELL_SIZE, y * CELL_SIZE);
    }
    ctx.stroke();

    // 2. 領地の描画
    for (let gy = viewTop; gy < viewBottom; gy++) {
      for (let gx = viewLeft; gx < viewRight; gx++) {
        const owner = s.grid[gy * MAP_GRID + gx];
        if (owner > 0) {
          const char = s.characters.find((c) => c.id === owner);
          if (char) {
            ctx.fillStyle = char.color.territory;
            ctx.fillRect(gx * CELL_SIZE, gy * CELL_SIZE, CELL_SIZE, CELL_SIZE);
          }
        }
      }
    }

    // 3. トレイルの描画
    for (const char of s.characters) {
      if (!char.isAlive || char.trail.length === 0) continue;

      ctx.fillStyle = char.color.trail;
      ctx.shadowColor = char.color.glow;
      ctx.shadowBlur = 8;

      for (const p of char.trail) {
        if (p.x >= viewLeft && p.x <= viewRight && p.y >= viewTop && p.y <= viewBottom) {
          ctx.fillRect(p.x * CELL_SIZE + 2, p.y * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);
        }
      }
      ctx.shadowBlur = 0;
    }

    // 4. マップ境界線
    ctx.strokeStyle = isDark ? '#ef4444' : '#dc2626';
    ctx.lineWidth = 6;
    ctx.strokeRect(0, 0, WORLD_SIZE, WORLD_SIZE);

    // 5. アイテムの描画
    for (const item of s.items) {
      ctx.save();
      ctx.translate(item.x, item.y);
      const pulse = 1 + Math.sin(performance.now() * 0.008) * 0.15;
      ctx.scale(pulse, pulse);

      ctx.shadowBlur = 12;
      if (item.type === 'speed') {
        ctx.shadowColor = '#38bdf8';
        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⚡', 0, 1);
      } else if (item.type === 'shield') {
        ctx.shadowColor = '#10b981';
        ctx.fillStyle = '#059669';
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🛡️', 0, 1);
      } else if (item.type === 'bomb') {
        ctx.shadowColor = '#f43f5e';
        ctx.fillStyle = '#e11d48';
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('💣', 0, 1);
      } else if (item.type === 'star') {
        ctx.shadowColor = '#fbbf24';
        ctx.fillStyle = '#d97706';
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⭐', 0, 1);
      }
      ctx.restore();
    }

    // 6. キャラクター描画
    for (const char of s.characters) {
      if (!char.isAlive) continue;

      ctx.save();
      ctx.translate(char.x, char.y);

      if (char.hasShield) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(0, 0, CELL_SIZE * 0.9, 0, Math.PI * 2);
        ctx.stroke();
      }

      const cubeSize = CELL_SIZE * 0.85;
      ctx.fillStyle = char.color.main;
      ctx.shadowColor = char.color.glow;
      ctx.shadowBlur = char.isPlayer ? 14 : 8;

      const radius = 6;
      ctx.beginPath();
      ctx.roundRect(-cubeSize / 2, -cubeSize / 2, cubeSize, cubeSize, radius);
      ctx.fill();

      ctx.strokeStyle = char.color.border;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      let eyeDx = 0;
      let eyeDy = 0;
      if (char.dir === 'UP') eyeDy = -3;
      if (char.dir === 'DOWN') eyeDy = 3;
      if (char.dir === 'LEFT') eyeDx = -3;
      if (char.dir === 'RIGHT') eyeDx = 3;

      ctx.beginPath();
      ctx.arc(-4 + eyeDx, -2 + eyeDy, 3, 0, Math.PI * 2);
      ctx.arc(4 + eyeDx, -2 + eyeDy, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(-4 + eyeDx * 1.5, -2 + eyeDy * 1.5, 1.5, 0, Math.PI * 2);
      ctx.arc(4 + eyeDx * 1.5, -2 + eyeDy * 1.5, 1.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = isDark ? '#ffffff' : '#0f172a';
      ctx.fillText(char.name, 0, -cubeSize / 2 - 8);

      const isTop1 = s.characters
        .filter((c) => c.isAlive)
        .sort((a, b) => b.territoryPercent - a.territoryPercent)[0]?.id === char.id;

      if (isTop1) {
        ctx.font = '14px sans-serif';
        ctx.fillText('👑', 0, -cubeSize / 2 - 20);
      }

      ctx.restore();
    }

    // 7. パーティクル
    for (const p of s.particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 8. 浮遊テキスト
    for (const ft of s.floatingTexts) {
      ctx.save();
      ctx.globalAlpha = ft.opacity;
      ctx.font = `bold ${Math.round(14 * ft.scale)}px sans-serif`;
      ctx.fillStyle = ft.color;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.textAlign = 'center';
      ctx.strokeText(ft.text, ft.x, ft.y);
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }

    ctx.restore();
  };

  // ミニマップ描画
  const renderMinimap = () => {
    const canvas = minimapCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const s = stateRef.current;
    const size = canvas.width;
    const scale = size / MAP_GRID;

    ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.85)';
    ctx.fillRect(0, 0, size, size);

    for (let gy = 0; gy < MAP_GRID; gy += 2) {
      for (let gx = 0; gx < MAP_GRID; gx += 2) {
        const owner = s.grid[gy * MAP_GRID + gx];
        if (owner > 0) {
          const char = s.characters.find((c) => c.id === owner);
          if (char) {
            ctx.fillStyle = char.color.main;
            ctx.fillRect(gx * scale, gy * scale, scale * 2, scale * 2);
          }
        }
      }
    }

    for (const char of s.characters) {
      if (!char.isAlive) continue;
      const mx = (char.x / WORLD_SIZE) * size;
      const my = (char.y / WORLD_SIZE) * size;

      ctx.fillStyle = char.isPlayer ? '#ffffff' : char.color.main;
      ctx.beginPath();
      ctx.arc(mx, my, char.isPlayer ? 4 : 2.5, 0, Math.PI * 2);
      ctx.fill();

      if (char.isPlayer) {
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, size, size);
  };

  // キーボード操作
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const s = stateRef.current;
      const player = s.characters.find((c) => c.isPlayer && c.isAlive);
      if (!player) return;

      const opposites: Record<Direction, Direction> = {
        UP: 'DOWN',
        DOWN: 'UP',
        LEFT: 'RIGHT',
        RIGHT: 'LEFT',
      };

      let newDir: Direction | null = null;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') newDir = 'UP';
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') newDir = 'DOWN';
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') newDir = 'LEFT';
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') newDir = 'RIGHT';

      if (newDir && newDir !== opposites[player.dir]) {
        player.nextDir = newDir;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // マウス移動・クリック操作
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (gameState !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    const dx = clickX - centerX;
    const dy = clickY - centerY;

    const s = stateRef.current;
    const player = s.characters.find((c) => c.isPlayer && c.isAlive);
    if (!player) return;

    const opposites: Record<Direction, Direction> = {
      UP: 'DOWN',
      DOWN: 'UP',
      LEFT: 'RIGHT',
      RIGHT: 'LEFT',
    };

    let newDir: Direction;
    if (Math.abs(dx) > Math.abs(dy)) {
      newDir = dx > 0 ? 'RIGHT' : 'LEFT';
    } else {
      newDir = dy > 0 ? 'DOWN' : 'UP';
    }

    if (newDir !== opposites[player.dir]) {
      player.nextDir = newDir;
    }
  };

  // タッチ / スワイプ操作
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 20) {
      const s = stateRef.current;
      const player = s.characters.find((c) => c.isPlayer && c.isAlive);
      if (!player) return;

      const opposites: Record<Direction, Direction> = {
        UP: 'DOWN',
        DOWN: 'UP',
        LEFT: 'RIGHT',
        RIGHT: 'LEFT',
      };

      let newDir: Direction;
      if (Math.abs(dx) > Math.abs(dy)) {
        newDir = dx > 0 ? 'RIGHT' : 'LEFT';
      } else {
        newDir = dy > 0 ? 'DOWN' : 'UP';
      }

      if (newDir !== opposites[player.dir]) {
        player.nextDir = newDir;
      }
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    }
  };

  // Canvas リサイズ（フルスクリーン時は画面いっぱい）
  useEffect(() => {
    const updateSize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      if (isFullscreen) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      } else {
        const parentWidth = containerRef.current?.clientWidth || 800;
        canvas.width = Math.min(860, parentWidth);
        canvas.height = Math.min(600, window.innerHeight * 0.7);
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [isFullscreen]);

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col items-center justify-center w-full select-none transition-all ${
        isFullscreen ? 'h-screen w-screen p-0 bg-slate-950' : 'max-w-5xl mx-auto'
      }`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
    >
      {/* ゲームプレイ画面 */}
      <div
        className={`relative w-full flex flex-col items-center justify-center overflow-hidden border shadow-2xl bg-slate-950 ${
          isFullscreen ? 'h-screen rounded-none border-none' : 'rounded-3xl border-slate-800/80'
        }`}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          className={`w-full h-full block cursor-crosshair ${isFullscreen ? 'rounded-none' : 'rounded-3xl'}`}
        />

        {/* 画面内オーバーレイUI (HUD) */}
        {gameState === 'playing' && (
          <>
            {/* 左上: 占有率・スコア・キル数 */}
            <div className="absolute top-4 left-4 z-20 flex flex-col gap-2 pointer-events-none">
              <div
                className={`flex items-center gap-3 px-4 py-2 rounded-2xl backdrop-blur-md border shadow-lg ${
                  isDark
                    ? 'bg-slate-900/80 border-slate-700/60 text-white'
                    : 'bg-white/90 border-slate-200 text-slate-900'
                }`}
              >
                <div className="flex items-center gap-1.5 font-black text-lg text-emerald-400">
                  <Crown className="w-5 h-5 text-amber-400" />
                  <span>{territoryPercent.toFixed(1)}%</span>
                </div>
                <div className="h-4 w-px bg-slate-700/50" />
                <div className="text-xs font-mono font-bold">
                  <span className="text-slate-400">SCORE:</span> {score.toLocaleString()}
                </div>
                <div className="h-4 w-px bg-slate-700/50" />
                <div className="flex items-center gap-1 text-xs font-mono font-bold text-rose-400">
                  <Swords className="w-3.5 h-3.5" />
                  <span>{kills}</span>
                </div>
              </div>
            </div>

            {/* 右上: リアルタイムリーダーボード */}
            <div className="absolute top-4 right-4 z-20 hidden sm:flex flex-col gap-1 w-48 pointer-events-none">
              <div
                className={`p-3 rounded-2xl backdrop-blur-md border shadow-lg text-xs ${
                  isDark
                    ? 'bg-slate-900/80 border-slate-700/60 text-white'
                    : 'bg-white/90 border-slate-200 text-slate-900'
                }`}
              >
                <div className="flex items-center justify-between font-bold mb-2 pb-1 border-b border-slate-700/40 text-amber-400">
                  <span className="flex items-center gap-1">
                    <Trophy className="w-3.5 h-3.5" />
                    RANKING
                  </span>
                  <span>占有率</span>
                </div>
                {leaderboard.slice(0, 5).map((item, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between py-0.5 px-1.5 rounded ${
                      item.isPlayer ? 'bg-indigo-500/20 font-black text-indigo-300' : 'text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="font-mono text-[10px] text-slate-400">#{idx + 1}</span>
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="truncate">{item.name}</span>
                    </div>
                    <span className="font-mono font-bold text-[11px] shrink-0">
                      {item.percent.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 左下: キルフィード */}
            <div className="absolute bottom-4 left-4 z-20 flex flex-col gap-1 pointer-events-none">
              {killFeed.map((item) => (
                <div
                  key={item.id}
                  className="animate-in fade-in slide-in-from-left duration-300 px-3 py-1 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-800 text-[11px] font-bold text-white shadow-md flex items-center gap-1.5"
                >
                  <span style={{ color: item.killerColor }}>{item.killer}</span>
                  <span className="text-slate-400">eliminated</span>
                  <span className="text-rose-400">{item.victim}</span>
                </div>
              ))}
            </div>

            {/* 右下: レーダーミニマップ */}
            <div className="absolute bottom-4 right-4 z-20 pointer-events-none rounded-2xl overflow-hidden border border-slate-700/60 shadow-xl">
              <canvas ref={minimapCanvasRef} width={100} height={100} className="block" />
            </div>

            {/* スマホ用バーチャルD-Pad操作ボタン */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1 sm:hidden">
              <button
                onClick={() => {
                  const s = stateRef.current;
                  const p = s.characters.find((c) => c.isPlayer && c.isAlive);
                  if (p && p.dir !== 'DOWN') p.nextDir = 'UP';
                }}
                className="w-12 h-12 rounded-xl bg-slate-800/80 backdrop-blur-md border border-slate-600 text-white font-bold flex items-center justify-center active:scale-95 shadow-lg"
              >
                ▲
              </button>
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    const s = stateRef.current;
                    const p = s.characters.find((c) => c.isPlayer && c.isAlive);
                    if (p && p.dir !== 'RIGHT') p.nextDir = 'LEFT';
                  }}
                  className="w-12 h-12 rounded-xl bg-slate-800/80 backdrop-blur-md border border-slate-600 text-white font-bold flex items-center justify-center active:scale-95 shadow-lg"
                >
                  ◀
                </button>
                <button
                  onClick={() => {
                    const s = stateRef.current;
                    const p = s.characters.find((c) => c.isPlayer && c.isAlive);
                    if (p && p.dir !== 'LEFT') p.nextDir = 'RIGHT';
                  }}
                  className="w-12 h-12 rounded-xl bg-slate-800/80 backdrop-blur-md border border-slate-600 text-white font-bold flex items-center justify-center active:scale-95 shadow-lg"
                >
                  ▶
                </button>
              </div>
              <button
                onClick={() => {
                  const s = stateRef.current;
                  const p = s.characters.find((c) => c.isPlayer && c.isAlive);
                  if (p && p.dir !== 'UP') p.nextDir = 'DOWN';
                }}
                className="w-12 h-12 rounded-xl bg-slate-800/80 backdrop-blur-md border border-slate-600 text-white font-bold flex items-center justify-center active:scale-95 shadow-lg"
              >
                ▼
              </button>
            </div>
          </>
        )}

        {/* タイトル画面 */}
        {gameState === 'title' && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md p-6 text-center animate-in fade-in duration-300">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-bold mb-3">
              <Crown className="w-4 h-4 text-amber-400" />
              Territory Conquest Action
            </div>

            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-2 bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
              ペーパー.io
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
              自分の領地を広げてマップを制覇せよ！領地外で敵の軌跡（トレイル）を切って撃破！
            </p>

            {/* スキン選択 */}
            <div className="w-full max-w-sm mb-5">
              <div className="text-xs font-bold text-slate-300 mb-2">プレイヤースキン</div>
              <div className="grid grid-cols-5 gap-2">
                {PLAYER_SKINS.map((skin, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedSkin(idx)}
                    className={`h-10 rounded-xl border-2 transition-all flex items-center justify-center ${
                      selectedSkin === idx
                        ? 'border-white scale-105 shadow-lg'
                        : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: skin.main }}
                  >
                    {selectedSkin === idx && <Crown className="w-4 h-4 text-white" />}
                  </button>
                ))}
              </div>
            </div>

            {/* 難易度 & ボット人数設定 */}
            <div className="flex flex-wrap items-center justify-center gap-4 mb-6">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">Bot難易度:</span>
                {(['easy', 'normal', 'hard'] as const).map((diff) => (
                  <button
                    key={diff}
                    onClick={() => setBotDifficulty(diff)}
                    className={`px-2.5 py-1 rounded-lg font-bold border transition-colors ${
                      botDifficulty === diff
                        ? 'bg-indigo-600 border-indigo-500 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    {diff.toUpperCase()}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">Bot人数:</span>
                {[4, 6, 8].map((count) => (
                  <button
                    key={count}
                    onClick={() => setBotCount(count)}
                    className={`px-2.5 py-1 rounded-lg font-bold border transition-colors ${
                      botCount === count
                        ? 'bg-indigo-600 border-indigo-500 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    {count}人
                  </button>
                ))}
              </div>
            </div>

            {/* ハイスコア・レコード */}
            <div className="flex items-center gap-6 mb-6 text-xs font-mono">
              <div className="flex flex-col items-center">
                <span className="text-slate-400 text-[10px]">MAX PERCENT</span>
                <span className="text-emerald-400 font-bold text-sm">{maxPercent.toFixed(1)}%</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-slate-400 text-[10px]">HIGH SCORE</span>
                <span className="text-amber-400 font-bold text-sm">{highScore.toLocaleString()}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-slate-400 text-[10px]">MAX KILLS</span>
                <span className="text-rose-400 font-bold text-sm">{highKills}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={initGame}
                className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-sm tracking-wider shadow-lg shadow-emerald-500/25 active:scale-95 transition-all"
              >
                <Play className="w-5 h-5 fill-current" />
                ゲームスタート
              </button>
              <button
                onClick={onBackToHub}
                className="px-5 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 transition-colors"
              >
                戻る
              </button>
            </div>
          </div>
        )}

        {/* ゲームオーバー画面 */}
        {gameState === 'gameover' && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-md p-6 text-center animate-in fade-in zoom-in-95 duration-300">
            <div className="text-rose-500 font-black text-3xl sm:text-4xl mb-2 tracking-wide">
              ELIMINATED
            </div>
            <p className="text-xs text-slate-400 mb-6">トレイルを切断されたか外壁に衝突しました</p>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 grid grid-cols-3 gap-4 mb-6 min-w-[280px]">
              <div>
                <div className="text-[10px] text-slate-400">最終占有率</div>
                <div className="text-emerald-400 font-bold font-mono text-base">
                  {territoryPercent.toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">スコア</div>
                <div className="text-amber-400 font-bold font-mono text-base">
                  {score.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">撃破数</div>
                <div className="text-rose-400 font-bold font-mono text-base">{kills}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={initGame}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs shadow-lg shadow-emerald-500/25 active:scale-95 transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                もう一度プレイ
              </button>
              <button
                onClick={() => setGameState('title')}
                className="px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 transition-colors"
              >
                タイトルへ
              </button>
            </div>
          </div>
        )}

        {/* 完全制覇ビクトリー画面 */}
        {gameState === 'victory' && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md p-6 text-center animate-in fade-in zoom-in-95 duration-300">
            <Crown className="w-12 h-12 text-amber-400 mb-2 animate-bounce" />
            <div className="text-amber-400 font-black text-3xl sm:text-4xl mb-2 tracking-wide">
              VICTORY!
            </div>
            <p className="text-xs text-slate-300 mb-6">マップの大部分を制覇し完全勝利を達成しました！</p>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 grid grid-cols-3 gap-4 mb-6 min-w-[280px]">
              <div>
                <div className="text-[10px] text-slate-400">最終占有率</div>
                <div className="text-emerald-400 font-bold font-mono text-base">
                  {territoryPercent.toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">スコア</div>
                <div className="text-amber-400 font-bold font-mono text-base">
                  {(score + 5000).toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">撃破数</div>
                <div className="text-rose-400 font-bold font-mono text-base">{kills}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={initGame}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/25 active:scale-95 transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                もう一度プレイ
              </button>
              <button
                onClick={() => setGameState('title')}
                className="px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 transition-colors"
              >
                タイトルへ
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 下部コントロール＆操作説明バー (フルスクリーンでない時) */}
      {!isFullscreen && (
        <div className="w-full mt-4 flex flex-wrap items-center justify-between gap-3 text-xs">
          <button
            onClick={onBackToHub}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold border transition-colors ${
              isDark
                ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            ゲーム一覧に戻る
          </button>

          <div
            className={`flex items-center gap-3 px-4 py-2 rounded-xl border text-[11px] font-medium ${
              isDark
                ? 'bg-slate-900/60 border-slate-800 text-slate-400'
                : 'bg-slate-100 border-slate-200 text-slate-600'
            }`}
          >
            <span>【操作】 矢印キー / WASD / クリック / スワイプ</span>
            <span className="hidden sm:inline">・ 領地に戻って陣取り</span>
            <span className="hidden sm:inline">・ 敵の軌跡を踏んでキル</span>
          </div>

          <button
            onClick={() => {
              const muted = sound.toggleMute();
              setIsMuted(muted);
            }}
            className={`p-2 rounded-xl border transition-colors ${
              isDark
                ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
            title={isMuted ? 'ミュート解除' : 'ミュート'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      )}
    </div>
  );
};
