// Super Mario Kart GP - Physics and Game Logic Engine

import {
  KartState,
  ActiveItem,
  TrackData,
  InputState,
  EngineClass,
  ItemType,
  Particle,
} from './types';
import { CHARACTERS, getSurfaceAt } from './tracks';
import { marioKartAudio } from './audio';

// Engine class speed multipliers
export const ENGINE_SPEED_MULT: Record<EngineClass, number> = {
  '50cc': 0.85,
  '100cc': 1.0,
  '150cc': 1.2,
};

// Item spawn probabilities based on race rank (1 to 8)
export function getRandomItemForRank(rank: number): ItemType {
  const roll = Math.random();
  if (rank === 1) {
    if (roll < 0.45) return 'banana';
    if (roll < 0.8) return 'green_shell';
    return 'coin';
  } else if (rank <= 3) {
    if (roll < 0.25) return 'banana';
    if (roll < 0.5) return 'green_shell';
    if (roll < 0.75) return 'red_shell';
    if (roll < 0.9) return 'mushroom';
    return 'bobomb';
  } else if (rank <= 5) {
    if (roll < 0.3) return 'red_shell';
    if (roll < 0.6) return 'mushroom';
    if (roll < 0.8) return 'bobomb';
    if (roll < 0.92) return 'star';
    return 'green_shell';
  } else {
    // 6th to 8th rank
    if (roll < 0.35) return 'mushroom';
    if (roll < 0.65) return 'star';
    if (roll < 0.85) return 'lightning';
    return 'blue_shell';
  }
}

// Update Player Physics
export function updatePlayerKart(
  kart: KartState,
  inputs: InputState,
  track: TrackData,
  engineClass: EngineClass,
  particles: Particle[],
  activeItems: ActiveItem[],
  allKarts: KartState[],
  dt: number
) {
  const stats = CHARACTERS[kart.charId];
  const engineMult = ENGINE_SPEED_MULT[engineClass];

  // Tick down timers
  if (kart.boostTimer > 0) kart.boostTimer -= dt;
  if (kart.starTimer > 0) {
    kart.starTimer -= dt;
    if (kart.starTimer <= 0) marioKartAudio.stopStarBgm();
  }
  if (kart.lightningTimer > 0) kart.lightningTimer -= dt;
  if (kart.invulnerableTimer > 0) kart.invulnerableTimer -= dt;

  // Item roulette ticking
  if (kart.itemRouletteTimer > 0) {
    kart.itemRouletteTimer -= dt;
    const items: ItemType[] = ['green_shell', 'red_shell', 'banana', 'mushroom', 'star', 'bobomb'];
    kart.rouletteDisplayItem = items[Math.floor(Math.random() * items.length)];
    if (Math.random() < 0.3) marioKartAudio.playRouletteTick();

    if (kart.itemRouletteTimer <= 0) {
      kart.item = getRandomItemForRank(kart.rank);
      kart.rouletteDisplayItem = kart.item;
      marioKartAudio.playItemDecided();
    }
  }

  // Handle spin / crash state
  if (kart.spinTimer > 0) {
    kart.spinTimer -= dt;
    kart.speed *= 0.9;
    kart.angle += Math.PI * 5 * dt; // Rapid 360 spin
    return;
  }

  // Airborne physics (Jumps)
  if (kart.isAirborne) {
    kart.z += kart.vz * dt;
    kart.vz -= 30 * dt; // gravity
    if (kart.z <= 0) {
      kart.z = 0;
      kart.vz = 0;
      kart.isAirborne = false;
      // Landing puff
      createDustParticles(particles, kart.x, kart.y, '#ffffff', 4);
    }
  }

  // Surface check
  const surface = getSurfaceAt(track, kart.x, kart.y);
  let surfaceSpeedFactor = 1.0;
  let isOffroad = false;

  if (kart.starTimer > 0 || kart.boostTimer > 0) {
    // Star or Boost ignores offroad slowdown!
    surfaceSpeedFactor = 1.3;
  } else if (surface === 'boost') {
    if (kart.boostTimer < 0.6) {
      kart.boostTimer = 1.4;
      marioKartAudio.playRocketStart();
      createBoostParticles(particles, kart.x, kart.y);
    }
  } else if (surface === 'jump') {
    if (!kart.isAirborne) {
      kart.vz = 16;
      kart.isAirborne = true;
      marioKartAudio.playHop();
    }
  } else if (surface === 'oil') {
    if (kart.starTimer <= 0 && kart.invulnerableTimer <= 0 && kart.spinTimer <= 0) {
      triggerCrash(kart, 'slip', particles);
      marioKartAudio.playSpin();
    }
  } else if (surface === 'offroad') {
    surfaceSpeedFactor = 0.38;
    isOffroad = true;
    if (Math.abs(kart.speed) > 1.5) {
      createDustParticles(particles, kart.x, kart.y, '#15803d', 1);
    }
  } else if (surface === 'void') {
    // Fall into void (Rainbow Road)
    if (kart.z === 0 && kart.spinTimer <= 0) {
      triggerCrash(kart, 'crash', particles);
      marioKartAudio.playExplosion();
      // Respawn at nearest waypoint
      const nearestWp = track.waypoints[kart.checkpointIndex];
      kart.x = nearestWp.x;
      kart.y = nearestWp.y;
      kart.speed = 0;
      kart.angle = track.startPos.angle;
      kart.invulnerableTimer = 2.0;
    }
  }

  // Coin speed bonus (+1.5% per coin up to +15%)
  const coinBonus = 1.0 + kart.coins * 0.015;

  // Max speed calculation
  let baseMaxSpeed = (5.5 + stats.speed * 0.7) * engineMult * coinBonus * surfaceSpeedFactor;
  if (kart.boostTimer > 0) baseMaxSpeed *= 1.45;
  if (kart.starTimer > 0) baseMaxSpeed *= 1.35;
  if (kart.lightningTimer > 0) baseMaxSpeed *= 0.55;

  const accelRate = (3.5 + stats.accel * 0.8) * engineMult;
  const brakeRate = 8.0;
  const friction = isOffroad ? 5.5 : 2.0;

  // Acceleration / Braking
  if (inputs.accelerate) {
    if (kart.speed < baseMaxSpeed) {
      kart.speed += accelRate * dt;
      if (kart.speed > baseMaxSpeed) kart.speed = baseMaxSpeed;
    } else {
      kart.speed -= friction * dt;
    }
  } else if (inputs.brake) {
    if (kart.speed > 0) {
      kart.speed -= brakeRate * dt;
      if (kart.speed < 0) kart.speed = 0;
    } else {
      // Reverse
      const maxReverse = -2.5;
      kart.speed -= accelRate * 0.6 * dt;
      if (kart.speed < maxReverse) kart.speed = maxReverse;
    }
  } else {
    // Coasting friction
    if (kart.speed > 0) {
      kart.speed -= friction * dt;
      if (kart.speed < 0) kart.speed = 0;
    } else if (kart.speed < 0) {
      kart.speed += friction * dt;
      if (kart.speed > 0) kart.speed = 0;
    }
  }

  // Steering & Drift
  const handlingMult = (0.7 + stats.handling * 0.18);
  let turnSpeed = 2.2 * handlingMult * (kart.speed / (baseMaxSpeed || 1));
  turnSpeed = Math.max(-2.8, Math.min(2.8, turnSpeed));

  // Hop action
  if (inputs.drift && !kart.isAirborne && kart.driftDir === 0 && kart.speed > 1.5) {
    kart.vz = 8;
    kart.isAirborne = true;
    marioKartAudio.playHop();
    // Decide drift direction
    if (inputs.left) kart.driftDir = -1;
    else if (inputs.right) kart.driftDir = 1;
  }

  if (kart.driftDir !== 0) {
    // In Drift mode
    kart.driftTime += dt;

    // Counter-steering allows sharp or wide drift
    let driftSteer = kart.driftDir * 1.6;
    if (inputs.left && kart.driftDir === 1) driftSteer *= 0.5; // Wide drift
    if (inputs.right && kart.driftDir === -1) driftSteer *= 0.5;
    if (inputs.left && kart.driftDir === -1) driftSteer *= 1.3; // Sharp drift
    if (inputs.right && kart.driftDir === 1) driftSteer *= 1.3;

    kart.angle += driftSteer * turnSpeed * dt;

    // Drift spark charge
    if (kart.driftTime > 1.2 && kart.miniTurboLevel === 0) {
      kart.miniTurboLevel = 1; // Blue sparks
      marioKartAudio.playDriftSpark();
    } else if (kart.driftTime > 2.4 && kart.miniTurboLevel === 1) {
      kart.miniTurboLevel = 2; // Orange sparks
      marioKartAudio.playDriftSpark();
    }

    // Spawn sparks
    if (kart.miniTurboLevel > 0 && Math.random() < 0.6) {
      const sparkColor = kart.miniTurboLevel === 2 ? '#f97316' : '#38bdf8';
      createSparkParticle(particles, kart.x, kart.y, sparkColor);
    }

    // Release drift if key released or stopped
    if (!inputs.drift || kart.speed < 1.0) {
      if (kart.miniTurboLevel > 0) {
        // Unleash MINI-TURBO!
        const turboLvl = kart.miniTurboLevel as 1 | 2;
        const turboDuration = turboLvl === 2 ? 1.6 : 0.8;
        kart.boostTimer = turboDuration;
        marioKartAudio.playMiniTurbo(turboLvl);
        createBoostParticles(particles, kart.x, kart.y);
      }
      kart.driftDir = 0;
      kart.driftTime = 0;
      kart.miniTurboLevel = 0;
    }
  } else {
    // Normal steering
    if (inputs.left) {
      kart.angle -= turnSpeed * dt;
      kart.steer = -1;
    } else if (inputs.right) {
      kart.angle += turnSpeed * dt;
      kart.steer = 1;
    } else {
      kart.steer = 0;
    }
  }

  // Update position
  kart.x += Math.cos(kart.angle) * kart.speed * 60 * dt;
  kart.y += Math.sin(kart.angle) * kart.speed * 60 * dt;

  // Audio update
  const speedNorm = Math.abs(kart.speed) / (baseMaxSpeed || 1);
  marioKartAudio.updateEngine(speedNorm, kart.boostTimer > 0, kart.driftDir !== 0);

  // Check item use
  if (inputs.useItem && kart.item !== 'none' && kart.itemRouletteTimer <= 0) {
    useKartItem(kart, activeItems, allKarts, particles, inputs.brake);
    kart.item = 'none';
  }

  // Check collision with track elements (Item boxes, Coins)
  checkTrackPickups(kart, track, particles);
}

// Update Rival AI Physics & Behavior
export function updateRivalAI(
  ai: KartState,
  track: TrackData,
  engineClass: EngineClass,
  player: KartState,
  allKarts: KartState[],
  activeItems: ActiveItem[],
  particles: Particle[],
  dt: number
) {
  const stats = CHARACTERS[ai.charId];
  const engineMult = ENGINE_SPEED_MULT[engineClass];

  // Timers
  if (ai.boostTimer > 0) ai.boostTimer -= dt;
  if (ai.starTimer > 0) ai.starTimer -= dt;
  if (ai.lightningTimer > 0) ai.lightningTimer -= dt;
  if (ai.invulnerableTimer > 0) ai.invulnerableTimer -= dt;
  if (ai.aiUseItemTimer > 0) ai.aiUseItemTimer -= dt;

  if (ai.itemRouletteTimer > 0) {
    ai.itemRouletteTimer -= dt;
    if (ai.itemRouletteTimer <= 0) {
      ai.item = getRandomItemForRank(ai.rank);
      ai.aiUseItemTimer = 1.5 + Math.random() * 3.0; // Wait a bit before using
    }
  }

  if (ai.spinTimer > 0) {
    ai.spinTimer -= dt;
    ai.speed *= 0.9;
    ai.angle += Math.PI * 4 * dt;
    return;
  }

  // Target waypoint navigation
  const wp = track.waypoints[ai.targetWpIndex];
  const dx = wp.x - ai.x;
  const dy = wp.y - ai.y;
  const distSq = dx * dx + dy * dy;

  if (distSq < 45 * 45) {
    // Advance to next waypoint
    ai.targetWpIndex = (ai.targetWpIndex + 1) % track.waypoints.length;
  }

  const targetAngle = Math.atan2(dy, dx);
  let angleDiff = targetAngle - ai.angle;
  // Normalize angle diff to -PI .. PI
  while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
  while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

  // Steering toward waypoint
  const turnRate = 2.4 * (0.8 + stats.handling * 0.15);
  if (angleDiff > 0.05) {
    ai.angle += Math.min(angleDiff, turnRate * dt);
    ai.steer = 1;
  } else if (angleDiff < -0.05) {
    ai.angle += Math.max(angleDiff, -turnRate * dt);
    ai.steer = -1;
  } else {
    ai.steer = 0;
  }

  // AI speed with rubber-banding around player
  let targetSpeed = (5.2 + stats.speed * 0.6) * engineMult;
  if (ai.boostTimer > 0) targetSpeed *= 1.35;
  if (ai.starTimer > 0) targetSpeed *= 1.25;
  if (ai.lightningTimer > 0) targetSpeed *= 0.55;

  // Rubber-band: If AI is far behind player, speed up slightly; if far ahead, ease off
  const distToPlayer = Math.hypot(player.x - ai.x, player.y - ai.y);
  if (ai.rank > player.rank && distToPlayer > 200) {
    targetSpeed *= 1.1; // Catch up
  } else if (ai.rank < player.rank && distToPlayer > 300) {
    targetSpeed *= 0.95; // Wait up
  }

  if (ai.speed < targetSpeed) {
    ai.speed += 3.5 * dt;
  } else {
    ai.speed -= 2.0 * dt;
  }

  // Move
  ai.x += Math.cos(ai.angle) * ai.speed * 60 * dt;
  ai.y += Math.sin(ai.angle) * ai.speed * 60 * dt;

  // AI item usage
  if (ai.item !== 'none' && ai.itemRouletteTimer <= 0 && ai.aiUseItemTimer <= 0) {
    useKartItem(ai, activeItems, allKarts, particles, false);
    ai.item = 'none';
  }

  // Pickup check
  checkTrackPickups(ai, track, particles);
}

// Use Item
export function useKartItem(
  user: KartState,
  activeItems: ActiveItem[],
  allKarts: KartState[],
  particles: Particle[],
  throwBackward: boolean
) {
  const item = user.item;

  if (item === 'mushroom') {
    user.boostTimer = 1.8;
    marioKartAudio.playMushroom();
    createBoostParticles(particles, user.x, user.y);
  } else if (item === 'star') {
    user.starTimer = 8.0;
    marioKartAudio.startStarBgm();
  } else if (item === 'lightning') {
    marioKartAudio.playLightning();
    // Shock all opponents!
    for (const k of allKarts) {
      if (k.id !== user.id && k.starTimer <= 0) {
        k.lightningTimer = 5.0;
        k.coins = Math.max(0, k.coins - 3);
        triggerCrash(k, 'slip', particles);
      }
    }
  } else if (item === 'coin') {
    user.coins = Math.min(10, user.coins + 2);
    marioKartAudio.playCoin();
  } else if (item === 'banana') {
    marioKartAudio.playBananaDrop();
    const dropDist = throwBackward ? -30 : 40;
    activeItems.push({
      id: Math.random().toString(),
      type: 'banana',
      x: user.x + Math.cos(user.angle) * dropDist,
      y: user.y + Math.sin(user.angle) * dropDist,
      z: 0,
      vx: throwBackward ? -Math.cos(user.angle) * 2 : Math.cos(user.angle) * 5,
      vy: throwBackward ? -Math.sin(user.angle) * 2 : Math.sin(user.angle) * 5,
      vz: 0,
      angle: user.angle,
      ownerId: user.id,
      life: 60,
      bounces: 0,
    });
  } else if (item === 'green_shell') {
    marioKartAudio.playShellLaunch();
    const shootAngle = throwBackward ? user.angle + Math.PI : user.angle;
    activeItems.push({
      id: Math.random().toString(),
      type: 'green_shell',
      x: user.x + Math.cos(shootAngle) * 35,
      y: user.y + Math.sin(shootAngle) * 35,
      z: 0,
      vx: Math.cos(shootAngle) * 11,
      vy: Math.sin(shootAngle) * 11,
      vz: 0,
      angle: shootAngle,
      ownerId: user.id,
      life: 15,
      bounces: 0,
    });
  } else if (item === 'red_shell') {
    marioKartAudio.playShellLaunch();
    // Find target in front
    let targetKart: KartState | undefined;
    let minDist = Infinity;
    for (const other of allKarts) {
      if (other.id !== user.id && other.rank < user.rank) {
        const d = Math.hypot(other.x - user.x, other.y - user.y);
        if (d < minDist) {
          minDist = d;
          targetKart = other;
        }
      }
    }
    activeItems.push({
      id: Math.random().toString(),
      type: 'red_shell',
      x: user.x + Math.cos(user.angle) * 35,
      y: user.y + Math.sin(user.angle) * 35,
      z: 0,
      vx: Math.cos(user.angle) * 9,
      vy: Math.sin(user.angle) * 9,
      vz: 0,
      angle: user.angle,
      ownerId: user.id,
      life: 12,
      bounces: 0,
      targetKartId: targetKart?.id,
    });
  } else if (item === 'blue_shell') {
    marioKartAudio.playShellLaunch();
    // Target 1st place kart
    const firstKart = allKarts.find((k) => k.rank === 1) || allKarts[0];
    activeItems.push({
      id: Math.random().toString(),
      type: 'blue_shell',
      x: user.x + Math.cos(user.angle) * 35,
      y: user.y + Math.sin(user.angle) * 35,
      z: 15,
      vx: Math.cos(user.angle) * 13,
      vy: Math.sin(user.angle) * 13,
      vz: 0,
      angle: user.angle,
      ownerId: user.id,
      life: 20,
      bounces: 0,
      targetKartId: firstKart.id,
    });
  } else if (item === 'bobomb') {
    marioKartAudio.playBananaDrop();
    const throwSpeed = throwBackward ? -4 : 8;
    activeItems.push({
      id: Math.random().toString(),
      type: 'bobomb',
      x: user.x + Math.cos(user.angle) * 30,
      y: user.y + Math.sin(user.angle) * 30,
      z: 10,
      vx: Math.cos(user.angle) * throwSpeed,
      vy: Math.sin(user.angle) * throwSpeed,
      vz: 6,
      angle: user.angle,
      ownerId: user.id,
      life: 3.5,
      bounces: 0,
    });
  }
}

// Update Active Projectiles / Items
export function updateActiveItems(
  items: ActiveItem[],
  karts: KartState[],
  track: TrackData,
  particles: Particle[],
  dt: number
) {
  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i];
    it.life -= dt;

    if (it.life <= 0) {
      if (it.type === 'bobomb') {
        explodeBomb(it, karts, particles);
      }
      items.splice(i, 1);
      continue;
    }

    // Red Shell Homing
    if (it.type === 'red_shell' && it.targetKartId) {
      const target = karts.find((k) => k.id === it.targetKartId);
      if (target) {
        const dx = target.x - it.x;
        const dy = target.y - it.y;
        const targetAng = Math.atan2(dy, dx);
        let diff = targetAng - it.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        it.angle += Math.max(-4 * dt, Math.min(4 * dt, diff));
        it.vx = Math.cos(it.angle) * 10.5;
        it.vy = Math.sin(it.angle) * 10.5;
      }
    }

    // Blue Shell Homing
    if (it.type === 'blue_shell' && it.targetKartId) {
      const target = karts.find((k) => k.id === it.targetKartId);
      if (target) {
        const dx = target.x - it.x;
        const dy = target.y - it.y;
        const dist = Math.hypot(dx, dy);
        const targetAng = Math.atan2(dy, dx);
        it.angle = targetAng;
        it.vx = Math.cos(it.angle) * 13;
        it.vy = Math.sin(it.angle) * 13;

        if (dist < 30) {
          // Direct hit on 1st place!
          explodeBomb(it, karts, particles);
          items.splice(i, 1);
          continue;
        }
      }
    }

    // Move
    it.x += it.vx * 60 * dt;
    it.y += it.vy * 60 * dt;

    if (it.vz !== 0 || it.z > 0) {
      it.z += it.vz * dt;
      it.vz -= 25 * dt;
      if (it.z <= 0) {
        it.z = 0;
        it.vz = 0;
      }
    }

    // Green Shell Wall Bouncing
    if (it.type === 'green_shell') {
      const surf = getSurfaceAt(track, it.x, it.y);
      if (surf === 'offroad' || surf === 'wall') {
        it.vx = -it.vx * 0.95;
        it.vy = -it.vy * 0.95;
        it.bounces++;
        marioKartAudio.playShellBounce();
        if (it.bounces > 4) {
          items.splice(i, 1);
          continue;
        }
      }
    }

    // Check hit against all karts
    let hit = false;
    for (const kart of karts) {
      if (kart.invulnerableTimer > 0) continue;
      const d = Math.hypot(kart.x - it.x, kart.y - it.y);
      if (d < 22) {
        // Hit!
        if (it.type === 'banana') {
          triggerCrash(kart, 'slip', particles);
          marioKartAudio.playSpin();
          hit = true;
        } else if (it.type === 'green_shell' || it.type === 'red_shell') {
          triggerCrash(kart, 'crash', particles);
          marioKartAudio.playExplosion();
          hit = true;
        } else if (it.type === 'bobomb') {
          explodeBomb(it, karts, particles);
          hit = true;
        }
        if (hit) break;
      }
    }

    if (hit) {
      items.splice(i, 1);
    }
  }
}

function explodeBomb(item: ActiveItem, karts: KartState[], particles: Particle[]) {
  marioKartAudio.playExplosion();
  createExplosionParticles(particles, item.x, item.y);
  for (const k of karts) {
    if (k.starTimer > 0) continue;
    const d = Math.hypot(k.x - item.x, k.y - item.y);
    if (d < 85) {
      triggerCrash(k, 'crash', particles);
    }
  }
}

// Trigger kart crash / spin
export function triggerCrash(kart: KartState, type: 'slip' | 'crash', particles: Particle[]) {
  if (kart.starTimer > 0 || kart.invulnerableTimer > 0) return;
  kart.spinTimer = type === 'crash' ? 1.4 : 0.9;
  kart.spinType = type;
  kart.invulnerableTimer = 2.5;
  kart.driftDir = 0;
  kart.miniTurboLevel = 0;
  kart.speed = 0;

  // Drop coins
  const drop = Math.min(kart.coins, 2);
  kart.coins -= drop;
  for (let i = 0; i < drop; i++) {
    createDustParticles(particles, kart.x, kart.y, '#facc15', 3);
  }
}

// Kart-to-Kart Collisions
export function checkKartCollisions(karts: KartState[], particles: Particle[]) {
  for (let i = 0; i < karts.length; i++) {
    for (let j = i + 1; j < karts.length; j++) {
      const k1 = karts[i];
      const k2 = karts[j];

      const dx = k2.x - k1.x;
      const dy = k2.y - k1.y;
      const dist = Math.hypot(dx, dy);
      const minSpacing = 24;

      if (dist < minSpacing && dist > 0.001) {
        // Star smash check
        if (k1.starTimer > 0 && k2.starTimer <= 0) {
          triggerCrash(k2, 'crash', particles);
          marioKartAudio.playExplosion();
          continue;
        } else if (k2.starTimer > 0 && k1.starTimer <= 0) {
          triggerCrash(k1, 'crash', particles);
          marioKartAudio.playExplosion();
          continue;
        }

        // Weight elastic bounce
        const w1 = CHARACTERS[k1.charId].weight;
        const w2 = CHARACTERS[k2.charId].weight;
        const totalW = w1 + w2;

        const overlap = (minSpacing - dist) * 0.5;
        const nx = dx / dist;
        const ny = dy / dist;

        // Push apart
        k1.x -= nx * overlap * (w2 / totalW);
        k1.y -= ny * overlap * (w2 / totalW);
        k2.x += nx * overlap * (w1 / totalW);
        k2.y += ny * overlap * (w1 / totalW);
      }
    }
  }
}

// Track Pickups (Item Boxes, Coins)
function checkTrackPickups(kart: KartState, track: TrackData, particles: Particle[]) {
  // Item Boxes
  for (const box of track.itemBoxes) {
    if (!box.active) continue;
    const d = Math.hypot(kart.x - box.x, kart.y - box.y);
    if (d < 24) {
      box.active = false;
      box.respawnTimer = 6.0; // 6 sec respawn
      if (kart.item === 'none' && kart.itemRouletteTimer <= 0) {
        kart.itemRouletteTimer = 1.8;
        marioKartAudio.playItemBoxBreak();
      }
      createItemBoxBreakParticles(particles, box.x, box.y);
    }
  }

  // Coins
  for (const c of track.coins) {
    if (c.collected) continue;
    const d = Math.hypot(kart.x - c.x, kart.y - c.y);
    if (d < 20) {
      c.collected = true;
      c.respawnTimer = 10.0;
      if (kart.coins < 10) {
        kart.coins++;
        if (kart.isPlayer) marioKartAudio.playCoin();
      }
      createSparkParticle(particles, c.x, c.y, '#facc15');
    }
  }
}

// Update Lap & Race Progress & Ranks
export function updateRaceProgress(karts: KartState[], track: TrackData) {
  const numCp = track.checkpoints.length;

  for (const k of karts) {
    // Check distance to next expected checkpoint
    const nextCpIdx = (k.checkpointIndex + 1) % numCp;
    const cp = track.checkpoints[nextCpIdx];
    const dist = Math.hypot(k.x - cp.x, k.y - cp.y);

    if (dist < cp.radius) {
      k.checkpointIndex = nextCpIdx;
      // If we just passed checkpoint 0, we completed a lap!
      if (nextCpIdx === 0) {
        k.lap++;
        if (k.isPlayer) {
          if (k.lap === track.laps) {
            marioKartAudio.playFinalLap();
          } else if (k.lap > track.laps && !k.finished) {
            k.finished = true;
            marioKartAudio.playVictoryFanfare();
          }
        }
      }
    }

    // Distance to next checkpoint for sorting
    const targetCp = track.checkpoints[(k.checkpointIndex + 1) % numCp];
    const distToNext = Math.hypot(k.x - targetCp.x, k.y - targetCp.y);

    // Continuous progress metric: lap * 10000 + checkpoint * 100 - distToNext
    k.totalDistance = k.lap * 10000 + k.checkpointIndex * 100 - distToNext * 0.05;
  }

  // Sort karts by totalDistance descending
  const sorted = [...karts].sort((a, b) => b.totalDistance - a.totalDistance);
  sorted.forEach((kart, index) => {
    kart.rank = index + 1;
  });
}

// Particle generators
export function updateParticles(particles: Particle[], dt: number) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }
    p.x += p.vx * 60 * dt;
    p.y += p.vy * 60 * dt;
    p.z += p.vz * 60 * dt;
    p.size *= 0.97;
  }
}

function createDustParticles(
  particles: Particle[],
  x: number,
  y: number,
  color: string,
  count: number
) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x: x + (Math.random() - 0.5) * 10,
      y: y + (Math.random() - 0.5) * 10,
      z: 2,
      vx: (Math.random() - 0.5) * 1.5,
      vy: (Math.random() - 0.5) * 1.5,
      vz: Math.random() * 2,
      life: 0.35,
      maxLife: 0.35,
      color,
      size: 4 + Math.random() * 3,
      type: 'dust',
    });
  }
}

function createSparkParticle(particles: Particle[], x: number, y: number, color: string) {
  particles.push({
    x: x + (Math.random() - 0.5) * 8,
    y: y + (Math.random() - 0.5) * 8,
    z: 4,
    vx: (Math.random() - 0.5) * 3,
    vy: (Math.random() - 0.5) * 3,
    vz: Math.random() * 3,
    life: 0.25,
    maxLife: 0.25,
    color,
    size: 5,
    type: 'spark_blue',
  });
}

function createBoostParticles(particles: Particle[], x: number, y: number) {
  for (let i = 0; i < 12; i++) {
    particles.push({
      x: x + (Math.random() - 0.5) * 16,
      y: y + (Math.random() - 0.5) * 16,
      z: 5,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      vz: Math.random() * 4,
      life: 0.45,
      maxLife: 0.45,
      color: Math.random() < 0.5 ? '#f97316' : '#facc15',
      size: 6,
      type: 'spark_orange',
    });
  }
}

function createItemBoxBreakParticles(particles: Particle[], x: number, y: number) {
  const colors = ['#f43f5e', '#38bdf8', '#facc15', '#22c55e'];
  for (let i = 0; i < 16; i++) {
    particles.push({
      x: x + (Math.random() - 0.5) * 10,
      y: y + (Math.random() - 0.5) * 10,
      z: 10,
      vx: (Math.random() - 0.5) * 5,
      vy: (Math.random() - 0.5) * 5,
      vz: Math.random() * 5 + 2,
      life: 0.5,
      maxLife: 0.5,
      color: colors[i % colors.length],
      size: 5,
      type: 'star',
    });
  }
}

function createExplosionParticles(particles: Particle[], x: number, y: number) {
  for (let i = 0; i < 24; i++) {
    particles.push({
      x: x + (Math.random() - 0.5) * 15,
      y: y + (Math.random() - 0.5) * 15,
      z: 10,
      vx: (Math.random() - 0.5) * 7,
      vy: (Math.random() - 0.5) * 7,
      vz: Math.random() * 7 + 2,
      life: 0.6,
      maxLife: 0.6,
      color: Math.random() < 0.4 ? '#ef4444' : Math.random() < 0.7 ? '#f97316' : '#1f2937',
      size: 8 + Math.random() * 6,
      type: 'explosion',
    });
  }
}
