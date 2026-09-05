import React, { useState, useEffect, useRef, useCallback } from 'react';
import { sound } from '../utils/audio';
import {
  Play,
  RotateCcw,
  Trophy,
  Volume2,
  VolumeX,
  Zap,
  Pause,
  Palette,
  Timer,
  Swords,
  Layers,
} from 'lucide-react';

const HIGH_SCORE_KEY = 'holeio_high_score';
const BEST_KILLS_KEY = 'holeio_best_kills';
const MAX_SIZE_KEY = 'holeio_max_size';

interface HoleIoGameProps {
  onBackToHub: () => void;
  isDark: boolean;
  isFullscreen?: boolean;
}

type GameMode = 'classic' | 'royale' | 'endless';

interface Skin {
  id: string;
  name: string;
  color: string;
  innerColor: string;
  glowColor: string;
  trailColor: string;
}

const SKINS: Skin[] = [
  {
    id: 'abyss',
    name: '深淵のヴォイド (Abyss)',
    color: '#09090b',
    innerColor: '#000000',
    glowColor: '#38bdf8',
    trailColor: 'rgba(56, 189, 248, 0.4)',
  },
  {
    id: 'cyber',
    name: 'ネオンサイバー (Cyber)',
    color: '#18181b',
    innerColor: '#050505',
    glowColor: '#f43f5e',
    trailColor: 'rgba(244, 63, 94, 0.4)',
  },
  {
    id: 'volcano',
    name: 'マグマ溶岩 (Volcano)',
    color: '#290800',
    innerColor: '#120200',
    glowColor: '#f97316',
    trailColor: 'rgba(249, 115, 22, 0.4)',
  },
  {
    id: 'cosmic',
    name: 'コズミック銀河 (Cosmic)',
    color: '#1e1035',
    innerColor: '#0a0014',
    glowColor: '#a855f7',
    trailColor: 'rgba(168, 85, 247, 0.4)',
  },
  {
    id: 'emerald',
    name: 'エメラルド毒素 (Emerald)',
    color: '#022c22',
    innerColor: '#00140e',
    glowColor: '#10b981',
    trailColor: 'rgba(16, 185, 129, 0.4)',
  },
  {
    id: 'golden',
    name: '黄金の引力 (Golden)',
    color: '#291800',
    innerColor: '#120a00',
    glowColor: '#eab308',
    trailColor: 'rgba(234, 179, 8, 0.4)',
  },
];

type ObjectType =
  | 'person'
  | 'cone'
  | 'hydrant'
  | 'trashcan'
  | 'bench'
  | 'mailbox'
  | 'bike'
  | 'lightpole'
  | 'tree_small'
  | 'cafe_table'
  | 'vending'
  | 'car_sedan'
  | 'car_police'
  | 'car_taxi'
  | 'car_suv'
  | 'tree_big'
  | 'foodtruck'
  | 'bus'
  | 'truck'
  | 'house_small'
  | 'gas_station'
  | 'mansion'
  | 'office_mid'
  | 'skyscraper'
  | 'tower';

interface CityObject {
  id: number;
  type: ObjectType;
  x: number;
  y: number;
  width: number;
  height: number;
  minHoleRadius: number; // この半径以上で吸い込み可能
  tier: number; // 1〜6
  scoreValue: number;
  color: string;
  colorSecondary?: string;
  // 吸い込みアニメーション状態
  isSwallowed: boolean;
  swallowingHoleId: number | null; // 吸い込んでいるホールのID
  swallowProgress: number; // 0 -> 1
  originX: number;
  originY: number;
  angle: number;
  rotSpeed: number;
  // 歩行者用
  isMovingPerson?: boolean;
  vx?: number;
  vy?: number;
}

interface HoleEntity {
  id: number;
  name: string;
  isPlayer: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  targetRadius: number;
  score: number;
  level: number;
  kills: number;
  skin: Skin;
  isAlive: boolean;
  respawnTime: number;
  // スタミナ & ブースト
  stamina: number;
  isBoosting: boolean;
  // パワーアップ状態
  magnetTime: number;
  speedTime: number;
  freezeTime: number;
  megaTime: number;
  // Bot用
  aiTargetX?: number;
  aiTargetY?: number;
  aiRetargetTimer?: number;
}

interface PowerUpItem {
  id: number;
  type: 'magnet' | 'speed' | 'freeze' | 'mega';
  x: number;
  y: number;
  radius: number;
  angle: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  maxLife: number;
  life: number;
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

interface Shockwave {
  id: number;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
}

interface KillFeed {
  id: number;
  killer: string;
  victim: string;
  time: number;
}

const MAP_SIZE = 3600;
const INITIAL_RADIUS = 26;
const MAX_BOTS = 8;
const CLASSIC_TIME_LIMIT = 120; // 2分
const BATTLE_ROYALE_TIME = 150; // 2分30秒

const BOT_NAMES = [
  'Vortex-99',
  'MegaAbyss',
  'BlackStar',
  'GravityZero',
  'CosmoEater',
  'ShadowPit',
  'TitanHole',
  'QuantumDevour',
  'Singularity',
  'NightMaw',
];

export const HoleIoGame: React.FC<HoleIoGameProps> = ({
  isDark,
  isFullscreen = false,
}) => {
  // --- ステート管理 ---
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'paused' | 'gameover'>('menu');
  const [gameMode, setGameMode] = useState<GameMode>('classic');
  const [selectedSkin, setSelectedSkin] = useState<Skin>(SKINS[0]);
  const [isMuted, setIsMuted] = useState<boolean>(sound.getMuted());
  const [timeLeft, setTimeLeft] = useState<number>(CLASSIC_TIME_LIMIT);
  const [combo, setCombo] = useState<number>(0);
  const [comboText, setComboText] = useState<string>('');
  const [playerRank, setPlayerRank] = useState<number>(1);
  const [highScore, setHighScore] = useState<number>(0);
  const [bestKills, setBestKills] = useState<number>(0);
  const [maxSizeRecord, setMaxSizeRecord] = useState<number>(0);

  // リザルト用ステート
  const [finalScore, setFinalScore] = useState<number>(0);
  const [finalRank, setFinalRank] = useState<number>(1);
  const [finalKills, setFinalKills] = useState<number>(0);
  const [finalSize, setFinalSize] = useState<number>(0);
  const [objectsSwallowedCount, setObjectsSwallowedCount] = useState<number>(0);
  const [isNewRecord, setIsNewRecord] = useState<boolean>(false);

  // HUD用リアルタイム値
  const [hudScore, setHudScore] = useState<number>(0);
  const [hudLevel, setHudLevel] = useState<number>(1);
  const [hudSize, setHudSize] = useState<number>(INITIAL_RADIUS);
  const [hudStamina, setHudStamina] = useState<number>(100);
  const [hudActiveBuff, setHudActiveBuff] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<{ name: string; score: number; isPlayer: boolean }[]>([]);
  const [killFeeds, setKillFeeds] = useState<KillFeed[]>([]);

  // 参照
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const timeLeftRef = useRef<number>(CLASSIC_TIME_LIMIT);
  const isGameOverCalledRef = useRef<boolean>(false);

  // ゲーム内部エンティティ
  const entitiesRef = useRef<{
    player: HoleEntity;
    bots: HoleEntity[];
    objects: CityObject[];
    powerUps: PowerUpItem[];
    particles: Particle[];
    floatingTexts: FloatingText[];
    shockwaves: Shockwave[];
    camera: { x: number; y: number; zoom: number };
    comboCount: number;
    comboTimer: number;
    swallowedCounter: number;
    killFeedList: KillFeed[];
    safeZoneRadius: number; // バトロワ用
  }>({
    player: createHoleEntity(0, 'Player', true, 1800, 1800, SKINS[0]),
    bots: [],
    objects: [],
    powerUps: [],
    particles: [],
    floatingTexts: [],
    shockwaves: [],
    camera: { x: 1800, y: 1800, zoom: 1.0 },
    comboCount: 0,
    comboTimer: 0,
    swallowedCounter: 0,
    killFeedList: [],
    safeZoneRadius: MAP_SIZE * 0.7,
  });

  // 操作入力
  const inputRef = useRef<{
    keys: { [key: string]: boolean };
    mousePos: { x: number; y: number } | null;
    isMouseDown: boolean;
    touchOrigin: { x: number; y: number } | null;
    touchCurrent: { x: number; y: number } | null;
    boostActive: boolean;
  }>({
    keys: {},
    mousePos: null,
    isMouseDown: false,
    touchOrigin: null,
    touchCurrent: null,
    boostActive: false,
  });

  // ハイスコア読み込み
  useEffect(() => {
    try {
      const s = parseInt(localStorage.getItem(HIGH_SCORE_KEY) || '0', 10);
      const k = parseInt(localStorage.getItem(BEST_KILLS_KEY) || '0', 10);
      const m = parseInt(localStorage.getItem(MAX_SIZE_KEY) || '0', 10);
      setHighScore(s);
      setBestKills(k);
      setMaxSizeRecord(m);
    } catch {}
  }, []);

  // --- ヘルパー関数: ホールエンティティ作成 ---
  function createHoleEntity(
    id: number,
    name: string,
    isPlayer: boolean,
    x: number,
    y: number,
    skin: Skin
  ): HoleEntity {
    return {
      id,
      name,
      isPlayer,
      x,
      y,
      vx: 0,
      vy: 0,
      radius: INITIAL_RADIUS,
      targetRadius: INITIAL_RADIUS,
      score: 0,
      level: 1,
      kills: 0,
      skin,
      isAlive: true,
      respawnTime: 0,
      stamina: 100,
      isBoosting: false,
      magnetTime: 0,
      speedTime: 0,
      freezeTime: 0,
      megaTime: 0,
      aiTargetX: x,
      aiTargetY: y,
      aiRetargetTimer: 0,
    };
  }

  // --- 都市オブジェクト生成 ---
  const generateCityObjects = useCallback(() => {
    const objs: CityObject[] = [];
    let idCounter = 1;

    // ヘルパー: ランダム範囲
    const rand = (min: number, max: number) => min + Math.random() * (max - min);

    // グリッド街路ブロック（道路と区画のレイアウト）
    const BLOCK_SIZE = 400;
    const ROAD_WIDTH = 120;
    const numBlocks = Math.floor(MAP_SIZE / BLOCK_SIZE);

    for (let bx = 0; bx < numBlocks; bx++) {
      for (let by = 0; by < numBlocks; by++) {
        const blockLeft = bx * BLOCK_SIZE + ROAD_WIDTH / 2;
        const blockTop = by * BLOCK_SIZE + ROAD_WIDTH / 2;
        const blockRight = (bx + 1) * BLOCK_SIZE - ROAD_WIDTH / 2;
        const blockBottom = (by + 1) * BLOCK_SIZE - ROAD_WIDTH / 2;
        const blockWidth = blockRight - blockLeft;
        const blockHeight = blockBottom - blockTop;

        const isPark = (bx + by) % 4 === 0;
        const isCommercial = (bx * 3 + by) % 5 === 0;
        const isHighrise = bx >= 3 && bx <= 5 && by >= 3 && by <= 5; // 中央付近は高層ビル街

        if (isHighrise) {
          // 高層ビル（特大・超巨大）
          objs.push({
            id: idCounter++,
            type: Math.random() > 0.4 ? 'skyscraper' : 'tower',
            x: blockLeft + blockWidth * 0.5,
            y: blockTop + blockHeight * 0.5,
            width: 140,
            height: 140,
            minHoleRadius: 210,
            tier: 6,
            scoreValue: 600,
            color: '#1e293b',
            colorSecondary: '#38bdf8',
            isSwallowed: false,
            swallowingHoleId: null,
            swallowProgress: 0,
            originX: blockLeft + blockWidth * 0.5,
            originY: blockTop + blockHeight * 0.5,
            angle: 0,
            rotSpeed: (Math.random() - 0.5) * 0.05,
          });

          // 周囲の植栽や街灯
          for (let k = 0; k < 6; k++) {
            objs.push({
              id: idCounter++,
              type: Math.random() > 0.5 ? 'tree_small' : 'lightpole',
              x: rand(blockLeft + 20, blockRight - 20),
              y: rand(blockTop + 20, blockBottom - 20),
              width: 24,
              height: 24,
              minHoleRadius: 40,
              tier: 2,
              scoreValue: 20,
              color: '#22c55e',
              isSwallowed: false,
              swallowingHoleId: null,
              swallowProgress: 0,
              originX: 0,
              originY: 0,
              angle: 0,
              rotSpeed: 0.1,
            });
          }
        } else if (isCommercial) {
          // オフィスビル・中規模ビル・コンビニ
          objs.push({
            id: idCounter++,
            type: 'office_mid',
            x: blockLeft + blockWidth * 0.35,
            y: blockTop + blockHeight * 0.35,
            width: 90,
            height: 90,
            minHoleRadius: 140,
            tier: 5,
            scoreValue: 300,
            color: '#334155',
            colorSecondary: '#94a3b8',
            isSwallowed: false,
            swallowingHoleId: null,
            swallowProgress: 0,
            originX: 0,
            originY: 0,
            angle: 0,
            rotSpeed: 0.04,
          });

          objs.push({
            id: idCounter++,
            type: 'gas_station',
            x: blockLeft + blockWidth * 0.75,
            y: blockTop + blockHeight * 0.75,
            width: 75,
            height: 75,
            minHoleRadius: 100,
            tier: 4,
            scoreValue: 180,
            color: '#ef4444',
            isSwallowed: false,
            swallowingHoleId: null,
            swallowProgress: 0,
            originX: 0,
            originY: 0,
            angle: 0,
            rotSpeed: 0.04,
          });

          // 自動販売機やカフェテーブル
          for (let k = 0; k < 4; k++) {
            objs.push({
              id: idCounter++,
              type: Math.random() > 0.5 ? 'cafe_table' : 'vending',
              x: rand(blockLeft + 30, blockRight - 30),
              y: rand(blockTop + 30, blockBottom - 30),
              width: 22,
              height: 22,
              minHoleRadius: 42,
              tier: 2,
              scoreValue: 25,
              color: '#f59e0b',
              isSwallowed: false,
              swallowingHoleId: null,
              swallowProgress: 0,
              originX: 0,
              originY: 0,
              angle: 0,
              rotSpeed: 0.08,
            });
          }
        } else if (isPark) {
          // 緑地公園（大木、ベンチ、消火栓、噴水広場）
          for (let k = 0; k < 3; k++) {
            objs.push({
              id: idCounter++,
              type: 'tree_big',
              x: rand(blockLeft + 40, blockRight - 40),
              y: rand(blockTop + 40, blockBottom - 40),
              width: 55,
              height: 55,
              minHoleRadius: 65,
              tier: 3,
              scoreValue: 70,
              color: '#15803d',
              isSwallowed: false,
              swallowingHoleId: null,
              swallowProgress: 0,
              originX: 0,
              originY: 0,
              angle: 0,
              rotSpeed: 0.05,
            });
          }
          for (let k = 0; k < 8; k++) {
            objs.push({
              id: idCounter++,
              type: 'bench',
              x: rand(blockLeft + 20, blockRight - 20),
              y: rand(blockTop + 20, blockBottom - 20),
              width: 18,
              height: 18,
              minHoleRadius: 24,
              tier: 1,
              scoreValue: 10,
              color: '#78350f',
              isSwallowed: false,
              swallowingHoleId: null,
              swallowProgress: 0,
              originX: 0,
              originY: 0,
              angle: 0,
              rotSpeed: 0.1,
            });
          }
        } else {
          // 住宅エリア（一軒家、小型住宅、車）
          objs.push({
            id: idCounter++,
            type: Math.random() > 0.5 ? 'house_small' : 'mansion',
            x: blockLeft + blockWidth * 0.5,
            y: blockTop + blockHeight * 0.5,
            width: 80,
            height: 80,
            minHoleRadius: 100,
            tier: 4,
            scoreValue: 150,
            color: '#b45309',
            isSwallowed: false,
            swallowingHoleId: null,
            swallowProgress: 0,
            originX: 0,
            originY: 0,
            angle: 0,
            rotSpeed: 0.04,
          });

          // 小型車
          objs.push({
            id: idCounter++,
            type: 'car_sedan',
            x: blockLeft + 45,
            y: blockBottom - 45,
            width: 42,
            height: 24,
            minHoleRadius: 60,
            tier: 3,
            scoreValue: 60,
            color: '#2563eb',
            isSwallowed: false,
            swallowingHoleId: null,
            swallowProgress: 0,
            originX: 0,
            originY: 0,
            angle: 0,
            rotSpeed: 0.06,
          });
        }

        // 道路沿い（歩行者・車・コーン・消火栓など）
        // 水平道路
        if (Math.random() > 0.3) {
          objs.push({
            id: idCounter++,
            type: Math.random() > 0.6 ? 'bus' : 'truck',
            x: blockLeft + blockWidth * 0.5,
            y: by * BLOCK_SIZE + ROAD_WIDTH * 0.5,
            width: 65,
            height: 30,
            minHoleRadius: 95,
            tier: 4,
            scoreValue: 130,
            color: '#eab308',
            isSwallowed: false,
            swallowingHoleId: null,
            swallowProgress: 0,
            originX: 0,
            originY: 0,
            angle: 0,
            rotSpeed: 0.05,
          });
        }

        // パトカー / タクシー
        if (Math.random() > 0.4) {
          objs.push({
            id: idCounter++,
            type: Math.random() > 0.5 ? 'car_police' : 'car_taxi',
            x: bx * BLOCK_SIZE + ROAD_WIDTH * 0.5,
            y: blockTop + blockHeight * 0.5,
            width: 42,
            height: 24,
            minHoleRadius: 60,
            tier: 3,
            scoreValue: 65,
            color: '#1e293b',
            colorSecondary: '#3b82f6',
            isSwallowed: false,
            swallowingHoleId: null,
            swallowProgress: 0,
            originX: 0,
            originY: 0,
            angle: Math.PI / 2,
            rotSpeed: 0.06,
          });
        }
      }
    }

    // 歩行者を多数配置（街中を気ままに歩き回る）
    const PERSON_COLORS = ['#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];
    for (let p = 0; p < 220; p++) {
      const col = PERSON_COLORS[Math.floor(Math.random() * PERSON_COLORS.length)];
      objs.push({
        id: idCounter++,
        type: 'person',
        x: rand(150, MAP_SIZE - 150),
        y: rand(150, MAP_SIZE - 150),
        width: 12,
        height: 12,
        minHoleRadius: 20,
        tier: 1,
        scoreValue: 12,
        color: col,
        isSwallowed: false,
        swallowingHoleId: null,
        swallowProgress: 0,
        originX: 0,
        originY: 0,
        angle: Math.random() * Math.PI * 2,
        rotSpeed: 0.2,
        isMovingPerson: true,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
      });
    }

    // 小物（コーン・ゴミ箱・消火栓・ポスト・自転車）を全体に散りばめる
    const smallTypes: ObjectType[] = ['cone', 'trashcan', 'hydrant', 'mailbox', 'bike'];
    for (let s = 0; s < 260; s++) {
      const st = smallTypes[Math.floor(Math.random() * smallTypes.length)];
      objs.push({
        id: idCounter++,
        type: st,
        x: rand(100, MAP_SIZE - 100),
        y: rand(100, MAP_SIZE - 100),
        width: 14,
        height: 14,
        minHoleRadius: 22,
        tier: 1,
        scoreValue: 8,
        color: st === 'cone' ? '#f97316' : st === 'hydrant' ? '#ef4444' : st === 'mailbox' ? '#dc2626' : '#64748b',
        isSwallowed: false,
        swallowingHoleId: null,
        swallowProgress: 0,
        originX: 0,
        originY: 0,
        angle: 0,
        rotSpeed: 0.15,
      });
    }

    return objs;
  }, []);

  // --- パワーアップアイテム生成 ---
  const spawnPowerUps = useCallback(() => {
    const types: ('magnet' | 'speed' | 'freeze' | 'mega')[] = ['magnet', 'speed', 'freeze', 'mega'];
    const items: PowerUpItem[] = [];
    for (let i = 0; i < 8; i++) {
      items.push({
        id: i + 1,
        type: types[i % types.length],
        x: 300 + Math.random() * (MAP_SIZE - 600),
        y: 300 + Math.random() * (MAP_SIZE - 600),
        radius: 20,
        angle: 0,
      });
    }
    return items;
  }, []);

  // --- ゲーム初期化 ---
  const startGame = (mode: GameMode) => {
    setGameMode(mode);
    const initialTime = mode === 'classic' ? CLASSIC_TIME_LIMIT : BATTLE_ROYALE_TIME;
    setTimeLeft(initialTime);
    timeLeftRef.current = initialTime;
    isGameOverCalledRef.current = false;
    setCombo(0);
    setComboText('');
    setObjectsSwallowedCount(0);
    setIsNewRecord(false);

    // プレイヤー初期位置
    const pX = 1800;
    const pY = 1800;
    const player = createHoleEntity(0, 'あなた (You)', true, pX, pY, selectedSkin);

    // Bot初期配置
    const bots: HoleEntity[] = [];
    for (let i = 0; i < MAX_BOTS; i++) {
      const angle = (i / MAX_BOTS) * Math.PI * 2;
      const dist = 500 + Math.random() * 800;
      const bx = Math.max(200, Math.min(MAP_SIZE - 200, pX + Math.cos(angle) * dist));
      const by = Math.max(200, Math.min(MAP_SIZE - 200, pY + Math.sin(angle) * dist));
      const skinIndex = (i + 1) % SKINS.length;
      bots.push(
        createHoleEntity(i + 1, BOT_NAMES[i % BOT_NAMES.length], false, bx, by, SKINS[skinIndex])
      );
    }

    entitiesRef.current = {
      player,
      bots,
      objects: generateCityObjects(),
      powerUps: spawnPowerUps(),
      particles: [],
      floatingTexts: [],
      shockwaves: [],
      camera: { x: pX, y: pY, zoom: 1.15 },
      comboCount: 0,
      comboTimer: 0,
      swallowedCounter: 0,
      killFeedList: [],
      safeZoneRadius: MAP_SIZE * 0.7,
    };

    setGameState('playing');
    sound.playHoleLevelUp();
  };

  // --- ゲームオーバー処理 ---
  const handleGameOver = useCallback((rank: number) => {
    if (isGameOverCalledRef.current) return;
    isGameOverCalledRef.current = true;
    setGameState('gameover');
    const player = entitiesRef.current.player;
    setFinalScore(player.score);
    setFinalRank(rank);
    setFinalKills(player.kills);
    setFinalSize(Math.round(player.radius));

    let recordUpdated = false;
    if (player.score > highScore) {
      setHighScore(player.score);
      try {
        localStorage.setItem(HIGH_SCORE_KEY, player.score.toString());
      } catch {}
      recordUpdated = true;
    }
    if (player.kills > bestKills) {
      setBestKills(player.kills);
      try {
        localStorage.setItem(BEST_KILLS_KEY, player.kills.toString());
      } catch {}
      recordUpdated = true;
    }
    if (Math.round(player.radius) > maxSizeRecord) {
      setMaxSizeRecord(Math.round(player.radius));
      try {
        localStorage.setItem(MAX_SIZE_KEY, Math.round(player.radius).toString());
      } catch {}
      recordUpdated = true;
    }
    setIsNewRecord(recordUpdated);
    if (rank === 1) {
      sound.playWin();
    } else {
      sound.playGameOver();
    }
  }, [highScore, bestKills, maxSizeRecord]);

  // --- キーボード＆マウス＆タッチイベント ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      inputRef.current.keys[e.code] = true;
      if (e.code === 'Space') {
        inputRef.current.boostActive = true;
      }
      if (e.code === 'KeyP' || e.code === 'Escape') {
        setGameState((prev) => (prev === 'playing' ? 'paused' : prev === 'paused' ? 'playing' : prev));
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      inputRef.current.keys[e.code] = false;
      if (e.code === 'Space') {
        inputRef.current.boostActive = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // マウス追従
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    inputRef.current.mousePos = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    inputRef.current.isMouseDown = true;
    if (e.button === 2) {
      // 右クリックでブースト
      inputRef.current.boostActive = true;
    }
  };

  const handleMouseUp = () => {
    inputRef.current.isMouseDown = false;
    inputRef.current.boostActive = false;
  };

  const handleMouseLeave = () => {
    inputRef.current.mousePos = null;
    inputRef.current.isMouseDown = false;
    inputRef.current.boostActive = false;
  };

  // タッチ操作（画面上の仮想スティック/ドラッグ）
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || e.touches.length === 0) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const t = e.touches[0];
    const tx = t.clientX - rect.left;
    const ty = t.clientY - rect.top;
    inputRef.current.touchOrigin = { x: tx, y: ty };
    inputRef.current.touchCurrent = { x: tx, y: ty };
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || e.touches.length === 0) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const t = e.touches[0];
    inputRef.current.touchCurrent = {
      x: t.clientX - rect.left,
      y: t.clientY - rect.top,
    };
  };

  const handleTouchEnd = () => {
    inputRef.current.touchOrigin = null;
    inputRef.current.touchCurrent = null;
    inputRef.current.boostActive = false;
  };

  // --- メインゲームループ ---
  useEffect(() => {
    if (gameState !== 'playing') {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      return;
    }

    let lastTime = performance.now();
    let secondAcc = 0;

    const gameLoop = (currentTime: number) => {
      const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      // 1秒ごとのタイマー更新
      secondAcc += dt;
      if (secondAcc >= 1.0) {
        secondAcc -= 1.0;
        if (gameMode !== 'endless' && !isGameOverCalledRef.current) {
          timeLeftRef.current -= 1;
          const remaining = Math.max(0, timeLeftRef.current);
          setTimeLeft(remaining);
          if (remaining <= 0) {
            // タイムアップ
            const sorted = [
              entitiesRef.current.player,
              ...entitiesRef.current.bots.filter((b) => b.isAlive),
            ].sort((a, b) => b.score - a.score);
            const rank = sorted.findIndex((h) => h.isPlayer) + 1;
            handleGameOver(rank > 0 ? rank : 1);
            return;
          }
        }
      }

      // 物理・ロジック更新
      updatePhysics(dt);

      // 描画実行
      renderGame();

      animFrameIdRef.current = requestAnimationFrame(gameLoop);
    };

    animFrameIdRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [gameState, gameMode, handleGameOver]);

  // --- 物理・ロジック更新処理 ---
  const updatePhysics = (dt: number) => {
    const data = entitiesRef.current;
    const player = data.player;
    const input = inputRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 1. プレイヤーの移動入力処理
    let moveX = 0;
    let moveY = 0;

    // キーボード入力 (WASD / 矢印)
    if (input.keys['KeyW'] || input.keys['ArrowUp']) moveY -= 1;
    if (input.keys['KeyS'] || input.keys['ArrowDown']) moveY += 1;
    if (input.keys['KeyA'] || input.keys['ArrowLeft']) moveX -= 1;
    if (input.keys['KeyD'] || input.keys['ArrowRight']) moveX += 1;

    // タッチ仮想スティック入力
    if (input.touchOrigin && input.touchCurrent) {
      const dx = input.touchCurrent.x - input.touchOrigin.x;
      const dy = input.touchCurrent.y - input.touchOrigin.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 10) {
        moveX = dx / dist;
        moveY = dy / dist;
      }
    } else if (input.mousePos && (moveX === 0 && moveY === 0)) {
      // マウス追従
      const screenCenterX = canvas.width / 2;
      const screenCenterY = canvas.height / 2;
      const mdx = input.mousePos.x - screenCenterX;
      const mdy = input.mousePos.y - screenCenterY;
      const dist = Math.hypot(mdx, mdy);
      if (dist > 25) {
        const factor = Math.min(dist / 120, 1.0);
        moveX = (mdx / dist) * factor;
        moveY = (mdy / dist) * factor;
      }
    }

    // スタミナ＆ブースト判定
    const wantsBoost = input.boostActive || input.keys['ShiftLeft'] || input.keys['Space'];
    if (wantsBoost && player.stamina > 10) {
      player.isBoosting = true;
      player.stamina = Math.max(0, player.stamina - dt * 35);
      if (Math.random() < 0.3) {
        sound.playHoleBoost();
      }
    } else {
      player.isBoosting = false;
      player.stamina = Math.min(100, player.stamina + dt * 18);
    }

    // ホール速度計算（大きくなるにつれてやや重厚に、ブーストで高速化）
    const getHoleSpeed = (h: HoleEntity) => {
      let spd = 260 / Math.pow(h.radius / INITIAL_RADIUS, 0.28);
      if (h.speedTime > 0) spd *= 1.6;
      if (h.isBoosting) spd *= 1.5;
      return spd;
    };

    // プレイヤー移動更新
    if (player.isAlive) {
      const pSpeed = getHoleSpeed(player);
      const mag = Math.hypot(moveX, moveY);
      if (mag > 0.05) {
        player.vx = (moveX / mag) * pSpeed * Math.min(mag, 1.0);
        player.vy = (moveY / mag) * pSpeed * Math.min(mag, 1.0);
      } else {
        player.vx *= 0.85;
        player.vy *= 0.85;
      }

      player.x += player.vx * dt;
      player.y += player.vy * dt;

      // マップ境界制限
      player.x = Math.max(player.radius, Math.min(MAP_SIZE - player.radius, player.x));
      player.y = Math.max(player.radius, Math.min(MAP_SIZE - player.radius, player.y));
    } else {
      // プレイヤーリスポーン処理 (クラシック・エンドレスのみ)
      if (gameMode !== 'royale') {
        player.respawnTime -= dt;
        if (player.respawnTime <= 0) {
          player.isAlive = true;
          player.x = 400 + Math.random() * (MAP_SIZE - 800);
          player.y = 400 + Math.random() * (MAP_SIZE - 800);
          player.targetRadius = Math.max(INITIAL_RADIUS, player.targetRadius * 0.85);
          player.radius = player.targetRadius;
          sound.playHoleLevelUp();
        }
      }
    }

    // パワーアップ時間減少
    const allHoles = [player, ...data.bots];
    allHoles.forEach((h) => {
      if (h.magnetTime > 0) h.magnetTime -= dt;
      if (h.speedTime > 0) h.speedTime -= dt;
      if (h.freezeTime > 0) h.freezeTime -= dt;
      if (h.megaTime > 0) {
        h.megaTime -= dt;
        if (h.megaTime <= 0) {
          h.targetRadius = h.targetRadius / 1.5;
        }
      }
      // 半径のスムーズ拡大補間
      h.radius += (h.targetRadius - h.radius) * Math.min(dt * 8, 1);
    });

    // 2. Bot AIの動作更新
    data.bots.forEach((bot) => {
      if (!bot.isAlive) {
        if (gameMode !== 'royale') {
          bot.respawnTime -= dt;
          if (bot.respawnTime <= 0) {
            bot.isAlive = true;
            bot.x = 300 + Math.random() * (MAP_SIZE - 600);
            bot.y = 300 + Math.random() * (MAP_SIZE - 600);
            bot.targetRadius = Math.max(INITIAL_RADIUS, bot.targetRadius * 0.8);
            bot.radius = bot.targetRadius;
          }
        }
        return;
      }

      // フリーズ状態
      if (player.freezeTime > 0) {
        bot.vx = 0;
        bot.vy = 0;
        return;
      }

      bot.aiRetargetTimer = (bot.aiRetargetTimer || 0) - dt;

      // 危険な大きいホールからの逃避、または獲物ホールの追尾
      let threat: HoleEntity | null = null;
      let preyHole: HoleEntity | null = null;

      allHoles.forEach((other) => {
        if (other.id === bot.id || !other.isAlive) return;
        const d = Math.hypot(other.x - bot.x, other.y - bot.y);
        // 自分より大きいホール（半径1.15倍以上）が近い場合は逃げる
        if (other.radius > bot.radius * 1.15 && d < bot.radius * 3.5 + 200) {
          threat = other;
        } else if (other.radius < bot.radius * 0.75 && d < bot.radius * 4.0 + 150) {
          preyHole = other;
        }
      });

      let targetX = bot.x;
      let targetY = bot.y;

      if (threat) {
        // 脅威から反対方向に全力逃走
        const th = threat as HoleEntity;
        const angle = Math.atan2(bot.y - th.y, bot.x - th.x);
        targetX = bot.x + Math.cos(angle) * 300;
        targetY = bot.y + Math.sin(angle) * 300;
      } else if (preyHole) {
        // 小さいホールを追尾して捕食
        const pr = preyHole as HoleEntity;
        targetX = pr.x;
        targetY = pr.y;
      } else if (bot.aiRetargetTimer <= 0) {
        // 近くの吸い込めるオブジェクトを探索
        bot.aiRetargetTimer = 1.2 + Math.random() * 0.8;
        let bestDist = Infinity;
        let bestObj: CityObject | null = null;

        data.objects.forEach((obj) => {
          if (obj.isSwallowed || obj.minHoleRadius > bot.radius) return;
          const d = Math.hypot(obj.x - bot.x, obj.y - bot.y);
          if (d < 500 && d < bestDist) {
            bestDist = d;
            bestObj = obj;
          }
        });

        if (bestObj) {
          const bo = bestObj as CityObject;
          targetX = bo.x;
          targetY = bo.y;
        } else {
          // ランダム巡回
          targetX = 200 + Math.random() * (MAP_SIZE - 400);
          targetY = 200 + Math.random() * (MAP_SIZE - 400);
        }
        bot.aiTargetX = targetX;
        bot.aiTargetY = targetY;
      } else {
        targetX = bot.aiTargetX || bot.x;
        targetY = bot.aiTargetY || bot.y;
      }

      const bdx = targetX - bot.x;
      const bdy = targetY - bot.y;
      const bdist = Math.hypot(bdx, bdy);
      const bSpeed = getHoleSpeed(bot) * 0.92;

      if (bdist > 15) {
        bot.vx += ((bdx / bdist) * bSpeed - bot.vx) * Math.min(dt * 5, 1);
        bot.vy += ((bdy / bdist) * bSpeed - bot.vy) * Math.min(dt * 5, 1);
      } else {
        bot.vx *= 0.9;
        bot.vy *= 0.9;
      }

      bot.x += bot.vx * dt;
      bot.y += bot.vy * dt;
      bot.x = Math.max(bot.radius, Math.min(MAP_SIZE - bot.radius, bot.x));
      bot.y = Math.max(bot.radius, Math.min(MAP_SIZE - bot.radius, bot.y));
    });

    // 3. 歩行者の自立移動＆逃走AI
    data.objects.forEach((obj) => {
      if (!obj.isSwallowed && obj.isMovingPerson) {
        // 近くにホールがあるか
        let fleeX = 0;
        let fleeY = 0;
        allHoles.forEach((h) => {
          if (!h.isAlive) return;
          const dist = Math.hypot(obj.x - h.x, obj.y - h.y);
          if (dist < h.radius * 2.2 + 60) {
            fleeX += (obj.x - h.x) / dist;
            fleeY += (obj.y - h.y) / dist;
          }
        });

        if (fleeX !== 0 || fleeY !== 0) {
          const fMag = Math.hypot(fleeX, fleeY);
          obj.vx = (fleeX / fMag) * 90;
          obj.vy = (fleeY / fMag) * 90;
        } else {
          // 気ままに歩行
          if (Math.random() < 0.02) {
            obj.angle = Math.random() * Math.PI * 2;
            obj.vx = Math.cos(obj.angle) * 35;
            obj.vy = Math.sin(obj.angle) * 35;
          }
        }

        obj.x += (obj.vx || 0) * dt;
        obj.y += (obj.vy || 0) * dt;
        obj.x = Math.max(50, Math.min(MAP_SIZE - 50, obj.x));
        obj.y = Math.max(50, Math.min(MAP_SIZE - 50, obj.y));
      }
    });

    // 4. 吸い込み物理判定（オブジェクト vs 各ホール）
    data.objects.forEach((obj) => {
      if (obj.isSwallowed) {
        // 吸い込み中アニメーション
        obj.swallowProgress += dt * 3.6;
        if (obj.swallowProgress >= 1.0) {
          // 吸い込み完了
          obj.swallowProgress = 1.0;
        }
        return;
      }

      allHoles.forEach((hole) => {
        if (!hole.isAlive) return;

        const effectiveRadius = hole.magnetTime > 0 ? hole.radius * 1.6 : hole.radius;
        const dx = obj.x - hole.x;
        const dy = obj.y - hole.y;
        const dist = Math.hypot(dx, dy);

        // マグネット吸引
        if (hole.magnetTime > 0 && dist < effectiveRadius && obj.minHoleRadius <= hole.radius) {
          obj.x -= (dx / dist) * 220 * dt;
          obj.y -= (dy / dist) * 220 * dt;
        }

        // ホール領域に突入したか
        // オブジェクトのサイズとホールのサイズ比較
        if (dist < hole.radius * 0.88) {
          if (obj.minHoleRadius <= hole.radius) {
            // 吸い込み開始！
            obj.isSwallowed = true;
            obj.swallowingHoleId = hole.id;
            obj.originX = obj.x;
            obj.originY = obj.y;

            // スコア＆経験値加算
            hole.score += obj.scoreValue;
            const growthFactor = (obj.scoreValue * 0.08) / Math.pow(hole.radius / INITIAL_RADIUS, 0.6);
            hole.targetRadius += growthFactor;

            // レベルアップ判定
            const newLevel = Math.floor((hole.radius - INITIAL_RADIUS) / 24) + 1;
            if (newLevel > hole.level) {
              hole.level = newLevel;
              if (hole.isPlayer) {
                sound.playHoleLevelUp();
                // 画面ショックウェーブ＆テキスト
                data.shockwaves.push({
                  id: Date.now() + Math.random(),
                  x: hole.x,
                  y: hole.y,
                  radius: hole.radius,
                  maxRadius: hole.radius * 2.5,
                  color: hole.skin.glowColor,
                  alpha: 1.0,
                });
                data.floatingTexts.push({
                  id: Date.now() + Math.random(),
                  x: hole.x,
                  y: hole.y - hole.radius - 20,
                  text: `LEVEL UP! Lv.${newLevel}`,
                  color: '#fbbf24',
                  alpha: 1.0,
                  scale: 1.6,
                });
              }
            }

            if (hole.isPlayer) {
              sound.playHoleSwallow(obj.tier);
              data.swallowedCounter++;
              // コンボ更新
              data.comboCount++;
              data.comboTimer = 1.8;
              setCombo(data.comboCount);
              if (data.comboCount >= 3) {
                sound.playHoleCombo(data.comboCount);
                const praise =
                  data.comboCount > 15
                    ? 'GODLIKE!!'
                    : data.comboCount > 10
                    ? 'RAMPAGE!!'
                    : data.comboCount > 5
                    ? 'MEGA COMBO!'
                    : 'COMBO!';
                setComboText(`${praise} x${data.comboCount}`);
              }

              // 浮遊スコア
              data.floatingTexts.push({
                id: Date.now() + Math.random(),
                x: obj.x,
                y: obj.y,
                text: `+${obj.scoreValue}`,
                color: obj.tier >= 4 ? '#f59e0b' : '#38bdf8',
                alpha: 1.0,
                scale: 1.0 + obj.tier * 0.15,
              });

              // パーティクル放出
              for (let p = 0; p < 5 + obj.tier * 2; p++) {
                const pAngle = Math.random() * Math.PI * 2;
                const pSpd = 50 + Math.random() * 120;
                data.particles.push({
                  x: obj.x,
                  y: obj.y,
                  vx: Math.cos(pAngle) * pSpd,
                  vy: Math.sin(pAngle) * pSpd,
                  radius: 3 + Math.random() * 4,
                  color: obj.color,
                  alpha: 1.0,
                  maxLife: 0.5,
                  life: 0.5,
                });
              }
            }
          }
        }
      });
    });

    // コンボタイマー減少
    if (data.comboTimer > 0) {
      data.comboTimer -= dt;
      if (data.comboTimer <= 0) {
        data.comboCount = 0;
        setCombo(0);
        setComboText('');
      }
    }

    // 5. ホール同士の捕食バトル判定
    for (let i = 0; i < allHoles.length; i++) {
      for (let j = 0; j < allHoles.length; j++) {
        if (i === j) continue;
        const predator = allHoles[i];
        const prey = allHoles[j];

        if (!predator.isAlive || !prey.isAlive) continue;

        // 捕食条件: 半径が相手の1.25倍以上
        if (predator.radius >= prey.radius * 1.25) {
          const d = Math.hypot(predator.x - prey.x, predator.y - prey.y);
          if (d < predator.radius * 0.75) {
            // 撃破！
            prey.isAlive = false;
            prey.respawnTime = 5.0; // 5秒後にリスポーン
            predator.kills++;
            const killScore = Math.round(prey.score * 0.5) + 500;
            predator.score += killScore;
            predator.targetRadius += 14;

            // キルログ
            const feed: KillFeed = {
              id: Date.now() + Math.random(),
              killer: predator.name,
              victim: prey.name,
              time: 4.0,
            };
            data.killFeedList.unshift(feed);
            if (data.killFeedList.length > 5) data.killFeedList.pop();
            setKillFeeds([...data.killFeedList]);

            // エフェクト
            data.shockwaves.push({
              id: Date.now() + Math.random(),
              x: prey.x,
              y: prey.y,
              radius: prey.radius,
              maxRadius: predator.radius * 2.0,
              color: predator.skin.glowColor,
              alpha: 1.0,
            });

            if (predator.isPlayer) {
              sound.playHoleKill();
              data.floatingTexts.push({
                id: Date.now() + Math.random(),
                x: prey.x,
                y: prey.y - 30,
                text: `KILLED ${prey.name}! +${killScore}`,
                color: '#ef4444',
                alpha: 1.0,
                scale: 1.8,
              });
            } else if (prey.isPlayer) {
              sound.playHoleDeath();
              data.floatingTexts.push({
                id: Date.now() + Math.random(),
                x: prey.x,
                y: prey.y - 30,
                text: `${predator.name} に吸い込まれた!`,
                color: '#f43f5e',
                alpha: 1.0,
                scale: 2.0,
              });

              if (gameMode === 'royale') {
                // バトロワで死んだら即ゲームオーバー
                const rank = allHoles.filter((h) => h.isAlive).length + 1;
                handleGameOver(rank);
              }
            }
          }
        }
      }
    }

    // 6. パワーアップアイテム判定
    for (let pIdx = data.powerUps.length - 1; pIdx >= 0; pIdx--) {
      const item = data.powerUps[pIdx];
      item.angle += dt * 3;

      allHoles.forEach((hole) => {
        if (!hole.isAlive) return;
        const d = Math.hypot(hole.x - item.x, hole.y - item.y);
        if (d < hole.radius + item.radius) {
          // アイテム獲得
          if (item.type === 'magnet') hole.magnetTime = 8.0;
          if (item.type === 'speed') hole.speedTime = 6.0;
          if (item.type === 'freeze') hole.freezeTime = 5.0;
          if (item.type === 'mega') {
            hole.megaTime = 7.0;
            hole.targetRadius *= 1.5;
          }

          if (hole.isPlayer) {
            sound.playHoleItemGet();
            const buffName =
              item.type === 'magnet'
                ? '🧲 メガマグネット吸引！'
                : item.type === 'speed'
                ? '⚡ スーパースピード！'
                : item.type === 'freeze'
                ? '❄️ 敵ホール凍結！'
                : '🍄 メガジャイアントホール！';
            data.floatingTexts.push({
              id: Date.now() + Math.random(),
              x: hole.x,
              y: hole.y - hole.radius - 20,
              text: buffName,
              color: '#a855f7',
              alpha: 1.0,
              scale: 1.5,
            });
          }

          data.powerUps.splice(pIdx, 1);
          // 一定時間後に再スポーン
          setTimeout(() => {
            if (entitiesRef.current) {
              const types: ('magnet' | 'speed' | 'freeze' | 'mega')[] = ['magnet', 'speed', 'freeze', 'mega'];
              entitiesRef.current.powerUps.push({
                id: Date.now() + Math.random(),
                type: types[Math.floor(Math.random() * types.length)],
                x: 300 + Math.random() * (MAP_SIZE - 600),
                y: 300 + Math.random() * (MAP_SIZE - 600),
                radius: 20,
                angle: 0,
              });
            }
          }, 12000);
        }
      });
    }

    // 7. カメラのスムーズ追従＆ズームアウト
    // ホールが大きくなるほどカメラが引く！
    const targetZoom = Math.max(0.32, 1.15 - (player.radius - INITIAL_RADIUS) * 0.0028);
    data.camera.zoom += (targetZoom - data.camera.zoom) * Math.min(dt * 3, 1);
    data.camera.x += (player.x - data.camera.x) * Math.min(dt * 6, 1);
    data.camera.y += (player.y - data.camera.y) * Math.min(dt * 6, 1);

    // 8. パーティクル・浮遊テキスト・ショックウェーブ更新
    for (let i = data.particles.length - 1; i >= 0; i--) {
      const p = data.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      p.alpha = Math.max(0, p.life / p.maxLife);
      if (p.life <= 0) data.particles.splice(i, 1);
    }

    for (let i = data.floatingTexts.length - 1; i >= 0; i--) {
      const ft = data.floatingTexts[i];
      ft.y -= 45 * dt;
      ft.alpha -= dt * 1.2;
      if (ft.alpha <= 0) data.floatingTexts.splice(i, 1);
    }

    for (let i = data.shockwaves.length - 1; i >= 0; i--) {
      const sw = data.shockwaves[i];
      sw.radius += 240 * dt;
      sw.alpha -= dt * 1.8;
      if (sw.alpha <= 0 || sw.radius >= sw.maxRadius) data.shockwaves.splice(i, 1);
    }

    // キルログ時間経過
    for (let i = data.killFeedList.length - 1; i >= 0; i--) {
      data.killFeedList[i].time -= dt;
      if (data.killFeedList[i].time <= 0) data.killFeedList.splice(i, 1);
    }

    // HUD用更新
    setHudScore(player.score);
    setHudLevel(player.level);
    setHudSize(Math.round(player.radius));
    setHudStamina(Math.round(player.stamina));
    setObjectsSwallowedCount(data.swallowedCounter);

    const activeBuff =
      player.megaTime > 0
        ? `🍄 MEGA (${player.megaTime.toFixed(1)}s)`
        : player.freezeTime > 0
        ? `❄️ FREEZE (${player.freezeTime.toFixed(1)}s)`
        : player.speedTime > 0
        ? `⚡ SPEED (${player.speedTime.toFixed(1)}s)`
        : player.magnetTime > 0
        ? `🧲 MAGNET (${player.magnetTime.toFixed(1)}s)`
        : null;
    setHudActiveBuff(activeBuff);

    // リーダーボードソート
    const sorted = [...allHoles].sort((a, b) => b.score - a.score);
    const pRank = sorted.findIndex((h) => h.isPlayer) + 1;
    setPlayerRank(pRank);
    setLeaderboard(
      sorted.slice(0, 6).map((h) => ({
        name: h.name,
        score: h.score,
        isPlayer: h.isPlayer,
      }))
    );

    // バトロワで最後の一人になったか判定
    if (gameMode === 'royale') {
      const aliveList = allHoles.filter((h) => h.isAlive);
      if (aliveList.length === 1 && aliveList[0].isPlayer) {
        handleGameOver(1);
      }
    }
  };

  // --- キャンバス描画 (2.5D都市レンダリング) ---
  const renderGame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // キャンバス解像度とCSSサイズの一致
    if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    }

    const { width, height } = canvas;
    const data = entitiesRef.current;
    const { camera } = data;

    // 画面クリア
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    ctx.save();

    // カメラトランスフォーム（プレイヤー中心＆ズーム）
    ctx.translate(width / 2, height / 2);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    // --- 1. 地面・道路網・ブロックの描画 ---
    // 外枠グラウンド
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, MAP_SIZE, MAP_SIZE);

    const BLOCK_SIZE = 400;
    const ROAD_WIDTH = 120;
    const numBlocks = Math.floor(MAP_SIZE / BLOCK_SIZE);

    // 道路アスファルト
    ctx.fillStyle = '#334155';
    for (let x = 0; x <= numBlocks; x++) {
      ctx.fillRect(x * BLOCK_SIZE - ROAD_WIDTH / 2, 0, ROAD_WIDTH, MAP_SIZE);
    }
    for (let y = 0; y <= numBlocks; y++) {
      ctx.fillRect(0, y * BLOCK_SIZE - ROAD_WIDTH / 2, MAP_SIZE, ROAD_WIDTH);
    }

    // 道路の白線＆センターライン
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 3;
    ctx.setLineDash([20, 20]);
    for (let x = 0; x <= numBlocks; x++) {
      ctx.beginPath();
      ctx.moveTo(x * BLOCK_SIZE, 0);
      ctx.lineTo(x * BLOCK_SIZE, MAP_SIZE);
      ctx.stroke();
    }
    for (let y = 0; y <= numBlocks; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * BLOCK_SIZE);
      ctx.lineTo(MAP_SIZE, y * BLOCK_SIZE);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // 各街区（芝生パーク、商業ブロック、住宅区）の敷地
    for (let bx = 0; bx < numBlocks; bx++) {
      for (let by = 0; by < numBlocks; by++) {
        const left = bx * BLOCK_SIZE + ROAD_WIDTH / 2;
        const top = by * BLOCK_SIZE + ROAD_WIDTH / 2;
        const bw = BLOCK_SIZE - ROAD_WIDTH;
        const bh = BLOCK_SIZE - ROAD_WIDTH;

        const isPark = (bx + by) % 4 === 0;
        const isHighrise = bx >= 3 && bx <= 5 && by >= 3 && by <= 5;

        // 敷地プレート
        if (isPark) {
          ctx.fillStyle = '#166534'; // パーク芝生グリーン
        } else if (isHighrise) {
          ctx.fillStyle = '#1e1b4b'; // プラザ敷石
        } else {
          ctx.fillStyle = '#475569'; // 舗装ブロック
        }
        ctx.fillRect(left, top, bw, bh);

        // 歩道ブロックのフチ取り
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 4;
        ctx.strokeRect(left, top, bw, bh);
      }
    }

    // --- 2. パワーアップアイテム描画 ---
    data.powerUps.forEach((item) => {
      ctx.save();
      ctx.translate(item.x, item.y);
      ctx.rotate(item.angle);

      // オーラグロー
      const grad = ctx.createRadialGradient(0, 0, 5, 0, 0, item.radius * 1.6);
      const color =
        item.type === 'magnet'
          ? '#ec4899'
          : item.type === 'speed'
          ? '#eab308'
          : item.type === 'freeze'
          ? '#38bdf8'
          : '#a855f7';
      grad.addColorStop(0, color);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, item.radius * 1.6, 0, Math.PI * 2);
      ctx.fill();

      // アイテムキューブ
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 15;
      ctx.fillRect(-item.radius * 0.7, -item.radius * 0.7, item.radius * 1.4, item.radius * 1.4);

      // アイコン文字
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const icon = item.type === 'magnet' ? '🧲' : item.type === 'speed' ? '⚡' : item.type === 'freeze' ? '❄️' : '🍄';
      ctx.fillText(icon, 0, 0);

      ctx.restore();
    });

    // --- 3. ブラックホール（穴）の描画 ---
    const allHoles = [data.player, ...data.bots];

    // 吸い込まれていないオブジェクトと吸い込み中のオブジェクトの前後関係を描画するため、
    // ホールを先に地面の穴として描画
    allHoles.forEach((hole) => {
      if (!hole.isAlive) return;

      ctx.save();
      ctx.translate(hole.x, hole.y);

      // ホール外周のグローオーラ
      const auraGrad = ctx.createRadialGradient(0, 0, hole.radius * 0.8, 0, 0, hole.radius * 1.4);
      auraGrad.addColorStop(0, hole.skin.glowColor);
      auraGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = auraGrad;
      ctx.beginPath();
      ctx.arc(0, 0, hole.radius * 1.4, 0, Math.PI * 2);
      ctx.fill();

      // ホール本体（深淵グラデーション）
      const holeGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, hole.radius);
      holeGrad.addColorStop(0, hole.skin.innerColor);
      holeGrad.addColorStop(0.7, hole.skin.color);
      holeGrad.addColorStop(0.95, '#000000');
      holeGrad.addColorStop(1, hole.skin.glowColor);

      ctx.fillStyle = holeGrad;
      ctx.beginPath();
      ctx.arc(0, 0, hole.radius, 0, Math.PI * 2);
      ctx.fill();

      // エッジのネオンリング
      ctx.lineWidth = Math.max(3, hole.radius * 0.08);
      ctx.strokeStyle = hole.skin.glowColor;
      ctx.shadowColor = hole.skin.glowColor;
      ctx.shadowBlur = 12;
      ctx.stroke();

      // 内側の吸い込み渦巻きパーティクル/リング
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, hole.radius * 0.5, 0, Math.PI * 1.2);
      ctx.stroke();

      ctx.restore();
    });

    // --- 4. 街のオブジェクト（2.5D立体構造＆吸い込み演出）描画 ---
    // 描画順: Y座標でソート（2.5Dの遮蔽・重なり感を正確に表現）
    const sortedObjects = [...data.objects].sort((a, b) => {
      // 吸い込み中のものは手前/奥を調整
      if (a.isSwallowed && !b.isSwallowed) return -1;
      if (!a.isSwallowed && b.isSwallowed) return 1;
      return a.y - b.y;
    });

    sortedObjects.forEach((obj) => {
      // 吸い込み完了したものはスキップ
      if (obj.isSwallowed && obj.swallowProgress >= 1.0) return;

      // 画面外カリング（パフォーマンス最適化）
      const screenObjX = (obj.x - camera.x) * camera.zoom + width / 2;
      const screenObjY = (obj.y - camera.y) * camera.zoom + height / 2;
      const margin = 200 * camera.zoom;
      if (
        screenObjX < -margin ||
        screenObjX > width + margin ||
        screenObjY < -margin ||
        screenObjY > height + margin
      ) {
        return;
      }

      ctx.save();

      if (obj.isSwallowed) {
        // 吸い込まれ中のトランスフォーム: ホール中心へ引っ張られながら回転＆縮小＆沈下
        const prog = obj.swallowProgress;
        const targetHole = allHoles.find((h) => h.id === obj.swallowingHoleId);
        const hX = targetHole ? targetHole.x : obj.x;
        const hY = targetHole ? targetHole.y : obj.y;

        const curX = obj.originX + (hX - obj.originX) * prog;
        const curY = obj.originY + (hY - obj.originY) * prog;
        const scale = Math.max(0, 1.0 - prog);
        const rot = obj.angle + prog * Math.PI * 4;

        ctx.translate(curX, curY);
        ctx.rotate(rot);
        ctx.scale(scale, scale);
        ctx.globalAlpha = Math.max(0, 1.0 - prog * 0.8);
      } else {
        ctx.translate(obj.x, obj.y);
        ctx.rotate(obj.angle);
      }

      // オブジェクト種別ごとの立体レンダリング
      renderCityObject(ctx, obj);

      ctx.restore();
    });

    // --- 5. ホールの頭上ネームプレート＆王冠の描画 ---
    allHoles.forEach((hole) => {
      if (!hole.isAlive) return;

      ctx.save();
      ctx.translate(hole.x, hole.y - hole.radius - 16);

      // 王冠（1位の場合）
      if (hole.score > 0 && leaderboard.length > 0 && leaderboard[0].name === hole.name) {
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('👑', 0, -16);
      }

      // ネームタグ背景
      const tagText = `${hole.name} [Lv.${hole.level}]`;
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      const textWidth = ctx.measureText(tagText).width;

      ctx.fillStyle = hole.isPlayer ? 'rgba(30, 41, 59, 0.85)' : 'rgba(15, 23, 42, 0.75)';
      ctx.strokeStyle = hole.skin.glowColor;
      ctx.lineWidth = hole.isPlayer ? 2 : 1;
      ctx.beginPath();
      ctx.roundRect(-textWidth / 2 - 8, -12, textWidth + 16, 20, 10);
      ctx.fill();
      ctx.stroke();

      // テキスト
      ctx.fillStyle = hole.isPlayer ? '#ffffff' : '#cbd5e1';
      ctx.fillText(tagText, 0, 2);

      ctx.restore();
    });

    // --- 6. ショックウェーブ＆パーティクル描画 ---
    data.shockwaves.forEach((sw) => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      ctx.strokeStyle = sw.color;
      ctx.lineWidth = 6 * sw.alpha;
      ctx.globalAlpha = sw.alpha;
      ctx.stroke();
      ctx.restore();
    });

    data.particles.forEach((p) => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.fill();
      ctx.restore();
    });

    // --- 7. 浮遊テキスト描画 ---
    data.floatingTexts.forEach((ft) => {
      ctx.save();
      ctx.font = `bold ${Math.round(18 * ft.scale)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = ft.color;
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 6;
      ctx.globalAlpha = ft.alpha;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    });

    ctx.restore(); // カメラ復帰

    // --- 8. タッチ用仮想ジョイスティックの描画 (スマホ操作時) ---
    const input = inputRef.current;
    if (input.touchOrigin && input.touchCurrent) {
      ctx.save();
      // ベース円
      ctx.beginPath();
      ctx.arc(input.touchOrigin.x, input.touchOrigin.y, 50, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();

      // スティックノブ
      const dx = input.touchCurrent.x - input.touchOrigin.x;
      const dy = input.touchCurrent.y - input.touchOrigin.y;
      const dist = Math.min(50, Math.hypot(dx, dy));
      const angle = Math.atan2(dy, dx);
      const knobX = input.touchOrigin.x + Math.cos(angle) * dist;
      const knobY = input.touchOrigin.y + Math.sin(angle) * dist;

      ctx.beginPath();
      ctx.arc(knobX, knobY, 22, 0, Math.PI * 2);
      ctx.fillStyle = selectedSkin.glowColor;
      ctx.fill();
      ctx.restore();
    }
  };

  // --- 都市オブジェクトの立体外観描画 ---
  const renderCityObject = (ctx: CanvasRenderingContext2D, obj: CityObject) => {
    const hw = obj.width / 2;
    const hh = obj.height / 2;

    switch (obj.type) {
      case 'person':
        // 歩行者（頭＋カラフルな体）
        ctx.fillStyle = obj.color;
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fed7aa'; // 肌色
        ctx.beginPath();
        ctx.arc(0, -3, 3, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'cone':
        // コーン
        ctx.fillStyle = '#ea580c';
        ctx.beginPath();
        ctx.moveTo(-6, 6);
        ctx.lineTo(6, 6);
        ctx.lineTo(0, -8);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-3, -2, 6, 2);
        break;

      case 'trashcan':
      case 'hydrant':
      case 'mailbox':
        // 小型シリンダー/ボックス
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.ellipse(0, hh * 0.7, hw, hh * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = obj.color;
        ctx.fillRect(-hw, -hh, obj.width, obj.height);
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(-hw + 2, -hh - 3, obj.width - 4, 4);
        break;

      case 'bench':
        // 公園ベンチ
        ctx.fillStyle = '#78350f';
        ctx.fillRect(-hw, -hh, obj.width, 5);
        ctx.fillRect(-hw, -hh + 8, obj.width, 5);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-hw + 2, -hh, 2, obj.height);
        ctx.fillRect(hw - 4, -hh, 2, obj.height);
        break;

      case 'tree_small':
      case 'tree_big':
        // 立体木（影＋幹＋丸い葉）
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.ellipse(3, hh * 0.6, hw * 0.9, hh * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#78350f'; // 幹
        ctx.fillRect(-hw * 0.2, -hh * 0.4, hw * 0.4, hh * 0.8);

        ctx.fillStyle = obj.color; // 葉
        ctx.beginPath();
        ctx.arc(0, -hh * 0.3, hw, 0, Math.PI * 2);
        ctx.fill();

        // 葉のハイライト
        ctx.fillStyle = '#4ade80';
        ctx.beginPath();
        ctx.arc(-hw * 0.25, -hh * 0.5, hw * 0.45, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'car_sedan':
      case 'car_police':
      case 'car_taxi':
      case 'car_suv':
        // 車両（影＋ボディ＋ルーフ＋窓＋ライト）
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(-hw + 2, -hh + 3, obj.width, obj.height);

        // ボディ
        ctx.fillStyle = obj.color;
        ctx.beginPath();
        ctx.roundRect(-hw, -hh, obj.width, obj.height, 6);
        ctx.fill();

        // フロント/リアウィンドウ
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(-hw + 8, -hh + 3, obj.width - 16, obj.height - 6);

        // ルーフ
        ctx.fillStyle = obj.color;
        ctx.fillRect(-hw + 14, -hh + 4, obj.width - 28, obj.height - 8);

        // パトランプ / タクシーランプ
        if (obj.type === 'car_police') {
          ctx.fillStyle = Math.sin(Date.now() * 0.02) > 0 ? '#ef4444' : '#3b82f6';
          ctx.fillRect(-3, -2, 6, 4);
        } else if (obj.type === 'car_taxi') {
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(-4, -2, 8, 4);
        }
        break;

      case 'bus':
      case 'truck':
        // 大型車
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.fillRect(-hw + 4, -hh + 4, obj.width, obj.height);

        ctx.fillStyle = obj.color;
        ctx.beginPath();
        ctx.roundRect(-hw, -hh, obj.width, obj.height, 5);
        ctx.fill();

        // 窓のライン
        ctx.fillStyle = '#38bdf8';
        for (let w = -hw + 8; w < hw - 8; w += 14) {
          ctx.fillRect(w, -hh + 4, 10, obj.height - 8);
        }
        break;

      case 'house_small':
      case 'gas_station':
      case 'mansion':
      case 'office_mid':
        // 建造物（影＋外壁＋屋根＋窓）
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(-hw + 8, -hh + 8, obj.width, obj.height);

        // 壁体
        ctx.fillStyle = obj.color;
        ctx.fillRect(-hw, -hh, obj.width, obj.height);

        // 屋上・屋根
        ctx.fillStyle = obj.colorSecondary || '#475569';
        ctx.fillRect(-hw + 6, -hh + 6, obj.width - 12, obj.height - 12);

        // 屋上設備
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(-hw + 12, -hh + 12, 16, 16);
        break;

      case 'skyscraper':
      case 'tower':
        // 高層タワー・摩天楼（ガラス光沢＋アンテナ）
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(-hw + 15, -hh + 15, obj.width, obj.height);

        // タワーベース
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-hw, -hh, obj.width, obj.height);

        // ガラス張りの反射グラデーション
        const glassGrad = ctx.createLinearGradient(-hw, -hh, hw, hh);
        glassGrad.addColorStop(0, '#0284c7');
        glassGrad.addColorStop(0.5, '#38bdf8');
        glassGrad.addColorStop(1, '#0369a1');
        ctx.fillStyle = glassGrad;
        ctx.fillRect(-hw + 8, -hh + 8, obj.width - 16, obj.height - 16);

        // 格子窓フレーム
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1.5;
        for (let gx = -hw + 16; gx < hw - 8; gx += 20) {
          ctx.beginPath();
          ctx.moveTo(gx, -hh + 8);
          ctx.lineTo(gx, hh - 8);
          ctx.stroke();
        }

        // 電波塔アンテナ
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -hh - 18);
        ctx.stroke();

        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(0, -hh - 18, 4, 0, Math.PI * 2);
        ctx.fill();
        break;

      default:
        ctx.fillStyle = obj.color;
        ctx.fillRect(-hw, -hh, obj.width, obj.height);
        break;
    }
  };

  // --- ミニマップ（レーダー）の描画 ---
  const renderMinimap = () => {
    const data = entitiesRef.current;
    const player = data.player;
    const size = 120;
    const scale = size / MAP_SIZE;

    return (
      <div className="relative w-[120px] h-[120px] bg-slate-900/85 backdrop-blur-md rounded-2xl border border-slate-700/80 p-1 shadow-lg overflow-hidden pointer-events-none">
        {/* レーダー枠 */}
        <div className="absolute inset-0 bg-radial from-transparent to-slate-950/60" />

        {/* 敵ホールの位置 */}
        {data.bots.map((bot) => {
          if (!bot.isAlive) return null;
          const isBigger = bot.radius > player.radius * 1.15;
          return (
            <div
              key={bot.id}
              className={`absolute rounded-full -translate-x-1/2 -translate-y-1/2 ${
                isBigger ? 'bg-red-500 shadow-red-500/80' : 'bg-emerald-400 shadow-emerald-400/80'
              } shadow-sm animate-pulse`}
              style={{
                left: `${bot.x * scale}px`,
                top: `${bot.y * scale}px`,
                width: `${Math.max(4, Math.min(10, bot.radius * scale * 2))}px`,
                height: `${Math.max(4, Math.min(10, bot.radius * scale * 2))}px`,
              }}
            />
          );
        })}

        {/* プレイヤーの位置 */}
        <div
          className="absolute rounded-full -translate-x-1/2 -translate-y-1/2 bg-sky-400 border border-white shadow-md shadow-sky-400/90 z-10"
          style={{
            left: `${player.x * scale}px`,
            top: `${player.y * scale}px`,
            width: `${Math.max(6, Math.min(14, player.radius * scale * 2))}px`,
            height: `${Math.max(6, Math.min(14, player.radius * scale * 2))}px`,
          }}
        />

        <span className="absolute bottom-1 right-1.5 text-[9px] font-bold text-slate-400">
          RADAR
        </span>
      </div>
    );
  };

  return (
    <div
      className={`relative select-none overflow-hidden transition-all duration-300 ${
        isFullscreen
          ? 'fixed inset-0 w-screen h-screen z-50 bg-slate-950'
          : `w-full max-w-6xl mx-auto my-2 rounded-3xl border shadow-2xl ${
              isDark
                ? 'border-slate-800/80 bg-slate-950 text-slate-100'
                : 'border-slate-300 bg-slate-900 text-slate-100'
            }`
      }`}
    >
      {/* メインCanvas */}
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onContextMenu={(e) => e.preventDefault()}
        className={`w-full block cursor-crosshair ${
          isFullscreen ? 'h-screen w-screen rounded-none' : 'h-[640px] rounded-3xl'
        }`}
      />

      {/* --- HUD: ゲームプレイ中のUIオーバーレイ --- */}
      {gameState === 'playing' && (
        <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between">
          {/* 上部ヘッダーHUD */}
          <div className="flex items-start justify-between">
            {/* 左上: スコア・レベル・サイズ・スタミナ */}
            <div className="flex flex-col gap-2 pointer-events-auto">
              <div className="flex items-center gap-3 bg-slate-900/85 backdrop-blur-md border border-slate-700/70 px-4 py-2 rounded-2xl shadow-xl">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Score
                  </span>
                  <span className="text-2xl font-black text-amber-400 tracking-tight">
                    {hudScore.toLocaleString()}
                  </span>
                </div>

                <div className="h-8 w-px bg-slate-700/60" />

                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Level
                  </span>
                  <span className="text-xl font-bold text-sky-400">Lv.{hudLevel}</span>
                </div>

                <div className="h-8 w-px bg-slate-700/60" />

                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Radius
                  </span>
                  <span className="text-xl font-bold text-emerald-400">{hudSize}m</span>
                </div>
              </div>

              {/* ブーストスタミナバー */}
              <div className="w-48 bg-slate-900/80 backdrop-blur-md border border-slate-700/60 p-1.5 rounded-xl shadow-lg">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-300 px-1 mb-1">
                  <span className="flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-400 fill-amber-400" /> BOOST
                  </span>
                  <span>{hudStamina}%</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-rose-500 transition-all duration-100 rounded-full"
                    style={{ width: `${hudStamina}%` }}
                  />
                </div>
              </div>

              {/* アクティブバフインジケーター */}
              {hudActiveBuff && (
                <div className="bg-indigo-600/90 text-white font-bold text-xs px-3 py-1.5 rounded-full backdrop-blur-md shadow-lg border border-indigo-400/50 animate-bounce">
                  {hudActiveBuff}
                </div>
              )}
            </div>

            {/* 中央上: タイマー / コンボ演出 */}
            <div className="flex flex-col items-center">
              {gameMode !== 'endless' && (
                <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 px-5 py-2 rounded-2xl shadow-xl flex items-center gap-2">
                  <Timer className="w-5 h-5 text-rose-400 animate-pulse" />
                  <span
                    className={`text-2xl font-mono font-black ${
                      timeLeft <= 30 ? 'text-rose-500 animate-ping' : 'text-white'
                    }`}
                  >
                    {Math.floor(timeLeft / 60)}:
                    {(timeLeft % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              )}

              {/* コンボポップアップ */}
              {combo >= 2 && comboText && (
                <div className="mt-2 bg-gradient-to-r from-amber-500 to-rose-500 text-white text-base font-black px-4 py-1.5 rounded-full shadow-2xl border border-amber-300/60 tracking-wider animate-bounce">
                  {comboText}
                </div>
              )}
            </div>

            {/* 右上: リアルタイムリーダーボード ＆ コントロール */}
            <div className="flex flex-col items-end gap-2 pointer-events-auto">
              {/* コントロールボタン群 */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsMuted(sound.toggleMute())}
                  className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/70 text-slate-300 transition-all shadow-md"
                  title="ミュート切り替え"
                >
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
                <button
                  onClick={() => setGameState('paused')}
                  className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/70 text-slate-300 transition-all shadow-md"
                  title="一時停止"
                >
                  <Pause className="w-5 h-5" />
                </button>
              </div>

              {/* リーダーボード */}
              <div className="w-48 bg-slate-900/85 backdrop-blur-md border border-slate-700/70 rounded-2xl p-2.5 shadow-xl">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 border-b border-slate-800 pb-1 mb-1.5">
                  <span className="flex items-center gap-1">
                    <Trophy className="w-3.5 h-3.5 text-amber-400" /> RANKING
                  </span>
                  <span className="text-sky-400 font-extrabold">#{playerRank}</span>
                </div>
                <div className="flex flex-col gap-1">
                  {leaderboard.map((item, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center justify-between text-xs px-2 py-0.5 rounded-lg font-medium transition-colors ${
                        item.isPlayer
                          ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold'
                          : 'text-slate-300'
                      }`}
                    >
                      <span className="truncate max-w-[90px]">
                        {idx + 1}. {item.name}
                      </span>
                      <span className="font-mono text-[11px] text-slate-400">{item.score}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 下部HUD: キルフィード ＆ ミニマップ ＆ ブーストボタン */}
          <div className="flex items-end justify-between">
            {/* 左下: キルログフィード */}
            <div className="flex flex-col gap-1.5 max-w-xs">
              {killFeeds.map((kf) => (
                <div
                  key={kf.id}
                  className="bg-slate-900/90 backdrop-blur-md border border-slate-700/70 text-slate-200 text-xs px-3 py-1 rounded-xl shadow-lg flex items-center gap-1.5 animate-fadeIn"
                >
                  <span className="font-bold text-amber-400">{kf.killer}</span>
                  <span className="text-slate-400 text-[10px]">が</span>
                  <span className="font-bold text-rose-400">{kf.victim}</span>
                  <span className="text-slate-400 text-[10px]">を吸い込み！</span>
                </div>
              ))}
            </div>

            {/* 右下: レーダーミニマップ ＆ スマホ用ブーストボタン */}
            <div className="flex items-end gap-3 pointer-events-auto">
              {/* スマホ用ブーストボタン */}
              <button
                onTouchStart={() => {
                  inputRef.current.boostActive = true;
                }}
                onTouchEnd={() => {
                  inputRef.current.boostActive = false;
                }}
                onMouseDown={() => {
                  inputRef.current.boostActive = true;
                }}
                onMouseUp={() => {
                  inputRef.current.boostActive = false;
                }}
                className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-bold text-[10px] shadow-xl border transition-all active:scale-95 ${
                  hudStamina > 10
                    ? 'bg-gradient-to-tr from-amber-500 to-rose-600 border-amber-300 text-white shadow-amber-500/30'
                    : 'bg-slate-800 border-slate-700 text-slate-500 opacity-60'
                }`}
              >
                <Zap className="w-5 h-5 fill-current" />
                BOOST
              </button>

              {/* レーダー */}
              {renderMinimap()}
            </div>
          </div>
        </div>
      )}

      {/* --- スタートメニュー / タイトル画面 --- */}
      {gameState === 'menu' && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 z-20 text-slate-100">
          <div className="w-full max-w-lg flex flex-col items-center">
            {/* タイトルロゴ */}
            <div className="relative mb-6 text-center">
              <div className="w-24 h-24 mx-auto mb-3 rounded-full bg-gradient-to-tr from-sky-500 via-indigo-600 to-rose-500 p-1 shadow-2xl shadow-sky-500/30 flex items-center justify-center animate-spin-slow">
                <div className="w-full h-full bg-slate-950 rounded-full flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-black border-2 border-sky-400 shadow-inner shadow-sky-500" />
                </div>
              </div>
              <h1 className="text-4xl sm:text-5xl font-black tracking-tight bg-gradient-to-r from-sky-400 via-indigo-300 to-rose-400 bg-clip-text text-transparent">
                ブラックホール.io
              </h1>
              <p className="text-sm font-bold text-slate-400 mt-1">
                Hole.io - 街のすべてを飲み込み巨大化せよ！
              </p>
            </div>

            {/* モード選択 */}
            <div className="w-full grid grid-cols-3 gap-2 mb-5">
              <button
                onClick={() => setGameMode('classic')}
                className={`py-3 px-2 rounded-2xl border text-center transition-all flex flex-col items-center gap-1 ${
                  gameMode === 'classic'
                    ? 'bg-sky-600/30 border-sky-400 text-sky-200 shadow-lg shadow-sky-500/20'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <Timer className="w-5 h-5 text-sky-400" />
                <span className="font-bold text-xs">クラシック</span>
                <span className="text-[10px] text-slate-400">2分ハイスコア</span>
              </button>

              <button
                onClick={() => setGameMode('royale')}
                className={`py-3 px-2 rounded-2xl border text-center transition-all flex flex-col items-center gap-1 ${
                  gameMode === 'royale'
                    ? 'bg-rose-600/30 border-rose-400 text-rose-200 shadow-lg shadow-rose-500/20'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <Swords className="w-5 h-5 text-rose-400" />
                <span className="font-bold text-xs">バトロワ</span>
                <span className="text-[10px] text-slate-400">生き残り戦</span>
              </button>

              <button
                onClick={() => setGameMode('endless')}
                className={`py-3 px-2 rounded-2xl border text-center transition-all flex flex-col items-center gap-1 ${
                  gameMode === 'endless'
                    ? 'bg-emerald-600/30 border-emerald-400 text-emerald-200 shadow-lg shadow-emerald-500/20'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <Layers className="w-5 h-5 text-emerald-400" />
                <span className="font-bold text-xs">エンドレス</span>
                <span className="text-[10px] text-slate-400">街壊滅サンドボックス</span>
              </button>
            </div>

            {/* スキン選択 */}
            <div className="w-full bg-slate-900/70 border border-slate-800 rounded-2xl p-3 mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-amber-400" /> ホールスキン
                </span>
                <span className="text-xs font-bold text-sky-400">{selectedSkin.name}</span>
              </div>
              <div className="grid grid-cols-6 gap-2">
                {SKINS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSkin(s)}
                    className={`aspect-square rounded-xl border-2 flex items-center justify-center p-1 transition-all ${
                      selectedSkin.id === s.id
                        ? 'border-white scale-110 shadow-lg shadow-sky-500/30'
                        : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: s.color }}
                  >
                    <div
                      className="w-full h-full rounded-full border border-white/40 shadow-inner"
                      style={{ backgroundColor: s.glowColor }}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* ベストレコード表示 */}
            <div className="w-full flex items-center justify-around py-3 px-4 bg-slate-900/50 border border-slate-800/80 rounded-2xl text-center mb-6">
              <div>
                <span className="text-[10px] font-bold text-slate-400 block">BEST SCORE</span>
                <span className="text-lg font-black text-amber-400">
                  {highScore.toLocaleString()}
                </span>
              </div>
              <div className="w-px h-7 bg-slate-800" />
              <div>
                <span className="text-[10px] font-bold text-slate-400 block">BEST KILLS</span>
                <span className="text-lg font-black text-rose-400">{bestKills}</span>
              </div>
              <div className="w-px h-7 bg-slate-800" />
              <div>
                <span className="text-[10px] font-bold text-slate-400 block">MAX RADIUS</span>
                <span className="text-lg font-black text-sky-400">{maxSizeRecord}m</span>
              </div>
            </div>

            {/* スタートボタン */}
            <div className="w-full">
              <button
                onClick={() => startGame(gameMode)}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-sky-500 via-indigo-600 to-rose-600 hover:from-sky-400 hover:to-rose-500 text-white font-black text-lg tracking-wide shadow-xl shadow-indigo-600/30 transition-all active:scale-98 flex items-center justify-center gap-2"
              >
                <Play className="w-6 h-6 fill-current" /> ゲームスタート
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- ポーズ画面 --- */}
      {gameState === 'paused' && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 z-20 text-slate-100">
          <div className="w-full max-w-sm bg-slate-900/90 border border-slate-800 p-6 rounded-3xl text-center shadow-2xl">
            <h2 className="text-2xl font-black mb-4">ポーズ (PAUSED)</h2>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setGameState('playing')}
                className="w-full py-3.5 rounded-xl bg-sky-600 hover:bg-sky-500 font-bold text-white shadow-lg transition-all"
              >
                再開する (Resume)
              </button>
              <button
                onClick={() => startGame(gameMode)}
                className="w-full py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold text-slate-200 transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" /> 最初からやり直す
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- ゲームオーバー / リザルト画面 --- */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 z-20 text-slate-100">
          <div className="w-full max-w-md bg-slate-900/95 border border-slate-800 p-6 rounded-3xl text-center shadow-2xl">
            {/* 順位バッジ */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-800 border border-slate-700 mb-3">
              <Trophy
                className={`w-5 h-5 ${
                  finalRank === 1
                    ? 'text-amber-400'
                    : finalRank <= 3
                    ? 'text-slate-300'
                    : 'text-amber-700'
                }`}
              />
              <span className="font-black text-base">
                {finalRank === 1 ? '🥇 優勝 (1st Place)！' : `第 ${finalRank} 位`}
              </span>
            </div>

            <h2 className="text-3xl font-black mb-1">
              {finalRank === 1 ? 'VICTORY!' : 'GAME OVER'}
            </h2>
            <p className="text-xs text-slate-400 mb-5">
              街を飲み込み、巨大な深淵を作り出しました！
            </p>

            {isNewRecord && (
              <div className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold py-1.5 px-3 rounded-full mb-4 animate-bounce">
                🎉 NEW RECORD 達成！
              </div>
            )}

            {/* 成績グリッド */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-2xl text-left">
                <span className="text-[10px] font-bold text-slate-400 block">FINAL SCORE</span>
                <span className="text-2xl font-black text-amber-400">
                  {finalScore.toLocaleString()}
                </span>
              </div>
              <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-2xl text-left">
                <span className="text-[10px] font-bold text-slate-400 block">KILLS (撃破数)</span>
                <span className="text-2xl font-black text-rose-400">{finalKills} 体</span>
              </div>
              <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-2xl text-left">
                <span className="text-[10px] font-bold text-slate-400 block">MAX RADIUS</span>
                <span className="text-xl font-black text-sky-400">{finalSize} m</span>
              </div>
              <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-2xl text-left">
                <span className="text-[10px] font-bold text-slate-400 block">SWALLOWED OBJS</span>
                <span className="text-xl font-black text-emerald-400">
                  {objectsSwallowedCount} 個
                </span>
              </div>
            </div>

            {/* アクションボタン */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => startGame(gameMode)}
                className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 font-bold text-white shadow-xl shadow-sky-500/20 flex items-center justify-center gap-2 transition-all active:scale-98"
              >
                <RotateCcw className="w-5 h-5" /> もう一度プレイ
              </button>
              <button
                onClick={() => setGameState('menu')}
                className="py-3.5 px-5 rounded-2xl bg-slate-800 hover:bg-slate-700 font-bold text-slate-300 transition-all"
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
