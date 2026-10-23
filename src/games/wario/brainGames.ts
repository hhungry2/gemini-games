import type { RushDefinition, RushId, RushInput, RushSession } from './engine';

export type BrainId = 'pipe' | 'lights' | 'echo' | 'clock' | 'scale' | 'pattern' | 'cups' | 'mirror';
export const BRAIN_GAMES: RushDefinition[] = [
  { id: 'pipe', category: 'puzzle', number: '25', name: 'くるくるパイプ', command: '水を つなげ！', hint: 'パイプをタップして回転。左の蛇口から下の出口までつなごう。矢印で選んで Space でも回せる。', shortHint: 'タップ / 矢印 ＋ Space で回す', color: '#a4dbe8' },
  { id: 'lights', category: 'puzzle', number: '26', name: 'となりもスイッチ', command: 'ぜんぶ 点灯！', hint: 'スイッチは真上と右隣のランプを反転。3 つとも光らせよう。タップ / ← → ＋ Space。', shortHint: '上と右隣が反転。全部光らせよう', color: '#f8df85' },
  { id: 'echo', category: 'memory', number: '27', name: 'カラフル・エコー', command: '光った順に おせ！', hint: '光る色の順番を覚え、GO の後に同じ順でタップ。矢印キーは画面の上下左右のパッドに対応。', shortHint: 'GO の後、光った順にタップ / 矢印', color: '#c3b6ea' },
  { id: 'clock', category: 'puzzle', number: '28', name: 'いま なんじ？', command: '時計を よめ！', hint: '長い針は分、短い針は時。正しい時刻をタップ / ← → で選んで Space。', shortHint: '正しい時刻をタップ / ← → ＋ Space', color: '#a5d6c0' },
  { id: 'scale', category: 'puzzle', number: '29', name: 'ぴたり・てんびん', command: '重さを あわせろ！', hint: 'おもりをタップして左の皿へ追加。右と同じ重さにしよう。← → ＋ Space で追加、↓ で 1 つ戻す。', shortHint: 'おもりを追加。↓ / 戻すで Undo', color: '#edbd9c' },
  { id: 'pattern', category: 'puzzle', number: '30', name: 'つぎは どっち？', command: '回転の つづき！', hint: 'やじるしは毎回、同じ角度ずつ回転。最後に続く向きをタップ / ← → ＋ Space。', shortHint: '同じ回り方を続ける向きを選ぶ', color: '#f4b7d0' },
  { id: 'cups', category: 'memory', number: '31', name: 'ほしのカップ', command: '星を おいかけろ！', hint: '星を隠したカップを目で追おう。入れ替えが終わったらタップ / ← → ＋ Space。', shortHint: '入れ替え後、星のカップを選ぶ', color: '#b7d99d' },
  { id: 'mirror', category: 'memory', number: '32', name: 'かがみコマンド', command: 'かがみに うつせ！', hint: '上の矢印を左から順に鏡写しで入力。左と右だけ逆になる。矢印キー / 画面下の方向パッド。', shortHint: '左右だけ逆！ 上下はそのまま', color: '#a8caec' },
];

interface BrainBase { pack: 'brain'; selected: number }
export type BrainState = BrainBase & (
  | { id: 'pipe'; rotations: number[]; target: number[] }
  | { id: 'lights'; lamps: boolean[] }
  | { id: 'echo'; sequence: number[]; progress: number; revealUntil: number; flashStep: number; feedback: number; feedbackUntil: number }
  | { id: 'clock'; hour: number; minute: number; choices: number[]; answer: number }
  | { id: 'scale'; weights: number[]; target: number; placed: number[]; total: number }
  | { id: 'pattern'; sequence: number[]; step: number; choices: number[]; answer: number }
  | { id: 'cups'; initial: number; swaps: [number, number][]; answer: number; revealUntil: number; swapDuration: number; pickAfter: number }
  | { id: 'mirror'; sequence: number[]; progress: number }
);

const integer = (random: () => number, count: number) => Math.floor(random() * count);
function shuffle<T>(items: T[], random: () => number) {
  for (let i = items.length - 1; i > 0; i--) { const j = integer(random, i + 1); [items[i], items[j]] = [items[j], items[i]]; }
  return items;
}
export const LIGHT_MASKS = [0b011, 0b110, 0b100];
export const PAD_COLORS = ['#e8bb41', '#e77a98', '#7ab3dd', '#70b59c'];
export const PAD_NAMES = ['うえ', 'みぎ', 'した', 'ひだり'];
export const MIRROR_DIRECTION = [0, 3, 2, 1];
export function createBrainState(id: RushId, level: number, random: () => number): BrainState | undefined {
  const common = { pack: 'brain' as const, selected: 0 };
  if (id === 'pipe') {
    const target = [1, 2, 1, 3]; // horizontal, down/left, right/down, up/left
    const rotations = target.map((n, i) => (n + (i === 0 ? 2 : 4) - 1 - integer(random, i === 0 || level < 4 ? 1 : 2)) % (i === 0 ? 2 : 4));
    return { ...common, id, rotations, target };
  }
  if (id === 'lights') {
    const solution = 1 + integer(random, 7);
    let mask = 7;
    for (let i = 0; i < 3; i++) if (solution & (1 << i)) mask ^= LIGHT_MASKS[i];
    return { ...common, id, lamps: [0, 1, 2].map(i => Boolean(mask & (1 << i))) };
  }
  if (id === 'echo') {
    const sequence = Array.from({ length: level >= 4 ? 4 : 3 }, () => integer(random, 4));
    for (let i = 1; i < sequence.length; i++) if (sequence[i] === sequence[i - 1]) sequence[i] = (sequence[i] + 1 + integer(random, 3)) % 4;
    const flashStep = 0.43;
    return { ...common, id, sequence, progress: 0, revealUntil: 0.18 + sequence.length * flashStep, flashStep, feedback: -1, feedbackUntil: 0 };
  }
  if (id === 'clock') {
    const hour = 1 + integer(random, 12), minute = integer(random, level >= 4 ? 4 : 2) * (level >= 4 ? 15 : 30), answer = (hour % 12) * 60 + minute;
    return { ...common, id, hour, minute, answer, choices: shuffle([answer, (answer + 60) % 720, (answer + (minute === 0 ? 30 : 720 - 15)) % 720], random) };
  }
  if (id === 'scale') return { ...common, id, weights: level >= 4 ? [2, 3, 5] : [1, 2, 3], target: (level >= 4 ? 8 : 5) + integer(random, 5), placed: [], total: 0 };
  if (id === 'pattern') {
    const start = integer(random, 4), step = 1 + integer(random, level >= 4 ? 3 : 2), sequence = Array.from({ length: 4 }, (_, i) => (start + i * step) % 4), answer = (start + 4 * step) % 4;
    return { ...common, id, sequence, step, answer, choices: shuffle([answer, (answer + 1) % 4, (answer + 3) % 4], random) };
  }
  if (id === 'cups') {
    const initial = integer(random, 3), swaps: [number, number][] = [];
    let answer = initial;
    for (let i = 0; i < (level >= 4 ? 4 : 3); i++) {
      const a = integer(random, 3), b = (a + 1 + integer(random, 2)) % 3;
      swaps.push([a, b]); if (answer === a) answer = b; else if (answer === b) answer = a;
    }
    const revealUntil = 0.65, swapDuration = 0.48;
    return { ...common, id, initial, swaps, answer, revealUntil, swapDuration, pickAfter: revealUntil + swaps.length * swapDuration + 0.12 };
  }
  if (id === 'mirror') return { ...common, id, sequence: Array.from({ length: level >= 4 ? 4 : 3 }, () => integer(random, 4)), progress: 0 };
  return undefined;
}

export function brainCard(index: number, count = 3) { const width = 142, gap = 24; return { x: (640 - count * width - (count - 1) * gap) / 2 + index * (width + gap), y: 326, width, height: 80 }; }
export function pipeTile(index: number) { return { x: 218 + (index % 2) * 106, y: 158 + Math.floor(index / 2) * 106, width: 98, height: 98 }; }
export function brainPad(index: number) { return [{ x: 320, y: 197 }, { x: 429, y: 294 }, { x: 320, y: 381 }, { x: 211, y: 294 }][index]; }
export const SCALE_UNDO = { x: 470, y: 125, width: 114, height: 42 };
function inside(input: RushInput, b: { x: number; y: number; width: number; height: number }) { return input.pointerX >= b.x && input.pointerX <= b.x + b.width && input.pointerY >= b.y && input.pointerY <= b.y + b.height; }
function choose(p: BrainState, input: RushInput, count = 3, tiles = false) {
  if (input.pointerPressed) {
    for (let i = 0; i < count; i++) {
      const bounds = tiles ? pipeTile(i) : p.id === 'cups' ? { ...brainCard(i, count), y: 260, height: 146 } : brainCard(i, count);
      if (inside(input, bounds)) { p.selected = i; return i; }
    }
    return -1;
  }
  if (input.leftPressed) p.selected = (p.selected + count - 1) % count;
  if (input.rightPressed) p.selected = (p.selected + 1) % count;
  if (tiles && (input.upPressed || input.downPressed)) p.selected = (p.selected + 2) % count;
  return input.action ? p.selected : -1;
}
function direction(input: RushInput) {
  if (input.pointerPressed) {
    for (let i = 0; i < 4; i++) { const p = brainPad(i); if (Math.hypot(input.pointerX - p.x, input.pointerY - p.y) <= 46) return i; }
    return -1;
  }
  return input.upPressed ? 0 : input.rightPressed ? 1 : input.downPressed ? 2 : input.leftPressed ? 3 : -1;
}

export function updateBrainGame(session: RushSession, input: RushInput, _dt: number): { result: 'success' | 'failure'; reason: string } | null {
  const g = session.game;
  if (!g || g.extra?.pack !== 'brain') return null;
  const p = g.extra;
  if (p.id === 'echo' || p.id === 'mirror') {
    if (p.id === 'echo' && g.time < p.revealUntil) return null;
    const pressed = direction(input);
    if (pressed < 0) return null;
    const expected = p.id === 'echo' ? p.sequence[p.progress] : MIRROR_DIRECTION[p.sequence[p.progress]];
    if (pressed !== expected) return { result: 'failure', reason: p.id === 'echo' ? '光った順番を覚えて、GO の後に入力しよう' : '鏡は左右を逆にするよ。上下はそのまま！' };
    p.progress++; session.sounds.push('pop');
    if (p.id === 'echo') { p.feedback = pressed; p.feedbackUntil = g.time + 0.16; }
    return p.progress === p.sequence.length ? { result: 'success', reason: p.id === 'echo' ? 'パーフェクト・エコー！' : '鏡写し、大成功！' } : null;
  }
  if (p.id === 'cups' && g.time < p.pickAfter) return null;
  if (p.id === 'scale' && (input.downPressed || (input.pointerPressed && inside(input, SCALE_UNDO)))) {
    const removed = p.placed.pop(); if (removed !== undefined) { p.total -= removed; session.sounds.push('pop'); }
    return null;
  }
  const chosen = choose(p, input, p.id === 'pipe' ? 4 : 3, p.id === 'pipe');
  if (chosen < 0) return null;
  if (p.id === 'pipe') {
    p.rotations[chosen] = (p.rotations[chosen] + 1) % (chosen === 0 ? 2 : 4); session.sounds.push('pop');
    return p.rotations.every((n, i) => n === p.target[i]) ? { result: 'success', reason: 'つながった！ 水がゴールへ！' } : null;
  }
  if (p.id === 'lights') {
    p.lamps = p.lamps.map((lit, i) => LIGHT_MASKS[chosen] & (1 << i) ? !lit : lit); session.sounds.push('pop');
    return p.lamps.every(Boolean) ? { result: 'success', reason: '全部ぴかぴか！ スイッチ名人！' } : null;
  }
  if (p.id === 'scale') {
    const weight = p.weights[chosen]; p.placed.push(weight); p.total += weight; session.sounds.push('pop');
    return p.total === p.target ? { result: 'success', reason: 'ぴたり！ つりあった！' } : p.total > p.target ? { result: 'failure', reason: '重すぎた！ 右の重さと同じにしよう' } : null;
  }
  const correct = p.id === 'cups' ? chosen === p.answer : p.choices[chosen] === p.answer;
  return { result: correct ? 'success' : 'failure', reason: p.id === 'clock' ? correct ? 'ぴったりの時刻！' : '短い針は時、長い針は分を表すよ' : p.id === 'pattern' ? correct ? '回転の法則、発見！' : '同じ角度ずつ回したら、次はどの向き？' : correct ? '見失わなかった！ 星を発見！' : '星を隠したカップを追いかけよう' };
}
