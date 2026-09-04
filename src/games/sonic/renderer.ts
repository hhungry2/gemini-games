// Sonic Speed Rush - Canvas 2D Vector Renderer

import {
  Player,
  LevelData,
  Entity,
  Particle,
  ScorePopup,
  Animal,
  LoopGimmick,
} from './types';

export const CANVAS_WIDTH = 960;
export const CANVAS_HEIGHT = 540;

export function renderGame(
  ctx: CanvasRenderingContext2D,
  player: Player,
  level: LevelData,
  particles: Particle[],
  scorePopups: ScorePopup[],
  animals: Animal[],
  cameraX: number,
  cameraY: number,
  stats: { score: number; rings: number; time: number; lives: number },
  isDark: boolean
) {
  ctx.save();
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // --- 1. PARALLAX BACKGROUND ---
  renderParallaxBackground(ctx, cameraX, isDark);

  // World transform for camera
  ctx.save();
  ctx.translate(-cameraX, -cameraY);

  // --- 2. TERRAIN & PLATFORMS ---
  renderTerrain(ctx, level, cameraX);

  // --- 3. 360-DEGREE LOOPS ---
  for (const loop of level.loops) {
    renderLoop(ctx, loop);
  }

  // --- 4. ENTITIES & GIMMICKS ---
  for (const ent of level.entities) {
    if (!ent.active) continue;
    // Frustum culling
    if (ent.x + ent.width < cameraX - 50 || ent.x - ent.width > cameraX + CANVAS_WIDTH + 50) {
      continue;
    }
    renderEntity(ctx, ent);
  }

  // --- 5. ANIMALS ---
  for (const a of animals) {
    renderAnimal(ctx, a);
  }

  // --- 6. DR. EGGMAN BOSS ---
  if (level.boss && level.boss.active) {
    renderBoss(ctx, level.boss);
  }

  // --- 7. PLAYER & AFTERIMAGES ---
  renderPlayerWithTrail(ctx, player);

  // --- 8. PARTICLES & POPUPS ---
  renderParticles(ctx, particles);
  renderScorePopups(ctx, scorePopups);

  // --- 9. HOMING ATTACK RETICLE ---
  if (player.homingTarget && player.action === 'homing') {
    renderHomingReticle(ctx, player.homingTarget.x, player.homingTarget.y);
  }

  ctx.restore(); // Restore camera transform

  // --- 10. HUD DISPLAY ---
  renderHUD(ctx, stats, player.vx);

  ctx.restore();
}

function renderParallaxBackground(
  ctx: CanvasRenderingContext2D,
  cameraX: number,
  isDark: boolean
) {
  // Sky Gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT * 0.75);
  if (isDark) {
    skyGrad.addColorStop(0, '#0f172a');
    skyGrad.addColorStop(0.5, '#1e1b4b');
    skyGrad.addColorStop(1, '#312e81');
  } else {
    skyGrad.addColorStop(0, '#2563eb');
    skyGrad.addColorStop(0.45, '#60a5fa');
    skyGrad.addColorStop(0.75, '#bae6fd');
    skyGrad.addColorStop(1, '#fef08a');
  }
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Parallax Layer 1: Distant Mountains (moves at 0.05 speed)
  ctx.save();
  const mtnOffset = -(cameraX * 0.05) % 400;
  ctx.fillStyle = isDark ? '#1e293b' : '#38bdf8';
  ctx.globalAlpha = 0.5;
  for (let x = mtnOffset - 400; x < CANVAS_WIDTH + 400; x += 300) {
    ctx.beginPath();
    ctx.moveTo(x, 340);
    ctx.lineTo(x + 150, 160);
    ctx.lineTo(x + 300, 340);
    ctx.fill();
  }
  ctx.restore();

  // Parallax Layer 2: Sparkling Ocean & Waterfalls (moves at 0.15 speed)
  const oceanY = 320;
  const oceanGrad = ctx.createLinearGradient(0, oceanY, 0, 450);
  oceanGrad.addColorStop(0, isDark ? '#1e3a8a' : '#0284c7');
  oceanGrad.addColorStop(1, isDark ? '#172554' : '#0369a1');
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, oceanY, CANVAS_WIDTH, 130);

  // Sea reflection stripes
  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha = 0.25;
  const seaOffset = -(cameraX * 0.15) % 120;
  for (let y = oceanY + 10; y < 440; y += 16) {
    for (let x = seaOffset - 120; x < CANVAS_WIDTH + 120; x += 90) {
      ctx.fillRect(x + (y % 30), y, 35, 2);
    }
  }
  ctx.globalAlpha = 1.0;

  // Parallax Layer 3: Palm Trees and Clouds (moves at 0.3 speed)
  const palmOffset = -(cameraX * 0.3) % 360;
  for (let x = palmOffset - 360; x < CANVAS_WIDTH + 360; x += 280) {
    renderPalmTree(ctx, x, 360);
  }
}

function renderPalmTree(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  // Trunk
  ctx.strokeStyle = '#92400e';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + 12, y - 60, x + 6, y - 110);
  ctx.stroke();

  // Trunk rings
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    const ty = y - 20 - i * 18;
    ctx.beginPath();
    ctx.moveTo(x - 4, ty);
    ctx.lineTo(x + 12, ty - 3);
    ctx.stroke();
  }

  // Leaves
  ctx.fillStyle = '#15803d';
  const leafAngles = [-0.9, -0.4, 0.1, 0.6, 1.1];
  const topX = x + 6;
  const topY = y - 110;
  for (const ang of leafAngles) {
    ctx.beginPath();
    ctx.ellipse(
      topX + Math.cos(ang) * 35,
      topY + Math.sin(ang) * 20,
      35,
      12,
      ang,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }
  ctx.restore();
}

function renderTerrain(ctx: CanvasRenderingContext2D, level: LevelData, cameraX: number) {
  // Render platforms with classic Green Hill brown checkerboard & grass top
  for (const p of level.platforms) {
    if (p.x + p.w < cameraX - 50 || p.x > cameraX + CANVAS_WIDTH + 50) continue;

    ctx.save();
    // Brown checker fill
    const tileSize = 32;
    for (let bx = p.x; bx < p.x + p.w; bx += tileSize) {
      for (let by = p.y; by < p.y + p.h; by += tileSize) {
        const col = Math.floor(bx / tileSize);
        const row = Math.floor(by / tileSize);
        ctx.fillStyle = (col + row) % 2 === 0 ? '#b45309' : '#d97706';
        ctx.fillRect(
          bx,
          by,
          Math.min(tileSize, p.x + p.w - bx),
          Math.min(tileSize, p.y + p.h - by)
        );

        // Inner tile checker outline
        ctx.strokeStyle = '#92400e';
        ctx.lineWidth = 1;
        ctx.strokeRect(
          bx,
          by,
          Math.min(tileSize, p.x + p.w - bx),
          Math.min(tileSize, p.y + p.h - by)
        );
      }
    }

    // Lush Green grass on top
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(p.x, p.y, p.w, 14);

    // Grass blades pattern
    ctx.fillStyle = '#16a34a';
    for (let gx = p.x; gx < p.x + p.w; gx += 16) {
      ctx.beginPath();
      ctx.moveTo(gx, p.y + 14);
      ctx.lineTo(gx + 8, p.y + 22);
      ctx.lineTo(gx + 16, p.y + 14);
      ctx.fill();
    }
    ctx.restore();
  }

  // Slopes
  for (const s of level.slopes) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(s.x1, s.y1);
    ctx.lineTo(s.x2, s.y2);
    ctx.lineTo(s.x2, s.y2 + 80);
    ctx.lineTo(s.x1, s.y1 + 80);
    ctx.closePath();

    ctx.fillStyle = '#b45309';
    ctx.fill();

    // Grass line
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(s.x1, s.y1);
    ctx.lineTo(s.x2, s.y2);
    ctx.stroke();
    ctx.restore();
  }
}

function renderLoop(ctx: CanvasRenderingContext2D, loop: LoopGimmick) {
  ctx.save();
  // Outer loop ring
  ctx.strokeStyle = '#b45309';
  ctx.lineWidth = 26;
  ctx.beginPath();
  ctx.arc(loop.x, loop.y, loop.radius, 0, Math.PI * 2);
  ctx.stroke();

  // Green turf on loop circumference
  ctx.strokeStyle = '#22c55e';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(loop.x, loop.y, loop.radius - 12, 0, Math.PI * 2);
  ctx.stroke();

  // Checker lines along loop
  ctx.strokeStyle = '#92400e';
  ctx.lineWidth = 2;
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
    const x1 = loop.x + Math.cos(a) * (loop.radius - 13);
    const y1 = loop.y + Math.sin(a) * (loop.radius - 13);
    const x2 = loop.x + Math.cos(a) * (loop.radius + 13);
    const y2 = loop.y + Math.sin(a) * (loop.radius + 13);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  ctx.restore();
}

function renderEntity(ctx: CanvasRenderingContext2D, ent: Entity) {
  ctx.save();
  ctx.translate(ent.x, ent.y);

  switch (ent.type) {
    case 'ring':
    case 'scatter_ring': {
      // Rotating 3D gold ring
      const t = Date.now() * 0.006;
      const widthScale = Math.abs(Math.cos(t));
      ctx.scale(Math.max(0.2, widthScale), 1);

      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, Math.PI * 2);
      ctx.fill();

      // Hollow inner hole
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();

      // Gold highlight sheen
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }

    case 'spring_yellow_up':
    case 'spring_red_up': {
      const isRed = ent.type === 'spring_red_up';
      const compressed = ent.state === 1;
      const h = compressed ? 8 : 18;

      // Base plate
      ctx.fillStyle = '#64748b';
      ctx.fillRect(-16, 6, 32, 6);

      // Spring coil
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-10, 6);
      ctx.lineTo(10, 0);
      ctx.lineTo(-10, -h / 2);
      ctx.lineTo(10, -h);
      ctx.stroke();

      // Top bumper
      ctx.fillStyle = isRed ? '#ef4444' : '#eab308';
      ctx.beginPath();
      ctx.roundRect(-16, -h - 4, 32, 7, 3);
      ctx.fill();
      break;
    }

    case 'spring_yellow_right': {
      ctx.fillStyle = '#64748b';
      ctx.fillRect(-10, -16, 6, 32);
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.roundRect(0, -16, 7, 32, 3);
      ctx.fill();
      break;
    }

    case 'spring_yellow_left': {
      ctx.fillStyle = '#64748b';
      ctx.fillRect(4, -16, 6, 32);
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.roundRect(-7, -16, 7, 32, 3);
      ctx.fill();
      break;
    }

    case 'dash_pad_right': {
      // Glowing neon booster pad with scrolling arrows
      ctx.fillStyle = '#334155';
      ctx.fillRect(-24, 0, 48, 12);

      const t = (Date.now() * 0.01) % 18;
      ctx.fillStyle = '#38bdf8';
      for (let i = -18 + t; i < 22; i += 18) {
        ctx.beginPath();
        ctx.moveTo(i - 4, 2);
        ctx.lineTo(i + 4, 6);
        ctx.lineTo(i - 4, 10);
        ctx.fill();
      }
      break;
    }

    case 'item_box': {
      // Classic MD Monitor
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(-15, -15, 30, 30, 6);
      ctx.fill();
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Screen inside
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(-10, -10, 20, 20);

      // Icon on screen
      if (ent.itemType === 'ring10') {
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fill();
      } else if (ent.itemType === 'shield') {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.stroke();
      } else if (ent.itemType === 'magnet') {
        ctx.fillStyle = '#c084fc';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('M', 0, 1);
      } else if (ent.itemType === 'shoes') {
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-5, -2, 10, 5);
      } else if (ent.itemType === 'invincible') {
        ctx.fillStyle = '#fef08a';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('★', 0, 1);
      } else if (ent.itemType === 'life') {
        ctx.fillStyle = '#2563eb';
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 'spikes': {
      ctx.fillStyle = '#94a3b8';
      for (let i = -16; i <= 16; i += 10) {
        ctx.beginPath();
        ctx.moveTo(i, 8);
        ctx.lineTo(i + 5, -8);
        ctx.lineTo(i + 10, 8);
        ctx.fill();
      }
      break;
    }

    case 'starpost': {
      // Checkpoint pole
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(-3, -28, 6, 56);

      // Star ball on top
      ctx.fillStyle = ent.passed ? '#38bdf8' : '#eab308';
      ctx.beginPath();
      ctx.arc(0, -32, 9, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'goal_plate': {
      // Spinning Goal Plate
      ctx.fillStyle = '#64748b';
      ctx.fillRect(-4, 0, 8, 40);

      // The Plate
      const spinAngle = ent.passed ? Date.now() * 0.015 : 0;
      const sx = Math.cos(spinAngle);
      ctx.scale(sx, 1);

      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(-22, -40, 44, 40, 6);
      ctx.fill();
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Sonic Face on Plate!
      if (ent.passed) {
        ctx.fillStyle = '#2563eb';
        ctx.beginPath();
        ctx.arc(0, -20, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(3, -20, 4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Eggman Face before pass
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(0, -20, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#78350f';
        ctx.fillRect(-8, -18, 16, 4); // Mustache
      }
      break;
    }

    case 'capsule': {
      // Animal Prisoner Capsule
      ctx.fillStyle = '#64748b';
      ctx.fillRect(-32, -30, 64, 60);

      // Glass dome
      ctx.fillStyle = '#38bdf8';
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(0, -10, 22, 0, Math.PI, true);
      ctx.fill();
      ctx.globalAlpha = 1.0;

      // Big Step button on top
      ctx.fillStyle = ent.passed ? '#15803d' : '#ef4444';
      ctx.beginPath();
      ctx.roundRect(-18, ent.passed ? -32 : -40, 36, 12, 4);
      ctx.fill();
      break;
    }

    case 'enemy_motobug': {
      const face = ent.facing || -1;
      ctx.scale(face, 1);

      // Red body shell
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.ellipse(0, 0, 18, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      // Caterpillar wheel
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(0, 10, 6, 0, Math.PI * 2);
      ctx.fill();

      // Nose & Antenna
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(14, 0, 4, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'enemy_chopper': {
      // Piranha jumping fish
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.ellipse(0, 0, 16, 14, 0, 0, Math.PI * 2);
      ctx.fill();

      // Big sharp teeth!
      ctx.fillStyle = '#ffffff';
      for (let i = -10; i <= 6; i += 5) {
        ctx.beginPath();
        ctx.moveTo(i, 4);
        ctx.lineTo(i + 2.5, 10);
        ctx.lineTo(i + 5, 4);
        ctx.fill();
      }

      // Eye
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(6, -4, 3.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'enemy_buzzbomber': {
      const face = ent.facing || -1;
      ctx.scale(face, 1);

      // Yellow & Black striped bee body
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.ellipse(0, 0, 18, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-4, -8, 5, 16);
      ctx.fillRect(4, -8, 5, 16);

      // Translucent wings buzzing
      ctx.fillStyle = '#bae6fd';
      ctx.globalAlpha = 0.7;
      const wingY = Math.sin(Date.now() * 0.05) * 6 - 12;
      ctx.beginPath();
      ctx.ellipse(-2, wingY, 14, 5, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;
      break;
    }
  }

  ctx.restore();
}

function renderAnimal(ctx: CanvasRenderingContext2D, a: Animal) {
  ctx.save();
  ctx.translate(a.x, a.y);
  const face = a.vx >= 0 ? 1 : -1;
  ctx.scale(face, 1);

  if (a.type === 'rabbit') {
    // Pink bunny
    ctx.fillStyle = '#f472b6';
    ctx.beginPath();
    ctx.ellipse(0, 0, 8, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    // Long ears
    ctx.beginPath();
    ctx.ellipse(-2, -10, 2.5, 7, -0.2, 0, Math.PI * 2);
    ctx.ellipse(3, -10, 2.5, 7, 0.2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Blue bird (Flicky)
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.ellipse(0, 0, 8, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    // Wing
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.ellipse(-2, -2, 5, 3, 0.3, 0, Math.PI * 2);
    ctx.fill();
    // Yellow beak
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.moveTo(6, 0);
    ctx.lineTo(11, 2);
    ctx.lineTo(6, 4);
    ctx.fill();
  }
  ctx.restore();
}

function renderBoss(ctx: CanvasRenderingContext2D, boss: LevelData['boss']) {
  if (!boss) return;

  ctx.save();
  ctx.translate(boss.x, boss.y);

  // Wrecking Ball Chain & Ball
  const ballX = Math.sin(boss.ballAngle) * boss.ballRadius;
  const ballY = Math.cos(boss.ballAngle) * boss.ballRadius;

  // Chain links
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, 20);
  ctx.lineTo(ballX, ballY);
  ctx.stroke();

  // Heavy steel checkered ball
  ctx.save();
  ctx.translate(ballX, ballY);
  ctx.fillStyle = '#334155';
  ctx.beginPath();
  ctx.arc(0, 0, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.restore();

  // Egg Mobile body (Spherical cockpit)
  const isHit = boss.invulnerableTimer > 0 && Math.floor(Date.now() / 80) % 2 === 0;
  ctx.fillStyle = isHit ? '#ffffff' : '#64748b';
  ctx.beginPath();
  ctx.ellipse(0, 8, 38, 26, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Glass canopy
  ctx.fillStyle = '#38bdf8';
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.arc(0, -6, 22, Math.PI, 0);
  ctx.fill();
  ctx.globalAlpha = 1.0;

  // Dr. Eggman inside!
  // Head & Red suit
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(-12, -4, 24, 16);
  ctx.fillStyle = '#fbcfe8'; // Skin
  ctx.beginPath();
  ctx.arc(0, -10, 8, 0, Math.PI * 2);
  ctx.fill();

  // Big Brown Mustache!
  ctx.fillStyle = '#78350f';
  ctx.beginPath();
  ctx.moveTo(-16, -6);
  ctx.quadraticCurveTo(0, -2, 16, -6);
  ctx.lineTo(20, -2);
  ctx.quadraticCurveTo(0, 4, -20, -2);
  ctx.fill();

  // Blue round glasses
  ctx.fillStyle = '#0284c7';
  ctx.beginPath();
  ctx.arc(-4, -11, 2.5, 0, Math.PI * 2);
  ctx.arc(4, -11, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Jet thruster flames
  ctx.fillStyle = '#f97316';
  const flameH = 12 + Math.random() * 8;
  ctx.beginPath();
  ctx.moveTo(-14, 28);
  ctx.lineTo(0, 28 + flameH);
  ctx.lineTo(14, 28);
  ctx.fill();

  ctx.restore();
}

function renderPlayerWithTrail(ctx: CanvasRenderingContext2D, player: Player) {
  // 1. Afterimage / Motion Trail
  for (let i = 0; i < player.trailHistory.length; i++) {
    const t = player.trailHistory[i];
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.rotate(t.angle);
    ctx.scale(t.facing, 1);
    ctx.globalAlpha = (1 - (i + 1) / (player.trailHistory.length + 1)) * 0.45;
    renderCharacterSprite(ctx, player.character, t.action, 0, true);
    ctx.restore();
  }

  // 2. Shield Effect
  if (player.shield !== 'none') {
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.strokeStyle = player.shield === 'magnet' ? '#c084fc' : '#38bdf8';
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.7 + Math.sin(Date.now() * 0.01) * 0.25;
    ctx.beginPath();
    ctx.arc(0, 0, player.radius + 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // 3. Invincibility Sparkles
  if (player.invincibleTimer > 0) {
    ctx.save();
    ctx.translate(player.x, player.y);
    for (let i = 0; i < 4; i++) {
      const ang = Date.now() * 0.008 + (i * Math.PI) / 2;
      const r = 26;
      ctx.fillStyle = i % 2 === 0 ? '#fde047' : '#ffffff';
      ctx.beginPath();
      ctx.arc(Math.cos(ang) * r, Math.sin(ang) * r, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 4. Main Character Sprite
  // Flicker if invulnerable
  if (player.invulnerableTimer > 0 && Math.floor(Date.now() / 60) % 2 === 0) {
    return;
  }

  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.angle);
  ctx.scale(player.facing, 1);
  renderCharacterSprite(ctx, player.character, player.action, player.animFrame, false);
  ctx.restore();
}

function renderCharacterSprite(
  ctx: CanvasRenderingContext2D,
  char: 'sonic' | 'tails' | 'knuckles',
  action: string,
  animFrame: number,
  isTrail = false
) {
  const mainColor =
    char === 'sonic'
      ? '#2563eb'
      : char === 'tails'
      ? '#f59e0b'
      : '#dc2626';

  const shoeColor =
    char === 'sonic'
      ? '#ef4444'
      : char === 'tails'
      ? '#ef4444'
      : '#eab308';

  if (isTrail) {
    // Pure silhouette for trail
    ctx.fillStyle = mainColor;
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  // Rolling / Spindash / Spin Jump: Fast spinning ball
  if (action === 'roll' || action === 'spindash' || action === 'jump' || action === 'homing') {
    ctx.save();
    const spinAngle = Date.now() * 0.025;
    ctx.rotate(spinAngle);

    // Ball body
    ctx.fillStyle = mainColor;
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fill();

    // Spines blur
    ctx.strokeStyle = '#1d4ed8';
    ctx.lineWidth = 3.5;
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 11, Math.sin(a) * 11);
      ctx.lineTo(Math.cos(a) * 18, Math.sin(a) * 18);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  // Super Peel-Out / Sprint: Famous Infinity Legs!
  if (action === 'sprint') {
    // Head & Torso tilted forward
    ctx.save();
    ctx.rotate(0.35); // Lean forward

    // Torso
    ctx.fillStyle = mainColor;
    ctx.beginPath();
    ctx.ellipse(0, 0, 11, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // Spikes pointing back
    ctx.fillStyle = mainColor;
    ctx.beginPath();
    ctx.moveTo(-5, -6);
    ctx.lineTo(-24, -12);
    ctx.lineTo(-10, 2);
    ctx.lineTo(-26, 0);
    ctx.lineTo(-8, 8);
    ctx.fill();

    // Peach Muzzle
    ctx.fillStyle = '#fed7aa';
    ctx.beginPath();
    ctx.arc(5, -6, 6.5, 0, Math.PI * 2);
    ctx.fill();

    // Eye
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(4, -8, 4, 6, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(6, -8, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Red ∞ Infinity Wheel Legs!
    ctx.save();
    ctx.translate(-2, 12);
    ctx.strokeStyle = shoeColor;
    ctx.lineWidth = 6;
    ctx.beginPath();
    const t = Date.now() * 0.035;
    ctx.ellipse(Math.cos(t) * 6, Math.sin(t) * 4, 15, 6, 0.2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    return;
  }

  // Tails Flying
  if (action === 'fly' && char === 'tails') {
    // Tails Helicopter propeller tails spinning
    ctx.save();
    ctx.fillStyle = '#f59e0b';
    const propAngle = Date.now() * 0.04;
    ctx.beginPath();
    ctx.ellipse(-14, -6, 18, 4, propAngle, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Knuckles Gliding
  if (action === 'glide' && char === 'knuckles') {
    // Flat wingspan glide
    ctx.fillStyle = mainColor;
    ctx.beginPath();
    ctx.ellipse(0, 0, 18, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    // Spiked fists out front
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(16, 2, 5, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  // Default Standing / Walking / Running
  // Torso
  ctx.fillStyle = mainColor;
  ctx.beginPath();
  ctx.ellipse(0, 0, 10, 13, 0, 0, Math.PI * 2);
  ctx.fill();

  // Peach Chest/Muzzle
  ctx.fillStyle = '#fed7aa';
  ctx.beginPath();
  ctx.ellipse(2, 2, 6, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  // Head & Iconic Spikes
  ctx.fillStyle = mainColor;
  ctx.beginPath();
  ctx.arc(0, -9, 9, 0, Math.PI * 2);
  ctx.fill();

  // Spikes
  ctx.beginPath();
  ctx.moveTo(-3, -13);
  ctx.lineTo(-18, -17);
  ctx.lineTo(-7, -8);
  ctx.lineTo(-19, -6);
  ctx.lineTo(-5, 0);
  ctx.fill();

  // Muzzle & Nose
  ctx.fillStyle = '#fed7aa';
  ctx.beginPath();
  ctx.arc(5, -7, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(9, -8, 1.8, 0, Math.PI * 2); // Black nose
  ctx.fill();

  // Eye
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(3, -11, 3.5, 5, 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(4.5, -11, 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Legs & Running animation cycle
  const legCycle = Math.sin(animFrame * (Math.PI / 4));
  ctx.fillStyle = shoeColor;

  // Left Leg / Shoe
  ctx.fillRect(-6 + legCycle * 8, 9, 10, 6);
  // White stripe on shoe
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-3 + legCycle * 8, 9, 3, 6);

  // Right Leg / Shoe
  ctx.fillStyle = shoeColor;
  ctx.fillRect(-2 - legCycle * 8, 11, 10, 6);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(1 - legCycle * 8, 11, 3, 6);
}

function renderParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  for (const p of particles) {
    ctx.save();
    ctx.fillStyle = p.color;
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function renderScorePopups(ctx: CanvasRenderingContext2D, popups: ScorePopup[]) {
  ctx.save();
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'center';
  for (const pop of popups) {
    ctx.fillStyle = pop.color;
    ctx.fillText(pop.text, pop.x, pop.y);
  }
  ctx.restore();
}

function renderHomingReticle(ctx: CanvasRenderingContext2D, tx: number, ty: number) {
  ctx.save();
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 2.5;
  const rot = Date.now() * 0.008;
  ctx.translate(tx, ty);
  ctx.rotate(rot);

  // Crosshair brackets
  const size = 18;
  ctx.strokeRect(-size, -size, size * 2, size * 2);
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function renderHUD(
  ctx: CanvasRenderingContext2D,
  stats: { score: number; rings: number; time: number; lives: number },
  speed: number = 0
) {
  ctx.save();
  ctx.font = 'bold 15px monospace';

  // Classical Yellow Labels
  ctx.fillStyle = '#fde047';
  ctx.fillText('SCORE', 24, 30);
  ctx.fillText('TIME', 24, 52);
  // Flash RINGS yellow/red if 0 rings
  const ringFlash = stats.rings === 0 && Math.floor(Date.now() / 250) % 2 === 0;
  ctx.fillStyle = ringFlash ? '#ef4444' : '#fde047';
  ctx.fillText('RINGS', 24, 74);

  // White Values
  ctx.fillStyle = '#ffffff';
  ctx.fillText(stats.score.toString().padStart(6, ' '), 90, 30);

  // Format Time (M:SS.CS)
  const totalSec = Math.floor(stats.time / 1000);
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  const centis = Math.floor((stats.time % 1000) / 10);
  const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}.${centis.toString().padStart(2, '0')}`;
  ctx.fillText(timeStr, 90, 52);

  ctx.fillText(stats.rings.toString().padStart(3, ' '), 90, 74);

  // Speedometer on top right
  const speedKmh = Math.round(Math.abs(speed) * 0.25);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#38bdf8';
  ctx.fillText('SPEED', CANVAS_WIDTH - 85, 30);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`${speedKmh} km/h`, CANVAS_WIDTH - 24, 30);

  // Sonic Boom indicator when exceeding super sonic speed
  if (Math.abs(speed) > 410) {
    ctx.fillStyle = Math.floor(Date.now() / 100) % 2 === 0 ? '#fde047' : '#38bdf8';
    ctx.font = 'black 14px sans-serif';
    ctx.fillText('⚡ SONIC BOOM! ⚡', CANVAS_WIDTH - 24, 52);
  }

  // Lives display on bottom left
  ctx.textAlign = 'left';
  ctx.fillStyle = '#2563eb';
  ctx.beginPath();
  ctx.arc(36, CANVAS_HEIGHT - 24, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px monospace';
  ctx.fillText(`× ${stats.lives}`, 56, CANVAS_HEIGHT - 19);

  ctx.restore();
}
