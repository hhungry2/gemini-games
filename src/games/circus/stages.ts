import {
  CircusStageId,
  GameDifficulty,
  StageWorldState,
} from './types';

export const STAGE_CONFIGS: {
  id: CircusStageId;
  stageNumber: number;
  name: string;
  nameEn: string;
  totalMeters: number;
  worldWidth: number;
}[] = [
  {
    id: 'lion',
    stageNumber: 1,
    name: '火の輪くぐり (ライオン乗り)',
    nameEn: 'Fire Hoops & Lion',
    totalMeters: 100,
    worldWidth: 3800,
  },
  {
    id: 'tightrope',
    stageNumber: 2,
    name: '綱渡り (お猿さんジャンプ)',
    nameEn: 'Tightrope & Monkeys',
    totalMeters: 100,
    worldWidth: 3600,
  },
  {
    id: 'trampoline',
    stageNumber: 3,
    name: 'トランポリン (火吹き男回避)',
    nameEn: 'Trampoline Jump',
    totalMeters: 100,
    worldWidth: 3400,
  },
  {
    id: 'ball',
    stageNumber: 4,
    name: '玉乗り (ボール飛び移り)',
    nameEn: 'Rolling Circus Balls',
    totalMeters: 100,
    worldWidth: 3400,
  },
  {
    id: 'trapeze',
    stageNumber: 5,
    name: '空中ブランコ (フライングトラピーズ)',
    nameEn: 'Flying Trapeze',
    totalMeters: 100,
    worldWidth: 3400,
  },
];

export function createStageWorld(
  stageId: CircusStageId,
  difficulty: GameDifficulty,
  loopCount: number = 1
): StageWorldState {
  const config = STAGE_CONFIGS.find((c) => c.id === stageId) || STAGE_CONFIGS[0];
  const goalX = config.worldWidth - 250;
  const speedScale = (difficulty === 'easy' ? 0.85 : difficulty === 'hard' ? 1.25 : 1.0) * (1 + (loopCount - 1) * 0.1);

  const world: StageWorldState = {
    stageId,
    stageNumber: config.stageNumber,
    totalDistance: config.totalMeters,
    currentDistance: config.totalMeters,
    cameraX: 0,
    goalX,
    timeBonus: 5000 + (difficulty === 'hard' ? 1000 : 0),
    fireHoops: [],
    firePots: [],
    monkeys: [],
    trampolines: [],
    fireBreathers: [],
    knifeThrowers: [],
    balls: [],
    trapezes: [],
  };

  // --- STAGE 1: 火の輪 & 火壺 ---
  if (stageId === 'lion') {
    let currentX = 550;
    let hoopId = 1;
    let potId = 1;

    while (currentX < goalX - 250) {
      const isHoop = Math.random() < 0.65;
      if (isHoop) {
        const isSmall = Math.random() < 0.35;
        const hasCoin = Math.random() < 0.45;
        const hoopSpeed = (isSmall ? 1.4 : 1.0) * speedScale;

        world.fireHoops.push({
          id: hoopId++,
          x: currentX,
          y: isSmall ? 250 : 220,
          size: isSmall ? 'small' : 'large',
          speed: hoopSpeed,
          hasCoin,
          coinCollected: false,
          passed: false,
        });
        currentX += (isSmall ? 260 : 340) / (difficulty === 'hard' ? 1.2 : 1.0);
      } else {
        world.firePots.push({
          id: potId++,
          x: currentX,
          y: 335,
          width: 32,
          height: 38,
          passed: false,
        });
        currentX += 320 / (difficulty === 'hard' ? 1.2 : 1.0);
      }
    }
  }

  // --- STAGE 2: 綱渡り & お猿 ---
  if (stageId === 'tightrope') {
    let currentX = 600;
    let monkeyId = 1;

    while (currentX < goalX - 300) {
      const rand = Math.random();
      let type: 'brown' | 'blue' | 'stacked' = 'brown';
      let vx = -1.2 * speedScale;

      if (difficulty !== 'easy' && rand < 0.25) {
        type = 'blue'; // ジャンプして飛び越えてくる
        vx = -1.6 * speedScale;
      } else if (rand < 0.45) {
        type = 'stacked'; // 2段重ね
        vx = -1.0 * speedScale;
      }

      world.monkeys.push({
        id: monkeyId++,
        x: currentX,
        y: 280, // 綱の上
        vx,
        type,
        isJumping: false,
        jumpVy: 0,
        passed: false,
        animFrame: 0,
      });

      currentX += (type === 'stacked' ? 380 : 290) / (difficulty === 'hard' ? 1.2 : 1.0);
    }
  }

  // --- STAGE 3: トランポリン & 火吹き男 ---
  if (stageId === 'trampoline') {
    const trampWidth = 140;
    const gap = 160;
    let currentX = 280;
    let trampId = 1;
    let fbId = 1;

    while (currentX < goalX - 250) {
      world.trampolines.push({
        id: trampId++,
        x: currentX,
        width: trampWidth,
      });

      // トランポリンとトランポリンの間の空中に火吹き男や障害物
      if (trampId % 2 === 0) {
        world.fireBreathers.push({
          id: fbId++,
          x: currentX + trampWidth + gap / 2,
          y: 190,
          flameCycle: Math.random(),
          isBlowing: false,
        });
      }

      currentX += trampWidth + gap;
    }
  }

  // --- STAGE 4: 玉乗り ---
  if (stageId === 'ball') {
    // プレイヤー初期ボール (index 0)
    world.balls.push({
      id: 1,
      x: 180,
      y: 330,
      radius: 36,
      vx: 0,
      rotation: 0,
      color: '#f59e0b',
    });

    let currentX = 460;
    let ballId = 2;
    const ballColors = ['#ef4444', '#3b82f6', '#10b981', '#ec4899', '#8b5cf6'];

    while (currentX < goalX - 200) {
      const vx = -0.9 * speedScale;
      world.balls.push({
        id: ballId++,
        x: currentX,
        y: 330,
        radius: 36,
        vx,
        rotation: 0,
        color: ballColors[(ballId - 2) % ballColors.length],
      });

      currentX += 270 / (difficulty === 'hard' ? 1.15 : 1.0);
    }
  }

  // --- STAGE 5: 空中ブランコ ---
  if (stageId === 'trapeze') {
    let currentX = 280;
    let trapezeId = 1;
    const ropeLength = 170;

    while (currentX < goalX - 250) {
      // 振り子の周期や位相を少しずらす
      const period = 2.4 - (difficulty === 'hard' ? 0.3 : 0);
      const maxAngle = (Math.PI / 3.4); // 約 53度

      world.trapezes.push({
        id: trapezeId++,
        pivotX: currentX,
        pivotY: 70,
        ropeLength,
        angle: (trapezeId % 2 === 0 ? 1 : -1) * (maxAngle * 0.7),
        angularVel: 0,
        angularAccel: 0,
        maxAngle,
        period,
      });

      currentX += 340;
    }
  }

  return world;
}
