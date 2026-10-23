import type { RushSession } from './engine';

const INK = '#192338', CREAM = '#fff7e3', PINK = '#f16c95', YELLOW = '#f8d94b', GREEN = '#66bd98', BLUE = '#a4dbe8';
const LANE_X = [160, 320, 480];

function box(c: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, fill: string, radius = 8, stroke?: string) {
  c.beginPath(); c.roundRect(x, y, Math.max(0, width), Math.max(0, height), radius); c.fillStyle = fill; c.fill();
  if (stroke) { c.lineWidth = 2; c.strokeStyle = stroke; c.stroke(); }
}
function circle(c: CanvasRenderingContext2D, x: number, y: number, radius: number, fill: string, stroke?: string, width = 2) {
  c.beginPath(); c.arc(x, y, Math.max(0, radius), 0, Math.PI * 2); c.fillStyle = fill; c.fill();
  if (stroke) { c.lineWidth = width; c.strokeStyle = stroke; c.stroke(); }
}
function line(c: CanvasRenderingContext2D, x: number, y: number, xx: number, yy: number, color: string, width = 3) {
  c.beginPath(); c.moveTo(x, y); c.lineTo(xx, yy); c.strokeStyle = color; c.lineWidth = width; c.stroke();
}
function text(c: CanvasRenderingContext2D, value: string, x: number, y: number, size = 16, color = CREAM) {
  c.font = `900 ${size}px "Arial", "Noto Sans JP", sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = color; c.fillText(value, x, y);
}
function star(c: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string, rotation = 0) {
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const angle = i * Math.PI / 5 - Math.PI / 2 + rotation, r = radius * (i % 2 ? 0.48 : 1);
    if (i === 0) c.moveTo(x + Math.cos(angle) * r, y + Math.sin(angle) * r);
    else c.lineTo(x + Math.cos(angle) * r, y + Math.sin(angle) * r);
  }
  c.closePath(); c.fillStyle = color; c.fill();
}
function gear(c: CanvasRenderingContext2D, x: number, y: number, radius: number, angle: number, fill: string, stroke = INK) {
  c.save(); c.translate(x, y); c.rotate(angle); c.beginPath();
  for (let i = 0; i < 48; i++) {
    const a = i * Math.PI / 24, r = radius * (i % 4 === 0 || i % 4 === 3 ? 1 : 0.85);
    if (i === 0) c.moveTo(Math.cos(a) * r, Math.sin(a) * r); else c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  c.closePath(); c.fillStyle = fill; c.fill(); c.lineWidth = 3; c.strokeStyle = stroke; c.stroke();
  circle(c, 0, 0, radius * 0.58, '#19233833', stroke, 2); circle(c, 0, 0, radius * 0.2, CREAM, stroke, 2); c.restore();
}
function shield(c: CanvasRenderingContext2D, x: number, y: number, active: boolean) {
  c.beginPath(); c.moveTo(x, y - 8); c.lineTo(x + 7, y - 5); c.lineTo(x + 6, y + 3);
  c.quadraticCurveTo(x + 4, y + 8, x, y + 10); c.quadraticCurveTo(x - 4, y + 8, x - 6, y + 3);
  c.lineTo(x - 7, y - 5); c.closePath(); c.fillStyle = active ? BLUE : '#ffffff17'; c.fill();
  c.lineWidth = 1.5; c.strokeStyle = active ? CREAM : '#ffffff33'; c.stroke();
}

/** The combat renderer is a pure view of the boss simulation, within the shared playfield. */
export function renderBossGame(ctx: CanvasRenderingContext2D, session: RushSession): boolean {
  const game = session.game, boss = game?.extra;
  if (!game || boss?.pack !== 'boss') return false;
  const time = game.time, opening = boss.stage === 'open', strike = boss.stage === 'strike';
  const open = opening && boss.damageThisOpening < 5 && boss.hp > 0, recharge = opening && !open && boss.hp > 0;
  const defeated = boss.hp <= 0;
  const phaseColor = boss.phase === 3 ? '#ffae67' : boss.phase === 2 ? PINK : YELLOW;
  const warningPulse = 0.5 + Math.sin(time * 14) * 0.5;

  ctx.save(); ctx.beginPath(); ctx.rect(24, 112, 592, 326); ctx.clip();
  box(ctx, 25, 113, 590, 324, '#26334d', 16);
  for (let i = 0; i < 19; i++) {
    const x = 45 + (i * 131) % 550, y = 158 + (i * 61) % 235;
    circle(ctx, x, y, i % 3 ? 1.2 : 2, '#fff7e328');
  }
  // Receding lane guides keep the three attack columns easy to read at phone size.
  for (const x of [80, 240, 400, 560]) line(ctx, 320 + (x - 320) * 0.62, 254, x, 420, '#a4dbe819', 1);
  for (let i = 0; i < 4; i++) line(ctx, 57, 315 + i * 34, 583, 315 + i * 34, '#a4dbe812', 1);
  box(ctx, 37, 414, 566, 24, '#1d293e', 6);
  gear(ctx, 60, 218, 44, time * 0.19, '#34435d', '#42516b');
  gear(ctx, 580, 300, 55, -time * 0.14, '#34435d', '#42516b');

  // Hazard color is always backed by chevrons and a warning symbol.
  if (!opening) for (const lane of boss.dangerLanes) {
    const x = LANE_X[lane];
    if (x === undefined) continue;
    box(ctx, x - 68, 258, 136, 164, strike ? '#f16c9577' : '#f16c951b', 8);
    if (strike) {
      box(ctx, x - 58, 250, 116, 172, '#f16c9533', 12);
      box(ctx, x - 43, 252, 86, 170, '#ffb0c188', 9);
      box(ctx, x - 18, 250, 36, 172, '#fff7e3cc', 7);
      line(ctx, x - 64, 255, x - 64, 420, YELLOW, 3); line(ctx, x + 64, 255, x + 64, 420, YELLOW, 3);
      for (let i = 0; i < 4; i++) {
        const y = 266 + (i * 43 + time * 200) % 152;
        line(ctx, x - 51, y, x - 43, y + 10, CREAM, 3); line(ctx, x + 51, y + 10, x + 43, y, CREAM, 3);
      }
    } else {
      ctx.save(); ctx.setLineDash([9, 7]); ctx.strokeStyle = warningPulse > 0.5 ? PINK : '#f16c9577'; ctx.lineWidth = 2;
      ctx.strokeRect(x - 68, 258, 136, 163); ctx.restore();
      for (let i = 0; i < 3; i++) {
        const y = 325 + i * 30;
        line(ctx, x - 16, y - 6, x, y + 5, '#f16c9588', 4); line(ctx, x, y + 5, x + 16, y - 6, '#f16c9588', 4);
      }
      ctx.beginPath(); ctx.moveTo(x, 264); ctx.lineTo(x - 16, 291); ctx.lineTo(x + 16, 291); ctx.closePath(); ctx.fillStyle = phaseColor; ctx.fill();
      text(ctx, '!', x, 282, 18, INK);
    }
  }
  const safeX = LANE_X[boss.targetLane] ?? 320;
  if (!strike && !defeated) {
    box(ctx, safeX - 56, 329, 112, 28, open ? '#66bd9826' : '#66bd983d', 8, '#66bd9855');
    text(ctx, open ? '↑ コアをねらえ' : recharge ? 'チャージ中' : 'ここへ よける', safeX, 343, 14, '#a9edcf');
  }

  // A crown and counter-rotating shoulder gears give the boss its own silhouette.
  const bx = boss.bossX, by = boss.bossY;
  ctx.save(); ctx.translate(bx, by);
  const bob = Math.sin(time * 3.2) * 2;
  ctx.translate(0, bob);
  ctx.beginPath(); ctx.ellipse(0, 73, 93, 10, 0, 0, Math.PI * 2); ctx.fillStyle = '#00000022'; ctx.fill();
  line(ctx, -43, 6, -82, 17, '#8b8ba5', 17); line(ctx, 43, 6, 82, 17, '#8b8ba5', 17);
  gear(ctx, -79, 14, 28, time * 1.1, phaseColor); gear(ctx, 79, 14, 28, -time * 1.1, phaseColor);
  box(ctx, -94, 30, 31, 26, '#565874', 8, INK); box(ctx, 63, 30, 31, 26, '#565874', 8, INK);
  circle(ctx, -79, 50, 10, '#111b2e', '#9b9ab0', 3); circle(ctx, 79, 50, 10, '#111b2e', '#9b9ab0', 3);
  if (!open) { circle(ctx, -79, 50, 4, strike ? CREAM : PINK); circle(ctx, 79, 50, 4, strike ? CREAM : PINK); }
  gear(ctx, 0, 0, 60, time * 0.3, boss.bossHit > 0 ? CREAM : '#71728e');
  circle(ctx, 0, 0, 47, '#36384f', '#b8abc7', 3);
  if (open || defeated) {
    circle(ctx, 0, 0, 41 + Math.sin(time * 12) * 2, '#66bd9825');
    circle(ctx, 0, 0, 35, boss.bossHit > 0 ? '#fffdf7' : defeated ? '#8a799e' : GREEN, CREAM, 3);
    circle(ctx, 0, 0, 25, boss.bossHit > 0 ? YELLOW : defeated ? '#c3aecf' : '#b4efbb', defeated ? '#655278' : '#338663', 2);
    star(ctx, 0, 0, 19, boss.bossHit > 0 ? PINK : '#fff7e3', -time * 0.5);
    if (defeated) { line(ctx, -5, -25, 4, -7, INK, 3); line(ctx, 4, -7, -7, 8, INK, 3); line(ctx, -7, 8, 1, 26, INK, 3); }
    // Retracted armor panels explicitly expose the same round core used by collision.
    box(ctx, -59, -31, 17, 62, '#a29bb7', 5, INK); box(ctx, 42, -31, 17, 62, '#a29bb7', 5, INK);
    line(ctx, -50, -22, -50, 19, '#d7cce0', 3); line(ctx, 50, -22, 50, 19, '#d7cce0', 3);
  } else {
    box(ctx, -39, -35, 37, 71, boss.bossHit > 0 ? '#d3cedd' : '#9590aa', 11, INK);
    box(ctx, 2, -35, 37, 71, boss.bossHit > 0 ? '#d3cedd' : '#9590aa', 11, INK);
    line(ctx, -28, -14, -14, -18, INK, 5); line(ctx, 14, -18, 28, -14, INK, 5);
    circle(ctx, -18, -6, 5, phaseColor); circle(ctx, 18, -6, 5, phaseColor);
    box(ctx, -22, 13, 44, 13, '#37364c', 3);
    for (let i = 0; i < 4; i++) line(ctx, -15 + i * 10, 15, -15 + i * 10, 23, CREAM, 2);
    // A shield icon communicates why shots bounce until the attack finishes.
    circle(ctx, 0, 44, 13, '#26334d', '#b8abc7', 2); shield(ctx, 0, 43, true);
  }
  ctx.beginPath(); ctx.moveTo(-24, -47); ctx.lineTo(-29, -66); ctx.lineTo(-10, -58); ctx.lineTo(0, -73);
  ctx.lineTo(10, -58); ctx.lineTo(29, -66); ctx.lineTo(24, -47); ctx.closePath(); ctx.fillStyle = phaseColor; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
  star(ctx, 0, -55, 6, CREAM); ctx.restore();

  for (const shot of boss.shots) {
    line(ctx, shot.x, shot.y + 12, shot.x, shot.y - 8, '#a4dbe855', 9);
    line(ctx, shot.x, shot.y + 7, shot.x, shot.y - 6, CREAM, 5); circle(ctx, shot.x, shot.y - 7, 3, YELLOW);
  }
  for (const particle of boss.particles) {
    ctx.save(); ctx.globalAlpha = Math.max(0, Math.min(1, particle.life * 3));
    star(ctx, particle.x, particle.y, 3 + Math.max(0, particle.life) * 5, particle.color, time); ctx.restore();
  }
  if (boss.bossHit > 0) {
    for (let i = 0; i < 6; i++) {
      const angle = i * Math.PI / 3 + time * 2, r = 45 + (0.16 - Math.min(0.16, boss.bossHit)) * 150;
      star(ctx, bx + Math.cos(angle) * r, by + Math.sin(angle) * r, 5, YELLOW, angle);
    }
  }

  // Player damage blinks the vehicle, while its shield ring remains legible.
  const px = boss.playerX, py = boss.playerY;
  ctx.save(); ctx.translate(px, py);
  if (boss.invulnerable > 0) {
    circle(ctx, 0, -1, 28, '#a4dbe81a', '#a4dbe8aa', 2);
    if (Math.floor(time * 16) % 2) ctx.globalAlpha = 0.42;
  }
  ctx.beginPath(); ctx.ellipse(0, 26, 32, 5, 0, 0, Math.PI * 2); ctx.fillStyle = '#00000033'; ctx.fill();
  if (boss.shooting) {
    ctx.beginPath(); ctx.moveTo(-9, 18); ctx.lineTo(0, 33 + Math.sin(time * 45) * 5); ctx.lineTo(9, 18); ctx.fillStyle = YELLOW; ctx.fill();
    circle(ctx, 0, -28, 8 + Math.sin(time * 44) * 2, '#f8d94b66');
  }
  ctx.beginPath(); ctx.moveTo(0, -24); ctx.lineTo(-29, 17); ctx.lineTo(-14, 13); ctx.lineTo(0, 21); ctx.lineTo(14, 13); ctx.lineTo(29, 17); ctx.closePath();
  ctx.fillStyle = YELLOW; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
  box(ctx, -8, -27, 16, 24, '#8c83ac', 5, INK); circle(ctx, 0, 0, 10, BLUE, INK, 2); line(ctx, -3, -4, 1, -6, CREAM, 3);
  ctx.restore();

  // These strips sit above the combat silhouettes and remain fixed as the core moves.
  box(ctx, 38, 118, 564, 28, '#192338e8', 8);
  text(ctx, 'ギアキング', 100, 132, 16, CREAM);
  const hpRatio = Math.max(0, Math.min(1, boss.hp / Math.max(1, boss.maxHp)));
  box(ctx, 167, 126, 213, 12, '#ffffff1a', 5);
  if (hpRatio > 0) box(ctx, 167, 126, 213 * hpRatio, 12, phaseColor, 5);
  // Small segment marks make each hit visible without crowding the bar with numbers.
  for (let i = 1; i < boss.maxHp; i++) line(ctx, 167 + i * 213 / boss.maxHp, 128, 167 + i * 213 / boss.maxHp, 136, '#19233880', 1);
  text(ctx, `${Math.max(0, boss.hp)}/${boss.maxHp}`, 411, 132, 14, CREAM);
  for (let i = 0; i < boss.maxArmor; i++) shield(ctx, 478 + i * 24, 131, i < boss.armor);
  text(ctx, `PHASE ${boss.phase}`, 568, 132, 11, phaseColor);
  const stageLabel = boss.hp <= 0 ? 'BREAK!' : recharge ? 'コア 再充電' : open ? 'コア OPEN！' : strike ? 'レーザー！' : `よけろ！ ${Math.max(1, Math.ceil(boss.stageDuration - boss.stageTime))}`;
  const labelWidth = open ? 144 : 132;
  box(ctx, 320 - labelWidth / 2, 279, labelWidth, 28, '#192338dd', 8, open ? GREEN : strike ? PINK : phaseColor);
  text(ctx, stageLabel, 320, 293, 17, open ? '#a9edcf' : strike ? '#ffb0c1' : phaseColor);
  text(ctx, defeated ? 'ギアキング 撃破！' : '← → / 指で移動 ＋ 長押しで連射', 320, 429, defeated ? 15 : 12, defeated ? '#a9edcf' : '#fff7e3a8');
  ctx.restore(); return true;
}
