import type { RushDefinition, RushId, RushInput, RushSession, RushVariationDefinition } from './engine';

export type BrainId = 'pipe' | 'lights' | 'echo' | 'clock' | 'scale' | 'pattern' | 'cups' | 'mirror';
const BRAIN_VARIATIONS: Record<BrainId, readonly RushVariationDefinition[]> = {
  pipe: [{ name: '左上から左下' }, { name: '左下から左上', command: '下から上へ つなげ！', hint: '左下の蛇口から上の出口までつなごう。タップ / 矢印 ＋ Space で回転。', shortHint: '左下の水を上の出口へ' }, { name: '右上から右下', command: '右の水を つなげ！', hint: '右上の蛇口から下の出口までつなごう。タップ / 矢印 ＋ Space で回転。', shortHint: '右上の水を下の出口へ' }],
  lights: [{ name: '右どなり連動' }, { name: '左どなり連動', command: '左どなりも 点灯！', hint: '真上と左隣のランプを反転。ボタンの番号を見て全部 ON にしよう。', shortHint: '上と左隣が反転。全部 ON に' }, { name: '右はじ連動', command: '右はじも 点灯！', hint: '1 は 1 と 3、2 は 2 と 3、3 は 3 だけ反転。全部 ON にしよう。', shortHint: 'ボタンの番号が反転。全部 ON に' }],
  echo: [{ name: '同じ順番' }, { name: '逆の順番', command: 'さいごから おせ！', hint: '光った順番を覚え、GO の後に最後から逆順で入力。タップ / 上下左右。', shortHint: '光った順の最後 → 最初に入力' }, { name: 'ひとつ右回り', command: 'ひとつ右回りに おせ！', hint: '光った各パッドの、時計回りに 1 つ先を同じ順で入力。上→右→下→左→上。', shortHint: '上→右、右→下、下→左、左→上' }],
  clock: [{ name: '時と半分' }, { name: '15分きざみ', command: '15分の 時計をよめ！', hint: '15・30・45 分の時計も登場。長い針が指す分を読んで時刻を選ぼう。', shortHint: '長い針の 15・30・45 分に注目' }, { name: '5分きざみ', command: '5分の 時計をよめ！', hint: '長い針は数字 1 つで 5 分。細かい分まで正しい時刻を選ぼう。', shortHint: '長い針は数字 1 つで 5 分' }],
  scale: [{ name: '基本のおもり' }, { name: '偶数のおもり', command: '偶数で 重さをあわせろ！', hint: '2・4・6 g のおもりを組み合わせ、右と同じ重さにしよう。↓ / 戻すで Undo。', shortHint: '2・4・6 g を組み合わせる' }, { name: '奇数のおもり', command: '奇数で 重さをあわせろ！', hint: '3・5・7 g のおもりを組み合わせ、右と同じ重さにしよう。↓ / 戻すで Undo。', shortHint: '3・5・7 g を組み合わせる' }],
  pattern: [{ name: '同じ角度' }, { name: '90度と180度', command: '90度・180度 交互！', hint: '時計回りに 90 度、180 度と交互に回転。次に来る矢印を選ぼう。', shortHint: '時計回り 90 度 → 180 度を交互に' }, { name: '右回り左回り', command: '右・左 交互！', hint: '90 度ずつ右回り、左回りと交互に回転。次に来る矢印を選ぼう。', shortHint: '90 度右回り → 左回りを交互に' }],
  cups: [{ name: '自由な入れ替え' }, { name: 'となり同士', command: 'となりの星を おえ！', hint: '隣同士のカップが次々交換。星のカップを追い、止まったら選ぼう。', shortHint: '隣同士の交換を目で追う' }, { name: '両はじクロス', command: 'クロスする星を おえ！', hint: '両端のカップも大きくクロスして交換。星を目で追い、止まったら選ぼう。', shortHint: '両端の大きな交換に注意' }],
  mirror: [{ name: '左右のかがみ' }, { name: '上下のかがみ', command: '上下を うつせ！', hint: '上の矢印を左から入力。上と下だけ逆、左右はそのまま。矢印キー / 方向パッド。', shortHint: '上下だけ逆！ 左右はそのまま' }, { name: '180度かがみ', command: 'ぜんぶ 反対！', hint: '上の矢印を左から入力。上下も左右も逆向きにしよう。矢印キー / 方向パッド。', shortHint: '上下も左右も逆向きに入力' }],
};
export const BRAIN_GAMES: RushDefinition[] = [
  { id: 'pipe', category: 'puzzle', number: '25', name: 'くるくるパイプ', command: '水を つなげ！', hint: 'パイプをタップして回転。左の蛇口から下の出口までつなごう。矢印で選んで Space でも回せる。', shortHint: 'タップ / 矢印 ＋ Space で回す', color: '#a4dbe8' },
  { id: 'lights', category: 'puzzle', number: '26', name: 'となりもスイッチ', command: 'ぜんぶ 点灯！', hint: 'スイッチは真上と右隣のランプを反転。3 つとも光らせよう。タップ / ← → ＋ Space。', shortHint: '上と右隣が反転。全部光らせよう', color: '#f8df85' },
  { id: 'echo', category: 'memory', number: '27', name: 'カラフル・エコー', command: '光った順に おせ！', hint: '光る色の順番を覚え、GO の後に同じ順でタップ。矢印キーは画面の上下左右のパッドに対応。', shortHint: 'GO の後、光った順にタップ / 矢印', color: '#c3b6ea' },
  { id: 'clock', category: 'puzzle', number: '28', name: 'いま なんじ？', command: '時計を よめ！', hint: '長い針は分、短い針は時。正しい時刻をタップ / ← → で選んで Space。', shortHint: '正しい時刻をタップ / ← → ＋ Space', color: '#a5d6c0' },
  { id: 'scale', category: 'puzzle', number: '29', name: 'ぴたり・てんびん', command: '重さを あわせろ！', hint: 'おもりをタップして左の皿へ追加。右と同じ重さにしよう。← → ＋ Space で追加、↓ で 1 つ戻す。', shortHint: 'おもりを追加。↓ / 戻すで Undo', color: '#edbd9c' },
  { id: 'pattern', category: 'puzzle', number: '30', name: 'つぎは どっち？', command: '回転の つづき！', hint: 'やじるしは毎回、同じ角度ずつ回転。最後に続く向きをタップ / ← → ＋ Space。', shortHint: '同じ回り方を続ける向きを選ぶ', color: '#f4b7d0' },
  { id: 'cups', category: 'memory', number: '31', name: 'ほしのカップ', command: '星を おいかけろ！', hint: '星を隠したカップを目で追おう。入れ替えが終わったらタップ / ← → ＋ Space。', shortHint: '入れ替え後、星のカップを選ぶ', color: '#b7d99d' },
  { id: 'mirror', category: 'memory', number: '32', name: 'かがみコマンド', command: 'かがみに うつせ！', hint: '上の矢印を左から順に鏡写しで入力。左と右だけ逆になる。矢印キー / 画面下の方向パッド。', shortHint: '左右だけ逆！ 上下はそのまま', color: '#a8caec' },
].map(game => ({ ...game, variations: BRAIN_VARIATIONS[game.id as BrainId] })) as RushDefinition[];

interface BrainBase { pack: 'brain'; selected: number; variation: number }
export type BrainState = BrainBase & (
  | { id: 'pipe'; rotations: number[]; target: number[]; straight: number; path: number[]; inlet: { tile: number; direction: number }; outlet: { tile: number; direction: number } }
  | { id: 'lights'; lamps: boolean[]; masks: number[] }
  | { id: 'echo'; sequence: number[]; expected: number[]; progress: number; revealUntil: number; flashStep: number; feedback: number; feedbackUntil: number }
  | { id: 'clock'; hour: number; minute: number; choices: number[]; answer: number }
  | { id: 'scale'; weights: number[]; target: number; placed: number[]; total: number }
  | { id: 'pattern'; sequence: number[]; step: number; choices: number[]; answer: number }
  | { id: 'cups'; initial: number; swaps: [number, number][]; answer: number; revealUntil: number; swapDuration: number; pickAfter: number }
  | { id: 'mirror'; sequence: number[]; mapping: number[]; progress: number }
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
export function createBrainState(id: RushId, level: number, random: () => number, variation = 0): BrainState | undefined {
  variation = Math.max(0, Math.min(2, Math.floor(variation)));
  const common = { pack: 'brain' as const, selected: 0, variation };
  if (id === 'pipe') {
    const target = [[1, 2, 1, 3], [0, 2, 1, 3], [1, 1, 0, 2]][variation], straight = [0, 2, 1][variation];
    const rotations = target.map((n, i) => (n + (i === straight ? 2 : 4) - 1 - integer(random, i === straight || level < 4 ? 1 : 2)) % (i === straight ? 2 : 4));
    const path = [[0, 1, 3, 2], [2, 3, 1, 0], [1, 0, 2, 3]][variation];
    return { ...common, id, rotations, target, straight, path, inlet: { tile: path[0], direction: variation === 2 ? 1 : 3 }, outlet: { tile: path[3], direction: variation === 1 ? 0 : 2 } };
  }
  if (id === 'lights') {
    const solution = 1 + integer(random, 7);
    let mask = 7;
    const masks = [LIGHT_MASKS, [0b001, 0b011, 0b110], [0b101, 0b110, 0b100]][variation];
    for (let i = 0; i < 3; i++) if (solution & (1 << i)) mask ^= masks[i];
    return { ...common, id, masks, lamps: [0, 1, 2].map(i => Boolean(mask & (1 << i))) };
  }
  if (id === 'echo') {
    const sequence = Array.from({ length: level >= 4 ? 4 : 3 }, () => integer(random, 4));
    for (let i = 1; i < sequence.length; i++) if (sequence[i] === sequence[i - 1]) sequence[i] = (sequence[i] + 1 + integer(random, 3)) % 4;
    // A palindrome would make the reverse rule identical to the normal rule.
    if (variation === 1 && sequence.every((value, i) => value === sequence[sequence.length - 1 - i])) sequence[sequence.length - 1] = [0, 1, 2, 3].find(value => value !== sequence[0] && value !== sequence[sequence.length - 2])!;
    const flashStep = 0.43;
    const expected = variation === 1 ? [...sequence].reverse() : variation === 2 ? sequence.map(n => (n + 1) % 4) : [...sequence];
    return { ...common, id, sequence, expected, progress: 0, revealUntil: 0.18 + sequence.length * flashStep, flashStep, feedback: -1, feedbackUntil: 0 };
  }
  if (id === 'clock') {
    const hour = 1 + integer(random, 12), minute = variation === 2 ? [5, 10, 20, 25, 35, 40, 50, 55][integer(random, 8)] : variation === 1 ? [15, 30, 45][integer(random, 3)] : integer(random, level >= 4 ? 4 : 2) * (level >= 4 ? 15 : 30), answer = (hour % 12) * 60 + minute;
    return { ...common, id, hour, minute, answer, choices: shuffle([answer, (answer + 60) % 720, (answer + (minute === 0 ? 30 : 720 - 15)) % 720], random) };
  }
  if (id === 'scale') return { ...common, id, weights: variation === 1 ? [2, 4, 6] : variation === 2 ? [3, 5, 7] : level >= 4 ? [2, 3, 5] : [1, 2, 3], target: variation === 1 ? 8 + 2 * integer(random, 4) : variation === 2 ? [8, 10, 12, 14, 15, 17][integer(random, 6)] : (level >= 4 ? 8 : 5) + integer(random, 5), placed: [], total: 0 };
  if (id === 'pattern') {
    const start = integer(random, 4), step = 1 + integer(random, level >= 4 ? 3 : 2);
    const values = variation === 1 ? [start, (start + 1) % 4, (start + 3) % 4, start, (start + 2) % 4] : variation === 2 ? [start, (start + 1) % 4, start, (start + 1) % 4, start] : Array.from({ length: 5 }, (_, i) => (start + i * step) % 4), sequence = values.slice(0, 4), answer = values[4];
    return { ...common, id, sequence, step, answer, choices: shuffle([answer, (answer + 1) % 4, (answer + 3) % 4], random) };
  }
  if (id === 'cups') {
    const initial = integer(random, 3), swaps: [number, number][] = [];
    let answer = initial;
    for (let i = 0; i < (level >= 4 ? 4 : 3); i++) {
      const a = variation === 1 ? integer(random, 2) : variation === 2 && i % 2 === 0 ? 0 : integer(random, 3), b = variation === 1 ? a + 1 : variation === 2 && i % 2 === 0 ? 2 : (a + 1 + integer(random, 2)) % 3;
      swaps.push([a, b]); if (answer === a) answer = b; else if (answer === b) answer = a;
    }
    const revealUntil = 0.65, swapDuration = 0.48;
    return { ...common, id, initial, swaps, answer, revealUntil, swapDuration, pickAfter: revealUntil + swaps.length * swapDuration + 0.12 };
  }
  if (id === 'mirror') return { ...common, id, sequence: Array.from({ length: level >= 4 ? 4 : 3 }, () => integer(random, 4)), mapping: variation === 1 ? [2, 1, 0, 3] : variation === 2 ? [2, 3, 0, 1] : [...MIRROR_DIRECTION], progress: 0 };
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
    const expected = p.id === 'echo' ? p.expected[p.progress] : p.mapping[p.sequence[p.progress]];
    if (pressed !== expected) return { result: 'failure', reason: p.id === 'echo' ? ['光った順番を覚えて、GO の後に入力しよう', '光った順番の最後から逆順に入力しよう', '光ったパッドの時計回りに 1 つ先を入力しよう'][p.variation] : ['左右だけ逆、上下はそのまま！', '上下だけ逆、左右はそのまま！', '上下も左右も逆向きにしよう！'][p.variation] };
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
    p.rotations[chosen] = (p.rotations[chosen] + 1) % (chosen === p.straight ? 2 : 4); session.sounds.push('pop');
    return p.rotations.every((n, i) => n === p.target[i]) ? { result: 'success', reason: 'つながった！ 水がゴールへ！' } : null;
  }
  if (p.id === 'lights') {
    p.lamps = p.lamps.map((lit, i) => p.masks[chosen] & (1 << i) ? !lit : lit); session.sounds.push('pop');
    return p.lamps.every(Boolean) ? { result: 'success', reason: '全部ぴかぴか！ スイッチ名人！' } : null;
  }
  if (p.id === 'scale') {
    const weight = p.weights[chosen]; p.placed.push(weight); p.total += weight; session.sounds.push('pop');
    return p.total === p.target ? { result: 'success', reason: 'ぴたり！ つりあった！' } : p.total > p.target ? { result: 'failure', reason: '重すぎた！ 右の重さと同じにしよう' } : null;
  }
  const correct = p.id === 'cups' ? chosen === p.answer : p.choices[chosen] === p.answer;
  return { result: correct ? 'success' : 'failure', reason: p.id === 'clock' ? correct ? 'ぴったりの時刻！' : '短い針は時、長い針は分を表すよ' : p.id === 'pattern' ? correct ? '回転の法則、発見！' : ['同じ角度ずつ回したら、次はどの向き？', '時計回りに 90 度・180 度を交互に回そう', '90 度ずつ右回り・左回りを交互にしよう'][p.variation] : correct ? '見失わなかった！ 星を発見！' : '星を隠したカップを追いかけよう' };
}
