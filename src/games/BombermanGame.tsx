import React, { useState, useEffect, useRef, useCallback } from 'react';
import { sound } from '../utils/audio';
import {
  ArrowLeft,
  RotateCcw,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Trophy,
  Swords,
  Sparkles,
  Flame,
  HelpCircle,
} from 'lucide-react';

const HIGH_SCORE_KEY = 'bomberman_high_score';
const BATTLE_WINS_KEY = 'bomberman_battle_wins';
const STAGE_CLEARED_KEY = 'bomberman_stage_cleared';

// 盤面サイズ (奇数推奨: 15x13)
const COLS = 15;
const ROWS = 13;
const TILE_SIZE = 48; // 内部解像度
const CANVAS_WIDTH = COLS * TILE_SIZE; // 720
const CANVAS_HEIGHT = ROWS * TILE_SIZE; // 624

// タイル種別
const TILE = {
  EMPTY: 0,
  HARD_WALL: 1,
  SOFT_BLOCK: 2,
  SUDDEN_WALL: 3,
  DOOR: 4,
} as const;

// アイテム種別 (10種類)
export type ItemType =
  | 'BOMB_UP'
  | 'FIRE_UP'
  | 'SPEED_UP'
  | 'FULL_FIRE'
  | 'BOMB_KICK'
  | 'REMOTE'
  | 'BOMB_PASS'
  | 'BLOCK_PASS'
  | 'STAR'
  | 'SKULL';

interface Item {
  x: number;
  y: number;
  type: ItemType;
  collected: boolean;
}

// 爆弾
interface Bomb {
  id: number;
  gx: number;
  gy: number;
  px: number;
  py: number;
  ownerId: number;
  fireRange: number;
  timer: number;
  maxTimer: number;
  isRemote: boolean;
  vx: number;
  vy: number;
}

// 爆風セル
interface FireCell {
  gx: number;
  gy: number;
  type: 'center' | 'h-mid' | 'h-end' | 'v-mid' | 'v-end';
  timer: number;
  maxTimer: number;
}

// プレイヤー
interface Player {
  id: number; // 0: P1(白), 1: P2/CPU1(黒), 2: P3/CPU2(赤), 3: P4/CPU3(青)
  name: string;
  isCpu: boolean;
  color: string;
  subColor: string;
  x: number;
  y: number;
  dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'IDLE';
  lastMoveDir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
  speed: number;
  bombsMax: number;
  bombsActive: number;
  fireRange: number;
  hasKick: boolean;
  hasRemote: boolean;
  hasBombPass: boolean;
  hasBlockPass: boolean;
  invincibleTimer: number;
  curse: 'SLOW' | 'FAST' | 'AUTO_BOMB' | 'NO_BOMB' | null;
  curseTimer: number;
  isAlive: boolean;
  deathAnimTimer: number;
  wins: number;
  overlapBombIds: Set<number>;
  // CPU制御用状態
  cpuTarget: { gx: number; gy: number } | null;
  cpuMode: 'SAFE' | 'ATTACK' | 'ITEM' | 'BREAK';
  cpuWaitTimer: number;
  cpuNextDir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'IDLE';
}

// モンスター (Stageモード用)
interface Monster {
  id: number;
  type: 'slime' | 'onion' | 'ghost' | 'mecha';
  name: string;
  x: number;
  y: number;
  dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
  speed: number;
  canPassBlock: boolean;
  isAlive: boolean;
  deathTimer: number;
}

// 破片パーティクル
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  isSmoke?: boolean;
}

// 浮遊スコアテキスト
interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  life: number;
}

// サドンデス落下ブロック
interface FallingBlock {
  gx: number;
  gy: number;
  currentY: number;
  targetY: number;
  isLanding: boolean;
}

interface BombermanGameProps {
  onBackToHub: () => void;
  isDark: boolean;
  isFullscreen?: boolean;
}

export const BombermanGame: React.FC<BombermanGameProps> = ({
  onBackToHub,
  isDark,
  isFullscreen = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // ゲーム全体の状態
  const [gameMode, setGameMode] = useState<'battle' | 'stage'>('battle');
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'paused' | 'roundOver' | 'gameOver' | 'stageClear'>('menu');
  const [is2Player, setIs2Player] = useState<boolean>(false);
  const [cpuDifficulty, setCpuDifficulty] = useState<'easy' | 'normal' | 'hard'>('normal');
  const [currentStage, setCurrentStage] = useState<number>(1);
  const [matchScore, setMatchScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  const [battleWins, setBattleWins] = useState<number>(0);
  const [maxStageCleared, setMaxStageCleared] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showHelp, setShowHelp] = useState<boolean>(false);

  // ラウンド情報
  const [roundWinner, setRoundWinner] = useState<string | null>(null);
  const [remainingTime, setRemainingTime] = useState<number>(180); // 秒
  const [isSuddenDeath, setIsSuddenDeath] = useState<boolean>(false);

  // 内部ミュータブルステート
  const stateRef = useRef({
    grid: Array.from({ length: ROWS }, () => Array(COLS).fill(TILE.EMPTY)) as number[][],
    items: [] as Item[],
    bombs: [] as Bomb[],
    fireCells: [] as FireCell[],
    players: [] as Player[],
    monsters: [] as Monster[],
    particles: [] as Particle[],
    floatingTexts: [] as FloatingText[],
    fallingBlocks: [] as FallingBlock[],
    suddenDeathSequence: [] as { gx: number; gy: number }[],
    suddenDeathIndex: 0,
    suddenDeathTick: 0,
    screenShake: 0,
    nextBombId: 1,
    nextTextId: 1,
    doorRevealed: false,
    doorGx: -1,
    doorGy: -1,
    timeLeft: 180,
    timeTimer: 0,
    roundOverTimer: 0,
    autoBombCounter: 0,
  });

  // キー入力管理
  const keysRef = useRef<{ [key: string]: boolean }>({});

  // バーチャルタッチ操作用
  const touchDirRef = useRef<'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'NONE'>('NONE');

  // ハイスコア等の読み込み
  useEffect(() => {
    const sHs = localStorage.getItem(HIGH_SCORE_KEY);
    if (sHs) setHighScore(parseInt(sHs, 10) || 0);

    const sBw = localStorage.getItem(BATTLE_WINS_KEY);
    if (sBw) setBattleWins(parseInt(sBw, 10) || 0);

    const sSc = localStorage.getItem(STAGE_CLEARED_KEY);
    if (sSc) setMaxStageCleared(parseInt(sSc, 10) || 0);
  }, []);

  // BGM開始・停止制御
  useEffect(() => {
    if (gameState === 'playing' && !isMuted) {
      sound.startBombermanBgm();
    } else {
      sound.stopBombermanBgm();
    }
    return () => {
      sound.stopBombermanBgm();
    };
  }, [gameState, isMuted]);

  // サドンデスの落下順（渦巻き状パス）を事前生成
  const generateSpiralOrder = useCallback((): { gx: number; gy: number }[] => {
    const order: { gx: number; gy: number }[] = [];
    let top = 1;
    let bottom = ROWS - 2;
    let left = 1;
    let right = COLS - 2;

    while (top <= bottom && left <= right) {
      // 上辺: left to right
      for (let c = left; c <= right; c++) order.push({ gx: c, gy: top });
      top++;
      // 右辺: top to bottom
      for (let r = top; r <= bottom; r++) order.push({ gx: right, gy: r });
      right--;
      // 下辺: right to left
      if (top <= bottom) {
        for (let c = right; c >= left; c--) order.push({ gx: c, gy: bottom });
        bottom--;
      }
      // 左辺: bottom to top
      if (left <= right) {
        for (let r = bottom; r >= top; r--) order.push({ gx: left, gy: r });
        left++;
      }
    }
    return order;
  }, []);

  // マップ生成とラウンド初期化
  const initRound = useCallback((mode: 'battle' | 'stage', stageNum = 1) => {
    const state = stateRef.current;
    state.bombs = [];
    state.fireCells = [];
    state.particles = [];
    state.floatingTexts = [];
    state.fallingBlocks = [];
    state.suddenDeathIndex = 0;
    state.suddenDeathTick = 0;
    state.screenShake = 0;
    state.doorRevealed = false;
    state.doorGx = -1;
    state.doorGy = -1;
    state.roundOverTimer = 0;
    state.timeLeft = mode === 'battle' ? 180 : 240;
    setRemainingTime(state.timeLeft);
    setIsSuddenDeath(false);
    setRoundWinner(null);

    // グリッド生成
    const newGrid: number[][] = Array.from({ length: ROWS }, () => Array(COLS).fill(TILE.EMPTY));
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        // 外周はハード壁
        if (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1) {
          newGrid[r][c] = TILE.HARD_WALL;
        }
        // 偶数行・偶数列はハード壁の柱
        else if (r % 2 === 0 && c % 2 === 0) {
          newGrid[r][c] = TILE.HARD_WALL;
        }
      }
    }

    // プレイヤーの初期スポーン地点（4隅）
    const spawnPoints = [
      { gx: 1, gy: 1 },
      { gx: COLS - 2, gy: ROWS - 2 },
      { gx: COLS - 2, gy: 1 },
      { gx: 1, gy: ROWS - 2 },
    ];

    // スポーン周辺の保護マス
    const safeZones = new Set<string>();
    spawnPoints.forEach((sp) => {
      safeZones.add(`${sp.gx},${sp.gy}`);
      safeZones.add(`${sp.gx + 1},${sp.gy}`);
      safeZones.add(`${sp.gx - 1},${sp.gy}`);
      safeZones.add(`${sp.gx},${sp.gy + 1}`);
      safeZones.add(`${sp.gx},${sp.gy - 1}`);
    });

    // ソフトブロックの配置
    const newItems: Item[] = [];
    const softBlockPositions: { x: number; y: number }[] = [];
    const softBlockDensity = mode === 'battle' ? 0.65 : 0.55;

    for (let r = 1; r < ROWS - 1; r++) {
      for (let c = 1; c < COLS - 1; c++) {
        if (newGrid[r][c] === TILE.EMPTY && !safeZones.has(`${c},${r}`)) {
          if (Math.random() < softBlockDensity) {
            newGrid[r][c] = TILE.SOFT_BLOCK;
            softBlockPositions.push({ x: c, y: r });
          }
        }
      }
    }

    // アイテムプール
    const itemPool: ItemType[] = [
      'BOMB_UP', 'BOMB_UP', 'BOMB_UP', 'BOMB_UP',
      'FIRE_UP', 'FIRE_UP', 'FIRE_UP', 'FIRE_UP',
      'SPEED_UP', 'SPEED_UP', 'SPEED_UP',
      'BOMB_KICK', 'BOMB_KICK',
      'REMOTE',
      'BOMB_PASS',
      'BLOCK_PASS',
      'FULL_FIRE',
      'STAR',
      'SKULL',
    ];

    for (let i = itemPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [itemPool[i], itemPool[j]] = [itemPool[j], itemPool[i]];
    }

    const numItems = Math.min(itemPool.length, Math.floor(softBlockPositions.length * 0.38));
    for (let i = 0; i < numItems; i++) {
      const pos = softBlockPositions[i];
      newItems.push({
        x: pos.x,
        y: pos.y,
        type: itemPool[i % itemPool.length],
        collected: false,
      });
    }

    if (mode === 'stage' && softBlockPositions.length > 0) {
      const doorIndex = Math.floor(Math.random() * softBlockPositions.length);
      const doorPos = softBlockPositions[doorIndex];
      state.doorGx = doorPos.x;
      state.doorGy = doorPos.y;
    }

    state.grid = newGrid;
    state.items = newItems;

    const playerConfigs = [
      { id: 0, name: 'P1 (白ボン)', isCpu: false, color: '#f8fafc', subColor: '#38bdf8' },
      { id: 1, name: is2Player ? 'P2 (黒ボン)' : 'CPU 1 (黒ボン)', isCpu: !is2Player, color: '#1e293b', subColor: '#a855f7' },
      { id: 2, name: 'CPU 2 (赤ボン)', isCpu: true, color: '#ef4444', subColor: '#fb923c' },
      { id: 3, name: 'CPU 3 (青ボン)', isCpu: true, color: '#3b82f6', subColor: '#22d3ee' },
    ];

    if (mode === 'battle') {
      state.players = playerConfigs.map((cfg, idx) => {
        const sp = spawnPoints[idx];
        const existingPlayer = state.players.find((p) => p.id === cfg.id);
        const cpuSpeed = cfg.isCpu
          ? cpuDifficulty === 'hard'
            ? 2.85
            : cpuDifficulty === 'normal'
            ? 2.6
            : 2.3
          : 2.6;
        const initBombsMax = cfg.isCpu && cpuDifficulty === 'hard' ? 2 : 1;

        return {
          id: cfg.id,
          name: cfg.name,
          isCpu: cfg.isCpu,
          color: cfg.color,
          subColor: cfg.subColor,
          x: sp.gx * TILE_SIZE + TILE_SIZE / 2,
          y: sp.gy * TILE_SIZE + TILE_SIZE / 2,
          dir: 'IDLE',
          lastMoveDir: idx === 0 ? 'DOWN' : idx === 1 ? 'UP' : idx === 2 ? 'DOWN' : 'UP',
          speed: cpuSpeed,
          bombsMax: initBombsMax,
          bombsActive: 0,
          fireRange: 2,
          hasKick: false,
          hasRemote: false,
          hasBombPass: false,
          hasBlockPass: false,
          invincibleTimer: 60,
          curse: null,
          curseTimer: 0,
          isAlive: true,
          deathAnimTimer: 0,
          wins: existingPlayer ? existingPlayer.wins : 0,
          overlapBombIds: new Set<number>(),
          cpuTarget: null,
          cpuMode: 'BREAK',
          cpuWaitTimer: 0,
          cpuNextDir: 'IDLE',
        };
      });
      state.monsters = [];
    } else {
      state.players = [
        {
          id: 0,
          name: 'P1 (白ボン)',
          isCpu: false,
          color: '#f8fafc',
          subColor: '#38bdf8',
          x: spawnPoints[0].gx * TILE_SIZE + TILE_SIZE / 2,
          y: spawnPoints[0].gy * TILE_SIZE + TILE_SIZE / 2,
          dir: 'IDLE',
          lastMoveDir: 'DOWN',
          speed: 2.6,
          bombsMax: 1 + Math.floor((stageNum - 1) / 2),
          bombsActive: 0,
          fireRange: 2 + Math.floor((stageNum - 1) / 3),
          hasKick: stageNum >= 2,
          hasRemote: stageNum >= 4,
          hasBombPass: false,
          hasBlockPass: false,
          invincibleTimer: 90,
          curse: null,
          curseTimer: 0,
          isAlive: true,
          deathAnimTimer: 0,
          wins: 0,
          overlapBombIds: new Set<number>(),
          cpuTarget: null,
          cpuMode: 'BREAK',
          cpuWaitTimer: 0,
          cpuNextDir: 'IDLE',
        },
      ];

      const newMonsters: Monster[] = [];
      const monsterCount = 3 + stageNum * 2;
      const types: ('slime' | 'onion' | 'ghost' | 'mecha')[] = ['slime'];
      if (stageNum >= 2) types.push('onion');
      if (stageNum >= 3) types.push('ghost');
      if (stageNum >= 4) types.push('mecha');

      let placed = 0;
      let tries = 0;
      while (placed < monsterCount && tries < 200) {
        tries++;
        const mx = Math.floor(Math.random() * (COLS - 2)) + 1;
        const my = Math.floor(Math.random() * (ROWS - 2)) + 1;
        const dist = Math.abs(mx - 1) + Math.abs(my - 1);
        if (dist > 5 && newGrid[my][mx] === TILE.EMPTY) {
          const mType = types[Math.floor(Math.random() * types.length)];
          newMonsters.push({
            id: placed + 1,
            type: mType,
            name: mType.toUpperCase(),
            x: mx * TILE_SIZE + TILE_SIZE / 2,
            y: my * TILE_SIZE + TILE_SIZE / 2,
            dir: ['UP', 'DOWN', 'LEFT', 'RIGHT'][Math.floor(Math.random() * 4)] as any,
            speed: mType === 'onion' ? 2.2 : mType === 'mecha' ? 2.0 : 1.4,
            canPassBlock: mType === 'ghost',
            isAlive: true,
            deathTimer: 0,
          });
          placed++;
        }
      }
      state.monsters = newMonsters;
    }

    state.suddenDeathSequence = generateSpiralOrder();
    setGameState('playing');
  }, [generateSpiralOrder, is2Player]);

  const handleStartGame = (mode: 'battle' | 'stage') => {
    setGameMode(mode);
    setMatchScore(0);
    stateRef.current.players = [];
    if (mode === 'stage') {
      setCurrentStage(1);
      initRound('stage', 1);
    } else {
      initRound('battle');
    }
  };

  const toggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev;
      sound.setMuted(next);
      return next;
    });
  };

  const togglePause = () => {
    if (gameState === 'playing') {
      setGameState('paused');
    } else if (gameState === 'paused') {
      setGameState('playing');
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Space'].includes(e.key)) {
        e.preventDefault();
      }
      keysRef.current[e.key] = true;
      keysRef.current[e.code] = true;

      if (e.key === 'p' || e.key === 'P') {
        togglePause();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key] = false;
      keysRef.current[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState]);

  const addFloatingText = (x: number, y: number, text: string, color: string) => {
    const state = stateRef.current;
    state.floatingTexts.push({
      id: state.nextTextId++,
      x,
      y,
      text,
      color,
      alpha: 1.0,
      life: 50,
    });
  };

  const spawnExplosionParticles = (x: number, y: number, color: string, count = 12) => {
    const state = stateRef.current;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 1.5;
      state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 6 + 4,
        color,
        alpha: 1.0,
        life: 25 + Math.random() * 15,
        maxLife: 40,
        isSmoke: Math.random() < 0.35,
      });
    }
  };

  const tryPlaceBomb = useCallback((player: Player) => {
    const state = stateRef.current;
    if (!player.isAlive || player.curse === 'NO_BOMB') return;
    if (player.bombsActive >= player.bombsMax) return;

    const gx = Math.floor(player.x / TILE_SIZE);
    const gy = Math.floor(player.y / TILE_SIZE);

    const bombExists = state.bombs.some((b) => b.gx === gx && b.gy === gy);
    if (bombExists) return;

    if (state.grid[gy][gx] === TILE.HARD_WALL || state.grid[gy][gx] === TILE.SOFT_BLOCK || state.grid[gy][gx] === TILE.SUDDEN_WALL) {
      return;
    }

    const cellCenterX = gx * TILE_SIZE + TILE_SIZE / 2;
    const cellCenterY = gy * TILE_SIZE + TILE_SIZE / 2;

    // プレイヤーの位置をマス中心にスナップ（四方の壁との間に均等な安全マージンを確保）
    player.x = cellCenterX;
    player.y = cellCenterY;

    const newBomb: Bomb = {
      id: state.nextBombId++,
      gx,
      gy,
      px: cellCenterX,
      py: cellCenterY,
      ownerId: player.id,
      fireRange: player.fireRange,
      timer: 150,
      maxTimer: 150,
      isRemote: player.hasRemote,
      vx: 0,
      vy: 0,
    };
    state.bombs.push(newBomb);

    // 設置者は無条件で離脱猶予を保持
    player.overlapBombIds.add(newBomb.id);

    // その他のプレイヤーで、このボムマスに重なっている者にも通過権を付与
    state.players.forEach((p) => {
      if (p.isAlive && p.id !== player.id) {
        const dist = Math.hypot(p.x - cellCenterX, p.y - cellCenterY);
        if (dist < TILE_SIZE * 0.75) {
          p.overlapBombIds.add(newBomb.id);
        }
      }
    });

    player.bombsActive++;
    sound.playBombDrop();
  }, []);

  const triggerRemoteDetonation = useCallback((player: Player) => {
    const state = stateRef.current;
    if (!player.isAlive || !player.hasRemote) return;

    state.bombs.forEach((b) => {
      if (b.ownerId === player.id && b.isRemote) {
        b.timer = 1;
      }
    });
  }, []);

  const triggerExplosion = useCallback((bomb: Bomb) => {
    const state = stateRef.current;
    sound.playBombExplode();
    state.screenShake = 12;

    const owner = state.players.find((p) => p.id === bomb.ownerId);
    if (owner && owner.bombsActive > 0) {
      owner.bombsActive--;
    }

    const affectedCells: FireCell[] = [
      { gx: bomb.gx, gy: bomb.gy, type: 'center', timer: 30, maxTimer: 30 },
    ];

    spawnExplosionParticles(
      bomb.gx * TILE_SIZE + TILE_SIZE / 2,
      bomb.gy * TILE_SIZE + TILE_SIZE / 2,
      '#f97316',
      16
    );

    const directions = [
      { dx: 0, dy: -1, midType: 'v-mid', endType: 'v-end' },
      { dx: 0, dy: 1, midType: 'v-mid', endType: 'v-end' },
      { dx: -1, dy: 0, midType: 'h-mid', endType: 'h-end' },
      { dx: 1, dy: 0, midType: 'h-mid', endType: 'h-end' },
    ] as const;

    directions.forEach(({ dx, dy, midType, endType }) => {
      for (let dist = 1; dist <= bomb.fireRange; dist++) {
        const cx = bomb.gx + dx * dist;
        const cy = bomb.gy + dy * dist;

        if (cx < 0 || cx >= COLS || cy < 0 || cy >= ROWS) break;

        const tile = state.grid[cy][cx];

        if (tile === TILE.HARD_WALL || tile === TILE.SUDDEN_WALL) {
          break;
        }

        if (tile === TILE.SOFT_BLOCK) {
          state.grid[cy][cx] = TILE.EMPTY;
          sound.playBlockDestroy();
          spawnExplosionParticles(
            cx * TILE_SIZE + TILE_SIZE / 2,
            cy * TILE_SIZE + TILE_SIZE / 2,
            '#f59e0b',
            14
          );

          if (cx === state.doorGx && cy === state.doorGy) {
            state.grid[cy][cx] = TILE.DOOR;
            state.doorRevealed = true;
            addFloatingText(
              cx * TILE_SIZE + TILE_SIZE / 2,
              cy * TILE_SIZE + TILE_SIZE / 2,
              'EXIT UNLOCKED!',
              '#10b981'
            );
          }

          affectedCells.push({
            gx: cx,
            gy: cy,
            type: dist === bomb.fireRange ? (endType as any) : (midType as any),
            timer: 30,
            maxTimer: 30,
          });
          break;
        }

        affectedCells.push({
          gx: cx,
          gy: cy,
          type: dist === bomb.fireRange ? (endType as any) : (midType as any),
          timer: 30,
          maxTimer: 30,
        });

        const itemIdx = state.items.findIndex((item) => item.x === cx && item.y === cy && !item.collected);
        if (itemIdx !== -1) {
          state.items[itemIdx].collected = true;
          spawnExplosionParticles(
            cx * TILE_SIZE + TILE_SIZE / 2,
            cy * TILE_SIZE + TILE_SIZE / 2,
            '#ef4444',
            8
          );
        }

        const hitBomb = state.bombs.find((b) => b.gx === cx && b.gy === cy && b.id !== bomb.id);
        if (hitBomb) {
          hitBomb.timer = Math.min(hitBomb.timer, 1);
        }
      }
    });

    state.fireCells.push(...affectedCells);
  }, []);

  const moveEntityWithSliding = useCallback(
    (
      entity: {
        x: number;
        y: number;
        speed: number;
        hasBlockPass?: boolean;
        hasBombPass?: boolean;
        id?: number;
        overlapBombIds?: Set<number>;
      },
      desiredDir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'IDLE'
    ) => {
      if (desiredDir === 'IDLE') return;

      const state = stateRef.current;
      const speed = entity.speed;

      // 通行可能判定
      const canPass = (gx: number, gy: number): boolean => {
        if (gx < 0 || gx >= COLS || gy < 0 || gy >= ROWS) return false;
        const tile = state.grid[gy][gx];
        if (tile === TILE.HARD_WALL || tile === TILE.SUDDEN_WALL) return false;
        if (tile === TILE.SOFT_BLOCK && !entity.hasBlockPass) return false;

        const bomb = state.bombs.find((b) => b.gx === gx && b.gy === gy);
        if (bomb) {
          if (entity.hasBombPass && bomb.ownerId === entity.id) return true;
          if (entity.overlapBombIds && entity.overlapBombIds.has(bomb.id)) return true;
          // 念のため、エンティティの中心がまだこのボムのマスにあるなら通過可能
          const curGx = Math.floor(entity.x / TILE_SIZE);
          const curGy = Math.floor(entity.y / TILE_SIZE);
          if (curGx === gx && curGy === gy) return true;
          return false;
        }
        return true;
      };

      // コリジョン半径（48pxマスに対して直径28px = 半径14pxの余裕を持ったサイズ）
      const r = 14;
      const curGx = Math.floor(entity.x / TILE_SIZE);
      const curGy = Math.floor(entity.y / TILE_SIZE);
      const centerX = curGx * TILE_SIZE + TILE_SIZE / 2;
      const centerY = curGy * TILE_SIZE + TILE_SIZE / 2;
      const slideMargin = TILE_SIZE * 0.42;

      if (desiredDir === 'LEFT') {
        const diffY = entity.y - centerY;
        const targetGx = Math.floor((entity.x - speed - r) / TILE_SIZE);

        if (canPass(targetGx, curGy)) {
          if (Math.abs(diffY) > 0.5) {
            entity.y += (diffY > 0 ? -1 : 1) * Math.min(Math.abs(diffY), speed * 0.8);
          }
          entity.x -= speed;
        } else {
          if (diffY < -3 && diffY > -slideMargin && canPass(targetGx, curGy - 1)) {
            entity.y -= speed * 0.9;
          } else if (diffY > 3 && diffY < slideMargin && canPass(targetGx, curGy + 1)) {
            entity.y += speed * 0.9;
          } else {
            entity.x = Math.max(curGx * TILE_SIZE + r, entity.x - speed);
          }
        }
      } else if (desiredDir === 'RIGHT') {
        const diffY = entity.y - centerY;
        const targetGx = Math.floor((entity.x + speed + r) / TILE_SIZE);

        if (canPass(targetGx, curGy)) {
          if (Math.abs(diffY) > 0.5) {
            entity.y += (diffY > 0 ? -1 : 1) * Math.min(Math.abs(diffY), speed * 0.8);
          }
          entity.x += speed;
        } else {
          if (diffY < -3 && diffY > -slideMargin && canPass(targetGx, curGy - 1)) {
            entity.y -= speed * 0.9;
          } else if (diffY > 3 && diffY < slideMargin && canPass(targetGx, curGy + 1)) {
            entity.y += speed * 0.9;
          } else {
            entity.x = Math.min((curGx + 1) * TILE_SIZE - r, entity.x + speed);
          }
        }
      } else if (desiredDir === 'UP') {
        const diffX = entity.x - centerX;
        const targetGy = Math.floor((entity.y - speed - r) / TILE_SIZE);

        if (canPass(curGx, targetGy)) {
          if (Math.abs(diffX) > 0.5) {
            entity.x += (diffX > 0 ? -1 : 1) * Math.min(Math.abs(diffX), speed * 0.8);
          }
          entity.y -= speed;
        } else {
          if (diffX < -3 && diffX > -slideMargin && canPass(curGx - 1, targetGy)) {
            entity.x -= speed * 0.9;
          } else if (diffX > 3 && diffX < slideMargin && canPass(curGx + 1, targetGy)) {
            entity.x += speed * 0.9;
          } else {
            entity.y = Math.max(curGy * TILE_SIZE + r, entity.y - speed);
          }
        }
      } else if (desiredDir === 'DOWN') {
        const diffX = entity.x - centerX;
        const targetGy = Math.floor((entity.y + speed + r) / TILE_SIZE);

        if (canPass(curGx, targetGy)) {
          if (Math.abs(diffX) > 0.5) {
            entity.x += (diffX > 0 ? -1 : 1) * Math.min(Math.abs(diffX), speed * 0.8);
          }
          entity.y += speed;
        } else {
          if (diffX < -3 && diffX > -slideMargin && canPass(curGx - 1, targetGy)) {
            entity.x -= speed * 0.9;
          } else if (diffX > 3 && diffX < slideMargin && canPass(curGx + 1, targetGy)) {
            entity.x += speed * 0.9;
          } else {
            entity.y = Math.min((curGy + 1) * TILE_SIZE - r, entity.y + speed);
          }
        }
      }

      // フィールド外周の絶対ガード
      entity.x = Math.max(TILE_SIZE + r, Math.min((COLS - 1) * TILE_SIZE - r, entity.x));
      entity.y = Math.max(TILE_SIZE + r, Math.min((ROWS - 1) * TILE_SIZE - r, entity.y));
    },
    []
  );

  const checkBombKick = useCallback((player: Player) => {
    if (!player.hasKick || !player.isAlive) return;
    const state = stateRef.current;
    const kickRange = TILE_SIZE * 0.55;

    state.bombs.forEach((bomb) => {
      if (bomb.vx !== 0 || bomb.vy !== 0) return;
      // 設置直後でまだ離脱していない足元のボムは蹴らない（離脱後にキック可能）
      if (player.overlapBombIds.has(bomb.id)) return;

      const dist = Math.hypot(player.x - bomb.px, player.y - bomb.py);
      if (dist < kickRange) {
        let kx = 0;
        let ky = 0;
        if (player.lastMoveDir === 'UP') ky = -5;
        if (player.lastMoveDir === 'DOWN') ky = 5;
        if (player.lastMoveDir === 'LEFT') kx = -5;
        if (player.lastMoveDir === 'RIGHT') kx = 5;

        if (kx !== 0 || ky !== 0) {
          bomb.vx = kx;
          bomb.vy = ky;
          sound.playKick();
          addFloatingText(bomb.px, bomb.py - 10, 'KICK!', '#38bdf8');
        }
      }
    });
  }, []);

  const getDangerGrid = useCallback((): boolean[][] => {
    const state = stateRef.current;
    const danger: boolean[][] = Array.from({ length: ROWS }, () => Array(COLS).fill(false));

    state.fireCells.forEach((f) => {
      if (f.gx >= 0 && f.gx < COLS && f.gy >= 0 && f.gy < ROWS) {
        danger[f.gy][f.gx] = true;
      }
    });

    state.bombs.forEach((b) => {
      danger[b.gy][b.gx] = true;
      const dirs = [
        { dx: 0, dy: -1 },
        { dx: 0, dy: 1 },
        { dx: -1, dy: 0 },
        { dx: 1, dy: 0 },
      ];
      dirs.forEach(({ dx, dy }) => {
        for (let dist = 1; dist <= b.fireRange; dist++) {
          const cx = b.gx + dx * dist;
          const cy = b.gy + dy * dist;
          if (cx < 0 || cx >= COLS || cy < 0 || cy >= ROWS) break;
          const tile = state.grid[cy][cx];
          if (tile === TILE.HARD_WALL || tile === TILE.SUDDEN_WALL) break;
          danger[cy][cx] = true;
          if (tile === TILE.SOFT_BLOCK) break;
        }
      });
    });

    return danger;
  }, []);

  const findBfsPath = useCallback(
    (
      startGx: number,
      startGy: number,
      isGoal: (gx: number, gy: number) => boolean,
      isWalkable: (gx: number, gy: number) => boolean
    ): ('UP' | 'DOWN' | 'LEFT' | 'RIGHT') | null => {
      if (isGoal(startGx, startGy)) return null;

      const queue: { x: number; y: number; firstDir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' }[] = [];
      const visited = new Set<string>();
      visited.add(`${startGx},${startGy}`);

      const neighbors: { dx: number; dy: number; dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' }[] = [
        { dx: 0, dy: -1, dir: 'UP' },
        { dx: 0, dy: 1, dir: 'DOWN' },
        { dx: -1, dy: 0, dir: 'LEFT' },
        { dx: 1, dy: 0, dir: 'RIGHT' },
      ];

      for (const n of neighbors) {
        const nx = startGx + n.dx;
        const ny = startGy + n.dy;
        if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS) {
          if (isGoal(nx, ny)) {
            return n.dir;
          }
          if (isWalkable(nx, ny) && !visited.has(`${nx},${ny}`)) {
            visited.add(`${nx},${ny}`);
            queue.push({ x: nx, y: ny, firstDir: n.dir });
          }
        }
      }

      while (queue.length > 0) {
        const curr = queue.shift()!;
        if (isGoal(curr.x, curr.y)) {
          return curr.firstDir;
        }

        for (const n of neighbors) {
          const nx = curr.x + n.dx;
          const ny = curr.y + n.dy;
          if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS) {
            if (!visited.has(`${nx},${ny}`) && isWalkable(nx, ny)) {
              visited.add(`${nx},${ny}`);
              queue.push({ x: nx, y: ny, firstDir: curr.firstDir });
            }
          }
        }
      }

      return null;
    },
    []
  );

  const updateCpuPlayer = useCallback(
    (cpu: Player) => {
      if (!cpu.isAlive) return;
      const state = stateRef.current;
      const dangerGrid = getDangerGrid();

      const curGx = Math.floor(cpu.x / TILE_SIZE);
      const curGy = Math.floor(cpu.y / TILE_SIZE);
      const isInDanger = dangerGrid[curGy][curGx];

      // 歩行可能セル判定（自分の一時的通過ボムも考慮）
      const isCellWalkable = (gx: number, gy: number): boolean => {
        if (gx < 0 || gx >= COLS || gy < 0 || gy >= ROWS) return false;
        const tile = state.grid[gy][gx];
        if (tile === TILE.HARD_WALL || tile === TILE.SUDDEN_WALL) return false;
        if (tile === TILE.SOFT_BLOCK && !cpu.hasBlockPass) return false;
        const bomb = state.bombs.find((b) => b.gx === gx && b.gy === gy);
        if (bomb) {
          if (cpu.hasBombPass && bomb.ownerId === cpu.id) return true;
          if (cpu.overlapBombIds && cpu.overlapBombIds.has(bomb.id)) return true;
          return false;
        }
        return true;
      };

      // 0. リモコンボム知性: 敵が自分のボムの爆風範囲に入ったら即座に起爆！
      if (cpu.hasRemote && !isInDanger) {
        const myRemoteBombs = state.bombs.filter((b) => b.ownerId === cpu.id && b.isRemote);
        if (myRemoteBombs.length > 0) {
          const enemies = state.players.filter((p) => p.id !== cpu.id && p.isAlive);
          let shouldDetonate = false;
          myRemoteBombs.forEach((b) => {
            enemies.forEach((e) => {
              const egx = Math.floor(e.x / TILE_SIZE);
              const egy = Math.floor(e.y / TILE_SIZE);
              if (
                (egx === b.gx && Math.abs(egy - b.gy) <= b.fireRange) ||
                (egy === b.gy && Math.abs(egx - b.gx) <= b.fireRange)
              ) {
                shouldDetonate = true;
              }
            });
          });
          if (shouldDetonate || (cpuDifficulty === 'hard' && Math.random() < 0.1)) {
            triggerRemoteDetonation(cpu);
          }
        }
      }

      // 1. 最優先: 危険ゾーンからの脱出 (ESCAPE)
      if (isInDanger) {
        const escapeDir = findBfsPath(
          curGx,
          curGy,
          (gx, gy) => !dangerGrid[gy][gx] && isCellWalkable(gx, gy),
          (gx, gy) => isCellWalkable(gx, gy)
        );

        if (escapeDir) {
          moveEntityWithSliding(cpu, escapeDir);
          cpu.dir = escapeDir;
          cpu.lastMoveDir = escapeDir;
          return;
        }
      }

      // 2. 近くでボムがカウントダウン中の場合、自分がすでに安全なら「安全待機（自爆回避）」
      const activeBombsNearby = state.bombs.some(
        (b) => Math.hypot(b.gx - curGx, b.gy - curGy) <= b.fireRange + 2
      );
      if (activeBombsNearby && !isInDanger) {
        const stayChance = cpuDifficulty === 'hard' ? 0.9 : cpuDifficulty === 'normal' ? 0.75 : 0.5;
        if (Math.random() < stayChance) {
          cpu.dir = 'IDLE';
          return;
        }
      }

      // 3. アイテム回収 (LOOT)
      const safeItems = state.items.filter(
        (it) => !it.collected && !dangerGrid[it.y][it.x] && state.grid[it.y][it.x] === TILE.EMPTY
      );
      if (safeItems.length > 0) {
        const itemDir = findBfsPath(
          curGx,
          curGy,
          (gx, gy) => safeItems.some((it) => it.x === gx && it.y === gy),
          (gx, gy) => isCellWalkable(gx, gy) && !dangerGrid[gy][gx]
        );
        if (itemDir) {
          moveEntityWithSliding(cpu, itemDir);
          cpu.dir = itemDir;
          cpu.lastMoveDir = itemDir;
          return;
        }
      }

      // 4. 敵プレイヤーの優先選定 (P1優先、次に最寄り敵)
      const enemies = state.players.filter((p) => p.id !== cpu.id && p.isAlive);
      enemies.sort((a, b) => {
        if (a.id === 0) return -1;
        if (b.id === 0) return 1;
        const distA = Math.hypot(a.x - cpu.x, a.y - cpu.y);
        const distB = Math.hypot(b.x - cpu.x, b.y - cpu.y);
        return distA - distB;
      });
      const nearestEnemy = enemies[0];

      // 5. ボム設置判定 (攻撃またはソフトブロック開拓)
      if (cpu.bombsActive < cpu.bombsMax && !isInDanger) {
        let shouldDropBomb = false;

        // 条件A: 近くに敵がいる
        if (nearestEnemy) {
          const egx = Math.floor(nearestEnemy.x / TILE_SIZE);
          const egy = Math.floor(nearestEnemy.y / TILE_SIZE);
          const dist = Math.abs(curGx - egx) + Math.abs(curGy - egy);
          if (dist <= cpu.fireRange + 1) {
            shouldDropBomb = true;
          }
        }

        // 条件B: 隣接ソフトブロックがある
        const adjSoftBlocks = [
          { dx: 0, dy: -1 },
          { dx: 0, dy: 1 },
          { dx: -1, dy: 0 },
          { dx: 1, dy: 0 },
        ].filter((d) => {
          const tx = curGx + d.dx;
          const ty = curGy + d.dy;
          return tx >= 0 && tx < COLS && ty >= 0 && ty < ROWS && state.grid[ty][tx] === TILE.SOFT_BLOCK;
        });

        if (adjSoftBlocks.length > 0) {
          shouldDropBomb = true;
        }

        // 設置シミュレーション（確実に退避できる安全マスがあるか確認）
        if (shouldDropBomb) {
          const simDanger = dangerGrid.map((row) => [...row]);
          simDanger[curGy][curGx] = true;
          const dirs = [
            { dx: 0, dy: -1 },
            { dx: 0, dy: 1 },
            { dx: -1, dy: 0 },
            { dx: 1, dy: 0 },
          ];
          dirs.forEach(({ dx, dy }) => {
            for (let dist = 1; dist <= cpu.fireRange; dist++) {
              const cx = curGx + dx * dist;
              const cy = curGy + dy * dist;
              if (cx < 0 || cx >= COLS || cy < 0 || cy >= ROWS) break;
              const tile = state.grid[cy][cx];
              if (tile === TILE.HARD_WALL || tile === TILE.SUDDEN_WALL) break;
              simDanger[cy][cx] = true;
              if (tile === TILE.SOFT_BLOCK) break;
            }
          });

          // 脱出先の安全マスへの方向
          const escapeDir = findBfsPath(
            curGx,
            curGy,
            (gx, gy) => !simDanger[gy][gx] && isCellWalkable(gx, gy),
            (gx, gy) => isCellWalkable(gx, gy) && (gx !== curGx || gy !== curGy)
          );

          if (escapeDir) {
            const dropChance = cpuDifficulty === 'hard' ? 0.95 : cpuDifficulty === 'normal' ? 0.75 : 0.45;
            if (Math.random() < dropChance) {
              tryPlaceBomb(cpu);
              // ボム設置と同時に即座に退避方向へ踏み出す
              moveEntityWithSliding(cpu, escapeDir);
              cpu.dir = escapeDir;
              cpu.lastMoveDir = escapeDir;
              return;
            }
          }
        }
      }

      // 6. 敵への追跡 (CHASE)
      if (nearestEnemy) {
        const egx = Math.floor(nearestEnemy.x / TILE_SIZE);
        const egy = Math.floor(nearestEnemy.y / TILE_SIZE);

        const chaseDir = findBfsPath(
          curGx,
          curGy,
          (gx, gy) => Math.abs(gx - egx) + Math.abs(gy - egy) <= 1,
          (gx, gy) => isCellWalkable(gx, gy) && !dangerGrid[gy][gx]
        );

        if (chaseDir) {
          moveEntityWithSliding(cpu, chaseDir);
          cpu.dir = chaseDir;
          cpu.lastMoveDir = chaseDir;
          return;
        }
      }

      // 7. ソフトブロックへのアプローチ (CLEAR)
      const blockApproachDir = findBfsPath(
        curGx,
        curGy,
        (gx, gy) => {
          return [
            { dx: 0, dy: -1 },
            { dx: 0, dy: 1 },
            { dx: -1, dy: 0 },
            { dx: 1, dy: 0 },
          ].some((d) => {
            const tx = gx + d.dx;
            const ty = gy + d.dy;
            return tx >= 0 && tx < COLS && ty >= 0 && ty < ROWS && state.grid[ty][tx] === TILE.SOFT_BLOCK;
          });
        },
        (gx, gy) => isCellWalkable(gx, gy) && !dangerGrid[gy][gx]
      );

      if (blockApproachDir) {
        moveEntityWithSliding(cpu, blockApproachDir);
        cpu.dir = blockApproachDir;
        cpu.lastMoveDir = blockApproachDir;
        return;
      }

      // 8. サドンデス中央退避
      if (state.timeLeft <= 60) {
        const centerGx = Math.floor(COLS / 2);
        const centerGy = Math.floor(ROWS / 2);
        const centerDir = findBfsPath(
          curGx,
          curGy,
          (gx, gy) => Math.abs(gx - centerGx) <= 2 && Math.abs(gy - centerGy) <= 2,
          (gx, gy) => isCellWalkable(gx, gy) && !dangerGrid[gy][gx]
        );
        if (centerDir) {
          moveEntityWithSliding(cpu, centerDir);
          cpu.dir = centerDir;
          cpu.lastMoveDir = centerDir;
          return;
        }
      }

      // 9. 安全な方向への移動
      const safeDirs: ('UP' | 'DOWN' | 'LEFT' | 'RIGHT')[] = [];
      const testDirs: { dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'; dx: number; dy: number }[] = [
        { dir: 'UP', dx: 0, dy: -1 },
        { dir: 'DOWN', dx: 0, dy: 1 },
        { dir: 'LEFT', dx: -1, dy: 0 },
        { dir: 'RIGHT', dx: 1, dy: 0 },
      ];

      testDirs.forEach(({ dir, dx, dy }) => {
        const nx = curGx + dx;
        const ny = curGy + dy;
        if (isCellWalkable(nx, ny) && !dangerGrid[ny][nx]) {
          safeDirs.push(dir);
        }
      });

      if (safeDirs.length > 0) {
        let nextDir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' = safeDirs[0];
        if (cpu.dir !== 'IDLE' && safeDirs.includes(cpu.dir) && Math.random() >= 0.1) {
          nextDir = cpu.dir;
        } else {
          nextDir = safeDirs[Math.floor(Math.random() * safeDirs.length)];
        }
        moveEntityWithSliding(cpu, nextDir);
        cpu.dir = nextDir;
        cpu.lastMoveDir = nextDir;
      } else {
        cpu.dir = 'IDLE';
      }
    },
    [cpuDifficulty, findBfsPath, getDangerGrid, moveEntityWithSliding, triggerRemoteDetonation, tryPlaceBomb]
  );

  const updateMonsters = useCallback(() => {
    const state = stateRef.current;
    state.monsters.forEach((m) => {
      if (!m.isAlive) {
        m.deathTimer++;
        return;
      }

      const mgx = Math.floor(m.x / TILE_SIZE);
      const mgy = Math.floor(m.y / TILE_SIZE);
      const inFire = state.fireCells.some((f) => f.gx === mgx && f.gy === mgy);
      if (inFire) {
        m.isAlive = false;
        m.deathTimer = 1;
        sound.playPlayerDie();
        setMatchScore((prev) => prev + (m.type === 'mecha' ? 400 : m.type === 'ghost' ? 300 : 200));
        addFloatingText(m.x, m.y, '+200', '#fbbf24');
        spawnExplosionParticles(m.x, m.y, '#f59e0b', 12);
        return;
      }

      state.players.forEach((p) => {
        if (p.isAlive && p.invincibleTimer <= 0) {
          const dist = Math.hypot(p.x - m.x, p.y - m.y);
          if (dist < TILE_SIZE * 0.7) {
            p.isAlive = false;
            p.deathAnimTimer = 1;
            sound.playPlayerDie();
            addFloatingText(p.x, p.y, 'MISS!', '#ef4444');
          }
        }
      });

      const dirs: ('UP' | 'DOWN' | 'LEFT' | 'RIGHT')[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
      const canMonsterWalk = (gx: number, gy: number): boolean => {
        if (gx < 0 || gx >= COLS || gy < 0 || gy >= ROWS) return false;
        const tile = state.grid[gy][gx];
        if (tile === TILE.HARD_WALL || tile === TILE.SUDDEN_WALL) return false;
        if (tile === TILE.SOFT_BLOCK && !m.canPassBlock) return false;
        if (state.bombs.some((b) => b.gx === gx && b.gy === gy)) return false;
        return true;
      };

      let dx = 0;
      let dy = 0;
      if (m.dir === 'UP') dy = -m.speed;
      if (m.dir === 'DOWN') dy = m.speed;
      if (m.dir === 'LEFT') dx = -m.speed;
      if (m.dir === 'RIGHT') dx = m.speed;

      const nextX = m.x + dx;
      const nextY = m.y + dy;
      const nextGx = Math.floor(nextX / TILE_SIZE);
      const nextGy = Math.floor(nextY / TILE_SIZE);

      if (canMonsterWalk(nextGx, nextGy)) {
        m.x = nextX;
        m.y = nextY;
        if (Math.random() < 0.02) {
          m.dir = dirs[Math.floor(Math.random() * dirs.length)];
        }
      } else {
        const openDirs = dirs.filter((d) => {
          let testDx = 0;
          let testDy = 0;
          if (d === 'UP') testDy = -1;
          if (d === 'DOWN') testDy = 1;
          if (d === 'LEFT') testDx = -1;
          if (d === 'RIGHT') testDx = 1;
          return canMonsterWalk(mgx + testDx, mgy + testDy);
        });
        if (openDirs.length > 0) {
          m.dir = openDirs[Math.floor(Math.random() * openDirs.length)];
        }
      }
    });

    state.monsters = state.monsters.filter((m) => m.deathTimer < 30);
  }, []);

  useEffect(() => {
    let animId: number;

    const gameLoop = () => {
      if (gameState === 'playing') {
        const state = stateRef.current;

        state.timeTimer++;
        if (state.timeTimer >= 60) {
          state.timeTimer = 0;
          if (state.timeLeft > 0) {
            state.timeLeft--;
            setRemainingTime(state.timeLeft);

            if (gameMode === 'battle' && state.timeLeft <= 60 && !isSuddenDeath) {
              setIsSuddenDeath(true);
              sound.playSuddenDeath();
              addFloatingText(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 'SUDDEN DEATH!!', '#ef4444');
            }
          }
        }

        if (gameMode === 'battle' && state.timeLeft <= 60) {
          state.suddenDeathTick++;
          if (state.suddenDeathTick >= 45 && state.suddenDeathIndex < state.suddenDeathSequence.length) {
            state.suddenDeathTick = 0;
            const target = state.suddenDeathSequence[state.suddenDeathIndex];
            state.suddenDeathIndex++;

            state.fallingBlocks.push({
              gx: target.gx,
              gy: target.gy,
              currentY: -TILE_SIZE * 2,
              targetY: target.gy * TILE_SIZE,
              isLanding: false,
            });
            sound.playSuddenDeath();
          }
        }

        state.fallingBlocks.forEach((fb) => {
          if (!fb.isLanding) {
            fb.currentY += 16;
            if (fb.currentY >= fb.targetY) {
              fb.currentY = fb.targetY;
              fb.isLanding = true;
              state.grid[fb.gy][fb.gx] = TILE.SUDDEN_WALL;
              sound.playBlockFall();
              state.screenShake = 8;
              spawnExplosionParticles(
                fb.gx * TILE_SIZE + TILE_SIZE / 2,
                fb.gy * TILE_SIZE + TILE_SIZE / 2,
                '#64748b',
                12
              );

              state.players.forEach((p) => {
                const pgx = Math.floor(p.x / TILE_SIZE);
                const pgy = Math.floor(p.y / TILE_SIZE);
                if (pgx === fb.gx && pgy === fb.gy && p.isAlive) {
                  p.isAlive = false;
                  p.deathAnimTimer = 1;
                  sound.playPlayerDie();
                  addFloatingText(p.x, p.y, 'CRUSHED!', '#ef4444');
                }
              });
            }
          }
        });
        state.fallingBlocks = state.fallingBlocks.filter((fb) => !fb.isLanding);

        for (let i = state.bombs.length - 1; i >= 0; i--) {
          const bomb = state.bombs[i];

          if (bomb.vx !== 0 || bomb.vy !== 0) {
            const nextPx = bomb.px + bomb.vx;
            const nextPy = bomb.py + bomb.vy;
            const nextGx = Math.floor(nextPx / TILE_SIZE);
            const nextGy = Math.floor(nextPy / TILE_SIZE);

            const hitObstacle =
              nextGx < 0 ||
              nextGx >= COLS ||
              nextGy < 0 ||
              nextGy >= ROWS ||
              state.grid[nextGy][nextGx] === TILE.HARD_WALL ||
              state.grid[nextGy][nextGx] === TILE.SOFT_BLOCK ||
              state.grid[nextGy][nextGx] === TILE.SUDDEN_WALL ||
              state.bombs.some((b) => b.id !== bomb.id && b.gx === nextGx && b.gy === nextGy) ||
              state.players.some((p) => Math.hypot(p.x - nextPx, p.y - nextPy) < TILE_SIZE * 0.6);

            if (hitObstacle) {
              bomb.vx = 0;
              bomb.vy = 0;
              bomb.px = bomb.gx * TILE_SIZE + TILE_SIZE / 2;
              bomb.py = bomb.gy * TILE_SIZE + TILE_SIZE / 2;
            } else {
              bomb.px = nextPx;
              bomb.py = nextPy;
              bomb.gx = nextGx;
              bomb.gy = nextGy;
            }
          }

          // 設置者が死亡したリモコンボムは自動的に通常タイマー（自爆モード）に移行
          if (bomb.isRemote) {
            const owner = state.players.find((p) => p.id === bomb.ownerId);
            if (owner && !owner.isAlive) {
              bomb.isRemote = false;
              bomb.timer = Math.min(bomb.timer, 90);
            }
          }

          if (!bomb.isRemote) {
            bomb.timer--;
            if (bomb.timer <= 0) {
              state.bombs.splice(i, 1);
              triggerExplosion(bomb);
              continue;
            }
          } else {
            if (bomb.timer <= 1) {
              state.bombs.splice(i, 1);
              triggerExplosion(bomb);
              continue;
            }
          }
        }

        for (let i = state.fireCells.length - 1; i >= 0; i--) {
          const fire = state.fireCells[i];
          fire.timer--;
          if (fire.timer <= 0) {
            state.fireCells.splice(i, 1);
          }
        }

        const keys = keysRef.current;
        state.players.forEach((player) => {
          if (!player.isAlive) {
            player.deathAnimTimer++;
            return;
          }

          if (player.invincibleTimer > 0) {
            player.invincibleTimer--;
          }

          if (player.curseTimer > 0) {
            player.curseTimer--;
            if (player.curseTimer <= 0) {
              player.curse = null;
            }
          }

          if (player.curse === 'AUTO_BOMB') {
            state.autoBombCounter++;
            if (state.autoBombCounter % 60 === 0) {
              tryPlaceBomb(player);
            }
          }

          if (player.id === 0) {
            let moveDir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'IDLE' = 'IDLE';

            if (keys['ArrowUp'] || keys['KeyW'] || keys['w']) moveDir = 'UP';
            else if (keys['ArrowDown'] || keys['KeyS'] || keys['s']) moveDir = 'DOWN';
            else if (keys['ArrowLeft'] || keys['KeyA'] || keys['a']) moveDir = 'LEFT';
            else if (keys['ArrowRight'] || keys['KeyD'] || keys['d']) moveDir = 'RIGHT';

            if (touchDirRef.current !== 'NONE') {
              moveDir = touchDirRef.current;
            }

            if (moveDir !== 'IDLE') {
              moveEntityWithSliding(player, moveDir);
              player.dir = moveDir;
              player.lastMoveDir = moveDir;
              checkBombKick(player);
            } else {
              player.dir = 'IDLE';
            }

            if (keys['Space'] || keys[' '] || keys['KeyJ'] || keys['j']) {
              tryPlaceBomb(player);
              keys['Space'] = false;
              keys[' '] = false;
              keys['KeyJ'] = false;
            }

            if (keys['KeyE'] || keys['e'] || keys['KeyK'] || keys['k']) {
              triggerRemoteDetonation(player);
              keys['KeyE'] = false;
              keys['KeyK'] = false;
            }
          } else if (player.id === 1 && !player.isCpu) {
            let moveDir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'IDLE' = 'IDLE';
            if (keys['KeyI'] || keys['i'] || keys['Numpad8']) moveDir = 'UP';
            else if (keys['KeyK'] || keys['k'] || keys['Numpad2']) moveDir = 'DOWN';
            else if (keys['KeyJ'] || keys['j'] || keys['Numpad4']) moveDir = 'LEFT';
            else if (keys['KeyL'] || keys['l'] || keys['Numpad6']) moveDir = 'RIGHT';

            if (moveDir !== 'IDLE') {
              moveEntityWithSliding(player, moveDir);
              player.dir = moveDir;
              player.lastMoveDir = moveDir;
              checkBombKick(player);
            } else {
              player.dir = 'IDLE';
            }

            if (keys['Enter'] || keys['Numpad0']) {
              tryPlaceBomb(player);
              keys['Enter'] = false;
              keys['Numpad0'] = false;
            }

            if (keys['ShiftRight'] || keys['NumpadDecimal']) {
              triggerRemoteDetonation(player);
              keys['ShiftRight'] = false;
            }
          } else if (player.isCpu) {
            updateCpuPlayer(player);
            checkBombKick(player);
          }

          // 重なっているボムの離脱チェック（中心が隣のマスへしっかり移るまで通過可能を維持）
          if (player.overlapBombIds.size > 0) {
            player.overlapBombIds.forEach((bombId) => {
              const bomb = state.bombs.find((b) => b.id === bombId);
              if (!bomb) {
                player.overlapBombIds.delete(bombId);
                return;
              }
              const dist = Math.hypot(player.x - bomb.px, player.y - bomb.py);
              if (dist >= TILE_SIZE * 0.72) {
                player.overlapBombIds.delete(bombId);
              }
            });
          }

          const pgx = Math.floor(player.x / TILE_SIZE);
          const pgy = Math.floor(player.y / TILE_SIZE);
          const inFire = state.fireCells.some((f) => f.gx === pgx && f.gy === pgy);

          if (inFire && player.invincibleTimer <= 0) {
            player.isAlive = false;
            player.deathAnimTimer = 1;
            sound.playPlayerDie();
            addFloatingText(player.x, player.y, 'ELIMINATED!', '#ef4444');
            spawnExplosionParticles(player.x, player.y, player.color, 16);
          }

          state.items.forEach((item) => {
            if (!item.collected && item.x === pgx && item.y === pgy && state.grid[item.y][item.x] === TILE.EMPTY) {
              item.collected = true;
              sound.playPowerUp();

              switch (item.type) {
                case 'BOMB_UP':
                  player.bombsMax = Math.min(8, player.bombsMax + 1);
                  addFloatingText(player.x, player.y, 'BOMB +1', '#38bdf8');
                  break;
                case 'FIRE_UP':
                  player.fireRange = Math.min(8, player.fireRange + 1);
                  addFloatingText(player.x, player.y, 'FIRE +1', '#f97316');
                  break;
                case 'SPEED_UP':
                  player.speed = Math.min(4.2, player.speed + 0.4);
                  addFloatingText(player.x, player.y, 'SPEED UP', '#10b981');
                  break;
                case 'FULL_FIRE':
                  player.fireRange = 8;
                  addFloatingText(player.x, player.y, 'MAX FIRE!!', '#ef4444');
                  break;
                case 'BOMB_KICK':
                  player.hasKick = true;
                  addFloatingText(player.x, player.y, 'BOMB KICK', '#a855f7');
                  break;
                case 'REMOTE':
                  player.hasRemote = true;
                  addFloatingText(player.x, player.y, 'REMOTE BOMB', '#ec4899');
                  break;
                case 'BOMB_PASS':
                  player.hasBombPass = true;
                  addFloatingText(player.x, player.y, 'BOMB PASS', '#6366f1');
                  break;
                case 'BLOCK_PASS':
                  player.hasBlockPass = true;
                  addFloatingText(player.x, player.y, 'BLOCK PASS', '#14b8a6');
                  break;
                case 'STAR':
                  player.invincibleTimer = 720;
                  addFloatingText(player.x, player.y, 'INVINCIBLE!!', '#fbbf24');
                  break;
                case 'SKULL': {
                  const curses: ('SLOW' | 'FAST' | 'AUTO_BOMB' | 'NO_BOMB')[] = [
                    'SLOW',
                    'FAST',
                    'AUTO_BOMB',
                    'NO_BOMB',
                  ];
                  player.curse = curses[Math.floor(Math.random() * curses.length)];
                  player.curseTimer = 600;
                  addFloatingText(player.x, player.y, `CURSE: ${player.curse}`, '#8b5cf6');
                  break;
                }
              }

              if (player.id === 0) {
                setMatchScore((prev) => prev + 100);
              }
            }
          });

          if (
            gameMode === 'stage' &&
            player.id === 0 &&
            state.doorRevealed &&
            pgx === state.doorGx &&
            pgy === state.doorGy
          ) {
            const monstersAlive = state.monsters.filter((m) => m.isAlive).length;
            if (monstersAlive === 0) {
              sound.playBombermanVictory();
              setGameState('stageClear');
              setMaxStageCleared((prev) => {
                const next = Math.max(prev, currentStage);
                localStorage.setItem(STAGE_CLEARED_KEY, next.toString());
                return next;
              });
              setMatchScore((prev) => {
                const bonus = 1000 + currentStage * 500 + state.timeLeft * 10;
                const newScore = prev + bonus;
                if (newScore > highScore) {
                  setHighScore(newScore);
                  localStorage.setItem(HIGH_SCORE_KEY, newScore.toString());
                }
                return newScore;
              });
            }
          }
        });

        if (gameMode === 'stage') {
          updateMonsters();
        }

        if (gameMode === 'battle') {
          const alivePlayers = state.players.filter((p) => p.isAlive);
          if (alivePlayers.length <= 1) {
            state.roundOverTimer++;
            if (state.roundOverTimer === 1) {
              if (alivePlayers.length === 1) {
                const winner = alivePlayers[0];
                winner.wins++;
                setRoundWinner(winner.name);
                if (winner.id === 0) {
                  sound.playBombermanVictory();
                  setBattleWins((prev) => {
                    const next = prev + 1;
                    localStorage.setItem(BATTLE_WINS_KEY, next.toString());
                    return next;
                  });
                  setMatchScore((prev) => prev + 1000);
                } else {
                  sound.playPlayerDie();
                }
              } else {
                setRoundWinner('DRAW GAME (引き分け)');
              }
            }

            if (state.roundOverTimer >= 180) {
              setGameState('roundOver');
            }
          }
        } else {
          const p1 = state.players[0];
          if (p1 && !p1.isAlive && p1.deathAnimTimer >= 60) {
            setGameState('gameOver');
          }
        }

        for (let i = state.particles.length - 1; i >= 0; i--) {
          const p = state.particles[i];
          p.x += p.vx;
          p.y += p.vy;
          p.life--;
          p.alpha = Math.max(0, p.life / p.maxLife);
          if (p.life <= 0) {
            state.particles.splice(i, 1);
          }
        }

        for (let i = state.floatingTexts.length - 1; i >= 0; i--) {
          const t = state.floatingTexts[i];
          t.y -= 0.8;
          t.life--;
          t.alpha = Math.max(0, t.life / 50);
          if (t.life <= 0) {
            state.floatingTexts.splice(i, 1);
          }
        }

        if (state.screenShake > 0) {
          state.screenShake *= 0.88;
          if (state.screenShake < 0.5) state.screenShake = 0;
        }
      }

      drawGame();
      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animId);
  }, [
    checkBombKick,
    currentStage,
    gameMode,
    gameState,
    highScore,
    isSuddenDeath,
    moveEntityWithSliding,
    triggerExplosion,
    triggerRemoteDetonation,
    tryPlaceBomb,
    updateCpuPlayer,
    updateMonsters,
  ]);

  const drawGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const state = stateRef.current;

    ctx.save();
    if (state.screenShake > 0) {
      const sx = (Math.random() - 0.5) * state.screenShake;
      const sy = (Math.random() - 0.5) * state.screenShake;
      ctx.translate(sx, sy);
    }

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const isEven = (r + c) % 2 === 0;
        ctx.fillStyle = isEven ? '#1e293b' : '#0f172a';
        ctx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.lineWidth = 1;
        ctx.strokeRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }

    if (gameMode === 'stage' && state.doorRevealed) {
      const dx = state.doorGx * TILE_SIZE;
      const dy = state.doorGy * TILE_SIZE;
      ctx.fillStyle = '#065f46';
      ctx.fillRect(dx + 4, dy + 4, TILE_SIZE - 8, TILE_SIZE - 8);
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 3;
      ctx.strokeRect(dx + 4, dy + 4, TILE_SIZE - 8, TILE_SIZE - 8);

      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(dx + TILE_SIZE - 14, dy + TILE_SIZE / 2, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#a7f3d0';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('EXIT', dx + TILE_SIZE / 2, dy + 16);
    }

    state.items.forEach((item) => {
      if (item.collected || state.grid[item.y][item.x] === TILE.SOFT_BLOCK) return;
      const ix = item.x * TILE_SIZE + TILE_SIZE / 2;
      const iy = item.y * TILE_SIZE + TILE_SIZE / 2;
      const bounce = Math.sin(Date.now() * 0.006 + item.x) * 3;

      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.roundRect(ix - 18, iy - 18 + bounce, 36, 36, 8);
      ctx.fill();
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      let emoji = '💣';
      switch (item.type) {
        case 'BOMB_UP': emoji = '💣'; break;
        case 'FIRE_UP': emoji = '🔥'; break;
        case 'SPEED_UP': emoji = '👟'; break;
        case 'FULL_FIRE': emoji = '💥'; break;
        case 'BOMB_KICK': emoji = '⚽'; break;
        case 'REMOTE': emoji = '📡'; break;
        case 'BOMB_PASS': emoji = '👻'; break;
        case 'BLOCK_PASS': emoji = '🧱'; break;
        case 'STAR': emoji = '⭐'; break;
        case 'SKULL': emoji = '💀'; break;
      }
      ctx.fillText(emoji, ix, iy + bounce);
    });

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const tile = state.grid[r][c];
        const tx = c * TILE_SIZE;
        const ty = r * TILE_SIZE;

        if (tile === TILE.HARD_WALL) {
          ctx.fillStyle = '#475569';
          ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);

          ctx.fillStyle = '#64748b';
          ctx.fillRect(tx + 3, ty + 3, TILE_SIZE - 6, TILE_SIZE / 2 - 2);

          ctx.fillStyle = '#334155';
          ctx.fillRect(tx + 6, ty + 6, 6, 6);
          ctx.fillRect(tx + TILE_SIZE - 12, ty + 6, 6, 6);
          ctx.fillRect(tx + 6, ty + TILE_SIZE - 12, 6, 6);
          ctx.fillRect(tx + TILE_SIZE - 12, ty + TILE_SIZE - 12, 6, 6);

          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 2;
          ctx.strokeRect(tx, ty, TILE_SIZE, TILE_SIZE);
        } else if (tile === TILE.SOFT_BLOCK) {
          ctx.fillStyle = '#b45309';
          ctx.fillRect(tx + 2, ty + 2, TILE_SIZE - 4, TILE_SIZE - 4);

          ctx.fillStyle = '#d97706';
          ctx.fillRect(tx + 4, ty + 4, TILE_SIZE - 8, TILE_SIZE / 2 - 3);

          ctx.strokeStyle = '#78350f';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(tx + 2, ty + TILE_SIZE / 2);
          ctx.lineTo(tx + TILE_SIZE - 2, ty + TILE_SIZE / 2);
          ctx.moveTo(tx + TILE_SIZE / 2, ty + 2);
          ctx.lineTo(tx + TILE_SIZE / 2, ty + TILE_SIZE / 2);
          ctx.moveTo(tx + TILE_SIZE / 4, ty + TILE_SIZE / 2);
          ctx.lineTo(tx + TILE_SIZE / 4, ty + TILE_SIZE - 2);
          ctx.moveTo(tx + (TILE_SIZE * 3) / 4, ty + TILE_SIZE / 2);
          ctx.lineTo(tx + (TILE_SIZE * 3) / 4, ty + TILE_SIZE - 2);
          ctx.stroke();

          ctx.strokeStyle = '#451a03';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(tx + 2, ty + 2, TILE_SIZE - 4, TILE_SIZE - 4);
        } else if (tile === TILE.SUDDEN_WALL) {
          ctx.fillStyle = '#dc2626';
          ctx.fillRect(tx + 1, ty + 1, TILE_SIZE - 2, TILE_SIZE - 2);

          ctx.fillStyle = '#f87171';
          ctx.fillRect(tx + 3, ty + 3, TILE_SIZE - 6, TILE_SIZE / 2 - 2);

          ctx.strokeStyle = '#991b1b';
          ctx.lineWidth = 2.5;
          ctx.strokeRect(tx + 1, ty + 1, TILE_SIZE - 2, TILE_SIZE - 2);

          ctx.strokeStyle = '#450a0a';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(tx + 8, ty + 8);
          ctx.lineTo(tx + TILE_SIZE - 8, ty + TILE_SIZE - 8);
          ctx.moveTo(tx + TILE_SIZE - 8, ty + 8);
          ctx.lineTo(tx + 8, ty + TILE_SIZE - 8);
          ctx.stroke();
        }
      }
    }

    state.fallingBlocks.forEach((fb) => {
      const tx = fb.gx * TILE_SIZE;
      ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.fillRect(tx + 4, fb.targetY + 4, TILE_SIZE - 8, TILE_SIZE - 8);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.strokeRect(tx + 4, fb.targetY + 4, TILE_SIZE - 8, TILE_SIZE - 8);

      ctx.fillStyle = '#b91c1c';
      ctx.fillRect(tx + 2, fb.currentY + 2, TILE_SIZE - 4, TILE_SIZE - 4);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(tx + 4, fb.currentY + 4, TILE_SIZE - 8, TILE_SIZE / 2);
    });

    state.bombs.forEach((bomb) => {
      const bx = bomb.px;
      const by = bomb.py;
      const pulse = Math.sin((bomb.maxTimer - bomb.timer) * 0.25) * 2;
      const radius = TILE_SIZE * 0.38 + pulse;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(bx, by + 12, radius * 0.9, radius * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();

      const grad = ctx.createRadialGradient(
        bx - radius * 0.3,
        by - radius * 0.3,
        2,
        bx,
        by,
        radius
      );
      if (bomb.isRemote) {
        grad.addColorStop(0, '#f43f5e');
        grad.addColorStop(1, '#881337');
      } else {
        grad.addColorStop(0, '#475569');
        grad.addColorStop(1, '#0f172a');
      }
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(bx, by, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = bomb.isRemote ? '#fda4af' : '#64748b';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(bx - 3, by - radius - 3, 6, 4);

      const sparkColor = Math.random() < 0.5 ? '#facc15' : '#ef4444';
      ctx.fillStyle = sparkColor;
      ctx.beginPath();
      ctx.arc(bx, by - radius - 5, 3 + Math.random() * 2, 0, Math.PI * 2);
      ctx.fill();

      if (bomb.isRemote) {
        ctx.strokeStyle = '#fda4af';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bx, by - radius);
        ctx.lineTo(bx, by - radius - 10);
        ctx.stroke();
        ctx.fillStyle = '#e11d48';
        ctx.beginPath();
        ctx.arc(bx, by - radius - 10, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    state.fireCells.forEach((fire) => {
      const fx = fire.gx * TILE_SIZE;
      const fy = fire.gy * TILE_SIZE;
      const cx = fx + TILE_SIZE / 2;
      const cy = fy + TILE_SIZE / 2;

      const fireGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, TILE_SIZE * 0.65);
      fireGrad.addColorStop(0, '#ffffff');
      fireGrad.addColorStop(0.3, '#fef08a');
      fireGrad.addColorStop(0.7, '#f97316');
      fireGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');

      ctx.fillStyle = fireGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, (TILE_SIZE * 0.7) * (0.8 + 0.2 * Math.sin(Date.now() * 0.05)), 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(251, 146, 60, 0.85)';
      if (fire.type === 'h-mid' || fire.type === 'h-end') {
        ctx.fillRect(fx, cy - 12, TILE_SIZE, 24);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(fx, cy - 4, TILE_SIZE, 8);
      } else if (fire.type === 'v-mid' || fire.type === 'v-end') {
        ctx.fillRect(cx - 12, fy, 24, TILE_SIZE);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - 4, fy, 8, TILE_SIZE);
      }
    });

    if (gameMode === 'stage') {
      state.monsters.forEach((m) => {
        if (!m.isAlive) {
          ctx.save();
          ctx.translate(m.x, m.y);
          ctx.rotate((m.deathTimer * 0.2));
          ctx.scale(1 - m.deathTimer / 30, 1 - m.deathTimer / 30);
          ctx.font = '24px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('💥', 0, 0);
          ctx.restore();
          return;
        }

        const mx = m.x;
        const my = m.y;
        ctx.font = '28px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        let mEmoji = '👾';
        if (m.type === 'slime') mEmoji = '🟠';
        else if (m.type === 'onion') mEmoji = '🧅';
        else if (m.type === 'ghost') mEmoji = '👻';
        else if (m.type === 'mecha') mEmoji = '🤖';

        ctx.fillText(mEmoji, mx, my);
      });
    }

    state.players.forEach((p) => {
      if (!p.isAlive) {
        if (p.deathAnimTimer < 60) {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.scale(1 - p.deathAnimTimer / 60, 1 - p.deathAnimTimer / 60);
          ctx.font = '24px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('💫', 0, 0);
          ctx.restore();
        }
        return;
      }

      const px = p.x;
      const py = p.y;
      const radius = TILE_SIZE * 0.36;

      if (p.invincibleTimer > 0 && Math.floor(Date.now() / 80) % 2 === 0) {
        ctx.fillStyle = 'rgba(250, 204, 21, 0.4)';
        ctx.beginPath();
        ctx.arc(px, py, radius * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      if (p.curse) {
        ctx.fillStyle = 'rgba(168, 85, 247, 0.35)';
        ctx.beginPath();
        ctx.arc(px, py, radius * 1.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = 'bold 10px monospace';
        ctx.fillStyle = '#c084fc';
        ctx.textAlign = 'center';
        ctx.fillText('💀', px, py - radius - 12);
      }

      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(px, py + 14, radius * 0.85, radius * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(px, py - 4, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#fed7aa';
      ctx.beginPath();
      ctx.ellipse(px, py - 3, radius * 0.65, radius * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();

      let eyeDx = 0;
      let eyeDy = 0;
      if (p.lastMoveDir === 'UP') eyeDy = -2;
      if (p.lastMoveDir === 'DOWN') eyeDy = 2;
      if (p.lastMoveDir === 'LEFT') eyeDx = -3;
      if (p.lastMoveDir === 'RIGHT') eyeDx = 3;

      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(px - 5 + eyeDx, py - 4 + eyeDy, 2.5, 4.5, 0, 0, Math.PI * 2);
      ctx.ellipse(px + 5 + eyeDx, py - 4 + eyeDy, 2.5, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = p.subColor;
      ctx.beginPath();
      ctx.arc(px, py - radius - 6, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = p.subColor;
      ctx.fillRect(px - radius * 0.6, py + 8, radius * 1.2, 10);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      const label = p.id === 0 ? 'P1' : p.id === 1 && !p.isCpu ? 'P2' : `CPU${p.id}`;
      ctx.fillText(label, px, py - radius - 14);
    });

    state.particles.forEach((p) => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      if (p.isSmoke) {
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      } else {
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
      ctx.fill();
      ctx.globalAlpha = 1.0;
    });

    state.floatingTexts.forEach((t) => {
      ctx.fillStyle = t.color;
      ctx.globalAlpha = t.alpha;
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(t.text, t.x, t.y);
      ctx.globalAlpha = 1.0;
    });

    ctx.restore();
  }, [gameMode]);

  const handleTouchDir = (dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'NONE') => {
    touchDirRef.current = dir;
  };

  return (
    <div className="w-full flex flex-col items-center select-none">
      {/* 上部ヘッダーバー */}
      <div
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 mb-2 rounded-2xl border transition-all ${
          isDark
            ? 'bg-slate-900/90 border-slate-800 text-slate-100'
            : 'bg-white border-slate-200 text-slate-800 shadow-xs'
        } ${isFullscreen ? 'max-w-none' : 'max-w-4xl'}`}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              sound.stopBombermanBgm();
              onBackToHub();
            }}
            className="p-2 rounded-xl bg-slate-800/20 hover:bg-slate-800/40 text-current transition cursor-pointer"
            title="ゲーム一覧へ戻る"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="text-xs font-black flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-orange-500" />
              <span>ボンバーブラスト</span>
              <span className="text-[11px] font-normal text-slate-400">
                {gameMode === 'battle' ? '4人対戦バトル' : `STAGE ${currentStage}`}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              {gameMode === 'battle'
                ? `勝利数: ${battleWins}勝 | 難易度: ${cpuDifficulty.toUpperCase()}`
                : `スコア: ${matchScore.toLocaleString()} pts | 最高制覇: STAGE ${maxStageCleared}`}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 font-mono font-bold text-xs sm:text-sm">
          <div
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl border ${
              isSuddenDeath
                ? 'bg-rose-600/30 border-rose-500 text-rose-400 animate-pulse'
                : 'bg-slate-800/20 border-slate-700/50'
            }`}
          >
            <span className="text-[10px]">TIME</span>
            <span className="text-sm">{remainingTime}s</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="p-2 rounded-xl hover:bg-slate-700/20 text-current transition cursor-pointer"
              title="操作・アイテム説明"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
            <button
              onClick={togglePause}
              className="p-2 rounded-xl hover:bg-slate-700/20 text-current transition cursor-pointer"
              title={gameState === 'paused' ? '再開' : '一時停止'}
            >
              {gameState === 'paused' ? <Play className="w-4 h-4 text-emerald-400" /> : <Pause className="w-4 h-4" />}
            </button>
            <button
              onClick={() => initRound(gameMode, currentStage)}
              className="p-2 rounded-xl hover:bg-slate-700/20 text-current transition cursor-pointer"
              title="リスタート"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={toggleMute}
              className="p-2 rounded-xl hover:bg-slate-700/20 text-current transition cursor-pointer"
              title={isMuted ? 'ミュート解除' : 'ミュート'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* ゲームCanvasコンテナ (フルスクリーン時は最大化拡大) */}
      <div
        className={`relative flex items-center justify-center rounded-3xl overflow-hidden border shadow-2xl transition-all duration-300 ${
          isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-300 bg-slate-900'
        } ${
          isFullscreen
            ? 'w-[min(98vw,calc((100vh-90px)*15/13))] aspect-[15/13] my-auto'
            : 'w-full max-w-4xl aspect-[15/13]'
        }`}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="w-full h-full block touch-none select-none"
        />

        {gameState === 'menu' && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-white space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2 text-amber-400 text-4xl sm:text-5xl font-black tracking-wider">
              <Flame className="w-10 h-10 text-orange-500 animate-bounce" />
              BOMBER BLAST
            </div>
            <p className="text-xs sm:text-sm text-slate-300 max-w-md text-center font-mono">
              爆弾を置いてレンガを破壊！アイテムを獲得してライバルを吹き飛ばせ！
            </p>

            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
              <button
                onClick={() => handleStartGame('battle')}
                className="flex-1 py-3.5 px-4 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 font-bold rounded-2xl shadow-lg transition cursor-pointer flex flex-col items-center gap-1 text-center"
              >
                <div className="flex items-center gap-1.5 text-base">
                  <Swords className="w-5 h-5" />
                  バトルモード (4人対戦)
                </div>
                <span className="text-[10px] text-amber-200">サドンデス・CPU対戦</span>
              </button>

              <button
                onClick={() => handleStartGame('stage')}
                className="flex-1 py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 font-bold rounded-2xl shadow-lg transition cursor-pointer flex flex-col items-center gap-1 text-center"
              >
                <div className="flex items-center gap-1.5 text-base">
                  <Trophy className="w-5 h-5" />
                  ステージモード (全5面)
                </div>
                <span className="text-[10px] text-indigo-200">敵全滅＆脱出扉を探せ</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-mono pt-2">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">対戦形式:</span>
                <button
                  onClick={() => setIs2Player(!is2Player)}
                  className={`px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                    is2Player ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-300'
                  }`}
                >
                  {is2Player ? '👥 1台で2P対戦' : '🤖 1P vs CPU×3'}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-400">CPU難易度:</span>
                {(['easy', 'normal', 'hard'] as const).map((diff) => (
                  <button
                    key={diff}
                    onClick={() => setCpuDifficulty(diff)}
                    className={`px-2 py-1 rounded-lg border uppercase transition cursor-pointer ${
                      cpuDifficulty === diff
                        ? 'bg-amber-600 border-amber-400 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-300'
                    }`}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {gameState === 'roundOver' && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-white space-y-4 animate-in zoom-in-95 duration-200">
            <div className="text-amber-400 text-3xl font-black flex items-center gap-2">
              <Trophy className="w-8 h-8 text-amber-500" />
              ROUND RESULT
            </div>
            <div className="text-xl font-bold text-slate-100 font-mono">
              勝者: <span className="text-orange-400">{roundWinner}</span>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl w-full max-w-sm space-y-2 font-mono text-xs">
              <div className="text-slate-400 font-bold mb-2">生存ラウンド勝利数:</div>
              {stateRef.current.players.map((p) => (
                <div key={p.id} className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                    {p.name}
                  </span>
                  <span className="font-bold text-amber-400 text-sm">👑 {p.wins} 勝</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => initRound('battle')}
              className="px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold rounded-xl shadow-lg transition cursor-pointer flex items-center gap-2 mt-2"
            >
              <RotateCcw className="w-4 h-4" />
              次のラウンドへ
            </button>
          </div>
        )}

        {gameState === 'gameOver' && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-white space-y-4 animate-in zoom-in-95 duration-200">
            <div className="text-rose-500 text-4xl font-black">GAME OVER</div>
            <p className="text-xs text-slate-300 font-mono text-center">
              爆風に巻き込まれてしまいました！
            </p>
            <div className="text-sm font-mono text-slate-300">
              SCORE: <span className="font-bold text-white text-base">{matchScore.toLocaleString()} pts</span>
            </div>
            <button
              onClick={() => initRound(gameMode, currentStage)}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg transition flex items-center gap-2 cursor-pointer mt-2"
            >
              <RotateCcw className="w-4 h-4" />
              もう一度挑戦
            </button>
          </div>
        )}

        {gameState === 'stageClear' && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-white space-y-4 animate-in zoom-in-95 duration-200">
            <div className="text-emerald-400 text-4xl font-black flex items-center gap-2">
              <Sparkles className="w-8 h-8 text-amber-400" />
              STAGE {currentStage} CLEAR!
            </div>
            <p className="text-xs text-slate-300 font-mono">
              扉を開けて無事に脱出しました！
            </p>
            <div className="text-sm font-mono text-slate-200">
              TOTAL SCORE: <span className="font-bold text-amber-400 text-base">{matchScore.toLocaleString()} pts</span>
            </div>

            {currentStage < 5 ? (
              <button
                onClick={() => {
                  const next = currentStage + 1;
                  setCurrentStage(next);
                  initRound('stage', next);
                }}
                className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg transition flex items-center gap-2 cursor-pointer mt-2"
              >
                <Play className="w-4 h-4" />
                次のステージへ (STAGE {currentStage + 1})
              </button>
            ) : (
              <div className="text-center space-y-3">
                <div className="text-amber-300 font-bold text-lg">🎉 全ステージ完全制覇！おめでとうございます！ 🎉</div>
                <button
                  onClick={() => handleStartGame('stage')}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg transition cursor-pointer"
                >
                  最初からやり直す
                </button>
              </div>
            )}
          </div>
        )}

        {gameState === 'paused' && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-white space-y-4">
            <div className="text-3xl font-black">PAUSED</div>
            <button
              onClick={togglePause}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg transition flex items-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4" />
              ゲームを再開
            </button>
          </div>
        )}

        {showHelp && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-white overflow-y-auto animate-in fade-in duration-150 z-30">
            <div className="max-w-md w-full bg-slate-900 border border-slate-700 p-5 rounded-3xl space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-black flex items-center gap-2 text-amber-400">
                  <Flame className="w-5 h-5 text-orange-500" />
                  操作方法 ＆ アイテム図鑑
                </h3>
                <button
                  onClick={() => setShowHelp(false)}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="text-xs space-y-2 text-slate-300 font-mono">
                <div className="font-bold text-white border-b border-slate-800 pb-1">操作方法 (キーボード & スマホ):</div>
                <p>・[矢印キー] または [W/A/S/D]: 移動 (角抜けスライド補正完備)</p>
                <p>・[Space] または [J]: 爆弾設置</p>
                <p>・[E] または [K]: リモコン爆弾の起爆</p>
                <p>・[P]: 一時停止</p>
                <p>・2P対戦時: P2は [I/J/K/L] で移動、[Enter] で設置、[Shift] で起爆</p>
              </div>

              <div className="text-xs space-y-1.5 text-slate-300 font-mono">
                <div className="font-bold text-white border-b border-slate-800 pb-1">パワーアップアイテム (全10種):</div>
                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  <div>💣 <b>ボムUP</b>: 設置数+1</div>
                  <div>🔥 <b>ファイアUP</b>: 火力+1</div>
                  <div>👟 <b>スピードUP</b>: 移動速度上昇</div>
                  <div>💥 <b>フルファイア</b>: 一気に最大火力</div>
                  <div>⚽ <b>キック</b>: ボムを蹴って飛ばす</div>
                  <div>📡 <b>リモコン</b>: 任意起爆可能</div>
                  <div>👻 <b>ボムスルー</b>: 自ボムすり抜け</div>
                  <div>🧱 <b>ブロックスルー</b>: レンガ透過</div>
                  <div>⭐ <b>スター</b>: 12秒間完全無敵</div>
                  <div>💀 <b>ドクロ</b>: 予測不能な呪い</div>
                </div>
              </div>

              <button
                onClick={() => setShowHelp(false)}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition cursor-pointer mt-2"
              >
                閉じる
              </button>
            </div>
          </div>
        )}
      </div>

      {/* モバイル用バーチャルコントローラー */}
      <div className="w-full max-w-4xl flex items-center justify-between px-4 py-3 mt-1 sm:hidden">
        <div className="grid grid-cols-3 gap-1.5 w-36 h-36">
          <div />
          <button
            onPointerDown={() => handleTouchDir('UP')}
            onPointerUp={() => handleTouchDir('NONE')}
            onPointerCancel={() => handleTouchDir('NONE')}
            className="bg-slate-800/80 active:bg-slate-600 text-white rounded-xl flex items-center justify-center font-bold text-xl select-none"
          >
            ▲
          </button>
          <div />
          <button
            onPointerDown={() => handleTouchDir('LEFT')}
            onPointerUp={() => handleTouchDir('NONE')}
            onPointerCancel={() => handleTouchDir('NONE')}
            className="bg-slate-800/80 active:bg-slate-600 text-white rounded-xl flex items-center justify-center font-bold text-xl select-none"
          >
            ◀
          </button>
          <div className="bg-slate-900/60 rounded-xl" />
          <button
            onPointerDown={() => handleTouchDir('RIGHT')}
            onPointerUp={() => handleTouchDir('NONE')}
            onPointerCancel={() => handleTouchDir('NONE')}
            className="bg-slate-800/80 active:bg-slate-600 text-white rounded-xl flex items-center justify-center font-bold text-xl select-none"
          >
            ▶
          </button>
          <div />
          <button
            onPointerDown={() => handleTouchDir('DOWN')}
            onPointerUp={() => handleTouchDir('NONE')}
            onPointerCancel={() => handleTouchDir('NONE')}
            className="bg-slate-800/80 active:bg-slate-600 text-white rounded-xl flex items-center justify-center font-bold text-xl select-none"
          >
            ▼
          </button>
          <div />
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            onClick={() => {
              const p1 = stateRef.current.players[0];
              if (p1) tryPlaceBomb(p1);
            }}
            className="w-20 h-20 rounded-full bg-gradient-to-tr from-rose-600 to-orange-500 active:scale-95 text-white font-black text-sm shadow-xl flex flex-col items-center justify-center gap-0.5 select-none cursor-pointer"
          >
            <Flame className="w-6 h-6" />
            BOMB
          </button>
          <button
            onClick={() => {
              const p1 = stateRef.current.players[0];
              if (p1) triggerRemoteDetonation(p1);
            }}
            className="w-16 h-12 self-center rounded-2xl bg-indigo-600 active:scale-95 text-white font-bold text-xs shadow-md flex items-center justify-center select-none cursor-pointer"
          >
            起爆
          </button>
        </div>
      </div>
    </div>
  );
};
