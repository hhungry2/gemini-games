// Sonic Speed Rush - Physics & Movement Engine

import {
  Player,
  LevelData,
  Entity,
  InputState,
  Particle,
  ScorePopup,
  Animal,
  CharacterId,
} from './types';
import { sonicAudio } from './audio';

export const CONSTANTS = {
  GRAVITY: 760,
  MAX_FALL_SPEED: 720,
  BASE_ACCEL: 240,
  BASE_FRICTION: 200,
  BASE_TOP_SPEED: 420,
  SPEED_SHOES_TOP_SPEED: 680,
  ROLL_FRICTION: 50,
  DECEL_BRAKE: 900,
  JUMP_IMPULSE: -420,
  SPRING_YELLOW_IMPULSE: -640,
  SPRING_RED_IMPULSE: -880,
  SPRING_HORIZONTAL_IMPULSE: 700,
  BOOST_PAD_SPEED: 750,
  HOMING_SPEED: 800,
  HOMING_RADIUS: 300,
  SPINDASH_BASE_SPEED: 460,
  SPINDASH_STEP_SPEED: 55,
};

export function createInitialPlayer(character: CharacterId, spawnX = 80, spawnY = 380): Player {
  return {
    x: spawnX,
    y: spawnY,
    vx: 0,
    vy: 0,
    radius: 18,
    grounded: true,
    angle: 0,
    facing: 1,
    action: 'idle',
    character,
    isRolling: false,
    isJumping: false,
    spindashCharge: 0,
    spindashTimer: 0,
    homingTarget: null,
    homingCooldown: 0,
    flightTimer: 0,
    flightAscend: false,
    glideSpeed: 0,
    climbWallX: 0,
    shield: 'none',
    invincibleTimer: 0,
    speedShoesTimer: 0,
    invulnerableTimer: 0,
    animFrame: 0,
    animTimer: 0,
    trailHistory: [],
  };
}

export function updatePhysics(
  player: Player,
  inputs: InputState,
  level: LevelData,
  dt: number,
  particles: Particle[],
  scorePopups: ScorePopup[],
  animals: Animal[],
  onRingChange: (delta: number) => void,
  onScoreAdd: (pts: number) => void,
  onPlayerHurt: () => void,
  onLevelComplete: () => void
) {
  // Clamp dt to avoid tunneling
  const delta = Math.min(dt, 0.035);

  // Powerup timers
  if (player.invincibleTimer > 0) {
    player.invincibleTimer -= delta;
    if (player.invincibleTimer <= 0) {
      sonicAudio.startStageBGM();
    }
  }
  if (player.speedShoesTimer > 0) {
    player.speedShoesTimer -= delta;
  }
  if (player.invulnerableTimer > 0) {
    player.invulnerableTimer -= delta;
  }
  if (player.homingCooldown > 0) {
    player.homingCooldown -= delta;
  }

  // Determine top speed and acceleration
  const hasShoes = player.speedShoesTimer > 0;
  const topSpeed = hasShoes ? CONSTANTS.SPEED_SHOES_TOP_SPEED : CONSTANTS.BASE_TOP_SPEED;
  const accel = hasShoes ? CONSTANTS.BASE_ACCEL * 1.5 : CONSTANTS.BASE_ACCEL;

  // Trail history for afterimage effect (especially when fast or invincible)
  if (Math.abs(player.vx) > 360 || player.action === 'homing' || player.invincibleTimer > 0) {
    player.trailHistory.unshift({
      x: player.x,
      y: player.y,
      facing: player.facing,
      action: player.action,
      angle: player.angle,
    });
    if (player.trailHistory.length > 5) player.trailHistory.pop();
  } else if (player.trailHistory.length > 0) {
    player.trailHistory.pop();
  }

  // --- 1. SPINDASH LOGIC ---
  if (player.grounded && !player.isRolling && inputs.down) {
    // Crouch or Spindash
    if (inputs.jumpPressed || inputs.spindash) {
      if (player.action !== 'spindash') {
        player.action = 'spindash';
        player.spindashCharge = 1;
        player.vx = 0;
        sonicAudio.playSpindashCharge(player.spindashCharge);
      } else {
        player.spindashCharge = Math.min(8, player.spindashCharge + 1);
        sonicAudio.playSpindashCharge(player.spindashCharge);
      }
      player.spindashTimer = 0.5;

      // Spindash dust particles
      for (let i = 0; i < 3; i++) {
        particles.push({
          x: player.x - player.facing * 14,
          y: player.y + 12,
          vx: -player.facing * (100 + Math.random() * 120),
          vy: -30 - Math.random() * 40,
          color: '#ffffff',
          size: 4 + Math.random() * 4,
          life: 0.25,
          maxLife: 0.25,
          type: 'smoke',
        });
      }
    }
  }

  if (player.action === 'spindash') {
    player.vx = 0;
    player.spindashTimer -= delta;
    if (player.spindashTimer <= 0) {
      player.spindashCharge = Math.max(0, player.spindashCharge - delta * 3);
    }

    // Release Spindash when down is released
    if (!inputs.down) {
      const releaseSpeed =
        CONSTANTS.SPINDASH_BASE_SPEED + player.spindashCharge * CONSTANTS.SPINDASH_STEP_SPEED;
      player.vx = player.facing * releaseSpeed;
      player.action = 'roll';
      player.isRolling = true;
      player.spindashCharge = 0;
      sonicAudio.playSpindashRelease();

      // Burst of dust
      for (let i = 0; i < 8; i++) {
        particles.push({
          x: player.x,
          y: player.y + 12,
          vx: -player.facing * (150 + Math.random() * 200),
          vy: -20 - Math.random() * 60,
          color: '#e2e8f0',
          size: 5 + Math.random() * 5,
          life: 0.35,
          maxLife: 0.35,
          type: 'smoke',
        });
      }
    }
    return; // Don't process standard movement while charging
  }

  // --- 2. GROUND ROLLING ---
  if (player.grounded && !player.isRolling && inputs.down && Math.abs(player.vx) > 80) {
    player.isRolling = true;
    player.action = 'roll';
    sonicAudio.playJump(); // Roll sound
  }

  // Unroll if too slow on flat ground
  if (player.isRolling && player.grounded && Math.abs(player.vx) < 30) {
    player.isRolling = false;
    player.action = 'idle';
  }

  // --- 3. HORIZONTAL MOVEMENT & ACCELERATION ---
  if (player.action !== 'homing' && player.action !== 'climb') {
    if (inputs.left) {
      player.facing = -1;
      if (player.isRolling) {
        // Reduced control while rolling
        if (player.vx > 0) player.vx -= CONSTANTS.DECEL_BRAKE * 0.4 * delta;
      } else {
        if (player.vx > 40) {
          // Skid brake!
          player.vx -= CONSTANTS.DECEL_BRAKE * delta;
          if (player.grounded) {
            sonicAudio.playSkid();
            particles.push({
              x: player.x + 10,
              y: player.y + 14,
              vx: 40 + Math.random() * 40,
              vy: -20,
              color: '#ffffff',
              size: 4,
              life: 0.2,
              maxLife: 0.2,
              type: 'smoke',
            });
          }
        } else {
          player.vx -= accel * delta;
          if (player.vx < -topSpeed) player.vx = -topSpeed;
        }
      }
    } else if (inputs.right) {
      player.facing = 1;
      if (player.isRolling) {
        if (player.vx < 0) player.vx += CONSTANTS.DECEL_BRAKE * 0.4 * delta;
      } else {
        if (player.vx < -40) {
          // Skid brake!
          player.vx += CONSTANTS.DECEL_BRAKE * delta;
          if (player.grounded) {
            sonicAudio.playSkid();
            particles.push({
              x: player.x - 10,
              y: player.y + 14,
              vx: -40 - Math.random() * 40,
              vy: -20,
              color: '#ffffff',
              size: 4,
              life: 0.2,
              maxLife: 0.2,
              type: 'smoke',
            });
          }
        } else {
          player.vx += accel * delta;
          if (player.vx > topSpeed) player.vx = topSpeed;
        }
      }
    } else {
      // Natural friction when no input
      const currentFriction = player.isRolling ? CONSTANTS.ROLL_FRICTION : CONSTANTS.BASE_FRICTION;
      if (player.vx > 0) {
        player.vx = Math.max(0, player.vx - currentFriction * delta);
      } else if (player.vx < 0) {
        player.vx = Math.min(0, player.vx + currentFriction * delta);
      }
    }
  }

  // --- 4. CHARACTER SPECIAL ABILITIES ---
  // Sonic: Homing Attack
  if (player.character === 'sonic') {
    if (!player.grounded && inputs.jumpPressed && player.action !== 'homing') {
      // Search for nearest lock-on target within radius
      let nearestTarget: Entity | null = null;
      let minDst = CONSTANTS.HOMING_RADIUS;

      for (const ent of level.entities) {
        if (ent.collected || !ent.active) continue;
        if (
          ent.type.startsWith('enemy_') ||
          ent.type === 'item_box' ||
          ent.type.startsWith('spring_')
        ) {
          const dx = ent.x - player.x;
          const dy = ent.y - player.y;
          // Target in front of Sonic or below
          if (Math.sign(dx) === player.facing || Math.abs(dx) < 60) {
            const dst = Math.hypot(dx, dy);
            if (dst < minDst) {
              minDst = dst;
              nearestTarget = ent;
            }
          }
        }
      }

      if (nearestTarget) {
        player.homingTarget = nearestTarget;
        player.action = 'homing';
        sonicAudio.playHomingLock();
        sonicAudio.playHomingAttack();
      } else {
        // Air dash impulse even if no lock target
        player.vx = player.facing * 480;
        player.vy = -60;
        sonicAudio.playHomingAttack();
      }
    }
  }

  // Tails: Flying
  if (player.character === 'tails') {
    if (!player.grounded && inputs.jumpPressed) {
      if (player.action !== 'fly') {
        player.action = 'fly';
        player.flightTimer = 4.0; // 4 seconds max flight
      } else if (player.flightTimer > 0) {
        // Ascend flap
        player.vy = -240;
        sonicAudio.playFlight();
      }
    }

    if (player.action === 'fly') {
      player.flightTimer -= delta;
      if (player.flightTimer > 0) {
        // Flapping propulsion
        if (player.vy > 60) player.vy = 60;
      } else {
        // Tired falling
        player.vy += CONSTANTS.GRAVITY * 0.5 * delta;
      }
    }
  }

  // Knuckles: Gliding & Climbing
  if (player.character === 'knuckles') {
    if (!player.grounded && inputs.jumpPressed && player.action !== 'glide') {
      player.action = 'glide';
      player.glideSpeed = 380;
      player.vy = 40; // Gliding downwards gently
    }

    if (player.action === 'glide') {
      player.vx = player.facing * player.glideSpeed;
      player.vy = 35; // Gentle sink

      // Turn around in air
      if (inputs.left && player.facing === 1) player.facing = -1;
      if (inputs.right && player.facing === -1) player.facing = 1;
    }

    if (player.action === 'climb') {
      player.vx = 0;
      if (inputs.up) {
        player.vy = -160;
      } else if (inputs.down) {
        player.vy = 160;
      } else {
        player.vy = 0;
      }

      // Jump off wall
      if (inputs.jumpPressed) {
        player.action = 'jump';
        player.facing = player.facing === 1 ? -1 : 1;
        player.vx = player.facing * 300;
        player.vy = CONSTANTS.JUMP_IMPULSE * 0.85;
        sonicAudio.playJump();
      }
    }
  }

  // Homing Attack execution
  if (player.action === 'homing' && player.homingTarget) {
    const tx = player.homingTarget.x;
    const ty = player.homingTarget.y;
    const dx = tx - player.x;
    const dy = ty - player.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 15) {
      player.vx = (dx / dist) * CONSTANTS.HOMING_SPEED;
      player.vy = (dy / dist) * CONSTANTS.HOMING_SPEED;
    } else {
      // Reached target
      player.action = 'jump';
      player.vy = -340; // Rebound
      player.homingTarget = null;
    }
  }

  // --- 5. JUMP LOGIC ---
  if (player.grounded && inputs.jumpPressed) {
    player.grounded = false;
    player.isJumping = true;
    player.isRolling = true;
    player.action = 'jump';
    player.vy = CONSTANTS.JUMP_IMPULSE;
    sonicAudio.playJump();
  }

  // --- 6. GRAVITY & VERTICAL PHYSICS ---
  if (!player.grounded && player.action !== 'homing' && player.action !== 'climb') {
    if (player.action !== 'glide') {
      player.vy += CONSTANTS.GRAVITY * delta;
      if (player.vy > CONSTANTS.MAX_FALL_SPEED) player.vy = CONSTANTS.MAX_FALL_SPEED;
    }
  }

  // Move position
  player.x += player.vx * delta;
  player.y += player.vy * delta;

  // --- 7. 360-DEGREE LOOP COLLISION & TRAVERSAL ---
  for (const loop of level.loops) {
    const dx = player.x - loop.x;
    const dy = player.y - loop.y;
    const dist = Math.hypot(dx, dy);

    // If player is inside the loop's outer cylinder and has high speed
    if (dist < loop.radius + 35 && dist > loop.radius - 35) {
      if (Math.abs(player.vx) > 260) {
        // Guide player around circumference
        const currAngle = Math.atan2(dy, dx);
        const speedAng = (player.vx / loop.radius) * delta;
        const newAngle = currAngle + speedAng;

        player.x = loop.x + Math.cos(newAngle) * loop.radius;
        player.y = loop.y + Math.sin(newAngle) * loop.radius;
        player.angle = newAngle + Math.PI / 2;
        player.grounded = true;
        player.action = Math.abs(player.vx) > 400 ? 'sprint' : 'run';
      }
    }
  }

  // --- 8. SLOPE & PLATFORM COLLISIONS ---
  let onGroundThisFrame = false;
  player.angle = 0;

  // Slopes
  for (const slope of level.slopes) {
    if (player.x >= slope.x1 && player.x <= slope.x2) {
      const t = (player.x - slope.x1) / (slope.x2 - slope.x1);
      const groundY = slope.y1 + t * (slope.y2 - slope.y1);

      if (player.y + player.radius >= groundY - 12 && player.y - player.radius <= groundY + 16) {
        if (player.vy >= 0 || player.grounded) {
          player.y = groundY - player.radius;
          player.vy = 0;
          onGroundThisFrame = true;

          // Slope angle acceleration
          const angle = Math.atan2(slope.y2 - slope.y1, slope.x2 - slope.x1);
          player.angle = angle;
          // Downhill accelerates, uphill slows down
          const slopeForce = Math.sin(angle) * 380;
          player.vx += slopeForce * delta;
        }
      }
    }
  }

  // Flat platforms
  for (const plat of level.platforms) {
    const left = plat.x;
    const right = plat.x + plat.w;
    const top = plat.y;
    const bot = plat.y + plat.h;

    // Check collision
    if (player.x + player.radius > left && player.x - player.radius < right) {
      // Landing on top
      if (
        player.y + player.radius >= top &&
        player.y + player.radius <= top + 24 &&
        player.vy >= 0
      ) {
        player.y = top - player.radius;
        player.vy = 0;
        onGroundThisFrame = true;
      }
      // Ceiling bonk
      else if (
        player.y - player.radius <= bot &&
        player.y - player.radius >= bot - 20 &&
        player.vy < 0
      ) {
        player.y = bot + player.radius;
        player.vy = 0;
      }
    }

    // Knuckles wall climbing collision
    if (player.character === 'knuckles' && player.action === 'glide') {
      if (player.y > top && player.y < bot) {
        if (player.facing === 1 && Math.abs(player.x + player.radius - left) < 14) {
          player.action = 'climb';
          player.climbWallX = left - player.radius;
          player.x = player.climbWallX;
          sonicAudio.playSkid();
        } else if (player.facing === -1 && Math.abs(player.x - player.radius - right) < 14) {
          player.action = 'climb';
          player.climbWallX = right + player.radius;
          player.x = player.climbWallX;
          sonicAudio.playSkid();
        }
      }
    }
  }

  player.grounded = onGroundThisFrame;
  if (player.grounded) {
    if (player.action === 'jump' || player.action === 'fly' || player.action === 'glide') {
      player.isJumping = false;
      player.isRolling = false;
      player.action = Math.abs(player.vx) > 30 ? 'run' : 'idle';
    }
  }

  // --- 9. ENTITY INTERACTIONS & GIMMICKS ---
  for (const ent of level.entities) {
    if (!ent.active) continue;

    const dx = player.x - ent.x;
    const dy = player.y - ent.y;
    const dist = Math.hypot(dx, dy);

    // Standard Ring
    if (ent.type === 'ring' && !ent.collected) {
      // Magnet Shield pull
      if (player.shield === 'magnet' && dist < 140) {
        ent.x += (player.x - ent.x) * 0.14;
        ent.y += (player.y - ent.y) * 0.14;
      }

      if (dist < player.radius + 14) {
        ent.collected = true;
        ent.active = false;
        sonicAudio.playRing();
        onRingChange(1);
        onScoreAdd(100);

        particles.push({
          x: ent.x,
          y: ent.y,
          vx: 0,
          vy: -20,
          color: '#fbbf24',
          size: 6,
          life: 0.25,
          maxLife: 0.25,
          type: 'ring_sparkle',
        });
      }
    }

    // Scattered Rings (from taking damage)
    if (ent.type === 'scatter_ring' && !ent.collected) {
      // Physics for scattered rings
      ent.x += (ent.vx || 0) * delta;
      ent.y += (ent.vy || 0) * delta;
      ent.vy = (ent.vy || 0) + CONSTANTS.GRAVITY * 0.7 * delta;

      // Bounce on ground
      if (ent.y > 450) {
        ent.y = 450;
        ent.vy = -(ent.vy || 0) * 0.65;
      }

      ent.timer = (ent.timer || 0) + delta;
      if (ent.timer > 6) {
        ent.active = false; // Despawn after 6s
      }

      // Can be recollected after 0.5s
      if (ent.timer > 0.5 && dist < player.radius + 14) {
        ent.collected = true;
        ent.active = false;
        sonicAudio.playRing();
        onRingChange(1);
        onScoreAdd(50);
      }
    }

    // Springs
    if (ent.type === 'spring_yellow_up') {
      if (
        player.x > ent.x - 20 &&
        player.x < ent.x + 20 &&
        player.y + player.radius >= ent.y - 12 &&
        player.y + player.radius <= ent.y + 12 &&
        player.vy >= 0
      ) {
        player.vy = CONSTANTS.SPRING_YELLOW_IMPULSE;
        player.grounded = false;
        player.action = 'jump';
        sonicAudio.playSpring();
        ent.state = 1; // compressed/springing
        setTimeout(() => (ent.state = 0), 250);
      }
    }

    if (ent.type === 'spring_red_up') {
      if (
        player.x > ent.x - 20 &&
        player.x < ent.x + 20 &&
        player.y + player.radius >= ent.y - 12 &&
        player.y + player.radius <= ent.y + 12 &&
        player.vy >= 0
      ) {
        player.vy = CONSTANTS.SPRING_RED_IMPULSE;
        player.grounded = false;
        player.action = 'jump';
        sonicAudio.playSpring();
        ent.state = 1;
        setTimeout(() => (ent.state = 0), 250);
      }
    }

    if (ent.type === 'spring_yellow_right') {
      if (
        Math.abs(player.y - ent.y) < 22 &&
        player.x + player.radius >= ent.x - 12 &&
        player.x - player.radius <= ent.x + 12
      ) {
        player.vx = CONSTANTS.SPRING_HORIZONTAL_IMPULSE;
        player.facing = 1;
        sonicAudio.playSpring();
        ent.state = 1;
        setTimeout(() => (ent.state = 0), 250);
      }
    }

    if (ent.type === 'spring_yellow_left') {
      if (
        Math.abs(player.y - ent.y) < 22 &&
        player.x + player.radius >= ent.x - 12 &&
        player.x - player.radius <= ent.x + 12
      ) {
        player.vx = -CONSTANTS.SPRING_HORIZONTAL_IMPULSE;
        player.facing = -1;
        sonicAudio.playSpring();
        ent.state = 1;
        setTimeout(() => (ent.state = 0), 250);
      }
    }

    // Dash Pads
    if (ent.type === 'dash_pad_right') {
      if (
        Math.abs(player.x - ent.x) < 28 &&
        player.y + player.radius >= ent.y - 10 &&
        player.y + player.radius <= ent.y + 12
      ) {
        player.vx = Math.max(player.vx, CONSTANTS.BOOST_PAD_SPEED);
        player.facing = 1;
        player.action = 'sprint';
        sonicAudio.playDashPad();
      }
    }

    // Item Boxes
    if (ent.type === 'item_box' && !ent.collected) {
      if (dist < player.radius + 18) {
        const isAttacking =
          player.isRolling ||
          player.action === 'jump' ||
          player.action === 'homing' ||
          player.invincibleTimer > 0;

        if (isAttacking) {
          ent.collected = true;
          ent.active = false;
          sonicAudio.playDestroy();
          onScoreAdd(200);

          // Apply item effect
          if (ent.itemType === 'ring10') {
            onRingChange(10);
            sonicAudio.playRing();
            scorePopups.push({ x: ent.x, y: ent.y, text: '+10 RINGS', color: '#fbbf24', life: 1.0 });
          } else if (ent.itemType === 'shield') {
            player.shield = 'basic';
            scorePopups.push({ x: ent.x, y: ent.y, text: 'SHIELD', color: '#38bdf8', life: 1.0 });
          } else if (ent.itemType === 'magnet') {
            player.shield = 'magnet';
            scorePopups.push({ x: ent.x, y: ent.y, text: 'MAGNET SHIELD', color: '#a855f7', life: 1.0 });
          } else if (ent.itemType === 'shoes') {
            player.speedShoesTimer = 18.0;
            scorePopups.push({ x: ent.x, y: ent.y, text: 'SPEED UP!', color: '#ef4444', life: 1.0 });
          } else if (ent.itemType === 'invincible') {
            player.invincibleTimer = 15.0;
            sonicAudio.startInvincibleBGM();
            scorePopups.push({ x: ent.x, y: ent.y, text: 'INVINCIBLE!', color: '#eab308', life: 1.0 });
          } else if (ent.itemType === 'life') {
            sonicAudio.playOneUp();
            scorePopups.push({ x: ent.x, y: ent.y, text: '1 UP!', color: '#22c55e', life: 1.2 });
          }

          // Explosion particles
          for (let i = 0; i < 6; i++) {
            particles.push({
              x: ent.x,
              y: ent.y,
              vx: (Math.random() - 0.5) * 160,
              vy: -60 - Math.random() * 100,
              color: '#f8fafc',
              size: 5,
              life: 0.3,
              maxLife: 0.3,
              type: 'explosion',
            });
          }

          // Small bounce if player jumped on it
          if (player.vy > 0) player.vy = -260;
        }
      }
    }

    // Badnik Enemies
    if (ent.type.startsWith('enemy_') && !ent.collected) {
      // Enemy movement AI
      if (ent.type === 'enemy_motobug') {
        ent.vx = (ent.facing || -1) * 60;
        ent.x += ent.vx * delta;
        if (Math.abs(ent.x - (ent.originX || ent.x)) > (ent.range || 120)) {
          ent.facing = ent.facing === 1 ? -1 : 1;
        }
      } else if (ent.type === 'enemy_chopper') {
        // Jump up and down from water
        ent.timer = (ent.timer || 0) + delta * 2.5;
        ent.y = (ent.originY || 400) + Math.sin(ent.timer) * 90;
      } else if (ent.type === 'enemy_buzzbomber') {
        // Hover and shoot
        ent.x += (ent.facing || -1) * 80 * delta;
        if (Math.abs(ent.x - (ent.originX || ent.x)) > (ent.range || 150)) {
          ent.facing = ent.facing === 1 ? -1 : 1;
        }
      }

      if (dist < player.radius + 16) {
        const isAttacking =
          player.isRolling ||
          player.action === 'jump' ||
          player.action === 'homing' ||
          player.invincibleTimer > 0;

        if (isAttacking) {
          // Destroy Badnik!
          ent.collected = true;
          ent.active = false;
          sonicAudio.playDestroy();
          sonicAudio.playAnimal();
          onScoreAdd(500);

          scorePopups.push({ x: ent.x, y: ent.y, text: '500', color: '#ffffff', life: 0.8 });

          // Spawn cute animal
          animals.push({
            x: ent.x,
            y: ent.y,
            vx: player.facing * 70,
            vy: -180,
            type: Math.random() > 0.5 ? 'rabbit' : 'bird',
            groundY: 450,
            timer: 0,
          });

          // Explosion particles
          for (let i = 0; i < 8; i++) {
            particles.push({
              x: ent.x,
              y: ent.y,
              vx: (Math.random() - 0.5) * 200,
              vy: -40 - Math.random() * 120,
              color: '#f97316',
              size: 6,
              life: 0.35,
              maxLife: 0.35,
              type: 'explosion',
            });
          }

          if (player.vy > 0) player.vy = -300; // Bounce off enemy
        } else if (player.invulnerableTimer <= 0) {
          // Player hurt!
          onPlayerHurt();
        }
      }
    }

    // Spikes
    if (ent.type === 'spikes') {
      if (
        player.x > ent.x - 16 &&
        player.x < ent.x + 16 &&
        player.y + player.radius >= ent.y - 8 &&
        player.y + player.radius <= ent.y + 16
      ) {
        if (player.invulnerableTimer <= 0 && player.invincibleTimer <= 0) {
          onPlayerHurt();
        }
      }
    }

    // Starpost Checkpoint
    if (ent.type === 'starpost' && !ent.passed) {
      if (Math.abs(player.x - ent.x) < 24 && Math.abs(player.y - ent.y) < 36) {
        ent.passed = true;
        level.spawnX = ent.x;
        level.spawnY = ent.y - 20;
        sonicAudio.playCheckpoint();
        scorePopups.push({ x: ent.x, y: ent.y - 30, text: 'CHECKPOINT!', color: '#38bdf8', life: 1.2 });
      }
    }

    // Goal Plate
    if (ent.type === 'goal_plate' && !ent.passed) {
      if (player.x >= ent.x && Math.abs(player.y - ent.y) < 60) {
        ent.passed = true;
        sonicAudio.playGoalPlate();
        sonicAudio.playClearJingle();
        player.action = 'win';
        player.vx = 260; // Run off screen happily
        setTimeout(() => {
          onLevelComplete();
        }, 3200);
      }
    }

    // Capsule (Act 2 prison button)
    if (ent.type === 'capsule' && !ent.passed) {
      // Step on top switch
      if (
        player.x > ent.x - 24 &&
        player.x < ent.x + 24 &&
        player.y + player.radius >= ent.y - 34 &&
        player.y + player.radius <= ent.y - 18 &&
        player.vy >= 0
      ) {
        ent.passed = true;
        player.vy = -260;
        sonicAudio.playDestroy();
        sonicAudio.playClearJingle();

        // Release flock of animals!
        for (let i = 0; i < 12; i++) {
          animals.push({
            x: ent.x + (Math.random() - 0.5) * 40,
            y: ent.y - 10,
            vx: (Math.random() - 0.5) * 220,
            vy: -150 - Math.random() * 180,
            type: i % 2 === 0 ? 'bird' : 'rabbit',
            groundY: 450,
            timer: 0,
          });
        }

        setTimeout(() => {
          onLevelComplete();
        }, 4000);
      }
    }
  }

  // --- 10. ANIMATION ACTION STATE DERIVATION ---
  if (player.grounded) {
    if (player.action !== 'win' && !player.isRolling) {
      const speed = Math.abs(player.vx);
      if (speed < 10) {
        player.action = 'idle';
      } else if (speed < 180) {
        player.action = 'walk';
      } else if (speed < 380) {
        player.action = 'run';
      } else {
        player.action = 'sprint'; // Super peel-out infinity legs!
      }
    }
  }

  // Animate frame ticker
  player.animTimer += delta * (Math.abs(player.vx) * 0.05 + 8);
  if (player.animTimer > 1) {
    player.animFrame = (player.animFrame + 1) % 8;
    player.animTimer = 0;
  }

  // --- 11. PARTICLES & ANIMALS UPDATE ---
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * delta;
    p.y += p.vy * delta;
    p.life -= delta;
    if (p.life <= 0) particles.splice(i, 1);
  }

  for (let i = scorePopups.length - 1; i >= 0; i--) {
    const pop = scorePopups[i];
    pop.y -= 30 * delta;
    pop.life -= delta;
    if (pop.life <= 0) scorePopups.splice(i, 1);
  }

  for (let i = animals.length - 1; i >= 0; i--) {
    const a = animals[i];
    a.x += a.vx * delta;
    a.y += a.vy * delta;
    a.vy += CONSTANTS.GRAVITY * 0.7 * delta;
    if (a.y >= a.groundY) {
      a.y = a.groundY;
      a.vy = -140; // Hop!
    }
    a.timer += delta;
    if (a.timer > 8) animals.splice(i, 1);
  }

  // Pit death check
  if (player.y > level.height + 60) {
    onPlayerHurt();
    player.y = level.spawnY;
    player.x = level.spawnX;
    player.vx = 0;
    player.vy = 0;
  }
}
