import type { RushSession } from './engine';
import { golemPanelX, krakenLaneX, type ChallengeBossState, type GolemBossState, type KrakenBossState } from './challengeBosses';

const INK = '#192338', CREAM = '#fff7e3', GREEN = '#8fe0b6', GOLD = '#f8d94b', PINK = '#f38dac';
const LANE_COLORS = ['#98d9ec', '#f7ce78', '#e6a6de'];

function box(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, radius = 8, stroke?: string, width = 2) {
  c.beginPath(); c.roundRect(x, y, Math.max(0, w), Math.max(0, h), radius); c.fillStyle = fill; c.fill();
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = width; c.stroke(); }
}
function circle(c: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string, stroke?: string, width = 2) {
  c.beginPath(); c.arc(x, y, Math.max(0, r), 0, Math.PI * 2); c.fillStyle = fill; c.fill();
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = width; c.stroke(); }
}
function text(c: CanvasRenderingContext2D, value: string, x: number, y: number, size = 16, fill = CREAM) {
  c.font = `900 ${size}px "Arial", "Noto Sans JP", sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = fill; c.fillText(value, x, y);
}
function line(c: CanvasRenderingContext2D, x: number, y: number, xx: number, yy: number, fill: string, width = 3) {
  c.beginPath(); c.moveTo(x, y); c.lineTo(xx, yy); c.strokeStyle = fill; c.lineWidth = width; c.stroke();
}
function arrow(c: CanvasRenderingContext2D, x: number, y: number, direction: number, size: number, fill: string, width = 5) {
  c.save(); c.translate(x, y); c.rotate(direction * Math.PI / 2);
  line(c, 0, size * 0.65, 0, -size * 0.7, fill, width);
  line(c, -size * 0.55, -size * 0.1, 0, -size * 0.7, fill, width);
  line(c, 0, -size * 0.7, size * 0.55, -size * 0.1, fill, width); c.restore();
}

function hud(c: CanvasRenderingContext2D, state: ChallengeBossState) {
  box(c, 40, 121, 560, 28, '#101d2c88', 8);
  text(c, `PHASE ${state.phase}/3`, 101, 135, 13);
  box(c, 181, 128, 251, 13, '#ffffff22', 5);
  box(c, 181, 128, 251 * Math.max(0, state.hp) / state.maxHp, 13, state.hitFlash > 0 ? CREAM : state.id === 'boss-golem' ? GREEN : PINK, 5);
  for (let index = 0; index < 3; index++) {
    const x = 474 + index * 35, active = state.armor > index;
    c.beginPath(); c.moveTo(x, 126); c.lineTo(x + 8, 129); c.lineTo(x + 6, 139); c.lineTo(x, 144); c.lineTo(x - 6, 139); c.lineTo(x - 8, 129); c.closePath();
    c.fillStyle = active ? '#a4dbe8' : '#ffffff18'; c.fill();
    c.strokeStyle = active ? CREAM : '#ffffff44'; c.lineWidth = 1.5; c.stroke();
  }
}

function golem(c: CanvasRenderingContext2D, state: GolemBossState, time: number) {
  const flash = state.hitFlash > 0, defeated = state.hp <= 0;
  box(c, 25, 113, 590, 324, '#29483e', 16);
  // Masonry and the stone fists frame the living seal without covering its controls.
  for (let row = 0; row < 5; row++) for (let column = 0; column < 7; column++) {
    const x = 32 + column * 98 + row % 2 * 44;
    box(c, x, 156 + row * 55, 88, 44, '#335247', 5, '#43615455', 1);
  }
  const bob = Math.sin(time * 2.6) * 2, faceY = 184 + bob;
  for (const direction of [-1, 1]) {
    const x = 320 + direction * 88;
    box(c, x - 25, faceY - 13, 50, 38, flash ? CREAM : '#859f83', 9, '#142d29', 3);
    for (let index = 0; index < 3; index++) line(c, x - 14 + index * 13, faceY + 3, x - 14 + index * 13, faceY + 17, '#4f6d59', 2);
  }
  box(c, 276, faceY - 33, 88, 67, flash ? CREAM : '#afbf94', 14, '#17372f', 3);
  box(c, 291, faceY - 18, 58, 20, '#2f4c3f', 5);
  for (const direction of [-1, 1]) {
    const x = 320 + direction * 16;
    if (defeated) { line(c, x - 5, faceY - 12, x + 5, faceY - 2, '#9ceab5', 3); line(c, x - 5, faceY - 2, x + 5, faceY - 12, '#9ceab5', 3); }
    else box(c, x - 6, faceY - 11, 12, 7, state.boardTime > state.boardLimit - 1.4 ? PINK : GREEN, 2);
  }
  line(c, 304, faceY + 16, 336, faceY + 16, '#345740', 5);
  line(c, 320, faceY - 32, 314, faceY - 21, '#5d7d5d', 2);
  line(c, 314, faceY - 21, 323, faceY - 17, '#5d7d5d', 2);
  const remain = Math.max(0, 1 - state.boardTime / state.boardLimit);
  box(c, 68, 224, 504, 7, '#ffffff20', 3); box(c, 68, 224, 504 * remain, 7, remain < 0.25 ? PINK : GREEN, 3);
  text(c, `封印 ${state.boardIndex + 1}/3 ・ お手本に そろえよう`, 320, 245, 15);
  const targets = state.boards[state.boardIndex].target;
  for (let index = 0; index < 4; index++) {
    const x = golemPanelX(index), matched = state.panels[index] === targets[index];
    const selected = state.selected === index, linked = state.variation === 2 && (state.selected + 1) % 4 === index;
    box(c, x - 24, 257, 48, 31, '#132d27', 6, '#91b79a88', 1);
    arrow(c, x, 273, targets[index], 13, CREAM, 4);
    box(c, x - 52, 299, 104, 87, matched ? '#8fe0b623' : '#142f2a', 13, selected ? GOLD : linked ? '#f8d94b88' : matched ? GREEN : '#789786', selected ? 4 : 2);
    arrow(c, x, 336, state.panels[index], 28, matched ? GREEN : CREAM, 8);
    text(c, matched ? 'OK' : String(index + 1), x, 373, 12, matched ? GREEN : '#adc7b5');
    if (state.variation === 2) {
      line(c, x + 53, 334, x + 68, 334, '#c0d4a188', 2);
      if (index < 3) { line(c, x + 63, 329, x + 68, 334, '#c0d4a188', 2); line(c, x + 63, 339, x + 68, 334, '#c0d4a188', 2); }
    }
  }
  const label = state.variation === 2 ? '自分と右となりが回る！ 右端の次は左端' : state.variation === 1 ? '左に90°回る ・ ← → ＋ Space / パネルをタップ' : '右に90°回る ・ ← → ＋ Space / パネルをタップ';
  text(c, state.feedbackTime > 0 ? state.feedback : label, 320, 414, 14, state.feedbackTime > 0 ? GOLD : CREAM);
  if (state.transition > 0 || defeated) {
    box(c, 170, 313, 300, 49, '#102b25ed', 12, GREEN);
    text(c, defeated ? '封印を すべて解除！' : '封印解除！', 320, 338, 24, GREEN);
  }
}

function kraken(c: CanvasRenderingContext2D, state: KrakenBossState, time: number) {
  const defeated = state.hp <= 0, flash = state.hitFlash > 0;
  box(c, 25, 113, 590, 324, '#2a2347', 16);
  for (let row = 0; row < 6; row++) {
    c.beginPath();
    for (let x = 29; x <= 613; x += 8) {
      const y = 181 + row * 48 + Math.sin(x / 50 + time * 1.4 + row) * 6;
      if (x === 29) c.moveTo(x, y); else c.lineTo(x, y);
    }
    c.strokeStyle = '#c4a9e615'; c.lineWidth = 2; c.stroke();
  }
  // Three curved arms point into the rhythm lanes; a headband makes the boss a drummer.
  for (let lane = 0; lane < 3; lane++) {
    const x = krakenLaneX(lane), wobble = Math.sin(time * 3 + lane) * 6;
    c.beginPath(); c.moveTo(320 + (lane - 1) * 25, 191); c.bezierCurveTo(x + 55, 207 + wobble, x - 43, 220 - wobble, x, 235);
    c.strokeStyle = flash ? CREAM : '#9172b8'; c.lineWidth = 17; c.stroke();
    for (let index = 0; index < 3; index++) circle(c, x - 13 + index * 13, 224 + Math.sin(index) * 4, 3, '#dcb6dc');
  }
  c.beginPath(); c.ellipse(320, 180, 39, 29, 0, 0, Math.PI * 2); c.fillStyle = flash ? CREAM : '#b98fca'; c.fill(); c.lineWidth = 3; c.strokeStyle = '#1d1836'; c.stroke();
  box(c, 284, 161, 72, 10, '#edafc2', 5);
  circle(c, 304, 182, 5, '#211c38'); circle(c, 336, 182, 5, '#211c38');
  if (defeated) text(c, '×', 304, 182, 15, INK);
  circle(c, 320, 196, 5, '#5f397e');
  text(c, `${state.hits}/10 ヒットで撃破`, 101, 180, 14);
  text(c, 'ミスは2回まで', 521, 180, 13, '#d8c8e8');
  const lineY = 382, travelSpeed = 104;
  for (let lane = 0; lane < 3; lane++) {
    const x = krakenLaneX(lane), active = state.padFlash[lane] > 0;
    box(c, x - 69, 240, 138, 188, '#17162e77', 12);
    line(c, x, 246, x, 364, '#d2c4ef33', 2);
    box(c, x - 69, 346, 138, 82, active ? `${LANE_COLORS[lane]}66` : '#59416d88', 12, active ? LANE_COLORS[lane] : '#a78aba88', active ? 4 : 2);
    // The complete white ring is the timing target, rather than the pad's top edge.
    circle(c, x, lineY, 25 + (active ? 3 : 0), active ? `${LANE_COLORS[lane]}33` : '#ffffff08', CREAM, 3);
    arrow(c, x, lineY, [3, 2, 1][lane], 15, CREAM, 4);
    text(c, ['←', '↓', '→'][lane], x, 416, 15, '#d8c8e8');
  }
  const notes = state.notes.filter(note => note.result === null).slice().reverse();
  for (const note of notes) {
    const y = lineY - (note.at - time) * travelSpeed;
    if (y < 240 || y > 416) continue;
    const x = krakenLaneX(note.lane), inWindow = Math.abs(note.at - time) <= state.hitWindow;
    circle(c, x, y, inWindow ? 19 : 17, LANE_COLORS[note.lane], inWindow ? CREAM : '#221d3a', inWindow ? 4 : 2);
    arrow(c, x, y, [3, 2, 1][note.lane], 11, '#29223c', 4);
  }
  if (state.feedbackTime > 0) {
    box(c, 172, 212, 296, 28, '#241c40dd', 8);
    text(c, state.feedback, 320, 226, 15, state.feedback.includes('！') && /PERFECT|GOOD/.test(state.feedback) ? GREEN : GOLD);
  } else text(c, '白い輪で ← ↓ → / パッドをタップ', 320, 225, 13, CREAM);
  if (defeated) { box(c, 173, 280, 294, 56, '#241c40ee', 12, PINK); text(c, 'ビートで 撃破！', 320, 308, 25, GOLD); }
}

/** Pure canvas view: no random generation or timers run while rendering. */
export function renderChallengeBoss(ctx: CanvasRenderingContext2D, session: RushSession): boolean {
  const game = session.game, state = game?.extra;
  if (!game || state?.pack !== 'challenge-boss') return false;
  ctx.save(); ctx.beginPath(); ctx.rect(24, 112, 592, 326); ctx.clip();
  if (state.id === 'boss-golem') golem(ctx, state, game.time); else kraken(ctx, state, game.time);
  hud(ctx, state); ctx.restore(); return true;
}
