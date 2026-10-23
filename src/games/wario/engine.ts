import { PUZZLE_GAMES, createPuzzleState, updatePuzzleGame, type PuzzleId, type PuzzleState } from './puzzleGames';
import { ACTION_GAMES, createActionState, updateActionGame, type ActionId, type ActionState } from './actionGames';
import { BRAIN_GAMES, createBrainState, updateBrainGame, type BrainId, type BrainState } from './brainGames';
import { ARCADE_GAMES, createArcadeState, updateArcadeGame, type ArcadeId, type ArcadeState } from './arcadeGames';

export type RushId = 'jump' | 'catch' | 'inflate' | 'stop' | 'match' | 'dodge' | 'react' | 'sequence' | PuzzleId | ActionId | BrainId | ArcadeId;
export type RushCategory = 'action' | 'timing' | 'puzzle' | 'memory';
export type RushPhase = 'title' | 'practice' | 'brief' | 'play' | 'result' | 'speedup' | 'over';
export type RushSound = 'instruction' | 'start' | 'success' | 'failure' | 'speedup' | 'over' | 'pop';

export interface RushDefinition {
  category: RushCategory;
  id: RushId;
  name: string;
  command: string;
  hint: string;
  shortHint: string;
  number: string;
  color: string;
}

export const RUSH_GAMES: RushDefinition[] = [
  { id: 'jump', category: 'action', name: 'ハードル・ジャンプ', command: 'とびこえろ！', hint: 'タップ / Space でジャンプ。赤いハードルをこえよう。', shortHint: 'タップ / Space でジャンプ', number: '01', color: '#f8d94b' },
  { id: 'catch', category: 'action', name: 'おやつキャッチ', command: 'ぜんぶ キャッチ！', hint: '指でカゴを動かす / ← →。3 つのドーナツを受けとめよう。', shortHint: '指でカゴを動かす / ← →', number: '02', color: '#ff9db8' },
  { id: 'inflate', category: 'action', name: 'ふくらめバルーン', command: 'れんだしろ！', hint: 'タップ / Space を連打。風船を大きくしよう。', shortHint: 'タップ / Space を連打', number: '03', color: '#a4dbe8' },
  { id: 'stop', category: 'timing', name: 'ぴったりストップ', command: 'みどりで とめろ！', hint: '針が緑のゾーンに入ったら、タップ / Space。', shortHint: '緑のゾーンで タップ / Space', number: '04', color: '#b9e2a0' },
  { id: 'match', category: 'puzzle', name: 'かたちサーチ', command: 'おなじ形を えらべ！', hint: 'お手本と同じ形をタップ / ← → で選んで Space。', shortHint: '同じ形をタップ / ← → ＋ Space', number: '05', color: '#c9b5ef' },
  { id: 'dodge', category: 'action', name: 'メテオ・ダンス', command: 'よけつづけろ！', hint: '指で動かす / ← →。時間いっぱい隕石をよけよう。', shortHint: '指で動かす / ← → でよける', number: '06', color: '#9fdcd0' },
  { id: 'react', category: 'timing', name: 'まだまだ・いまだ', command: 'みどりで おせ！', hint: '赤のあいだは待つ。緑になったらタップ / Space！', shortHint: '赤は待つ。緑で タップ / Space', number: '07', color: '#f8c07c' },
  { id: 'sequence', category: 'memory', name: 'やじるしコード', command: '順番どおりに！', hint: '左から順に ← →。画面下の左右ボタンでも入力できる。', shortHint: '左から順に ← → / 下の左右をタップ', number: '08', color: '#f5b4d1' },
  ...PUZZLE_GAMES,
  ...ACTION_GAMES,
  ...BRAIN_GAMES,
  ...ARCADE_GAMES,
];

export interface RushInput {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  leftPressed: boolean;
  rightPressed: boolean;
  upPressed: boolean;
  downPressed: boolean;
  action: boolean;
  actionHeld: boolean;
  actionReleased: boolean;
  pointerPressed: boolean;
  pointerDown: boolean;
  pointerX: number;
  pointerY: number;
}

export interface RushMicrogame {
  id: RushId;
  time: number;
  x: number;
  jumpY: number;
  velocityY: number;
  target: number;
  targetWidth: number;
  count: number;
  needed: number;
  selected: number;
  options: number[];
  sequence: number[];
  drops: { x: number; start: number; caught: boolean }[];
  needle: number;
  result: 'success' | 'failure' | null;
  reason: string;
  extra?: PuzzleState | ActionState | BrainState | ArcadeState;
}

export interface RushSession {
  phase: RushPhase;
  paused: boolean;
  phaseTime: number;
  round: number;
  score: number;
  lives: number;
  level: number;
  practice: RushId | null;
  elapsed: number;
  duration: number;
  seed: number;
  bag: RushId[];
  last: RushId | null;
  game: RushMicrogame | null;
  sounds: RushSound[];
  result: 'success' | 'failure' | null;
}

export const emptyRushInput = (): RushInput => ({ left: false, right: false, up: false, down: false, leftPressed: false, rightPressed: false, upPressed: false, downPressed: false, action: false, actionHeld: false, actionReleased: false, pointerPressed: false, pointerDown: false, pointerX: 320, pointerY: 240 });
export function clearRushInput(input: RushInput) { Object.assign(input, emptyRushInput()); }
export const rushDefinition = (id: RushId) => RUSH_GAMES.find(game => game.id === id) ?? RUSH_GAMES[0];
const clamp = (n: number, low: number, high: number) => Math.min(high, Math.max(low, n));
function random(s: RushSession) {
  let n = s.seed | 0;
  n ^= n << 13; n ^= n >>> 17; n ^= n << 5;
  s.seed = n >>> 0;
  return s.seed / 4294967296;
}

export function createRushSession(seed = Date.now()): RushSession {
  return { phase: 'title', paused: false, phaseTime: 0, round: 0, score: 0, lives: 4, level: 1, practice: null, elapsed: 0, duration: 5, seed: (seed >>> 0) || 104729, bag: [], last: null, game: null, sounds: [], result: null };
}

/** A shuffled deck gives every game a turn and also prevents repeats across deck boundaries. */
export function selectRushGame(s: RushSession): RushId {
  if (s.practice) return s.practice;
  if (!s.bag.length) {
    s.bag = RUSH_GAMES.map(game => game.id);
    for (let i = s.bag.length - 1; i > 0; i--) {
      const j = Math.floor(random(s) * (i + 1));
      [s.bag[i], s.bag[j]] = [s.bag[j], s.bag[i]];
    }
    if (s.bag[s.bag.length - 1] === s.last) [s.bag[0], s.bag[s.bag.length - 1]] = [s.bag[s.bag.length - 1], s.bag[0]];
  }
  const id = s.bag.pop()!;
  s.last = id;
  return id;
}

export function rushSpeed(level: number) { return Math.min(1.7, 1 + (Math.max(1, level) - 1) * 0.12); }

function beginRound(s: RushSession, input: RushInput) {
  const id = selectRushGame(s);
  const options = [0, 1, 2];
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(random(s) * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  s.game = {
    id, time: 0, x: 320, jumpY: 0, velocityY: 0, target: id === 'stop' ? 250 + random(s) * 140 : id === 'react' ? 1.15 + random(s) * 1.1 : Math.floor(random(s) * 3),
    targetWidth: Math.max(78, 118 - s.level * 5), count: 0, needed: id === 'inflate' ? 8 + Math.min(4, Math.floor((s.level - 1) / 2)) : id === 'sequence' ? Math.min(5, 3 + Math.floor(s.level / 3)) : 3,
    selected: 1, options, sequence: Array.from({ length: 5 }, () => random(s) < 0.5 ? -1 : 1), needle: 320,
    drops: id === 'catch'
      ? [0, 0.95, 1.9].map((start, i) => ({ x: [180, 460, 270][i], start, caught: false }))
      : [0, 0.75, 1.5, 2.25, 3].map(start => ({ x: 80 + random(s) * 480, start, caught: false })),
    result: null, reason: '', extra: createPuzzleState(id, s.level, () => random(s)) ?? createActionState(id, s.level, () => random(s)) ?? createBrainState(id, s.level, () => random(s)) ?? createArcadeState(id, s.level, () => random(s)),
  };
  s.phase = 'brief'; s.phaseTime = 1.1; s.elapsed = 0; s.duration = 5 / rushSpeed(s.level); s.round++; s.result = null;
  s.sounds.push('instruction');
  clearRushInput(input);
}

export function startRush(s: RushSession, input: RushInput, practice: RushId | null = null) {
  const fresh = createRushSession(s.seed);
  Object.assign(s, fresh);
  s.practice = practice;
  beginRound(s, input);
}

export function pauseRush(s: RushSession, input: RushInput, paused = !s.paused) {
  if (!['brief', 'play', 'result', 'speedup'].includes(s.phase)) return;
  s.paused = paused;
  clearRushInput(input);
}

function finish(s: RushSession, input: RushInput, result: 'success' | 'failure', reason: string) {
  s.result = result;
  if (s.game) { s.game.result = result; s.game.reason = reason; }
  if (result === 'success') s.score++;
  else if (!s.practice) s.lives--;
  s.phase = 'result'; s.phaseTime = s.practice ? 1.15 : 0.85;
  s.sounds.push(result);
  clearRushInput(input);
}

function updateMicrogame(s: RushSession, input: RushInput, dt: number) {
  const g = s.game!;
  const localDt = dt * rushSpeed(s.level);
  g.time += localDt;
  if (g.id === 'catch' || g.id === 'dodge') {
    if (input.pointerDown) g.x = clamp(input.pointerX, 48, 592);
    else g.x = clamp(g.x + (Number(input.right) - Number(input.left)) * 400 * localDt, 48, 592);
  }
  if (g.id === 'jump') {
    if (input.action && g.jumpY >= 0) { g.velocityY = -740; s.sounds.push('pop'); }
    g.velocityY += 1900 * localDt;
    g.jumpY = Math.min(0, g.jumpY + g.velocityY * localDt);
    if (g.jumpY >= 0) g.velocityY = 0;
    const obstacleX = 650 - g.time * 240;
    if (Math.abs(obstacleX - 150) < 43 && g.jumpY > -65) finish(s, input, 'failure', 'ハードルの手前で ジャンプ！');
    else if (obstacleX < 85) finish(s, input, 'success', 'ナイスジャンプ！');
  } else if (g.id === 'catch') {
    for (const drop of g.drops) {
      const y = 70 + (g.time - drop.start) * 150;
      if (!drop.caught && y >= 334) {
        if (Math.abs(drop.x - g.x) < 64) { drop.caught = true; g.count++; s.sounds.push('pop'); }
        else if (y > 386) { finish(s, input, 'failure', 'ドーナツの下に カゴを動かそう'); break; }
      }
    }
    if (g.count === 3) finish(s, input, 'success', 'ぜんぶ いただき！');
  } else if (g.id === 'inflate') {
    if (input.action) { g.count++; s.sounds.push('pop'); }
    if (g.count >= g.needed) finish(s, input, 'success', 'ふくらんだ！');
  } else if (g.id === 'stop') {
    g.needle = 120 + (0.5 + Math.sin(g.time * 3.5) * 0.5) * 400;
    if (input.action) finish(s, input, Math.abs(g.needle - g.target) <= g.targetWidth / 2 ? 'success' : 'failure', Math.abs(g.needle - g.target) <= g.targetWidth / 2 ? 'ぴったり！' : '緑のゾーンに入ったら おそう');
  } else if (g.id === 'match') {
    if (input.leftPressed) g.selected = (g.selected + 2) % 3;
    if (input.rightPressed) g.selected = (g.selected + 1) % 3;
    let confirm = input.action && !input.pointerPressed;
    if (input.pointerPressed && input.pointerY >= 232 && input.pointerY <= 363) {
      const index = Math.round((input.pointerX - 145) / 175);
      if (index >= 0 && index < 3 && Math.abs(input.pointerX - (145 + index * 175)) < 72) { g.selected = index; confirm = true; }
    }
    if (confirm) finish(s, input, g.options[g.selected] === g.target ? 'success' : 'failure', g.options[g.selected] === g.target ? '正解！ よく見つけた！' : '上のお手本と 同じ形をえらぼう');
  } else if (g.id === 'dodge') {
    for (const drop of g.drops) {
      const y = -60 + (g.time - drop.start) * 285;
      if (y > 310 && y < 400 && Math.abs(drop.x - g.x) < 42) { finish(s, input, 'failure', '空いている場所に すばやく移動！'); break; }
    }
    if (s.phase === 'play' && g.time >= 4.65) finish(s, input, 'success', 'パーフェクト回避！');
  } else if (g.id === 'react') {
    if (input.action) finish(s, input, g.time >= g.target ? 'success' : 'failure', g.time >= g.target ? `${Math.round((g.time - g.target) * 1000)} ms！ いい反応！` : 'まだ赤！ 緑になるまで待とう');
    else if (g.time > g.target + 1.05) finish(s, input, 'failure', '緑になったら すぐおそう');
  } else if (g.id === 'sequence') {
    const direction = input.pointerPressed && input.pointerY > 255 ? (input.pointerX < 320 ? -1 : 1) : input.leftPressed ? -1 : input.rightPressed ? 1 : 0;
    if (direction) {
      if (direction !== g.sequence[g.count]) finish(s, input, 'failure', '左から順に やじるしを入力しよう');
      else { g.count++; s.sounds.push('pop'); if (g.count >= g.needed) finish(s, input, 'success', 'コード解除！'); }
    }
  } else {
    const outcome = updatePuzzleGame(s, input, localDt) ?? updateActionGame(s, input, localDt) ?? updateBrainGame(s, input, localDt) ?? updateArcadeGame(s, input, localDt);
    if (outcome) finish(s, input, outcome.result, outcome.reason);
  }
}

/** All timers live here: no delayed callbacks survive a restart, training switch, or pause. */
export function stepRush(s: RushSession, input: RushInput, deltaSeconds: number) {
  s.sounds = [];
  if (s.paused) { clearRushInput(input); return; }
  const dt = clamp(Number.isFinite(deltaSeconds) ? deltaSeconds : 0, 0, 0.05);
  if (s.phase === 'play' && s.game) {
    s.elapsed += dt;
    updateMicrogame(s, input, dt);
    if (s.phase === 'play' && s.elapsed >= s.duration) finish(s, input, 'failure', '時間切れ！ 次はいける！');
  } else if (['brief', 'result', 'speedup'].includes(s.phase)) {
    s.phaseTime -= dt;
    if (s.phaseTime <= 0) {
      if (s.phase === 'brief') { s.phase = 'play'; clearRushInput(input); s.sounds.push('start'); }
      else if (s.phase === 'speedup') beginRound(s, input);
      else if (!s.lives) { s.phase = 'over'; s.sounds.push('over'); clearRushInput(input); }
      else if (!s.practice && s.result === 'success' && s.score % 5 === 0) {
        s.level++; s.phase = 'speedup'; s.phaseTime = 1.2; s.sounds.push('speedup'); clearRushInput(input);
      } else beginRound(s, input);
    }
  }
  input.action = false; input.actionReleased = false; input.pointerPressed = false; input.leftPressed = false; input.rightPressed = false; input.upPressed = false; input.downPressed = false;
}

export function readRushRecord(value: string | null, fallback: number) {
  if (value === null || !/^\d+$/.test(value)) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= fallback && parsed <= 1000000 ? parsed : fallback;
}
