// Super Mario Kart GP - Tracks and Characters Data

import { CharacterStats, CharacterId, TrackData, CourseId, SurfaceType } from './types';

// 8 Racers with distinct attributes
export const CHARACTERS: Record<CharacterId, CharacterStats> = {
  mario: {
    id: 'mario',
    name: 'マリオ',
    nameEn: 'Mario',
    title: 'オールラウンダー',
    speed: 3.5,
    accel: 3.5,
    weight: 3.5,
    handling: 3.5,
    kartColor: '#e11d48', // Red
    accentColor: '#3b82f6', // Blue
    capColor: '#e11d48',
    skinColor: '#fbcfe8',
    description: '加速・最高速・旋回のバランスが抜群で初心者から上級者まで扱いやすい王道レーサー。',
  },
  luigi: {
    id: 'luigi',
    name: 'ルイージ',
    nameEn: 'Luigi',
    title: 'グリップマスター',
    speed: 3.5,
    accel: 3.5,
    weight: 3.5,
    handling: 4.0,
    kartColor: '#16a34a', // Green
    accentColor: '#3b82f6',
    capColor: '#16a34a',
    skinColor: '#fbcfe8',
    description: 'マリオと同等の安定性を持ちつつ、路面への食いつきとコーナリングに優れた万能型。',
  },
  peach: {
    id: 'peach',
    name: 'ピーチ',
    nameEn: 'Peach',
    title: 'ハイアクセラレーション',
    speed: 3.0,
    accel: 4.8,
    weight: 2.0,
    handling: 4.5,
    kartColor: '#ec4899', // Pink
    accentColor: '#fbbf24', // Gold
    capColor: '#fbbf24',
    skinColor: '#ffe4e6',
    description: '圧倒的なロケットスタートと被弾からの超高速復帰が強み。小回りドリフトも得意。',
  },
  yoshi: {
    id: 'yoshi',
    name: 'ヨッシー',
    nameEn: 'Yoshi',
    title: 'ドリフトスター',
    speed: 3.3,
    accel: 4.5,
    weight: 2.2,
    handling: 4.8,
    kartColor: '#22c55e', // Light Green
    accentColor: '#ef4444', // Red shell
    capColor: '#22c55e',
    skinColor: '#fef08a',
    description: '急カーブも難なく切り抜ける俊敏なハンドリング！ドリフトチャージが素早く溜まる。',
  },
  toad: {
    id: 'toad',
    name: 'キノピオ',
    nameEn: 'Toad',
    title: 'ロケットダッシャー',
    speed: 2.8,
    accel: 5.0,
    weight: 1.5,
    handling: 5.0,
    kartColor: '#3b82f6', // Blue vest
    accentColor: '#ef4444', // Red dots
    capColor: '#ffffff',
    skinColor: '#fed7aa',
    description: '全レーサー随一のトップ加速力を誇る軽量級！軽量のため重量級との体当たりには注意。',
  },
  koopa: {
    id: 'koopa',
    name: 'ノコノコ',
    nameEn: 'Koopa Troopa',
    title: 'コーナースペシャリスト',
    speed: 3.2,
    accel: 4.6,
    weight: 2.0,
    handling: 4.7,
    kartColor: '#eab308', // Yellow
    accentColor: '#15803d', // Green shell
    capColor: '#eab308',
    skinColor: '#fef08a',
    description: 'オフロードでも失速しにくく、悪路やヘアピンカーブでも滑らかなライン取りが可能。',
  },
  bowser: {
    id: 'bowser',
    name: 'クッパ',
    nameEn: 'Bowser',
    title: 'スピードキング (重量級)',
    speed: 5.0,
    accel: 2.0,
    weight: 5.0,
    handling: 2.0,
    kartColor: '#15803d', // Green shell
    accentColor: '#dc2626', // Red hair
    capColor: '#ea580c',
    skinColor: '#fde047',
    description: '直線での最高速度は圧倒的No.1！巨体による体当たりで他車を弾き飛ばす大魔王。',
  },
  dk_jr: {
    id: 'dk_jr',
    name: 'ドンキーJr.',
    nameEn: 'DK Jr.',
    title: 'パワフルビースト (重量級)',
    speed: 4.8,
    accel: 2.2,
    weight: 4.8,
    handling: 2.3,
    kartColor: '#92400e', // Brown
    accentColor: '#ffffff',
    capColor: '#92400e',
    skinColor: '#fed7aa',
    description: '豪快な最高速度と重厚なボディ！一度トップスピードに乗ればライバルを寄せ付けない。',
  },
};

export const CHARACTER_LIST: CharacterStats[] = Object.values(CHARACTERS);

// Track Definitions
export interface TrackGenConfig {
  id: CourseId;
  name: string;
  nameEn: string;
  description: string;
  laps: number;
  skyTopColor: string;
  skyBottomColor: string;
  horizonColor: string;
  theme: 'circuit' | 'plains' | 'choco' | 'castle' | 'rainbow';
  roadColor: string;
  roadEdgeColor: string;
  offroadColor: string;
  offroadAltColor: string;
  innerWallColor?: string;
  outerWallColor?: string;
  hasBridges?: boolean;
}

export const TRACK_CONFIGS: Record<CourseId, TrackGenConfig> = {
  mario_circuit: {
    id: 'mario_circuit',
    name: 'マリオサーキット 1',
    nameEn: 'Mario Circuit 1',
    description: '青空の下に広がるアスファルトと芝生。オイルやダッシュ板が配置された伝統のサーキット！',
    laps: 3,
    skyTopColor: '#38bdf8',
    skyBottomColor: '#bae6fd',
    horizonColor: '#15803d',
    theme: 'circuit',
    roadColor: '#64748b',
    roadEdgeColor: '#ef4444',
    offroadColor: '#22c55e',
    offroadAltColor: '#16a34a',
  },
  donut_plains: {
    id: 'donut_plains',
    name: 'ドーナツへいや 1',
    nameEn: 'Donut Plains 1',
    description: '湖のまわりを駆け抜ける草原コース！水たまりや深いダートの減速に気をつけろ！',
    laps: 3,
    skyTopColor: '#60a5fa',
    skyBottomColor: '#bfdbfe',
    horizonColor: '#166534',
    theme: 'plains',
    roadColor: '#d97706',
    roadEdgeColor: '#b45309',
    offroadColor: '#15803d',
    offroadAltColor: '#14532d',
    hasBridges: true,
  },
  choco_island: {
    id: 'choco_island',
    name: 'チョコレーとう 1',
    nameEn: 'Choco Island 1',
    description: '茶色い大地と泥沼の難関コース！タイヤが空転しやすく大ジャンプ台からの飛翔が鍵！',
    laps: 3,
    skyTopColor: '#fb923c',
    skyBottomColor: '#fed7aa',
    horizonColor: '#78350f',
    theme: 'choco',
    roadColor: '#92400e',
    roadEdgeColor: '#78350f',
    offroadColor: '#b45309',
    offroadAltColor: '#9a3412',
  },
  bowser_castle: {
    id: 'bowser_castle',
    name: 'クッパキャッスル 1',
    nameEn: 'Bowser Castle 1',
    description: '溶岩の海に浮かぶ石畳の要塞！直角コーナーが連続し、コース外に落ちると溶岩にドボン！',
    laps: 3,
    skyTopColor: '#7f1d1d',
    skyBottomColor: '#b91c1c',
    horizonColor: '#450a0a',
    theme: 'castle',
    roadColor: '#334155',
    roadEdgeColor: '#ef4444',
    offroadColor: '#ea580c', // Lava!
    offroadAltColor: '#c2410c',
  },
  rainbow_road: {
    id: 'rainbow_road',
    name: 'レインボーロード',
    nameEn: 'Rainbow Road',
    description: '星空の宇宙空間に浮かぶ虹色タイルの究極コース！柵が一切なく一瞬のミスが即落下！',
    laps: 3,
    skyTopColor: '#0f172a',
    skyBottomColor: '#1e1b4b',
    horizonColor: '#312e81',
    theme: 'rainbow',
    roadColor: '#ec4899',
    roadEdgeColor: '#fbbf24',
    offroadColor: '#020617', // Void!
    offroadAltColor: '#020617',
  },
};

export const TRACK_LIST = Object.values(TRACK_CONFIGS);

// Waypoint & Checkpoint coordinates for 1024x1024 World
export function createTrackInstance(courseId: CourseId): TrackData {
  const config = TRACK_CONFIGS[courseId];
  const size = 1024;

  let waypoints: { x: number; y: number }[] = [];
  let boostPads: { x: number; y: number }[] = [];
  let oilSlicks: { x: number; y: number }[] = [];
  let jumpPads: { x: number; y: number }[] = [];
  let itemBoxCoords: { x: number; y: number }[] = [];
  let coinCoords: { x: number; y: number }[] = [];
  let walls: [number, number, number, number][] = [];

  if (courseId === 'mario_circuit') {
    // Mario Circuit 1 loop
    waypoints = [
      { x: 512, y: 880 }, // Finish line
      { x: 780, y: 880 }, // Straight 1
      { x: 900, y: 800 }, // Turn 1
      { x: 920, y: 550 }, // East straight
      { x: 860, y: 350 }, // Turn 2
      { x: 700, y: 220 }, // Chicane entry
      { x: 512, y: 260 }, // Chicane mid
      { x: 340, y: 180 }, // Turn 3
      { x: 180, y: 280 }, // West hair-pin entry
      { x: 140, y: 480 }, // West hair-pin apex
      { x: 200, y: 680 }, // Turn 4
      { x: 360, y: 760 }, // S-curve
      { x: 300, y: 880 }, // Final straight
    ];

    boostPads = [
      { x: 800, y: 880 },
      { x: 920, y: 450 },
    ];
    oilSlicks = [
      { x: 890, y: 720 },
      { x: 380, y: 220 },
      { x: 150, y: 560 },
    ];
    jumpPads = [
      { x: 620, y: 235 },
    ];
    itemBoxCoords = [
      { x: 740, y: 880 },
      { x: 750, y: 880 },
      { x: 915, y: 500 },
      { x: 420, y: 220 },
      { x: 160, y: 600 },
      { x: 340, y: 820 },
    ];
    coinCoords = [
      { x: 600, y: 880 },
      { x: 640, y: 880 },
      { x: 680, y: 880 },
      { x: 920, y: 620 },
      { x: 920, y: 580 },
      { x: 820, y: 280 },
      { x: 780, y: 250 },
      { x: 180, y: 380 },
      { x: 150, y: 440 },
      { x: 260, y: 720 },
    ];
  } else if (courseId === 'donut_plains') {
    // Donut Plains (Water hazards, wider grass)
    waypoints = [
      { x: 512, y: 850 },
      { x: 750, y: 850 },
      { x: 880, y: 720 },
      { x: 860, y: 450 },
      { x: 780, y: 280 },
      { x: 540, y: 200 },
      { x: 320, y: 220 },
      { x: 180, y: 380 },
      { x: 160, y: 620 },
      { x: 250, y: 780 },
      { x: 380, y: 850 },
    ];
    boostPads = [
      { x: 700, y: 850 },
      { x: 600, y: 205 },
    ];
    jumpPads = [
      { x: 870, y: 580 },
      { x: 200, y: 500 },
    ];
    oilSlicks = [
      { x: 820, y: 350 },
      { x: 200, y: 700 },
    ];
    itemBoxCoords = [
      { x: 680, y: 850 },
      { x: 865, y: 420 },
      { x: 440, y: 205 },
      { x: 180, y: 520 },
    ];
    coinCoords = [
      { x: 580, y: 850 },
      { x: 620, y: 850 },
      { x: 830, y: 650 },
      { x: 500, y: 200 },
      { x: 220, y: 420 },
      { x: 300, y: 810 },
    ];
  } else if (courseId === 'choco_island') {
    // Choco Island (Winding bumps, big jumps)
    waypoints = [
      { x: 512, y: 860 },
      { x: 780, y: 840 },
      { x: 880, y: 680 },
      { x: 760, y: 540 },
      { x: 860, y: 380 },
      { x: 750, y: 200 },
      { x: 480, y: 240 },
      { x: 320, y: 160 },
      { x: 160, y: 320 },
      { x: 260, y: 480 },
      { x: 150, y: 660 },
      { x: 320, y: 820 },
    ];
    boostPads = [
      { x: 650, y: 850 },
      { x: 800, y: 300 },
    ];
    jumpPads = [
      { x: 820, y: 600 },
      { x: 620, y: 215 },
      { x: 200, y: 580 },
    ];
    oilSlicks = [
      { x: 820, y: 460 },
      { x: 380, y: 200 },
      { x: 200, y: 720 },
    ];
    itemBoxCoords = [
      { x: 720, y: 850 },
      { x: 790, y: 460 },
      { x: 400, y: 210 },
      { x: 190, y: 420 },
      { x: 220, y: 740 },
    ];
    coinCoords = [
      { x: 580, y: 855 },
      { x: 620, y: 855 },
      { x: 870, y: 720 },
      { x: 720, y: 220 },
      { x: 170, y: 350 },
    ];
  } else if (courseId === 'bowser_castle') {
    // Bowser Castle (Sharp 90-deg turns, deadly lava)
    waypoints = [
      { x: 512, y: 880 },
      { x: 840, y: 880 }, // East Turn
      { x: 840, y: 580 },
      { x: 660, y: 580 },
      { x: 660, y: 360 },
      { x: 840, y: 360 },
      { x: 840, y: 160 },
      { x: 300, y: 160 },
      { x: 300, y: 420 },
      { x: 460, y: 420 },
      { x: 460, y: 650 },
      { x: 200, y: 650 },
      { x: 200, y: 880 },
      { x: 400, y: 880 },
    ];
    boostPads = [
      { x: 720, y: 880 },
      { x: 840, y: 480 },
      { x: 540, y: 160 },
      { x: 460, y: 540 },
    ];
    jumpPads = [
      { x: 750, y: 580 },
      { x: 720, y: 160 },
      { x: 340, y: 650 },
    ];
    oilSlicks = [
      { x: 840, y: 740 },
      { x: 400, y: 160 },
      { x: 200, y: 780 },
    ];
    itemBoxCoords = [
      { x: 650, y: 880 },
      { x: 760, y: 360 },
      { x: 620, y: 160 },
      { x: 300, y: 300 },
      { x: 340, y: 880 },
    ];
    coinCoords = [
      { x: 580, y: 880 },
      { x: 610, y: 880 },
      { x: 840, y: 680 },
      { x: 720, y: 360 },
      { x: 480, y: 160 },
      { x: 440, y: 160 },
      { x: 200, y: 720 },
    ];
  } else {
    // Rainbow Road (Space, wavy turns, no walls)
    waypoints = [
      { x: 512, y: 880 },
      { x: 820, y: 880 },
      { x: 910, y: 720 },
      { x: 840, y: 520 },
      { x: 920, y: 340 },
      { x: 760, y: 160 },
      { x: 480, y: 180 },
      { x: 320, y: 140 },
      { x: 150, y: 280 },
      { x: 240, y: 460 },
      { x: 120, y: 650 },
      { x: 220, y: 820 },
      { x: 380, y: 880 },
    ];
    boostPads = [
      { x: 700, y: 880 },
      { x: 880, y: 620 },
      { x: 840, y: 250 },
      { x: 200, y: 370 },
    ];
    jumpPads = [
      { x: 870, y: 430 },
      { x: 620, y: 170 },
      { x: 180, y: 740 },
    ];
    oilSlicks = [];
    itemBoxCoords = [
      { x: 640, y: 880 },
      { x: 880, y: 570 },
      { x: 620, y: 170 },
      { x: 200, y: 370 },
      { x: 170, y: 740 },
    ];
    coinCoords = [
      { x: 570, y: 880 },
      { x: 600, y: 880 },
      { x: 880, y: 790 },
      { x: 870, y: 300 },
      { x: 400, y: 160 },
      { x: 150, y: 480 },
      { x: 300, y: 860 },
    ];
  }

  // Start line and grid
  const startAngle = 0; // facing East / right
  const startPos = { x: 512, y: waypoints[0].y, angle: startAngle };

  const gridPositions: { x: number; y: number; angle: number }[] = [];
  // 8 positions in staggered grid behind finish line
  for (let i = 0; i < 8; i++) {
    const row = Math.floor(i / 2);
    const col = i % 2;
    const gx = startPos.x - 40 - row * 38;
    const gy = startPos.y - 18 + col * 36;
    gridPositions.push({ x: gx, y: gy, angle: startAngle });
  }

  // Checkpoints around waypoints
  const checkpoints = waypoints.map((wp) => ({
    x: wp.x,
    y: wp.y,
    radius: 75,
  }));

  // Item boxes
  const itemBoxes = itemBoxCoords.map((coord, idx) => ({
    id: idx + 1,
    x: coord.x,
    y: coord.y,
    active: true,
    respawnTimer: 0,
    angle: 0,
  }));

  // Coins
  const coins = coinCoords.map((coord, idx) => ({
    id: idx + 1,
    x: coord.x,
    y: coord.y,
    collected: false,
    respawnTimer: 0,
    angle: 0,
  }));

  // Generate track visual canvas and surface collision map
  const { textureCanvas, minimapCanvas } = generateTrackTextures(
    config,
    size,
    waypoints,
    boostPads,
    oilSlicks,
    jumpPads
  );

  return {
    id: courseId,
    name: config.name,
    nameEn: config.nameEn,
    description: config.description,
    laps: config.laps,
    skyTopColor: config.skyTopColor,
    skyBottomColor: config.skyBottomColor,
    horizonColor: config.horizonColor,
    theme: config.theme,
    worldSize: size,
    startPos,
    gridPositions,
    waypoints,
    boostPads,
    oilSlicks,
    jumpPads,
    itemBoxes,
    coins,
    checkpoints,
    walls,
    textureCanvas,
    minimapCanvas,
  };
}

// Generate the 1024x1024 course texture canvas
function generateTrackTextures(
  config: TrackGenConfig,
  size: number,
  waypoints: { x: number; y: number }[],
  boostPads: { x: number; y: number }[],
  oilSlicks: { x: number; y: number }[],
  jumpPads: { x: number; y: number }[]
): { textureCanvas: HTMLCanvasElement; minimapCanvas: HTMLCanvasElement } {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas 2D context not available');

  // 1. Fill offroad background (Grass, Dirt, Lava, or Void Space)
  if (config.theme === 'rainbow') {
    // Deep starry cosmos background
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, size, size);

    // Stars
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 300; i++) {
      const sx = Math.sin(i * 997) * 500 + 512;
      const sy = Math.cos(i * 613) * 500 + 512;
      const sr = (i % 3 === 0) ? 1.5 : 1;
      ctx.fillRect(sx, sy, sr, sr);
    }
  } else if (config.theme === 'castle') {
    // Bubbling molten lava background
    ctx.fillStyle = '#991b1b';
    ctx.fillRect(0, 0, size, size);

    // Lava waves / ripples
    ctx.fillStyle = '#ea580c';
    for (let y = 0; y < size; y += 32) {
      for (let x = 0; x < size; x += 32) {
        if ((x / 32 + y / 32) % 2 === 0) {
          ctx.beginPath();
          ctx.arc(x + 16, y + 16, 12, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  } else {
    // Checkered grass or dirt
    const tileSize = 64;
    for (let y = 0; y < size; y += tileSize) {
      for (let x = 0; x < size; x += tileSize) {
        const isAlt = (Math.floor(x / tileSize) + Math.floor(y / tileSize)) % 2 === 0;
        ctx.fillStyle = isAlt ? config.offroadColor : config.offroadAltColor;
        ctx.fillRect(x, y, tileSize, tileSize);
      }
    }
  }

  // 2. Draw Track Ribbon
  // Track road width
  const roadWidth = config.theme === 'castle' ? 84 : 96;

  // Red/white kerbs border
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Outer border (Kerbs)
  ctx.lineWidth = roadWidth + 24;
  ctx.strokeStyle = config.roadEdgeColor;
  ctx.beginPath();
  ctx.moveTo(waypoints[0].x, waypoints[0].y);
  for (let i = 1; i < waypoints.length; i++) {
    ctx.lineTo(waypoints[i].x, waypoints[i].y);
  }
  ctx.closePath();
  ctx.stroke();

  // White alternate dash on kerbs
  ctx.lineWidth = roadWidth + 24;
  ctx.setLineDash([24, 24]);
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
  ctx.setLineDash([]); // reset

  // Main asphalt / road surface
  ctx.lineWidth = roadWidth;
  if (config.theme === 'rainbow') {
    // Rainbow Road gradient
    const grad = ctx.createLinearGradient(100, 100, 900, 900);
    grad.addColorStop(0, '#f43f5e'); // Rose
    grad.addColorStop(0.2, '#f97316'); // Orange
    grad.addColorStop(0.4, '#eab308'); // Yellow
    grad.addColorStop(0.6, '#22c55e'); // Green
    grad.addColorStop(0.8, '#06b6d4'); // Cyan
    grad.addColorStop(1, '#a855f7'); // Purple
    ctx.strokeStyle = grad;
  } else {
    ctx.strokeStyle = config.roadColor;
  }
  ctx.stroke();

  // Subtle road texture (Tile lines or asphalt noise)
  if (config.theme === 'circuit') {
    // Center dashed white line
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.setLineDash([20, 20]);
    ctx.stroke();
    ctx.setLineDash([]);
  } else if (config.theme === 'castle') {
    // Stone paving slabs
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.4)';
    ctx.setLineDash([12, 16]);
    ctx.stroke();
    ctx.setLineDash([]);
  } else if (config.theme === 'rainbow') {
    // Sparkling grid lines
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.setLineDash([16, 16]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // 3. Draw Finish Line (Black & White Checkerboard)
  const finishX = 512;
  const finishY = waypoints[0].y;
  const fw = 32;
  const fh = roadWidth;
  const checkSize = 8;
  for (let cy = -fh / 2; cy < fh / 2; cy += checkSize) {
    for (let cx = -fw / 2; cx < fw / 2; cx += checkSize) {
      const isWhite = (Math.floor(cx / checkSize) + Math.floor(cy / checkSize)) % 2 === 0;
      ctx.fillStyle = isWhite ? '#ffffff' : '#000000';
      ctx.fillRect(finishX + cx, finishY + cy, checkSize, checkSize);
    }
  }

  // 4. Boost Pads (Glowing Orange/Yellow arrows)
  for (const bp of boostPads) {
    ctx.save();
    ctx.translate(bp.x, bp.y);
    ctx.fillStyle = '#f97316';
    ctx.fillRect(-22, -18, 44, 36);

    ctx.fillStyle = '#facc15';
    // Forward pointing arrow
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(-8, -12);
    ctx.lineTo(-4, 0);
    ctx.lineTo(-8, 12);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-18, -12);
    ctx.lineTo(-14, 0);
    ctx.lineTo(-18, 12);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // 5. Jump Pads (Yellow ramp with stripes)
  for (const jp of jumpPads) {
    ctx.save();
    ctx.translate(jp.x, jp.y);
    ctx.fillStyle = '#eab308';
    ctx.fillRect(-24, -20, 48, 40);

    ctx.fillStyle = '#ca8a04';
    ctx.fillRect(-24, -20, 48, 8);

    ctx.fillStyle = '#ef4444';
    for (let x = -20; x < 20; x += 12) {
      ctx.fillRect(x, -8, 6, 24);
    }
    ctx.restore();
  }

  // 6. Oil Slicks (Slick dark puddle)
  for (const oil of oilSlicks) {
    ctx.save();
    ctx.translate(oil.x, oil.y);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 24, 16, 0.3, 0, Math.PI * 2);
    ctx.fill();
    // Shiny glare
    ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.beginPath();
    ctx.ellipse(-6, -4, 8, 4, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Generate MiniMap Canvas (256x256 preview for HUD radar)
  const minimapCanvas = document.createElement('canvas');
  minimapCanvas.width = 180;
  minimapCanvas.height = 180;
  const mCtx = minimapCanvas.getContext('2d');
  if (mCtx) {
    mCtx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    mCtx.beginPath();
    mCtx.roundRect(0, 0, 180, 180, 16);
    mCtx.fill();

    mCtx.lineWidth = 14;
    mCtx.lineCap = 'round';
    mCtx.lineJoin = 'round';
    mCtx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    const scale = 150 / size;
    const offset = 15;

    mCtx.beginPath();
    mCtx.moveTo(waypoints[0].x * scale + offset, waypoints[0].y * scale + offset);
    for (let i = 1; i < waypoints.length; i++) {
      mCtx.lineTo(waypoints[i].x * scale + offset, waypoints[i].y * scale + offset);
    }
    mCtx.closePath();
    mCtx.stroke();

    mCtx.lineWidth = 10;
    mCtx.strokeStyle = config.theme === 'rainbow' ? '#ec4899' : '#38bdf8';
    mCtx.stroke();

    // Finish line mark on minimap
    mCtx.fillStyle = '#ffffff';
    mCtx.fillRect(
      waypoints[0].x * scale + offset - 4,
      waypoints[0].y * scale + offset - 6,
      8,
      12
    );
  }

  return { textureCanvas: canvas, minimapCanvas };
}

// Surface detection at world (x, y)
export function getSurfaceAt(
  track: TrackData,
  x: number,
  y: number
): SurfaceType {
  // Check bounds
  if (x < 0 || x >= track.worldSize || y < 0 || y >= track.worldSize) {
    return track.theme === 'rainbow' ? 'void' : 'wall';
  }

  // If Rainbow Road, falling off the track is void death
  // Check distance to track centerline (waypoints spline approximation)
  let minDistSq = Infinity;
  const numWp = track.waypoints.length;
  for (let i = 0; i < numWp; i++) {
    const p1 = track.waypoints[i];
    const p2 = track.waypoints[(i + 1) % numWp];
    const dSq = distToSegmentSq(x, y, p1.x, p1.y, p2.x, p2.y);
    if (dSq < minDistSq) {
      minDistSq = dSq;
    }
  }

  const dist = Math.sqrt(minDistSq);
  const roadRadius = track.theme === 'castle' ? 44 : 50;
  const edgeRadius = roadRadius + 14;

  if (dist > edgeRadius) {
    if (track.theme === 'rainbow') return 'void';
    if (track.theme === 'castle') return 'offroad'; // Lava!
    return 'offroad'; // Grass/Dirt
  }

  // Check boost pads
  if (track.boostPads) {
    for (const bp of track.boostPads) {
      if (Math.hypot(x - bp.x, y - bp.y) < 26) return 'boost';
    }
  }

  // Check jump pads
  if (track.jumpPads) {
    for (const jp of track.jumpPads) {
      if (Math.hypot(x - jp.x, y - jp.y) < 26) return 'jump';
    }
  }

  // Check oil slicks
  if (track.oilSlicks) {
    for (const oil of track.oilSlicks) {
      if (Math.hypot(x - oil.x, y - oil.y) < 22) return 'oil';
    }
  }

  // Check finish line area
  const fX = track.startPos.x;
  const fY = track.startPos.y;
  if (Math.abs(x - fX) < 18 && Math.abs(y - fY) < roadRadius) {
    return 'finish';
  }

  return 'road';
}

function distToSegmentSq(
  px: number,
  py: number,
  vx: number,
  vy: number,
  wx: number,
  wy: number
): number {
  const l2 = (wx - vx) * (wx - vx) + (wy - vy) * (wy - vy);
  if (l2 === 0) return (px - vx) * (px - vx) + (py - vy) * (py - vy);
  let t = ((px - vx) * (wx - vx) + (py - vy) * (wy - vy)) / l2;
  t = Math.max(0, Math.min(1, t));
  const projX = vx + t * (wx - vx);
  const projY = vy + t * (wy - vy);
  return (px - projX) * (px - projX) + (py - projY) * (py - projY);
}
