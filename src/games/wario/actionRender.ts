import type { RushSession } from './engine';
import { balanceWind, fishingX, glideGateY, launchLandingX } from './actionGames';

const INK = '#192338', CREAM = '#fff7e3', PINK = '#f16c95', YELLOW = '#f8d94b', GREEN = '#66bd98';
function box(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string, radius = 16, stroke?: string) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, radius); ctx.fillStyle = color; ctx.fill();
  if (stroke) { ctx.lineWidth = 3; ctx.strokeStyle = stroke; ctx.stroke(); }
}
function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
}
function line(ctx: CanvasRenderingContext2D, x: number, y: number, xx: number, yy: number, color: string, width = 3) {
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(xx, yy); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
}
function text(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, size = 20, color = INK) {
  ctx.font = `900 ${size}px "Arial", "Noto Sans JP", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = color; ctx.fillText(value, x, y);
}
function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = i * Math.PI / 5 - Math.PI / 2, rr = i % 2 ? r * 0.45 : r;
    if (!i) ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); else ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath(); ctx.fillStyle = color; ctx.fill();
}
function progress(ctx: CanvasRenderingContext2D, count: number, total: number, y = 426, color = GREEN) {
  for (let i = 0; i < total; i++) {
    const x = 320 + (i - (total - 1) / 2) * 27;
    circle(ctx, x, y, 8, i < count ? color : '#19233820');
    if (i < count) { line(ctx, x - 3, y, x - 1, y + 3, CREAM, 2); line(ctx, x - 1, y + 3, x + 4, y - 3, CREAM, 2); }
  }
}
function fish(ctx: CanvasRenderingContext2D, x: number, y: number, direction = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(direction, 1);
  ctx.beginPath(); ctx.moveTo(-24, 0); ctx.lineTo(-47, -22); ctx.lineTo(-47, 22); ctx.closePath(); ctx.fillStyle = YELLOW; ctx.fill();
  ctx.beginPath(); ctx.ellipse(0, 0, 34, 22, 0, 0, Math.PI * 2); ctx.fillStyle = PINK; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
  circle(ctx, 17, -5, 7, CREAM); circle(ctx, 19, -5, 3, INK); line(ctx, -5, -9, -12, 0, '#bc4d76', 3); line(ctx, -12, 0, -5, 9, '#bc4d76', 3); ctx.restore();
}

/** Each pack draws only the shared 640 × 480 playfield; the parent owns the instruction HUD. */
export function renderActionGame(ctx: CanvasRenderingContext2D, session: RushSession): boolean {
  const game = session.game, a = game?.extra;
  if (!game || a?.pack !== 'action') return false;
  ctx.save(); ctx.beginPath(); ctx.rect(24, 112, 592, 326); ctx.clip();
  switch (a.id) {
    case 'target': {
      box(ctx, 58, 151, 524, 248, '#ece1c8', 24); box(ctx, 70, 160, 500, 229, '#fbefd5', 19);
      for (let i = 0; i < a.targets.length; i++) {
        const t = a.targets[i];
        if (i < a.count) { star(ctx, t.x, t.y, 24, YELLOW); text(ctx, '✓', t.x, t.y, 24); continue; }
        circle(ctx, t.x + 4, t.y + 6, 43, '#1923381a');
        circle(ctx, t.x, t.y, 42, i === a.count ? PINK : '#d2c6b1');
        circle(ctx, t.x, t.y, 29, CREAM); circle(ctx, t.x, t.y, 18, i === a.count ? PINK : '#d2c6b1');
        text(ctx, String(i + 1), t.x, t.y, 17, i === a.count ? '#fff' : INK);
        if (i === a.count) { line(ctx, t.x - 53, t.y, t.x - 45, t.y, INK); line(ctx, t.x + 45, t.y, t.x + 53, t.y, INK); }
      }
      circle(ctx, a.x, a.y, 13, '#19233812');
      ctx.beginPath(); ctx.arc(a.x, a.y, 13, 0, Math.PI * 2); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
      line(ctx, a.x - 23, a.y, a.x - 6, a.y, INK, 2); line(ctx, a.x + 6, a.y, a.x + 23, a.y, INK, 2);
      line(ctx, a.x, a.y - 23, a.x, a.y - 6, INK, 2); line(ctx, a.x, a.y + 6, a.x, a.y + 23, INK, 2);
      progress(ctx, a.count, a.targets.length); break;
    }
    case 'rally': {
      box(ctx, 54, 126, 532, 283, '#badfd5', 25, '#8abbb0');
      box(ctx, 69, 141, 502, 249, '#cce9dc', 14);
      line(ctx, 320, 146, 320, 369, '#ffffff77', 2); line(ctx, 76, 254, 564, 254, '#ffffffaa', 3);
      if (a.variation === 2) { box(ctx, 69, 141, 502, a.ceiling - 129, '#6f9e93', 9); text(ctx, 'FAST', 320, 157, 17, CREAM); }
      for (let i = 3; i >= 1; i--) circle(ctx, a.ball.x - a.vx * i * 0.018, a.ball.y - a.vy * i * 0.018, 10 - i * 1.6, '#ffffff88');
      circle(ctx, a.ball.x + 3, a.ball.y + 4, 12, '#19233820'); circle(ctx, a.ball.x, a.ball.y, 12, CREAM); circle(ctx, a.ball.x - 3, a.ball.y - 3, 4, YELLOW);
      box(ctx, a.x - a.width / 2, 382, a.width, 18, '#b99a32', 8); box(ctx, a.x - a.width / 2, 374, a.width, 18, YELLOW, 8, INK);
      progress(ctx, a.count, 3); if (a.variation !== 2) text(ctx, a.variation === 1 ? 'DIAGONAL' : 'RALLY', 320, 162, 16, '#579582'); break;
    }
    case 'balance': {
      circle(ctx, 128, 172, 30, '#f8d94b33'); star(ctx, 516, 205, 21, '#f16c9533');
      box(ctx, 274, 354, 92, 45, '#cab7d7', 13, INK);
      ctx.beginPath(); ctx.moveTo(320, 292); ctx.lineTo(290, 356); ctx.lineTo(350, 356); ctx.closePath(); ctx.fillStyle = '#8974a8'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
      ctx.save(); ctx.translate(320, 291); ctx.rotate(a.angle);
      box(ctx, -163, -4, 326, 15, '#9fc7c7', 6, INK);
      box(ctx, -66, -42, 132, 36, '#e9bd80', 8, INK); box(ctx, -66, -67, 132, 29, PINK, 7, INK); box(ctx, -66, -90, 132, 26, CREAM, 7, INK);
      for (let i = 0; i < 5; i++) circle(ctx, -51 + i * 25.5, -65, 11, CREAM);
      for (let i = 0; i < 3; i++) { circle(ctx, -38 + i * 38, -99, 10, PINK); line(ctx, -38 + i * 38, -105, -34 + i * 38, -111, GREEN, 4); }
      circle(ctx, -18, -31, 3, INK); circle(ctx, 18, -31, 3, INK); text(ctx, '⌣', 0, -24, 22); ctx.restore();
      box(ctx, 205, 414, 230, 10, '#19233818', 5); box(ctx, 205, 414, Math.max(1, a.progress * 230), 10, GREEN, 5);
      text(ctx, '←', 100, 358, 35, a.angle > 0.16 ? PINK : '#19233855'); text(ctx, '→', 540, 358, 35, a.angle < -0.16 ? PINK : '#19233855');
      const wind = balanceWind(game.time, a.wind, a.variation);
      text(ctx, `${wind >= 0 ? '→' : '←'} ${a.variation === 2 ? '突風！' : '風'}  水平をキープ！`, 320, 138, 19);
      for (let i = 0; i < 3; i++) { const x = wind >= 0 ? 80 : 535; line(ctx, x, 214 + i * 17, x + Math.sign(wind) * (20 + Math.abs(wind) * 18), 214 + i * 17, '#8974a899', 3); }
      break;
    }
    case 'fishing': {
      box(ctx, 34, 250, 572, 185, '#abdce4', 20);
      for (let i = 0; i < 7; i++) { const x = 55 + i * 85; line(ctx, x, 264 + Math.sin(game.time * 2 + i) * 3, x + 43, 264 + Math.sin(game.time * 2 + i) * 3, '#fff7e3aa', 3); }
      for (let i = 0; i < 12; i++) circle(ctx, 60 + (i * 67) % 530, 290 + (i * 53) % 122, 3 + i % 3, '#fff7e366');
      box(ctx, 45, 225, 110, 31, '#c59e77', 6, INK); line(ctx, 65, 254, 65, 294, '#93735e', 8); line(ctx, 135, 254, 135, 294, '#93735e', 8);
      line(ctx, a.x, 145, a.x, a.y, INK, 2); circle(ctx, a.x, 145, 8, YELLOW);
      ctx.beginPath(); ctx.arc(a.x + 6, a.y - 7, 9, 0, Math.PI); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke();
      const caught = a.stage === 'reel'; const x = caught ? a.x : fishingX(game.time, a.fishPhase, a.variation);
      const direction = fishingX(game.time + 0.01, a.fishPhase, a.variation) >= x ? 1 : -1;
      fish(ctx, x, caught ? a.y + 17 : a.depth, caught ? 1 : direction);
      if (a.stage === 'aim') { line(ctx, a.x - 12, a.depth + 10, a.x + 12, a.depth + 10, '#19233855', 2); line(ctx, a.x, a.depth - 4, a.x, a.depth + 22, '#19233855', 2); }
      text(ctx, a.stage === 'reel' ? '長押しで 巻きあげろ！' : a.stage === 'drop' ? '針を おろし中…' : '魚の少し先を ねらおう', 320, 133, 21, caught ? '#338663' : INK);
      if (caught) { box(ctx, 220, 401, 200, 12, '#ffffff88', 6); box(ctx, 220, 401, Math.max(1, 200 * a.progress), 12, GREEN, 6); }
      break;
    }
    case 'launch': {
      circle(ctx, 547, 156, 28, '#f8d94b66'); box(ctx, 35, 380, 570, 58, '#acd5dc', 12);
      for (let i = 0; i < 8; i++) line(ctx, 54 + i * 73, 404, 80 + i * 73, 404, '#fff7e388', 3);
      box(ctx, a.origin - 55, 365, 110, 28, '#baa189', 5); box(ctx, a.origin - 55, 359, 110, 12, GREEN, 5);
      box(ctx, a.target - 43, 365, 86, 28, '#baa189', 5); box(ctx, a.target - 43, 359, 86, 12, GREEN, 5);
      line(ctx, a.target + 25, 358, a.target + 25, 285, INK, 3); ctx.beginPath(); ctx.moveTo(a.target + 25, 285); ctx.lineTo(a.target - 8, 298); ctx.lineTo(a.target + 25, 310); ctx.fillStyle = PINK; ctx.fill();
      if (!a.launched) {
        for (let i = 1; i < 15; i++) { const t = i * 0.055; const x = a.origin + a.direction * (125 + a.charge * 410) * t, y = 365 - 320 * t + 390 * t * t; circle(ctx, x, y, 2.6, '#19233830'); }
      }
      ctx.save(); ctx.translate(a.x, a.y - 14); ctx.rotate(a.launched ? Math.atan2(a.vy, a.vx) + Math.PI / 2 : -0.35 * a.direction);
      if (a.launched) { ctx.beginPath(); ctx.moveTo(-8, 19); ctx.lineTo(0, 42); ctx.lineTo(8, 19); ctx.fillStyle = YELLOW; ctx.fill(); }
      box(ctx, -12, -20, 24, 42, '#c9b5ef', 10, INK); circle(ctx, 0, -5, 6, '#a4dbe8');
      ctx.beginPath(); ctx.moveTo(-12, -13); ctx.lineTo(0, -33); ctx.lineTo(12, -13); ctx.fillStyle = PINK; ctx.fill(); ctx.restore();
      box(ctx, 153, 414, 334, 15, '#19233820', 7);
      const chargeAt = (x: number) => (x - launchLandingX(0, a.variation)) / (launchLandingX(1, a.variation) - launchLandingX(0, a.variation));
      const bounds = [chargeAt(a.target - 35), chargeAt(a.target + 35)].sort((x, y) => x - y);
      const low = Math.max(0, bounds[0]), high = Math.min(1, bounds[1]);
      box(ctx, 153 + low * 334, 414, (high - low) * 334, 15, GREEN, 5);
      line(ctx, 153 + a.charge * 334, 410, 153 + a.charge * 334, 432, INK, 5);
      text(ctx, a.launched ? 'とどけー！' : 'ためる → 緑で 離す！', 320, 135, 22); break;
    }
    case 'glide': {
      box(ctx, 30, 118, 580, 309, '#cce7e6', 19);
      for (const [x, y] of [[172, 174], [403, 212], [554, 154]]) { circle(ctx, x, y, 21, '#fff7e399'); circle(ctx, x + 21, y + 6, 15, '#fff7e399'); box(ctx, x - 18, y + 5, 55, 15, '#fff7e399', 8); }
      for (const gate of a.gates) {
        const x = gate.x - game.time * 220;
        if (x < -30 || x > 655) continue;
        const y = glideGateY(gate, game.time, a.variation);
        const top = y - a.gap / 2, bottom = y + a.gap / 2;
        box(ctx, x - 21, 112, 42, top - 112, '#6eae96', 8, INK); box(ctx, x - 27, top - 16, 54, 18, YELLOW, 6, INK);
        box(ctx, x - 21, bottom, 42, 430 - bottom, '#6eae96', 8, INK); box(ctx, x - 27, bottom - 2, 54, 18, YELLOW, 6, INK);
        star(ctx, x, y, 11, '#fff7e3aa');
        if (a.variation === 2) text(ctx, '↕', x, y + 28, 19, '#39876a');
      }
      ctx.save(); ctx.translate(130, a.y); ctx.rotate(a.vy * 0.0014);
      ctx.beginPath(); ctx.moveTo(29, -3); ctx.lineTo(-24, -18); ctx.lineTo(-9, 3); ctx.lineTo(-23, 19); ctx.closePath(); ctx.fillStyle = PINK; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
      line(ctx, -9, 3, 29, -3, '#fff7e3', 3); circle(ctx, 6, -4, 3, INK); ctx.restore();
      progress(ctx, a.count, 3, 426, '#39876a'); break;
    }
    case 'rhythm': {
      box(ctx, 58, 186, 525, 162, '#eedfec', 23);
      for (let i = 0; i < 3; i++) line(ctx, 78, 231 + i * 27, 563, 231 + i * 27, '#b59aa9', 2);
      const next = a.beats[a.count], ready = next !== undefined && Math.abs(game.time - next) < a.window;
      const flash = game.time - a.lastHit < 0.2;
      circle(ctx, 170, 259, 42 + (flash ? 7 : 0), flash ? '#66bd9844' : '#ffffff55');
      ctx.beginPath(); ctx.arc(170, 259, 35, 0, Math.PI * 2); ctx.lineWidth = 5; ctx.strokeStyle = ready ? GREEN : INK; ctx.stroke();
      line(ctx, 170, 198, 170, 320, ready ? GREEN : '#19233844', 2);
      for (let i = a.count; i < a.beats.length; i++) {
        const x = 170 + (a.beats[i] - game.time) * 148;
        circle(ctx, x, 265, 17, PINK); line(ctx, x + 14, 262, x + 14, 218, INK, 4); line(ctx, x + 14, 218, x + 31, 225, INK, 4);
      }
      text(ctx, flash ? 'NICE!' : ready ? 'いま！' : '輪に かさなったら！', 320, 153, 23, flash || ready ? '#338663' : INK);
      const rhythmLabel = a.variation === 1 ? '1 ・ 2     ・     3' : a.variation === 2 ? '1     ・     2 ・ 3' : '1     ・     2     ・     3';
      text(ctx, rhythmLabel, 320, 381, 25, '#a57c93'); progress(ctx, a.count, 3); break;
    }
    case 'scrub': {
      box(ctx, 98, 163, 444, 238, '#9fbdc4', 20, INK); box(ctx, 109, 174, 422, 216, '#dbedef', 12);
      line(ctx, 121, 186, 151, 216, '#ffffffbb', 6); line(ctx, 132, 181, 175, 224, '#ffffff88', 3);
      for (let i = 0; i < a.spots.length; i++) {
        const s = a.spots[i];
        if (s.clean >= 1) { star(ctx, s.x, s.y, 17, '#ffffff'); star(ctx, s.x + 21, s.y - 19, 7, YELLOW); continue; }
        ctx.save(); ctx.globalAlpha = 1 - s.clean * 0.85;
        circle(ctx, s.x, s.y, 29, '#a58b76'); circle(ctx, s.x - 18, s.y + 10, 16, '#a58b76'); circle(ctx, s.x + 18, s.y - 6, 15, '#a58b76');
        circle(ctx, s.x - 9, s.y - 8, 5, '#786453'); circle(ctx, s.x + 10, s.y + 8, 4, '#786453'); ctx.restore();
        if (a.variation === 2) { line(ctx, s.x - 20, s.y - 19, s.x + 18, s.y + 18, '#786453', 3); line(ctx, s.x + 19, s.y - 20, s.x - 18, s.y + 17, '#786453', 3); }
      }
      ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(Math.sin(game.time * 8) * 0.08);
      box(ctx, -28, -19, 56, 38, '#9cba8f', 9, INK); box(ctx, -28, -25, 56, 34, YELLOW, 9, INK);
      for (const [x, y, r] of [[-15, -13, 3], [12, -16, 4], [1, -5, 2.5], [18, -4, 2]]) circle(ctx, x, y, r, '#c6a739'); ctx.restore();
      for (let i = 0; i < 3; i++) { const x = a.x + 32 + Math.sin(game.time * 4 + i) * 10, y = a.y - 24 - i * 13; circle(ctx, x, y, 5 + i, '#ffffffaa'); }
      progress(ctx, a.count, a.spots.length); text(ctx, a.variation === 2 ? '長めに こすって ピカピカ！' : 'こすると ピカピカ！', 320, 133, 21); break;
    }
  }
  ctx.restore(); return true;
}
