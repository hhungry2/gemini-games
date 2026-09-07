// Super Mario Kart GP - Mode 7 3D Raster Renderer and HUD Engine

import {
  KartState,
  ActiveItem,
  TrackData,
  Particle,
  ItemType,
} from './types';
import { CHARACTERS } from './tracks';

export interface RenderParams {
  canvas: HTMLCanvasElement;
  track: TrackData;
  player: KartState;
  allKarts: KartState[];
  activeItems: ActiveItem[];
  particles: Particle[];
  raceTime: number;
  countdownState: number; // 3, 2, 1, 0 (GO), -1 (racing)
  isRearView: boolean;
}

export function renderGameView(params: RenderParams) {
  const {
    canvas,
    track,
    player,
    allKarts,
    activeItems,
    particles,
    countdownState,
    isRearView,
  } = params;

  const ctx = canvas.getContext('2d');
  if (!ctx || !track.textureCanvas) return;

  const width = canvas.width;
  const height = canvas.height;

  // Camera Settings
  const cameraAngle = isRearView ? player.angle + Math.PI : player.angle;
  const camX = player.x - Math.cos(cameraAngle) * 36;
  const camY = player.y - Math.sin(cameraAngle) * 36;
  const camZ = 28 + player.z * 0.5; // Altitude
  const horizonY = Math.floor(height * 0.40);
  const focalLength = height * 0.75;

  // 1. Render Sky & Parallax Horizon Panorama
  renderSkyAndPanorama(ctx, width, horizonY, cameraAngle, track);

  // 2. Render Mode 7 3D Perspective Ground
  renderMode7Ground(ctx, width, height, horizonY, camX, camY, camZ, cameraAngle, focalLength, track);

  // 3. Render 3D Sprites (Karts, Items, Particles, Props) with Depth Sorting
  renderWorldSprites(
    ctx,
    width,
    horizonY,
    focalLength,
    camX,
    camY,
    camZ,
    cameraAngle,
    track,
    player,
    allKarts,
    activeItems,
    particles,
    isRearView
  );

  // 4. Render Boost Speed Lines Effect
  if (player.boostTimer > 0 || player.starTimer > 0) {
    renderSpeedLines(ctx, width, height);
  }

  // 5. Render HUD (MiniMap, Rank, Laps, Speed, Items, Rear-view mirror)
  renderHUD(ctx, width, height, player, allKarts, track, countdownState);
}

function renderSpeedLines(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.save();
  const cx = width * 0.5;
  const cy = height * 0.5;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.lineWidth = 2.5;

  const now = performance.now() * 0.05;
  for (let i = 0; i < 18; i++) {
    const angle = ((i * 20 + now * 15) % 360) * (Math.PI / 180);
    const r1 = Math.min(width, height) * 0.35 + (Math.sin(now + i) * 20);
    const r2 = Math.min(width, height) * 0.7;

    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * r1, cy + Math.sin(angle) * r1);
    ctx.lineTo(cx + Math.cos(angle) * r2, cy + Math.sin(angle) * r2);
    ctx.stroke();
  }
  ctx.restore();
}

// 1. Sky and Parallax Horizon Panorama
function renderSkyAndPanorama(
  ctx: CanvasRenderingContext2D,
  width: number,
  horizonY: number,
  camAngle: number,
  track: TrackData
) {
  // Sky Gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
  skyGrad.addColorStop(0, track.skyTopColor);
  skyGrad.addColorStop(1, track.skyBottomColor);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, width, horizonY);

  // Panorama Background (Hills, Mountains, Castle, or Stars)
  const panOffset = ((camAngle / (Math.PI * 2)) % 1) * width * 2;

  ctx.save();
  if (track.theme === 'rainbow') {
    // Cosmic Nebula & Twinkling Stars
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 40; i++) {
      const sx = (i * 47 - panOffset * 0.5) % width;
      const sy = (i * 29) % (horizonY - 10);
      const px = sx < 0 ? sx + width : sx;
      ctx.fillRect(px, sy, 2, 2);
    }
  } else if (track.theme === 'castle') {
    // Bowser's Castle ramparts & volcanic mountains
    ctx.fillStyle = '#450a0a';
    for (let x = -width; x < width * 2; x += 120) {
      const px = x - (panOffset * 0.4) % 120;
      ctx.beginPath();
      ctx.moveTo(px, horizonY);
      ctx.lineTo(px + 40, horizonY - 45);
      ctx.lineTo(px + 60, horizonY - 50);
      ctx.lineTo(px + 80, horizonY - 35);
      ctx.lineTo(px + 120, horizonY);
      ctx.fill();
    }
  } else {
    // Gentle green/brown rolling hills
    ctx.fillStyle = track.horizonColor;
    for (let x = -width; x < width * 2; x += 180) {
      const px = x - (panOffset * 0.3) % 180;
      ctx.beginPath();
      ctx.arc(px + 90, horizonY + 70, 110, Math.PI, 0);
      ctx.fill();
    }
    // Clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    for (let i = 0; i < 6; i++) {
      const cx = (i * 220 - panOffset * 0.15) % (width + 100);
      const cy = 25 + (i % 3) * 20;
      const rx = cx < -80 ? cx + width + 100 : cx;
      ctx.beginPath();
      ctx.arc(rx, cy, 18, 0, Math.PI * 2);
      ctx.arc(rx + 22, cy - 6, 24, 0, Math.PI * 2);
      ctx.arc(rx + 46, cy, 20, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

// 2. Mode 7 3D Perspective Ground
function renderMode7Ground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  horizonY: number,
  camX: number,
  camY: number,
  camZ: number,
  camAngle: number,
  focalLength: number,
  track: TrackData
) {
  let texPixels = track.textureData;
  if (!texPixels) {
    const texCanvas = track.textureCanvas;
    if (!texCanvas) return;
    const texCtx = texCanvas.getContext('2d');
    if (!texCtx) return;
    const texData = texCtx.getImageData(0, 0, track.worldSize, track.worldSize);
    track.textureData = new Uint32Array(texData.data.buffer);
    texPixels = track.textureData;
  }

  const texSize = track.worldSize; // 1024

  // Screen ImageData
  const groundHeight = height - horizonY;
  const imgData = ctx.createImageData(width, groundHeight);
  const screenPixels = new Uint32Array(imgData.data.buffer);

  const cosA = Math.cos(camAngle);
  const sinA = Math.sin(camAngle);
  const halfWidth = width * 0.5;

  // Scanline rasterization (Step 1 scanline at a time)
  for (let sy = 1; sy < groundHeight; sy++) {
    // Perspective depth Z
    const z = (camZ * focalLength) / sy;
    if (z <= 0 || z > 1600) continue;

    // World endpoints for current scanline (Correct non-inverted screen space)
    const leftX = camX + z * (cosA + (halfWidth / focalLength) * sinA);
    const leftY = camY + z * (sinA - (halfWidth / focalLength) * cosA);
    const rightX = camX + z * (cosA - (halfWidth / focalLength) * sinA);
    const rightY = camY + z * (sinA + (halfWidth / focalLength) * cosA);

    const stepX = (rightX - leftX) / width;
    const stepY = (rightY - leftY) / width;

    let wx = leftX;
    let wy = leftY;
    const rowOffset = sy * width;

    for (let sx = 0; sx < width; sx++) {
      const tx = Math.floor(wx) & (texSize - 1);
      const ty = Math.floor(wy) & (texSize - 1);

      // Distance fog shading
      const color = texPixels[ty * texSize + tx];
      screenPixels[rowOffset + sx] = color;

      wx += stepX;
      wy += stepY;
    }
  }

  ctx.putImageData(imgData, 0, horizonY);
}

// 3. Render 3D Sprites (Depth Sorted)
interface RenderableSprite {
  zDepth: number;
  render: () => void;
}

function renderWorldSprites(
  ctx: CanvasRenderingContext2D,
  width: number,
  horizonY: number,
  focalLength: number,
  camX: number,
  camY: number,
  camZ: number,
  camAngle: number,
  track: TrackData,
  player: KartState,
  allKarts: KartState[],
  activeItems: ActiveItem[],
  particles: Particle[],
  isRearView: boolean
) {
  const sprites: RenderableSprite[] = [];
  const cosA = Math.cos(camAngle);
  const sinA = Math.sin(camAngle);
  const halfWidth = width * 0.5;

  // Project 3D World (x, y, z) to Screen (sx, sy, scale)
  const project = (x: number, y: number, z: number) => {
    const dx = x - camX;
    const dy = y - camY;
    // Rotated camera space: forward = depth (rotY), right = lateral (rotX)
    const rotY = dx * cosA + dy * sinA;
    const rotX = -dx * sinA + dy * cosA;

    if (rotY < 6) return null; // Behind or clipping plane

    const scale = focalLength / rotY;
    const sx = halfWidth + rotX * scale;
    const sy = horizonY + (camZ - z) * scale;

    return { sx, sy, scale, depth: rotY };
  };

  // A. Item Boxes
  for (const box of track.itemBoxes) {
    if (!box.active) continue;
    const proj = project(box.x, box.y, 8);
    if (!proj) continue;

    sprites.push({
      zDepth: proj.depth,
      render: () => drawItemBox(ctx, proj.sx, proj.sy, proj.scale),
    });
  }

  // B. Coins on track
  for (const coin of track.coins) {
    if (coin.collected) continue;
    const proj = project(coin.x, coin.y, 4);
    if (!proj) continue;

    sprites.push({
      zDepth: proj.depth,
      render: () => drawTrackCoin(ctx, proj.sx, proj.sy, proj.scale),
    });
  }

  // C. Active Items (Shells, Bananas, Bombs)
  for (const it of activeItems) {
    const proj = project(it.x, it.y, it.z);
    if (!proj) continue;

    sprites.push({
      zDepth: proj.depth,
      render: () => drawActiveItem(ctx, proj.sx, proj.sy, proj.scale, it),
    });
  }

  // D. Karts (Player & Rivals)
  for (const kart of allKarts) {
    if (kart.id === player.id && !isRearView) {
      // Player kart in normal view is always drawn at front center
      sprites.push({
        zDepth: 0.1, // Always on top
        render: () =>
          drawKartSprite(
            ctx,
            halfWidth,
            horizonY + 165 - player.z * 1.5,
            1.0,
            player,
            camAngle,
            true
          ),
      });
      continue;
    }

    const proj = project(kart.x, kart.y, kart.z);
    if (!proj) continue;

    sprites.push({
      zDepth: proj.depth,
      render: () =>
        drawKartSprite(
          ctx,
          proj.sx,
          proj.sy,
          proj.scale,
          kart,
          camAngle,
          false
        ),
    });
  }

  // E. Particles
  for (const p of particles) {
    const proj = project(p.x, p.y, p.z);
    if (!proj) continue;

    sprites.push({
      zDepth: proj.depth,
      render: () => {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(proj.sx, proj.sy, Math.max(1.5, p.size * proj.scale * 0.4), 0, Math.PI * 2);
        ctx.fill();
      },
    });
  }

  // Sort by depth descending (Painter's Algorithm)
  sprites.sort((a, b) => b.zDepth - a.zDepth);

  // Render all
  for (const s of sprites) {
    s.render();
  }
}

// Draw Item Box with 3D Holographic Look
function drawItemBox(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  const size = Math.max(6, 20 * scale);
  ctx.save();
  ctx.translate(x, y);

  // Glowing rainbow box
  const now = performance.now() * 0.005;
  const hue = (now * 100) % 360;
  ctx.fillStyle = `hsla(${hue}, 90%, 65%, 0.85)`;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(1, 2 * scale);

  ctx.beginPath();
  ctx.roundRect(-size / 2, -size / 2, size, size, size * 0.2);
  ctx.fill();
  ctx.stroke();

  // Question Mark
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.max(8, Math.floor(size * 0.75))}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('?', 0, 1);
  ctx.restore();
}

// Draw Track Coin
function drawTrackCoin(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  const w = Math.max(4, 14 * scale);
  const h = Math.max(6, 18 * scale);
  const anim = Math.abs(Math.sin(performance.now() * 0.006));

  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#facc15'; // Gold
  ctx.strokeStyle = '#eab308';
  ctx.lineWidth = Math.max(1, 1.5 * scale);

  ctx.beginPath();
  ctx.ellipse(0, 0, Math.max(2, w * 0.5 * anim), h * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

// Draw Active Items (Shells, Bananas, Bombs)
function drawActiveItem(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  item: ActiveItem
) {
  const s = Math.max(5, 18 * scale);
  ctx.save();
  ctx.translate(x, y);

  if (item.type === 'banana') {
    // Yellow banana peel
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.45, 0, Math.PI);
    ctx.fill();
    ctx.fillStyle = '#92400e';
    ctx.fillRect(-s * 0.1, -s * 0.2, s * 0.2, s * 0.3);
  } else if (item.type === 'green_shell' || item.type === 'red_shell' || item.type === 'blue_shell') {
    // Shell dome
    const color =
      item.type === 'blue_shell'
        ? '#0284c7'
        : item.type === 'red_shell'
        ? '#ef4444'
        : '#22c55e';
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, -s * 0.2, s * 0.5, 0, Math.PI * 2);
    ctx.fill();

    // White rim
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-s * 0.5, s * 0.1, s, s * 0.25);

    // Spikes for blue shell
    if (item.type === 'blue_shell') {
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.8);
      ctx.lineTo(-s * 0.2, -s * 0.4);
      ctx.lineTo(s * 0.2, -s * 0.4);
      ctx.fill();
    }
  } else if (item.type === 'bobomb') {
    // Black sphere
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.5, 0, Math.PI * 2);
    ctx.fill();
    // Eyes
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-s * 0.25, -s * 0.15, s * 0.15, s * 0.3);
    ctx.fillRect(s * 0.1, -s * 0.15, s * 0.15, s * 0.3);
    // Fuse spark
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.arc(0, -s * 0.6, s * 0.18, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// Draw Pixel-Art Styled Kart and Driver
function drawKartSprite(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  kart: KartState,
  camAngle: number,
  isSelfBehind: boolean
) {
  const stats = CHARACTERS[kart.charId];
  const size = isSelfBehind ? 64 : Math.max(12, Math.min(68, 28 * scale));

  ctx.save();
  ctx.translate(x, y);

  // Ground Shadow
  ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
  ctx.beginPath();
  ctx.ellipse(0, size * 0.4, size * 0.55, size * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Star Invincible Rainbow Glow
  if (kart.starTimer > 0) {
    const hue = (performance.now() * 0.5) % 360;
    ctx.shadowColor = `hsl(${hue}, 100%, 65%)`;
    ctx.shadowBlur = Math.max(6, 16 * scale);
  }

  // Tilt with drift or steering
  let rollAngle = kart.driftDir * 0.12;
  if (kart.driftDir === 0) rollAngle = kart.steer * 0.06;
  ctx.rotate(rollAngle);

  // Relative angle to camera for directional sprite
  let relAngle = kart.angle - camAngle;
  while (relAngle > Math.PI) relAngle -= Math.PI * 2;
  while (relAngle < -Math.PI) relAngle += Math.PI * 2;

  // Spin rotation
  if (kart.spinTimer > 0) {
    ctx.rotate(kart.angle * 2);
  }

  const isRearViewKart = Math.abs(relAngle) < Math.PI * 0.35 || isSelfBehind;

  // 1. Kart Wheels (Black tires)
  ctx.fillStyle = '#1e293b';
  const tireW = size * 0.22;
  const tireH = size * 0.42;

  // Rear Tires
  ctx.fillRect(-size * 0.55, size * 0.1, tireW, tireH);
  ctx.fillRect(size * 0.55 - tireW, size * 0.1, tireW, tireH);

  // Front Tires (steered slightly)
  ctx.fillRect(-size * 0.5, -size * 0.3, tireW, tireH * 0.85);
  ctx.fillRect(size * 0.5 - tireW, -size * 0.3, tireW, tireH * 0.85);

  // 2. Kart Chassis / Body
  ctx.fillStyle = stats.kartColor;
  ctx.beginPath();
  ctx.roundRect(-size * 0.38, -size * 0.35, size * 0.76, size * 0.75, size * 0.2);
  ctx.fill();

  // Engine exhaust pipe
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(-size * 0.15, size * 0.3, size * 0.1, size * 0.2);
  ctx.fillRect(size * 0.05, size * 0.3, size * 0.1, size * 0.2);

  // 3. Driver Body & Cap
  // Shoulders / Overalls
  ctx.fillStyle = stats.accentColor;
  ctx.beginPath();
  ctx.roundRect(-size * 0.25, -size * 0.25, size * 0.5, size * 0.45, size * 0.15);
  ctx.fill();

  // Driver Head / Cap
  ctx.fillStyle = stats.capColor;
  ctx.beginPath();
  ctx.arc(0, -size * 0.25, size * 0.26, 0, Math.PI * 2);
  ctx.fill();

  // Face / Cap brim
  if (isRearViewKart) {
    // Back of the head/cap
    ctx.fillStyle = stats.capColor;
    ctx.beginPath();
    ctx.ellipse(0, -size * 0.18, size * 0.22, size * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Front face
    ctx.fillStyle = stats.skinColor;
    ctx.beginPath();
    ctx.arc(0, -size * 0.2, size * 0.18, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-size * 0.1, -size * 0.22, size * 0.06, size * 0.08);
    ctx.fillRect(size * 0.04, -size * 0.22, size * 0.06, size * 0.08);
  }

  // 4. Character details (Koopa shell, Bowser horns, Toad spots)
  if (kart.charId === 'toad') {
    ctx.fillStyle = '#ef4444'; // Red spots on Toad cap
    ctx.beginPath();
    ctx.arc(0, -size * 0.34, size * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-size * 0.16, -size * 0.25, size * 0.06, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(size * 0.16, -size * 0.25, size * 0.06, 0, Math.PI * 2);
    ctx.fill();
  } else if (kart.charId === 'bowser') {
    // Horns
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-size * 0.28, -size * 0.4, size * 0.08, size * 0.15);
    ctx.fillRect(size * 0.2, -size * 0.4, size * 0.08, size * 0.15);
  }

  // 5. Mini-Turbo Sparks (Blue / Orange)
  if (kart.miniTurboLevel > 0) {
    const sparkColor = kart.miniTurboLevel === 2 ? '#f97316' : '#38bdf8';
    ctx.fillStyle = sparkColor;
    ctx.beginPath();
    ctx.arc(-size * 0.45, size * 0.35, size * 0.15, 0, Math.PI * 2);
    ctx.arc(size * 0.45, size * 0.35, size * 0.15, 0, Math.PI * 2);
    ctx.fill();
  }

  // 6. Lightning Shrunk Status
  if (kart.lightningTimer > 0) {
    ctx.fillStyle = 'rgba(250, 204, 21, 0.4)';
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// 4. HUD (Heads-Up Display)
function renderHUD(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  player: KartState,
  allKarts: KartState[],
  track: TrackData,
  countdownState: number
) {
  // A. Item Slot (Top Left)
  renderItemSlot(ctx, 24, 20, player);

  // B. Rank Badge (Top Right)
  renderRankBadge(ctx, width - 80, 24, player.rank);

  // C. Laps & Coins (Bottom Left)
  renderLapAndCoins(ctx, 24, height - 36, player, track);

  // D. Speedometer (Bottom Center-Right)
  renderSpeedometer(ctx, width - 180, height - 32, player);

  // E. MiniMap Radar (Top-Right / Bottom-Right)
  if (track.minimapCanvas) {
    const mapSize = Math.min(130, Math.floor(width * 0.24));
    const mx = width - mapSize - 16;
    const my = 80;
    ctx.drawImage(track.minimapCanvas, mx, my, mapSize, mapSize);

    // Draw Karts on MiniMap
    const scale = (mapSize * (150 / 180)) / track.worldSize;
    const offset = mapSize * (15 / 180);

    for (const k of allKarts) {
      const kx = mx + k.x * scale + offset;
      const ky = my + k.y * scale + offset;
      const stats = CHARACTERS[k.charId];

      ctx.fillStyle = k.isPlayer ? '#ffffff' : stats.kartColor;
      ctx.strokeStyle = k.isPlayer ? '#ef4444' : '#000000';
      ctx.lineWidth = k.isPlayer ? 2.5 : 1;

      ctx.beginPath();
      ctx.arc(kx, ky, k.isPlayer ? 5.5 : 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  // F. Countdown Overlay (3, 2, 1, GO!)
  if (countdownState >= 0) {
    ctx.save();
    ctx.font = '900 64px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const text = countdownState === 0 ? 'GO!' : countdownState.toString();
    const color = countdownState === 0 ? '#22c55e' : countdownState === 1 ? '#eab308' : '#ef4444';

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillText(text, width / 2 + 4, height * 0.38 + 4);

    ctx.fillStyle = color;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6;
    ctx.strokeText(text, width / 2, height * 0.38);
    ctx.fillText(text, width / 2, height * 0.38);
    ctx.restore();
  }

  // G. Final Lap / Goal Announcement
  if (player.lap === track.laps && !player.finished) {
    ctx.save();
    ctx.font = '900 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ef4444';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.strokeText('FINAL LAP!', width / 2, 60);
    ctx.fillText('FINAL LAP!', width / 2, 60);
    ctx.restore();
  } else if (player.finished) {
    ctx.save();
    ctx.font = '900 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#eab308';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6;
    ctx.strokeText('FINISH!!', width / 2, height * 0.36);
    ctx.fillText('FINISH!!', width / 2, height * 0.36);
    ctx.restore();
  }
}

// Item Slot Renderer
function renderItemSlot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  player: KartState
) {
  const boxSize = 56;
  ctx.save();
  ctx.translate(x, y);

  // Background Frame
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(0, 0, boxSize, boxSize, 12);
  ctx.fill();
  ctx.stroke();

  // Display Item
  const displayItem =
    player.itemRouletteTimer > 0 ? player.rouletteDisplayItem : player.item;

  if (displayItem !== 'none') {
    renderItemIcon(ctx, boxSize / 2, boxSize / 2, displayItem, boxSize * 0.36);
  }
  ctx.restore();
}

function renderItemIcon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  item: ItemType,
  r: number
) {
  ctx.save();
  ctx.translate(cx, cy);

  if (item === 'mushroom') {
    // Red Mushroom
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(0, -2, r, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-r * 0.5, -2, r, r * 0.8);
    // White spot
    ctx.beginPath();
    ctx.arc(0, -r * 0.5, r * 0.3, 0, Math.PI * 2);
    ctx.fill();
  } else if (item === 'green_shell' || item === 'red_shell' || item === 'blue_shell') {
    const col =
      item === 'blue_shell'
        ? '#0284c7'
        : item === 'red_shell'
        ? '#ef4444'
        : '#22c55e';
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-r, r * 0.2, r * 2, r * 0.4);
  } else if (item === 'banana') {
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI);
    ctx.fill();
    ctx.fillStyle = '#92400e';
    ctx.fillRect(-2, -r * 0.4, 4, 6);
  } else if (item === 'star') {
    ctx.fillStyle = '#facc15';
    drawStarShape(ctx, 0, 0, 5, r, r * 0.5);
    ctx.fill();
  } else if (item === 'lightning') {
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.moveTo(-2, -r);
    ctx.lineTo(r * 0.7, -2);
    ctx.lineTo(0, 0);
    ctx.lineTo(r * 0.5, r);
    ctx.lineTo(-r * 0.7, 2);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();
  } else if (item === 'coin') {
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.65, r, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (item === 'bobomb') {
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.arc(0, -r, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawStarShape(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  spikes: number,
  outerRadius: number,
  innerRadius: number
) {
  let rot = (Math.PI / 2) * 3;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
}

// Rank Badge (1st, 2nd, etc.)
function renderRankBadge(ctx: CanvasRenderingContext2D, x: number, y: number, rank: number) {
  ctx.save();
  ctx.translate(x, y);

  const colors = [
    '#facc15', // 1st Gold
    '#94a3b8', // 2nd Silver
    '#b45309', // 3rd Bronze
    '#38bdf8', // 4th
    '#818cf8', // 5th
    '#a855f7', // 6th
    '#f43f5e', // 7th
    '#64748b', // 8th
  ];
  const color = colors[rank - 1] || '#ffffff';

  ctx.font = '900 42px sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';

  // Number
  ctx.fillStyle = color;
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 6;
  ctx.strokeText(`${rank}`, 0, 0);
  ctx.fillText(`${rank}`, 0, 0);

  // Suffix (st, nd, rd, th)
  const suffixes = ['st', 'nd', 'rd', 'th'];
  const suffix = rank <= 3 ? suffixes[rank - 1] : 'th';
  ctx.font = 'bold 18px sans-serif';
  ctx.strokeText(suffix, 24, 6);
  ctx.fillText(suffix, 24, 6);
  ctx.restore();
}

// Laps and Coins
function renderLapAndCoins(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  player: KartState,
  track: TrackData
) {
  ctx.save();
  ctx.translate(x, y);

  ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
  ctx.beginPath();
  ctx.roundRect(-8, -24, 130, 36, 8);
  ctx.fill();

  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  // Laps
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`LAP ${Math.min(player.lap, track.laps)}/${track.laps}`, 0, -6);

  // Coins
  ctx.fillStyle = '#facc15';
  ctx.fillText(`🪙 ${player.coins}`, 78, -6);
  ctx.restore();
}

// Speedometer
function renderSpeedometer(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  player: KartState
) {
  ctx.save();
  ctx.translate(x, y);

  const speedKmh = Math.floor(Math.abs(player.speed) * 14.5);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
  ctx.beginPath();
  ctx.roundRect(-8, -24, 110, 36, 8);
  ctx.fill();

  ctx.font = '900 18px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = player.boostTimer > 0 ? '#f97316' : '#38bdf8';
  ctx.fillText(`${speedKmh} km/h`, 0, -6);
  ctx.restore();
}
