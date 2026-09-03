import React, { useState, useEffect, useRef, useCallback } from 'react';
import Matter from 'matter-js';
import { sound } from '../utils/audio';
import {
  ArrowLeft,
  RotateCcw,
  Volume2,
  VolumeX,
  Play,
  Star,
  Sparkles,
  Trophy,
  List,
} from 'lucide-react';

const HIGH_SCORE_KEY = 'angrybirds_high_score';
const LEVEL_STARS_KEY = 'angrybirds_level_stars';

export interface AngryBirdsGameProps {
  onBackToHub: () => void;
  isDark: boolean;
  isFullscreen?: boolean;
}

// バードの種類
export type BirdType = 'red' | 'chuck' | 'blues' | 'bomb' | 'terence';

// ブロックのマテリアル
export type MaterialType = 'wood' | 'ice' | 'stone' | 'tnt';

// 敵の種類
export type PigType = 'small' | 'medium' | 'helmet' | 'king';

// 破片パーティクル
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
  rotation: number;
  vRot: number;
  shape?: 'circle' | 'rect' | 'feather';
}

// 浮遊スコア
interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  life: number;
}

// 煙・爆発エフェクト
interface ExplosionRing {
  x: number;
  y: number;
  currentRadius: number;
  maxRadius: number;
  alpha: number;
  color: string;
}

// ステージ定義
interface LevelDef {
  id: number;
  name: string;
  nameEn: string;
  birds: BirdType[];
  starScores: [number, number, number]; // 星1, 星2, 星3の閾値
  setup: (world: Matter.World) => {
    pigs: Matter.Body[];
    blocks: Matter.Body[];
  };
}

// キャンバス論理サイズ
const V_WIDTH = 1280;
const V_HEIGHT = 720;
const SLING_X = 200;
const SLING_Y = 510;
const SLING_MAX_PULL = 90;

export const AngryBirdsGame: React.FC<AngryBirdsGameProps> = ({
  onBackToHub,
  isDark,
  isFullscreen = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // ゲーム状態
  const [currentLevel, setCurrentLevel] = useState<number>(1);
  const [gameState, setGameState] = useState<'playing' | 'cleared' | 'failed' | 'paused' | 'levelselect'>('playing');
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  const [levelStars, setLevelStars] = useState<Record<number, number>>({});
  const [isMuted, setIsMuted] = useState<boolean>(() => sound.getMuted());
  const [earnedStars, setEarnedStars] = useState<number>(0);

  // 物理エンジン & 内部参照
  const stateRef = useRef<{
    engine: Matter.Engine | null;
    birdsQueue: BirdType[];
    activeBird: Matter.Body | null;
    activeBirdType: BirdType | null;
    isBirdLaunched: boolean;
    hasUsedSkill: boolean;
    shotTimer: number;
    subBirds: Matter.Body[]; // ブルー用分裂体
    slingshotAnchor: { x: number; y: number };
    dragPos: { x: number; y: number } | null;
    isDragging: boolean;
    pigs: Matter.Body[];
    blocks: Matter.Body[];
    particles: Particle[];
    floatingTexts: FloatingText[];
    explosions: ExplosionRing[];
    currentTrajectory: { x: number; y: number }[];
    prevTrajectory: { x: number; y: number }[];
    score: number;
    cameraX: number;
    targetCameraX: number;
    animFrameId: number | null;
    blinkTimer: number;
    settleTimer: number; // 発射後、全オブジェクトが停止したかを監視するタイマー
    screenShake: number;
  }>({
    engine: null,
    birdsQueue: ['red', 'chuck', 'blues'],
    activeBird: null,
    activeBirdType: null,
    isBirdLaunched: false,
    hasUsedSkill: false,
    shotTimer: 0,
    subBirds: [],
    slingshotAnchor: { x: SLING_X, y: SLING_Y },
    dragPos: null,
    isDragging: false,
    pigs: [],
    blocks: [],
    particles: [],
    floatingTexts: [],
    explosions: [],
    currentTrajectory: [],
    prevTrajectory: [],
    score: 0,
    cameraX: 0,
    targetCameraX: 0,
    animFrameId: null,
    blinkTimer: 0,
    settleTimer: 0,
    screenShake: 0,
  });

  // レコード読み込み
  useEffect(() => {
    const savedScore = localStorage.getItem(HIGH_SCORE_KEY);
    if (savedScore) {
      setHighScore(parseInt(savedScore, 10) || 0);
    }
    const savedStars = localStorage.getItem(LEVEL_STARS_KEY);
    if (savedStars) {
      try {
        setLevelStars(JSON.parse(savedStars));
      } catch {}
    }
  }, []);

  const toggleMute = () => {
    const next = sound.toggleMute();
    setIsMuted(next);
  };

  // --- パーティクル & 演出生成 ---
  const addParticles = (x: number, y: number, color: string, count = 12, shape: 'circle' | 'rect' | 'feather' = 'circle') => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 7 + 2;
      stateRef.current.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        radius: Math.random() * 5 + 3,
        color,
        alpha: 1,
        life: 0,
        maxLife: Math.random() * 25 + 20,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.2,
        shape,
      });
    }
  };

  const addFloatingScore = (x: number, y: number, text: string, color = '#facc15') => {
    stateRef.current.floatingTexts.push({
      id: Math.random(),
      x,
      y,
      text,
      color,
      alpha: 1,
      life: 0,
    });
  };

  const addExplosion = (x: number, y: number, radius = 90) => {
    stateRef.current.explosions.push({
      x,
      y,
      currentRadius: 10,
      maxRadius: radius,
      alpha: 1,
      color: '#f97316',
    });
  };

  // --- ヘルパー: ブロック作成 ---
  const createBlock = (
    x: number,
    y: number,
    w: number,
    h: number,
    material: MaterialType
  ): Matter.Body => {
    let density = 0.002;
    let friction = 0.5;
    let restitution = 0.2;
    let hp = 80;

    if (material === 'ice') {
      density = 0.0012;
      friction = 0.08;
      restitution = 0.3;
      hp = 45;
    } else if (material === 'stone') {
      density = 0.0055;
      friction = 0.8;
      restitution = 0.1;
      hp = 180;
    } else if (material === 'tnt') {
      density = 0.0025;
      friction = 0.6;
      restitution = 0.15;
      hp = 30;
    }

    const block = Matter.Bodies.rectangle(x, y, w, h, {
      density,
      friction,
      restitution,
      chamfer: { radius: 2 },
    });

    (block as any).gameData = {
      isBlock: true,
      material,
      width: w,
      height: h,
      hp,
      maxHp: hp,
      alive: true,
    };

    return block;
  };

  // --- ヘルパー: ピッグ作成 ---
  const createPig = (x: number, y: number, type: PigType): Matter.Body => {
    let radius = 20;
    let hp = 50;
    let density = 0.002;

    if (type === 'small') {
      radius = 16;
      hp = 40;
    } else if (type === 'medium') {
      radius = 22;
      hp = 70;
    } else if (type === 'helmet') {
      radius = 22;
      hp = 130;
      density = 0.003;
    } else if (type === 'king') {
      radius = 32;
      hp = 220;
      density = 0.004;
    }

    const pig = Matter.Bodies.circle(x, y, radius, {
      density,
      friction: 0.6,
      restitution: 0.35,
    });

    (pig as any).gameData = {
      isPig: true,
      type,
      radius,
      hp,
      maxHp: hp,
      alive: true,
    };

    return pig;
  };

  // --- ステージリスト (全8ステージ) ---
  const LEVELS: LevelDef[] = [
    {
      id: 1,
      name: 'はじまりの平原',
      nameEn: 'Green Plains',
      birds: ['red', 'red', 'chuck'],
      starScores: [10000, 18000, 26000],
      setup: (world) => {
        const blocks: Matter.Body[] = [];
        const pigs: Matter.Body[] = [];
        const bx = 850;
        const groundY = 580;

        // シンプルな木製タワー
        blocks.push(createBlock(bx - 40, groundY - 50, 18, 100, 'wood'));
        blocks.push(createBlock(bx + 40, groundY - 50, 18, 100, 'wood'));
        blocks.push(createBlock(bx, groundY - 105, 110, 16, 'wood'));

        pigs.push(createPig(bx, groundY - 20, 'small'));
        pigs.push(createPig(bx, groundY - 125, 'medium'));

        Matter.World.add(world, [...blocks, ...pigs]);
        return { blocks, pigs };
      },
    },
    {
      id: 2,
      name: '氷のパビリオン',
      nameEn: 'Glass Castle',
      birds: ['blues', 'blues', 'red'],
      starScores: [14000, 24000, 32000],
      setup: (world) => {
        const blocks: Matter.Body[] = [];
        const pigs: Matter.Body[] = [];
        const bx = 860;
        const groundY = 580;

        // 氷の3層ピラミッド
        blocks.push(createBlock(bx - 60, groundY - 45, 16, 90, 'ice'));
        blocks.push(createBlock(bx, groundY - 45, 16, 90, 'ice'));
        blocks.push(createBlock(bx + 60, groundY - 45, 16, 90, 'ice'));
        blocks.push(createBlock(bx, groundY - 95, 150, 14, 'ice'));

        blocks.push(createBlock(bx - 35, groundY - 145, 16, 80, 'ice'));
        blocks.push(createBlock(bx + 35, groundY - 145, 16, 80, 'ice'));
        blocks.push(createBlock(bx, groundY - 190, 100, 14, 'ice'));

        pigs.push(createPig(bx - 30, groundY - 20, 'small'));
        pigs.push(createPig(bx + 30, groundY - 20, 'small'));
        pigs.push(createPig(bx, groundY - 215, 'medium'));

        Matter.World.add(world, [...blocks, ...pigs]);
        return { blocks, pigs };
      },
    },
    {
      id: 3,
      name: '木工ツインタワー',
      nameEn: 'Wood Fortress',
      birds: ['chuck', 'chuck', 'red'],
      starScores: [16000, 28000, 38000],
      setup: (world) => {
        const blocks: Matter.Body[] = [];
        const pigs: Matter.Body[] = [];
        const groundY = 580;

        // 左タワー
        const t1 = 780;
        blocks.push(createBlock(t1 - 30, groundY - 60, 18, 120, 'wood'));
        blocks.push(createBlock(t1 + 30, groundY - 60, 18, 120, 'wood'));
        blocks.push(createBlock(t1, groundY - 128, 90, 16, 'wood'));
        pigs.push(createPig(t1, groundY - 20, 'small'));
        pigs.push(createPig(t1, groundY - 150, 'medium'));

        // 右タワー
        const t2 = 940;
        blocks.push(createBlock(t2 - 30, groundY - 60, 18, 120, 'wood'));
        blocks.push(createBlock(t2 + 30, groundY - 60, 18, 120, 'wood'));
        blocks.push(createBlock(t2, groundY - 128, 90, 16, 'wood'));
        pigs.push(createPig(t2, groundY - 20, 'helmet'));

        // 連絡橋
        blocks.push(createBlock((t1 + t2) / 2, groundY - 180, 140, 16, 'wood'));
        pigs.push(createPig((t1 + t2) / 2, groundY - 205, 'small'));

        Matter.World.add(world, [...blocks, ...pigs]);
        return { blocks, pigs };
      },
    },
    {
      id: 4,
      name: 'TNT大連鎖',
      nameEn: 'TNT Reaction',
      birds: ['red', 'chuck', 'bomb'],
      starScores: [20000, 35000, 48000],
      setup: (world) => {
        const blocks: Matter.Body[] = [];
        const pigs: Matter.Body[] = [];
        const bx = 880;
        const groundY = 580;

        // 下層にTNT
        blocks.push(createBlock(bx - 50, groundY - 25, 40, 40, 'tnt'));
        blocks.push(createBlock(bx + 50, groundY - 25, 40, 40, 'tnt'));
        blocks.push(createBlock(bx, groundY - 50, 160, 16, 'stone'));

        // 中層
        blocks.push(createBlock(bx - 40, groundY - 100, 18, 90, 'wood'));
        blocks.push(createBlock(bx + 40, groundY - 100, 18, 90, 'wood'));
        blocks.push(createBlock(bx, groundY - 95, 36, 36, 'tnt'));
        blocks.push(createBlock(bx, groundY - 150, 120, 16, 'wood'));

        pigs.push(createPig(bx, groundY - 20, 'helmet'));
        pigs.push(createPig(bx - 60, groundY - 75, 'small'));
        pigs.push(createPig(bx + 60, groundY - 75, 'small'));
        pigs.push(createPig(bx, groundY - 175, 'medium'));

        Matter.World.add(world, [...blocks, ...pigs]);
        return { blocks, pigs };
      },
    },
    {
      id: 5,
      name: '堅牢なる石城',
      nameEn: 'Stone Stronghold',
      birds: ['bomb', 'bomb', 'chuck'],
      starScores: [18000, 30000, 42000],
      setup: (world) => {
        const blocks: Matter.Body[] = [];
        const pigs: Matter.Body[] = [];
        const bx = 870;
        const groundY = 580;

        // 石ブロックの厚い壁
        blocks.push(createBlock(bx - 60, groundY - 45, 30, 90, 'stone'));
        blocks.push(createBlock(bx + 60, groundY - 45, 30, 90, 'stone'));
        blocks.push(createBlock(bx, groundY - 100, 170, 22, 'stone'));

        blocks.push(createBlock(bx - 40, groundY - 150, 24, 80, 'stone'));
        blocks.push(createBlock(bx + 40, groundY - 150, 24, 80, 'stone'));
        blocks.push(createBlock(bx, groundY - 195, 120, 18, 'wood'));

        pigs.push(createPig(bx, groundY - 25, 'helmet'));
        pigs.push(createPig(bx - 20, groundY - 125, 'small'));
        pigs.push(createPig(bx + 20, groundY - 125, 'small'));
        pigs.push(createPig(bx, groundY - 220, 'king'));

        Matter.World.add(world, [...blocks, ...pigs]);
        return { blocks, pigs };
      },
    },
    {
      id: 6,
      name: '巨人の進撃',
      nameEn: 'The Colossus',
      birds: ['terence', 'bomb', 'chuck', 'red'],
      starScores: [22000, 38000, 52000],
      setup: (world) => {
        const blocks: Matter.Body[] = [];
        const pigs: Matter.Body[] = [];
        const groundY = 580;

        // 3連タワー
        [740, 880, 1020].forEach((tx, idx) => {
          const mat: MaterialType = idx === 1 ? 'stone' : 'wood';
          blocks.push(createBlock(tx - 30, groundY - 60, 20, 120, mat));
          blocks.push(createBlock(tx + 30, groundY - 60, 20, 120, mat));
          blocks.push(createBlock(tx, groundY - 130, 95, 18, mat));

          blocks.push(createBlock(tx - 20, groundY - 180, 16, 80, 'ice'));
          blocks.push(createBlock(tx + 20, groundY - 180, 16, 80, 'ice'));
          blocks.push(createBlock(tx, groundY - 225, 75, 14, 'wood'));

          pigs.push(createPig(tx, groundY - 22, idx === 1 ? 'helmet' : 'small'));
          pigs.push(createPig(tx, groundY - 245, 'medium'));
        });

        // 真ん中タワーの上部にTNT
        blocks.push(createBlock(880, groundY - 150, 36, 36, 'tnt'));

        Matter.World.add(world, [...blocks, ...pigs]);
        return { blocks, pigs };
      },
    },
    {
      id: 7,
      name: '三層の要塞防壁',
      nameEn: 'Helmet Fortress',
      birds: ['blues', 'chuck', 'bomb', 'red'],
      starScores: [25000, 42000, 58000],
      setup: (world) => {
        const blocks: Matter.Body[] = [];
        const pigs: Matter.Body[] = [];
        const bx = 890;
        const groundY = 580;

        // 1層目: 氷の外壁
        blocks.push(createBlock(bx - 100, groundY - 40, 20, 80, 'ice'));
        blocks.push(createBlock(bx - 100, groundY - 100, 20, 80, 'ice'));

        // 2層目: 木のメイン城壁
        blocks.push(createBlock(bx - 40, groundY - 60, 22, 120, 'wood'));
        blocks.push(createBlock(bx + 40, groundY - 60, 22, 120, 'wood'));
        blocks.push(createBlock(bx, groundY - 130, 130, 20, 'stone'));

        // 3層目: 最上階
        blocks.push(createBlock(bx - 30, groundY - 180, 18, 80, 'stone'));
        blocks.push(createBlock(bx + 30, groundY - 180, 18, 80, 'stone'));
        blocks.push(createBlock(bx, groundY - 225, 90, 16, 'wood'));

        blocks.push(createBlock(bx + 85, groundY - 25, 40, 40, 'tnt'));

        pigs.push(createPig(bx - 100, groundY - 150, 'small'));
        pigs.push(createPig(bx, groundY - 25, 'helmet'));
        pigs.push(createPig(bx, groundY - 155, 'helmet'));
        pigs.push(createPig(bx, groundY - 245, 'medium'));

        Matter.World.add(world, [...blocks, ...pigs]);
        return { blocks, pigs };
      },
    },
    {
      id: 8,
      name: 'キングピッグの決戦城',
      nameEn: "King Pig's Citadel",
      birds: ['red', 'blues', 'chuck', 'bomb', 'terence'],
      starScores: [30000, 55000, 75000],
      setup: (world) => {
        const blocks: Matter.Body[] = [];
        const pigs: Matter.Body[] = [];
        const bx = 900;
        const groundY = 580;

        // 土台の石柱
        blocks.push(createBlock(bx - 80, groundY - 60, 30, 120, 'stone'));
        blocks.push(createBlock(bx, groundY - 60, 30, 120, 'stone'));
        blocks.push(createBlock(bx + 80, groundY - 60, 30, 120, 'stone'));
        blocks.push(createBlock(bx, groundY - 130, 220, 22, 'stone'));

        // 2階: 木とTNT
        blocks.push(createBlock(bx - 50, groundY - 180, 20, 80, 'wood'));
        blocks.push(createBlock(bx + 50, groundY - 180, 20, 80, 'wood'));
        blocks.push(createBlock(bx - 75, groundY - 155, 36, 36, 'tnt'));
        blocks.push(createBlock(bx + 75, groundY - 155, 36, 36, 'tnt'));
        blocks.push(createBlock(bx, groundY - 230, 150, 18, 'wood'));

        // 3階: 王座（氷と石のコンビ）
        blocks.push(createBlock(bx - 35, groundY - 280, 16, 80, 'ice'));
        blocks.push(createBlock(bx + 35, groundY - 280, 16, 80, 'ice'));
        blocks.push(createBlock(bx, groundY - 325, 110, 16, 'stone'));

        // 敵たち
        pigs.push(createPig(bx - 40, groundY - 25, 'helmet'));
        pigs.push(createPig(bx + 40, groundY - 25, 'helmet'));
        pigs.push(createPig(bx, groundY - 155, 'medium'));
        pigs.push(createPig(bx, groundY - 255, 'helmet'));
        pigs.push(createPig(bx, groundY - 360, 'king'));

        Matter.World.add(world, [...blocks, ...pigs]);
        return { blocks, pigs };
      },
    },
  ];

  // --- 次のバードをスリングショットに装填 ---
  const loadNextBird = useCallback(() => {
    const s = stateRef.current;
    if (!s.engine) return;

    if (s.birdsQueue.length === 0) {
      s.activeBird = null;
      s.activeBirdType = null;
      return;
    }

    const type = s.birdsQueue.shift()!;
    s.activeBirdType = type;
    s.isBirdLaunched = false;
    s.hasUsedSkill = false;
    s.shotTimer = 0;
    s.subBirds = [];

    let radius = 18;
    let density = 0.0035;

    if (type === 'red') {
      radius = 18;
      density = 0.004;
    } else if (type === 'chuck') {
      radius = 16;
      density = 0.003;
    } else if (type === 'blues') {
      radius = 13;
      density = 0.0025;
    } else if (type === 'bomb') {
      radius = 22;
      density = 0.005;
    } else if (type === 'terence') {
      radius = 30;
      density = 0.012;
    }

    const bird = Matter.Bodies.circle(s.slingshotAnchor.x, s.slingshotAnchor.y, radius, {
      isStatic: true,
      density,
      friction: 0.5,
      restitution: 0.4,
    });

    (bird as any).gameData = {
      isBird: true,
      type,
      radius,
      alive: true,
    };

    Matter.World.add(s.engine.world, bird);
    s.activeBird = bird;
  }, []);

  // --- TNT 爆破処理 ---
  const explodeTNT = useCallback((tntBody: Matter.Body) => {
    const s = stateRef.current;
    if (!s.engine) return;

    const tx = tntBody.position.x;
    const ty = tntBody.position.y;

    s.screenShake = 18;
    sound.playTntExplode();
    addExplosion(tx, ty, 140);
    addParticles(tx, ty, '#f97316', 30, 'rect');
    addParticles(tx, ty, '#ef4444', 20, 'circle');
    addFloatingScore(tx, ty - 30, '+500 TNT!', '#f97316');

    // 周囲の剛体にインパルス
    const blastRadius = 190;
    const allBodies = Matter.Composite.allBodies(s.engine.world);

    allBodies.forEach((body) => {
      if (body === tntBody) return;
      const dx = body.position.x - tx;
      const dy = body.position.y - ty;
      const dist = Math.hypot(dx, dy);

      if (dist < blastRadius && dist > 1) {
        const forceMag = ((blastRadius - dist) / blastRadius) * 0.06 * body.mass;
        const nx = dx / dist;
        const ny = dy / dist;
        Matter.Body.applyForce(body, body.position, {
          x: nx * forceMag,
          y: ny * forceMag - 0.02 * body.mass,
        });

        const gData = (body as any).gameData;
        if (gData) {
          const dmg = ((blastRadius - dist) / blastRadius) * 160;
          gData.hp -= dmg;
        }
      }
    });

    // TNT自身を除去
    (tntBody as any).gameData.alive = false;
    Matter.World.remove(s.engine.world, tntBody);
    s.blocks = s.blocks.filter((b) => b !== tntBody);
    s.score += 500;
    setScore(s.score);
  }, []);

  // --- ボムバードの爆破処理 ---
  const triggerBombExplosion = useCallback((bombBody: Matter.Body) => {
    const s = stateRef.current;
    if (!s.engine || !(bombBody as any).gameData?.alive) return;

    const bx = bombBody.position.x;
    const by = bombBody.position.y;

    s.screenShake = 16;
    sound.playTntExplode();
    addExplosion(bx, by, 160);
    addParticles(bx, by, '#334155', 25, 'rect');
    addParticles(bx, by, '#ef4444', 25, 'circle');
    addFloatingScore(bx, by - 30, '+1000 BOOM!', '#ef4444');

    const blastRadius = 220;
    const allBodies = Matter.Composite.allBodies(s.engine.world);

    allBodies.forEach((body) => {
      if (body === bombBody) return;
      const dx = body.position.x - bx;
      const dy = body.position.y - by;
      const dist = Math.hypot(dx, dy);

      if (dist < blastRadius && dist > 1) {
        const forceMag = ((blastRadius - dist) / blastRadius) * 0.08 * body.mass;
        const nx = dx / dist;
        const ny = dy / dist;
        Matter.Body.applyForce(body, body.position, {
          x: nx * forceMag,
          y: ny * forceMag - 0.03 * body.mass,
        });

        const gData = (body as any).gameData;
        if (gData) {
          const dmg = ((blastRadius - dist) / blastRadius) * 220;
          gData.hp -= dmg;
        }
      }
    });

    (bombBody as any).gameData.alive = false;
    Matter.World.remove(s.engine.world, bombBody);
    s.score += 1000;
    setScore(s.score);
  }, []);

  // --- ステージの初期化・ロード ---
  const initLevel = useCallback(
    (levelId: number) => {
      const s = stateRef.current;
      if (s.animFrameId) {
        cancelAnimationFrame(s.animFrameId);
        s.animFrameId = null;
      }

      // 既存ワールドのクリーンアップ
      if (s.engine) {
        Matter.World.clear(s.engine.world, false);
        Matter.Engine.clear(s.engine);
        s.engine = null;
      }

      const levelDef = LEVELS.find((l) => l.id === levelId) || LEVELS[0];

      // Matter.js エンジンの作成
      const engine = Matter.Engine.create({
        gravity: { x: 0, y: 1.05, scale: 0.001 },
      });

      // 地面 & 壁境界の追加
      const ground = Matter.Bodies.rectangle(V_WIDTH / 2, 630, V_WIDTH * 2, 100, {
        isStatic: true,
        friction: 0.8,
        restitution: 0.2,
      });
      const leftWall = Matter.Bodies.rectangle(-50, V_HEIGHT / 2, 100, V_HEIGHT * 2, {
        isStatic: true,
      });
      const rightWall = Matter.Bodies.rectangle(V_WIDTH + 150, V_HEIGHT / 2, 100, V_HEIGHT * 2, {
        isStatic: true,
      });

      Matter.World.add(engine.world, [ground, leftWall, rightWall]);

      // ステージのブロック & ピッグの構築
      const { blocks, pigs } = levelDef.setup(engine.world);

      s.engine = engine;
      s.blocks = blocks;
      s.pigs = pigs;
      s.birdsQueue = [...levelDef.birds];
      s.activeBird = null;
      s.activeBirdType = null;
      s.isBirdLaunched = false;
      s.hasUsedSkill = false;
      s.shotTimer = 0;
      s.subBirds = [];
      s.dragPos = null;
      s.isDragging = false;
      s.particles = [];
      s.floatingTexts = [];
      s.explosions = [];
      s.currentTrajectory = [];
      s.score = 0;
      s.cameraX = 0;
      s.targetCameraX = 0;
      s.settleTimer = 0;

      setScore(0);
      setGameState('playing');
      setEarnedStars(0);

      // 衝突判定リスナー
      Matter.Events.on(engine, 'collisionStart', (event) => {
        event.pairs.forEach((pair) => {
          const bodyA = pair.bodyA;
          const bodyB = pair.bodyB;
          const gA = (bodyA as any).gameData;
          const gB = (bodyB as any).gameData;

          // 相対速度から衝撃エネルギーを算出
          const speedA = Math.hypot(bodyA.velocity.x, bodyA.velocity.y);
          const speedB = Math.hypot(bodyB.velocity.x, bodyB.velocity.y);
          const relSpeed = Math.abs(speedA - speedB);

          // 効果音
          if (relSpeed > 2.5) {
            if (gA?.material === 'wood' || gB?.material === 'wood') sound.playImpactWood();
            else if (gA?.material === 'ice' || gB?.material === 'ice') sound.playImpactIce();
            else if (gA?.material === 'stone' || gB?.material === 'stone') sound.playImpactStone();
          }

          // ダメージ適用
          if (relSpeed > 2) {
            const damage = relSpeed * 7.5;
            if (relSpeed > 6.5) s.screenShake = Math.max(s.screenShake, 5);
            if (gA && gA.alive) {
              gA.hp -= damage;
              if (gA.isPig && relSpeed > 4) sound.playPigSqueal();
            }
            if (gB && gB.alive) {
              gB.hp -= damage;
              if (gB.isPig && relSpeed > 4) sound.playPigSqueal();
            }
          }

          // TNT 直撃点火判定
          if (relSpeed > 3) {
            if (gA?.material === 'tnt' && gA.alive) explodeTNT(bodyA);
            if (gB?.material === 'tnt' && gB.alive) explodeTNT(bodyB);
          }

          // ボムバードの着弾爆破タイマー
          if (gA?.isBird && gA.type === 'bomb' && relSpeed > 3.5) {
            setTimeout(() => triggerBombExplosion(bodyA), 700);
          }
          if (gB?.isBird && gB.type === 'bomb' && relSpeed > 3.5) {
            setTimeout(() => triggerBombExplosion(bodyB), 700);
          }
        });
      });

      // 最初のバードを装填
      loadNextBird();
    },
    [explodeTNT, loadNextBird, triggerBombExplosion]
  );

  // ステージ初期化実行
  useEffect(() => {
    initLevel(currentLevel);
  }, [currentLevel, initLevel]);

  // --- スキル発動 (空中タップ / クリック) ---
  const triggerSkill = () => {
    const s = stateRef.current;
    if (!s.activeBird || !s.isBirdLaunched || s.hasUsedSkill || !(s.activeBird as any).gameData?.alive) return;

    const b = s.activeBird;
    const type = s.activeBirdType;
    s.hasUsedSkill = true;

    sound.playBirdSkill(type || '');

    if (type === 'chuck') {
      // ロケット急加速
      const curVx = b.velocity.x;
      const curVy = b.velocity.y;
      const len = Math.hypot(curVx, curVy) || 1;
      const speed = 28;
      Matter.Body.setVelocity(b, {
        x: (curVx / len) * speed,
        y: (curVy / len) * speed * 0.8,
      });
      addParticles(b.position.x, b.position.y, '#facc15', 20, 'feather');
      addFloatingScore(b.position.x, b.position.y - 20, 'DASH!!', '#facc15');
    } else if (type === 'blues') {
      // 3分裂スプリット
      if (!s.engine) return;
      const vx = b.velocity.x;
      const vy = b.velocity.y;
      const rad = 13;

      [-1, 1].forEach((dir) => {
        const subBird = Matter.Bodies.circle(b.position.x, b.position.y + dir * 16, rad, {
          density: 0.0025,
          friction: 0.5,
          restitution: 0.4,
        });
        (subBird as any).gameData = {
          isBird: true,
          type: 'blues',
          radius: rad,
          alive: true,
        };
        Matter.Body.setVelocity(subBird, {
          x: vx,
          y: vy + dir * 3.5,
        });
        Matter.World.add(s.engine!.world, subBird);
        s.subBirds.push(subBird);
      });

      addParticles(b.position.x, b.position.y, '#38bdf8', 18, 'feather');
      addFloatingScore(b.position.x, b.position.y - 20, 'SPLIT!', '#38bdf8');
    } else if (type === 'bomb') {
      // 即時大爆破
      triggerBombExplosion(b);
    } else if (type === 'red') {
      // 気合いの雄叫び衝撃波 (前方のオブジェクトを吹き飛ばす)
      const bx = b.position.x;
      const by = b.position.y;
      addParticles(bx + 30, by, '#ef4444', 18, 'circle');
      addFloatingScore(bx, by - 25, 'ROAR!!', '#ef4444');

      if (s.engine) {
        const allBodies = Matter.Composite.allBodies(s.engine.world);
        allBodies.forEach((body) => {
          if (body === b) return;
          const dx = body.position.x - bx;
          const dy = body.position.y - by;
          if (dx > 0 && dx < 220 && Math.abs(dy) < 140) {
            Matter.Body.applyForce(body, body.position, {
              x: 0.045 * body.mass,
              y: -0.015 * body.mass,
            });
          }
        });
      }
    }
  };

  // --- スリングショット操作 (ポインター & タッチイベント) ---
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const s = stateRef.current;
    if (gameState !== 'playing') return;

    // 空中タップでスキル発動
    if (s.isBirdLaunched && !s.hasUsedSkill) {
      triggerSkill();
      return;
    }

    if (!s.activeBird || s.isBirdLaunched) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = V_WIDTH / rect.width;
    const scaleY = V_HEIGHT / rect.height;
    const px = (e.clientX - rect.left) * scaleX;
    const py = (e.clientY - rect.top) * scaleY;

    // パチンコ近辺をクリックしたか
    const distToAnchor = Math.hypot(px - s.slingshotAnchor.x, py - s.slingshotAnchor.y);
    if (distToAnchor < 70) {
      s.isDragging = true;
      s.dragPos = { x: px, y: py };
      sound.playSlingshotPull();
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const s = stateRef.current;
    if (!s.isDragging || !s.activeBird) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = V_WIDTH / rect.width;
    const scaleY = V_HEIGHT / rect.height;
    const px = (e.clientX - rect.left) * scaleX;
    const py = (e.clientY - rect.top) * scaleY;

    // アンカーからのベクトル
    let dx = px - s.slingshotAnchor.x;
    let dy = py - s.slingshotAnchor.y;
    const dist = Math.hypot(dx, dy);

    // 最大引張制限
    if (dist > SLING_MAX_PULL) {
      dx = (dx / dist) * SLING_MAX_PULL;
      dy = (dy / dist) * SLING_MAX_PULL;
    }

    s.dragPos = {
      x: s.slingshotAnchor.x + dx,
      y: s.slingshotAnchor.y + dy,
    };

    // バードの位置をドラッグ位置に追従
    Matter.Body.setPosition(s.activeBird, s.dragPos);
  };

  const handlePointerUp = () => {
    const s = stateRef.current;
    if (!s.isDragging || !s.activeBird) return;

    s.isDragging = false;

    if (s.dragPos) {
      const dx = s.slingshotAnchor.x - s.dragPos.x;
      const dy = s.slingshotAnchor.y - s.dragPos.y;
      const pullDist = Math.hypot(dx, dy);

      if (pullDist > 15) {
        // 発射！
        Matter.Body.setStatic(s.activeBird, false);
        const power = 0.23;
        Matter.Body.setVelocity(s.activeBird, {
          x: dx * power,
          y: dy * power,
        });

        s.isBirdLaunched = true;
        s.shotTimer = 0;
        s.prevTrajectory = [...s.currentTrajectory];
        s.currentTrajectory = [];

        sound.playSlingshotRelease();
        sound.playBirdFly();
      } else {
        // 引きが弱すぎる場合は元に戻す
        Matter.Body.setPosition(s.activeBird, s.slingshotAnchor);
      }
    }

    s.dragPos = null;
  };

  // --- メインゲームループ (物理更新 + レンダリング) ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.033);
      lastTime = time;

      const s = stateRef.current;

      // 1. 物理エンジンのステップ更新
      if (s.engine && gameState === 'playing') {
        Matter.Engine.update(s.engine, 1000 / 60);

        // HPゼロのオブジェクトの消滅処理
        const allBodies = Matter.Composite.allBodies(s.engine.world);
        allBodies.forEach((body) => {
          const gData = (body as any).gameData;
          if (gData && gData.alive && gData.hp <= 0) {
            gData.alive = false;

            if (gData.isPig) {
              sound.playPigDefeated();
              addParticles(body.position.x, body.position.y, '#22c55e', 22, 'circle');
              addParticles(body.position.x, body.position.y, '#facc15', 10, 'feather');
              const pigPoints = gData.type === 'king' ? 10000 : gData.type === 'helmet' ? 6000 : 5000;
              s.score += pigPoints;
              setScore(s.score);
              addFloatingScore(body.position.x, body.position.y - 20, `+${pigPoints}`, '#22c55e');
              Matter.World.remove(s.engine!.world, body);
              s.pigs = s.pigs.filter((p) => p !== body);
            } else if (gData.isBlock) {
              const blkScore = gData.material === 'stone' ? 200 : gData.material === 'ice' ? 150 : 100;
              s.score += blkScore;
              setScore(s.score);
              addFloatingScore(body.position.x, body.position.y - 15, `+${blkScore}`, '#94a3b8');

              const pColor =
                gData.material === 'ice' ? '#7dd3fc' : gData.material === 'stone' ? '#94a3b8' : '#b45309';
              addParticles(body.position.x, body.position.y, pColor, 12, 'rect');

              Matter.World.remove(s.engine!.world, body);
              s.blocks = s.blocks.filter((b) => b !== body);
            }
          }
        });

        // 画面外に落ちたピッグの除去
        s.pigs.forEach((pig) => {
          if (pig.position.y > 650 && (pig as any).gameData?.alive) {
            (pig as any).gameData.alive = false;
            sound.playPigDefeated();
            s.score += 5000;
            setScore(s.score);
            addFloatingScore(pig.position.x, 580, '+5000', '#22c55e');
            Matter.World.remove(s.engine!.world, pig);
            s.pigs = s.pigs.filter((p) => p !== pig);
          }
        });

        // 発射中バードの追跡と弾道記録
        if (s.activeBird && s.isBirdLaunched) {
          s.shotTimer += dt;
          const bp = s.activeBird.position;

          // 軌道ドットの追加
          if (s.currentTrajectory.length === 0 || Math.hypot(bp.x - s.currentTrajectory[s.currentTrajectory.length - 1].x, bp.y - s.currentTrajectory[s.currentTrajectory.length - 1].y) > 24) {
            s.currentTrajectory.push({ x: bp.x, y: bp.y });
          }

          // 鳥の速度がほぼゼロ、または一定時間経過、または画面外に出たら次のバードへ
          const birdSpeed = Math.hypot(s.activeBird.velocity.x, s.activeBird.velocity.y);
          const isOffScreen = bp.x > V_WIDTH + 60 || bp.x < -60 || bp.y > 640;

          if (s.shotTimer > 2.0 && (birdSpeed < 0.6 || isOffScreen || s.shotTimer > 8.0)) {
            s.settleTimer += dt;
            if (s.settleTimer > 0.8) {
              s.settleTimer = 0;
              // 現在のバードを除去
              if ((s.activeBird as any).gameData?.alive) {
                (s.activeBird as any).gameData.alive = false;
                addParticles(s.activeBird.position.x, s.activeBird.position.y, '#f87171', 12, 'feather');
                Matter.World.remove(s.engine.world, s.activeBird);
              }
              // 分裂サブバードも除去
              s.subBirds.forEach((sb) => {
                Matter.World.remove(s.engine!.world, sb);
              });
              s.subBirds = [];

              // 次のバードへ
              loadNextBird();
            }
          }
        }

        // ピッグ全滅判定 (クリア！)
        const livingPigs = s.pigs.filter((p) => (p as any).gameData?.alive);
        if (livingPigs.length === 0 && gameState === 'playing') {
          // 残存バードボーナス (1羽につき 10000点)
          const remainingBonus = s.birdsQueue.length * 10000;
          const finalScore = s.score + remainingBonus;
          s.score = finalScore;
          setScore(finalScore);

          // ハイスコア更新
          if (finalScore > highScore) {
            setHighScore(finalScore);
            localStorage.setItem(HIGH_SCORE_KEY, finalScore.toString());
          }

          // 星評価
          const curDef = LEVELS.find((l) => l.id === currentLevel) || LEVELS[0];
          let stars = 1;
          if (finalScore >= curDef.starScores[2]) stars = 3;
          else if (finalScore >= curDef.starScores[1]) stars = 2;

          setEarnedStars(stars);
          setLevelStars((prev) => {
            const next = { ...prev, [currentLevel]: Math.max(prev[currentLevel] || 0, stars) };
            localStorage.setItem(LEVEL_STARS_KEY, JSON.stringify(next));
            return next;
          });

          sound.playThreeStars();
          setGameState('cleared');
        }

        // バードが尽きてピッグが残っているか判定 (失敗)
        if (
          livingPigs.length > 0 &&
          s.birdsQueue.length === 0 &&
          !s.activeBird &&
          gameState === 'playing'
        ) {
          sound.playGameOver();
          setGameState('failed');
        }
      }

      // 2. 画面レンダリング
      renderScene(ctx);

      s.animFrameId = requestAnimationFrame(loop);
    };

    stateRef.current.animFrameId = requestAnimationFrame(loop);

    return () => {
      if (stateRef.current.animFrameId) {
        cancelAnimationFrame(stateRef.current.animFrameId);
      }
    };
  }, [gameState, currentLevel, highScore, loadNextBird]);

  // --- 描画ロジック ---
  const renderScene = (ctx: CanvasRenderingContext2D) => {
    const s = stateRef.current;

    ctx.clearRect(0, 0, V_WIDTH, V_HEIGHT);
    ctx.save();

    // 画面揺れ (Screen Shake)
    if (s.screenShake > 0.15) {
      const shakeX = (Math.random() - 0.5) * s.screenShake;
      const shakeY = (Math.random() - 0.5) * s.screenShake;
      ctx.translate(shakeX, shakeY);
      s.screenShake *= 0.88;
    } else {
      s.screenShake = 0;
    }

    // 1. 美しい青空・グラデーション背景
    const skyGrad = ctx.createLinearGradient(0, 0, 0, V_HEIGHT);
    if (isDark) {
      skyGrad.addColorStop(0, '#0f172a');
      skyGrad.addColorStop(0.65, '#1e293b');
      skyGrad.addColorStop(1, '#334155');
    } else {
      skyGrad.addColorStop(0, '#38bdf8');
      skyGrad.addColorStop(0.5, '#7dd3fc');
      skyGrad.addColorStop(1, '#bae6fd');
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);

    // 太陽
    ctx.beginPath();
    ctx.arc(1100, 110, 48, 0, Math.PI * 2);
    ctx.fillStyle = isDark ? 'rgba(253, 224, 71, 0.2)' : 'rgba(254, 240, 138, 0.9)';
    ctx.fill();

    // ふわふわした雲
    ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.75)';
    [
      { x: 180, y: 120, r: 35 },
      { x: 220, y: 110, r: 45 },
      { x: 260, y: 120, r: 35 },
      { x: 620, y: 160, r: 38 },
      { x: 660, y: 145, r: 50 },
      { x: 710, y: 160, r: 40 },
    ].forEach((c) => {
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
      ctx.fill();
    });

    // 遠景の山・丘
    ctx.fillStyle = isDark ? '#1e293b' : '#86efac';
    ctx.beginPath();
    ctx.moveTo(0, 580);
    ctx.bezierCurveTo(300, 480, 600, 560, V_WIDTH, 520);
    ctx.lineTo(V_WIDTH, V_HEIGHT);
    ctx.lineTo(0, V_HEIGHT);
    ctx.fill();

    // 近景の緑の地面
    ctx.fillStyle = isDark ? '#0f172a' : '#4ade80';
    ctx.beginPath();
    ctx.moveTo(0, 580);
    ctx.lineTo(V_WIDTH, 580);
    ctx.lineTo(V_WIDTH, V_HEIGHT);
    ctx.lineTo(0, V_HEIGHT);
    ctx.fill();

    // 地面の草のディテール
    ctx.fillStyle = isDark ? '#166534' : '#22c55e';
    ctx.fillRect(0, 580, V_WIDTH, 14);

    // 2. 前回の弾道軌跡（薄い白ドット）
    if (s.prevTrajectory.length > 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      s.prevTrajectory.forEach((p, idx) => {
        if (idx % 2 === 0) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }

    // 3. 現在の弾道軌跡（白ドット）
    if (s.currentTrajectory.length > 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      s.currentTrajectory.forEach((p, idx) => {
        if (idx % 2 === 0) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }

    // 4. ドラッグ中の放物線予測ガイド
    if (s.isDragging && s.dragPos && s.activeBird) {
      const dx = s.slingshotAnchor.x - s.dragPos.x;
      const dy = s.slingshotAnchor.y - s.dragPos.y;
      const power = 0.23;
      let simX = s.dragPos.x;
      let simY = s.dragPos.y;
      let simVx = dx * power;
      let simVy = dy * power;
      const gravity = 1.05 * 0.001 * 50; // 近似シミュレーション

      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      for (let step = 0; step < 26; step++) {
        simX += simVx * 1.6;
        simY += simVy * 1.6;
        simVy += gravity * 1.6;

        if (simY > 580) break;

        ctx.beginPath();
        ctx.arc(simX, simY, Math.max(2, 5 - step * 0.12), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 5. スリングショット奥のゴム紐
    if (s.dragPos && s.activeBird) {
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(s.slingshotAnchor.x + 14, s.slingshotAnchor.y - 18);
      ctx.lineTo(s.dragPos.x, s.dragPos.y);
      ctx.stroke();
    }

    // 6. スリングショット台（木製Y字フレーム）
    drawSlingshot(ctx, s.slingshotAnchor.x, s.slingshotAnchor.y);

    // 7. スリングショット手前のゴム紐
    if (s.dragPos && s.activeBird) {
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(s.slingshotAnchor.x - 14, s.slingshotAnchor.y - 18);
      ctx.lineTo(s.dragPos.x, s.dragPos.y);
      ctx.stroke();
    }

    // 8. 待機中のバードたち（スリングショット後ろに並ぶ）
    s.birdsQueue.forEach((bType, idx) => {
      const qx = s.slingshotAnchor.x - 55 - idx * 36;
      const qy = 575;
      drawBird(ctx, qx, qy, 0, bType, 13);
    });

    // 9. ブロック描画
    s.blocks.forEach((block) => {
      const gData = (block as any).gameData;
      if (!gData || !gData.alive) return;
      drawBlock(ctx, block);
    });

    // 10. ピッグ描画
    s.blinkTimer = (s.blinkTimer + 1) % 180;
    const isBlinking = s.blinkTimer > 170;
    s.pigs.forEach((pig) => {
      const gData = (pig as any).gameData;
      if (!gData || !gData.alive) return;
      drawPig(ctx, pig, isBlinking);
    });

    // 11. アクティブバード描画
    if (s.activeBird && (s.activeBird as any).gameData?.alive) {
      const bp = s.activeBird.position;
      let angle = s.activeBird.angle;
      const vx = s.activeBird.velocity.x;
      const vy = s.activeBird.velocity.y;
      const speed = Math.hypot(vx, vy);

      // 飛行中は進行方向に頭を向ける
      if (s.isBirdLaunched && speed > 1.2) {
        angle = Math.atan2(vy, vx);
        // 白いモクモクスモークトレイル
        if (Math.random() < 0.45) {
          s.particles.push({
            x: bp.x - (vx / speed) * 14,
            y: bp.y - (vy / speed) * 14,
            vx: (Math.random() - 0.5) * 0.6,
            vy: (Math.random() - 0.5) * 0.6,
            radius: Math.random() * 4 + 3,
            color: 'rgba(255, 255, 255, 0.75)',
            alpha: 0.8,
            life: 0,
            maxLife: 22,
            rotation: 0,
            vRot: 0,
            shape: 'circle',
          });
        }
      }

      const gData = (s.activeBird as any).gameData;
      drawBird(ctx, bp.x, bp.y, angle, gData.type, gData.radius);
    }

    // 分裂サブバード描画
    s.subBirds.forEach((sb) => {
      const svx = sb.velocity.x;
      const svy = sb.velocity.y;
      const sAngle = Math.hypot(svx, svy) > 1.2 ? Math.atan2(svy, svx) : sb.angle;
      drawBird(ctx, sb.position.x, sb.position.y, sAngle, 'blues', 13);
    });

    // 12. 爆発エフェクト描画
    for (let i = s.explosions.length - 1; i >= 0; i--) {
      const exp = s.explosions[i];
      exp.currentRadius += 5;
      exp.alpha -= 0.04;

      if (exp.alpha <= 0) {
        s.explosions.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.beginPath();
      ctx.arc(exp.x, exp.y, exp.currentRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(249, 115, 22, ${exp.alpha})`;
      ctx.lineWidth = 8;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(exp.x, exp.y, exp.currentRadius * 0.7, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(253, 224, 71, ${exp.alpha * 0.5})`;
      ctx.fill();
      ctx.restore();
    }

    // 13. パーティクル描画
    for (let i = s.particles.length - 1; i >= 0; i--) {
      const p = s.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.22; // 重力
      p.rotation += p.vRot;
      p.life++;
      p.alpha = 1 - p.life / p.maxLife;

      if (p.life >= p.maxLife) {
        s.particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;

      if (p.shape === 'rect') {
        ctx.fillRect(-p.radius, -p.radius, p.radius * 2, p.radius * 2);
      } else if (p.shape === 'feather') {
        ctx.beginPath();
        ctx.ellipse(0, 0, p.radius * 2, p.radius * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 14. 浮遊スコアテキスト描画
    for (let i = s.floatingTexts.length - 1; i >= 0; i--) {
      const ft = s.floatingTexts[i];
      ft.y -= 1.2;
      ft.life++;
      ft.alpha = Math.max(0, 1 - ft.life / 40);

      if (ft.life >= 40) {
        s.floatingTexts.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.font = '900 18px sans-serif';
      ctx.fillStyle = ft.color;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 4;
      ctx.globalAlpha = ft.alpha;
      ctx.fillText(ft.text, ft.x - 20, ft.y);
      ctx.restore();
    }

    ctx.restore();
  };

  // --- スリングショット木枠描画 ---
  const drawSlingshot = (ctx: CanvasRenderingContext2D, sx: number, sy: number) => {
    ctx.save();
    // 柱
    ctx.fillStyle = '#78350f';
    ctx.fillRect(sx - 7, sy - 15, 14, 70);

    // 左アーム
    ctx.beginPath();
    ctx.moveTo(sx - 7, sy - 5);
    ctx.lineTo(sx - 20, sy - 35);
    ctx.lineTo(sx - 8, sy - 35);
    ctx.lineTo(sx, sy - 5);
    ctx.fill();

    // 右アーム
    ctx.beginPath();
    ctx.moveTo(sx + 7, sy - 5);
    ctx.lineTo(sx + 20, sy - 35);
    ctx.lineTo(sx + 8, sy - 35);
    ctx.lineTo(sx, sy - 5);
    ctx.fill();

    // 先端のフォークフック
    ctx.fillStyle = '#92400e';
    ctx.beginPath();
    ctx.arc(sx - 14, sy - 35, 6, 0, Math.PI * 2);
    ctx.arc(sx + 14, sy - 35, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  // --- バード描画関数 (種類別リッチ描画) ---
  const drawBird = (
    ctx: CanvasRenderingContext2D,
    bx: number,
    by: number,
    angle: number,
    type: BirdType,
    radius: number
  ) => {
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(angle);

    if (type === 'red' || type === 'terence') {
      const isGiant = type === 'terence';
      const bodyColor = isGiant ? '#991b1b' : '#ef4444';

      // 体
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();

      // お腹の淡いクリーム色
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.ellipse(2, 4, radius * 0.6, radius * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();

      // 凛々しい黒い眉毛
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(-radius * 0.4, -radius * 0.35);
      ctx.lineTo(radius * 0.6, -radius * 0.15);
      ctx.lineTo(radius * 0.5, -radius * 0.35);
      ctx.fill();

      // 白目
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(radius * 0.25, -radius * 0.1, radius * 0.28, 0, Math.PI * 2);
      ctx.arc(radius * 0.55, -radius * 0.08, radius * 0.24, 0, Math.PI * 2);
      ctx.fill();

      // 黒目
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(radius * 0.32, -radius * 0.1, radius * 0.12, 0, Math.PI * 2);
      ctx.arc(radius * 0.6, -radius * 0.08, radius * 0.1, 0, Math.PI * 2);
      ctx.fill();

      // 黄色いクチバシ
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(radius * 0.4, 0);
      ctx.lineTo(radius * 1.15, radius * 0.1);
      ctx.lineTo(radius * 0.4, radius * 0.3);
      ctx.fill();
    } else if (type === 'chuck') {
      // チャック (黄色の三角形状)
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.moveTo(radius * 1.2, 0);
      ctx.lineTo(-radius * 0.9, -radius * 0.85);
      ctx.lineTo(-radius * 0.7, radius * 0.85);
      ctx.closePath();
      ctx.fill();

      // 白目
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(radius * 0.2, -radius * 0.15, radius * 0.26, 0, Math.PI * 2);
      ctx.arc(radius * 0.55, -radius * 0.12, radius * 0.24, 0, Math.PI * 2);
      ctx.fill();

      // 黒目
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(radius * 0.28, -radius * 0.15, radius * 0.11, 0, Math.PI * 2);
      ctx.arc(radius * 0.6, -radius * 0.12, radius * 0.1, 0, Math.PI * 2);
      ctx.fill();

      // クチバシ
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.moveTo(radius * 0.45, -radius * 0.05);
      ctx.lineTo(radius * 1.35, 0);
      ctx.lineTo(radius * 0.45, radius * 0.25);
      ctx.fill();
    } else if (type === 'blues') {
      // ブルー (青色の小鳥)
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();

      // 目
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(radius * 0.3, -radius * 0.15, radius * 0.32, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(radius * 0.38, -radius * 0.15, radius * 0.14, 0, Math.PI * 2);
      ctx.fill();

      // クチバシ
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(radius * 0.4, 0);
      ctx.lineTo(radius * 1.15, radius * 0.1);
      ctx.lineTo(radius * 0.4, radius * 0.3);
      ctx.fill();
    } else if (type === 'bomb') {
      // ボム (黒色の爆弾鳥)
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();

      // 頭の導火線
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, -radius);
      ctx.lineTo(4, -radius - 12);
      ctx.stroke();

      // 導火線の火花
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(4, -radius - 12, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // 赤い眉毛
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(-radius * 0.4, -radius * 0.3);
      ctx.lineTo(radius * 0.6, -radius * 0.15);
      ctx.lineTo(radius * 0.4, -radius * 0.3);
      ctx.fill();

      // 白目
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(radius * 0.25, -radius * 0.1, radius * 0.26, 0, Math.PI * 2);
      ctx.arc(radius * 0.55, -radius * 0.08, radius * 0.22, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(radius * 0.3, -radius * 0.1, radius * 0.1, 0, Math.PI * 2);
      ctx.arc(radius * 0.58, -radius * 0.08, radius * 0.09, 0, Math.PI * 2);
      ctx.fill();

      // クチバシ
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(radius * 0.4, 0);
      ctx.lineTo(radius * 1.1, radius * 0.1);
      ctx.lineTo(radius * 0.4, radius * 0.3);
      ctx.fill();
    }

    ctx.restore();
  };

  // --- ブロック描画関数 ---
  const drawBlock = (ctx: CanvasRenderingContext2D, body: Matter.Body) => {
    const gData = (body as any).gameData;
    const w = gData.width;
    const h = gData.height;

    ctx.save();
    ctx.translate(body.position.x, body.position.y);
    ctx.rotate(body.angle);

    if (gData.material === 'wood') {
      ctx.fillStyle = '#d97706';
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 2;
      ctx.strokeRect(-w / 2, -h / 2, w, h);

      // 木目ライン
      ctx.strokeStyle = 'rgba(146, 64, 14, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-w / 2 + 4, 0);
      ctx.lineTo(w / 2 - 4, 0);
      ctx.stroke();
    } else if (gData.material === 'ice') {
      ctx.fillStyle = 'rgba(186, 230, 253, 0.75)';
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.strokeRect(-w / 2, -h / 2, w, h);

      // 氷のハイライト斜線
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-w / 2 + 6, -h / 2 + 4);
      ctx.lineTo(w / 2 - 6, h / 2 - 4);
      ctx.stroke();
    } else if (gData.material === 'stone') {
      ctx.fillStyle = '#64748b';
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(-w / 2, -h / 2, w, h);

      // 石のひび割れディテール
      ctx.fillStyle = '#475569';
      ctx.fillRect(-w / 2 + 4, -h / 2 + 4, 4, 4);
      ctx.fillRect(w / 2 - 8, h / 2 - 8, 5, 5);
    } else if (gData.material === 'tnt') {
      // TNTボックス
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.strokeStyle = '#991b1b';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(-w / 2, -h / 2, w, h);

      // 中央の白帯と「TNT」テキスト
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-w / 2, -h * 0.25, w, h * 0.5);
      ctx.fillStyle = '#0f172a';
      ctx.font = '900 14px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('TNT', 0, 0);
    }

    // ダメージによるヒビ（ひび割れ描画）
    if (gData.hp < gData.maxHp * 0.6) {
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-w * 0.2, -h * 0.3);
      ctx.lineTo(0, 0);
      ctx.lineTo(w * 0.25, h * 0.25);
      ctx.stroke();
    }

    ctx.restore();
  };

  // --- ピッグ描画関数 ---
  const drawPig = (ctx: CanvasRenderingContext2D, body: Matter.Body, isBlinking: boolean) => {
    const gData = (pigTypeHelper(body) as any);
    const radius = gData.radius;
    const type = gData.type as PigType;

    ctx.save();
    ctx.translate(body.position.x, body.position.y);
    ctx.rotate(body.angle);

    // 緑の丸い体
    ctx.fillStyle = '#4ade80';
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#16a34a';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 大きな緑の鼻
    ctx.fillStyle = '#86efac';
    ctx.beginPath();
    ctx.ellipse(0, radius * 0.15, radius * 0.45, radius * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 鼻の穴
    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    ctx.arc(-radius * 0.18, radius * 0.15, radius * 0.1, 0, Math.PI * 2);
    ctx.arc(radius * 0.18, radius * 0.15, radius * 0.1, 0, Math.PI * 2);
    ctx.fill();

    // 目
    if (isBlinking) {
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-radius * 0.5, -radius * 0.25);
      ctx.lineTo(-radius * 0.2, -radius * 0.25);
      ctx.moveTo(radius * 0.2, -radius * 0.25);
      ctx.lineTo(radius * 0.5, -radius * 0.25);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-radius * 0.35, -radius * 0.25, radius * 0.25, 0, Math.PI * 2);
      ctx.arc(radius * 0.35, -radius * 0.25, radius * 0.25, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(-radius * 0.3, -radius * 0.25, radius * 0.1, 0, Math.PI * 2);
      ctx.arc(radius * 0.3, -radius * 0.25, radius * 0.1, 0, Math.PI * 2);
      ctx.fill();
    }

    // ヘルメットピッグの防具
    if (type === 'helmet') {
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.arc(0, -radius * 0.25, radius * 1.05, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    // キングピッグの王冠
    if (type === 'king') {
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.moveTo(-radius * 0.6, -radius * 0.8);
      ctx.lineTo(-radius * 0.8, -radius * 1.35);
      ctx.lineTo(-radius * 0.2, -radius * 1.1);
      ctx.lineTo(0, -radius * 1.45);
      ctx.lineTo(radius * 0.2, -radius * 1.1);
      ctx.lineTo(radius * 0.8, -radius * 1.35);
      ctx.lineTo(radius * 0.6, -radius * 0.8);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#ca8a04';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.restore();
  };

  const pigTypeHelper = (body: Matter.Body) => (body as any).gameData;

  const currentLevelDef = LEVELS.find((l) => l.id === currentLevel) || LEVELS[0];

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
            onClick={onBackToHub}
            className="p-2 rounded-xl bg-slate-800/20 hover:bg-slate-800/40 text-current transition cursor-pointer"
            title="ゲーム一覧へ戻る"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="text-xs font-black flex items-center gap-1.5">
              <span>STAGE {currentLevel}</span>
              <span className="text-[11px] font-normal text-slate-400">
                {currentLevelDef.name}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              ★3目標: {currentLevelDef.starScores[2].toLocaleString()} pts
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 font-mono font-bold text-xs sm:text-sm">
          <div className="flex items-center gap-1">
            <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>SCORE</span>
            <span className="text-amber-500 text-base">{score.toLocaleString()}</span>
          </div>

          <div className="hidden sm:flex items-center gap-1 text-slate-400">
            <span>HIGH</span>
            <span>{highScore.toLocaleString()}</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setGameState('levelselect')}
              className="p-2 rounded-xl hover:bg-slate-700/20 text-current transition cursor-pointer"
              title="ステージ選択"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => initLevel(currentLevel)}
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
          isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-300 bg-slate-100'
        } ${
          isFullscreen
            ? 'w-[min(98vw,calc((100vh-80px)*16/9))] aspect-[16/9] my-auto'
            : 'w-full max-w-4xl aspect-[16/9]'
        }`}
      >
        <canvas
          ref={canvasRef}
          width={V_WIDTH}
          height={V_HEIGHT}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="w-full h-full block cursor-crosshair touch-none select-none"
        />

        {/* 空中タップスキル発動ガイド */}
        {stateRef.current.isBirdLaunched && !stateRef.current.hasUsedSkill && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-black/60 backdrop-blur-xs text-white text-xs font-bold border border-white/20 animate-pulse pointer-events-none">
            画面タップで特殊スキル発動！
          </div>
        )}

        {/* ステージクリアオーバーレイ */}
        {gameState === 'cleared' && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-white space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2 text-amber-400">
              {[1, 2, 3].map((starIdx) => (
                <Star
                  key={starIdx}
                  className={`w-12 h-12 transition-all ${
                    starIdx <= earnedStars
                      ? 'fill-amber-400 text-amber-400 scale-110 drop-shadow-[0_0_12px_rgba(251,191,36,0.8)]'
                      : 'text-slate-600'
                  }`}
                />
              ))}
            </div>

            <div className="text-emerald-400 text-3xl sm:text-4xl font-black">STAGE CLEAR!</div>

            <div className="text-xs text-slate-300 font-mono space-y-1 text-center">
              <div>STAGE: <span className="font-bold text-white">{currentLevel} / {LEVELS.length}</span></div>
              <div>FINAL SCORE: <span className="font-bold text-amber-300 text-lg">{score.toLocaleString()}</span></div>
              <div className="text-slate-400">（残存バードボーナス: {stateRef.current.birdsQueue.length * 10000} pts 獲得！）</div>
            </div>

            <div className="flex gap-3 mt-2">
              <button
                onClick={() => initLevel(currentLevel)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl border border-slate-700 transition cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                もう一度
              </button>

              {currentLevel < LEVELS.length ? (
                <button
                  onClick={() => setCurrentLevel((prev) => prev + 1)}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg transition cursor-pointer flex items-center gap-1.5"
                >
                  <Play className="w-4 h-4 fill-white" />
                  次のステージへ進む
                </button>
              ) : (
                <button
                  onClick={() => setGameState('levelselect')}
                  className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl shadow-lg transition cursor-pointer flex items-center gap-1.5"
                >
                  <Trophy className="w-4 h-4" />
                  全ステージ制覇！一覧へ
                </button>
              )}
            </div>
          </div>
        )}

        {/* ゲームオーバー / 失敗オーバーレイ */}
        {gameState === 'failed' && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-white space-y-4 animate-in zoom-in-95 duration-200">
            <div className="text-rose-500 text-4xl font-black">STAGE FAILED</div>
            <p className="text-xs text-slate-300 font-mono text-center">
              すべてのバードを撃ち尽くしました！<br />
              ブタがまだ砦に残っています。
            </p>
            <div className="text-xs text-slate-300 font-mono">
              SCORE: <span className="font-bold text-white text-base">{score.toLocaleString()}</span>
            </div>
            <button
              onClick={() => initLevel(currentLevel)}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg transition flex items-center gap-2 cursor-pointer mt-2"
            >
              <RotateCcw className="w-4 h-4" />
              リトライする
            </button>
          </div>
        )}

        {/* ステージセレクトモーダル */}
        {gameState === 'levelselect' && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-white space-y-4 animate-in fade-in duration-150">
            <h3 className="text-2xl font-black flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              ステージ選択 (全8ステージ)
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg w-full">
              {LEVELS.map((lvl) => {
                const stars = levelStars[lvl.id] || 0;
                return (
                  <button
                    key={lvl.id}
                    onClick={() => {
                      setCurrentLevel(lvl.id);
                      setGameState('playing');
                    }}
                    className={`p-3 rounded-2xl border flex flex-col items-center justify-between gap-1 transition cursor-pointer ${
                      currentLevel === lvl.id
                        ? 'bg-indigo-600/40 border-indigo-400'
                        : 'bg-slate-900/80 hover:bg-slate-800 border-slate-700'
                    }`}
                  >
                    <span className="text-xs font-bold text-slate-300">STAGE {lvl.id}</span>
                    <span className="text-[11px] font-medium text-white truncate max-w-[90px]">
                      {lvl.name}
                    </span>
                    <div className="flex items-center gap-0.5 mt-1">
                      {[1, 2, 3].map((s) => (
                        <Star
                          key={s}
                          className={`w-3.5 h-3.5 ${
                            s <= stars ? 'fill-amber-400 text-amber-400' : 'text-slate-600'
                          }`}
                        />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setGameState('playing')}
              className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-700 transition cursor-pointer mt-2"
            >
              閉じる
            </button>
          </div>
        )}
      </div>

      {/* 下部操作説明カード */}
      <div
        className={`w-full flex flex-wrap items-center justify-between gap-3 mt-3 px-4 py-2.5 rounded-2xl border text-xs leading-relaxed ${
          isDark
            ? 'bg-slate-900/60 border-slate-800/80 text-slate-400'
            : 'bg-white border-slate-200 text-slate-600 shadow-xs'
        } ${isFullscreen ? 'max-w-none' : 'max-w-4xl'}`}
      >
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-bold">
            操作方法
          </span>
          <span>パチンコをドラッグして後ろへ引っ張り、指・マウスを離して発射！</span>
        </div>
        <div className="flex items-center gap-3 font-medium">
          <span className="flex items-center gap-1 text-red-400">● レッド: 気合い衝撃波</span>
          <span className="flex items-center gap-1 text-yellow-400">▲ チャック: 急加速</span>
          <span className="flex items-center gap-1 text-sky-400">● ブルー: 3分裂</span>
          <span className="flex items-center gap-1 text-slate-400">● ボム: 大爆破</span>
        </div>
      </div>
    </div>
  );
};
