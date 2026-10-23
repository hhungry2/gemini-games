import type { RushSession } from './engine';
import { INK_COLORS, INK_NAMES, MAZE_CELL, MAZE_X, MAZE_Y, puzzleCard, type PuzzleState } from './puzzleGames';

const INK = '#192338', CREAM = '#fff7e3', WHITE = '#fffdf7', PINK = '#f16c95', YELLOW = '#f8d94b', GREEN = '#66bd98';

function box(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, radius = 18, stroke?: string) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, radius); ctx.fillStyle = fill; ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 3; ctx.stroke(); }
}
function circle(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, fill: string) {
  ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill();
}
function text(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, size = 24, color = INK) {
  ctx.font = `900 ${size}px "Arial", "Noto Sans JP", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = color; ctx.fillText(value, x, y);
}
function line(ctx: CanvasRenderingContext2D, x: number, y: number, x2: number, y2: number, color: string, width = 4) {
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
}
function star(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, fill: string) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = i * Math.PI / 5 - Math.PI / 2, r = i % 2 ? radius * 0.46 : radius;
    if (i) ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); else ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
}
function check(ctx: CanvasRenderingContext2D, x: number, y: number, color = WHITE) { line(ctx, x - 12, y, x - 3, y + 9, color, 5); line(ctx, x - 3, y + 9, x + 14, y - 12, color, 5); }

function card(ctx: CanvasRenderingContext2D, p: PuzzleState, i: number, count = 3, grid = false, fill = WHITE) {
  const r = puzzleCard(i, count, grid);
  box(ctx, r.x, r.y + 6, r.width, r.height, '#d6c9ab', 17);
  box(ctx, r.x, r.y, r.width, r.height, fill, 17, p.selected === i ? INK : '#d8cfbd');
  if (p.selected === i) circle(ctx, r.x + r.width / 2, r.y + r.height + 18, 4, PINK);
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
}
function footer(ctx: CanvasRenderingContext2D, label = '← → で選ぶ  /  Space で決定  /  タップ') { text(ctx, label, 320, 435, 17, '#777a7d'); }

function face(ctx: CanvasRenderingContext2D, x: number, y: number, surprised: boolean) {
  circle(ctx, x, y, 34, YELLOW);
  circle(ctx, x - 12, y - 7, 4, INK); circle(ctx, x + 12, y - 7, 4, INK);
  circle(ctx, x - 24, y + 7, 5, '#efa77e'); circle(ctx, x + 24, y + 7, 5, '#efa77e');
  if (surprised) { ctx.beginPath(); ctx.ellipse(x, y + 14, 8, 11, 0, 0, Math.PI * 2); ctx.fillStyle = INK; ctx.fill(); }
  else { ctx.beginPath(); ctx.arc(x, y + 4, 16, 0.15, Math.PI - 0.15); ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.stroke(); }
}

export function renderPuzzleGame(ctx: CanvasRenderingContext2D, session: RushSession): boolean {
  const g = session.game;
  if (!g || g.extra?.pack !== 'puzzle') return false;
  const p = g.extra;
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (p.id === 'math') {
    box(ctx, 158, 134, 324, 130, '#d8cdb7', 23);
    box(ctx, 158, 126, 324, 130, '#d7eadb', 23, INK);
    text(ctx, 'QUICK MATH', 320, 148, 15, '#658375');
    text(ctx, `${p.a} ${p.subtract ? '−' : '+'} ${p.b}`, 320, 199, 59);
    text(ctx, '＝ ?', 320, 281, 23, '#7e7d7b');
    p.choices.forEach((n, i) => { const c = card(ctx, p, i); text(ctx, String(n), c.x, c.y, 47); });
    footer(ctx);
  } else if (p.id === 'count') {
    box(ctx, 75, 119, 490, 155, INK, 24);
    p.sky.forEach((isStar, i) => {
      const x = 126 + (i % 4) * 127, y = 148 + Math.floor(i / 4) * 47;
      if (isStar) star(ctx, x, y, 18, YELLOW);
      else { circle(ctx, x, y, 17, '#a4dbe8'); circle(ctx, x + 9, y - 6, 16, INK); }
    });
    text(ctx, '星の数は？   月は数えないよ', 320, 287, 17, '#777a7d');
    p.choices.forEach((n, i) => { const c = card(ctx, p, i); star(ctx, c.x - 36, c.y, 12, '#d4a921'); text(ctx, String(n), c.x + 12, c.y, 45); });
    footer(ctx);
  } else if (p.id === 'odd') {
    text(ctx, 'ひとりだけ、ちがう表情！', 320, 129, 21, '#9a5a6f');
    for (let i = 0; i < 6; i++) {
      const c = card(ctx, p, i, 6, true);
      face(ctx, c.x, c.y, i === p.answer ? p.face === 0 : p.face !== 0);
    }
    footer(ctx, '矢印で選ぶ  /  Space で決定  /  タップ');
  } else if (p.id === 'memory') {
    const reveal = g.time < p.revealUntil || session.phase === 'result';
    text(ctx, g.time < p.revealUntil ? '星の場所を おぼえて！' : '星があったのは どこ？', 320, 129, 21, '#786397');
    for (let i = 0; i < 6; i++) {
      const c = card(ctx, p, i, 6, true, reveal ? i === p.answer ? '#fff0ad' : '#ebe4f2' : '#76669c');
      if (reveal) {
        if (i === p.answer) { star(ctx, c.x, c.y, 32, YELLOW); star(ctx, c.x - 43, c.y - 29, 7, '#c7a53a'); }
        else { circle(ctx, c.x, c.y, 11, '#c9bddb'); }
      } else {
        box(ctx, c.x - 50, c.y - 36, 100, 72, '#ffffff08', 10, '#ffffff22');
        text(ctx, '?', c.x, c.y, 44, CREAM);
      }
    }
    footer(ctx, g.time < p.revealUntil ? 'まだ押さないで… 裏返ったら選ぼう' : '矢印で選ぶ  /  Space で決定  /  タップ');
  } else if (p.id === 'ink') {
    box(ctx, 143, 126, 354, 138, WHITE, 24, '#e1d7c4');
    text(ctx, INK_NAMES[p.word], 320, 193, 68, INK_COLORS[p.ink]);
    line(ctx, 248, 245, 392, 245, INK_COLORS[p.ink], 5);
    text(ctx, 'このインクは 何色？', 320, 282, 21, '#777a7d');
    p.choices.forEach((color, i) => {
      const c = card(ctx, p, i);
      circle(ctx, c.x, c.y - 13, 19, INK_COLORS[color]);
      text(ctx, INK_NAMES[color], c.x, c.y + 28, 22);
    });
    footer(ctx);
  } else if (p.id === 'largest') {
    text(ctx, '数字の値が 大きいのは？', 320, 143, 25);
    box(ctx, 140, 178, 360, 70, '#edd9bc', 14);
    for (let i = 0; i <= 12; i++) { const x = 155 + i * 27.5; line(ctx, x, 186, x, i % 3 === 0 ? 215 : 202, '#a08561', 2); }
    text(ctx, 'サイズに だまされないで！', 320, 232, 16, '#836c57');
    p.choices.forEach((n, i) => { const c = card(ctx, p, i); text(ctx, String(n), c.x, c.y, p.sizes[i]); });
    footer(ctx);
  } else if (p.id === 'maze') {
    text(ctx, '白い道を進もう！', 320, 119, 17, '#5c8262');
    box(ctx, MAZE_X - 8, MAZE_Y - 8, MAZE_CELL * 4 + 16, MAZE_CELL * 3 + 16, '#829d8d', 17);
    for (let i = 0; i < 12; i++) {
      const x = MAZE_X + (i % 4) * MAZE_CELL, y = MAZE_Y + Math.floor(i / 4) * MAZE_CELL;
      const open = p.route.includes(i);
      box(ctx, x + 3, y + 3, MAZE_CELL - 6, MAZE_CELL - 6, open ? p.visited.includes(i) ? '#d5ebc9' : WHITE : INK, 10);
      if (!open) { line(ctx, x + 22, y + 30, x + 57, y + 30, '#ffffff12', 4); line(ctx, x + 33, y + 55, x + 68, y + 55, '#ffffff12', 4); }
      else if (i === p.goal) {
        line(ctx, x + 35, y + 22, x + 35, y + 65, INK, 4);
        ctx.beginPath(); ctx.moveTo(x + 37, y + 21); ctx.lineTo(x + 68, y + 32); ctx.lineTo(x + 37, y + 44); ctx.closePath(); ctx.fillStyle = PINK; ctx.fill();
      } else if (p.visited.includes(i) && i !== p.position) circle(ctx, x + 44, y + 44, 5, '#8cb775');
    }
    const x = MAZE_X + (p.position % 4 + 0.5) * MAZE_CELL, y = MAZE_Y + (Math.floor(p.position / 4) + 0.5) * MAZE_CELL;
    circle(ctx, x, y, 24, YELLOW); circle(ctx, x - 8, y - 3, 3, INK); circle(ctx, x + 8, y - 3, 3, INK);
    ctx.beginPath(); ctx.arc(x, y + 3, 9, 0.1, Math.PI - 0.1); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke();
    footer(ctx, '矢印キー  /  隣のマスをタップ');
  } else if (p.id === 'order') {
    text(ctx, '小さい数から 順番に！', 320, 145, 25);
    const start = 320 - (p.choices.length - 1) * 37;
    for (let i = 0; i < p.choices.length; i++) {
      const x = start + i * 74;
      if (i < p.choices.length - 1) line(ctx, x + 24, 222, x + 50, 222, '#d8cdb5', 5);
      circle(ctx, x, 222, 24, i < p.progress ? GREEN : '#e6ddcc');
      if (i < p.progress) check(ctx, x, 222); else text(ctx, String(i + 1), x, 222, 20, '#a3957e');
    }
    text(ctx, `${p.progress} / ${p.choices.length}`, 320, 273, 20, '#8d7c61');
    p.choices.forEach((n, i) => {
      const done = p.sorted.slice(0, p.progress).includes(n), c = card(ctx, p, i, p.choices.length, false, done ? '#cfe7d4' : WHITE);
      text(ctx, String(n), c.x, c.y - (done ? 9 : 0), done ? 37 : 51, done ? '#659578' : INK);
      if (done) { check(ctx, c.x, c.y + 29, '#659578'); }
    });
    footer(ctx);
  }
  ctx.restore();
  return true;
}
