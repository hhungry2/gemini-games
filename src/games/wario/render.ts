import { rushDefinition, type RushSession } from './engine';
import { renderPuzzleGame } from './puzzleRender';
import { renderActionGame } from './actionRender';
import { renderBrainGame } from './brainRender';
import { renderArcadeGame } from './arcadeRender';

const INK = '#192338';
const CREAM = '#fff7e3';
const PINK = '#f16c95';
const YELLOW = '#f8d94b';
const GREEN = '#66bd98';

function box(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string, radius = 18, stroke?: string) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, radius); ctx.fillStyle = color; ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 3; ctx.stroke(); }
}

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
}

function text(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, size = 22, color = INK) {
  ctx.font = `900 ${size}px "Arial", "Noto Sans JP", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = color; ctx.fillText(value, x, y);
}

function line(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string, width = 4) {
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const angle = i * Math.PI / 5 - Math.PI / 2;
    const radius = i % 2 === 0 ? r : r * 0.47;
    const px = x + Math.cos(angle) * radius, py = y + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath(); ctx.fillStyle = color; ctx.fill();
}

function shape(ctx: CanvasRenderingContext2D, kind: number, x: number, y: number, size: number) {
  if (kind === 0) star(ctx, x, y, size, '#e3ae20');
  else if (kind === 1) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 4); box(ctx, -size * 0.72, -size * 0.72, size * 1.44, size * 1.44, '#7c6bb6', 7); ctx.restore();
  } else {
    ctx.beginPath(); ctx.moveTo(x, y + size * 0.9);
    ctx.bezierCurveTo(x - size * 1.6, y, x - size * 0.8, y - size * 1.3, x, y - size * 0.4);
    ctx.bezierCurveTo(x + size * 0.8, y - size * 1.3, x + size * 1.6, y, x, y + size * 0.9);
    ctx.fillStyle = PINK; ctx.fill();
  }
}

function mascot(ctx: CanvasRenderingContext2D, x: number, y: number, scale = 1, worried = false) {
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
  ctx.fillStyle = '#00000018'; ctx.beginPath(); ctx.ellipse(0, 42, 39, 9, 0, 0, Math.PI * 2); ctx.fill();
  box(ctx, -33, 25, 25, 17, '#6b5b98', 7); box(ctx, 8, 25, 25, 17, '#6b5b98', 7);
  line(ctx, -34, 1, -46, 15, INK, 7); line(ctx, 34, 1, 46, 15, INK, 7);
  box(ctx, -35, -43, 70, 78, YELLOW, 24, INK);
  line(ctx, -12, -42, -19, -55, INK, 4); line(ctx, 12, -42, 19, -55, INK, 4);
  circle(ctx, -13, -12, 12, '#fff'); circle(ctx, 13, -12, 12, '#fff');
  circle(ctx, -10, -10, 5, INK); circle(ctx, 10, -10, 5, INK);
  if (worried) { circle(ctx, 0, 13, 7, INK); }
  else { ctx.beginPath(); ctx.arc(0, 8, 12, 0.1, Math.PI - 0.1); ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.stroke(); }
  circle(ctx, -25, 6, 6, '#f5a485'); circle(ctx, 25, 6, 6, '#f5a485');
  ctx.restore();
}

function donut(ctx: CanvasRenderingContext2D, x: number, y: number, rotation = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rotation);
  circle(ctx, 0, 0, 28, '#c88a51'); circle(ctx, 0, -2, 24, '#ed91ad'); circle(ctx, 0, 0, 10, CREAM);
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; line(ctx, Math.cos(a) * 17 - 2, Math.sin(a) * 17 - 3, Math.cos(a) * 17 + 2, Math.sin(a) * 17 + 3, i % 2 ? '#fff8df' : '#f8d94b', 3); }
  ctx.restore();
}

function arrow(ctx: CanvasRenderingContext2D, x: number, y: number, direction: number, color: string, size = 26) {
  line(ctx, x - direction * size, y, x + direction * size, y, color, 8);
  line(ctx, x + direction * size, y, x + direction * (size - 13), y - 13, color, 8);
  line(ctx, x + direction * size, y, x + direction * (size - 13), y + 13, color, 8);
}

function background(ctx: CanvasRenderingContext2D, color: string, dark = false) {
  ctx.fillStyle = color; ctx.fillRect(0, 0, 640, 480);
  ctx.strokeStyle = dark ? '#ffffff09' : '#19233808'; ctx.lineWidth = 1;
  for (let x = 0; x <= 640; x += 40) { ctx.beginPath(); ctx.moveTo(x, 100); ctx.lineTo(x, 480); ctx.stroke(); }
  for (let y = 120; y <= 480; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(640, y); ctx.stroke(); }
}

export function renderRush(ctx: CanvasRenderingContext2D, session: RushSession, visualTime: number) {
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const g = session.game;
  if (!g || session.phase === 'title' || session.phase === 'practice' || session.phase === 'over') {
    background(ctx, '#192338', true);
    ctx.save(); ctx.translate(320, 240); ctx.rotate(-0.13);
    for (let i = 0; i < 7; i++) box(ctx, -360, -290 + i * 100, 720, 42, i % 2 ? '#ffffff03' : '#ffffff05', 10);
    ctx.restore();
    star(ctx, 78, 115, 28, '#f8d94b'); star(ctx, 564, 363, 35, '#f16c95');
    circle(ctx, 550, 147, 31, '#a4dbe833'); circle(ctx, 550, 147, 16, '#192338');
    mascot(ctx, 95, 353 + Math.sin(visualTime * 2) * 5, 1.05);
    arrow(ctx, 544, 254, 1, '#fff7e32b', 29);
    ctx.restore(); return;
  }

  background(ctx, g.id === 'dodge' ? '#212c44' : CREAM, g.id === 'dodge');
  if (g.id === 'jump') {
    circle(ctx, 526, 144, 39, '#f8d94b66');
    box(ctx, 45, 199, 120, 30, '#e4e1dc', 18); box(ctx, 399, 220, 162, 26, '#e4e1dc', 18);
    ctx.fillStyle = '#b9d3bb'; ctx.beginPath(); ctx.moveTo(0, 381); ctx.quadraticCurveTo(110, 280, 242, 381); ctx.quadraticCurveTo(420, 260, 640, 381); ctx.fill();
    box(ctx, 0, 386, 640, 94, '#c6b7a1', 0); line(ctx, 0, 384, 640, 384, INK, 5);
    for (let x = 0; x < 640; x += 60) line(ctx, x + 10, 418, x + 30, 418, '#a6947d', 4);
    mascot(ctx, 150, 341 + g.jumpY, 1);
    const x = 650 - g.time * 240;
    box(ctx, x - 11, 319, 22, 65, PINK, 5, INK); box(ctx, x - 30, 315, 60, 20, PINK, 4, INK);
    line(ctx, x - 21, 322, x - 11, 331, '#fff7e3', 6); line(ctx, x + 5, 322, x + 15, 331, '#fff7e3', 6);
  } else if (g.id === 'catch') {
    box(ctx, 0, 392, 640, 88, '#a4cbbd', 0); line(ctx, 0, 392, 640, 392, INK, 4);
    for (const drop of g.drops) {
      const y = 70 + (g.time - drop.start) * 150;
      if (g.time >= drop.start && !drop.caught) {
        ctx.fillStyle = '#19233812'; ctx.beginPath(); ctx.ellipse(drop.x, 397, 28, 5, 0, 0, Math.PI * 2); ctx.fill();
        donut(ctx, drop.x, y, g.time * 1.4);
      }
    }
    const x = g.x;
    ctx.beginPath(); ctx.moveTo(x - 58, 347); ctx.lineTo(x - 43, 392); ctx.lineTo(x + 43, 392); ctx.lineTo(x + 58, 347); ctx.closePath(); ctx.fillStyle = YELLOW; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.stroke();
    box(ctx, x - 63, 338, 126, 17, PINK, 7, INK);
    for (let i = -1; i <= 1; i++) line(ctx, x + i * 22, 361, x + i * 19, 381, '#cba82c', 4);
    text(ctx, `${g.count} / 3`, 320, 432, 25);
  } else if (g.id === 'inflate') {
    const p = g.count / g.needed;
    const r = 43 + p * 69;
    line(ctx, 320, 218 + r, 320, 367, '#83728e', 3);
    ctx.save(); ctx.translate(320, 218); ctx.scale(0.9, 1);
    circle(ctx, 0, 0, r, PINK); circle(ctx, -r * 0.35, -r * 0.35, r * 0.22, '#ffc2d1');
    circle(ctx, -r * 0.24, 0, 5, INK); circle(ctx, r * 0.24, 0, 5, INK);
    ctx.beginPath(); ctx.arc(0, r * 0.08, r * 0.18, 0, Math.PI); ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.stroke(); ctx.restore();
    box(ctx, 267, 365, 106, 42, '#9dc9d1', 11, INK);
    line(ctx, 320, 366, 320, g.count % 2 ? 329 : 343, INK, 8); line(ctx, 291, g.count % 2 ? 327 : 341, 349, g.count % 2 ? 327 : 341, INK, 10);
    for (let i = 0; i < g.needed; i++) box(ctx, 320 - g.needed * 13 + i * 26, 433, 20, 13, i < g.count ? PINK : '#19233818', 4);
    text(ctx, `${g.count} / ${g.needed}`, 502, 382, 29);
  } else if (g.id === 'stop') {
    box(ctx, 77, 213, 486, 116, '#e9dcc0', 28, INK); box(ctx, 99, 236, 442, 70, '#fffdf7', 12);
    box(ctx, g.target - g.targetWidth / 2, 237, g.targetWidth, 68, GREEN, 8);
    for (let x = 120; x <= 520; x += 40) line(ctx, x, 274, x, 292, '#19233844', 3);
    line(ctx, g.needle, 226, g.needle, 316, PINK, 8);
    ctx.beginPath(); ctx.moveTo(g.needle, 225); ctx.lineTo(g.needle - 13, 205); ctx.lineTo(g.needle + 13, 205); ctx.closePath(); ctx.fillStyle = PINK; ctx.fill();
    text(ctx, 'STOP!', 320, 375, 36); text(ctx, '一発勝負', 320, 153, 19, '#7e7d7b');
  } else if (g.id === 'match') {
    box(ctx, 249, 111, 142, 95, '#e4ddf0', 18); text(ctx, 'お手本', 320, 126, 14, '#716286'); shape(ctx, g.target, 320, 164, 29);
    for (let i = 0; i < 3; i++) {
      const x = 145 + i * 175;
      box(ctx, x - 73, 240, 146, 128, '#d8cdb6', 20);
      box(ctx, x - 73, 232, 146, 128, '#fffdf7', 20, g.selected === i ? INK : '#d1c9b8');
      shape(ctx, g.options[i], x, 294, 39);
      if (g.selected === i) { circle(ctx, x, 389, 5, PINK); }
    }
    text(ctx, '←  選ぶ  →     Space で決定', 320, 431, 19, '#7e7d7b');
  } else if (g.id === 'dodge') {
    for (let i = 0; i < 29; i++) circle(ctx, (i * 113 + 25) % 640, 112 + (i * 73) % 270, i % 3 === 0 ? 2 : 1, '#fff7e35c');
    circle(ctx, 545, 163, 39, '#817b9f'); circle(ctx, 531, 157, 9, '#66617d'); circle(ctx, 556, 179, 5, '#66617d');
    ctx.fillStyle = '#62647d'; ctx.beginPath(); ctx.ellipse(320, 540, 460, 143, 0, 0, Math.PI * 2); ctx.fill();
    for (const drop of g.drops) {
      const y = -60 + (g.time - drop.start) * 285;
      if (g.time >= drop.start && y < 490) {
        line(ctx, drop.x + 17, y - 65, drop.x, y - 8, '#f16c9544', 24); line(ctx, drop.x + 9, y - 49, drop.x, y - 5, '#f8d94b99', 12);
        circle(ctx, drop.x, y, 22, '#d78974'); circle(ctx, drop.x - 5, y - 5, 7, '#f4b69a'); circle(ctx, drop.x + 7, y + 8, 5, '#b77169');
      }
    }
    mascot(ctx, g.x, 355, 0.87, true);
    text(ctx, 'SURVIVE', 320, 433, 20, '#fff7e399');
  } else if (g.id === 'react') {
    const ready = g.time >= g.target;
    box(ctx, 242, 119, 156, 246, '#344055', 37, INK);
    circle(ctx, 320, 185, 48, ready ? '#51434d' : PINK); circle(ctx, 320, 298, 48, ready ? GREEN : '#3e5554');
    if (ready) { circle(ctx, 305, 285, 9, '#b9edc5'); text(ctx, 'GO', 320, 302, 27, INK); }
    else { line(ctx, 299, 185, 341, 185, CREAM, 10); }
    text(ctx, ready ? 'いまだ！' : 'まだ まって…', 320, 413, 30, ready ? '#338663' : '#ac4964');
    if (ready) { star(ctx, 175, 267, 16, YELLOW); star(ctx, 470, 189, 22, YELLOW); }
  } else if (g.id === 'sequence') {
    const width = 70, gap = 13, left = 320 - (g.needed * (width + gap) - gap) / 2;
    for (let i = 0; i < g.needed; i++) {
      const x = left + i * (width + gap);
      box(ctx, x, 149, width, 82, i < g.count ? GREEN : '#fffdf7', 15, i === g.count ? INK : '#d2cbbb');
      arrow(ctx, x + width / 2, 190, g.sequence[i], i < g.count ? '#fff' : INK, 19);
      if (i === g.count) circle(ctx, x + width / 2, 247, 5, PINK);
    }
    for (const [x, direction] of [[124, -1], [346, 1]]) {
      box(ctx, x, 297, 170, 100, '#c5b998', 20); box(ctx, x, 287, 170, 100, YELLOW, 20, INK); arrow(ctx, x + 85, 338, direction, INK, 30);
    }
    text(ctx, `${g.count} / ${g.needed}`, 320, 434, 22, '#7e7d7b');
  }

  if (g.extra?.pack === 'puzzle') renderPuzzleGame(ctx, session);
  else if (g.extra?.pack === 'action') renderActionGame(ctx, session);
  else if (g.extra?.pack === 'brain') renderBrainGame(ctx, session);
  else if (g.extra?.pack === 'arcade') renderArcadeGame(ctx, session);

  // The command remains legible against every scene without covering the active play area.
  const definition = rushDefinition(g.id);
  box(ctx, 0, 0, 640, 94, g.id === 'dodge' ? '#192338' : '#fffdf7', 0);
  box(ctx, 20, 20, 44, 44, definition.color, 11); text(ctx, definition.number, 42, 43, 21);
  text(ctx, definition.command, 345, 35, 30, g.id === 'dodge' ? CREAM : INK);
  text(ctx, definition.shortHint, 345, 71, 16, g.id === 'dodge' ? '#bac2d2' : '#79796f');
  ctx.restore();
}
