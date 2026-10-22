import { ROAD_START, ROAD_STEP, WORLD_SIZE, canEatObject, type CityObject, type Hole, type HoleWorld } from './engine';

export interface HoleCamera { x: number; y: number; zoom: number }
export interface PointerVisual { active: boolean; x: number; y: number; anchorX: number; anchorY: number; touch: boolean }
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export function updateHoleCamera(camera: HoleCamera, hole: Hole, width: number, height: number, dt: number) {
  const targetZoom = clamp(Math.min(width, height) / (550 + hole.radius * 2.2), 0.34, 1.65);
  const ease = 1 - Math.exp(-dt * 5);
  camera.zoom += (targetZoom - camera.zoom) * ease;
  camera.x += (hole.x - camera.x) * ease;
  camera.y += (hole.y - camera.y) * ease;
  const halfW = width / camera.zoom / 2;
  const halfH = height / camera.zoom / 2;
  camera.x = halfW >= WORLD_SIZE / 2 ? WORLD_SIZE / 2 : clamp(camera.x, halfW - 35, WORLD_SIZE - halfW + 35);
  camera.y = halfH >= WORLD_SIZE / 2 ? WORLD_SIZE / 2 : clamp(camera.y, halfH - 35, WORLD_SIZE - halfH + 35);
}

function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string, radius = 0) {
  ctx.fillStyle = color;
  if (radius) { ctx.beginPath(); ctx.roundRect(x, y, w, h, radius); ctx.fill(); }
  else ctx.fillRect(x, y, w, h);
}
function ellipse(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, color: string) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
}

function drawCityGround(ctx: CanvasRenderingContext2D, camera: HoleCamera, width: number, height: number) {
  rect(ctx, 0, 0, WORLD_SIZE, WORLD_SIZE, '#b6c5b1');
  const left = camera.x - width / camera.zoom / 2;
  const top = camera.y - height / camera.zoom / 2;
  const right = left + width / camera.zoom;
  const bottom = top + height / camera.zoom;
  for (let bx = 0; bx < 5; bx++) for (let by = 0; by < 5; by++) {
    const x = 440 + bx * ROAD_STEP, y = 440 + by * ROAD_STEP;
    if (x < left - 300 || x > right + 300 || y < top - 300 || y > bottom + 300) continue;
    const park = (bx + by * 2) % 5 === 0;
    rect(ctx, x - 172, y - 172, 344, 344, '#dad8c9', 18);
    rect(ctx, x - 147, y - 147, 294, 294, park ? '#9fc498' : '#c8c9bb', 12);
    if (park) {
      rect(ctx, x - 12, y - 147, 24, 294, '#d4cfb4');
      rect(ctx, x - 147, y - 12, 294, 24, '#d4cfb4');
      ellipse(ctx, x, y, 37, 29, '#e0d9bf');
      ellipse(ctx, x, y, 25, 19, '#9dcdc9');
      ellipse(ctx, x - 5, y - 4, 13, 9, '#bdddd5');
    } else {
      rect(ctx, x - 5, y - 140, 10, 280, '#d7d6c5');
      rect(ctx, x - 140, y - 5, 280, 10, '#d7d6c5');
    }
  }
  for (let i = 0; i < 6; i++) {
    const p = ROAD_START + i * ROAD_STEP;
    rect(ctx, p - 49, 0, 98, WORLD_SIZE, '#78858a');
    rect(ctx, 0, p - 49, WORLD_SIZE, 98, '#78858a');
    ctx.strokeStyle = '#c4c9bd'; ctx.lineWidth = 2; ctx.setLineDash([17, 18]);
    ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, WORLD_SIZE); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(WORLD_SIZE, p); ctx.stroke();
    ctx.setLineDash([]);
  }
  for (let x = ROAD_START; x < WORLD_SIZE; x += ROAD_STEP) for (let y = ROAD_START; y < WORLD_SIZE; y += ROAD_STEP) {
    if (x < left - 90 || x > right + 90 || y < top - 90 || y > bottom + 90) continue;
    rect(ctx, x - 48, y - 48, 96, 96, '#78858a');
    for (let s = -30; s < 36; s += 12) {
      rect(ctx, x + s, y - 65, 7, 18, '#d9ddcf');
      rect(ctx, x + s, y + 47, 7, 18, '#d9ddcf');
      rect(ctx, x - 65, y + s, 18, 7, '#d9ddcf');
      rect(ctx, x + 47, y + s, 18, 7, '#d9ddcf');
    }
  }
  ctx.strokeStyle = '#91aaa1'; ctx.lineWidth = 12; ctx.strokeRect(0, 0, WORLD_SIZE, WORLD_SIZE);
}

function drawHole(ctx: CanvasRenderingContext2D, hole: Hole, time: number) {
  if (hole.respawn > 0) return;
  const r = hole.radius;
  if (Math.hypot(hole.vx, hole.vy) > 100) {
    const speed = Math.hypot(hole.vx, hole.vy);
    for (let i = 3; i >= 1; i--) {
      ctx.globalAlpha = (4 - i) * 0.035;
      ellipse(ctx, hole.x - hole.vx / speed * r * i * 0.27, hole.y - hole.vy / speed * r * i * 0.27, r, r * 0.82, hole.color);
    }
    ctx.globalAlpha = 1;
  }
  ellipse(ctx, hole.x + 3, hole.y + 8, r + 6, r * 0.82 + 5, '#00000025');
  ellipse(ctx, hole.x, hole.y, r + 4, r * 0.82 + 4, hole.color);
  ellipse(ctx, hole.x, hole.y + 1, r, r * 0.82, '#263a40');
  ellipse(ctx, hole.x, hole.y + 5, r * 0.87, r * 0.67, '#12252b');
  ellipse(ctx, hole.x, hole.y + 8, r * 0.66, r * 0.48, '#0c1b20');
  ctx.strokeStyle = '#ffffff60'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(hole.x, hole.y - 1, r + 2, r * 0.82 + 2, 0, Math.PI * 1.06, Math.PI * 1.83); ctx.stroke();
  if (hole.shield > 0) {
    ctx.strokeStyle = '#ffffffaa'; ctx.lineWidth = 2; ctx.setLineDash([5, 6]);
    ctx.beginPath(); ctx.ellipse(hole.x, hole.y, r + 10 + Math.sin(time * 5) * 2, r * 0.82 + 10, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  }
}

function drawObject(ctx: CanvasRenderingContext2D, object: CityObject, world: HoleWorld) {
  const player = world.holes[0];
  const near = Math.hypot(object.x - player.x, object.y - player.y);
  ctx.save();
  let x = object.x, y = object.y;
  if (object.eater >= 0) {
    const eater = world.holes[object.eater];
    const p = Math.min(1, object.fall);
    const move = 1 - (1 - p) ** 2;
    x += (eater.x - x) * move;
    y += (eater.y - y) * move + p * 18;
    ctx.translate(x, y);
    ctx.scale(1 - p * 0.96, 1 - p * 0.96);
    ctx.rotate(p * (object.id % 2 ? 0.6 : -0.6));
    ctx.globalAlpha = 1 - p ** 3;
  } else ctx.translate(x, y);

  const edible = canEatObject(player, object);
  if (near < player.radius + 180 && object.eater < 0) {
    ctx.strokeStyle = edible ? '#c9fff0' : '#c9795865';
    ctx.lineWidth = edible ? 3 : 1.5;
    ctx.beginPath(); ctx.ellipse(0, 3, Math.max(10, object.width * 0.67), Math.max(7, object.depth * 0.48), 0, 0, Math.PI * 2); ctx.stroke();
    if (edible) ellipse(ctx, 0, 1, 3, 2.5, '#d6fff1');
  }
  const w = object.width, d = object.depth;
  ctx.rotate(object.angle);
  switch (object.kind) {
    case 'person':
      ellipse(ctx, 3, 4, 6, 3.5, '#31484c2a');
      rect(ctx, -3, -7, 6, 10, object.color, 2);
      rect(ctx, -3, 1, 2.3, 5, '#596b72', 1); rect(ctx, 1, 1, 2.3, 5, '#596b72', 1);
      ellipse(ctx, 0, -10, 4.3, 4.5, '#f2d5b6');
      ellipse(ctx, 0, -12, 4, 2.1, '#756253');
      break;
    case 'cone':
      rect(ctx, -7, 1, 14, 8, '#e5d7b9', 2);
      ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(6, 5); ctx.lineTo(-6, 5); ctx.closePath(); ctx.fillStyle = '#ee9b62'; ctx.fill();
      rect(ctx, -3, -3, 6, 3, '#fff1db');
      break;
    case 'tree':
      ellipse(ctx, 8, 7, 21, 10, '#42645124');
      rect(ctx, -3, -19, 6, 24, '#9c8464', 2);
      ellipse(ctx, 0, -24, 17, 17, object.color);
      ellipse(ctx, -8, -18, 11, 12, object.color);
      ellipse(ctx, 8, -22, 12, 13, object.color);
      ellipse(ctx, -4, -30, 10, 9, '#b4d2a460');
      break;
    case 'car':
    case 'bus':
      rect(ctx, -w / 2 + 4, -d / 2 + 5, w + 4, d + 2, '#31484c24', 7);
      rect(ctx, -w / 2 - 2, -d / 2 + 7, 4, 11, '#4d5553', 1); rect(ctx, w / 2 - 2, -d / 2 + 7, 4, 11, '#4d5553', 1);
      rect(ctx, -w / 2 - 2, d / 2 - 17, 4, 11, '#4d5553', 1); rect(ctx, w / 2 - 2, d / 2 - 17, 4, 11, '#4d5553', 1);
      rect(ctx, -w / 2, -d / 2 - 4, w, d, object.color, 6);
      rect(ctx, -w / 2 + 4, -d / 2 + 7, w - 8, object.kind === 'bus' ? d - 28 : d * 0.47, '#557985', 3);
      rect(ctx, -w / 2 + 5, -d / 2 + 17, w - 10, object.kind === 'bus' ? d - 44 : d * 0.2, object.color, 2);
      rect(ctx, -w / 2 + 3, -d / 2 - 2, 6, 3, '#fff0c6', 1); rect(ctx, w / 2 - 9, -d / 2 - 2, 6, 3, '#fff0c6', 1);
      break;
    default: {
      const h = object.height * 0.62;
      rect(ctx, -w / 2 + 14, -d / 2 + 18, w + h * 0.28, d + 6, '#42575b22', 5);
      rect(ctx, -w / 2, -d / 2 - h, w, d + h, object.color, 3);
      rect(ctx, -w / 2, -d / 2, w, d, '#00000012', 2);
      rect(ctx, -w / 2 + 4, -d / 2 - h + 4, w - 8, d - 8, '#e4e5d655', 2);
      rect(ctx, -w / 2 - 2, -d / 2 - h - 2, w + 4, d, object.color, 3);
      rect(ctx, -w / 2 + 6, -d / 2 - h + 5, w - 12, d - 12, '#f5f0dc50', 2);
      if (object.kind === 'house') {
        rect(ctx, -w / 2 - 3, -d / 2 - h - 2, w + 6, d * 0.6, '#6d8382', 3);
        rect(ctx, -w / 2 + 3, -d / 2 - h + 2, w - 6, 7, '#91aaa3');
      } else {
        rect(ctx, -15, -d / 2 - h + 18, 29, 22, '#879b9e', 3);
        rect(ctx, -12, -d / 2 - h + 18, 23, 6, '#d0d7c9', 2);
      }
      const rows = Math.max(1, Math.floor(h / 19));
      for (let row = 0; row < rows; row++) for (let col = 0; col < Math.floor(w / 20); col++) {
        rect(ctx, -w / 2 + 10 + col * 19, d / 2 - h + 10 + row * 16, 8, 7, '#496d7b88', 1);
        rect(ctx, -w / 2 + 11 + col * 19, d / 2 - h + 10 + row * 16, 6, 2, '#cfe4dc95');
      }
      rect(ctx, -7, d / 2 - 16, 14, 16, '#556f77', 1);
    }
  }
  ctx.restore();
}

function drawMinimap(ctx: CanvasRenderingContext2D, world: HoleWorld, width: number, height: number) {
  const size = width < 500 ? 75 : 104;
  const x = width - size - 17, y = height - size - 17;
  ctx.save();
  rect(ctx, x - 4, y - 4, size + 8, size + 8, '#f8f7eddd', 11);
  rect(ctx, x, y, size, size, '#b6c5b1', 7);
  ctx.beginPath(); ctx.roundRect(x, y, size, size, 7); ctx.clip();
  const scale = size / WORLD_SIZE;
  for (let i = 0; i < 6; i++) {
    const p = (ROAD_START + i * ROAD_STEP) * scale;
    rect(ctx, x + p - 1.5, y, 3, size, '#87958f'); rect(ctx, x, y + p - 1.5, size, 3, '#87958f');
  }
  for (const hole of world.holes) {
    if (hole.respawn > 0) continue;
    ellipse(ctx, x + hole.x * scale, y + hole.y * scale, hole.id === 0 ? 4.2 : 3.2, hole.id === 0 ? 4.2 : 3.2, hole.id === 0 ? '#ffffff' : hole.color);
    if (hole.id === 0) ellipse(ctx, x + hole.x * scale, y + hole.y * scale, 2.4, 2.4, '#059aab');
  }
  ctx.restore();
}

export function renderHoleWorld(ctx: CanvasRenderingContext2D, world: HoleWorld, camera: HoleCamera, width: number, height: number, pointer?: PointerVisual) {
  rect(ctx, 0, 0, width, height, '#b5d7d4');
  ctx.save();
  ctx.translate(width / 2, height / 2); ctx.scale(camera.zoom, camera.zoom); ctx.translate(-camera.x, -camera.y);
  drawCityGround(ctx, camera, width, height);
  const player = world.holes[0];
  for (const hole of world.holes) drawHole(ctx, hole, world.elapsed);
  const left = camera.x - width / camera.zoom / 2 - 180;
  const top = camera.y - height / camera.zoom / 2 - 100;
  const right = camera.x + width / camera.zoom / 2 + 180;
  const bottom = camera.y + height / camera.zoom / 2 + 240;
  const visible = world.objects.filter(o => !o.swallowed && o.x > left && o.x < right && o.y > top && o.y < bottom).sort((a, b) => a.y - b.y);
  for (const object of visible) drawObject(ctx, object, world);
  for (const hole of world.holes) {
    if (hole.respawn > 0) continue;
    ctx.font = `800 ${hole.id === 0 ? 13 : 12}px ui-rounded, system-ui, sans-serif`;
    const text = hole.id === 0 ? 'YOU' : hole.name;
    const tw = ctx.measureText(text).width;
    const y = hole.y - hole.radius * 0.82 - 25;
    rect(ctx, hole.x - tw / 2 - 9, y - 10, tw + 18, 22, '#f8f7edef', 8);
    ctx.fillStyle = hole.id === 0 ? '#087b89' : hole.color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, hole.x, y + 1);
    if (hole.id !== 0 && Math.hypot(hole.x - player.x, hole.y - player.y) < 300) {
      ctx.font = 'bold 10px system-ui'; ctx.fillStyle = hole.radius > player.radius * 1.32 ? '#a8483b' : '#366f64';
      ctx.fillText(hole.radius > player.radius * 1.32 ? 'キケン' : player.radius > hole.radius * 1.32 ? '飲み込める' : '同じくらい', hole.x, y - 19);
    }
  }
  for (const f of world.floaters) {
    ctx.globalAlpha = Math.min(1, f.life * 2); ctx.font = `900 ${f.text === 'SIZE UP!' ? 27 : 16}px system-ui`; ctx.textAlign = 'center';
    ctx.strokeStyle = '#faf8e9'; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.strokeText(f.text, f.x, f.y); ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
  drawMinimap(ctx, world, width, height);
  if (pointer?.active && pointer.touch) {
    ctx.save(); ctx.strokeStyle = '#fdf9efaa'; ctx.lineWidth = 2; ctx.fillStyle = '#ffffff24';
    ctx.beginPath(); ctx.arc(pointer.anchorX, pointer.anchorY, 43, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    const dx = pointer.x - pointer.anchorX, dy = pointer.y - pointer.anchorY, length = Math.hypot(dx, dy);
    const amount = Math.min(1, 30 / Math.max(1, length));
    ellipse(ctx, pointer.anchorX + dx * amount, pointer.anchorY + dy * amount, 18, 18, '#ffffffbb');
    ctx.restore();
  }
}
