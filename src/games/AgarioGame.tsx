import React, { useState, useEffect, useRef, useCallback } from 'react';
import { sound } from '../utils/audio';
import {
  Play,
  RotateCcw,
  Trophy,
  Volume2,
  VolumeX,
  Pause,
  Crown,
  Swords,
  Timer,
  Globe,
  Palette,
} from 'lucide-react';

export const AGARIO_HIGH_SCORE_KEY = 'agario_high_mass';
export const AGARIO_BEST_KILLS_KEY = 'agario_best_kills';
export const AGARIO_BEST_RANK_KEY = 'agario_best_rank';
const AGARIO_NAME_KEY = 'agario_player_name';
const AGARIO_SKIN_KEY = 'agario_player_skin';

interface AgarioGameProps {
  onBackToHub: () => void;
  isDark: boolean;
  isFullscreen?: boolean;
}

type GameMode = 'ffa' | 'royale' | 'timeattack';

export interface Skin {
  id: string;
  name: string;
  color: string;
  border: string;
  type: 'color' | 'emoji' | 'special';
  emoji?: string;
  glow?: string;
}

export const SKINS: Skin[] = [
  {
    id: 'neon-cyan',
    name: 'ネオン・シアン (Neon)',
    color: '#06b6d4',
    border: '#0891b2',
    type: 'color',
    glow: '#22d3ee',
  },
  {
    id: 'volcano',
    name: 'マグマ・溶岩 (Volcano)',
    color: '#f97316',
    border: '#c2410c',
    type: 'color',
    glow: '#fb923c',
  },
  {
    id: 'sakura',
    name: 'サクラ・ピンク (Sakura)',
    color: '#ec4899',
    border: '#be185d',
    type: 'color',
    glow: '#f472b6',
  },
  {
    id: 'galaxy',
    name: 'コズミック・紫 (Cosmic)',
    color: '#a855f7',
    border: '#7e22ce',
    type: 'color',
    glow: '#c084fc',
  },
  {
    id: 'emerald',
    name: 'エメラルド毒素 (Emerald)',
    color: '#10b981',
    border: '#047857',
    type: 'color',
    glow: '#34d399',
  },
  {
    id: 'golden',
    name: '黄金エンペラー (Golden)',
    color: '#eab308',
    border: '#a16207',
    type: 'color',
    glow: '#fde047',
  },
  {
    id: 'cat',
    name: 'にゃんこ (Cat Face)',
    color: '#f8fafc',
    border: '#94a3b8',
    type: 'emoji',
    emoji: '🐱',
    glow: '#cbd5e1',
  },
  {
    id: 'shiba',
    name: 'しばいぬ (Shiba Inu)',
    color: '#f59e0b',
    border: '#b45309',
    type: 'emoji',
    emoji: '🐕',
    glow: '#fcd34d',
  },
  {
    id: 'panda',
    name: 'パンダ (Panda)',
    color: '#ffffff',
    border: '#0f172a',
    type: 'emoji',
    emoji: '🐼',
    glow: '#e2e8f0',
  },
  {
    id: 'skull',
    name: 'スカル・死神 (Skull)',
    color: '#334155',
    border: '#0f172a',
    type: 'emoji',
    emoji: '💀',
    glow: '#64748b',
  },
  {
    id: 'alien',
    name: 'エイリアン (Alien)',
    color: '#84cc16',
    border: '#4d7c0f',
    type: 'emoji',
    emoji: '👽',
    glow: '#a3e635',
  },
  {
    id: 'fire',
    name: 'ファイア・炎 (Blaze)',
    color: '#ef4444',
    border: '#991b1b',
    type: 'emoji',
    emoji: '🔥',
    glow: '#f87171',
  },
];

// --- ゲーム内物理定数 ---
const MAP_SIZE = 4000;
const PELLET_COUNT = 850;
const VIRUS_COUNT = 24;
const BOT_COUNT = 24;
const INITIAL_PLAYER_MASS = 25;
const MIN_SPLIT_MASS = 36;
const MAX_CELLS_PER_PLAYER = 16;
const EJECT_MASS_COST = 14;
const EJECT_PELLET_MASS = 12;
const MERGE_BASE_COOLDOWN = 18; // 秒

const BOT_NAMES = [
  'TitanCell',
  'VoidVortex',
  'Blobby',
  'AmoebaKing',
  'SwiftHunter',
  'CosmicDust',
  'ShadowPredator',
  'ApexOmega',
  'BioHazard',
  'NeonGlow',
  'PulseWave',
  'QuantumCore',
  'GlitchCell',
  'AbyssWatcher',
  'SolarFlare',
  'CyberBlob',
  'MegaSpore',
  'KrakenEye',
  'StarGazer',
  'PlasmaBlast',
  'EchoChamber',
  'ViperCell',
  'OrbitStriker',
  'NovaBurst',
];

// 質量から半径を計算
function massToRadius(mass: number): number {
  return 6 + Math.sqrt(Math.max(1, mass)) * 5.8;
}

// 質量から速度を計算 (大きいほど遅い)
function massToSpeed(mass: number): number {
  return Math.max(1.8, 8.8 * Math.pow(Math.max(10, mass), -0.36));
}

interface Cell {
  id: number;
  ownerId: number;
  isPlayer: boolean;
  name: string;
  skin: Skin;
  x: number;
  y: number;
  vx: number;
  vy: number;
  boostVx: number;
  boostVy: number;
  mass: number;
  radius: number;
  canMergeAt: number; // timestamp
  wobblePhase: number;
  wobbleSpeed: number;
}

interface Pellet {
  id: number;
  x: number;
  y: number;
  color: string;
  radius: number;
  mass: number;
}

interface EjectedMass {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  border: string;
  mass: number;
  radius: number;
}

interface Virus {
  id: number;
  x: number;
  y: number;
  mass: number;
  radius: number;
  feedCount: number; // Ejectが当たった回数 (7回で分裂射出)
  feedDirectionX: number;
  feedDirectionY: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  scale: number;
}

interface KillFeedItem {
  id: number;
  killer: string;
  victim: string;
  time: number;
}

interface LeaderboardEntry {
  id: number;
  name: string;
  mass: number;
  isPlayer: boolean;
  skin: Skin;
}

interface BotController {
  id: number;
  name: string;
  skin: Skin;
  targetX: number;
  targetY: number;
  retargetTimer: number;
  splitCooldown: number;
  feedCooldown: number;
  isAlive: boolean;
  respawnTimer: number;
  kills: number;
}

const PELLET_COLORS = [
  '#f43f5e',
  '#ec4899',
  '#d946ef',
  '#a855f7',
  '#8b5cf6',
  '#6366f1',
  '#3b82f6',
  '#0ea5e9',
  '#06b6d4',
  '#14b8a6',
  '#10b981',
  '#22c55e',
  '#84cc16',
  '#eab308',
  '#f59e0b',
  '#f97316',
];

export const AgarioGame: React.FC<AgarioGameProps> = ({
  onBackToHub,
  isDark,
  isFullscreen = false,
}) => {
  // --- UI ステート ---
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'paused' | 'gameover' | 'victory'>('menu');
  const [gameMode, setGameMode] = useState<GameMode>('ffa');
  const [playerName, setPlayerName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(AGARIO_NAME_KEY) || 'あなた (Player)';
    }
    return 'あなた (Player)';
  });
  const [selectedSkin, setSelectedSkin] = useState<Skin>(() => {
    if (typeof window !== 'undefined') {
      const savedId = localStorage.getItem(AGARIO_SKIN_KEY);
      const found = SKINS.find((s) => s.id === savedId);
      if (found) return found;
    }
    return SKINS[0];
  });

  const [isMuted, setIsMuted] = useState<boolean>(sound.getMuted());
  const [highMassRecord, setHighMassRecord] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      return parseInt(localStorage.getItem(AGARIO_HIGH_SCORE_KEY) || '0', 10);
    }
    return 0;
  });
  const [bestKillsRecord, setBestKillsRecord] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      return parseInt(localStorage.getItem(AGARIO_BEST_KILLS_KEY) || '0', 10);
    }
    return 0;
  });
  const [bestRankRecord, setBestRankRecord] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      return parseInt(localStorage.getItem(AGARIO_BEST_RANK_KEY) || '99', 10);
    }
    return 99;
  });

  // リアルタイム表示用ステート (軽量なUI更新用)
  const [hudStats, setHudStats] = useState({
    currentMass: INITIAL_PLAYER_MASS,
    maxMass: INITIAL_PLAYER_MASS,
    cellCount: 1,
    kills: 0,
    rank: 1,
    totalAlive: BOT_COUNT + 1,
    timeElapsed: 0,
    timeLeft: 180, // タイムアタック用
    safeZoneRadius: MAP_SIZE * 0.7, // バトロワ用
  });

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [killFeed, setKillFeed] = useState<KillFeedItem[]>([]);
  const [crownNotice, setCrownNotice] = useState<boolean>(false);
  const [showSkinModal, setShowSkinModal] = useState<boolean>(false);

  // --- Refs ---
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // 入力追従 (マウス / タッチ)
  const mousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isTouchDeviceRef = useRef<boolean>(false);
  const touchJoystickOriginRef = useRef<{ x: number; y: number } | null>(null);
  const touchJoystickCurrRef = useRef<{ x: number; y: number } | null>(null);

  // ゲームワールド内データ
  const nextEntityIdRef = useRef<number>(1);
  const cellsRef = useRef<Cell[]>([]);
  const pelletsRef = useRef<Pellet[]>([]);
  const ejectedMassesRef = useRef<EjectedMass[]>([]);
  const virusesRef = useRef<Virus[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const botsRef = useRef<BotController[]>([]);

  // カメラ状態
  const cameraRef = useRef<{
    x: number;
    y: number;
    zoom: number;
    targetZoom: number;
    manualZoomFactor: number;
  }>({
    x: MAP_SIZE / 2,
    y: MAP_SIZE / 2,
    zoom: 1,
    targetZoom: 1,
    manualZoomFactor: 1.0,
  });

  // 統計カウンタ
  const gameStatsRef = useRef({
    startTime: 0,
    elapsedTime: 0,
    currentMass: INITIAL_PLAYER_MASS,
    maxMass: INITIAL_PLAYER_MASS,
    kills: 0,
    bestRank: 99,
    wasCrownAwarded: false,
    royaleZoneCenter: { x: MAP_SIZE / 2, y: MAP_SIZE / 2 },
    royaleZoneRadius: MAP_SIZE * 0.7,
    royaleTargetCenter: {
      x: MAP_SIZE / 2 + (Math.random() - 0.5) * 800,
      y: MAP_SIZE / 2 + (Math.random() - 0.5) * 800,
    },
  });

  // --- サウンドトグル ---
  const toggleMute = () => {
    const next = sound.toggleMute();
    setIsMuted(next);
  };

  // --- スキン選択 & 保存 ---
  const handleSelectSkin = (skin: Skin) => {
    setSelectedSkin(skin);
    localStorage.setItem(AGARIO_SKIN_KEY, skin.id);
    // 既存プレイヤー細胞のスキンも即時反映
    cellsRef.current.forEach((c) => {
      if (c.isPlayer) c.skin = skin;
    });
  };

  // --- プレイヤー名保存 ---
  const handleNameChange = (name: string) => {
    setPlayerName(name);
    localStorage.setItem(AGARIO_NAME_KEY, name);
  };

  // --- パーティクル・演出ヘルパー ---
  const createPopParticles = (x: number, y: number, color: string, count: number = 16) => {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = 2 + Math.random() * 6;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 2 + Math.random() * 4,
        color,
        alpha: 1,
        life: 0,
        maxLife: 20 + Math.random() * 15,
      });
    }
  };

  const addFloatingText = (x: number, y: number, text: string, color: string = '#ffffff') => {
    floatingTextsRef.current.push({
      id: nextEntityIdRef.current++,
      x,
      y,
      text,
      color,
      alpha: 1,
      scale: 1.2,
    });
  };

  const addKillFeed = (killer: string, victim: string) => {
    const item: KillFeedItem = {
      id: Date.now() + Math.random(),
      killer,
      victim,
      time: Date.now(),
    };
    setKillFeed((prev) => [item, ...prev.slice(0, 3)]);
  };

  // --- ゲームの初期化 ---
  const initGame = useCallback(() => {
    nextEntityIdRef.current = 1;
    particlesRef.current = [];
    floatingTextsRef.current = [];
    ejectedMassesRef.current = [];
    setKillFeed([]);
    setCrownNotice(false);

    // 1. ペレット (エサ) の生成
    const newPellets: Pellet[] = [];
    for (let i = 0; i < PELLET_COUNT; i++) {
      newPellets.push({
        id: nextEntityIdRef.current++,
        x: Math.random() * (MAP_SIZE - 200) + 100,
        y: Math.random() * (MAP_SIZE - 200) + 100,
        color: PELLET_COLORS[Math.floor(Math.random() * PELLET_COLORS.length)],
        radius: 3.5 + Math.random() * 2,
        mass: 1.5,
      });
    }
    pelletsRef.current = newPellets;

    // 2. ウイルス (トゲ細胞) の生成
    const newViruses: Virus[] = [];
    for (let i = 0; i < VIRUS_COUNT; i++) {
      newViruses.push({
        id: nextEntityIdRef.current++,
        x: Math.random() * (MAP_SIZE - 400) + 200,
        y: Math.random() * (MAP_SIZE - 400) + 200,
        mass: 100,
        radius: 54,
        feedCount: 0,
        feedDirectionX: 0,
        feedDirectionY: 0,
      });
    }
    virusesRef.current = newViruses;

    // 3. プレイヤー細胞の生成 (中央付近)
    const playerStartX = MAP_SIZE / 2 + (Math.random() - 0.5) * 500;
    const playerStartY = MAP_SIZE / 2 + (Math.random() - 0.5) * 500;
    const playerCell: Cell = {
      id: nextEntityIdRef.current++,
      ownerId: 0, // 0 = Player
      isPlayer: true,
      name: playerName.trim() || 'あなた',
      skin: selectedSkin,
      x: playerStartX,
      y: playerStartY,
      vx: 0,
      vy: 0,
      boostVx: 0,
      boostVy: 0,
      mass: INITIAL_PLAYER_MASS,
      radius: massToRadius(INITIAL_PLAYER_MASS),
      canMergeAt: 0,
      wobblePhase: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.08 + Math.random() * 0.04,
    };

    // 4. Bot の生成
    const newBots: BotController[] = [];
    const initialCells: Cell[] = [playerCell];

    for (let i = 1; i <= BOT_COUNT; i++) {
      const bSkin = SKINS[i % SKINS.length];
      const bName = BOT_NAMES[(i - 1) % BOT_NAMES.length];
      const bx = Math.random() * (MAP_SIZE - 400) + 200;
      const by = Math.random() * (MAP_SIZE - 400) + 200;
      const bMass = 20 + Math.random() * 40; // 初期ボット質量

      newBots.push({
        id: i,
        name: bName,
        skin: bSkin,
        targetX: Math.random() * MAP_SIZE,
        targetY: Math.random() * MAP_SIZE,
        retargetTimer: Math.random() * 60,
        splitCooldown: 120 + Math.random() * 200,
        feedCooldown: 0,
        isAlive: true,
        respawnTimer: 0,
        kills: 0,
      });

      initialCells.push({
        id: nextEntityIdRef.current++,
        ownerId: i,
        isPlayer: false,
        name: bName,
        skin: bSkin,
        x: bx,
        y: by,
        vx: 0,
        vy: 0,
        boostVx: 0,
        boostVy: 0,
        mass: bMass,
        radius: massToRadius(bMass),
        canMergeAt: 0,
        wobblePhase: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.08 + Math.random() * 0.04,
      });
    }

    cellsRef.current = initialCells;
    botsRef.current = newBots;

    // カメラ初期化
    cameraRef.current = {
      x: playerStartX,
      y: playerStartY,
      zoom: 1,
      targetZoom: 1,
      manualZoomFactor: 1.0,
    };

    // 統計初期化
    gameStatsRef.current = {
      startTime: Date.now(),
      elapsedTime: 0,
      currentMass: INITIAL_PLAYER_MASS,
      maxMass: INITIAL_PLAYER_MASS,
      kills: 0,
      bestRank: BOT_COUNT + 1,
      wasCrownAwarded: false,
      royaleZoneCenter: { x: MAP_SIZE / 2, y: MAP_SIZE / 2 },
      royaleZoneRadius: MAP_SIZE * 0.65,
      royaleTargetCenter: {
        x: MAP_SIZE / 2 + (Math.random() - 0.5) * 800,
        y: MAP_SIZE / 2 + (Math.random() - 0.5) * 800,
      },
    };

    setGameState('playing');
  }, [playerName, selectedSkin]);

  // --- 分裂 (Split / Spaceキー / 分裂ボタン) ---
  const handleSplit = useCallback(() => {
    if (gameState !== 'playing') return;

    const playerCells = cellsRef.current.filter((c) => c.isPlayer);
    if (playerCells.length === 0 || playerCells.length >= MAX_CELLS_PER_PLAYER) return;

    let splitOccurred = false;
    const now = Date.now();
    const newCells: Cell[] = [];

    // 分裂可能な各細胞を半分に分割
    for (const cell of playerCells) {
      if (cellsRef.current.length + newCells.length >= MAX_CELLS_PER_PLAYER) break;
      if (cell.mass >= MIN_SPLIT_MASS) {
        splitOccurred = true;
        const halfMass = cell.mass / 2;
        cell.mass = halfMass;
        cell.radius = massToRadius(halfMass);

        // マウス/入力方向への射出ベクトル
        const canvas = canvasRef.current;
        let dirX = 1;
        let dirY = 0;
        if (canvas) {
          const screenCenterX = canvas.width / 2;
          const screenCenterY = canvas.height / 2;
          const dx = mousePosRef.current.x - screenCenterX;
          const dy = mousePosRef.current.y - screenCenterY;
          const dist = Math.hypot(dx, dy);
          if (dist > 5) {
            dirX = dx / dist;
            dirY = dy / dist;
          }
        }

        // 合体クールダウン時間 (秒)
        const mergeCooldown = (MERGE_BASE_COOLDOWN + halfMass * 0.02) * 1000;
        cell.canMergeAt = now + mergeCooldown;

        // 射出される新しい細胞
        const splitBoostSpeed = 24;
        const newCell: Cell = {
          id: nextEntityIdRef.current++,
          ownerId: cell.ownerId,
          isPlayer: true,
          name: cell.name,
          skin: cell.skin,
          x: cell.x + dirX * (cell.radius + 10),
          y: cell.y + dirY * (cell.radius + 10),
          vx: cell.vx,
          vy: cell.vy,
          boostVx: dirX * splitBoostSpeed,
          boostVy: dirY * splitBoostSpeed,
          mass: halfMass,
          radius: massToRadius(halfMass),
          canMergeAt: now + mergeCooldown,
          wobblePhase: Math.random() * Math.PI * 2,
          wobbleSpeed: 0.12,
        };

        newCells.push(newCell);
      }
    }

    if (splitOccurred) {
      cellsRef.current.push(...newCells);
      sound.playAgarioSplit();
    }
  }, [gameState]);

  // --- 質量射出 (Eject / Wキー / 射出ボタン) ---
  const handleEject = useCallback(() => {
    if (gameState !== 'playing') return;

    const playerCells = cellsRef.current.filter((c) => c.isPlayer);
    if (playerCells.length === 0) return;

    let ejectedAny = false;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const screenCenterX = canvas.width / 2;
    const screenCenterY = canvas.height / 2;
    const dx = mousePosRef.current.x - screenCenterX;
    const dy = mousePosRef.current.y - screenCenterY;
    const dist = Math.hypot(dx, dy);
    let dirX = 1;
    let dirY = 0;
    if (dist > 5) {
      dirX = dx / dist;
      dirY = dy / dist;
    }

    for (const cell of playerCells) {
      if (cell.mass > EJECT_MASS_COST + 15) {
        cell.mass -= EJECT_MASS_COST;
        cell.radius = massToRadius(cell.mass);

        const launchSpeed = 18;
        ejectedMassesRef.current.push({
          id: nextEntityIdRef.current++,
          x: cell.x + dirX * (cell.radius + 8),
          y: cell.y + dirY * (cell.radius + 8),
          vx: dirX * launchSpeed + (Math.random() - 0.5) * 2,
          vy: dirY * launchSpeed + (Math.random() - 0.5) * 2,
          color: cell.skin.color,
          border: cell.skin.border,
          mass: EJECT_PELLET_MASS,
          radius: 8,
        });

        ejectedAny = true;
      }
    }

    if (ejectedAny) {
      sound.playAgarioEject();
    }
  }, [gameState]);

  // --- キーボード操作イベント登録 ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleSplit();
      } else if (e.code === 'KeyW' || e.code === 'KeyE') {
        e.preventDefault();
        handleEject();
      } else if (e.code === 'KeyP' || e.code === 'Escape') {
        e.preventDefault();
        setGameState((prev) => (prev === 'playing' ? 'paused' : prev === 'paused' ? 'playing' : prev));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSplit, handleEject]);

  // --- マウス & タッチ操作イベント登録 ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mousePosRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    const handleTouchStart = (e: TouchEvent) => {
      isTouchDeviceRef.current = true;
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        const tx = touch.clientX - rect.left;
        const ty = touch.clientY - rect.top;
        touchJoystickOriginRef.current = { x: tx, y: ty };
        touchJoystickCurrRef.current = { x: tx, y: ty };
        mousePosRef.current = { x: tx, y: ty };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        const tx = touch.clientX - rect.left;
        const ty = touch.clientY - rect.top;
        touchJoystickCurrRef.current = { x: tx, y: ty };
        mousePosRef.current = { x: tx, y: ty };
      }
    };

    const handleTouchEnd = () => {
      touchJoystickOriginRef.current = null;
      touchJoystickCurrRef.current = null;
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomDelta = e.deltaY < 0 ? 1.08 : 0.92;
      cameraRef.current.manualZoomFactor = Math.max(
        0.5,
        Math.min(2.0, cameraRef.current.manualZoomFactor * zoomDelta)
      );
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 2) {
        // 右クリック: 分裂 (Split)
        e.preventDefault();
        handleSplit();
      } else if (e.button === 1) {
        // 中クリック: 質量射出 (Eject)
        e.preventDefault();
        handleEject();
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('contextmenu', handleContextMenu);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: true });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: true });
    canvas.addEventListener('touchend', handleTouchEnd);

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('contextmenu', handleContextMenu);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleSplit, handleEject]);

  // --- ゲームオーバー & 記録保存処理 ---
  const triggerGameOver = useCallback((isVictory: boolean = false) => {
    setGameState(isVictory ? 'victory' : 'gameover');
    sound.playGameOver();

    const maxM = Math.floor(gameStatsRef.current.maxMass);
    const kills = gameStatsRef.current.kills;
    const bestR = gameStatsRef.current.bestRank;

    // ハイスコア更新チェック
    if (maxM > highMassRecord) {
      setHighMassRecord(maxM);
      localStorage.setItem(AGARIO_HIGH_SCORE_KEY, maxM.toString());
    }
    if (kills > bestKillsRecord) {
      setBestKillsRecord(kills);
      localStorage.setItem(AGARIO_BEST_KILLS_KEY, kills.toString());
    }
    if (bestR < bestRankRecord) {
      setBestRankRecord(bestR);
      localStorage.setItem(AGARIO_BEST_RANK_KEY, bestR.toString());
    }
  }, [highMassRecord, bestKillsRecord, bestRankRecord]);

  // --- メインゲームループ (Physics + AI + Render) ---
  useEffect(() => {
    if (gameState !== 'playing') {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = performance.now();
    let hudUpdateCounter = 0;

    const gameLoop = (nowTime: number) => {
      const dt = Math.min((nowTime - lastTime) / 1000, 0.1);
      lastTime = nowTime;

      // 1. キャンバスの動的リサイズ (高解像度Retina対応)
      const container = canvas.parentElement;
      if (container) {
        const dpr = window.devicePixelRatio || 1;
        const targetW = container.clientWidth;
        const targetH = container.clientHeight;

        if (canvas.width !== targetW * dpr || canvas.height !== targetH * dpr) {
          canvas.width = targetW * dpr;
          canvas.height = targetH * dpr;
          canvas.style.width = `${targetW}px`;
          canvas.style.height = `${targetH}px`;
        }
      }

      const screenW = canvas.width / (window.devicePixelRatio || 1);
      const screenH = canvas.height / (window.devicePixelRatio || 1);

      // 2. タイムアタック & バトロワのゾーン縮小進行
      gameStatsRef.current.elapsedTime = (Date.now() - gameStatsRef.current.startTime) / 1000;
      const elapsed = gameStatsRef.current.elapsedTime;

      if (gameMode === 'timeattack') {
        const remaining = Math.max(0, 180 - Math.floor(elapsed));
        if (remaining <= 0) {
          triggerGameOver(false);
          return;
        }
      } else if (gameMode === 'royale') {
        // バトロワの円が中央に向けて徐々に縮小
        const shrinkRate = 9 * dt; // 毎秒9px縮小
        gameStatsRef.current.royaleZoneRadius = Math.max(160, gameStatsRef.current.royaleZoneRadius - shrinkRate);

        // ゾーン外の細胞に割合ダメージ
        cellsRef.current.forEach((cell) => {
          const dx = cell.x - gameStatsRef.current.royaleZoneCenter.x;
          const dy = cell.y - gameStatsRef.current.royaleZoneCenter.y;
          const dist = Math.hypot(dx, dy);
          if (dist > gameStatsRef.current.royaleZoneRadius) {
            cell.mass = Math.max(10, cell.mass - cell.mass * 0.08 * dt);
            cell.radius = massToRadius(cell.mass);
          }
        });
      }

      // 3. プレイヤー細胞の重心と広がりを計算 (カメラ追従 & ズーム)
      const playerCells = cellsRef.current.filter((c) => c.isPlayer);
      if (playerCells.length === 0) {
        triggerGameOver(false);
        return;
      }

      let pCenterX = 0;
      let pCenterY = 0;
      let totalPlayerMass = 0;
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;

      playerCells.forEach((c) => {
        pCenterX += c.x * c.mass;
        pCenterY += c.y * c.mass;
        totalPlayerMass += c.mass;
        minX = Math.min(minX, c.x - c.radius);
        maxX = Math.max(maxX, c.x + c.radius);
        minY = Math.min(minY, c.y - c.radius);
        maxY = Math.max(maxY, c.y + c.radius);
      });

      pCenterX /= totalPlayerMass;
      pCenterY /= totalPlayerMass;
      gameStatsRef.current.currentMass = totalPlayerMass;
      if (totalPlayerMass > gameStatsRef.current.maxMass) {
        gameStatsRef.current.maxMass = totalPlayerMass;
      }

      // ズーム倍率の計算 (細胞の広がり + 質量に応じてズームアウト)
      const spreadW = Math.max(maxX - minX + 200, 400);
      const spreadH = Math.max(maxY - minY + 200, 300);
      const massScaleFactor = Math.pow(Math.min(totalPlayerMass, 8000), 0.35);
      const fitZoom = Math.min(screenW / spreadW, screenH / spreadH, 1.2);
      const baseZoom = Math.max(0.24, Math.min(fitZoom, 1.0 / (1 + massScaleFactor * 0.035)));
      const desiredZoom = Math.max(0.18, Math.min(2.0, baseZoom * cameraRef.current.manualZoomFactor));

      // Lerp (滑らかなカメラ追従)
      cameraRef.current.x += (pCenterX - cameraRef.current.x) * 0.12;
      cameraRef.current.y += (pCenterY - cameraRef.current.y) * 0.12;
      cameraRef.current.zoom += (desiredZoom - cameraRef.current.zoom) * 0.08;

      const cam = cameraRef.current;

      // 4. 入力によるプレイヤー細胞の移動制御
      const mouseScreenX = mousePosRef.current.x;
      const mouseScreenY = mousePosRef.current.y;
      // スクリーン座標からワールド座標への変換
      const targetWorldX = cam.x + (mouseScreenX - screenW / 2) / cam.zoom;
      const targetWorldY = cam.y + (mouseScreenY - screenH / 2) / cam.zoom;

      playerCells.forEach((c) => {
        const dx = targetWorldX - c.x;
        const dy = targetWorldY - c.y;
        const dist = Math.hypot(dx, dy);
        const speed = massToSpeed(c.mass);

        if (dist > 5) {
          const moveRatio = Math.min(1, dist / 150);
          c.vx = (dx / dist) * speed * moveRatio;
          c.vy = (dy / dist) * speed * moveRatio;
        } else {
          c.vx = 0;
          c.vy = 0;
        }
      });

      // 5. Bot AI の更新
      const now = Date.now();
      botsRef.current.forEach((bot) => {
        if (!bot.isAlive) {
          bot.respawnTimer -= dt;
          if (bot.respawnTimer <= 0) {
            // リスポーン
            bot.isAlive = true;
            const rx = Math.random() * (MAP_SIZE - 400) + 200;
            const ry = Math.random() * (MAP_SIZE - 400) + 200;
            const rMass = 20 + Math.random() * 35;
            cellsRef.current.push({
              id: nextEntityIdRef.current++,
              ownerId: bot.id,
              isPlayer: false,
              name: bot.name,
              skin: bot.skin,
              x: rx,
              y: ry,
              vx: 0,
              vy: 0,
              boostVx: 0,
              boostVy: 0,
              mass: rMass,
              radius: massToRadius(rMass),
              canMergeAt: 0,
              wobblePhase: Math.random() * Math.PI * 2,
              wobbleSpeed: 0.08,
            });
          }
          return;
        }

        const botCells = cellsRef.current.filter((c) => c.ownerId === bot.id);
        if (botCells.length === 0) {
          bot.isAlive = false;
          bot.respawnTimer = 3 + Math.random() * 3; // 3〜6秒後にリスポーン
          return;
        }

        // 最も大きなBot細胞を主導にAI思考
        const mainBotCell = botCells.reduce((a, b) => (a.mass > b.mass ? a : b));

        bot.retargetTimer -= dt;
        bot.splitCooldown -= dt;

        if (bot.retargetTimer <= 0) {
          bot.retargetTimer = 0.5 + Math.random() * 0.8;

          let bestThreat: Cell | null = null;
          let bestPrey: Cell | null = null;
          let minThreatDist = 550;
          let minPreyDist = 600;

          // 周囲の細胞スキャン
          for (const other of cellsRef.current) {
            if (other.ownerId === bot.id) continue;
            const dist = Math.hypot(other.x - mainBotCell.x, other.y - mainBotCell.y);

            // 脅威: 相手が自分の1.15倍以上大きい
            if (other.mass > mainBotCell.mass * 1.15) {
              if (dist < minThreatDist) {
                minThreatDist = dist;
                bestThreat = other;
              }
            }
            // 獲物: 自分が相手の1.15倍以上大きい
            else if (mainBotCell.mass > other.mass * 1.15) {
              if (dist < minPreyDist) {
                minPreyDist = dist;
                bestPrey = other;
              }
            }
          }

          if (bestThreat) {
            // 脅威から反対方向へ逃げる
            const escapeDx = mainBotCell.x - bestThreat.x;
            const escapeDy = mainBotCell.y - bestThreat.y;
            const escapeDist = Math.hypot(escapeDx, escapeDy) || 1;
            bot.targetX = mainBotCell.x + (escapeDx / escapeDist) * 800;
            bot.targetY = mainBotCell.y + (escapeDy / escapeDist) * 800;
          } else if (bestPrey) {
            // 獲物を追う
            bot.targetX = bestPrey.x;
            bot.targetY = bestPrey.y;

            // スプリット奇襲チャンス判定 (AI Split)
            if (
              bot.splitCooldown <= 0 &&
              botCells.length < 4 &&
              mainBotCell.mass >= MIN_SPLIT_MASS * 1.8 &&
              mainBotCell.mass / 2 > bestPrey.mass * 1.15 &&
              minPreyDist < 280
            ) {
              bot.splitCooldown = 15 + Math.random() * 10;
              // Bot Split実行
              const halfMass = mainBotCell.mass / 2;
              mainBotCell.mass = halfMass;
              mainBotCell.radius = massToRadius(halfMass);

              const splitDx = bestPrey.x - mainBotCell.x;
              const splitDy = bestPrey.y - mainBotCell.y;
              const sDist = Math.hypot(splitDx, splitDy) || 1;
              const sDirX = splitDx / sDist;
              const sDirY = splitDy / sDist;

              const mergeCooldown = (MERGE_BASE_COOLDOWN + halfMass * 0.02) * 1000;
              mainBotCell.canMergeAt = now + mergeCooldown;

              cellsRef.current.push({
                id: nextEntityIdRef.current++,
                ownerId: bot.id,
                isPlayer: false,
                name: bot.name,
                skin: bot.skin,
                x: mainBotCell.x + sDirX * (mainBotCell.radius + 10),
                y: mainBotCell.y + sDirY * (mainBotCell.radius + 10),
                vx: mainBotCell.vx,
                vy: mainBotCell.vy,
                boostVx: sDirX * 24,
                boostVy: sDirY * 24,
                mass: halfMass,
                radius: massToRadius(halfMass),
                canMergeAt: now + mergeCooldown,
                wobblePhase: Math.random() * Math.PI * 2,
                wobbleSpeed: 0.1,
              });
            }
          } else {
            // エサを探して移動 (またはランダム巡回)
            bot.targetX = Math.max(100, Math.min(MAP_SIZE - 100, bot.targetX + (Math.random() - 0.5) * 600));
            bot.targetY = Math.max(100, Math.min(MAP_SIZE - 100, bot.targetY + (Math.random() - 0.5) * 600));
          }
        }

        // Bot各細胞をターゲットに向けて前進
        botCells.forEach((bc) => {
          const dx = bot.targetX - bc.x;
          const dy = bot.targetY - bc.y;
          const dist = Math.hypot(dx, dy) || 1;
          const speed = massToSpeed(bc.mass);
          bc.vx = (dx / dist) * speed;
          bc.vy = (dy / dist) * speed;
        });
      });

      // 6. 物理挙動更新 (Boost減速・細胞間反発・再合体)
      cellsRef.current.forEach((cell) => {
        // スプリット時のブースト速度を摩擦減衰
        cell.x += cell.boostVx * dt * 60;
        cell.y += cell.boostVy * dt * 60;
        cell.boostVx *= Math.pow(0.88, dt * 60);
        cell.boostVy *= Math.pow(0.88, dt * 60);
        if (Math.hypot(cell.boostVx, cell.boostVy) < 0.2) {
          cell.boostVx = 0;
          cell.boostVy = 0;
        }

        // 通常移動
        cell.x += cell.vx * dt * 60;
        cell.y += cell.vy * dt * 60;

        // マップ境界制約
        cell.x = Math.max(cell.radius, Math.min(MAP_SIZE - cell.radius, cell.x));
        cell.y = Math.max(cell.radius, Math.min(MAP_SIZE - cell.radius, cell.y));

        // ゼリー状プルプル揺れ
        cell.wobblePhase += cell.wobbleSpeed;
      });

      // 同一オーナーの細胞同士の反発 or 再合体 (Merge)
      for (let i = 0; i < cellsRef.current.length; i++) {
        const c1 = cellsRef.current[i];
        if (!c1) continue;

        for (let j = i + 1; j < cellsRef.current.length; j++) {
          const c2 = cellsRef.current[j];
          if (!c2) continue;

          if (c1.ownerId === c2.ownerId) {
            const dx = c2.x - c1.x;
            const dy = c2.y - c1.y;
            const dist = Math.hypot(dx, dy);
            const minDist = c1.radius + c2.radius;

            if (dist < minDist) {
              const canMerge = now >= c1.canMergeAt && now >= c2.canMergeAt;

              if (canMerge) {
                // 合体！(大きい方が小さい方を吸収)
                if (c1.mass >= c2.mass) {
                  c1.mass += c2.mass;
                  c1.radius = massToRadius(c1.mass);
                  createPopParticles(c2.x, c2.y, c2.skin.color, 8);
                  cellsRef.current.splice(j, 1);
                  j--;
                  if (c1.isPlayer) sound.playAgarioMerge();
                } else {
                  c2.mass += c1.mass;
                  c2.radius = massToRadius(c2.mass);
                  createPopParticles(c1.x, c1.y, c1.skin.color, 8);
                  cellsRef.current.splice(i, 1);
                  i--;
                  if (c2.isPlayer) sound.playAgarioMerge();
                  break;
                }
              } else {
                // まだ合体時間ではないため互いに押し合う (反発物理)
                const overlap = minDist - dist;
                const angle = Math.atan2(dy, dx);
                const pushX = Math.cos(angle) * overlap * 0.5;
                const pushY = Math.sin(angle) * overlap * 0.5;

                c1.x -= pushX * 0.5;
                c1.y -= pushY * 0.5;
                c2.x += pushX * 0.5;
                c2.y += pushY * 0.5;
              }
            }
          }
        }
      }

      // 7. 射出された質量 (Ejected Mass) の移動と判定
      for (let i = ejectedMassesRef.current.length - 1; i >= 0; i--) {
        const em = ejectedMassesRef.current[i];
        em.x += em.vx * dt * 60;
        em.y += em.vy * dt * 60;
        em.vx *= Math.pow(0.92, dt * 60);
        em.vy *= Math.pow(0.92, dt * 60);

        // トゲ (Virus) への衝突判定 (Virus Feeding)
        let eatenByVirus = false;
        for (const virus of virusesRef.current) {
          const vDist = Math.hypot(em.x - virus.x, em.y - virus.y);
          if (vDist < virus.radius + em.radius) {
            virus.feedCount++;
            virus.mass += em.mass;
            virus.radius = Math.min(78, virus.radius + 1.2);
            eatenByVirus = true;

            // 7回フィードされるとトゲが弾丸のように分裂射出！(Virus Shoot技)
            if (virus.feedCount >= 7) {
              virus.feedCount = 0;
              virus.mass = 100;
              virus.radius = 54;

              const shotAngle = Math.atan2(em.vy, em.vx);
              const newVx = Math.cos(shotAngle) * 22;
              const newVy = Math.sin(shotAngle) * 22;

              virusesRef.current.push({
                id: nextEntityIdRef.current++,
                x: virus.x + Math.cos(shotAngle) * 80,
                y: virus.y + Math.sin(shotAngle) * 80,
                mass: 100,
                radius: 54,
                feedCount: 0,
                feedDirectionX: newVx,
                feedDirectionY: newVy,
              });

              sound.playAgarioSplit();
              createPopParticles(virus.x, virus.y, '#22c55e', 20);
            }
            break;
          }
        }

        if (eatenByVirus) {
          ejectedMassesRef.current.splice(i, 1);
          continue;
        }

        // 細胞による捕食判定
        let eatenByCell = false;
        for (const cell of cellsRef.current) {
          const cDist = Math.hypot(em.x - cell.x, em.y - cell.y);
          if (cDist < cell.radius) {
            cell.mass += em.mass;
            cell.radius = massToRadius(cell.mass);
            eatenByCell = true;
            if (cell.isPlayer) sound.playAgarioPelletEat();
            break;
          }
        }

        if (eatenByCell) {
          ejectedMassesRef.current.splice(i, 1);
        }
      }

      // 8. ペレット (エサ) の捕食判定
      for (const cell of cellsRef.current) {
        for (let i = 0; i < pelletsRef.current.length; i++) {
          const pellet = pelletsRef.current[i];
          const dist = Math.hypot(cell.x - pellet.x, cell.y - pellet.y);
          if (dist < cell.radius) {
            cell.mass += pellet.mass;
            cell.radius = massToRadius(cell.mass);

            if (cell.isPlayer) {
              sound.playAgarioPelletEat();
            }

            // 食べたペレットをマップ上の新位置に再生成
            pellet.x = Math.random() * (MAP_SIZE - 200) + 100;
            pellet.y = Math.random() * (MAP_SIZE - 200) + 100;
            pellet.color = PELLET_COLORS[Math.floor(Math.random() * PELLET_COLORS.length)];
          }
        }
      }

      // 9. トゲ (Virus) との衝突判定 (爆散分裂ギミック)
      for (let vIdx = virusesRef.current.length - 1; vIdx >= 0; vIdx--) {
        const virus = virusesRef.current[vIdx];

        // 射出されたトゲの移動
        if (virus.feedDirectionX || virus.feedDirectionY) {
          virus.x += virus.feedDirectionX * dt * 60;
          virus.y += virus.feedDirectionY * dt * 60;
          virus.feedDirectionX *= 0.94;
          virus.feedDirectionY *= 0.94;
          if (Math.hypot(virus.feedDirectionX, virus.feedDirectionY) < 0.2) {
            virus.feedDirectionX = 0;
            virus.feedDirectionY = 0;
          }
        }

        for (let cIdx = cellsRef.current.length - 1; cIdx >= 0; cIdx--) {
          const cell = cellsRef.current[cIdx];
          if (!cell) continue;

          // トゲより10%以上大きい細胞がトゲに接触した場合 -> 強制大爆散！
          if (cell.mass > virus.mass * 1.1) {
            const dist = Math.hypot(cell.x - virus.x, cell.y - virus.y);
            if (dist < cell.radius) {
              sound.playAgarioVirusPop();
              createPopParticles(virus.x, virus.y, '#22c55e', 24);

              // 持ち主の現在の細胞数を考慮して最大16個まで分裂爆散
              const currentOwnerCells = cellsRef.current.filter((c) => c.ownerId === cell.ownerId).length;
              const piecesToAdd = Math.min(15, MAX_CELLS_PER_PLAYER - currentOwnerCells);

              if (piecesToAdd > 1) {
                const pieceMass = Math.max(15, cell.mass / (piecesToAdd + 1));
                cell.mass = pieceMass;
                cell.radius = massToRadius(pieceMass);
                cell.canMergeAt = now + (MERGE_BASE_COOLDOWN + 10) * 1000;

                for (let k = 0; k < piecesToAdd; k++) {
                  const angle = Math.random() * Math.PI * 2;
                  const popSpeed = 16 + Math.random() * 12;
                  cellsRef.current.push({
                    id: nextEntityIdRef.current++,
                    ownerId: cell.ownerId,
                    isPlayer: cell.isPlayer,
                    name: cell.name,
                    skin: cell.skin,
                    x: cell.x + Math.cos(angle) * (cell.radius + 15),
                    y: cell.y + Math.sin(angle) * (cell.radius + 15),
                    vx: 0,
                    vy: 0,
                    boostVx: Math.cos(angle) * popSpeed,
                    boostVy: Math.sin(angle) * popSpeed,
                    mass: pieceMass,
                    radius: massToRadius(pieceMass),
                    canMergeAt: now + (MERGE_BASE_COOLDOWN + 10) * 1000,
                    wobblePhase: Math.random() * Math.PI * 2,
                    wobbleSpeed: 0.14,
                  });
                }
              }

              // トゲを新しい場所に再配置
              virus.x = Math.random() * (MAP_SIZE - 400) + 200;
              virus.y = Math.random() * (MAP_SIZE - 400) + 200;
              virus.feedCount = 0;
              break;
            }
          }
        }
      }

      // 10. 細胞同士の捕食判定 (Agar.io公式ルール: 質量1.1倍以上で捕食可能)
      for (let i = 0; i < cellsRef.current.length; i++) {
        const predator = cellsRef.current[i];
        if (!predator) continue;

        for (let j = 0; j < cellsRef.current.length; j++) {
          if (i === j) continue;
          const prey = cellsRef.current[j];
          if (!prey) continue;

          // 同一オーナーの細胞は前述の反発/合体処理で行うため除外
          if (predator.ownerId === prey.ownerId) continue;

          // 捕食条件: 質量が相手の1.1倍以上、かつプレデターの内側にプレイの中心が深く重なっている
          if (predator.mass > prey.mass * 1.1) {
            const dx = prey.x - predator.x;
            const dy = prey.y - predator.y;
            const dist = Math.hypot(dx, dy);

            // 獲物が捕食者の半径の内側に十分入ったら
            if (dist < predator.radius - prey.radius / 3) {
              // 捕食成立！
              predator.mass += prey.mass;
              predator.radius = massToRadius(predator.mass);

              createPopParticles(prey.x, prey.y, prey.skin.color, 14);

              if (predator.isPlayer) {
                sound.playAgarioCellEat();
                gameStatsRef.current.kills++;
                addFloatingText(prey.x, prey.y, `+${Math.floor(prey.mass)}`, '#4ade80');
                addKillFeed(predator.name, prey.name);
              } else if (prey.isPlayer) {
                // プレイヤーの細胞が食われた
                addKillFeed(predator.name, prey.name);
              }

              // 獲物細胞を削除
              cellsRef.current.splice(j, 1);
              if (j < i) i--;
              j--;
            }
          }
        }
      }

      // 11. パーティクル & 浮遊テキスト更新
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.95;
        p.vy *= 0.95;
        p.life++;
        p.alpha = 1 - p.life / p.maxLife;
        if (p.life >= p.maxLife) {
          particlesRef.current.splice(i, 1);
        }
      }

      for (let i = floatingTextsRef.current.length - 1; i >= 0; i--) {
        const ft = floatingTextsRef.current[i];
        ft.y -= 1.2;
        ft.alpha -= 0.025;
        ft.scale = Math.max(1, ft.scale - 0.01);
        if (ft.alpha <= 0) {
          floatingTextsRef.current.splice(i, 1);
        }
      }

      // 12. リーダーボード集計 (全プレイヤー & Botの総質量ランキング)
      const ownerMassMap = new Map<number, { name: string; mass: number; isPlayer: boolean; skin: Skin }>();
      cellsRef.current.forEach((c) => {
        const existing = ownerMassMap.get(c.ownerId);
        if (existing) {
          existing.mass += c.mass;
        } else {
          ownerMassMap.set(c.ownerId, {
            name: c.name,
            mass: c.mass,
            isPlayer: c.isPlayer,
            skin: c.skin,
          });
        }
      });

      const sortedLeaderboard: LeaderboardEntry[] = Array.from(ownerMassMap.entries())
        .map(([id, data]) => ({
          id,
          name: data.name,
          mass: Math.floor(data.mass),
          isPlayer: data.isPlayer,
          skin: data.skin,
        }))
        .sort((a, b) => b.mass - a.mass);

      const playerRankIndex = sortedLeaderboard.findIndex((e) => e.isPlayer);
      const playerRank = playerRankIndex >= 0 ? playerRankIndex + 1 : sortedLeaderboard.length + 1;
      if (playerRank < gameStatsRef.current.bestRank) {
        gameStatsRef.current.bestRank = playerRank;
      }

      // 1位到達ファンファーレ演出
      if (playerRank === 1 && !gameStatsRef.current.wasCrownAwarded && sortedLeaderboard.length > 2) {
        gameStatsRef.current.wasCrownAwarded = true;
        sound.playAgarioCrown();
        setCrownNotice(true);
        setTimeout(() => setCrownNotice(false), 3500);
      }

      // バトロワ勝利判定 (生存者がプレイヤーのみ)
      if (gameMode === 'royale' && sortedLeaderboard.length === 1 && sortedLeaderboard[0].isPlayer) {
        triggerGameOver(true);
        return;
      }

      // 定期的なHUDステート反映 (軽量化のため毎秒6回)
      hudUpdateCounter++;
      if (hudUpdateCounter % 10 === 0) {
        setLeaderboard(sortedLeaderboard.slice(0, 10));
        setHudStats({
          currentMass: Math.floor(totalPlayerMass),
          maxMass: Math.floor(gameStatsRef.current.maxMass),
          cellCount: playerCells.length,
          kills: gameStatsRef.current.kills,
          rank: playerRank,
          totalAlive: sortedLeaderboard.length,
          timeElapsed: Math.floor(elapsed),
          timeLeft: Math.max(0, 180 - Math.floor(elapsed)),
          safeZoneRadius: gameStatsRef.current.royaleZoneRadius,
        });
      }

      // ==========================================
      // 13. Canvas レンダリング
      // ==========================================
      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const dpr = window.devicePixelRatio || 1;
      ctx.scale(dpr, dpr);

      // ワールド座標変換 (カメラ中央寄せ & ズーム)
      ctx.save();
      ctx.translate(screenW / 2, screenH / 2);
      ctx.scale(cam.zoom, cam.zoom);
      ctx.translate(-cam.x, -cam.y);

      // 13.1 背景グリッド
      ctx.fillStyle = isDark ? '#090d16' : '#f8fafc';
      ctx.fillRect(0, 0, MAP_SIZE, MAP_SIZE);

      ctx.strokeStyle = isDark ? 'rgba(51, 65, 85, 0.35)' : 'rgba(203, 213, 225, 0.6)';
      ctx.lineWidth = 1;
      const gridSize = 50;

      // 画面内に見える範囲のみグリッド描画
      const viewLeft = Math.max(0, cam.x - (screenW / 2) / cam.zoom - gridSize);
      const viewRight = Math.min(MAP_SIZE, cam.x + (screenW / 2) / cam.zoom + gridSize);
      const viewTop = Math.max(0, cam.y - (screenH / 2) / cam.zoom - gridSize);
      const viewBottom = Math.min(MAP_SIZE, cam.y + (screenH / 2) / cam.zoom + gridSize);

      ctx.beginPath();
      for (let x = Math.floor(viewLeft / gridSize) * gridSize; x <= viewRight; x += gridSize) {
        ctx.moveTo(x, viewTop);
        ctx.lineTo(x, viewBottom);
      }
      for (let y = Math.floor(viewTop / gridSize) * gridSize; y <= viewBottom; y += gridSize) {
        ctx.moveTo(viewLeft, y);
        ctx.lineTo(viewRight, y);
      }
      ctx.stroke();

      // 13.2 マップ境界線 (赤とシアンのネオン外壁)
      ctx.strokeStyle = isDark ? '#06b6d4' : '#0284c7';
      ctx.lineWidth = 12;
      ctx.strokeRect(0, 0, MAP_SIZE, MAP_SIZE);
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 4;
      ctx.strokeRect(6, 6, MAP_SIZE - 12, MAP_SIZE - 12);

      // 13.3 バトルロイヤルセーフゾーン
      if (gameMode === 'royale') {
        const zone = gameStatsRef.current;
        ctx.beginPath();
        ctx.arc(zone.royaleZoneCenter.x, zone.royaleZoneCenter.y, zone.royaleZoneRadius, 0, Math.PI * 2);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 6;
        ctx.stroke();

        // ゾーン外の危険ゾーン網掛け
        ctx.fillStyle = 'rgba(239, 68, 68, 0.08)';
        ctx.fillRect(0, 0, MAP_SIZE, MAP_SIZE);
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(zone.royaleZoneCenter.x, zone.royaleZoneCenter.y, zone.royaleZoneRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 13.4 ペレット (エサ) の描画
      pelletsRef.current.forEach((pellet) => {
        if (
          pellet.x + pellet.radius < viewLeft ||
          pellet.x - pellet.radius > viewRight ||
          pellet.y + pellet.radius < viewTop ||
          pellet.y - pellet.radius > viewBottom
        ) {
          return;
        }
        ctx.beginPath();
        ctx.arc(pellet.x, pellet.y, pellet.radius, 0, Math.PI * 2);
        ctx.fillStyle = pellet.color;
        ctx.fill();
      });

      // 13.5 射出された質量 (Ejected Mass) の描画
      ejectedMassesRef.current.forEach((em) => {
        ctx.beginPath();
        ctx.arc(em.x, em.y, em.radius, 0, Math.PI * 2);
        ctx.fillStyle = em.color;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = em.border;
        ctx.stroke();
      });

      // 13.6 トゲ (Virus) の描画 (ギザギザPolygon)
      virusesRef.current.forEach((virus) => {
        if (
          virus.x + virus.radius < viewLeft ||
          virus.x - virus.radius > viewRight ||
          virus.y + virus.radius < viewTop ||
          virus.y - virus.radius > viewBottom
        ) {
          return;
        }

        ctx.save();
        ctx.translate(virus.x, virus.y);
        ctx.beginPath();
        const spikes = 28;
        const outerR = virus.radius;
        const innerR = virus.radius - 8;
        for (let i = 0; i < spikes * 2; i++) {
          const r = i % 2 === 0 ? outerR : innerR;
          const a = (i * Math.PI) / spikes;
          const px = Math.cos(a) * r;
          const py = Math.sin(a) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = '#22c55e';
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#15803d';
        ctx.stroke();

        // トゲの質量表示
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${Math.floor(virus.mass)}`, 0, 0);

        ctx.restore();
      });

      // 13.7 細胞 (Cells) の描画 (質量順にソートして大きいものが上に見えるように)
      const sortedCells = [...cellsRef.current].sort((a, b) => a.mass - b.mass);

      sortedCells.forEach((cell) => {
        if (
          cell.x + cell.radius < viewLeft ||
          cell.x - cell.radius > viewRight ||
          cell.y + cell.radius < viewTop ||
          cell.y - cell.radius > viewBottom
        ) {
          return;
        }

        ctx.save();
        ctx.translate(cell.x, cell.y);

        // ゼリー状プルプル揺れ輪郭 (Polygon)
        ctx.beginPath();
        const segments = 36;
        for (let i = 0; i < segments; i++) {
          const angle = (i * Math.PI * 2) / segments;
          // 移動速度に応じた歪み + 周期的なサイン波
          const wobble = Math.sin(angle * 4 + cell.wobblePhase) * Math.min(6, cell.radius * 0.04);
          const r = cell.radius + wobble;
          const px = Math.cos(angle) * r;
          const py = Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();

        ctx.fillStyle = cell.skin.color;
        ctx.fill();

        // 輪郭ボーダー
        ctx.lineWidth = Math.max(3, cell.radius * 0.08);
        ctx.strokeStyle = cell.skin.border;
        ctx.stroke();

        // スキン装飾 (絵文字または目玉)
        if (cell.skin.type === 'emoji' && cell.skin.emoji) {
          const emojiSize = Math.max(16, cell.radius * 0.85);
          ctx.font = `${emojiSize}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(cell.skin.emoji, 0, -cell.radius * 0.1);
        } else {
          // 生き生きとしたキョロキョロ目玉 (進行方向を見つめる)
          const eyeDist = cell.radius * 0.38;
          const eyeRadius = Math.max(3.5, cell.radius * 0.2);
          const pupilRadius = eyeRadius * 0.55;

          // 進行方向ベクトル
          const moveLen = Math.hypot(cell.vx, cell.vy) || 1;
          const pupilOffset = Math.min(eyeRadius - pupilRadius, 3);
          const pupilDx = (cell.vx / moveLen) * pupilOffset;
          const pupilDy = (cell.vy / moveLen) * pupilOffset;

          // 左目
          ctx.beginPath();
          ctx.arc(-eyeDist, -cell.radius * 0.18, eyeRadius, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          ctx.beginPath();
          ctx.arc(-eyeDist + pupilDx, -cell.radius * 0.18 + pupilDy, pupilRadius, 0, Math.PI * 2);
          ctx.fillStyle = '#0f172a';
          ctx.fill();

          // 右目
          ctx.beginPath();
          ctx.arc(eyeDist, -cell.radius * 0.18, eyeRadius, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          ctx.beginPath();
          ctx.arc(eyeDist + pupilDx, -cell.radius * 0.18 + pupilDy, pupilRadius, 0, Math.PI * 2);
          ctx.fillStyle = '#0f172a';
          ctx.fill();
        }

        // 1位の場合の王冠 👑 描画
        if (sortedLeaderboard.length > 0 && sortedLeaderboard[0].id === cell.ownerId) {
          const crownY = -cell.radius - 16;
          ctx.font = `${Math.max(20, cell.radius * 0.45)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('👑', 0, crownY);
        }

        // プレイヤー名 & 質量テキスト
        const fontSize = Math.max(12, Math.min(26, cell.radius * 0.35));
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.strokeText(cell.name, 0, cell.radius * 0.28);
        ctx.fillText(cell.name, 0, cell.radius * 0.28);

        // 質量数字
        const massFontSize = Math.max(10, fontSize * 0.75);
        ctx.font = `${massFontSize}px sans-serif`;
        ctx.strokeText(`${Math.floor(cell.mass)}`, 0, cell.radius * 0.28 + fontSize);
        ctx.fillText(`${Math.floor(cell.mass)}`, 0, cell.radius * 0.28 + fontSize);

        ctx.restore();
      });

      // 13.8 パーティクル描画
      particlesRef.current.forEach((p) => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fill();
        ctx.restore();
      });

      // 13.9 浮遊スコアテキスト描画
      floatingTextsRef.current.forEach((ft) => {
        ctx.save();
        ctx.font = `bold ${16 * ft.scale}px sans-serif`;
        ctx.fillStyle = ft.color;
        ctx.globalAlpha = Math.max(0, ft.alpha);
        ctx.textAlign = 'center';
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(0,0,0,0.8)';
        ctx.strokeText(ft.text, ft.x, ft.y);
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      });

      ctx.restore(); // ワールド変換終了

      // ==========================================
      // 14. スクリーンUI描画 (ミニマップ & タッチスティック)
      // ==========================================

      // 14.1 レーダーミニマップ (右下)
      const mapW = 140;
      const mapH = 140;
      const mapMargin = 20;
      const mapX = screenW - mapW - mapMargin;
      const mapY = screenH - mapH - mapMargin;

      ctx.save();
      // ミニマップ背景
      ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.75)' : 'rgba(255, 255, 255, 0.85)';
      ctx.strokeStyle = isDark ? 'rgba(148, 163, 184, 0.3)' : 'rgba(100, 116, 139, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.fillRect(mapX, mapY, mapW, mapH);
      ctx.strokeRect(mapX, mapY, mapW, mapH);

      // バトロワの安全ゾーン
      if (gameMode === 'royale') {
        const zone = gameStatsRef.current;
        const miniCenterX = mapX + (zone.royaleZoneCenter.x / MAP_SIZE) * mapW;
        const miniCenterY = mapY + (zone.royaleZoneCenter.y / MAP_SIZE) * mapH;
        const miniZoneR = (zone.royaleZoneRadius / MAP_SIZE) * mapW;
        ctx.beginPath();
        ctx.arc(miniCenterX, miniCenterY, miniZoneR, 0, Math.PI * 2);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // トゲ (黄緑ドット)
      virusesRef.current.forEach((v) => {
        const mx = mapX + (v.x / MAP_SIZE) * mapW;
        const my = mapY + (v.y / MAP_SIZE) * mapH;
        ctx.beginPath();
        ctx.arc(mx, my, 1.2, 0, Math.PI * 2);
        ctx.fillStyle = '#22c55e';
        ctx.fill();
      });

      // 他Bot細胞 (半透明のグレー/赤)
      cellsRef.current.forEach((c) => {
        if (c.isPlayer) return;
        const mx = mapX + (c.x / MAP_SIZE) * mapW;
        const my = mapY + (c.y / MAP_SIZE) * mapH;
        ctx.beginPath();
        ctx.arc(mx, my, Math.max(1, (c.radius / MAP_SIZE) * mapW * 1.5), 0, Math.PI * 2);
        ctx.fillStyle = c.skin.color;
        ctx.fill();
      });

      // プレイヤー細胞 (目立つシアン/黄色ドット)
      playerCells.forEach((c) => {
        const mx = mapX + (c.x / MAP_SIZE) * mapW;
        const my = mapY + (c.y / MAP_SIZE) * mapH;
        ctx.beginPath();
        ctx.arc(mx, my, Math.max(2.5, (c.radius / MAP_SIZE) * mapW * 2), 0, Math.PI * 2);
        ctx.fillStyle = '#38bdf8';
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
      });

      ctx.restore();

      // 14.2 タッチ操作時の仮想ジョイスティック表示
      if (touchJoystickOriginRef.current && touchJoystickCurrRef.current) {
        const origin = touchJoystickOriginRef.current;
        const curr = touchJoystickCurrRef.current;
        ctx.save();
        // ベース円
        ctx.beginPath();
        ctx.arc(origin.x, origin.y, 45, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 2;
        ctx.fill();
        ctx.stroke();

        // スティックヘッド
        const jDx = curr.x - origin.x;
        const jDy = curr.y - origin.y;
        const jDist = Math.hypot(jDx, jDy);
        const stickMax = 40;
        const stickX = jDist > stickMax ? origin.x + (jDx / jDist) * stickMax : curr.x;
        const stickY = jDist > stickMax ? origin.y + (jDy / jDist) * stickMax : curr.y;

        ctx.beginPath();
        ctx.arc(stickX, stickY, 20, 0, Math.PI * 2);
        ctx.fillStyle = '#38bdf8';
        ctx.fill();
        ctx.restore();
      }

      ctx.restore(); // Canvasルートコンテキスト終了

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [gameState, gameMode, triggerGameOver, isDark]);

  return (
    <div
      className={`relative select-none flex flex-col items-center justify-center overflow-hidden transition-colors duration-300 ${
        isFullscreen
          ? 'w-full h-screen p-0 m-0'
          : 'w-full max-w-6xl mx-auto rounded-3xl shadow-2xl border'
      } ${
        isDark
          ? 'bg-slate-950 text-slate-100 border-slate-800'
          : 'bg-slate-100 text-slate-800 border-slate-200'
      }`}
      style={{ minHeight: isFullscreen ? '100vh' : '840px' }}
    >
      {/* ゲームキャンバス */}
      <canvas
        ref={canvasRef}
        className="w-full h-full absolute inset-0 cursor-crosshair touch-none"
        style={{ width: '100%', height: '100%' }}
      />

      {/* --- プレイ中のHUDオーバーレイ --- */}
      {gameState === 'playing' && (
        <div className="absolute inset-0 pointer-events-none p-4 md:p-6 flex flex-col justify-between">
          {/* 上部ヘッダーバー */}
          <div className="flex items-center justify-between w-full">
            {/* 左上: 戻る & 一時停止 & サウンド */}
            <div className="flex items-center gap-2 pointer-events-auto">
              <button
                onClick={onBackToHub}
                className={`p-2.5 rounded-xl border backdrop-blur-md shadow-md transition hover:scale-105 active:scale-95 ${
                  isDark
                    ? 'bg-slate-900/80 border-slate-700/60 hover:bg-slate-800 text-slate-200'
                    : 'bg-white/80 border-slate-300/80 hover:bg-white text-slate-700'
                }`}
                title="ゲーム一覧へ戻る"
              >
                ✕
              </button>
              <button
                onClick={() => setGameState('paused')}
                className={`p-2.5 rounded-xl border backdrop-blur-md shadow-md transition hover:scale-105 active:scale-95 ${
                  isDark
                    ? 'bg-slate-900/80 border-slate-700/60 hover:bg-slate-800 text-slate-200'
                    : 'bg-white/80 border-slate-300/80 hover:bg-white text-slate-700'
                }`}
                title="ポーズ (P / Esc)"
              >
                <Pause className="w-5 h-5" />
              </button>
              <button
                onClick={toggleMute}
                className={`p-2.5 rounded-xl border backdrop-blur-md shadow-md transition hover:scale-105 active:scale-95 ${
                  isDark
                    ? 'bg-slate-900/80 border-slate-700/60 hover:bg-slate-800 text-slate-200'
                    : 'bg-white/80 border-slate-300/80 hover:bg-white text-slate-700'
                }`}
                title={isMuted ? 'サウンドON' : 'ミュート'}
              >
                {isMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5 text-cyan-400" />}
              </button>
            </div>

            {/* 中央上: ゲームモード別タイマー / キルフィード */}
            <div className="flex flex-col items-center gap-1.5">
              {gameMode === 'timeattack' && (
                <div className="px-4 py-1.5 rounded-full border backdrop-blur-md bg-amber-500/20 border-amber-400/40 text-amber-300 font-bold text-sm md:text-base flex items-center gap-2 shadow-lg animate-pulse">
                  <Timer className="w-4 h-4" />
                  残り時間: {Math.floor(hudStats.timeLeft / 60)}:
                  {(hudStats.timeLeft % 60).toString().padStart(2, '0')}
                </div>
              )}
              {gameMode === 'royale' && (
                <div className="px-4 py-1.5 rounded-full border backdrop-blur-md bg-rose-500/20 border-rose-400/40 text-rose-300 font-bold text-sm md:text-base flex items-center gap-2 shadow-lg">
                  <Swords className="w-4 h-4" />
                  残り生存者: {hudStats.totalAlive} / {BOT_COUNT + 1}
                </div>
              )}

              {/* キルフィード */}
              <div className="flex flex-col items-center gap-1">
                {killFeed.map((item) => (
                  <div
                    key={item.id}
                    className="px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md bg-black/40 border border-white/10 text-white shadow animate-fade-in"
                  >
                    <span className="text-cyan-400">{item.killer}</span>
                    <span className="mx-1 text-slate-400">が</span>
                    <span className="text-rose-400">{item.victim}</span>
                    <span className="text-slate-400"> を捕食！</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 右上: リアルタイムリーダーボード */}
            <div
              className={`w-44 md:w-56 p-3 rounded-2xl border backdrop-blur-md shadow-xl text-xs ${
                isDark
                  ? 'bg-slate-900/85 border-slate-700/60 text-slate-200'
                  : 'bg-white/85 border-slate-300/80 text-slate-800'
              }`}
            >
              <div className="flex items-center justify-between font-bold pb-2 mb-1.5 border-b border-white/10 text-sm">
                <span className="flex items-center gap-1.5 text-amber-400">
                  <Trophy className="w-4 h-4" /> ランキング
                </span>
                <span className="text-xs text-slate-400">TOP 10</span>
              </div>
              <div className="space-y-1">
                {leaderboard.map((entry, index) => {
                  const isTop = index === 0;
                  return (
                    <div
                      key={entry.id}
                      className={`flex items-center justify-between px-2 py-0.5 rounded-md ${
                        entry.isPlayer
                          ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30'
                          : isTop
                          ? 'text-amber-300 font-semibold'
                          : 'text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate max-w-[120px]">
                        <span>{index + 1}.</span>
                        {isTop && <span>👑</span>}
                        <span className="truncate">{entry.name}</span>
                      </div>
                      <span className="font-mono text-[11px] text-right ml-1">{entry.mass}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 王冠演出バナー */}
          {crownNotice && (
            <div className="self-center px-6 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 font-extrabold text-base md:text-xl shadow-2xl flex items-center gap-2 animate-bounce border-2 border-yellow-200">
              <Crown className="w-6 h-6" /> 👑 あなたが第1位（王冠）に君臨しました！ 👑
            </div>
          )}

          {/* 下部ステータスバー & タッチ操作ボタン */}
          <div className="flex items-end justify-between w-full">
            {/* 左下: プレイヤーのステータス情報 */}
            <div
              className={`p-3 md:p-4 rounded-2xl border backdrop-blur-md shadow-xl flex items-center gap-4 text-xs md:text-sm ${
                isDark
                  ? 'bg-slate-900/85 border-slate-700/60 text-slate-200'
                  : 'bg-white/85 border-slate-300/80 text-slate-800'
              }`}
            >
              <div>
                <div className="text-slate-400 text-[10px] md:text-xs">総質量</div>
                <div className="text-cyan-400 font-bold text-base md:text-xl font-mono">
                  {hudStats.currentMass}
                </div>
              </div>
              <div className="w-[1px] h-7 bg-white/10" />
              <div>
                <div className="text-slate-400 text-[10px] md:text-xs">細胞数</div>
                <div className="font-bold text-sm md:text-base font-mono">
                  {hudStats.cellCount} / 16
                </div>
              </div>
              <div className="w-[1px] h-7 bg-white/10" />
              <div>
                <div className="text-slate-400 text-[10px] md:text-xs">キル数</div>
                <div className="text-rose-400 font-bold text-sm md:text-base font-mono">
                  {hudStats.kills}
                </div>
              </div>
              <div className="w-[1px] h-7 bg-white/10" />
              <div>
                <div className="text-slate-400 text-[10px] md:text-xs">現在の順位</div>
                <div className="text-amber-400 font-bold text-sm md:text-base font-mono">
                  #{hudStats.rank}
                </div>
              </div>
            </div>

            {/* 右下: アクションボタン (スマホ用SPLIT & FEED、PCキーガイドも兼ねる) */}
            <div className="flex items-center gap-3 pointer-events-auto">
              <button
                onClick={handleEject}
                className="w-16 h-16 md:w-20 md:h-20 rounded-full border-2 border-amber-400/80 bg-amber-500/40 active:bg-amber-500/70 text-white font-extrabold flex flex-col items-center justify-center shadow-2xl backdrop-blur-md transition transform active:scale-90"
              >
                <span className="text-xs md:text-sm">FEED</span>
                <span className="text-[10px] text-amber-200 font-normal">Wキー</span>
              </button>
              <button
                onClick={handleSplit}
                className="w-16 h-16 md:w-20 md:h-20 rounded-full border-2 border-cyan-400/80 bg-cyan-500/40 active:bg-cyan-500/70 text-white font-extrabold flex flex-col items-center justify-center shadow-2xl backdrop-blur-md transition transform active:scale-90"
              >
                <span className="text-xs md:text-sm">SPLIT</span>
                <span className="text-[10px] text-cyan-200 font-normal">Space</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- メインメニューモーダル --- */}
      {gameState === 'menu' && (
        <div className="absolute inset-0 z-20 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in">
          <div
            className={`w-full max-w-md p-6 md:p-8 rounded-3xl border shadow-2xl flex flex-col gap-6 ${
              isDark
                ? 'bg-slate-900 border-slate-800 text-slate-100'
                : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            {/* タイトル & アイコン */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-rose-500 shadow-lg shadow-cyan-500/30 mb-3 animate-pulse">
                <Globe className="w-9 h-9 text-white" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-400 bg-clip-text text-transparent">
                寒天セル.io (Agar.io)
              </h1>
              <p className="text-xs md:text-sm text-slate-400 mt-1">
                エサを吸い込み巨大化！細胞分裂で敵を捕食せよ！
              </p>
            </div>

            {/* プレイヤー名入力 & スキン表示 */}
            <div className="flex flex-col gap-3">
              <label className="text-xs font-semibold text-slate-400">プレイヤー名</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={playerName}
                  maxLength={16}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="名前を入力"
                  className={`flex-1 px-4 py-2.5 rounded-xl border font-bold text-sm outline-none transition focus:ring-2 focus:ring-cyan-500 ${
                    isDark
                      ? 'bg-slate-800/80 border-slate-700 text-white placeholder-slate-500'
                      : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                  }`}
                />
                <button
                  onClick={() => setShowSkinModal(true)}
                  className={`px-3 py-2 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition hover:scale-105 ${
                    isDark
                      ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                      : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Palette className="w-4 h-4 text-cyan-400" />
                  <span>スキン</span>
                </button>
              </div>

              {/* 選択中スキンプレビュー */}
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 border border-white/10">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shadow-md border-2"
                  style={{
                    backgroundColor: selectedSkin.color,
                    borderColor: selectedSkin.border,
                  }}
                >
                  {selectedSkin.emoji || '👀'}
                </div>
                <div className="text-xs">
                  <div className="font-bold">{selectedSkin.name}</div>
                  <div className="text-slate-400 text-[10px]">スキン選択中</div>
                </div>
              </div>
            </div>

            {/* ゲームモード選択 */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-400">ゲームモード</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setGameMode('ffa')}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition ${
                    gameMode === 'ffa'
                      ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400 shadow-md shadow-cyan-500/20'
                      : isDark
                      ? 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800'
                      : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Globe className="w-4 h-4" />
                  <span>クラシック (FFA)</span>
                </button>
                <button
                  onClick={() => setGameMode('royale')}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition ${
                    gameMode === 'royale'
                      ? 'bg-rose-500/20 border-rose-500 text-rose-400 shadow-md shadow-rose-500/20'
                      : isDark
                      ? 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800'
                      : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Swords className="w-4 h-4" />
                  <span>バトロワ</span>
                </button>
                <button
                  onClick={() => setGameMode('timeattack')}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition ${
                    gameMode === 'timeattack'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-400 shadow-md shadow-amber-500/20'
                      : isDark
                      ? 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800'
                      : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Timer className="w-4 h-4" />
                  <span>3分タイムアタック</span>
                </button>
              </div>
            </div>

            {/* ハイスコアレコード */}
            <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-white/5 border border-white/10 text-center text-xs">
              <div>
                <div className="text-slate-400 text-[10px]">最高質量</div>
                <div className="font-bold text-cyan-400 font-mono">{highMassRecord}</div>
              </div>
              <div>
                <div className="text-slate-400 text-[10px]">最多キル</div>
                <div className="font-bold text-rose-400 font-mono">{bestKillsRecord}</div>
              </div>
              <div>
                <div className="text-slate-400 text-[10px]">最高順位</div>
                <div className="font-bold text-amber-400 font-mono">
                  {bestRankRecord === 99 ? '未記録' : `#${bestRankRecord}`}
                </div>
              </div>
            </div>

            {/* プレイ開始ボタン */}
            <button
              onClick={initGame}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-extrabold text-base md:text-lg shadow-xl shadow-cyan-500/25 flex items-center justify-center gap-2 transition transform active:scale-95"
            >
              <Play className="w-5 h-5 fill-white" />
              <span>バトル開始！</span>
            </button>
          </div>
        </div>
      )}

      {/* --- スキン選択モーダル --- */}
      {showSkinModal && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div
            className={`w-full max-w-lg p-6 rounded-3xl border shadow-2xl flex flex-col gap-5 ${
              isDark
                ? 'bg-slate-900 border-slate-800 text-slate-100'
                : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Palette className="w-5 h-5 text-cyan-400" />
                <span>スキンを選択</span>
              </h2>
              <button
                onClick={() => setShowSkinModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-3 md:grid-cols-4 gap-3 max-h-80 overflow-y-auto p-1">
              {SKINS.map((skin) => {
                const isSelected = selectedSkin.id === skin.id;
                return (
                  <button
                    key={skin.id}
                    onClick={() => {
                      handleSelectSkin(skin);
                      setShowSkinModal(false);
                    }}
                    className={`p-3 rounded-2xl border flex flex-col items-center gap-2 transition hover:scale-105 ${
                      isSelected
                        ? 'border-cyan-400 bg-cyan-500/20 shadow-lg shadow-cyan-500/20 ring-2 ring-cyan-400'
                        : isDark
                        ? 'border-slate-700 bg-slate-800/60 hover:bg-slate-800'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold border-2 shadow"
                      style={{
                        backgroundColor: skin.color,
                        borderColor: skin.border,
                      }}
                    >
                      {skin.emoji || '👀'}
                    </div>
                    <span className="text-[11px] font-semibold text-center leading-tight truncate w-full">
                      {skin.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* --- ポーズモーダル --- */}
      {gameState === 'paused' && (
        <div className="absolute inset-0 z-20 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in">
          <div
            className={`w-full max-w-sm p-6 rounded-3xl border shadow-2xl flex flex-col gap-4 text-center ${
              isDark
                ? 'bg-slate-900 border-slate-800 text-slate-100'
                : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            <h2 className="text-xl font-bold">一時停止中</h2>
            <p className="text-xs text-slate-400">Pキーまたは再開ボタンでゲームに戻ります</p>
            <button
              onClick={() => setGameState('playing')}
              className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-sm shadow-lg shadow-cyan-500/25 transition active:scale-95"
            >
              ゲームを再開
            </button>
            <button
              onClick={initGame}
              className={`w-full py-3 rounded-xl border text-sm font-bold transition active:scale-95 ${
                isDark
                  ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200'
                  : 'border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              リスタート
            </button>
            <button
              onClick={() => setGameState('menu')}
              className={`w-full py-3 rounded-xl border text-sm font-bold transition active:scale-95 ${
                isDark
                  ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200'
                  : 'border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              メニューに戻る
            </button>
          </div>
        </div>
      )}

      {/* --- ゲームオーバー / 勝利モーダル --- */}
      {(gameState === 'gameover' || gameState === 'victory') && (
        <div className="absolute inset-0 z-20 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div
            className={`w-full max-w-md p-6 md:p-8 rounded-3xl border shadow-2xl flex flex-col gap-6 text-center ${
              isDark
                ? 'bg-slate-900 border-slate-800 text-slate-100'
                : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            <div>
              <div className="text-4xl mb-2">
                {gameState === 'victory' ? '👑' : '💥'}
              </div>
              <h2 className="text-2xl md:text-3xl font-black">
                {gameState === 'victory' ? (
                  <span className="text-amber-400">VICTORY ROYALE!</span>
                ) : (
                  <span className="text-rose-400">GAME OVER</span>
                )}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {gameState === 'victory'
                  ? '見事すべてのライバルを飲み込み王者に輝きました！'
                  : '他の巨大細胞に捕食されてしまいました…'}
              </p>
            </div>

            {/* 戦績サマリー */}
            <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 text-left">
              <div>
                <div className="text-slate-400 text-xs">到達最大質量</div>
                <div className="text-cyan-400 font-bold text-xl font-mono">
                  {Math.floor(gameStatsRef.current.maxMass)}
                </div>
              </div>
              <div>
                <div className="text-slate-400 text-xs">捕食キル数</div>
                <div className="text-rose-400 font-bold text-xl font-mono">
                  {gameStatsRef.current.kills}
                </div>
              </div>
              <div>
                <div className="text-slate-400 text-xs">最高順位</div>
                <div className="text-amber-400 font-bold text-xl font-mono">
                  #{gameStatsRef.current.bestRank}
                </div>
              </div>
              <div>
                <div className="text-slate-400 text-xs">生存時間</div>
                <div className="text-slate-200 font-bold text-xl font-mono">
                  {Math.floor(gameStatsRef.current.elapsedTime)} 秒
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={initGame}
                className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-extrabold text-sm md:text-base shadow-xl shadow-cyan-500/25 flex items-center justify-center gap-2 transition active:scale-95"
              >
                <RotateCcw className="w-5 h-5" />
                <span>もう一度プレイ</span>
              </button>
              <button
                onClick={() => setGameState('menu')}
                className={`px-5 py-3.5 rounded-2xl border text-sm font-bold transition active:scale-95 ${
                  isDark
                    ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200'
                    : 'border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                メニュー
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
