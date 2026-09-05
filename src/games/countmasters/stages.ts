// Count Masters ステージ設計 & エンドレス生成

import { StageData, Gate, Obstacle, EnemyMob, Boss, Coin, StairStep } from './types';

// 道幅を広げてゆったりと群衆が走れる美しい比率に設定 (左右 -110 ~ +110)
export const ROAD_WIDTH = 220;

// 階段タワーのステップ定義 (ボス撃破後のボーナス階段)
export const createStairSteps = (bossZ: number): StairStep[] => {
  const steps: StairStep[] = [];
  const baseMultipliers = [1.2, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 5.0, 6.0, 8.0, 10.0, 15.0, 20.0, 30.0, 50.0];
  const stepColors = [
    '#3b82f6', '#06b6d4', '#10b981', '#84cc16',
    '#eab308', '#f97316', '#ef4444', '#ec4899',
    '#a855f7', '#6366f1', '#4f46e5', '#4338ca',
    '#3730a3', '#1e1b4b', '#f59e0b',
  ];

  let currentZ = bossZ + 250;
  let currentY = 0;

  for (let i = 0; i < baseMultipliers.length; i++) {
    steps.push({
      stepIndex: i,
      z: currentZ,
      y: currentY,
      multiplier: baseMultipliers[i],
      requiredStickmen: (i + 1) * 6,
      color: stepColors[i % stepColors.length],
    });
    currentZ += 90;
    currentY += 16;
  }
  return steps;
};

// コイン列のヘルパー
const createCoinLine = (startZ: number, count: number, x: number, spacing: number = 35): Coin[] => {
  const coins: Coin[] = [];
  for (let i = 0; i < count; i++) {
    coins.push({
      id: Math.random(),
      x,
      y: 6,
      z: startZ + i * spacing,
      collected: false,
      rot: 0,
    });
  }
  return coins;
};

// 敵小隊のヘルパー
const createMob = (id: number, z: number, x: number, count: number, color: string = '#ef4444'): EnemyMob => {
  const stickmen = [];
  const spacing = 10;
  const cols = Math.ceil(Math.sqrt(count));
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const ox = (col - (cols - 1) / 2) * spacing;
    const oz = (row - (cols - 1) / 2) * spacing;
    stickmen.push({ offsetX: ox, offsetZ: oz, isAlive: true });
  }
  return {
    id,
    z,
    x,
    initialCount: count,
    currentCount: count,
    color,
    stickmen,
  };
};

export const getStageData = (stageNum: number): StageData => {
  switch (stageNum) {
    case 1: {
      // ステージ1: ビギナー・ハイウェイ
      const length = 3200;
      const gates: Gate[] = [
        {
          id: 1,
          z: 450,
          width: ROAD_WIDTH,
          leftOption: { op: '+', val: 15, label: '+15', passed: false },
          rightOption: { op: '×', val: 2, label: '×2', passed: false },
        },
        {
          id: 2,
          z: 950,
          width: ROAD_WIDTH,
          leftOption: { op: '+', val: 30, label: '+30', passed: false },
          rightOption: { op: '-', val: 10, label: '-10', passed: false },
        },
        {
          id: 3,
          z: 1450,
          width: ROAD_WIDTH,
          leftOption: { op: '÷', val: 2, label: '÷2', passed: false },
          rightOption: { op: '×', val: 3, label: '×3', passed: false },
        },
        {
          id: 4,
          z: 1950,
          width: ROAD_WIDTH,
          leftOption: { op: '+', val: 50, label: '+50', passed: false },
          rightOption: { op: '+', val: 20, label: '+20', passed: false },
        },
        {
          id: 5,
          z: 2450,
          width: ROAD_WIDTH,
          leftOption: { op: '×', val: 2, label: '×2', passed: false },
          rightOption: { op: '+', val: 40, label: '+40', passed: false },
        },
      ];

      const obstacles: Obstacle[] = [
        {
          id: 1,
          type: 'saw',
          x: 0,
          z: 700,
          width: 30,
          length: 30,
          radius: 18,
          phase: 0,
          speed: 2.0,
          active: true,
        },
        {
          id: 2,
          type: 'spikes',
          x: -45,
          z: 1200,
          width: 50,
          length: 60,
          radius: 20,
          phase: 0,
          speed: 1.5,
          active: true,
        },
        {
          id: 3,
          type: 'saw',
          x: 45,
          z: 1700,
          width: 30,
          length: 30,
          radius: 18,
          phase: Math.PI,
          speed: 2.2,
          active: true,
        },
        {
          id: 4,
          type: 'pendulum',
          x: 0,
          z: 2200,
          width: 40,
          length: 30,
          radius: 20,
          phase: 0,
          speed: 1.8,
          active: true,
        },
      ];

      const mobs: EnemyMob[] = [
        createMob(1, 1200, 45, 16),
        createMob(2, 2200, -45, 24),
      ];

      const coins: Coin[] = [
        ...createCoinLine(250, 6, 0),
        ...createCoinLine(750, 7, -45),
        ...createCoinLine(1250, 7, 45),
        ...createCoinLine(1750, 7, 0),
        ...createCoinLine(2250, 7, 45),
      ];

      const boss: Boss = {
        z: 2850,
        name: 'レッド・ゴーレム',
        maxHp: 80,
        hp: 80,
        scale: 2.4,
        color: '#dc2626',
        state: 'idle',
        defeatTimer: 0,
        animTimer: 0,
      };

      return {
        id: 1,
        name: 'Stage 1: ビギナー・ハイウェイ',
        courseLength: length,
        theme: 'city',
        gates,
        obstacles,
        mobs,
        boss,
        coins,
      };
    }

    case 2: {
      // ステージ2: トラップ・ファクトリー
      const length = 4000;
      const gates: Gate[] = [
        {
          id: 1,
          z: 450,
          width: ROAD_WIDTH,
          leftOption: { op: '×', val: 2, label: '×2', passed: false },
          rightOption: { op: '+', val: 25, label: '+25', passed: false },
          isMoving: true,
          moveSpeed: 1.8,
          moveRange: 35,
          offsetX: 0,
        },
        {
          id: 2,
          z: 980,
          width: ROAD_WIDTH,
          leftOption: { op: '+', val: 40, label: '+40', passed: false },
          rightOption: { op: '-', val: 15, label: '-15', passed: false },
        },
        {
          id: 3,
          z: 1500,
          width: ROAD_WIDTH,
          leftOption: { op: '×', val: 3, label: '×3', passed: false },
          rightOption: { op: '÷', val: 2, label: '÷2', passed: false },
          isMoving: true,
          moveSpeed: 2.5,
          moveRange: 40,
          offsetX: 0,
        },
        {
          id: 4,
          z: 2100,
          width: ROAD_WIDTH,
          leftOption: { op: '+', val: 60, label: '+60', passed: false },
          rightOption: { op: '+', val: 30, label: '+30', passed: false },
        },
        {
          id: 5,
          z: 2700,
          width: ROAD_WIDTH,
          leftOption: { op: '×', val: 3, label: '×3', passed: false },
          rightOption: { op: '×', val: 2, label: '×2', passed: false },
        },
        {
          id: 6,
          z: 3200,
          width: ROAD_WIDTH,
          leftOption: { op: '+', val: 80, label: '+80', passed: false },
          rightOption: { op: '-', val: 25, label: '-25', passed: false },
        },
      ];

      const obstacles: Obstacle[] = [
        {
          id: 1,
          type: 'saw',
          x: -35,
          z: 700,
          width: 30,
          length: 30,
          radius: 18,
          phase: 0,
          speed: 2.5,
          active: true,
        },
        {
          id: 2,
          type: 'saw',
          x: 35,
          z: 700,
          width: 30,
          length: 30,
          radius: 18,
          phase: Math.PI,
          speed: 2.5,
          active: true,
        },
        {
          id: 3,
          type: 'pendulum',
          x: 0,
          z: 1250,
          width: 50,
          length: 30,
          radius: 22,
          phase: 0,
          speed: 2.0,
          active: true,
        },
        {
          id: 4,
          type: 'smasher',
          x: -50,
          z: 1800,
          width: 45,
          length: 50,
          radius: 20,
          phase: 0,
          speed: 1.8,
          active: true,
        },
        {
          id: 5,
          type: 'spikes',
          x: 40,
          z: 2400,
          width: 50,
          length: 70,
          radius: 22,
          phase: 0,
          speed: 1.8,
          active: true,
        },
        {
          id: 6,
          type: 'saw',
          x: 0,
          z: 2950,
          width: 35,
          length: 35,
          radius: 20,
          phase: 0,
          speed: 2.8,
          active: true,
        },
      ];

      const mobs: EnemyMob[] = [
        createMob(1, 1250, 45, 25),
        createMob(2, 1800, 40, 35),
        createMob(3, 2400, -45, 45),
      ];

      const coins: Coin[] = [
        ...createCoinLine(250, 7, -35),
        ...createCoinLine(1000, 8, 35),
        ...createCoinLine(1600, 9, 0),
        ...createCoinLine(2200, 9, -40),
        ...createCoinLine(2800, 9, 40),
      ];

      const boss: Boss = {
        z: 3600,
        name: 'アイアン・スマッシャー',
        maxHp: 160,
        hp: 160,
        scale: 2.7,
        color: '#b91c1c',
        state: 'idle',
        defeatTimer: 0,
        animTimer: 0,
      };

      return {
        id: 2,
        name: 'Stage 2: トラップ・ファクトリー',
        courseLength: length,
        theme: 'neon',
        gates,
        obstacles,
        mobs,
        boss,
        coins,
      };
    }

    case 3: {
      // ステージ3: ネオン・メガロポリス
      const length = 4800;
      const gates: Gate[] = [
        {
          id: 1,
          z: 450,
          width: ROAD_WIDTH,
          leftOption: { op: '×', val: 2, label: '×2', passed: false },
          rightOption: { op: '+', val: 35, label: '+35', passed: false },
        },
        {
          id: 2,
          z: 1000,
          width: ROAD_WIDTH,
          leftOption: { op: '+', val: 50, label: '+50', passed: false },
          rightOption: { op: '×', val: 3, label: '×3', passed: false },
          isRoulette: true,
          rouletteTimer: 0,
        },
        {
          id: 3,
          z: 1650,
          width: ROAD_WIDTH,
          leftOption: { op: '×', val: 4, label: '×4', passed: false },
          rightOption: { op: '÷', val: 2, label: '÷2', passed: false },
          isMoving: true,
          moveSpeed: 3.0,
          moveRange: 45,
          offsetX: 0,
        },
        {
          id: 4,
          z: 2300,
          width: ROAD_WIDTH,
          leftOption: { op: '+', val: 100, label: '+100', passed: false },
          rightOption: { op: '-', val: 35, label: '-35', passed: false },
        },
        {
          id: 5,
          z: 2950,
          width: ROAD_WIDTH,
          leftOption: { op: '×', val: 3, label: '×3', passed: false },
          rightOption: { op: '+', val: 60, label: '+60', passed: false },
          isMoving: true,
          moveSpeed: 3.2,
          moveRange: 45,
          offsetX: 0,
        },
        {
          id: 6,
          z: 3600,
          width: ROAD_WIDTH,
          leftOption: { op: '×', val: 4, label: '×4', passed: false },
          rightOption: { op: '×', val: 2, label: '×2', passed: false },
        },
        {
          id: 7,
          z: 4150,
          width: ROAD_WIDTH,
          leftOption: { op: '+', val: 120, label: '+120', passed: false },
          rightOption: { op: '-', val: 40, label: '-40', passed: false },
        },
      ];

      const obstacles: Obstacle[] = [
        { id: 1, type: 'saw', x: 0, z: 750, width: 35, length: 35, radius: 20, phase: 0, speed: 2.8, active: true },
        { id: 2, type: 'pendulum', x: -35, z: 1350, width: 45, length: 30, radius: 20, phase: 0, speed: 2.4, active: true },
        { id: 3, type: 'pendulum', x: 35, z: 1350, width: 45, length: 30, radius: 20, phase: Math.PI, speed: 2.4, active: true },
        { id: 4, type: 'smasher', x: 50, z: 2000, width: 45, length: 60, radius: 20, phase: 0, speed: 2.0, active: true },
        { id: 5, type: 'spikes', x: 0, z: 2650, width: 70, length: 80, radius: 24, phase: 0, speed: 2.0, active: true },
        { id: 6, type: 'saw', x: -45, z: 3300, width: 35, length: 35, radius: 20, phase: 0, speed: 3.2, active: true },
        { id: 7, type: 'saw', x: 45, z: 3300, width: 35, length: 35, radius: 20, phase: Math.PI, speed: 3.2, active: true },
        { id: 8, type: 'smasher', x: -50, z: 3900, width: 45, length: 60, radius: 20, phase: 0, speed: 2.2, active: true },
      ];

      const mobs: EnemyMob[] = [
        createMob(1, 1350, 0, 35),
        createMob(2, 2000, -45, 50),
        createMob(3, 2650, 45, 65),
        createMob(4, 3300, 0, 80),
      ];

      const coins: Coin[] = [
        ...createCoinLine(250, 8, 45),
        ...createCoinLine(850, 9, -45),
        ...createCoinLine(1500, 10, 0),
        ...createCoinLine(2150, 10, 40),
        ...createCoinLine(2800, 10, -40),
        ...createCoinLine(3450, 10, 0),
      ];

      const boss: Boss = {
        z: 4450,
        name: 'サイバー・タイタン',
        maxHp: 260,
        hp: 260,
        scale: 3.0,
        color: '#9333ea',
        state: 'idle',
        defeatTimer: 0,
        animTimer: 0,
      };

      return {
        id: 3,
        name: 'Stage 3: ネオン・メガロポリス',
        courseLength: length,
        theme: 'cyber',
        gates,
        obstacles,
        mobs,
        boss,
        coins,
      };
    }

    case 4: {
      // ステージ4: ラバ・インフェルノ
      const length = 5600;
      const gates: Gate[] = [
        { id: 1, z: 450, width: ROAD_WIDTH, leftOption: { op: '×', val: 3, label: '×3', passed: false }, rightOption: { op: '+', val: 45, label: '+45', passed: false } },
        { id: 2, z: 1100, width: ROAD_WIDTH, leftOption: { op: '+', val: 80, label: '+80', passed: false }, rightOption: { op: '×', val: 4, label: '×4', passed: false }, isMoving: true, moveSpeed: 3.5, moveRange: 50, offsetX: 0 },
        { id: 3, z: 1800, width: ROAD_WIDTH, leftOption: { op: '÷', val: 2, label: '÷2', passed: false }, rightOption: { op: '×', val: 3, label: '×3', passed: false }, isRoulette: true, rouletteTimer: 0 },
        { id: 4, z: 2500, width: ROAD_WIDTH, leftOption: { op: '+', val: 140, label: '+140', passed: false }, rightOption: { op: '-', val: 50, label: '-50', passed: false } },
        { id: 5, z: 3200, width: ROAD_WIDTH, leftOption: { op: '×', val: 4, label: '×4', passed: false }, rightOption: { op: '+', val: 90, label: '+90', passed: false }, isMoving: true, moveSpeed: 3.8, moveRange: 50, offsetX: 0 },
        { id: 6, z: 3900, width: ROAD_WIDTH, leftOption: { op: '×', val: 5, label: '×5', passed: false }, rightOption: { op: '×', val: 2, label: '×2', passed: false } },
        { id: 7, z: 4600, width: ROAD_WIDTH, leftOption: { op: '+', val: 180, label: '+180', passed: false }, rightOption: { op: '-', val: 60, label: '-60', passed: false } },
      ];

      const obstacles: Obstacle[] = [
        { id: 1, type: 'saw', x: -45, z: 750, width: 35, length: 35, radius: 20, phase: 0, speed: 3.2, active: true },
        { id: 2, type: 'saw', x: 45, z: 750, width: 35, length: 35, radius: 20, phase: Math.PI, speed: 3.2, active: true },
        { id: 3, type: 'pendulum', x: 0, z: 1450, width: 55, length: 35, radius: 22, phase: 0, speed: 2.8, active: true },
        { id: 4, type: 'smasher', x: -55, z: 2150, width: 50, length: 70, radius: 22, phase: 0, speed: 2.4, active: true },
        { id: 5, type: 'spikes', x: 45, z: 2850, width: 55, length: 90, radius: 22, phase: 0, speed: 2.2, active: true },
        { id: 6, type: 'saw', x: 0, z: 3550, width: 40, length: 40, radius: 22, phase: 0, speed: 3.5, active: true },
        { id: 7, type: 'pendulum', x: 0, z: 4250, width: 55, length: 35, radius: 22, phase: Math.PI / 2, speed: 2.8, active: true },
      ];

      const mobs: EnemyMob[] = [
        createMob(1, 1450, -40, 50),
        createMob(2, 2150, 40, 70),
        createMob(3, 2850, -45, 95),
        createMob(4, 3550, 0, 120),
        createMob(5, 4250, 45, 140),
      ];

      const coins: Coin[] = [
        ...createCoinLine(250, 10, 0),
        ...createCoinLine(950, 10, -45),
        ...createCoinLine(1650, 12, 45),
        ...createCoinLine(2350, 12, 0),
        ...createCoinLine(3050, 12, -45),
        ...createCoinLine(3750, 12, 45),
        ...createCoinLine(4450, 12, 0),
      ];

      const boss: Boss = {
        z: 5150,
        name: 'マグマ・デーモンキング',
        maxHp: 380,
        hp: 380,
        scale: 3.3,
        color: '#ea580c',
        state: 'idle',
        defeatTimer: 0,
        animTimer: 0,
      };

      return {
        id: 4,
        name: 'Stage 4: ラバ・インフェルノ',
        courseLength: length,
        theme: 'volcano',
        gates,
        obstacles,
        mobs,
        boss,
        coins,
      };
    }

    default: {
      // ステージ5: キングダム・フォートレス (最終決戦)
      const length = 6500;
      const gates: Gate[] = [
        { id: 1, z: 450, width: ROAD_WIDTH, leftOption: { op: '×', val: 3, label: '×3', passed: false }, rightOption: { op: '+', val: 60, label: '+60', passed: false } },
        { id: 2, z: 1100, width: ROAD_WIDTH, leftOption: { op: '×', val: 4, label: '×4', passed: false }, rightOption: { op: '÷', val: 2, label: '÷2', passed: false }, isMoving: true, moveSpeed: 3.8, moveRange: 55, offsetX: 0 },
        { id: 3, z: 1850, width: ROAD_WIDTH, leftOption: { op: '+', val: 120, label: '+120', passed: false }, rightOption: { op: '×', val: 3, label: '×3', passed: false }, isRoulette: true, rouletteTimer: 0 },
        { id: 4, z: 2600, width: ROAD_WIDTH, leftOption: { op: '×', val: 5, label: '×5', passed: false }, rightOption: { op: '-', val: 50, label: '-50', passed: false }, isMoving: true, moveSpeed: 4.2, moveRange: 55, offsetX: 0 },
        { id: 5, z: 3350, width: ROAD_WIDTH, leftOption: { op: '+', val: 200, label: '+200', passed: false }, rightOption: { op: '+', val: 80, label: '+80', passed: false } },
        { id: 6, z: 4100, width: ROAD_WIDTH, leftOption: { op: '×', val: 4, label: '×4', passed: false }, rightOption: { op: '÷', val: 3, label: '÷3', passed: false }, isMoving: true, moveSpeed: 4.2, moveRange: 55, offsetX: 0 },
        { id: 7, z: 4850, width: ROAD_WIDTH, leftOption: { op: '×', val: 5, label: '×5', passed: false }, rightOption: { op: '+', val: 160, label: '+160', passed: false } },
        { id: 8, z: 5600, width: ROAD_WIDTH, leftOption: { op: '+', val: 300, label: '+300', passed: false }, rightOption: { op: '-', val: 80, label: '-80', passed: false } },
      ];

      const obstacles: Obstacle[] = [
        { id: 1, type: 'saw', x: 0, z: 780, width: 40, length: 40, radius: 22, phase: 0, speed: 3.5, active: true },
        { id: 2, type: 'pendulum', x: -45, z: 1450, width: 55, length: 35, radius: 22, phase: 0, speed: 3.0, active: true },
        { id: 3, type: 'pendulum', x: 45, z: 1450, width: 55, length: 35, radius: 22, phase: Math.PI, speed: 3.0, active: true },
        { id: 4, type: 'smasher', x: 55, z: 2200, width: 55, length: 70, radius: 24, phase: 0, speed: 2.8, active: true },
        { id: 5, type: 'spikes', x: -40, z: 2950, width: 60, length: 90, radius: 24, phase: 0, speed: 2.6, active: true },
        { id: 6, type: 'saw', x: -45, z: 3700, width: 40, length: 40, radius: 22, phase: 0, speed: 3.8, active: true },
        { id: 7, type: 'saw', x: 45, z: 3700, width: 40, length: 40, radius: 22, phase: Math.PI, speed: 3.8, active: true },
        { id: 8, type: 'pendulum', x: 0, z: 4450, width: 60, length: 35, radius: 24, phase: 0, speed: 3.2, active: true },
        { id: 9, type: 'smasher', x: -55, z: 5200, width: 55, length: 70, radius: 24, phase: 0, speed: 3.0, active: true },
      ];

      const mobs: EnemyMob[] = [
        createMob(1, 1450, 0, 60),
        createMob(2, 2200, -45, 90),
        createMob(3, 2950, 45, 120),
        createMob(4, 3700, 0, 160),
        createMob(5, 4450, -40, 190),
        createMob(6, 5200, 40, 220),
      ];

      const coins: Coin[] = [
        ...createCoinLine(250, 12, -45),
        ...createCoinLine(950, 12, 45),
        ...createCoinLine(1650, 14, 0),
        ...createCoinLine(2400, 14, -40),
        ...createCoinLine(3150, 14, 40),
        ...createCoinLine(3900, 14, 0),
        ...createCoinLine(4650, 14, -45),
        ...createCoinLine(5400, 14, 45),
      ];

      const boss: Boss = {
        z: 6050,
        name: 'アルティメット・エンペラー',
        maxHp: 500,
        hp: 500,
        scale: 3.6,
        color: '#7f1d1d',
        state: 'idle',
        defeatTimer: 0,
        animTimer: 0,
      };

      return {
        id: 5,
        name: 'Stage 5: キングダム・フォートレス',
        courseLength: length,
        theme: 'beach',
        gates,
        obstacles,
        mobs,
        boss,
        coins,
      };
    }
  }
};
