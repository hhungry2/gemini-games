// Sonic Speed Rush - Dr. Eggman Boss AI & Battle Arena

import { BossState, Player, Particle, ScorePopup } from './types';
import { sonicAudio } from './audio';

export function createBossState(originX = 750, originY = 240): BossState {
  return {
    x: originX,
    y: originY,
    originX,
    originY,
    vx: 0,
    vy: 0,
    hp: 8,
    maxHp: 8,
    phase: 'intro',
    phaseTimer: 0,
    ballAngle: 0,
    ballAngleVel: 1.8,
    ballRadius: 100,
    invulnerableTimer: 0,
    active: true,
  };
}

export function updateBoss(
  boss: BossState,
  player: Player,
  dt: number,
  particles: Particle[],
  scorePopups: ScorePopup[],
  onBossDefeated: () => void,
  onPlayerHurt: () => void
) {
  if (!boss.active) return;
  const delta = Math.min(dt, 0.035);

  boss.phaseTimer += delta;
  if (boss.invulnerableTimer > 0) {
    boss.invulnerableTimer -= delta;
  }

  // --- Boss State Machine ---
  switch (boss.phase) {
    case 'intro':
      // Hover downwards into position
      boss.y += (boss.originY - boss.y) * 0.05;
      if (boss.phaseTimer > 2.0) {
        boss.phase = 'attack_swing';
        boss.phaseTimer = 0;
      }
      break;

    case 'attack_swing':
      // Sway left and right while swinging heavy wrecking ball
      boss.x = boss.originX + Math.sin(boss.phaseTimer * 1.2) * 160;
      boss.y = boss.originY + Math.cos(boss.phaseTimer * 2.4) * 20;

      // Ball pendulum physics
      boss.ballAngle += boss.ballAngleVel * delta;

      if (boss.phaseTimer > 8.0) {
        boss.phase = 'attack_laser';
        boss.phaseTimer = 0;
      }
      break;

    case 'attack_laser':
      // Drift towards player then fire sparks
      boss.x += Math.sign(player.x - boss.x) * 90 * delta;
      boss.y = boss.originY + 30;

      // Emit energy sparks
      if (Math.random() < 0.15) {
        particles.push({
          x: boss.x + (Math.random() - 0.5) * 30,
          y: boss.y + 24,
          vx: (Math.random() - 0.5) * 50,
          vy: 120 + Math.random() * 60,
          color: '#f43f5e',
          size: 5,
          life: 0.5,
          maxLife: 0.5,
          type: 'spark',
        });
      }

      if (boss.phaseTimer > 5.0) {
        boss.phase = 'attack_swing';
        boss.phaseTimer = 0;
      }
      break;

    case 'hit':
      // Knockback recoil
      boss.y = boss.originY - 20;
      if (boss.phaseTimer > 0.6) {
        boss.phase = 'attack_swing';
        boss.phaseTimer = 0;
      }
      break;

    case 'defeated':
      // Smoke explosions and fleeing upwards
      boss.y -= 50 * delta;
      boss.x += (Math.random() - 0.5) * 4;

      if (Math.random() < 0.3) {
        sonicAudio.playDestroy();
        particles.push({
          x: boss.x + (Math.random() - 0.5) * 60,
          y: boss.y + (Math.random() - 0.5) * 40,
          vx: (Math.random() - 0.5) * 100,
          vy: -30 - Math.random() * 60,
          color: '#f97316',
          size: 8,
          life: 0.4,
          maxLife: 0.4,
          type: 'explosion',
        });
      }

      if (boss.phaseTimer > 3.0) {
        boss.active = false;
        onBossDefeated();
      }
      return;
  }

  // Calculate wrecking ball position
  const ballX = boss.x + Math.sin(boss.ballAngle) * boss.ballRadius;
  const ballY = boss.y + Math.cos(boss.ballAngle) * boss.ballRadius;

  // Collision: Player vs Ball (Hazard)
  const distBall = Math.hypot(player.x - ballX, player.y - ballY);
  if (distBall < player.radius + 18) {
    if (player.invulnerableTimer <= 0 && player.invincibleTimer <= 0) {
      onPlayerHurt();
    }
  }

  // Collision: Player vs Boss Body (Hittable!)
  const distBody = Math.hypot(player.x - boss.x, player.y - boss.y);
  if (distBody < player.radius + 32) {
    const isAttacking =
      player.isRolling ||
      player.action === 'jump' ||
      player.action === 'homing' ||
      player.action === 'spindash' ||
      player.invincibleTimer > 0;

    if (isAttacking && boss.invulnerableTimer <= 0) {
      // Hit Eggman!
      boss.hp -= 1;
      boss.invulnerableTimer = 1.0;
      boss.phase = 'hit';
      boss.phaseTimer = 0;
      sonicAudio.playBossHit();

      // Bounce player away
      player.vy = -320;
      player.vx = -player.facing * 200;

      scorePopups.push({
        x: boss.x,
        y: boss.y - 40,
        text: boss.hp > 0 ? `HIT! (${boss.hp} HP)` : 'DEFEATED!',
        color: '#fbbf24',
        life: 1.0,
      });

      // Sparks
      for (let i = 0; i < 10; i++) {
        particles.push({
          x: boss.x,
          y: boss.y,
          vx: (Math.random() - 0.5) * 220,
          vy: -60 - Math.random() * 120,
          color: '#fbbf24',
          size: 6,
          life: 0.35,
          maxLife: 0.35,
          type: 'spark',
        });
      }

      if (boss.hp <= 0) {
        boss.phase = 'defeated';
        boss.phaseTimer = 0;
        sonicAudio.stopBGM();
      }
    } else if (!isAttacking && player.invulnerableTimer <= 0 && player.invincibleTimer <= 0) {
      // Player touched boss without attacking
      onPlayerHurt();
    }
  }
}
