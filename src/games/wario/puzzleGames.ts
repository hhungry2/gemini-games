import type { RushDefinition, RushId, RushInput, RushSession, RushVariationDefinition } from './engine';

export type PuzzleId = 'math' | 'count' | 'odd' | 'memory' | 'ink' | 'largest' | 'maze' | 'order';

const PUZZLE_VARIATIONS: Record<PuzzleId, readonly RushVariationDefinition[]> = {
  math: [{ name: 'いつもの計算' }, { name: 'ひきざん', command: 'ひきざんに 挑戦！', hint: '引き算の答えをタップ / ← → ＋ Space。', shortHint: '引き算の答えを選ぼう' }, { name: 'かけざん', command: 'かけざんに 挑戦！', hint: '掛け算の答えをタップ / ← → ＋ Space。', shortHint: '掛け算の答えを選ぼう' }],
  count: [{ name: '星をかぞえる' }, { name: '月をかぞえる', command: '月だけ かぞえろ！', hint: '星やダイヤは数えず、三日月だけを数えて選ぼう。', shortHint: '三日月だけ数えて選ぼう' }, { name: 'ダイヤをかぞえる', command: 'ダイヤだけ かぞえろ！', hint: '星や月は数えず、水色のダイヤだけを数えて選ぼう。', shortHint: '水色のダイヤだけ数えて選ぼう' }],
  odd: [{ name: 'ちがう表情' }, { name: 'ちがう図形', command: 'ちがう形を さがせ！', hint: '丸と四角。1 つだけ違う形をタップ / 矢印 ＋ Space。', shortHint: '1 つだけ違う形を選ぼう' }, { name: 'ちがう向き', command: 'ちがう向きを さがせ！', hint: '1 つだけ逆向きの矢印をタップ / 矢印 ＋ Space。', shortHint: '逆向きの矢印を選ぼう' }],
  memory: [{ name: '星の場所' }, { name: '月の場所', command: '月の場所を おぼえろ！', hint: '最初に見える三日月の場所を覚え、裏返ったら選ぼう。', shortHint: '裏返ったら月の場所を選ぶ' }, { name: 'ハートの場所', command: 'ハートを おぼえろ！', hint: '最初に見えるピンクのハートの場所を覚え、裏返ったら選ぼう。', shortHint: '裏返ったらハートの場所を選ぶ' }],
  ink: [{ name: 'インクの色' }, { name: '文字の意味', command: '書いてある 色をえらべ！', hint: 'インクの色に惑わされず、文字が表す色を選ぼう。', shortHint: '文字が表す色を選ぶ' }, { name: '背景の色', command: '背景の 色をえらべ！', hint: '文字でもインクでもなく、文字の後ろの背景の色を選ぼう。', shortHint: '文字の後ろの背景色を選ぶ' }],
  largest: [{ name: 'いちばん大きい' }, { name: 'いちばん小さい', command: 'いちばん 小さい数！', hint: '文字のサイズに惑わされず、数の値が最小のカードを選ぼう。', shortHint: '数の値が最小のカードを選ぶ' }, { name: 'まんなかの数', command: 'まんなかの 数！', hint: '3 つの数を小さい順に並べたとき、真ん中になる数を選ぼう。', shortHint: '3 つの数の真ん中を選ぶ' }],
  maze: [{ name: '左下から右上' }, { name: '右下から左上', command: '左上の 旗へ！', hint: '右下からスタート。白い道を通って左上の旗へ進もう。', shortHint: '矢印 / 隣のマスで左上の旗へ' }, { name: '左上から右下', command: '右下の 旗へ！', hint: '左上からスタート。白い道を通って右下の旗へ進もう。', shortHint: '矢印 / 隣のマスで右下の旗へ' }],
  order: [{ name: '小さい順' }, { name: '大きい順', command: '大きい順に えらべ！', hint: '大きい数から順にタップ / ← → ＋ Space。', shortHint: '大きい数から順番に選ぶ' }, { name: '奇数から偶数', command: '奇数→偶数 小さい順！', hint: '奇数を小さい順に選んだ後、偶数を小さい順に選ぼう。', shortHint: '奇数の小さい順 → 偶数の小さい順' }],
};
export const PUZZLE_GAMES: RushDefinition[] = [
  { id: 'math', category: 'puzzle', name: 'スピードさんすう', command: 'こたえは どれ？', hint: '計算の答えをタップ / ← → で選んで Space。', shortHint: '答えをタップ / ← → ＋ Space', number: '09', color: '#f9df83' },
  { id: 'count', category: 'puzzle', name: 'ほしのかず', command: '星だけ かぞえろ！', hint: '月は数えない！ 星の数をタップ / ← → で選んで Space。', shortHint: '星の数をタップ / ← → ＋ Space', number: '10', color: '#a8caec' },
  { id: 'odd', category: 'puzzle', name: 'ひとりだけ！', command: 'ちがう顔を さがせ！', hint: '1 つだけ違う表情をタップ / 矢印で選んで Space。', shortHint: '違う顔をタップ / 矢印 ＋ Space', number: '11', color: '#f8bbcf' },
  { id: 'memory', category: 'memory', name: 'きらりメモリー', command: '星の場所を おぼえろ！', hint: '最初に光る星の場所を覚えよう。カードが裏返ったらタップ / 矢印 ＋ Space。', shortHint: '裏返ったら星の場所をタップ / 矢印 ＋ Space', number: '12', color: '#c4b9ed' },
  { id: 'ink', category: 'puzzle', name: 'インクのわな', command: '文字の「色」を えらべ！', hint: '書いてある言葉ではなく、文字を塗っている色をタップ / ← → ＋ Space。', shortHint: '文字の色をタップ / ← → ＋ Space', number: '13', color: '#9cd9c7' },
  { id: 'largest', category: 'puzzle', name: 'でかいのどれ？', command: 'いちばん 大きい数！', hint: '文字の大きさに惑わされないで！ 数の値が最大のカードをタップ / ← → ＋ Space。', shortHint: '数の値が最大のカードを選ぼう', number: '14', color: '#edba9b' },
  { id: 'maze', category: 'action', name: 'ちいさなめいろ', command: '旗まで すすめ！', hint: '矢印キー / 隣のマスをタップして旗へ。紺色の壁は通れない！', shortHint: '矢印 / 隣のマスをタップ。壁に注意', number: '15', color: '#b7d9a2' },
  { id: 'order', category: 'puzzle', name: 'ナンバー・ステップ', command: '小さい順に えらべ！', hint: '小さい数から順にタップ / ← → で選んで Space。', shortHint: '小さい順にタップ / ← → ＋ Space', number: '16', color: '#f2cb83' },
].map(game => ({ ...game, variations: PUZZLE_VARIATIONS[game.id as PuzzleId] })) as RushDefinition[];

interface PuzzleBase { pack: 'puzzle'; selected: number; variation: number }
type Choices = { choices: number[]; answer: number };
export type PuzzleState = PuzzleBase & (
  | ({ id: 'math'; a: number; b: number; subtract: boolean; multiply: boolean } & Choices)
  | ({ id: 'count'; stars: number; sky: number[]; countSymbol: number } & Choices)
  | { id: 'odd'; answer: number; face: number }
  | { id: 'memory'; answer: number; revealUntil: number }
  | ({ id: 'ink'; word: number; ink: number; background: number } & Choices)
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

export function createPuzzleState(id: RushId, level: number, random: () => number, variation = 0): PuzzleState | undefined {
  variation = Math.max(0, Math.min(2, Math.floor(variation)));
  const common = { pack: 'puzzle' as const, selected: 1, variation };
  if (id === 'math') {
    const multiply = variation === 2, subtract = variation === 1 || (!multiply && level > 1 && random() < 0.45);
    const a = randomInt(random, multiply ? 2 : 3, multiply ? level > 3 ? 9 : 5 : level > 3 ? 14 : 9);
    const b = randomInt(random, multiply ? 2 : 1, multiply ? level > 3 ? 9 : 5 : subtract ? a : 9);
    const answer = multiply ? a * b : subtract ? a - b : a + b;
    return { ...common, id, a, b, subtract, multiply, choices: answers(answer, random), answer };
  }
  if (id === 'count') {
    const amount = randomInt(random, 3, Math.min(variation ? 6 : 8, 5 + Math.floor(level / 2))), countSymbol = variation === 0 ? 1 : variation === 1 ? 0 : 2;
    const sky = variation === 0 ? [...Array<number>(amount).fill(1), ...Array<number>(randomInt(random, 2, 4)).fill(0)] : [...Array<number>(amount).fill(countSymbol), ...Array<number>(2).fill((countSymbol + 1) % 3), ...Array<number>(2).fill((countSymbol + 2) % 3)];
    return { ...common, id, stars: sky.filter(n => n === 1).length, countSymbol, sky: shuffle(sky, random), choices: answers(amount, random), answer: amount };
  }
  if (id === 'odd') return { ...common, id, answer: randomInt(random, 0, 5), face: randomInt(random, 0, 1) };
  if (id === 'memory') return { ...common, id, answer: randomInt(random, 0, 5), revealUntil: 0.85 };
  if (id === 'ink') {
    const ink = randomInt(random, 0, 2);
    const word = (ink + randomInt(random, 1, 2)) % 3, background = 3 - ink - word;
    return { ...common, id, word, ink, background, choices: shuffle([0, 1, 2], random), answer: variation === 1 ? word : variation === 2 ? background : ink };
  }
  if (id === 'largest') {
    const base = randomInt(random, 1, 7) * (level > 2 ? 100 : 10);
    const choices = shuffle([base + randomInt(random, 1, 3), base + randomInt(random, 4, 6), base + randomInt(random, 7, 9)], random);
    const answer = [...choices].sort((a, b) => a - b)[variation === 1 ? 0 : variation === 2 ? 1 : 2];
    // The smallest printed numeral gets the largest type size: compare values.
    return { ...common, id, choices, answer, sizes: choices.map(n => n === Math.max(...choices) ? 35 : n === Math.min(...choices) ? 65 : 48) };
  }
  if (id === 'maze') {
    const routes = level <= 2
      ? [[8, 9, 5, 6, 2, 3], [8, 4, 5, 6, 7, 3], [8, 4, 0, 1, 2, 3]]
      : [[8, 4, 5, 9, 10, 6, 7, 3], [8, 4, 0, 1, 5, 6, 2, 3], [8, 9, 10, 6, 5, 1, 2, 3]];
    const transform = (n: number) => variation === 1 ? Math.floor(n / 4) * 4 + 3 - n % 4 : variation === 2 ? (2 - Math.floor(n / 4)) * 4 + n % 4 : n;
    const route = routes[randomInt(random, 0, routes.length - 1)].map(transform), position = transform(8);
    return { ...common, id, route, position, goal: transform(3), visited: [position] };
  }
  if (id === 'order') {
    const amount = level >= 4 ? 4 : 3;
    const pool = variation === 2 ? shuffle([1 + 2 * randomInt(random, 0, 3), 2 + 2 * randomInt(random, 0, 2), 9, 8], random).slice(0, amount) : shuffle(Array.from({ length: 9 }, (_, i) => i + 1), random).slice(0, amount);
    return { ...common, id, choices: shuffle(pool, random), sorted: [...pool].sort((a, b) => variation === 1 ? b - a : variation === 2 ? (b % 2 - a % 2) || a - b : a - b), progress: 0 };
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
    if (p.choices[chosen] !== p.sorted[p.progress]) return { result: 'failure', reason: `つぎは ${p.sorted[p.progress]}！ ${p.variation === 1 ? '大きい順' : p.variation === 2 ? '奇数→偶数、それぞれ小さい順' : '小さい順'}に選ぼう` };
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
    count: ['ぴったり！ 数えわけたね！', `${['星', '月', 'ダイヤ'][p.variation]}だけ数えよう`],
    odd: ['みつけた！ ひとりだけ！', '1 つだけ違うものをさがそう'],
    memory: ['おぼえてた！ ナイスメモリー！', `最初に見えた${['星', '月', 'ハート'][p.variation]}の場所をおぼえよう`],
    ink: ['ひっかからない！ 色の達人！', `${['文字を塗っている色', '文字が表す色', '文字の後ろの背景色'][p.variation]}を選ぼう`],
    largest: ['数の値を見ぬいた！', `${['最大', '最小', '真ん中'][p.variation]}の数を選ぼう。文字のサイズに注意！`],
  };
  return { result: correct ? 'success' : 'failure', reason: messages[p.id][correct ? 0 : 1] };
}
