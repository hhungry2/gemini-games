export const SIZE = 8;
export const COLORS = ['ルビー', 'サファイア', 'エメラルド', 'トパーズ', 'アメジスト', 'シトリン'] as const;
export type Special = 'row' | 'column' | 'bomb' | 'rainbow';
export interface Gem { id: number; color: number; special?: Special }
export type Board = Gem[];
export type Mode = 'classic' | 'timeAttack' | 'mission';
export interface Game {
  board: Board; mode: Mode; stage: number; score: number; moves: number; time: number;
  collected: number[]; seed: number; nextId: number; bestCombo: number; hammer: number;
  shuffles: number; status: 'playing' | 'won' | 'lost';
}
export interface Match { cells: number[]; axis: 'row' | 'column' }
export interface Frame { board: Board; cleared: number[]; combo: number; points: number }
export interface Turn { game: Game; frames: Frame[]; valid: boolean; shuffled: boolean }
export const STAGES = [
  { title: '水晶の入口', target: 1800, moves: 24, color: 1, gems: 12 },
  { title: '翡翠の小道', target: 2600, moves: 26, color: 2, gems: 18 },
  { title: '琥珀の庭園', target: 3800, moves: 28, color: 3, gems: 22 },
  { title: '紫水晶の洞窟', target: 5000, moves: 30, color: 4, gems: 25 },
  { title: '紅玉の王冠', target: 6500, moves: 32, color: 0, gems: 30 },
];
const cloneBoard = (board: Board): Board => board.map(gem => ({ ...gem }));
export const cloneGame = (game: Game): Game => ({ ...game, board: cloneBoard(game.board), collected: [...game.collected] });
function random(game: Game) {
  let x = game.seed || 1;
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  game.seed = x >>> 0;
  return game.seed / 4294967296;
}
function gem(game: Game): Gem { return { id: game.nextId++, color: Math.floor(random(game) * 6) }; }
export function findMatches(board: Board): Match[] {
  const groups: Match[] = [];
  for (const axis of ['row', 'column'] as const) {
    for (let line = 0; line < SIZE; line++) {
      let start = 0;
      const at = (offset: number) => axis === 'row' ? line * SIZE + offset : offset * SIZE + line;
      while (start < SIZE) {
        let end = start + 1;
        while (end < SIZE && board[at(start)]?.special !== 'rainbow' && board[at(end)]?.special !== 'rainbow' && board[at(start)]?.color === board[at(end)]?.color) end++;
        if (end - start >= 3) groups.push({ axis, cells: Array.from({ length: end - start }, (_, i) => at(start + i)) });
        start = end;
      }
    }
  }
  return groups;
}
export function adjacent(a: number, b: number) {
  return a >= 0 && a < 64 && b >= 0 && b < 64 && Math.abs(Math.floor(a / SIZE) - Math.floor(b / SIZE)) + Math.abs(a % SIZE - b % SIZE) === 1;
}
export function findMove(board: Board): [number, number] | null {
  for (let a = 0; a < 64; a++) for (const b of [a + 1, a + SIZE]) {
    if (!adjacent(a, b)) continue;
    if (board[a].special === 'rainbow' || board[b].special === 'rainbow' || (board[a].special && board[b].special)) return [a, b];
    const copy = [...board]; [copy[a], copy[b]] = [copy[b], copy[a]];
    if (findMatches(copy).length) return [a, b];
  }
  return null;
}
function freshBoard(game: Game) {
  // Construct without initial matches. Retry only when no legal move exists.
  do {
    game.board = [];
    for (let i = 0; i < 64; i++) {
      let item: Gem;
      do { item = gem(game); } while ((i % SIZE >= 2 && game.board[i - 1].color === item.color && game.board[i - 2].color === item.color) || (i >= SIZE * 2 && game.board[i - SIZE].color === item.color && game.board[i - SIZE * 2].color === item.color));
      game.board.push(item);
    }
  } while (!findMove(game.board));
}
export function createGame(mode: Mode = 'classic', stage = 1, seed = Date.now()): Game {
  stage = Math.max(1, Math.min(STAGES.length, Math.floor(stage) || 1));
  const game: Game = { board: [], mode, stage, score: 0, moves: mode === 'mission' ? STAGES[stage - 1].moves : 30, time: 90, collected: [0, 0, 0, 0, 0, 0], seed: seed >>> 0 || 1, nextId: 1, bestCombo: 0, hammer: 2, shuffles: 2, status: 'playing' };
  freshBoard(game); return game;
}
export function checkStatus(game: Game) {
  const stage = STAGES[game.stage - 1];
  if (game.mode === 'mission' && game.score >= stage.target && game.collected[stage.color] >= stage.gems) game.status = 'won';
  else if ((game.mode === 'timeAttack' && game.time <= 0) || (game.mode !== 'timeAttack' && game.moves <= 0)) game.status = 'lost';
}
export function tickGame(game: Game, seconds: number): Game {
  if (game.status !== 'playing' || game.mode !== 'timeAttack') return game;
  const next = { ...game, time: Math.max(0, game.time - Math.max(0, seconds)) };
  checkStatus(next); return next;
}
function shuffle(game: Game) {
  const original = [...game.board];
  for (let attempt = 0; attempt < 100; attempt++) {
    for (let i = 63; i > 0; i--) {
      const j = Math.floor(random(game) * (i + 1));
      [game.board[i], game.board[j]] = [game.board[j], game.board[i]];
    }
    if (!findMatches(game.board).length && findMove(game.board)) return;
  }
  freshBoard(game);
  // An exceptionally stuck arrangement is regenerated; never leave a dead board.
  const specials = original.filter(g => g.special);
  specials.forEach((g, i) => { game.board[i].special = g.special; });
}
function resolve(game: Game, preferred: number[], forced: number[] = []): { frames: Frame[]; shuffled: boolean } {
  const frames: Frame[] = [];
  for (let combo = 1; combo <= 64; combo++) {
    const matches = findMatches(game.board);
    if (!matches.length && !forced.length) break;
    const removed = new Set([...matches.flatMap(m => m.cells), ...forced]);
    const promoted = new Map<number, Special>();
    if (!forced.length) {
      const crosses = matches.filter(m => m.axis === 'row').flatMap(m => m.cells).filter(i => matches.some(m => m.axis === 'column' && m.cells.includes(i)));
      for (const i of crosses) promoted.set(i, 'bomb');
      for (const group of matches) {
        const i = preferred.find(p => group.cells.includes(p)) ?? group.cells[Math.floor(group.cells.length / 2)];
        if (group.cells.length >= 5) promoted.set(i, 'rainbow');
        else if (group.cells.length === 4 && !group.cells.some(p => promoted.has(p))) promoted.set(i, group.axis);
      }
    }
    const queue = [...removed];
    const activated = new Set<number>();
    for (let k = 0; k < queue.length; k++) {
      const index = queue[k], item = game.board[index];
      if (!item.special || activated.has(index)) continue;
      activated.add(index); promoted.delete(index);
      const affected: number[] = [];
      if (item.special === 'rainbow') game.board.forEach((g, i) => { if (g.color === item.color) affected.push(i); });
      else if (item.special === 'row') for (let c = 0; c < SIZE; c++) affected.push(Math.floor(index / SIZE) * SIZE + c);
      else if (item.special === 'column') for (let r = 0; r < SIZE; r++) affected.push(r * SIZE + index % SIZE);
      else for (let r = Math.max(0, Math.floor(index / SIZE) - 1); r <= Math.min(7, Math.floor(index / SIZE) + 1); r++) for (let c = Math.max(0, index % SIZE - 1); c <= Math.min(7, index % SIZE + 1); c++) affected.push(r * SIZE + c);
      for (const i of affected) if (!removed.has(i)) { removed.add(i); queue.push(i); }
    }
    for (const index of promoted.keys()) removed.delete(index);
    const points = removed.size * 50 * combo;
    for (const index of removed) game.collected[game.board[index].color]++;
    game.score += points; game.bestCombo = Math.max(game.bestCombo, combo);
    frames.push({ board: cloneBoard(game.board), cleared: [...removed], combo, points });
    for (const [index, special] of promoted) game.board[index] = { ...game.board[index], special };
    for (let c = 0; c < SIZE; c++) {
      const survivors = Array.from({ length: SIZE }, (_, r) => r * SIZE + c).filter(i => !removed.has(i)).map(i => game.board[i]);
      const count = SIZE - survivors.length;
      const column = [...Array.from({ length: count }, () => gem(game)), ...survivors];
      for (let r = 0; r < SIZE; r++) game.board[r * SIZE + c] = column[r];
    }
    forced = []; preferred = [];
  }
  // Also guard pathological refill sequences against a runaway cascade.
  let shuffled = false;
  if (findMatches(game.board).length || !findMove(game.board)) { shuffle(game); shuffled = true; }
  checkStatus(game);
  return { frames, shuffled };
}
export function swapGems(original: Game, a: number, b: number): Turn {
  const invalid: Turn = { game: original, frames: [], valid: false, shuffled: false };
  if (original.status !== 'playing' || !adjacent(a, b)) return invalid;
  const game = cloneGame(original);
  [game.board[a], game.board[b]] = [game.board[b], game.board[a]];
  const specialA = game.board[a].special, specialB = game.board[b].special;
  const forced: number[] = [];
  if (specialA === 'rainbow' || specialB === 'rainbow') {
    const rainbowIndex = specialA === 'rainbow' ? a : b, other = rainbowIndex === a ? b : a;
    game.board[rainbowIndex].color = game.board[other].color;
    forced.push(a, b);
    game.board.forEach((g, i) => { if ((specialA === 'rainbow' && specialB === 'rainbow') || g.color === game.board[other].color) forced.push(i); });
  } else if (specialA && specialB) forced.push(a, b);
  else if (!findMatches(game.board).length) return invalid;
  if (game.mode !== 'timeAttack') game.moves--;
  return { game, valid: true, ...resolve(game, [b, a], forced) };
}
export function useHammer(original: Game, index: number): Turn {
  if (original.status !== 'playing' || original.hammer <= 0 || index < 0 || index >= 64) return { game: original, valid: false, frames: [], shuffled: false };
  const game = cloneGame(original); game.hammer--;
  return { game, valid: true, ...resolve(game, [], [index]) };
}
export function shuffleGame(original: Game): Game {
  if (original.status !== 'playing' || original.shuffles <= 0) return original;
  const game = cloneGame(original); game.shuffles--; shuffle(game); return game;
}
