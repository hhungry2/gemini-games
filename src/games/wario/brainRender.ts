import type { RushSession } from './engine';
import { brainCard, brainPad, pipeTile, PAD_COLORS, PAD_NAMES, SCALE_UNDO, type BrainState } from './brainGames';

const INK = '#192338', WHITE = '#fffdf7', YELLOW = '#f8d94b', PINK = '#ef789a';
function box(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, stroke?: string, radius = 16) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, radius); ctx.fillStyle = fill; ctx.fill();
  if (stroke) { ctx.lineWidth = 3; ctx.strokeStyle = stroke; ctx.stroke(); }
}
function text(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, size = 22, fill = INK) { ctx.font = `900 ${size}px "Arial", "Noto Sans JP", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = fill; ctx.fillText(value, x, y); }
function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); }
function line(ctx: CanvasRenderingContext2D, x: number, y: number, x2: number, y2: number, fill: string, width = 4) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.strokeStyle = fill; ctx.lineWidth = width; ctx.stroke(); }
function arrow(ctx: CanvasRenderingContext2D, x: number, y: number, direction: number, size = 24, color = INK) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(direction * Math.PI / 2);
  ctx.beginPath(); ctx.moveTo(0, -size); ctx.lineTo(size * 0.72, -size * 0.12); ctx.lineTo(size * 0.29, -size * 0.12); ctx.lineTo(size * 0.29, size); ctx.lineTo(-size * 0.29, size); ctx.lineTo(-size * 0.29, -size * 0.12); ctx.lineTo(-size * 0.72, -size * 0.12); ctx.closePath(); ctx.fillStyle = color; ctx.fill(); ctx.restore();
}
function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string) {
  ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, radius = i % 2 ? r * 0.43 : r; if (i) ctx.lineTo(x + Math.cos(a) * radius, y + Math.sin(a) * radius); else ctx.moveTo(x + Math.cos(a) * radius, y + Math.sin(a) * radius); }
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
}
function footer(ctx: CanvasRenderingContext2D, label = 'タップ  /  ← → で選ぶ ＋ Space') { text(ctx, label, 320, 435, 16, '#7b7d7a'); }
function card(ctx: CanvasRenderingContext2D, p: BrainState, i: number, label: string, color = WHITE, size = 34) {
  const b = brainCard(i); box(ctx, b.x, b.y + 5, b.width, b.height, '#d6c9ac'); box(ctx, b.x, b.y, b.width, b.height, color, p.selected === i ? INK : '#d8cfbd'); text(ctx, label, b.x + b.width / 2, b.y + b.height / 2, size);
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}
function pads(ctx: CanvasRenderingContext2D, active = -1, showNames = false) {
  for (let i = 0; i < 4; i++) { const c = brainPad(i); circle(ctx, c.x, c.y + 4, 43, '#c9bda8'); circle(ctx, c.x, c.y, active === i ? 46 : 42, active === i ? '#fff0a4' : PAD_COLORS[i]); if (active === i) { ctx.beginPath(); ctx.arc(c.x, c.y, 46, 0, Math.PI * 2); ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke(); } arrow(ctx, c.x, c.y - (showNames ? 5 : 0), i, 20); if (showNames) text(ctx, PAD_NAMES[i], c.x, c.y + 23, 11); }
}
function pipe(ctx: CanvasRenderingContext2D, index: number, rotation: number, straight: number, color: string, width: number) {
  const b = pipeTile(index), x = b.x + 49, y = b.y + 49, ends = index === straight ? [rotation === 1 ? 3 : 0, rotation === 1 ? 1 : 2] : [rotation, (rotation + 1) % 4];
  const point = (direction: number) => [x + [0, 49, 0, -49][direction], y + [-49, 0, 49, 0][direction]];
  const start = point(ends[0]), end = point(ends[1]); ctx.beginPath(); ctx.moveTo(start[0], start[1]); ctx.lineTo(x, y); ctx.lineTo(end[0], end[1]); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
}
function formatTime(value: number) { return `${Math.floor(value / 60) || 12}:${String(value % 60).padStart(2, '0')}`; }

export function renderBrainGame(ctx: CanvasRenderingContext2D, session: RushSession): boolean {
  const g = session.game;
  if (!g || g.extra?.pack !== 'brain') return false;
  const p = g.extra;
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (p.id === 'pipe') {
    text(ctx, ['左上の水を、下の出口まで！', '左下の水を、上の出口まで！', '右上の水を、下の出口まで！'][p.variation], 320, p.variation === 1 ? 407 : 125, 20, '#4d8292');
    box(ctx, 207, 147, 226, 226, '#b7d2d5', undefined, 22);
    const endpoint = (tile: number, direction: number) => { const b = pipeTile(tile); return { x: b.x + 49 + [0, 49, 0, -49][direction], y: b.y + 49 + [-49, 0, 49, 0][direction] }; };
    const inlet = endpoint(p.inlet.tile, p.inlet.direction), inletDx = p.inlet.direction === 1 ? 1 : -1;
    line(ctx, inlet.x, inlet.y, inlet.x + inletDx * 55, inlet.y, INK, 29); line(ctx, inlet.x, inlet.y, inlet.x + inletDx * 55, inlet.y, '#74c6e5', 16);
    box(ctx, inlet.x + inletDx * 65 - 20, inlet.y - 23, 41, 46, '#68b4ca', INK, 8); text(ctx, '水', inlet.x + inletDx * 65, inlet.y, 20, WHITE);
    const outlet = endpoint(p.outlet.tile, p.outlet.direction), outletDy = p.outlet.direction === 0 ? -1 : 1;
    line(ctx, outlet.x, outlet.y, outlet.x, outlet.y + outletDy * 26, INK, 29); line(ctx, outlet.x, outlet.y, outlet.x, outlet.y + outletDy * 26, '#74c6e5', 16);
    const goalY = outletDy < 0 ? 123 : 406; box(ctx, outlet.x - 36, goalY - 13, 72, 26, '#72b799', undefined, 9); text(ctx, 'GOAL', outlet.x, goalY, 13, WHITE);
    let flowing = true; const wet = [false, false, false, false];
    for (const i of p.path) { flowing = flowing && p.rotations[i] === p.target[i]; wet[i] = flowing; }
    p.rotations.forEach((rotation, i) => { const b = pipeTile(i); box(ctx, b.x, b.y, b.width, b.height, WHITE, p.selected === i ? INK : '#97b7b9', 12); pipe(ctx, i, rotation, p.straight, INK, 29); pipe(ctx, i, rotation, p.straight, wet[i] ? '#74c6e5' : '#d2dde0', 17); circle(ctx, b.x + 49, b.y + 49, 5, wet[i] ? '#d5f6fb' : '#edf1ef'); });
    // Bridge the gutters only where neighboring pipe openings actually meet.
    const opens = (i: number, direction: number) => i === p.straight ? p.rotations[i] === direction % 2 : p.rotations[i] === direction || (p.rotations[i] + 1) % 4 === direction;
    for (const [a, b, direction] of [[0, 1, 1], [2, 3, 1], [0, 2, 2], [1, 3, 2]]) if (opens(a, direction) && opens(b, (direction + 2) % 4)) { const start = endpoint(a, direction), end = endpoint(b, (direction + 2) % 4); line(ctx, start.x, start.y, end.x, end.y, INK, 29); line(ctx, start.x, start.y, end.x, end.y, wet[a] && wet[b] ? '#74c6e5' : '#d2dde0', 17); }
    footer(ctx, 'タップで回す  /  矢印 ＋ Space');
  } else if (p.id === 'lights') {
    text(ctx, ['真上と、右隣も切りかわる！', '真上と、左隣も切りかわる！', 'ボタンの番号が切りかわる！'][p.variation], 320, 132, 21, '#8d7d47');
    const centers = [154, 320, 486];
    for (let i = 0; i < 3; i++) {
      line(ctx, centers[i], 326, centers[i], 249, '#9eaaad', 5);
      p.masks.forEach((mask, button) => { if (button === i) for (let lamp = 0; lamp < 3; lamp++) if (lamp !== button && mask & (1 << lamp)) { line(ctx, centers[button], 292 - button * 14, centers[lamp], 292 - button * 14, '#9eaaad', 3); line(ctx, centers[lamp], 292 - button * 14, centers[lamp], 249, '#9eaaad', 3); } });
      circle(ctx, centers[i], 207, 44, p.lamps[i] ? '#fff1b2' : '#dedbd0'); circle(ctx, centers[i], 207, 32, p.lamps[i] ? YELLOW : '#a4aaa7'); box(ctx, centers[i] - 18, 238, 36, 16, INK, undefined, 4);
      if (p.lamps[i]) for (let ray = 0; ray < 8; ray++) { const a = ray * Math.PI / 4; line(ctx, centers[i] + Math.cos(a) * 49, 207 + Math.sin(a) * 49, centers[i] + Math.cos(a) * 57, 207 + Math.sin(a) * 57, '#d6ae37', 3); }
      card(ctx, p, i, [0, 1, 2].filter(lamp => p.masks[i] & (1 << lamp)).map(lamp => String(lamp + 1)).join(' ＋ '), '#e4e9dc', 27);
    }
    footer(ctx, '全部 ON にしよう  /  タップ・← → ＋ Space');
  } else if (p.id === 'echo') {
    const reveal = g.time < p.revealUntil, age = Math.max(0, g.time - 0.18), step = Math.floor(age / p.flashStep), flash = reveal && g.time >= 0.18 && age % p.flashStep < p.flashStep * 0.78 ? p.sequence[step] ?? -1 : p.feedbackUntil > g.time ? p.feedback : -1;
    box(ctx, 208, 117, 224, 35, reveal ? '#e2d9ed' : '#d7eacb', undefined, 12); text(ctx, reveal ? '光る順番を おぼえて' : `GO!    ${p.progress} / ${p.sequence.length}`, 320, 135, 17, reveal ? '#77628d' : '#517a47');
    pads(ctx, flash, true); text(ctx, reveal ? 'みる' : ['同じ順！', '逆の順！', '右回り！'][p.variation], 320, 294, 19, '#8a779c'); footer(ctx, ['GO の後に同じ順 / タップ・上下左右', 'GO の後に逆の順 / タップ・上下左右', 'GO の後に 1 つ時計回り / タップ・矢印'][p.variation]);
  } else if (p.id === 'clock') {
    circle(ctx, 320, 218, 98, '#d4cdbb'); circle(ctx, 320, 212, 98, WHITE); circle(ctx, 320, 212, 87, '#edf1e6');
    for (let i = 1; i <= 12; i++) { const a = i * Math.PI / 6; text(ctx, String(i), 320 + Math.sin(a) * 71, 212 - Math.cos(a) * 71, 17, '#5d7568'); }
    for (let i = 0; i < 60; i++) { const a = i * Math.PI / 30; line(ctx, 320 + Math.sin(a) * 82, 212 - Math.cos(a) * 82, 320 + Math.sin(a) * (i % 5 ? 85 : 88), 212 - Math.cos(a) * (i % 5 ? 85 : 88), '#93aa9c', i % 5 ? 1 : 2); }
    const hourAngle = (p.hour % 12 + p.minute / 60) * Math.PI / 6 - Math.PI / 2, minuteAngle = p.minute * Math.PI / 30 - Math.PI / 2;
    line(ctx, 320, 212, 320 + Math.cos(hourAngle) * 44, 212 + Math.sin(hourAngle) * 44, INK, 9); line(ctx, 320, 212, 320 + Math.cos(minuteAngle) * 65, 212 + Math.sin(minuteAngle) * 65, PINK, 5); circle(ctx, 320, 212, 8, INK);
    text(ctx, '短い針＝時   長い針＝分', 320, 314, 14, '#718a79'); p.choices.forEach((value, i) => card(ctx, p, i, formatTime(value), WHITE, 31)); footer(ctx);
  } else if (p.id === 'scale') {
    text(ctx, `右と同じ ${p.target} g に！`, 296, 139, 22, '#886851'); box(ctx, SCALE_UNDO.x, SCALE_UNDO.y, SCALE_UNDO.width, SCALE_UNDO.height, WHITE, '#c6b79d', 12); text(ctx, '↶ 戻す', 527, 146, 18);
    const tilt = Math.max(-0.18, Math.min(0.18, (p.total - p.target) * 0.024)), leftY = 235 + Math.sin(tilt) * 148, rightY = 235 - Math.sin(tilt) * 148;
    ctx.beginPath(); ctx.moveTo(320, 222); ctx.lineTo(282, 307); ctx.lineTo(358, 307); ctx.closePath(); ctx.fillStyle = '#aa9072'; ctx.fill();
    line(ctx, 172, leftY, 468, rightY, INK, 9); circle(ctx, 320, 235, 10, YELLOW);
    for (const [x, y] of [[172, leftY], [468, rightY]]) { line(ctx, x - 44, y + 46, x, y, '#9d8271', 3); line(ctx, x + 44, y + 46, x, y, '#9d8271', 3); box(ctx, x - 55, y + 45, 110, 17, '#b88b6d', undefined, 8); }
    box(ctx, 135, leftY + 8, 74, 38, '#a6cfd5', INK, 8); text(ctx, `${p.total} g`, 172, leftY + 28, 23); box(ctx, 431, rightY + 8, 74, 38, YELLOW, INK, 8); text(ctx, `${p.target} g`, 468, rightY + 28, 23);
    p.weights.forEach((weight, i) => card(ctx, p, i, `＋${weight} g`, '#f8e5be', 30)); footer(ctx, 'タップ / ← → ＋ Space で追加・↓ で戻す');
  } else if (p.id === 'pattern') {
    text(ctx, ['毎回おなじ角度、くるっ！', '時計回り 90 度・180 度を交互に！', '90 度ずつ 右回り・左回り！'][p.variation], 320, 141, p.variation ? 20 : 22, '#9b6881');
    p.sequence.forEach((direction, i) => { const x = 128 + i * 96; box(ctx, x - 36, 190, 72, 85, WHITE, '#dfccd5', 14); arrow(ctx, x, 232, direction, 23, '#7c6988'); if (i < 3) text(ctx, '›', x + 48, 231, 24, '#bd9fb0'); });
    box(ctx, 476, 190, 72, 85, '#f6d5e2', INK, 14); text(ctx, '?', 512, 233, 40); text(ctx, 'つぎの向きは？', 320, 302, 17, '#947286');
    p.choices.forEach((direction, i) => { const c = card(ctx, p, i, ''); arrow(ctx, c.x, c.y, direction, 27); }); footer(ctx);
  } else if (p.id === 'cups') {
    const revealing = g.time < p.revealUntil, moving = !revealing && g.time < p.pickAfter - 0.12;
    text(ctx, revealing ? '星を おぼえて！' : moving ? '目で おいかけて！' : '星は どのカップ？', 320, 140, 24, '#628652');
    box(ctx, 75, 397, 490, 13, '#cbbd9d', undefined, 5);
    const elapsed = Math.max(0, g.time - p.revealUntil), swapIndex = Math.floor(elapsed / p.swapDuration), phase = Math.min(1, elapsed % p.swapDuration / p.swapDuration), pair = p.swaps[swapIndex];
    for (let i = 0; i < 3; i++) {
      const b = brainCard(i), x = b.x + b.width / 2;
      let cupX = x, cupY = revealing || session.phase === 'result' && i === p.answer ? 275 : 333;
      if (moving && pair?.includes(i)) { const other = pair[0] === i ? pair[1] : pair[0], to = brainCard(other).x + b.width / 2, eased = (1 - Math.cos(phase * Math.PI)) / 2; cupX += (to - x) * eased; cupY += Math.sin(phase * Math.PI) * (i === pair[0] ? -33 : 24); }
      if (revealing && i === p.initial || session.phase === 'result' && i === p.answer) star(ctx, x, 379, 19, '#e0b82e');
      ctx.beginPath(); ctx.moveTo(cupX - 37, cupY - 42); ctx.quadraticCurveTo(cupX, cupY - 55, cupX + 37, cupY - 42); ctx.lineTo(cupX + 49, cupY + 49); ctx.quadraticCurveTo(cupX, cupY + 58, cupX - 49, cupY + 49); ctx.closePath(); ctx.fillStyle = '#9dc5a3'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke(); line(ctx, cupX - 25, cupY - 25, cupX - 30, cupY + 31, '#d7e9cd', 6);
      if (!revealing && !moving && p.selected === i) { line(ctx, x - 33, 417, x + 33, 417, PINK, 5); }
    }
    footer(ctx, moving || revealing ? '入れ替えが終わってから選ぼう' : 'カップをタップ / ← → ＋ Space');
  } else if (p.id === 'mirror') {
    const start = 320 - (p.sequence.length - 1) * 34;
    p.sequence.forEach((direction, i) => { const x = start + i * 68; box(ctx, x - 27, 115, 54, 42, i < p.progress ? '#c8e3d5' : i === p.progress ? '#fff0ab' : WHITE, i === p.progress ? INK : undefined, 9); arrow(ctx, x, 136, direction, 15, i < p.progress ? '#6c9c86' : INK); });
    pads(ctx); line(ctx, 320, 249, 320, 275, '#9bb5cf', 4); line(ctx, 320, 313, 320, 339, '#9bb5cf', 4); text(ctx, 'かがみ', 320, 294, 16, '#6886ab'); text(ctx, p.variation === 1 ? '← → 同じ' : '← → 逆', 111, 205, 17, '#6886ab'); text(ctx, p.variation === 0 ? '↑ ↓ 同じ' : '↑ ↓ 逆', 528, 205, 17, '#6886ab'); footer(ctx, '左から鏡写しに入力  /  矢印・方向パッド');
  }
  ctx.restore(); return true;
}
