// Count Masters ステージ設計 & エンドレス生成

import { StageData, Gate, Obstacle, EnemyMob, Boss, Coin, StairStep } from './types';

export const ROAD_WIDTH = 18; // 左右の道幅 (-9 ~ +9)

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
      requiredStickmen: (i + 1) * 8,
      color: stepColors[i % stepColors.length],
    });
    currentZ += 70;
    currentY += 15;
  }
  return steps;
};

// コイン列のヘルパー
const createCoinLine = (startZ: number, count: number, x: number, spacing: number = 25): Coin[] => {
  const coins: Coin[] = [];
  for (let i = 0; i < count; i++) {
    coins.push({
      id: Math.random(),
      x,
      y: 4,
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
  const spacing = 1.6;
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
      const length = 2600;
      const gates: Gate[] = [
        {
          id: 1,
          z: 350,
          width: ROAD_WIDTH,
          leftOption: { op: '+', val: 15, label: '+15', passed: false },
          rightOption: { op: '×', val: 2, label: '×2', passed: false },
        },
        {
          id: 2,
          z: 750,
          width: ROAD_WIDTH,
          leftOption: { op: '+', val: 30, label: '+30', passed: false },
          rightOption: { op: '-', val: 10, label: '-10', passed: false },
        },
        {
          id: 3,
          z: 1150,
          width: ROAD_WIDTH,
          leftOption: { op: '÷', val: 2, label: '÷2', passed: false },
          rightOption: { op: '×', val: 3, label: '×3', passed: false },
        },
        {
          id: 4,
          z: 1550,
          width: ROAD_WIDTH,
          leftOption: { op: '+', val: 50, label: '+50', passed: false },
          rightOption: { op: '+', val: 20, label: '+20', passed: false },
        },
        {
          id: 5,
          z: 1950,
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
          z: 550,
          width: 5,
          length: 5,
          radius: 3.5,
          phase: 0,
          speed: 2.5,
          active: true,
        },
        {
          id: 2,
          type: 'spikes',
          x: -4,
          z: 950,
          width: 4,
          length: 8,
          radius: 2,
          phase: 0,
          speed: 1.5,
          active: true,
        },
        {
          id: 3,
          type: 'saw',
          x: 3,
          z: 1350,
          width: 5,
          length: 5,
          radius: 3.5,
          phase: Math.PI,
          speed: 2.5,
          active: true,
        },
        {
          id: 4,
          type: 'pendulum',
          x: 0,
          z: 1750,
          width: 6,
          length: 4,
          radius: 3,
          phase: 0,
          speed: 2.0,
          active: true,
        },
      ];

      const mobs: EnemyMob[] = [
        createMob(1, 950, 4, 18),
        createMob(2, 1750, -4, 30),
      ];

      const coins: Coin[] = [
        ...createCoinLine(200, 5, 0),
        ...createCoinLine(600, 6, -4),
        ...createCoinLine(1000, 6, 4),
        ...createCoinLine(1400, 6, 0),
        ...createCoinLine(1800, 6, 4),
      ];

      const boss: Boss = {
        z: 2250,
        name: 'レッド・ゴーレム',
        maxHp: 75,
        hp: 75,
        scale: 2.8,
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
      const length = 3200;
      const gates: Gate[] = [
        {
          id: 1,
          z: 350,
          width: ROAD_WIDTH,
          leftOption: { op: '×', val: 2, label: '×2', passed: false },
          rightOption: { op: '+', val: 20, label: '+20', passed: false },
          isMoving: true,
          moveSpeed: 2.0,
          moveRange: 4,
          offsetX: 0,
        },
        {
          id: 2,
          z: 750,
          width: ROAD_WIDTH,
          leftOption: { op: '+', val: 40, label: '+40', passed: false },
          rightOption: { op: '-', val: 15, label: '-15', passed: false },
        },
        {
          id: 3,
          z: 1200,
          width: ROAD_WIDTH,
          leftOption: { op: '×', val: 3, label: '×3', passed: false },
          rightOption: { op: '÷', val: 2, label: '÷2', passed: false },
          isMoving: true,
          moveSpeed: 3.0,
          moveRange: 5,
          offsetX: 0,
        },
        {
          id: 4,
          z: 1700,
          width: ROAD_WIDTH,
          leftOption: { op: '+', val: 60, label: '+60', passed: false },
          rightOption: { op: '+', val: 25, label: '+25', passed: false },
        },
        {
          id: 5,
          z: 2200,
          width: ROAD_WIDTH,
          leftOption: { op: '×', val: 3, label: '×3', passed: false },
          rightOption: { op: '×', val: 2, label: '×2', passed: false },
        },
        {
          id: 6,
          z: 2600,
          width: ROAD_WIDTH,
          leftOption: { op: '+', val: 80, label: '+80', passed: false },
          rightOption: { op: '-', val: 20, label: '-20', passed: false },
        },
      ];

      const obstacles: Obstacle[] = [
        {
          id: 1,
          type: 'saw',
          x: -3,
          z: 550,
          width: 5,
          length: 5,
          radius: 3.5,
          phase: 0,
          speed: 3.0,
          active: true,
        },
        {
          id: 2,
          type: 'saw',
          x: 3,
          z: 550,
          width: 5,
          length: 5,
          radius: 3.5,
          phase: Math.PI,
          speed: 3.0,
          active: true,
        },
        {
          id: 3,
          type: 'pendulum',
          x: 0,
          z: 980,
          width: 7,
          length: 4,
          radius: 3.5,
          phase: 0,
          speed: 2.5,
          active: true,
        },
        {
          id: 4,
          type: 'smasher',
          x: -6,
          z: 1450,
          width: 6,
          length: 10,
          radius: 3,
          phase: 0,
          speed: 2.0,
          active: true,
        },
        {
          id: 5,
          type: 'spikes',
          x: 3,
          z: 1950,
          width: 5,
          length: 12,
          radius: 2,
          phase: 0,
          speed: 2.0,
          active: true,
        },
        {
          id: 6,
          type: 'saw',
          x: 0,
          z: 2400,
          width: 6,
          length: 6,
          radius: 4,
          phase: 0,
          speed: 3.5,
          active: true,
        },
      ];

      const mobs: EnemyMob[] = [
        createMob(1, 980, 5, 28),
        createMob(2, 1450, 4, 38),
        createMob(3, 1950, -4, 45),
      ];

      const coins: Coin[] = [
        ...createCoinLine(200, 6, -3),
        ...createCoinLine(800, 6, 3),
        ...createCoinLine(1300, 8, 0),
        ...createCoinLine(1800, 8, -4),
        ...createCoinLine(2300, 8, 4),
      ];

      const boss: Boss = {
        z: 2850,
        name: 'アイアン・スマッシャー',
        maxHp: 160,
        hp: 160,
        scale: 3.2,
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
      const length = 4000;
      const gates: Gate[] = [
        {
          id: 1,
          z: 350,
          width: ROAD_WIDTH,
          leftOption: { op: '×', val: 2, label: '×2', passed: false },
          rightOption: { op: '+', val: 30, label: '+30', passed: false },
        },
        {
          id: 2,
          z: 800,
          width: ROAD_WIDTH,
          leftOption: { op: '+', val: 50, label: '+50', passed: false },
          rightOption: { op: '×', val: 3, label: '×3', passed: false },
          isRoulette: true,
          rouletteTimer: 0,
        },
        {
          id: 3,
          z: 1300,
          width: ROAD_WIDTH,
          leftOption: { op: '×', val: 4, label: '×4', passed: false },
          rightOption: { op: '÷', val: 3, label: '÷3', passed: false },
          isMoving: true,
          moveSpeed: 3.5,
          moveRange: 6,
          offsetX: 0,
        },
        {
          id: 4,
          z: 1850,
          width: ROAD_WIDTH,
          leftOption: { op: '+', val: 100, label: '+100', passed: false },
          rightOption: { op: '-', val: 30, label: '-30', passed: false },
        },
        {
          id: 5,
          z: 2400,
          width: ROAD_WIDTH,
          leftOption: { op: '×', val: 3, label: '×3', passed: false },
          rightOption: { op: '+', val: 60, label: '+60', passed: false },
          isMoving: true,
          moveSpeed: 4.0,
          moveRange: 5,
          offsetX: 0,
        },
        {
          id: 6,
          z: 2950,
          width: ROAD_WIDTH,
          leftOption: { op: '×', val: 4, label: '×4', passed: false },
          rightOption: { op: '×', val: 2, label: '×2', passed: false },
        },
        {
          id: 7,
          z: 3450,
          width: ROAD_WIDTH,
          leftOption: { op: '+', val: 120, label: '+120', passed: false },
          rightOption: { op: '-', val: 40, label: '-40', passed: false },
        },
      ];

      const obstacles: Obstacle[] = [
        {
          id: 1,
          type: 'saw',
          x: 0,
          z: 580,
          width: 6,
          length: 6,
          radius: 4,
          phase: 0,
          speed: 3.5,
          active: true,
        },
        {
          id: 2,
          type: 'pendulum',
          x: -3,
          z: 1050,
          width: 7,
          length: 5,
          radius: 3.5,
          phase: 0,
          speed: 3.0,
          active: true,
        },
        {
          id: 3,
          type: 'pendulum',
          x: 3,
          z: 1050,
          width: 7,
          length: 5,
          radius: 3.5,
          phase: Math.PI,
          speed: 3.0,
          active: true,
        },
        {
          id: 4,
          type: 'smasher',
          x: 5,
          z: 1600,
          width: 6,
          length: 12,
          radius: 3.5,
          phase: 0,
          speed: 2.5,
          active: true,
        },
        {
          id: 5,
          type: 'spikes',
          x: 0,
          z: 2150,
          width: 8,
          length: 14,
          radius: 4,
          phase: 0,
          speed: 2.5,
          active: true,
        },
        {
          id: 6,
          type: 'saw',
          x: -4,
          z: 2700,
          width: 5,
          length: 5,
          radius: 3.5,
          phase: 0,
          speed: 4.0,
          active: true,
        },
        {
          id: 7,
          type: 'saw',
          x: 4,
          z: 2700,
          width: 5,
          length: 5,
          radius: 3.5,
          phase: Math.PI,
          speed: 4.0,
          active: true,
        },
        {
          id: 8,
          type: 'smasher',
          x: -5,
          z: 3200,
          width: 6,
          length: 12,
          radius: 3.5,
          phase: 0,
          speed: 3.0,
          active: true,
        },
      ];

      const mobs: EnemyMob[] = [
        createMob(1, 1050, 0, 40),
        createMob(2, 1600, -4, 55),
        createMob(3, 2150, 4, 70),
        createMob(4, 2700, 0, 90),
      ];

      const coins: Coin[] = [
        ...createCoinLine(200, 8, 4),
        ...createCoinLine(700, 8, -4),
        ...createCoinLine(1200, 10, 0),
        ...createCoinLine(1750, 10, 3),
        ...createCoinLine(2300, 10, -3),
        ...createCoinLine(2850, 10, 0),
      ];

      const boss: Boss = {
        z: 3700,
        name: 'サイバー・タイタン',
        maxHp: 280,
        hp: 280,
        scale: 3.6,
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
      const length = 4800;
      const gates: Gate[] = [
        {
          id: 1,
          z: 350,
          width: ROAD_WIDTH,
          leftOption: { op: '×', val: 3, label: '×3', passed: false },
          rightOption: { op: '+', val: 40, label: '+40', passed: false },
        },
        {
          id: 2,
          z: 900,
          width: ROAD_WIDTH,
          leftOption: { op: '+', val: 80, label: '+80', passed: false },
          rightOption: { op: '×', val: 4, label: '×4', passed: false },
          isMoving: true,
          moveSpeed: 4.0,
          moveRange: 6,
          offsetX: 0,
        },
        {
          id: 3,
          z: 1500,
          width: ROAD_WIDTH,
          leftOption: { op: '÷', val: 2, label: '÷2', passed: false },
          rightOption: { op: '×', val: 3, label: '×3', passed: false },
          isRoulette: true,
          rouletteTimer: 0,
        },
        {
          id: 4,
          z: 2100,
          width: ROAD_WIDTH,
          leftOption: { op: '+', val: 150, label: '+150', passed: false },
          rightOption: { op: '-', val: 50, label: '-50', passed: false },
        },
        {
          id: 5,
          z: 2700,
          width: ROAD_WIDTH,
          leftOption: { op: '×', val: 4, label: '×4', passed: false },
          rightOption: { op: '+', val: 100, label: '+100', passed: false },
          isMoving: true,
          moveSpeed: 4.5,
          moveRange: 6,
          offsetX: 0,
        },
        {
          id: 6,
          z: 3300,
          width: ROAD_WIDTH,
          leftOption: { op: '×', val: 5, label: '×5', passed: false },
          rightOption: { op: '×', val: 2, label: '×2', passed: false },
        },
        {
          id: 7,
          z: 3900,
          width: ROAD_WIDTH,
          leftOption: { op: '+', val: 200, label: '+200', passed: false },
          rightOption: { op: '-', val: 60, label: '-60', passed: false },
        },
      ];

      const obstacles: Obstacle[] = [
        { id: 1, type: 'saw', x: -4, z: 600, width: 5, length: 5, radius: 3.5, phase: 0, speed: 4.0, active: true },
        { id: 2, type: 'saw', x: 4, z: 600, width: 5, length: 5, radius: 3.5, phase: Math.PI, speed: 4.0, active: true },
        { id: 3, type: 'pendulum', x: 0, z: 1200, width: 8, length: 5, radius: 4, phase: 0, speed: 3.5, active: true },
        { id: 4, type: 'smasher', x: -5, z: 1800, width: 7, length: 14, radius: 4, phase: 0, speed: 3.0, active: true },
        { id: 5, type: 'spikes', x: 4, z: 2400, width: 6, length: 16, radius: 3, phase: 0, speed: 3.0, active: true },
        { id: 6, type: 'saw', x: 0, z: 3000, width: 7, length: 7, radius: 4.5, phase: 0, speed: 4.5, active: true },
        { id: 7, type: 'pendulum', x: 0, z: 3600, width: 8, length: 5, radius: 4, phase: Math.PI / 2, speed: 3.5, active: true },
      ];

      const mobs: EnemyMob[] = [
        createMob(1, 1200, -3, 60),
        createMob(2, 1800, 3, 85),
        createMob(3, 2400, -4, 110),
        createMob(4, 3000, 0, 140),
        createMob(5, 3600, 4, 160),
      ];

      const coins: Coin[] = [
        ...createCoinLine(200, 10, 0),
        ...createCoinLine(800, 10, -4),
        ...createCoinLine(1400, 12, 4),
        ...createCoinLine(2000, 12, 0),
        ...createCoinLine(2600, 12, -4),
        ...createCoinLine(3200, 12, 4),
        ...createCoinLine(3800, 12, 0),
      ];

      const boss: Boss = {
        z: 4400,
        name: 'マグマ・デーモンキング',
        maxHp: 420,
        hp: 420,
        scale: 4.0,
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
      const length = 5600;
      const gates: Gate[] = [
        { id: 1, z: 350, width: ROAD_WIDTH, leftOption: { op: '×', val: 3, label: '×3', passed: false }, rightOption: { op: '+', val: 50, label: '+50', passed: false } },
        { id: 2, z: 900, width: ROAD_WIDTH, leftOption: { op: '×', val: 4, label: '×4', passed: false }, rightOption: { op: '÷', val: 2, label: '÷2', passed: false }, isMoving: true, moveSpeed: 4.5, moveRange: 6, offsetX: 0 },
        { id: 3, z: 1550, width: ROAD_WIDTH, leftOption: { op: '+', val: 120, label: '+120', passed: false }, rightOption: { op: '×', val: 3, label: '×3', passed: false }, isRoulette: true, rouletteTimer: 0 },
        { id: 4, z: 2200, width: ROAD_WIDTH, leftOption: { op: '×', val: 5, label: '×5', passed: false }, rightOption: { op: '-', val: 50, label: '-50', passed: false }, isMoving: true, moveSpeed: 5.0, moveRange: 6, offsetX: 0 },
        { id: 5, z: 2850, width: ROAD_WIDTH, leftOption: { op: '+', val: 200, label: '+200', passed: false }, rightOption: { op: '+', val: 80, label: '+80', passed: false } },
        { id: 6, z: 3500, width: ROAD_WIDTH, leftOption: { op: '×', val: 4, label: '×4', passed: false }, rightOption: { op: '÷', val: 3, label: '÷3', passed: false }, isMoving: true, moveSpeed: 5.0, moveRange: 6, offsetX: 0 },
        { id: 7, z: 4150, width: ROAD_WIDTH, leftOption: { op: '×', val: 5, label: '×5', passed: false }, rightOption: { op: '+', val: 150, label: '+150', passed: false } },
        { id: 8, z: 4800, width: ROAD_WIDTH, leftOption: { op: '+', val: 300, label: '+300', passed: false }, rightOption: { op: '-', val: 80, label: '-80', passed: false } },
      ];

      const obstacles: Obstacle[] = [
        { id: 1, type: 'saw', x: 0, z: 620, width: 6, length: 6, radius: 4, phase: 0, speed: 4.5, active: true },
        { id: 2, type: 'pendulum', x: -4, z: 1200, width: 8, length: 5, radius: 4, phase: 0, speed: 4.0, active: true },
        { id: 3, type: 'pendulum', x: 4, z: 1200, width: 8, length: 5, radius: 4, phase: Math.PI, speed: 4.0, active: true },
        { id: 4, type: 'smasher', x: 5, z: 1850, width: 8, length: 15, radius: 4, phase: 0, speed: 3.5, active: true },
        { id: 5, type: 'spikes', x: -3, z: 2500, width: 7, length: 18, radius: 3.5, phase: 0, speed: 3.5, active: true },
        { id: 6, type: 'saw', x: -4, z: 3150, width: 6, length: 6, radius: 4, phase: 0, speed: 5.0, active: true },
        { id: 7, type: 'saw', x: 4, z: 3150, width: 6, length: 6, radius: 4, phase: Math.PI, speed: 5.0, active: true },
        { id: 8, type: 'pendulum', x: 0, z: 3800, width: 9, length: 5, radius: 4.5, phase: 0, speed: 4.0, active: true },
        { id: 9, type: 'smasher', x: -5, z: 4450, width: 8, length: 15, radius: 4, phase: 0, speed: 4.0, active: true },
      ];

      const mobs: EnemyMob[] = [
        createMob(1, 1200, 0, 80),
        createMob(2, 1850, -4, 120),
        createMob(3, 2500, 4, 160),
        createMob(4, 3150, 0, 200),
        createMob(5, 3800, -3, 240),
        createMob(6, 4450, 3, 280),
      ];

      const coins: Coin[] = [
        ...createCoinLine(200, 12, -4),
        ...createCoinLine(800, 12, 4),
        ...createCoinLine(1400, 14, 0),
        ...createCoinLine(2050, 14, -3),
        ...createCoinLine(2700, 14, 3),
        ...createCoinLine(3350, 14, 0),
        ...createCoinLine(4000, 14, -4),
        ...createCoinLine(4650, 14, 4),
      ];

      const boss: Boss = {
        z: 5200,
        name: 'アルティメット・エンペラー',
        maxHp: 650,
        hp: 650,
        scale: 4.5,
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
