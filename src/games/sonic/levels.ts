// Sonic Speed Rush - Level Design (Act 1: Green Hill Coast, Act 2: Boss Arena)

import { LevelData, Entity } from './types';
import { createBossState } from './boss';

export function createAct1Level(): LevelData {
  const entities: Entity[] = [];

  // Helper to add rings in a line or arc
  const addRingLine = (startX: number, startY: number, count: number, stepX = 36, stepY = 0) => {
    for (let i = 0; i < count; i++) {
      entities.push({
        id: `ring_${startX}_${i}`,
        type: 'ring',
        x: startX + i * stepX,
        y: startY + i * stepY,
        width: 20,
        height: 20,
        active: true,
      });
    }
  };

  const addRingArc = (centerX: number, centerY: number, radius: number, count = 7) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.PI * 0.15 + (i / (count - 1)) * (Math.PI * 0.7);
      entities.push({
        id: `ring_arc_${centerX}_${i}`,
        type: 'ring',
        x: centerX - Math.cos(angle) * radius,
        y: centerY - Math.sin(angle) * radius,
        width: 20,
        height: 20,
        active: true,
      });
    }
  };

  // 1. Starting area rings
  addRingLine(200, 420, 5);
  addRingLine(450, 420, 6);

  // 2. First Badnik (Motobug)
  entities.push({
    id: 'moto_1',
    type: 'enemy_motobug',
    x: 620,
    y: 432,
    width: 36,
    height: 28,
    originX: 620,
    range: 100,
    facing: -1,
    active: true,
  });

  // 3. First Item Box (10 Rings) & Spring
  entities.push({
    id: 'item_1',
    type: 'item_box',
    x: 750,
    y: 420,
    width: 30,
    height: 30,
    itemType: 'ring10',
    active: true,
  });

  entities.push({
    id: 'spring_y1',
    type: 'spring_yellow_up',
    x: 880,
    y: 442,
    width: 32,
    height: 18,
    active: true,
  });

  // High ring arc reached by spring
  addRingArc(880, 240, 110, 7);

  // Upper Platform with Shield
  entities.push({
    id: 'item_shield',
    type: 'item_box',
    x: 1050,
    y: 260,
    width: 30,
    height: 30,
    itemType: 'shield',
    active: true,
  });

  // Second Badnik (Buzz Bomber)
  entities.push({
    id: 'buzz_1',
    type: 'enemy_buzzbomber',
    x: 1200,
    y: 280,
    width: 40,
    height: 30,
    originX: 1200,
    range: 120,
    facing: -1,
    active: true,
  });

  // Dash Pad before Loop!
  entities.push({
    id: 'dash_loop',
    type: 'dash_pad_right',
    x: 1450,
    y: 440,
    width: 48,
    height: 16,
    active: true,
  });

  addRingLine(1520, 430, 6, 40);

  // Loop Rings in a circle
  addRingArc(1800, 350, 95, 8);

  // After Loop: Speed Shoes!
  entities.push({
    id: 'item_shoes',
    type: 'item_box',
    x: 2040,
    y: 420,
    width: 30,
    height: 30,
    itemType: 'shoes',
    active: true,
  });

  // Horizontal spring for supersonic blast!
  entities.push({
    id: 'spring_h1',
    type: 'spring_yellow_right',
    x: 2180,
    y: 430,
    width: 18,
    height: 32,
    active: true,
  });

  // Midpoint Starpost Checkpoint
  entities.push({
    id: 'starpost_1',
    type: 'starpost',
    x: 2480,
    y: 416,
    width: 20,
    height: 56,
    active: true,
  });

  // Chopper jumping from water gap
  entities.push({
    id: 'chopper_1',
    type: 'enemy_chopper',
    x: 2750,
    y: 400,
    width: 32,
    height: 32,
    originY: 420,
    active: true,
  });

  // Second loop or high curve
  addRingArc(3100, 240, 100, 8);

  // Item Box (Magnet Shield & Invincible)
  entities.push({
    id: 'item_magnet',
    type: 'item_box',
    x: 3280,
    y: 240,
    width: 30,
    height: 30,
    itemType: 'magnet',
    active: true,
  });

  entities.push({
    id: 'item_invincible',
    type: 'item_box',
    x: 3650,
    y: 420,
    width: 30,
    height: 30,
    itemType: 'invincible',
    active: true,
  });

  // Spikes hazard
  entities.push({
    id: 'spikes_1',
    type: 'spikes',
    x: 3900,
    y: 442,
    width: 40,
    height: 18,
    active: true,
  });

  // Red Spring high jump over spikes
  entities.push({
    id: 'spring_red_1',
    type: 'spring_red_up',
    x: 3820,
    y: 442,
    width: 32,
    height: 18,
    active: true,
  });

  // Motobug pack
  entities.push({
    id: 'moto_2',
    type: 'enemy_motobug',
    x: 4200,
    y: 432,
    width: 36,
    height: 28,
    originX: 4200,
    range: 120,
    facing: -1,
    active: true,
  });

  // 1UP Secret Box
  entities.push({
    id: 'item_1up',
    type: 'item_box',
    x: 4500,
    y: 180,
    width: 30,
    height: 30,
    itemType: 'life',
    active: true,
  });

  addRingLine(4700, 420, 10, 36);

  // Goal Plate!
  entities.push({
    id: 'goal_1',
    type: 'goal_plate',
    x: 5400,
    y: 390,
    width: 36,
    height: 80,
    active: true,
  });

  // Platforms (Ground and upper structures)
  const platforms = [
    // Main ground floor
    { x: 0, y: 450, w: 2650, h: 150 },
    // Upper ledges
    { x: 950, y: 300, w: 220, h: 24 },
    { x: 1300, y: 320, w: 180, h: 24 },
    // Water pit gap at 2650 to 2850
    // Ground resumes
    { x: 2850, y: 450, w: 2750, h: 150 },
    // Upper high pathway
    { x: 3050, y: 280, w: 320, h: 24 },
    { x: 4400, y: 220, w: 200, h: 24 },
  ];

  // Slopes (smooth ramps for physics)
  const slopes = [
    { x1: 2200, y1: 450, x2: 2450, y2: 380 },
    { x1: 2450, y1: 380, x2: 2650, y2: 450 },
    { x1: 4000, y1: 450, x2: 4300, y2: 360 },
    { x1: 4300, y1: 360, x2: 4600, y2: 450 },
  ];

  // 360-Degree Loops
  const loops = [
    {
      x: 1800,
      y: 350,
      radius: 95,
      entryLeftY: 450,
      entryRightY: 450,
    },
  ];

  return {
    act: 1,
    name: 'GREEN HILL COAST',
    subtitle: 'ACT 1 - SUPERSONIC RUN',
    width: 5800,
    height: 540,
    spawnX: 80,
    spawnY: 400,
    entities,
    loops,
    slopes,
    platforms,
    cameraMinX: 0,
    cameraMaxX: 5000,
  };
}

export function createAct2Level(): LevelData {
  const entities: Entity[] = [];

  // Boss Arena Rings
  for (let i = 0; i < 6; i++) {
    entities.push({
      id: `boss_ring_l_${i}`,
      type: 'ring',
      x: 200 + i * 36,
      y: 410,
      width: 20,
      height: 20,
      active: true,
    });
    entities.push({
      id: `boss_ring_r_${i}`,
      type: 'ring',
      x: 650 + i * 36,
      y: 410,
      width: 20,
      height: 20,
      active: true,
    });
  }

  // Springs on sides for jumping attack
  entities.push({
    id: 'boss_spring_l',
    type: 'spring_yellow_up',
    x: 120,
    y: 442,
    width: 32,
    height: 18,
    active: true,
  });

  entities.push({
    id: 'boss_spring_r',
    type: 'spring_yellow_up',
    x: 960,
    y: 442,
    width: 32,
    height: 18,
    active: true,
  });

  // Capsule (appears upon victory)
  entities.push({
    id: 'capsule_boss',
    type: 'capsule',
    x: 540,
    y: 420,
    width: 64,
    height: 60,
    active: true,
    passed: false,
  });

  const platforms = [
    { x: 0, y: 450, w: 1080, h: 100 },
    // Side platforms
    { x: 60, y: 320, w: 120, h: 20 },
    { x: 900, y: 320, w: 120, h: 20 },
  ];

  return {
    act: 2,
    name: 'EGGMAN SHOWDOWN',
    subtitle: 'ACT 2 - DR. EGGMAN BOSS BATTLE',
    width: 1080,
    height: 540,
    spawnX: 180,
    spawnY: 400,
    entities,
    loops: [],
    slopes: [],
    platforms,
    cameraMinX: 0,
    cameraMaxX: 120,
    boss: createBossState(540, 200),
  };
}
