import type { RushSession } from './engine';
import { molePosition, racerLaneX } from './arcadeGames';

const INK = '#192338', CREAM = '#fff7e3', PINK = '#f16c95', YELLOW = '#f8d94b', GREEN = '#66bd98', BLUE = '#a4dbe8';
function box(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, radius = 12, stroke?: string) {
  c.beginPath(); c.roundRect(x, y, Math.max(0, w), Math.max(0, h), radius); c.fillStyle = fill; c.fill();
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = 3; c.stroke(); }
}
function circle(c: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string) {
  c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = fill; c.fill();
}
function line(c: CanvasRenderingContext2D, x: number, y: number, xx: number, yy: number, color: string, width = 3) {
  c.beginPath(); c.moveTo(x, y); c.lineTo(xx, yy); c.strokeStyle = color; c.lineWidth = width; c.stroke();
}
function text(c: CanvasRenderingContext2D, value: string, x: number, y: number, size = 20, color = INK) {
  c.font = `900 ${size}px "Arial", "Noto Sans JP", sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = color; c.fillText(value, x, y);
}
function progress(c: CanvasRenderingContext2D, value: number, total: number) {
  for (let i = 0; i < total; i++) circle(c, 320 + (i - (total - 1) / 2) * 27, 425, 8, i < value ? GREEN : '#19233822');
}
function aim(c: CanvasRenderingContext2D, x: number, y: number) {
  c.beginPath(); c.arc(x, y, 18, 0, Math.PI * 2); c.strokeStyle = INK; c.lineWidth = 2; c.stroke();
  line(c, x - 27, y, x - 9, y, INK, 2); line(c, x + 9, y, x + 27, y, INK, 2);
  line(c, x, y - 27, x, y - 9, INK, 2); line(c, x, y + 9, x, y + 27, INK, 2);
}

export function renderArcadeGame(ctx: CanvasRenderingContext2D, session: RushSession): boolean {
  const game = session.game, a = game?.extra;
  if (!game || a?.pack !== 'arcade') return false;
  ctx.save(); ctx.beginPath(); ctx.rect(24, 112, 592, 326); ctx.clip();
  switch (a.id) {
    case 'lander': {
      box(ctx, 29, 116, 582, 318, '#283850', 20);
      for (let i = 0; i < 30; i++) circle(ctx, 51 + (i * 83) % 548, 131 + (i * 47) % 233, i % 3 ? 1.5 : 3, '#fff7e399');
      circle(ctx, 540, 171, 26, '#9fdcd0'); circle(ctx, 531, 163, 10, '#66bd98');
      box(ctx, 29, 395, 582, 43, '#b6a7bd', 6);
      for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.ellipse(65 + i * 83, 417 + i % 2 * 9, 23, 7, 0, 0, Math.PI * 2); ctx.fillStyle = '#877e9b'; ctx.fill(); }
      box(ctx, a.pad - 60, 389, 120, 11, GREEN, 5); line(ctx, a.pad - 60, 389, a.pad - 60, 370, GREEN); line(ctx, a.pad + 60, 389, a.pad + 60, 370, GREEN);
      text(ctx, 'LAND', a.pad, 417, 18, INK);
      if (a.thrust) { ctx.beginPath(); ctx.moveTo(a.x - 12, a.y + 13); ctx.lineTo(a.x, a.y + 43 + Math.sin(game.time * 60) * 7); ctx.lineTo(a.x + 12, a.y + 13); ctx.fillStyle = YELLOW; ctx.fill(); }
      line(ctx, a.x - 17, a.y + 7, a.x - 25, a.y + 20, CREAM, 4); line(ctx, a.x + 17, a.y + 7, a.x + 25, a.y + 20, CREAM, 4);
      box(ctx, a.x - 22, a.y - 23, 44, 37, CREAM, 11, INK); circle(ctx, a.x, a.y - 9, 12, BLUE); circle(ctx, a.x - 3, a.y - 12, 5, '#fff7e3bb');
      box(ctx, 69, 134, 154, 32, a.vy > a.safeSpeed ? '#f16c95' : GREEN, 10); text(ctx, `下降 ${Math.max(0, Math.round(a.vy))} / ${a.safeSpeed}`, 146, 151, 16);
      if (a.variation) text(ctx, a.variation === 1 ? '低重力 ↓' : '高重力 ↓↓', 320, 417, 17, INK);
      break;
    }
    case 'tower': {
      box(ctx, 39, 121, 562, 307, '#e8ecf4', 22);
      for (let i = 0; i < 8; i++) { const h = 35 + i % 3 * 20; box(ctx, 47 + i * 72, 397 - h, 49, h, '#cfdae7', 4); }
      box(ctx, 95, 394, 450, 18, INK, 7);
      a.stack.forEach((block, i) => {
        const y = 394 - i * 47 - 43;
        box(ctx, block.x - block.width / 2, y, block.width, 43, [BLUE, PINK, GREEN, YELLOW][i], 7, INK);
        line(ctx, block.x - block.width / 2 + 11, y + 10, block.x + block.width / 2 - 11, y + 10, '#fff7e388', 3);
      });
      const width = a.stack[a.stack.length - 1].width;
      if (a.stack.length < 4) { line(ctx, a.x, 153, a.x, a.y - 22, '#8995aa', 3); box(ctx, a.x - width / 2, a.y - 43, width, 43, [PINK, GREEN, YELLOW][a.stack.length - 1], 7, INK); }
      text(ctx, a.variation === 2 ? '高速！ タップで 落とす！' : 'タップで 落とす！', 320, 139, 20); progress(ctx, a.stack.length - 1, 3); break;
    }
    case 'mole': {
      box(ctx, 42, 145, 556, 267, '#b9d8a0', 24);
      for (let i = 0; i < 18; i++) { const x = 62 + (i * 87) % 516, y = 166 + (i * 53) % 230; line(ctx, x, y, x + 4, y - 9, '#8fb778', 2); }
      for (let i = 0; i < 6; i++) {
        const p = molePosition(i), active = a.slot >= 0 && a.slot < a.targets.length;
        ctx.beginPath(); ctx.ellipse(p.x, p.y + 20, 58, 23, 0, 0, Math.PI * 2); ctx.fillStyle = '#7f7756'; ctx.fill();
        ctx.beginPath(); ctx.ellipse(p.x, p.y + 18, 46, 15, 0, 0, Math.PI * 2); ctx.fillStyle = '#383d35'; ctx.fill();
        if (active && a.targets[a.slot] === i && !a.hitSlots.includes(a.slot)) {
          circle(ctx, p.x - 26, p.y - 23, 11, '#b68b63'); circle(ctx, p.x + 26, p.y - 23, 11, '#b68b63');
          box(ctx, p.x - 36, p.y - 40, 72, 63, '#b68b63', 30, INK); circle(ctx, p.x - 13, p.y - 15, 4, INK); circle(ctx, p.x + 13, p.y - 15, 4, INK);
          circle(ctx, p.x, p.y - 3, 12, '#e8c6a4'); circle(ctx, p.x, p.y - 7, 5, PINK);
        }
        if (active && (a.bombs[a.slot] === i || a.secondBombs[a.slot] === i)) { line(ctx, p.x, p.y - 30, p.x + 13, p.y - 47, INK, 5); circle(ctx, p.x + 15, p.y - 49, 7, YELLOW); circle(ctx, p.x, p.y - 7, 31, INK); text(ctx, '×', p.x, p.y - 6, 30, CREAM); circle(ctx, p.x - 10, p.y - 19, 6, '#fff7e344'); }
        if (active && a.targets[a.slot] === i && a.hitSlots.includes(a.slot)) text(ctx, 'HIT!', p.x, p.y - 20, 25, '#338663');
        if (i === a.selected) { ctx.beginPath(); ctx.ellipse(p.x, p.y + 22, 61, 26, 0, 0, Math.PI * 2); ctx.strokeStyle = YELLOW; ctx.lineWidth = 5; ctx.stroke(); }
      }
      text(ctx, `もぐら ${a.required}匹     爆弾 ×`, 320, 128, 20); progress(ctx, a.count, a.required); break;
    }
    case 'racer': {
      box(ctx, 69, 119, 502, 316, '#a8c7a0', 20); box(ctx, 109, 119, 422, 316, '#677387', 5);
      line(ctx, 112, 122, 112, 435, CREAM, 5); line(ctx, 528, 122, 528, 435, CREAM, 5);
      for (const x of [250, 390]) for (let i = 0; i < 7; i++) { const y = 115 + (i * 58 + game.time * 240) % 330; line(ctx, x, y, x, y + 28, '#fff7e3bb', 3); }
      for (const row of a.rows) {
        const y = 371 - (row.time - game.time) * 220;
        if (y < 123 || y > 425) continue;
        for (let lane = 0; lane < 3; lane++) {
          const x = racerLaneX(lane);
          if (lane === row.safe) { text(ctx, '↓', x, y, 31, '#9fdcd0'); continue; }
          box(ctx, x - 49, y - 22, 98, 39, '#f8c07c', 4, INK);
          for (let i = 0; i < 4; i++) line(ctx, x - 42 + i * 24, y - 18, x - 25 + i * 24, y + 12, INK, 9);
          line(ctx, x - 33, y + 19, x - 33, y + 33, INK, 6); line(ctx, x + 33, y + 19, x + 33, y + 33, INK, 6);
        }
      }
      const x = racerLaneX(a.lane); box(ctx, x - 31, 339, 62, 80, INK, 14); box(ctx, x - 25, 335, 50, 77, YELLOW, 14, INK);
      box(ctx, x - 18, 349, 36, 22, BLUE, 6); line(ctx, x - 18, 393, x + 18, 393, '#b79b24', 3); circle(ctx, x - 16, 341, 5, CREAM); circle(ctx, x + 16, 341, 5, CREAM);
      progress(ctx, a.count, a.rows.length); break;
    }
    case 'pour': {
      box(ctx, 54, 150, 532, 263, '#f1dfd9', 24); box(ctx, 54, 382, 532, 31, '#c59e83', 7);
      for (let i = 0; i < 2; i++) {
        const x = 222 + i * 196, top = 217, h = 158, targetY = top + h * (1 - a.targets[i]);
        box(ctx, x - 55, top, 110, h + 8, '#fff7e3bb', 13, INK);
        const fill = Math.min(1, a.fills[i]); box(ctx, x - 48, top + h * (1 - fill), 96, Math.max(0, h * fill), '#f8b74b', 7);
        line(ctx, x - 66, targetY, x + 66, targetY, GREEN, 5);
        line(ctx, x - 43, top + 11, x - 43, top + 100, '#ffffffbb', 5);
        text(ctx, i < a.cup ? '✓' : String(i + 1), x, 404, 25, i < a.cup ? '#338663' : INK);
        if (i === a.cup) { text(ctx, '▼', x, 184, 25, PINK); if (a.pouring) box(ctx, x - 4 - a.flow * 4, 175, 8 + a.flow * 8, top + h * (1 - fill) - 175, '#f8b74b', 5); }
      }
      text(ctx, a.variation === 2 ? '強弱のある蛇口！ 緑の線で離す' : '緑の線で 離そう！', 320, 131, a.variation === 2 ? 19 : 22); break;
    }
    case 'puck': {
      box(ctx, 48, 133, 548, 294, '#a4d3dd', 23, INK); box(ctx, 61, 147, 522, 263, '#def0ef', 14);
      for (let i = 0; i < 9; i++) line(ctx, 86 + i * 55, 170, 111 + i * 55, 191, '#ffffffbb', 4);
      for (const gate of a.gates) {
        box(ctx, gate.x - 10, 145, 20, gate.y - a.gapHalf - 16 - 145, '#708bb2', 5, INK);
        box(ctx, gate.x - 10, gate.y + a.gapHalf + 16, 20, 413 - gate.y - a.gapHalf - 16, '#708bb2', 5, INK);
        text(ctx, '→', gate.x, gate.y, 26, '#5b9a9d');
      }
      circle(ctx, 550, a.goalY, 32, '#66bd9844'); circle(ctx, 550, a.goalY, 23, '#66bd98'); text(ctx, 'GO', 550, a.goalY, 18);
      for (let i = 3; i > 0; i--) circle(ctx, a.x - a.vx * i * 0.018, a.y - a.vy * i * 0.018, 14 - i * 2.2, '#708bb233');
      circle(ctx, a.x + 2, a.y + 5, 17, '#19233822'); circle(ctx, a.x, a.y, 16, INK); circle(ctx, a.x, a.y - 3, 12, PINK); line(ctx, a.x - 7, a.y - 6, a.x + 3, a.y - 9, '#fff7e3aa', 3);
      text(ctx, 'すき間をぬけて → ゴールで減速', 320, 123, 19); break;
    }
    case 'fire': {
      box(ctx, 48, 151, 544, 252, '#e5e3d3', 22); box(ctx, 64, 349, 512, 53, '#c5c3b6', 9);
      for (const flame of a.flames) {
        box(ctx, flame.x - 42, flame.y + 10, 84, 85, '#d99e82', 8, INK); box(ctx, flame.x - 25, flame.y + 30, 50, 44, '#677387', 4, INK);
        if (flame.heat > 0) {
          ctx.save(); ctx.translate(flame.x, flame.y + 11); ctx.scale(0.65 + flame.heat * 0.45, 0.65 + flame.heat * 0.45);
          const sway = Math.sin(game.time * 13 + flame.x) * 7;
          ctx.beginPath(); ctx.moveTo(-30, 20); ctx.quadraticCurveTo(-51, -7, -16, -41); ctx.quadraticCurveTo(-10, -12, sway, -63); ctx.quadraticCurveTo(48, -15, 30, 20); ctx.closePath(); ctx.fillStyle = PINK; ctx.fill();
          ctx.beginPath(); ctx.moveTo(-17, 22); ctx.quadraticCurveTo(-26, 0, 2, -30); ctx.quadraticCurveTo(24, 2, 17, 22); ctx.closePath(); ctx.fillStyle = YELLOW; ctx.fill(); ctx.restore();
        } else { circle(ctx, flame.x, flame.y - 4, 25, GREEN); text(ctx, '✓', flame.x, flame.y - 3, 30, CREAM); }
      }
      const hoseX = 320, hoseY = 398;
      if (a.spraying) {
        line(ctx, hoseX, hoseY, a.x, a.y, '#67b9e8', 12); line(ctx, hoseX, hoseY, a.x, a.y, '#c8f3ff', 5);
        for (let i = 0; i < 7; i++) { const angle = i * 2.4 + game.time * 11; circle(ctx, a.x + Math.cos(angle) * 23, a.y + Math.sin(angle) * 23, 4, BLUE); }
      }
      box(ctx, 289, 382, 62, 34, '#708bb2', 9, INK); aim(ctx, a.x, a.y);
      text(ctx, 'WATER', 117, 129, 15); box(ctx, 166, 122, 290, 15, '#19233822', 7); box(ctx, 166, 122, a.water * 290, 15, '#67b9e8', 7); progress(ctx, a.flames.filter(f => f.heat === 0).length, a.flames.length); break;
    }
    case 'tug': {
      box(ctx, 42, 145, 556, 274, '#dbe7ce', 24); box(ctx, 42, 288, 556, 131, '#b7cd9e', 12);
      const ropeY = 265, offset = a.progress * 95, pull = game.time - a.lastPull < 0.12 ? -7 : 0;
      line(ctx, 320, 198, 320, 330, '#fff7e3aa', 4);
      for (const direction of [-1, 1]) {
        const x = 320 + direction * 156 - offset;
        line(ctx, x, 265, x - direction * 26, 315, INK, 12); line(ctx, x, 265, x + direction * 19, 315, INK, 12);
        box(ctx, x - 25, 231 + (direction === -1 ? pull : 0), 50, 48, direction === -1 ? BLUE : PINK, 11, INK);
        circle(ctx, x, 212 + (direction === -1 ? pull : 0), 23, CREAM); circle(ctx, x + direction * 7, 208 + (direction === -1 ? pull : 0), 3, INK);
        line(ctx, x + direction * 4, 242, x - direction * 40, ropeY, CREAM, 10);
      }
      line(ctx, 98 - offset, ropeY, 542 - offset, ropeY, '#a07956', 8); line(ctx, 98 - offset, ropeY - 2, 542 - offset, ropeY - 2, '#dfbf8c', 3);
      box(ctx, 313 - offset, ropeY - 14, 14, 31, PINK, 3);
      for (const direction of [-1, 1]) { const x = 320 + direction * 134; box(ctx, x - 99, 334, 198, 71, a.next === direction ? YELLOW : CREAM, 18, INK); text(ctx, direction === -1 ? '←  LEFT' : 'RIGHT  →', x, 370, 23); }
      text(ctx, a.variation === 1 ? '2回ずつ！ 光るほうへ' : a.variation === 2 ? '折り返し！ 光る順に' : '光るほうを 交互に！', 320, 130, 22);
      if (a.variation) for (let i = 0; i < 6; i++) { const side = a.pattern[(a.pulls + i) % a.pattern.length]; box(ctx, 210 + i * 37, 156, 32, 30, i === 0 ? YELLOW : CREAM, 7); text(ctx, side === -1 ? '←' : '→', 226 + i * 37, 172, 22); }
      box(ctx, 210, 421, 220, 9, '#19233822', 4); box(ctx, 210, 421, Math.max(0, Math.min(1, a.progress)) * 220, 9, GREEN, 4); break;
    }
  }
  ctx.restore(); return true;
}
