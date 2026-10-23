import type { RushSession } from './engine';
import type { DragonBossState, FlightBossState, SlimeBossState } from './flightBosses';

const INK = '#192338', CREAM = '#fff7e3', GOLD = '#ffe47b', PINK = '#ff8ca0', MINT = '#a7edd1';
function box(c: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, fill: string, radius = 8, stroke?: string) {
  c.beginPath(); c.roundRect(x, y, Math.max(0, width), Math.max(0, height), radius); c.fillStyle = fill; c.fill();
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = 2; c.stroke(); }
}
function circle(c: CanvasRenderingContext2D, x: number, y: number, radius: number, fill: string, stroke?: string, width = 2) {
  c.beginPath(); c.arc(x, y, Math.max(0, radius), 0, Math.PI * 2); c.fillStyle = fill; c.fill();
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = width; c.stroke(); }
}
function ellipse(c: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, fill: string, stroke?: string, width = 2) {
  c.beginPath(); c.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), 0, 0, Math.PI * 2); c.fillStyle = fill; c.fill();
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = width; c.stroke(); }
}
function line(c: CanvasRenderingContext2D, x: number, y: number, xx: number, yy: number, fill: string, width = 3) {
  c.beginPath(); c.moveTo(x, y); c.lineTo(xx, yy); c.strokeStyle = fill; c.lineWidth = width; c.stroke();
}
function text(c: CanvasRenderingContext2D, value: string, x: number, y: number, size = 16, color = CREAM) {
  c.font = `900 ${size}px "Arial", "Noto Sans JP", sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = color; c.fillText(value, x, y);
}
function diamond(c: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  c.beginPath(); c.moveTo(x, y - size); c.lineTo(x + size * 0.7, y); c.lineTo(x, y + size); c.lineTo(x - size * 0.7, y); c.closePath(); c.fillStyle = color; c.fill();
  line(c, x, y - size * 0.6, x - size * 0.3, y, '#ffffffa0', 2);
}
function crown(c: CanvasRenderingContext2D, x: number, y: number, width: number) {
  c.beginPath(); c.moveTo(x - width, y); c.lineTo(x - width - 5, y - 23); c.lineTo(x - width / 2, y - 13); c.lineTo(x, y - 32); c.lineTo(x + width / 2, y - 13); c.lineTo(x + width + 5, y - 23); c.lineTo(x + width, y); c.closePath(); c.fillStyle = GOLD; c.fill(); c.lineWidth = 3; c.strokeStyle = INK; c.stroke();
  diamond(c, x, y - 12, 5, PINK);
}
function hud(c: CanvasRenderingContext2D, state: FlightBossState, name: string, color: string) {
  box(c, 38, 118, 564, 28, '#192338ed', 8);
  text(c, name, 116, 132, 14);
  box(c, 202, 126, 167, 12, '#ffffff20', 5);
  if (state.hp > 0) box(c, 202, 126, 167 * Math.min(1, Math.max(0, state.hp / state.maxHp)), 12, color, 5);
  for (let i = 1; i < state.maxHp; i++) line(c, 202 + i * 167 / state.maxHp, 128, 202 + i * 167 / state.maxHp, 136, '#19233899', 1);
  text(c, `${Math.max(0, state.hp)}/${state.maxHp}`, 397, 132, 13);
  for (let i = 0; i < 3; i++) {
    const x = 451 + i * 23;
    c.beginPath(); c.moveTo(x, 123); c.lineTo(x + 7, 126); c.lineTo(x + 5, 137); c.lineTo(x, 141); c.lineTo(x - 5, 137); c.lineTo(x - 7, 126); c.closePath(); c.fillStyle = i < state.armor ? MINT : '#ffffff20'; c.fill();
  }
  text(c, `PHASE ${state.phase}`, 563, 132, 11, color);
}

function dragon(c: CanvasRenderingContext2D, time: number, state: DragonBossState) {
  const color = state.phase === 3 ? '#a984e8' : state.phase === 2 ? '#79a7da' : '#64c2c1';
  box(c, 25, 113, 590, 324, state.variation === 2 ? '#30324f' : '#245171', 16);
  for (let i = 0; i < 8; i++) {
    const x = 685 - ((time * 27 + i * 113) % 780), y = 177 + (i * 53) % 230;
    ellipse(c, x, y, 37 + i % 3 * 11, 7, '#c7edf01a'); ellipse(c, x + 17, y - 5, 21, 8, '#c7edf01a');
  }
  for (let i = 0; i < 5; i++) {
    const x = 650 - ((time * 55 + i * 137) % 700);
    line(c, x, 164 + i * 48, x - 30, 164 + i * 48, '#bce6ee33', 2);
  }
  // A coiling dragon and a moving wing give this arena a flight silhouette.
  const bob = Math.sin(time * 2) * 5, by = 246 + bob;
  c.save(); c.globalAlpha = state.hp === 0 ? 0.45 : 1;
  c.beginPath(); c.moveTo(607, 365); c.bezierCurveTo(470, 343, 628, 280, 535, by + 30); c.bezierCurveTo(480, by + 12, 540, by - 8, 553, by - 15);
  c.lineCap = 'round'; c.lineWidth = 39; c.strokeStyle = INK; c.stroke(); c.lineWidth = 32; c.strokeStyle = state.hit > 0 ? CREAM : color; c.stroke();
  c.beginPath(); c.moveTo(547, by + 28); c.lineTo(487, by - 50 - Math.sin(time * 5) * 10); c.lineTo(540, by - 30); c.lineTo(580, by + 10); c.closePath(); c.fillStyle = '#b6c3e8'; c.fill(); c.lineWidth = 3; c.strokeStyle = INK; c.stroke();
  line(c, 548, by + 20, 509, by - 29, '#637eaa', 3);
  ellipse(c, 554, by - 13, 38, 31, state.hit > 0 ? CREAM : color, INK, 3);
  ellipse(c, 523, by + 1, 31, 17, '#b8ead2', INK, 3);
  c.beginPath(); c.moveTo(550, by - 40); c.lineTo(545, by - 63); c.lineTo(565, by - 39); c.fillStyle = GOLD; c.fill(); c.strokeStyle = INK; c.stroke();
  c.beginPath(); c.moveTo(574, by - 35); c.lineTo(589, by - 57); c.lineTo(588, by - 23); c.fillStyle = GOLD; c.fill(); c.stroke();
  circle(c, 541, by - 20, 8, CREAM, INK); circle(c, 539, by - 19, 3, INK);
  line(c, 528, by + 6, 503, by + 8, INK, 3); circle(c, 503, by - 3, 2.5, INK);
  diamond(c, 560, by - 8, 9, GOLD);
  c.restore();

  const next = state.gates.find(gate => !gate.passed);
  for (const gate of state.gates) {
    if (gate.x < 25 || gate.x > 622) continue;
    const gap = state.aperture, active = gate === next, gold = state.variation === 2;
    const fireColor = gold ? '#d09ee640' : '#ffaf8b33';
    // The two breath curtains use exactly the gap checked by the simulation.
    box(c, gate.x - 10, 151, 20, Math.max(0, gate.y - gap - 151), fireColor, 5);
    box(c, gate.x - 10, gate.y + gap, 20, Math.max(0, 413 - gate.y - gap), fireColor, 5);
    if (active) {
      line(c, gate.x - 2, 155, gate.x - 2, gate.y - gap, '#ffb499', 3);
      line(c, gate.x - 2, gate.y + gap, gate.x - 2, 410, '#ffb499', 3);
    }
    c.beginPath(); c.ellipse(gate.x, gate.y, 19, gap, 0, 0, Math.PI * 2); c.strokeStyle = gate.passed ? gate.collected ? '#b8f1c3' : PINK : gold ? GOLD : '#c6ffdf'; c.lineWidth = active ? 7 : 4; c.stroke();
    c.beginPath(); c.ellipse(gate.x, gate.y, 12, gap - 7, 0, 0, Math.PI * 2); c.strokeStyle = '#fff7e355'; c.lineWidth = 2; c.stroke();
    if (!gate.passed) diamond(c, gate.x, gate.y, 11 + Math.sin(time * 5) * 1.5, gold ? GOLD : '#c6ffdf');
    if (state.variation === 1 && active) { text(c, '↕', gate.x + 34, gate.y, 23, MINT); }
  }
  if (next && next.x > 188 && state.hp > 0) {
    c.save(); c.setLineDash([4, 6]); line(c, 180, next.y, Math.min(next.x - 25, 470), next.y, '#d8f5df50', 2); c.restore();
  }

  const px = state.playerX, py = state.playerY;
  c.save(); if (state.hurt > 0 && Math.floor(time * 14) % 2) c.globalAlpha = 0.4;
  if (state.variation === 2 && state.charge > 0.1) {
    circle(c, px, py, 27, '#ffe47b15', state.charge >= 0.5 ? GOLD : '#ffe47b55', 3);
    c.beginPath(); c.arc(px, py, 32, -Math.PI / 2, -Math.PI / 2 + state.charge * Math.PI * 2); c.strokeStyle = GOLD; c.lineWidth = 4; c.stroke();
  }
  line(c, px - 22, py, px - 38 - Math.sin(time * 30) * 6, py, GOLD, 7);
  c.beginPath(); c.moveTo(px + 29, py); c.lineTo(px - 20, py - 17); c.lineTo(px - 11, py); c.lineTo(px - 20, py + 17); c.closePath(); c.fillStyle = '#ffdb7c'; c.fill(); c.strokeStyle = INK; c.lineWidth = 3; c.stroke();
  c.beginPath(); c.moveTo(px + 5, py - 4); c.lineTo(px - 9, py - 28); c.lineTo(px - 17, py - 3); c.closePath(); c.fillStyle = '#f69bb0'; c.fill(); c.stroke();
  circle(c, px + 5, py - 3, 7, '#a4e8ee', INK, 2); line(c, px + 4, py - 6, px + 7, py - 7, CREAM, 2);
  c.restore();

  box(c, 37, 411, 566, 24, '#192338dd', 6);
  for (let i = 0; i < state.needed; i++) diamond(c, 67 + i * 20, 423, 7, i < state.collected ? GOLD : '#ffffff30');
  text(c, state.hp === 0 ? '光の力で ドラグーン撃破！' : state.variation === 2 ? '上下で飛行 ＋ 長押しでチャージ' : '↑ ↓ / 指で上下に飛んで 輪の中心へ', 386, 423, 12, state.hp === 0 ? MINT : CREAM);
  hud(c, state, '天空竜ドラグーン', '#98e9d7');
}

function slime(c: CanvasRenderingContext2D, time: number, state: SlimeBossState) {
  box(c, 25, 113, 590, 324, '#39304e', 16);
  for (let i = 0; i < 13; i++) {
    const x = 48 + (i * 89) % 550, y = 174 + (i * 41 + time * (i % 2 ? -7 : 7) + 250) % 230;
    circle(c, x, y, 4 + i % 3 * 3, '#a59ad51b', '#b6a7dd22', 1);
  }
  for (const x of [48, 592]) { box(c, x - 7, 215, 14, 192, '#6a6386', 6); line(c, x - 1, 225, x - 1, 399, '#b6a7dd77', 2); }
  line(c, 63, 416, 577, 416, '#f28aa366', 2);
  for (let i = 0; i < 12; i++) {
    const x = 67 + i * 43;
    c.beginPath(); c.moveTo(x - 7, 434); c.lineTo(x, 425); c.lineTo(x + 7, 434); c.fillStyle = '#dd7da133'; c.fill();
  }

  const squish = state.hit > 0 ? Math.sin(state.hit * 30) * 5 : Math.sin(time * 2.7) * 2;
  const color = state.hit > 0 ? '#f8e9ff' : state.phase === 3 ? '#e6a5d7' : state.phase === 2 ? '#bc9ce3' : '#a597dc';
  // The queen stretches across the ceiling; every returned ball strikes her jelly body.
  c.beginPath(); c.moveTo(62, 208); c.bezierCurveTo(75, 176, 140, 202, 185, 183);
  c.bezierCurveTo(216, 169, 239, 151 - squish, 320, 153 - squish); c.bezierCurveTo(405, 151 - squish, 425, 175, 458, 185);
  c.bezierCurveTo(501, 204, 565, 175, 578, 208); c.quadraticCurveTo(504, 224 + squish, 436, 211);
  c.quadraticCurveTo(377, 222 + squish, 320, 211); c.quadraticCurveTo(258, 226 + squish, 196, 211); c.quadraticCurveTo(130, 225 + squish, 62, 208); c.closePath(); c.fillStyle = color; c.fill(); c.strokeStyle = INK; c.lineWidth = 3; c.stroke();
  ellipse(c, 250, 174, 18, 5, '#fff7e344'); ellipse(c, 208, 192, 8, 3, '#fff7e344');
  crown(c, 320, 154 - squish, 31);
  for (const x of [285, 355]) {
    ellipse(c, x, 183, 10, 12, CREAM, INK); circle(c, x + (state.ballX - 320) / 110, 186, 4, INK);
  }
  ellipse(c, 267, 201, 12, 5, '#f07eaa99'); ellipse(c, 373, 201, 12, 5, '#f07eaa99');
  if (state.hit > 0) { text(c, '×', 320, 202, 19, INK); }
  else { c.beginPath(); c.arc(320, 190, 12, 0.16, Math.PI - 0.16); c.strokeStyle = INK; c.lineWidth = 3; c.stroke(); }

  if (state.variation === 1) {
    const direction = Math.sign(state.wind) || 1;
    for (let i = 0; i < 3; i++) {
      const x = 80 + i * 180, y = 263 + Math.sin(time * 2 + i) * 5;
      line(c, x, y, x + direction * 54, y, '#bde8ee66', 3);
      line(c, x + direction * 54, y, x + direction * 44, y - 6, '#bde8ee66', 3); line(c, x + direction * 54, y, x + direction * 44, y + 6, '#bde8ee66', 3);
    }
  }
  if (state.variation === 2) for (const x of [221, 419]) {
    circle(c, x, 289, 24, '#b5f0d322', '#b5f0d366', 2);
    c.beginPath(); c.moveTo(x - 20, 300); c.quadraticCurveTo(x - 17, 269, x, 269); c.quadraticCurveTo(x + 17, 269, x + 20, 300); c.quadraticCurveTo(x, 309, x - 20, 300); c.fillStyle = '#83c9af'; c.fill(); c.lineWidth = 2; c.strokeStyle = INK; c.stroke();
    circle(c, x - 6, 291, 2, INK); circle(c, x + 6, 291, 2, INK); line(c, x - 5, 299, x + 5, 299, CREAM, 2);
  }
  // A faint landing guide and a broad paddle keep the ball legible on small screens.
  if (state.ballVy > 0 && state.hp > 0) {
    c.save(); c.setLineDash([3, 6]); line(c, state.ballX, state.ballY + 16, state.ballX, 374, '#ffe47b2a', 1); c.restore();
  }
  if (state.serveDelay > 0 && state.hp > 0) text(c, 'READY', state.ballX, state.ballY - 27, 13, GOLD);
  if (state.hp > 0) {
    line(c, state.ballX - state.ballVx * 0.03, state.ballY - state.ballVy * 0.03, state.ballX, state.ballY, '#ffe47b44', 16);
    circle(c, state.ballX, state.ballY, 10, GOLD, CREAM, 2); circle(c, state.ballX - 3, state.ballY - 3, 3, CREAM);
  }
  c.save(); if (state.hurt > 0 && Math.floor(time * 14) % 2) c.globalAlpha = 0.4;
  const px = state.paddleX, py = state.paddleY;
  ellipse(c, px, py + 15, state.paddleWidth / 2 + 3, 5, '#00000033');
  box(c, px - state.paddleWidth / 2, py - 11, state.paddleWidth, 19, '#9edbe4', 8, INK);
  box(c, px - state.paddleWidth / 2 + 4, py - 10, state.paddleWidth - 8, 5, CREAM, 3);
  diamond(c, px, py - 1, 6, GOLD); c.restore();
  box(c, 100, 414, 440, 21, '#192338dd', 6);
  text(c, state.hp === 0 ? 'スライムクイーン 撃破！' : `← → / 指でパドル移動    うちかえし ${state.returnCount}/8`, 320, 425, 12, state.hp === 0 ? MINT : CREAM);
  hud(c, state, 'スライムクイーン', '#d8b3ef');
}

/** Pure view; the simulation exclusively owns motion, collision and particles. */
export function renderFlightBoss(ctx: CanvasRenderingContext2D, session: RushSession): boolean {
  const game = session.game, state = game?.extra;
  if (!game || state?.pack !== 'flight-boss') return false;
  ctx.save(); ctx.beginPath(); ctx.rect(24, 112, 592, 326); ctx.clip();
  if (state.id === 'boss-dragon') dragon(ctx, game.time, state); else slime(ctx, game.time, state);
  for (const particle of state.particles) {
    ctx.save(); ctx.globalAlpha = Math.max(0, Math.min(1, particle.life * 2.5)); diamond(ctx, particle.x, particle.y, 3 + Math.max(0, particle.life) * 9, particle.color); ctx.restore();
  }
  ctx.restore(); return true;
}
