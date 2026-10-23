import type { RushDefinition, RushId, RushInput, RushSession } from './engine';

export type PuzzleId = 'math' | 'count' | 'odd' | 'memory' | 'ink' | 'largest' | 'maze' | 'order';

export const PUZZLE_GAMES: RushDefinition[] = [
  { id: 'math', category: 'puzzle', name: 'スピードさんすう', command: 'こたえは どれ？', hint: '計算の答えをタップ / ← → で選んで Space。', shortHint: '答えをタップ / ← → ＋ Space', number: '09', color: '#f9df83' },
  { id: 'count', category: 'puzzle', name: 'ほしのかず', command: '星だけ かぞえろ！', hint: '月は数えない！ 星の数をタップ / ← → で選んで Space。', shortHint: '星の数をタップ / ← → ＋ Space', number: '10', color: '#a8caec' },
  { id: 'odd', category: 'puzzle', name: 'ひとりだけ！', command: 'ちがう顔を さがせ！', hint: '1 つだけ違う表情をタップ / 矢印で選んで Space。', shortHint: '違う顔をタップ / 矢印 ＋ Space', number: '11', color: '#f8bbcf' },
  { id: 'memory', category: 'memory', name: 'きらりメモリー', command: '星の場所を おぼえろ！', hint: '最初に光る星の場所を覚えよう。カードが裏返ったらタップ / 矢印 ＋ Space。', shortHint: '裏返ったら星の場所をタップ / 矢印 ＋ Space', number: '12', color: '#c4b9ed' },
  { id: 'ink', category: 'puzzle', name: 'インクのわな', command: '文字の「色」を えらべ！', hint: '書いてある言葉ではなく、文字を塗っている色をタップ / ← → ＋ Space。', shortHint: '文字の色をタップ / ← → ＋ Space', number: '13', color: '#9cd9c7' },
  { id: 'largest', category: 'puzzle', name: 'でかいのどれ？', command: 'いちばん 大きい数！', hint: '文字の大きさに惑わされないで！ 数の値が最大のカードをタップ / ← → ＋ Space。', shortHint: '数の値が最大のカードを選ぼう', number: '14', color: '#edba9b' },
  { id: 'maze', category: 'action', name: 'ちいさなめいろ', command: '旗まで すすめ！', hint: '矢印キー / 隣のマスをタップして旗へ。紺色の壁は通れない！', shortHint: '矢印 / 隣のマスをタップ。壁に注意', number: '15', color: '#b7d9a2' },
  { id: 'order', category: 'puzzle', name: 'ナンバー・ステップ', command: '小さい順に えらべ！', hint: '小さい数から順にタップ / ← → で選んで Space。', shortHint: '小さい順にタップ / ← → ＋ Space', number: '16', color: '#f2cb83' },
];

interface PuzzleBase { pack: 'puzzle'; selected: number }
type Choices = { choices: number[]; answer: number };
export type PuzzleState = PuzzleBase & (
  | ({ id: 'math'; a: number; b: number; subtract: boolean } & Choices)
  | ({ id: 'count'; stars: number; sky: number[] } & Choices)
  | { id: 'odd'; answer: number; face: number }
  | { id: 'memory'; answer: number; revealUntil: number }
  | ({ id: 'ink'; word: number; ink: number } & Choices)
  | ({ id: 'largest'; sizes: number[] } & Choices)
  | { id: 'maze'; route: number[]; position: number; goal: number; visited: number[] }
  | { id: 'order'; choices: number[]; sorted: number[]; progress: number }
);

export const INK_COLORS = ['#d94c70', '#3979ca', '#38916e'] as const;
export const INK_NAMES = ['あか', 'あお', 'みどり'] as const;
export const MAZE_X = 144, MAZE_Y = 142, MAZE_CELL = 88;

function shuffle<T>(items: T[], random: () => number): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}
function randomInt(random: () => number, low: number, high: number) { return low + Math.floor(random() * (high - low + 1)); }
function answers(answer: number, random: () => number, minimum = 0) {
  // Distinct distractors keep every generated question unambiguous, including 0.
  const pool = [answer - 2, answer - 1, answer + 1, answer + 2].filter(n => n >= minimum);
  return shuffle([answer, ...shuffle(pool, random).slice(0, 2)], random);
}

export function createPuzzleState(id: RushId, level: number, random: () => number): PuzzleState | undefined {
  const common = { pack: 'puzzle' as const, selected: 1 };
  if (id === 'math') {
    const subtract = level > 1 && random() < 0.45;
    const a = randomInt(random, 3, level > 3 ? 14 : 9);
    const b = randomInt(random, 1, subtract ? a : 9);
    const answer = subtract ? a - b : a + b;
    return { ...common, id, a, b, subtract, choices: answers(answer, random), answer };
  }
  if (id === 'count') {
    const stars = randomInt(random, 3, Math.min(8, 5 + Math.floor(level / 2)));
    const moons = randomInt(random, 2, 4);
    return { ...common, id, stars, sky: shuffle([...Array<number>(stars).fill(1), ...Array<number>(moons).fill(0)], random), choices: answers(stars, random), answer: stars };
  }
  if (id === 'odd') return { ...common, id, answer: randomInt(random, 0, 5), face: randomInt(random, 0, 1) };
  if (id === 'memory') return { ...common, id, answer: randomInt(random, 0, 5), revealUntil: 0.85 };
  if (id === 'ink') {
    const ink = randomInt(random, 0, 2);
    return { ...common, id, word: (ink + randomInt(random, 1, 2)) % 3, ink, choices: shuffle([0, 1, 2], random), answer: ink };
  }
  if (id === 'largest') {
    const base = randomInt(random, 1, 7) * (level > 2 ? 100 : 10);
    const choices = shuffle([base + randomInt(random, 1, 3), base + randomInt(random, 4, 6), base + randomInt(random, 7, 9)], random);
    const answer = Math.max(...choices);
    // The smallest printed numeral gets the largest type size: compare values.
    return { ...common, id, choices, answer, sizes: choices.map(n => n === answer ? 35 : n === Math.min(...choices) ? 65 : 48) };
  }
  if (id === 'maze') {
    const routes = level <= 2
      ? [[8, 9, 5, 6, 2, 3], [8, 4, 5, 6, 7, 3], [8, 4, 0, 1, 2, 3]]
      : [[8, 4, 5, 9, 10, 6, 7, 3], [8, 4, 0, 1, 5, 6, 2, 3], [8, 9, 10, 6, 5, 1, 2, 3]];
    const route = [...routes[randomInt(random, 0, routes.length - 1)]];
    return { ...common, id, route, position: 8, goal: 3, visited: [8] };
  }
  if (id === 'order') {
    const amount = level >= 4 ? 4 : 3;
    const pool = shuffle(Array.from({ length: 9 }, (_, i) => i + 1), random).slice(0, amount);
    return { ...common, id, choices: shuffle(pool, random), sorted: [...pool].sort((a, b) => a - b), progress: 0 };
  }
  return undefined;
}

/** Shared card geometry is also used by the renderer, so hit areas match artwork. */
export function puzzleCard(index: number, count = 3, grid = false) {
  if (grid) return { x: 72 + (index % 3) * 175, y: 160 + Math.floor(index / 3) * 126, width: 146, height: 108 };
  const width = count === 4 ? 110 : 146;
  const gap = count === 4 ? 25 : 29;
  return { x: (640 - (width * count + gap * (count - 1))) / 2 + index * (width + gap), y: 302, width, height: 100 };
}

function choose(p: PuzzleState, input: RushInput, count: number, grid = false) {
  if (input.pointerPressed) {
    for (let i = 0; i < count; i++) {
      const b = puzzleCard(i, count, grid);
      if (input.pointerX >= b.x && input.pointerX <= b.x + b.width && input.pointerY >= b.y && input.pointerY <= b.y + b.height) { p.selected = i; return i; }
    }
    return -1;
  }
  if (input.leftPressed) p.selected = (p.selected + count - 1) % count;
  if (input.rightPressed) p.selected = (p.selected + 1) % count;
  if (grid && (input.upPressed || input.downPressed)) p.selected = (p.selected + 3) % count;
  return input.action ? p.selected : -1;
}

export function updatePuzzleGame(session: RushSession, input: RushInput, _dt: number): { result: 'success' | 'failure'; reason: string } | null {
  const g = session.game;
  if (!g || g.extra?.pack !== 'puzzle') return null;
  const p = g.extra;
  if (p.id === 'maze') {
    let target = p.position;
    if (input.pointerPressed) {
      const col = Math.floor((input.pointerX - MAZE_X) / MAZE_CELL), row = Math.floor((input.pointerY - MAZE_Y) / MAZE_CELL);
      if (col < 0 || col >= 4 || row < 0 || row >= 3) return null;
      const candidate = row * 4 + col;
      if (Math.abs(col - p.position % 4) + Math.abs(row - Math.floor(p.position / 4)) !== 1) return null;
      target = candidate;
    } else if (input.leftPressed) { if (p.position % 4 === 0) return null; target--; }
    else if (input.rightPressed) { if (p.position % 4 === 3) return null; target++; }
    else if (input.upPressed) { if (p.position < 4) return null; target -= 4; }
    else if (input.downPressed) { if (p.position >= 8) return null; target += 4; }
    if (target === p.position) return null;
    if (!p.route.includes(target)) return { result: 'failure', reason: '紺色のマスは壁！ 白い道を進もう' };
    p.position = target;
    if (!p.visited.includes(target)) p.visited.push(target);
    session.sounds.push('pop');
    return target === p.goal ? { result: 'success', reason: 'ゴール！ みちを見きわめた！' } : null;
  }
  if (p.id === 'memory' && g.time < p.revealUntil) return null;
  const grid = p.id === 'odd' || p.id === 'memory';
  const chosen = choose(p, input, grid ? 6 : p.id === 'order' ? p.choices.length : 3, grid);
  if (chosen < 0) return null;
  if (p.id === 'order') {
    if (p.choices[chosen] !== p.sorted[p.progress]) return { result: 'failure', reason: `つぎは ${p.sorted[p.progress]}！ 小さい順に選ぼう` };
    p.progress++;
    session.sounds.push('pop');
    if (p.progress === p.choices.length) return { result: 'success', reason: 'きれいに整列！' };
    // Move keyboard focus to an uncollected card after each successful step.
    p.selected = p.choices.findIndex(n => !p.sorted.slice(0, p.progress).includes(n));
    return null;
  }
  const correct = p.id === 'odd' || p.id === 'memory' ? chosen === p.answer : p.choices[chosen] === p.answer;
  const messages: Record<Exclude<PuzzleId, 'order' | 'maze'>, [string, string]> = {
    math: ['大正解！ あたまの回転ばつぐん！', 'もう一度、式をよく見てみよう'],
    count: ['ぴったり！ 星だけ数えたね！', '月は数えないよ！ 星だけ数えよう'],
    odd: ['みつけた！ ひとりだけ違う顔！', '1 つだけ表情の違う顔をさがそう'],
    memory: ['おぼえてた！ ナイスメモリー！', '最初に光った星の場所をおぼえよう'],
    ink: ['ひっかからない！ 色の達人！', '言葉ではなく、文字を塗っている色を選ぼう'],
    largest: ['いちばん大きい！ 数の値を見ぬいた！', '文字のサイズではなく、数の値を比べよう'],
  };
  return { result: correct ? 'success' : 'failure', reason: messages[p.id][correct ? 0 : 1] };
}
