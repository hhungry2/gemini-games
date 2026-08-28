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
  Zap,
  Sparkles,
  Heart,
  Award,
  Flame,
  ShieldAlert,
} from 'lucide-react';

const HIGH_SCORE_KEY = 'paperio_high_score';
const HIGH_KILLS_KEY = 'paperio_high_kills';
const MAX_PERCENT_KEY = 'paperio_max_percent';

interface PaperIoGameProps {
  onBackToHub: () => void;
  isDark: boolean;
  isFullscreen?: boolean;
}

type GameMode = 'classic' | 'royale' | 'rush';
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

interface Position {
  x: number;
  y: number;
}

interface Item {
  id: number;
  x: number;
  y: number;
  type: 'speed' | 'shield' | 'bomb' | 'star' | 'ghost' | 'freeze' | 'magnet';
  duration: number;
}

interface Character {
  id: number;
  name: string;
  isPlayer: boolean;
  x: number;
  y: number;
  lastGridX: number;
  lastGridY: number;
  dir: Direction;
  nextDir: Direction;
  speed: number;
  baseSpeed: number;
  stamina: number;
  isBoosting: boolean;
  lives: number; // 残機 (初期値3)
  invincibleTimer: number; // リスポーン無敵点滅タイマー
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
  ghostTimer: number;
  freezeTimer: number;
  magnetTimer: number;
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

interface Shockwave {
  id: number;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
}

interface Confetti {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  rotSpeed: number;
}

interface KillFeedItem {
  id: number;
  killer: string;
  victim: string;
  killerColor: string;
  isBounty?: boolean;
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
  {
    name: 'ドラゴンファイア (Crimson)',
    main: '#e11d48',
    trail: '#fb7185',
    territory: 'rgba(225, 29, 72, 0.45)',
    border: '#be123c',
    glow: 'rgba(225, 29, 72, 0.7)',
  },
  {
    name: 'コズミックギャラクシー (Galaxy)',
    main: '#6366f1',
    trail: '#818cf8',
    territory: 'rgba(99, 102, 241, 0.45)',
    border: '#4f46e5',
    glow: 'rgba(99, 102, 241, 0.7)',
  },
  {
    name: 'ゴールデンキング (Royalty)',
    main: '#eab308',
    trail: '#fde047',
    territory: 'rgba(234, 179, 8, 0.5)',
    border: '#ca8a04',
    glow: 'rgba(234, 179, 8, 0.8)',
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
  {
    name: 'Phantom Dark',
    main: '#64748b',
    trail: '#94a3b8',
    territory: 'rgba(100, 116, 139, 0.4)',
    border: '#475569',
    glow: 'rgba(100, 116, 139, 0.5)',
  },
  {
    name: 'Hyper Magenta',
    main: '#d946ef',
    trail: '#f0abfc',
    territory: 'rgba(217, 70, 239, 0.4)',
    border: '#c026d3',
    glow: 'rgba(217, 70, 239, 0.5)',
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

  // ゲーム設定・状態
  const [gameState, setGameState] = useState<'title' | 'playing' | 'gameover' | 'victory'>('title');
  const [gameMode, setGameMode] = useState<GameMode>('classic');
  const [selectedSkin, setSelectedSkin] = useState(0);
  const [botCount, setBotCount] = useState(6);
  const [botDifficulty, setBotDifficulty] = useState<'easy' | 'normal' | 'hard'>('normal');

  // スコア・統計情報
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [kills, setKills] = useState(0);
  const [highKills, setHighKills] = useState(0);
  const [territoryPercent, setTerritoryPercent] = useState(0);
  const [maxPercent, setMaxPercent] = useState(0);
  const [playerLives, setPlayerLives] = useState(3);
  const [maxStreak, setMaxStreak] = useState(0);
  const [aliveCount, setAliveCount] = useState(0);
  const [stamina, setStamina] = useState(100);
  const [streakBanner, setStreakBanner] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<
    Array<{ id: number; name: string; percent: number; color: string; isPlayer: boolean; kills: number; isKing: boolean }>
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
    shockwaves: [] as Shockwave[],
    confetti: [] as Confetti[],
    floatingTexts: [] as FloatingText[],
    killFeedList: [] as KillFeedItem[],
    camera: { x: WORLD_SIZE / 2, y: WORLD_SIZE / 2 },
    nextItemId: 1,
    nextTextId: 1,
    nextKillId: 1,
    nextWaveId: 1,
    itemSpawnTimer: 0,
    screenShake: 0,
    lastTime: performance.now(),
    isGameActive: false,
    isBoosting: false,
    // キルストリーク管理
    lastKillTime: 0,
    currentStreak: 0,
    highestStreak: 0,
    // バトルロイヤル用デンジャーゾーン
    zoneRadius: MAP_GRID / 2,
    zoneCenter: { x: MAP_GRID / 2, y: MAP_GRID / 2 },
    zoneTimer: 0,
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
    let isRecord = false;
    setHighScore((prev) => {
      if (finalScore > prev) {
        isRecord = true;
        localStorage.setItem(HIGH_SCORE_KEY, finalScore.toString());
        return finalScore;
      }
      return prev;
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
    setIsNewRecord(isRecord);
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
      scale: 1.3,
    });
  };

  // 衝撃波（ショックウェーブ）発生
  const createShockwave = (x: number, y: number, color: string, maxRadius = 120) => {
    const s = stateRef.current;
    s.shockwaves.push({
      id: s.nextWaveId++,
      x,
      y,
      radius: 5,
      maxRadius,
      color,
      alpha: 1.0,
    });
  };

  // 紙吹雪（Confetti）発生
  const spawnConfetti = (count = 60) => {
    const s = stateRef.current;
    const colors = ['#f43f5e', '#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#fbbf24'];
    for (let i = 0; i < count; i++) {
      s.confetti.push({
        x: Math.random() * (canvasRef.current?.width || 800),
        y: -10 - Math.random() * 50,
        vx: (Math.random() - 0.5) * 4,
        vy: Math.random() * 3 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 4,
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 10,
      });
    }
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

  // 初期スポーン領地の作成
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
    s.shockwaves = [];
    s.confetti = [];
    s.floatingTexts = [];
    s.killFeedList = [];
    s.isGameActive = true;
    s.screenShake = 0;
    s.currentStreak = 0;
    s.highestStreak = 0;
    s.lastKillTime = 0;
    s.zoneRadius = MAP_GRID / 2;
    s.zoneTimer = 0;

    const chars: Character[] = [];
    const speedMult = gameMode === 'rush' ? 1.45 : 1.0;

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
      lastGridX: pStartX,
      lastGridY: pStartY,
      dir: 'UP',
      nextDir: 'UP',
      speed: 3.2 * speedMult,
      baseSpeed: 3.2 * speedMult,
      stamina: 100,
      isBoosting: false,
      lives: 3, // ライフ3
      invincibleTimer: 0,
      color: playerSkin,
      trail: [],
      isAlive: true,
      territoryCount: 25,
      territoryPercent: 0.3,
      kills: 0,
      score: 0,
      respawnTimer: 0,
      hasShield: false,
      ghostTimer: 0,
      freezeTimer: 0,
      magnetTimer: 0,
      speedBoostTimer: 0,
    });

    // ボット作成
    const baseBotSpeed = (botDifficulty === 'easy' ? 2.6 : botDifficulty === 'hard' ? 3.4 : 3.0) * speedMult;

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
        lastGridX: bX,
        lastGridY: bY,
        dir: ['UP', 'DOWN', 'LEFT', 'RIGHT'][Math.floor(Math.random() * 4)] as Direction,
        nextDir: 'UP',
        speed: baseBotSpeed,
        baseSpeed: baseBotSpeed,
        stamina: 100,
        isBoosting: false,
        lives: 1,
        invincibleTimer: 0,
        color: bConfig,
        trail: [],
        isAlive: true,
        territoryCount: 25,
        territoryPercent: 0.3,
        kills: 0,
        score: 0,
        respawnTimer: 0,
        hasShield: false,
        ghostTimer: 0,
        freezeTimer: 0,
        magnetTimer: 0,
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
    setPlayerLives(3);
    setMaxStreak(0);
    setAliveCount(chars.length);
    setStamina(100);
    setStreakBanner(null);
    setIsNewRecord(false);
    setGameState('playing');

    // BGM スタート
    sound.startPaperBgm();
  };

  // アイテムスポーン
  const spawnRandomItem = () => {
    const s = stateRef.current;
    if (s.items.length >= 10) return;

    const types: Array<'speed' | 'shield' | 'bomb' | 'star' | 'ghost' | 'freeze' | 'magnet'> = [
      'speed', 'shield', 'bomb', 'star', 'ghost', 'freeze', 'magnet'
    ];
    const type = types[Math.floor(Math.random() * types.length)];
    const gx = Math.floor(4 + Math.random() * (MAP_GRID - 8));
    const gy = Math.floor(4 + Math.random() * (MAP_GRID - 8));

    s.items.push({
      id: s.nextItemId++,
      x: (gx + 0.5) * CELL_SIZE,
      y: (gy + 0.5) * CELL_SIZE,
      type,
      duration: 650,
    });
  };

  // 囲み込みキャプチャアルゴリズム
  const captureTerritory = (char: Character) => {
    const s = stateRef.current;
    const charId = char.id;

    // 1. トレイル上のセルを領地化
    let capturedFromTrail = 0;
    let sumX = 0;
    let sumY = 0;

    for (const p of char.trail) {
      if (p.x >= 0 && p.x < MAP_GRID && p.y >= 0 && p.y < MAP_GRID) {
        const idx = p.y * MAP_GRID + p.x;
        if (s.grid[idx] !== charId) {
          s.grid[idx] = charId;
          capturedFromTrail++;
          sumX += (p.x + 0.5) * CELL_SIZE;
          sumY += (p.y + 0.5) * CELL_SIZE;
        }
        s.trailGrid[idx] = 0;
      }
    }
    char.trail = [];

    // 2. マップ外周から非所有セルに対して Flood Fill
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

    // 3. 囲まれた内側のセルをすべて領地化
    let newlyCaptured = 0;
    for (let y = 0; y < MAP_GRID; y++) {
      for (let x = 0; x < MAP_GRID; x++) {
        const idx = y * MAP_GRID + x;
        if (visited[idx] === 0 && s.grid[idx] !== charId) {
          s.grid[idx] = charId;
          newlyCaptured++;
          sumX += (x + 0.5) * CELL_SIZE;
          sumY += (y + 0.5) * CELL_SIZE;
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
        if (earnedPercent >= 0.2) {
          addFloatingText(char.x, char.y - 20, `+${earnedPercent.toFixed(1)}%`, '#10b981');
        }

        // 大規模キャプチャ時のショックウェーブ演出！
        if (totalCaptured >= 8) {
          const centerX = sumX / totalCaptured;
          const centerY = sumY / totalCaptured;
          createShockwave(centerX, centerY, char.color.trail, Math.min(260, totalCaptured * 8));
          sound.playPaperShockwave();
        }
      }
    }
  };

  // キャラクター死亡＆ライフ減少処理
  const killCharacter = (victim: Character, killer: Character | null) => {
    const s = stateRef.current;

    // プレイヤーにライフが残っている場合：残機を減らして自陣へ即時復活！
    if (victim.isPlayer && victim.lives > 1) {
      victim.lives -= 1;
      setPlayerLives(victim.lives);

      // トレイルのクリア
      for (const p of victim.trail) {
        const idx = p.y * MAP_GRID + p.x;
        if (s.trailGrid[idx] === victim.id) {
          s.trailGrid[idx] = 0;
        }
      }
      victim.trail = [];

      // 自陣の重心セルを見つけてリスポーン
      let ownXSum = 0;
      let ownYSum = 0;
      let ownCount = 0;
      for (let y = 0; y < MAP_GRID; y++) {
        for (let x = 0; x < MAP_GRID; x++) {
          if (s.grid[y * MAP_GRID + x] === victim.id) {
            ownXSum += (x + 0.5) * CELL_SIZE;
            ownYSum += (y + 0.5) * CELL_SIZE;
            ownCount++;
          }
        }
      }

      if (ownCount > 0) {
        victim.x = ownXSum / ownCount;
        victim.y = ownYSum / ownCount;
      } else {
        victim.x = WORLD_SIZE / 2;
        victim.y = WORLD_SIZE / 2;
      }

      // 2.5秒間無敵点滅バリア
      victim.invincibleTimer = 150;
      victim.stamina = 100;
      victim.hasShield = false;
      victim.ghostTimer = 0;

      sound.playPaperRespawn();
      s.screenShake = 14;
      createParticles(victim.x, victim.y, '#38bdf8', 35, 6);
      createShockwave(victim.x, victim.y, '#38bdf8', 150);
      addFloatingText(victim.x, victim.y - 35, `❤️ REVIVED! (${victim.lives} LIVES LEFT)`, '#38bdf8');

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
      }
      return;
    }

    // ライフ0 または ボット：完全撃破
    victim.isAlive = false;
    if (victim.isPlayer) {
      setPlayerLives(0);
    }

    // トレイルのクリア
    for (const p of victim.trail) {
      const idx = p.y * MAP_GRID + p.x;
      if (s.trailGrid[idx] === victim.id) {
        s.trailGrid[idx] = 0;
      }
    }
    victim.trail = [];

    // 領地クリア
    for (let i = 0; i < s.grid.length; i++) {
      if (s.grid[i] === victim.id) {
        s.grid[i] = 0;
      }
    }

    createParticles(victim.x, victim.y, victim.color.main, 40, 7);

    // 1位（KING）の判定
    const isVictimKing = s.characters
      .filter((c) => c.isAlive || c.id === victim.id)
      .sort((a, b) => b.territoryPercent - a.territoryPercent)[0]?.id === victim.id;

    if (killer) {
      killer.kills += 1;
      let earnedScore = 500;

      // KING 討伐賞金首ボーナス
      if (isVictimKing && !victim.isPlayer) {
        earnedScore += 1500;
        if (killer.isPlayer) {
          sound.playPaperBounty();
          addFloatingText(victim.x, victim.y - 45, '👑 KING BOUNTY! +1,500', '#f59e0b');
          s.screenShake = 18;
          createParticles(victim.x, victim.y, '#f59e0b', 50, 8);
          createShockwave(victim.x, victim.y, '#f59e0b', 200);
        }
      }

      // プレイヤーのキルストリーク判定
      if (killer.isPlayer) {
        const nowTime = Date.now();
        if (nowTime - s.lastKillTime < 6000) {
          s.currentStreak += 1;
        } else {
          s.currentStreak = 1;
        }
        s.lastKillTime = nowTime;
        s.highestStreak = Math.max(s.highestStreak, s.currentStreak);
        setMaxStreak(s.highestStreak);

        if (s.currentStreak === 2) {
          earnedScore += 250;
          setStreakBanner('🔥 DOUBLE KILL! (+250)');
          sound.playPaperStreak(2);
          setTimeout(() => setStreakBanner(null), 2500);
        } else if (s.currentStreak === 3) {
          earnedScore += 500;
          setStreakBanner('⚡ TRIPLE KILL! (+500)');
          sound.playPaperStreak(3);
          setTimeout(() => setStreakBanner(null), 2500);
        } else if (s.currentStreak >= 4) {
          earnedScore += 1000;
          setStreakBanner('💥 RAMPAGE! (+1,000)');
          sound.playPaperStreak(4);
          setTimeout(() => setStreakBanner(null), 2500);
        } else {
          sound.playPaperKill();
          addFloatingText(victim.x, victim.y - 30, `KILL! +500`, '#fbbf24');
        }

        s.screenShake = Math.max(s.screenShake, 14);
        setKills((prev) => prev + 1);
        setScore((prev) => prev + earnedScore);
      }

      killer.score += earnedScore;

      const feedItem: KillFeedItem = {
        id: s.nextKillId++,
        killer: killer.name,
        victim: victim.name,
        killerColor: killer.color.main,
        isBounty: isVictimKing,
        time: Date.now(),
      };
      s.killFeedList.unshift(feedItem);
      if (s.killFeedList.length > 5) s.killFeedList.pop();
      setKillFeed([...s.killFeedList]);
    }

    if (victim.isPlayer) {
      sound.stopPaperBgm();
      sound.playPaperDie();
      s.screenShake = 20;
      setGameState('gameover');
      updateRecords(victim.score, victim.kills, victim.territoryPercent);
    } else {
      if (gameMode !== 'royale') {
        victim.respawnTimer = 180;
      }
    }
  };

  // ボットのリスポーン
  const respawnBot = (bot: Character) => {
    const bX = Math.floor(6 + Math.random() * (MAP_GRID - 12));
    const bY = Math.floor(6 + Math.random() * (MAP_GRID - 12));

    spawnInitialTerritory(bot.id, bX, bY);
    bot.x = (bX + 0.5) * CELL_SIZE;
    bot.y = (bY + 0.5) * CELL_SIZE;
    bot.lastGridX = bX;
    bot.lastGridY = bY;
    bot.dir = ['UP', 'DOWN', 'LEFT', 'RIGHT'][Math.floor(Math.random() * 4)] as Direction;
    bot.nextDir = bot.dir;
    bot.isAlive = true;
    bot.trail = [];
    bot.hasShield = false;
    bot.ghostTimer = 0;
    bot.freezeTimer = 0;
    bot.magnetTimer = 0;
    bot.speedBoostTimer = 0;
    bot.stamina = 100;
    bot.invincibleTimer = 0;
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

    if (bot.freezeTimer > 0) return;

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
            const targetChar = s.characters.find((c) => c.id === tOwner);
            if (targetChar && targetChar.ghostTimer <= 0 && targetChar.invincibleTimer <= 0) {
              const d = Math.hypot(dx, dy);
              if (d < minTrailDist) {
                minTrailDist = d;
                targetTrailPos = { x: sx, y: sy };
              }
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

      const isMyOldTrail = bot.trail.some((p, idx) => idx < bot.trail.length - 2 && p.x === nx && p.y === ny);
      if (isMyOldTrail) return false;

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
        // バトルロイヤル：デンジャーゾーン縮小
        if (gameMode === 'royale') {
          s.zoneTimer++;
          if (s.zoneTimer > 60) {
            s.zoneRadius = Math.max(12, s.zoneRadius - 0.05);
          }
        }

        // アイテム湧き
        s.itemSpawnTimer++;
        if (s.itemSpawnTimer > (gameMode === 'rush' ? 100 : 160)) {
          s.itemSpawnTimer = 0;
          spawnRandomItem();
        }

        for (let i = s.items.length - 1; i >= 0; i--) {
          s.items[i].duration--;
          if (s.items[i].duration <= 0) {
            s.items.splice(i, 1);
          }
        }

        let aliveTotal = 0;

        for (const char of s.characters) {
          if (!char.isAlive) {
            if (!char.isPlayer && char.respawnTimer > 0 && gameMode !== 'royale') {
              char.respawnTimer--;
              if (char.respawnTimer <= 0) {
                respawnBot(char);
              }
            }
            continue;
          }

          aliveTotal++;

          // バフ・デバフタイマー
          if (char.speedBoostTimer > 0) char.speedBoostTimer--;
          if (char.ghostTimer > 0) char.ghostTimer--;
          if (char.freezeTimer > 0) char.freezeTimer--;
          if (char.magnetTimer > 0) char.magnetTimer--;
          if (char.invincibleTimer > 0) char.invincibleTimer--;

          // スタミナ＆ダッシュ計算
          const currentCellGx = Math.floor(char.x / CELL_SIZE);
          const currentCellGy = Math.floor(char.y / CELL_SIZE);
          const isInOwnTerritory =
            currentCellGx >= 0 &&
            currentCellGx < MAP_GRID &&
            currentCellGy >= 0 &&
            currentCellGy < MAP_GRID &&
            s.grid[currentCellGy * MAP_GRID + currentCellGx] === char.id;

          if (char.isPlayer) {
            if (s.isBoosting && char.stamina > 5) {
              char.isBoosting = true;
              char.stamina = Math.max(0, char.stamina - 0.7);
            } else {
              char.isBoosting = false;
              char.stamina = Math.min(100, char.stamina + (isInOwnTerritory ? 0.8 : 0.25));
            }
            setStamina(Math.round(char.stamina));
          }

          // 実効スピード計算
          let effectiveSpeed = char.baseSpeed;
          if (char.freezeTimer > 0) {
            effectiveSpeed *= 0.5;
          } else {
            if (char.speedBoostTimer > 0) effectiveSpeed *= 1.4;
            if (char.isBoosting) effectiveSpeed *= 1.7;
          }
          char.speed = effectiveSpeed;

          // ダッシュ時のパーティクル
          if (char.isBoosting && Math.random() < 0.4) {
            createParticles(char.x, char.y, char.color.trail, 2, 2);
          }

          if (!char.isPlayer) {
            updateBotAI(char);
          }

          // ★ 方向転換時のグリッド中心スナップ（ラインズレ完全解消！）
          if (char.dir !== char.nextDir) {
            const isTurningVertical = char.nextDir === 'UP' || char.nextDir === 'DOWN';
            const isTurningHorizontal = char.nextDir === 'LEFT' || char.nextDir === 'RIGHT';

            if (isTurningVertical && (char.dir === 'LEFT' || char.dir === 'RIGHT')) {
              char.x = (Math.floor(char.x / CELL_SIZE) + 0.5) * CELL_SIZE;
            } else if (isTurningHorizontal && (char.dir === 'UP' || char.dir === 'DOWN')) {
              char.y = (Math.floor(char.y / CELL_SIZE) + 0.5) * CELL_SIZE;
            }
            char.dir = char.nextDir;
          }

          let vx = 0;
          let vy = 0;
          if (char.dir === 'UP') vy = -char.speed;
          if (char.dir === 'DOWN') vy = char.speed;
          if (char.dir === 'LEFT') vx = -char.speed;
          if (char.dir === 'RIGHT') vx = char.speed;

          char.x += vx;
          char.y += vy;

          // 外壁（マップ境界）衝突処理: 0.5*CELL_SIZE でピタリと壁に沿ってスライド
          const minPos = CELL_SIZE * 0.5;
          const maxPos = WORLD_SIZE - CELL_SIZE * 0.5;

          if (char.x < minPos) {
            char.x = minPos;
            if (char.dir === 'LEFT') char.nextDir = ['UP', 'DOWN'][Math.floor(Math.random() * 2)] as Direction;
          } else if (char.x > maxPos) {
            char.x = maxPos;
            if (char.dir === 'RIGHT') char.nextDir = ['UP', 'DOWN'][Math.floor(Math.random() * 2)] as Direction;
          }

          if (char.y < minPos) {
            char.y = minPos;
            if (char.dir === 'UP') char.nextDir = ['LEFT', 'RIGHT'][Math.floor(Math.random() * 2)] as Direction;
          } else if (char.y > maxPos) {
            char.y = maxPos;
            if (char.dir === 'DOWN') char.nextDir = ['LEFT', 'RIGHT'][Math.floor(Math.random() * 2)] as Direction;
          }

          // バトルロイヤル：デンジャーゾーン外ダメージ判定
          if (gameMode === 'royale') {
            const centerDist = Math.hypot(
              char.x / CELL_SIZE - s.zoneCenter.x,
              char.y / CELL_SIZE - s.zoneCenter.y
            );
            if (centerDist > s.zoneRadius) {
              if (Math.random() < 0.05) {
                createParticles(char.x, char.y, '#ef4444', 3, 2);
                if (char.isPlayer) {
                  s.screenShake = 4;
                  addFloatingText(char.x, char.y - 20, 'DANGER ZONE!', '#ef4444');
                }
              }
              if (Math.random() < 0.02 && char.invincibleTimer <= 0) {
                killCharacter(char, null);
                continue;
              }
            }
          }

          const gx = Math.floor(char.x / CELL_SIZE);
          const gy = Math.floor(char.y / CELL_SIZE);
          const cellIdx = gy * MAP_GRID + gx;
          const isOwnTerritory = s.grid[cellIdx] === char.id;

          // マグネット効果（アイテム引き寄せ）
          if (char.magnetTimer > 0) {
            for (const item of s.items) {
              const mDist = Math.hypot(char.x - item.x, char.y - item.y);
              if (mDist < CELL_SIZE * 6) {
                item.x += (char.x - item.x) * 0.08;
                item.y += (char.y - item.y) * 0.08;
              }
            }
          }

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
                if (char.isPlayer) addFloatingText(char.x, char.y - 20, '⚡ SPEED BOOST!', '#38bdf8');
              } else if (item.type === 'shield') {
                char.hasShield = true;
                if (char.isPlayer) addFloatingText(char.x, char.y - 20, '🛡️ SHIELD ON!', '#10b981');
              } else if (item.type === 'ghost') {
                char.ghostTimer = 240;
                if (char.isPlayer) {
                  sound.playPaperGhost();
                  addFloatingText(char.x, char.y - 20, '👻 GHOST (INVINCIBLE)!', '#c084fc');
                }
              } else if (item.type === 'freeze') {
                for (const other of s.characters) {
                  if (other.id !== char.id && other.isAlive) {
                    other.freezeTimer = 180;
                  }
                }
                if (char.isPlayer) {
                  sound.playPaperFreeze();
                  addFloatingText(char.x, char.y - 20, '❄️ ENEMY FROZEN!', '#38bdf8');
                }
              } else if (item.type === 'magnet') {
                char.magnetTimer = 360;
                if (char.isPlayer) addFloatingText(char.x, char.y - 20, '🧲 MAGNET ON!', '#f43f5e');
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
                  addFloatingText(char.x, char.y - 20, `💣 BOMB CAPTURE! +${bombCaptured}`, '#f43f5e');
                }
              } else if (item.type === 'star') {
                char.score += 300;
                if (char.isPlayer) {
                  setScore((prev) => prev + 300);
                  addFloatingText(char.x, char.y - 20, '⭐ +300 BONUS!', '#fbbf24');
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
                // 自分の過去トレイル（無敵またはゴースト中は自滅しない）
                if (char.ghostTimer <= 0 && char.invincibleTimer <= 0) {
                  const isHittingOldSelfTrail = char.trail.some(
                    (p, idx) => idx < char.trail.length - 3 && p.x === gx && p.y === gy
                  );
                  if (isHittingOldSelfTrail) {
                    killCharacter(char, null);
                    continue;
                  }
                }
              } else {
                // 敵のトレイル切断
                if (hitChar.ghostTimer > 0 || hitChar.invincibleTimer > 0) {
                  if (char.isPlayer) addFloatingText(hitChar.x, hitChar.y - 20, 'BLOCKED!', '#c084fc');
                } else if (hitChar.hasShield) {
                  hitChar.hasShield = false;
                  createParticles(hitChar.x, hitChar.y, '#38bdf8', 25, 5);
                  if (hitChar.isPlayer) addFloatingText(hitChar.x, hitChar.y - 25, 'SHIELD BROKEN!', '#38bdf8');
                } else {
                  killCharacter(hitChar, char);
                }
              }
            }
          }

          // 領地・トレイル更新
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

          char.lastGridX = gx;
          char.lastGridY = gy;
        }

        setAliveCount(aliveTotal);

        // 占有率計算＆リーダーボード更新
        const counts = new Uint32Array(s.characters.length + 2);
        const totalTiles = MAP_GRID * MAP_GRID;
        for (let i = 0; i < s.grid.length; i++) {
          const owner = s.grid[i];
          if (owner > 0 && owner < counts.length) {
            counts[owner]++;
          }
        }

        const sortedAlive = s.characters
          .filter((c) => c.isAlive)
          .map((c) => {
            const count = counts[c.id] || 0;
            const pct = (count / totalTiles) * 100;
            c.territoryCount = count;
            c.territoryPercent = pct;
            return c;
          })
          .sort((a, b) => b.territoryPercent - a.territoryPercent);

        const kingId = sortedAlive[0]?.id;

        const lBoard = sortedAlive.map((c) => ({
          id: c.id,
          name: c.name,
          percent: c.territoryPercent,
          color: c.color.main,
          isPlayer: c.isPlayer,
          kills: c.kills,
          isKing: c.id === kingId,
        }));

        setLeaderboard(lBoard);

        const playerChar = s.characters.find((c) => c.isPlayer);
        if (playerChar && playerChar.isAlive) {
          setTerritoryPercent(playerChar.territoryPercent);
          setMaxPercent((prev) => Math.max(prev, playerChar.territoryPercent));

          // 勝利判定
          if (
            (gameMode === 'classic' && playerChar.territoryPercent >= 75) ||
            (gameMode === 'royale' && aliveTotal === 1) ||
            (gameMode === 'rush' && playerChar.territoryPercent >= 60)
          ) {
            sound.stopPaperBgm();
            sound.playPaperVictory();
            setGameState('victory');
            spawnConfetti(100);
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

        // ショックウェーブ更新
        for (let i = s.shockwaves.length - 1; i >= 0; i--) {
          const w = s.shockwaves[i];
          w.radius += 5;
          w.alpha = 1 - w.radius / w.maxRadius;
          if (w.radius >= w.maxRadius) {
            s.shockwaves.splice(i, 1);
          }
        }

        // 紙吹雪更新
        for (let i = s.confetti.length - 1; i >= 0; i--) {
          const c = s.confetti[i];
          c.x += c.vx;
          c.y += c.vy;
          c.rotation += c.rotSpeed;
          if (c.y > (canvasRef.current?.height || 600) + 20) {
            s.confetti.splice(i, 1);
          }
        }

        // パーティクル更新
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

        // 浮遊テキスト更新
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
    return () => {
      cancelAnimationFrame(animationFrameId);
      sound.stopPaperBgm();
    };
  }, [gameState, botDifficulty, gameMode]);

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

    // バトルロイヤル：縮小ゾーンの描画
    if (gameMode === 'royale') {
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(
        s.zoneCenter.x * CELL_SIZE,
        s.zoneCenter.y * CELL_SIZE,
        s.zoneRadius * CELL_SIZE,
        0,
        Math.PI * 2
      );
      ctx.stroke();
    }

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

      ctx.save();
      if (char.ghostTimer > 0) {
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = '#c084fc';
        ctx.shadowColor = '#c084fc';
      } else {
        ctx.fillStyle = char.color.trail;
        ctx.shadowColor = char.color.glow;
      }
      ctx.shadowBlur = 8;

      for (const p of char.trail) {
        if (p.x >= viewLeft && p.x <= viewRight && p.y >= viewTop && p.y <= viewBottom) {
          ctx.fillRect(p.x * CELL_SIZE + 2, p.y * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);
        }
      }
      ctx.restore();
    }

    // 4. マップ境界線
    ctx.strokeStyle = isDark ? '#ef4444' : '#dc2626';
    ctx.lineWidth = 6;
    ctx.strokeRect(0, 0, WORLD_SIZE, WORLD_SIZE);

    // 5. ショックウェーブ（陣取り波紋）の描画
    for (const w of s.shockwaves) {
      ctx.save();
      ctx.globalAlpha = w.alpha;
      ctx.strokeStyle = w.color;
      ctx.lineWidth = 4;
      ctx.shadowColor = w.color;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(w.x, w.y, w.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 6. アイテムの描画
    for (const item of s.items) {
      ctx.save();
      ctx.translate(item.x, item.y);
      const pulse = 1 + Math.sin(performance.now() * 0.008) * 0.15;
      ctx.scale(pulse, pulse);

      ctx.shadowBlur = 12;
      let icon = '⚡';
      let bgColor = '#0284c7';
      let shadowCol = '#38bdf8';

      if (item.type === 'speed') {
        icon = '⚡';
        bgColor = '#0284c7';
        shadowCol = '#38bdf8';
      } else if (item.type === 'shield') {
        icon = '🛡️';
        bgColor = '#059669';
        shadowCol = '#10b981';
      } else if (item.type === 'ghost') {
        icon = '👻';
        bgColor = '#7c3aed';
        shadowCol = '#c084fc';
      } else if (item.type === 'freeze') {
        icon = '❄️';
        bgColor = '#0284c7';
        shadowCol = '#38bdf8';
      } else if (item.type === 'magnet') {
        icon = '🧲';
        bgColor = '#e11d48';
        shadowCol = '#fb7185';
      } else if (item.type === 'bomb') {
        icon = '💣';
        bgColor = '#e11d48';
        shadowCol = '#f43f5e';
      } else if (item.type === 'star') {
        icon = '⭐';
        bgColor = '#d97706';
        shadowCol = '#fbbf24';
      }

      ctx.shadowColor = shadowCol;
      ctx.fillStyle = bgColor;
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(icon, 0, 1);

      ctx.restore();
    }

    // 7. キャラクター描画
    const topChar = s.characters
      .filter((c) => c.isAlive)
      .sort((a, b) => b.territoryPercent - a.territoryPercent)[0];

    for (const char of s.characters) {
      if (!char.isAlive) continue;

      ctx.save();
      ctx.translate(char.x, char.y);

      // リスポーン無敵点滅
      if (char.invincibleTimer > 0) {
        if (Math.floor(char.invincibleTimer / 6) % 2 === 0) {
          ctx.globalAlpha = 0.4;
        }
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(0, 0, CELL_SIZE * 1.1, 0, Math.PI * 2);
        ctx.stroke();
      }

      // ゴースト中
      if (char.ghostTimer > 0) {
        ctx.globalAlpha = 0.65;
      }

      // 氷結中
      if (char.freezeTimer > 0) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, CELL_SIZE * 0.95, 0, Math.PI * 2);
        ctx.stroke();
      }

      // シールド
      if (char.hasShield) {
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#10b981';
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

      // 名前ラベル
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = isDark ? '#ffffff' : '#0f172a';
      ctx.fillText(char.name, 0, -cubeSize / 2 - 8);

      // 1位（KING / 賞金首）
      if (topChar && topChar.id === char.id) {
        ctx.font = '14px sans-serif';
        ctx.fillText('👑', 0, -cubeSize / 2 - 20);
        if (!char.isPlayer) {
          ctx.font = 'bold 9px sans-serif';
          ctx.fillStyle = '#f59e0b';
          ctx.fillText('BOUNTY', 0, cubeSize / 2 + 12);
        }
      }

      ctx.restore();
    }

    // 8. パーティクル
    for (const p of s.particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 9. 浮遊テキスト
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

    // 10. 紙吹雪（画面全体）
    for (const c of s.confetti) {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate((c.rotation * Math.PI) / 180);
      ctx.fillStyle = c.color;
      ctx.fillRect(-c.size / 2, -c.size / 4, c.size, c.size / 2);
      ctx.restore();
    }
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

    if (gameMode === 'royale') {
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(s.zoneCenter.x * scale, s.zoneCenter.y * scale, s.zoneRadius * scale, 0, Math.PI * 2);
      ctx.stroke();
    }

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

  // キーボード操作 ＆ ブースト
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const s = stateRef.current;
      const player = s.characters.find((c) => c.isPlayer && c.isAlive);
      if (!player) return;

      if (e.key === ' ' || e.key === 'Shift') {
        if (!s.isBoosting) {
          s.isBoosting = true;
          sound.playPaperDash();
        }
      }

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

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Shift') {
        stateRef.current.isBoosting = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
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

  // Canvas リサイズ
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
            {/* 上部中央: キルストリーク通知バナー */}
            {streakBanner && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 animate-bounce px-5 py-2 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-600 text-white font-black text-sm sm:text-base shadow-xl border border-amber-300 pointer-events-none">
                {streakBanner}
              </div>
            )}

            {/* 左上: 占有率・ライフ・スコア・キル数 */}
            <div className="absolute top-4 left-4 z-20 flex flex-col gap-2 pointer-events-none">
              <div
                className={`flex items-center gap-3 px-4 py-2 rounded-2xl backdrop-blur-md border shadow-lg ${
                  isDark
                    ? 'bg-slate-900/80 border-slate-700/60 text-white'
                    : 'bg-white/90 border-slate-200 text-slate-900'
                }`}
              >
                {/* ライフ表示 */}
                <div className="flex items-center gap-1">
                  {[1, 2, 3].map((l) => (
                    <Heart
                      key={l}
                      className={`w-4 h-4 transition-all duration-300 ${
                        l <= playerLives
                          ? 'fill-rose-500 text-rose-500 scale-100 animate-pulse'
                          : 'fill-slate-700 text-slate-700 scale-90'
                      }`}
                    />
                  ))}
                </div>

                <div className="h-4 w-px bg-slate-700/50" />

                <div className="flex items-center gap-1.5 font-black text-base sm:text-lg text-emerald-400">
                  <Crown className="w-4 h-4 text-amber-400" />
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

                {gameMode === 'royale' && (
                  <>
                    <div className="h-4 w-px bg-slate-700/50" />
                    <div className="text-xs font-mono font-bold text-amber-400">
                      ALIVE: {aliveCount}
                    </div>
                  </>
                )}
              </div>

              {/* スタミナ / ブーストバー */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-700/60 w-44">
                <Zap className={`w-4 h-4 ${stamina > 20 ? 'text-amber-400' : 'text-slate-500'}`} />
                <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-75 rounded-full ${
                      stamina > 30 ? 'bg-gradient-to-r from-amber-500 to-emerald-400' : 'bg-rose-500'
                    }`}
                    style={{ width: `${stamina}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono font-bold text-slate-300">{stamina}%</span>
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
                      {item.isKing && <span className="text-[10px]">👑</span>}
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
                  {item.isBounty && <span className="text-amber-400 font-black">(👑BOUNTY!)</span>}
                </div>
              ))}
            </div>

            {/* 右下: レーダーミニマップ */}
            <div className="absolute bottom-4 right-4 z-20 pointer-events-none rounded-2xl overflow-hidden border border-slate-700/60 shadow-xl">
              <canvas ref={minimapCanvasRef} width={100} height={100} className="block" />
            </div>

            {/* スマホ用操作 ＆ ブーストボタン */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 sm:hidden">
              <button
                onPointerDown={() => {
                  stateRef.current.isBoosting = true;
                  sound.playPaperDash();
                }}
                onPointerUp={() => {
                  stateRef.current.isBoosting = false;
                }}
                onPointerLeave={() => {
                  stateRef.current.isBoosting = false;
                }}
                className="px-6 py-2 rounded-full bg-gradient-to-r from-amber-500 to-rose-600 text-white font-black text-xs shadow-lg active:scale-95 flex items-center gap-1.5"
              >
                <Zap className="w-4 h-4 fill-current" />
                TURBO BOOST
              </button>

              <div className="flex flex-col items-center gap-1">
                <button
                  onClick={() => {
                    const s = stateRef.current;
                    const p = s.characters.find((c) => c.isPlayer && c.isAlive);
                    if (p && p.dir !== 'DOWN') p.nextDir = 'UP';
                  }}
                  className="w-11 h-11 rounded-xl bg-slate-800/80 backdrop-blur-md border border-slate-600 text-white font-bold flex items-center justify-center active:scale-95 shadow-lg"
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
                    className="w-11 h-11 rounded-xl bg-slate-800/80 backdrop-blur-md border border-slate-600 text-white font-bold flex items-center justify-center active:scale-95 shadow-lg"
                  >
                    ◀
                  </button>
                  <button
                    onClick={() => {
                      const s = stateRef.current;
                      const p = s.characters.find((c) => c.isPlayer && c.isAlive);
                      if (p && p.dir !== 'LEFT') p.nextDir = 'RIGHT';
                    }}
                    className="w-11 h-11 rounded-xl bg-slate-800/80 backdrop-blur-md border border-slate-600 text-white font-bold flex items-center justify-center active:scale-95 shadow-lg"
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
                  className="w-11 h-11 rounded-xl bg-slate-800/80 backdrop-blur-md border border-slate-600 text-white font-bold flex items-center justify-center active:scale-95 shadow-lg"
                >
                  ▼
                </button>
              </div>
            </div>
          </>
        )}

        {/* タイトル画面 */}
        {gameState === 'title' && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md p-6 text-center animate-in fade-in duration-300 overflow-y-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-bold mb-2">
              <Crown className="w-4 h-4 text-amber-400" />
              v2.1 Refined - 3 Lives & Grid Snap
            </div>

            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-2 bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
              ペーパー.io
            </h1>

            {/* ゲームモード選択 */}
            <div className="flex items-center gap-2 mb-4">
              {[
                { id: 'classic', label: 'クラシック', desc: '75%制覇' },
                { id: 'royale', label: 'バトロワ', desc: '生存戦' },
                { id: 'rush', label: 'スピードラッシュ', desc: '超高速' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setGameMode(m.id as GameMode)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex flex-col items-center ${
                    gameMode === m.id
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 border-indigo-400 text-white shadow-lg scale-105'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <span>{m.label}</span>
                  <span className="text-[10px] font-normal opacity-80">{m.desc}</span>
                </button>
              ))}
            </div>

            {/* スキン選択 (全8種) */}
            <div className="w-full max-w-sm mb-4">
              <div className="text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                プレイヤースキン (全8種)
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {PLAYER_SKINS.map((skin, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedSkin(idx)}
                    className={`h-9 rounded-xl border-2 transition-all flex items-center justify-center ${
                      selectedSkin === idx
                        ? 'border-white scale-110 shadow-lg'
                        : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: skin.main }}
                    title={skin.name}
                  >
                    {selectedSkin === idx && <Crown className="w-3.5 h-3.5 text-white" />}
                  </button>
                ))}
              </div>
            </div>

            {/* 難易度 & ボット人数設定 */}
            <div className="flex flex-wrap items-center justify-center gap-3 mb-4">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-400">Bot難易度:</span>
                {(['easy', 'normal', 'hard'] as const).map((diff) => (
                  <button
                    key={diff}
                    onClick={() => setBotDifficulty(diff)}
                    className={`px-2 py-0.5 rounded-lg font-bold border transition-colors ${
                      botDifficulty === diff
                        ? 'bg-indigo-600 border-indigo-500 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    {diff.toUpperCase()}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-400">Bot人数:</span>
                {[4, 6, 8].map((count) => (
                  <button
                    key={count}
                    onClick={() => setBotCount(count)}
                    className={`px-2 py-0.5 rounded-lg font-bold border transition-colors ${
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
            <div className="flex items-center gap-6 mb-5 text-xs font-mono">
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

        {/* 🌟 刷新されたモダン・リザルト画面 (ゲームオーバー) */}
        {gameState === 'gameover' && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md p-6 text-center animate-in fade-in zoom-in-95 duration-300 overflow-y-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold mb-3">
              <ShieldAlert className="w-4 h-4" />
              GAME OVER
            </div>

            <h2 className="text-3xl sm:text-4xl font-black text-white mb-1 tracking-tight">
              ELIMINATED
            </h2>
            <p className="text-xs text-slate-400 mb-5">すべてのライフを消費しました</p>

            {/* スタッツカード */}
            <div className="w-full max-w-sm p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur-xl mb-6">
              {isNewRecord && (
                <div className="mb-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-300 text-xs font-black animate-pulse">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  🏆 NEW HIGH SCORE!
                </div>
              )}

              {/* 占有率バー */}
              <div className="mb-4 text-left">
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-slate-400">最終占有率</span>
                  <span className="text-emerald-400 font-mono">{territoryPercent.toFixed(1)}%</span>
                </div>
                <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-1000"
                    style={{ width: `${Math.min(100, territoryPercent)}%` }}
                  />
                </div>
              </div>

              {/* スコア・撃破・ストリーク一覧 */}
              <div className="grid grid-cols-3 gap-3 py-3 border-y border-slate-800/80 font-mono">
                <div>
                  <div className="text-[10px] text-slate-400 font-sans font-bold">SCORE</div>
                  <div className="text-amber-400 font-black text-lg sm:text-xl">
                    {score.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-sans font-bold">KILLS</div>
                  <div className="text-rose-400 font-black text-lg sm:text-xl">{kills}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-sans font-bold">MAX STREAK</div>
                  <div className="text-indigo-400 font-black text-lg sm:text-xl">{maxStreak}x</div>
                </div>
              </div>

              {/* 獲得MVPバッジ */}
              <div className="mt-4 flex items-center justify-center gap-2">
                {territoryPercent >= 20 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-bold text-emerald-400">
                    <Award className="w-3 h-3" /> Conqueror
                  </span>
                )}
                {kills >= 3 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-500/10 border border-rose-500/30 text-[10px] font-bold text-rose-400">
                    <Flame className="w-3 h-3" /> Slayer
                  </span>
                )}
                {maxStreak >= 2 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[10px] font-bold text-amber-400">
                    <Zap className="w-3 h-3" /> Combo Master
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={initGame}
                className="flex items-center gap-2 px-7 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-xs shadow-lg shadow-emerald-500/25 active:scale-95 transition-all"
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

        {/* 🌟 刷新されたモダン・リザルト画面 (完全制覇ビクトリー) */}
        {gameState === 'victory' && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md p-6 text-center animate-in fade-in zoom-in-95 duration-300 overflow-y-auto">
            <Crown className="w-14 h-14 text-amber-400 mb-2 animate-bounce drop-shadow-[0_0_15px_rgba(245,158,11,0.6)]" />

            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold mb-2">
              <Sparkles className="w-4 h-4 text-amber-300" />
              {gameMode === 'royale' ? 'BATTLE ROYALE CHAMPION' : 'TERRITORY CONQUEROR'}
            </div>

            <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-1 bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500">
              VICTORY!
            </h2>
            <p className="text-xs text-slate-300 mb-5">
              {gameMode === 'royale'
                ? '最後の1人として生き残り完全勝利を達成しました！'
                : '圧倒的な領地を制覇しゲームをクリアしました！'}
            </p>

            {/* スタッツカード */}
            <div className="w-full max-w-sm p-5 rounded-3xl bg-slate-900/90 border border-amber-500/40 shadow-2xl backdrop-blur-xl mb-6">
              <div className="grid grid-cols-3 gap-3 py-3 border-b border-slate-800/80 font-mono">
                <div>
                  <div className="text-[10px] text-slate-400 font-sans font-bold">FINAL SCORE</div>
                  <div className="text-amber-400 font-black text-lg sm:text-xl">
                    {(score + 5000).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-sans font-bold">TOTAL KILLS</div>
                  <div className="text-rose-400 font-black text-lg sm:text-xl">{kills}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-sans font-bold">TERRITORY</div>
                  <div className="text-emerald-400 font-black text-lg sm:text-xl">
                    {territoryPercent.toFixed(1)}%
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-center gap-2">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40 text-[10px] font-black text-amber-300">
                  👑 Grand Master
                </span>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-[10px] font-black text-emerald-300">
                  ⭐ +5,000 Bonus
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={initGame}
                className="flex items-center gap-2 px-7 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/25 active:scale-95 transition-all"
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

      {/* 下部コントロール＆操作説明バー */}
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
            <span>【操作】 矢印 / WASD</span>
            <span className="text-amber-400 font-bold">【ブースト】 Space / Shift</span>
            <span className="hidden sm:inline">・ ❤️ ライフ3機</span>
            <span className="hidden sm:inline">・ 陣取り＆トレイル切断</span>
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
