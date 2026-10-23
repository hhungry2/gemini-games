import type { RushDefinition, RushId, RushInput, RushSession } from './engine';

export type ChallengeBossId = 'boss-golem' | 'boss-kraken';

export const CHALLENGE_BOSSES: RushDefinition[] = [
  {
    id: 'boss-golem', number: 'B4', category: 'puzzle', name: 'パネルゴーレム', command: '3つの封印を とけ！',
    hint: '4枚の矢印を上のお手本と同じ向きにしよう。← → で選び Space で回す / パネルをタップ。3つの封印を解けば撃破！',
    shortHint: '← → で選択 ＋ Space / タップで回す', color: '#b9d5aa',
    variations: [
      { name: '右まわりの封印', shortHint: '右に90°回して、お手本にそろえよう' },
      { name: '左まわりの封印', hint: 'パネルが左に90°回る！ ← → ＋ Space / パネルをタップして、上のお手本にそろえよう。3つの封印を解けば撃破！', shortHint: '左に90°回して、お手本にそろえよう' },
      { name: 'となりも回る封印', hint: '押したパネルと右となりが、一緒に右へ90°回る。右端のとなりは左端！ ← → ＋ Space / パネルをタップ。3つの封印を解こう。', shortHint: '自分と右となりが回る。右端は左端につながる！' },
    ],
  },
  {
    id: 'boss-kraken', number: 'B5', category: 'timing', name: 'ビートクラーケン', command: 'ビートで はねかえせ！',
    hint: '音符が下の白い輪に来たら ← ↓ → / 同じ列のパッドをタップ。10回はね返せば撃破！ ミスは2回まで。',
    shortHint: '白い輪で ← ↓ → / 同じ列のパッドをタップ', color: '#b6a5e5',
    variations: [
      { name: 'まっすぐビート', shortHint: '白い輪に音符が来たら ← ↓ → / タップ' },
      { name: 'うらおもてビート', hint: '左右を行き来するリズム！ 音符が白い輪に来たら ← ↓ → / 同じ列をタップ。10回で撃破、ミスは2回まで。', shortHint: '左右を行き来！ 音符を白い輪ではね返そう' },
      { name: 'はずむビート', hint: '短い間隔と長い間隔がまざる！ 音符が白い輪に来たら ← ↓ → / 同じ列をタップ。10回で撃破、ミスは2回まで。', shortHint: '間隔の変化に注目！ 白い輪で ← ↓ → / タップ' },
    ],
  },
];

interface ChallengeBase {
  pack: 'challenge-boss';
  variation: number;
  hp: number;
  maxHp: number;
  armor: number;
  maxArmor: number;
  phase: 1 | 2 | 3;
  hitFlash: number;
  feedback: string;
  feedbackTime: number;
}

export interface GolemBoard { target: number[]; initial: number[] }
export interface GolemBossState extends ChallengeBase {
  id: 'boss-golem';
  boards: GolemBoard[];
  boardIndex: number;
  panels: number[];
  selected: number;
  boardTime: number;
  boardLimit: number;
  transition: number;
}

export interface KrakenNote { lane: number; at: number; result: 'hit' | 'miss' | null }
export interface KrakenBossState extends ChallengeBase {
  id: 'boss-kraken';
  notes: KrakenNote[];
  hits: number;
  resolved: number;
  hitWindow: number;
  inputCooldown: number;
  padFlash: number[];
  lastLane: number;
}

export type ChallengeBossState = GolemBossState | KrakenBossState;

const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
const mod4 = (value: number) => (value % 4 + 4) % 4;
const boundedRandom = (random: () => number) => { const value = random(); return Number.isFinite(value) ? clamp(value, 0, 0.999999) : 0.5; };
export const golemPanelX = (index: number) => 134 + index * 124;
export const krakenLaneX = (lane: number) => 138 + lane * 182;

/** Shared by generation and player input, keeping even the linked seal exactly solvable. */
export function rotateGolemPanels(panels: number[], selected: number, variation: number, reverse = false) {
  const direction = (variation === 1 ? -1 : 1) * (reverse ? -1 : 1);
  panels[selected] = mod4(panels[selected] + direction);
  if (variation === 2) panels[(selected + 1) % 4] = mod4(panels[(selected + 1) % 4] + direction);
}

export function createChallengeBossState(id: RushId, level: number, variation = 0, random: () => number = () => 0.5): ChallengeBossState | undefined {
  if (id !== 'boss-golem' && id !== 'boss-kraken') return undefined;
  const selected = clamp(Math.floor(Number.isFinite(variation) ? variation : 0), 0, 2);
  const tier = clamp(Math.floor(Number.isFinite(level) ? level : 1), 1, 7);
  const common = { pack: 'challenge-boss' as const, variation: selected, armor: 3, maxArmor: 3, phase: 1 as const, hitFlash: 0, feedback: '', feedbackTime: 0 };
  if (id === 'boss-golem') {
    const boards: GolemBoard[] = Array.from({ length: 3 }, (_, boardIndex) => {
      const target = Array.from({ length: 4 }, () => Math.floor(boundedRandom(random) * 4));
      const initial = [...target], first = Math.floor(boundedRandom(random) * 4);
      // Reversing 2/3/4 distinct inputs produces increasing, always solvable seals.
      for (let index = 0; index < boardIndex + 2; index++) {
        const panel = (first + index) % 4;
        const steps = selected !== 2 && boardIndex === 2 && index === 0 ? 2 : 1;
        for (let step = 0; step < steps; step++) rotateGolemPanels(initial, panel, selected, true);
      }
      return { target, initial };
    });
    return { ...common, id, hp: 6, maxHp: 6, boards, boardIndex: 0, panels: [...boards[0].initial], selected: 0, boardTime: 0, boardLimit: tier >= 4 ? 5.8 : 6.2, transition: 0 };
  }
  const routes = [
    [0, 1, 2, 1, 0, 2, 1, 2, 0, 1, 0, 2],
    [2, 0, 2, 1, 0, 2, 0, 1, 2, 0, 1, 2],
    [1, 0, 2, 0, 2, 1, 2, 1, 0, 1, 2, 0],
  ];
  const gaps = selected === 2 ? [0.78, 0.78, 1.16] : selected === 1 ? [1.04, 0.84] : [0.94];
  const shift = Math.floor(boundedRandom(random) * 3);
  let at = 1.8;
  const notes = routes[selected].map((lane, index) => {
    if (index) at += gaps[(index - 1) % gaps.length];
    return { lane: (lane + shift) % 3, at, result: null };
  });
  return { ...common, id, hp: 10, maxHp: 10, notes, hits: 0, resolved: 0, hitWindow: tier >= 4 ? 0.28 : 0.31, inputCooldown: 0, padFlash: [0, 0, 0], lastLane: -1 };
}

function markFeedback(state: ChallengeBossState, feedback: string) { state.feedback = feedback; state.feedbackTime = 0.65; }

function updateGolem(session: RushSession, state: GolemBossState, input: RushInput, dt: number) {
  if (state.transition > 0) {
    state.transition = Math.max(0, state.transition - dt);
    if (state.transition === 0 && state.hp > 0) {
      state.boardIndex++; state.phase = (state.boardIndex + 1) as 1 | 2 | 3;
      state.panels = [...state.boards[state.boardIndex].initial]; state.selected = 0; state.boardTime = 0;
    }
    return;
  }
  state.boardTime += dt;
  if (state.boardTime >= state.boardLimit) {
    state.boardTime -= state.boardLimit; state.armor--; markFeedback(state, 'ゴーレムの一撃！ あわてず そろえよう');
    session.sounds.push('pop');
    if (state.armor <= 0) return;
  }
  if (input.leftPressed || input.upPressed) state.selected = (state.selected + 3) % 4;
  if (input.rightPressed || input.downPressed) state.selected = (state.selected + 1) % 4;
  let rotate = input.action && !input.pointerPressed;
  if (input.pointerPressed && input.pointerY >= 275 && input.pointerY <= 397) {
    const panel = Math.round((input.pointerX - golemPanelX(0)) / 124);
    if (panel >= 0 && panel < 4 && Math.abs(input.pointerX - golemPanelX(panel)) <= 54) { state.selected = panel; rotate = true; }
  }
  if (!rotate) return;
  rotateGolemPanels(state.panels, state.selected, state.variation); session.sounds.push('pop');
  if (state.panels.every((value, index) => value === state.boards[state.boardIndex].target[index])) {
    state.hp = Math.max(0, state.hp - 2); state.hitFlash = 0.45;
    markFeedback(state, state.hp ? '封印解除！ 次の封印へ！' : '3つの封印を すべて解除！');
    if (state.hp > 0) state.transition = 0.55;
  }
}

function updateKraken(session: RushSession, state: KrakenBossState, input: RushInput, dt: number) {
  const time = session.game!.time;
  state.inputCooldown = Math.max(0, state.inputCooldown - dt);
  state.padFlash = state.padFlash.map(value => Math.max(0, value - dt));
  for (const note of state.notes) if (note.result === null && time > note.at + state.hitWindow) {
    note.result = 'miss'; state.resolved++; state.armor--; markFeedback(state, 'ミス！ 白い輪に重なったら入力'); session.sounds.push('pop');
  }
  if (state.armor <= 0) return;
  let lane = input.leftPressed ? 0 : input.downPressed ? 1 : input.rightPressed ? 2 : -1;
  if (input.pointerPressed && input.pointerY >= 344 && input.pointerY <= 430) {
    const selected = Math.round((input.pointerX - krakenLaneX(0)) / 182);
    if (selected >= 0 && selected < 3 && Math.abs(input.pointerX - krakenLaneX(selected)) <= 77) lane = selected;
  }
  if (lane >= 0 && state.inputCooldown === 0) {
    state.lastLane = lane; state.padFlash[lane] = 0.2; state.inputCooldown = 0.16;
    const note = state.notes.find(candidate => candidate.result === null);
    if (note && note.lane === lane && Math.abs(time - note.at) <= state.hitWindow) {
      note.result = 'hit'; state.resolved++; state.hits++; state.hp = Math.max(0, state.maxHp - state.hits); state.hitFlash = 0.22;
      markFeedback(state, Math.abs(time - note.at) < 0.11 ? 'PERFECT！' : 'GOOD！'); session.sounds.push('pop');
    } else {
      state.armor--; markFeedback(state, note && Math.abs(time - note.at) <= state.hitWindow ? '同じ列を おそう！' : 'まだ早い！ 白い輪まで待とう'); session.sounds.push('pop');
      // A wrong lane consumes this beat, so one mistake never costs two armor.
      if (note && Math.abs(time - note.at) <= state.hitWindow) { note.result = 'miss'; state.resolved++; }
    }
  }
  state.phase = state.resolved >= 8 ? 3 : state.resolved >= 4 ? 2 : 1;
}

/** All countdowns advance from the engine's paused-safe, real-time boss clock. */
export function updateChallengeBossGame(session: RushSession, input: RushInput, dt: number): { result: 'success' | 'failure'; reason: string } | null {
  const game = session.game, state = game?.extra;
  if (!game || state?.pack !== 'challenge-boss') return null;
  if (state.hp <= 0) return { result: 'success', reason: state.id === 'boss-golem' ? 'パネルゴーレム撃破！' : 'ビートクラーケン撃破！' };
  if (state.armor <= 0) return { result: 'failure', reason: state.id === 'boss-golem' ? '上の矢印と同じ向きに、3つの封印をそろえよう' : '音符が白い輪に来たら、同じ列を入力しよう' };
  state.hitFlash = Math.max(0, state.hitFlash - dt); state.feedbackTime = Math.max(0, state.feedbackTime - dt);
  if (state.id === 'boss-golem') updateGolem(session, state, input, dt);
  else updateKraken(session, state, input, dt);
  if (state.armor <= 0) return { result: 'failure', reason: state.id === 'boss-golem' ? '上の矢印と同じ向きに、3つの封印をそろえよう' : '音符が白い輪に来たら、同じ列を入力しよう' };
  if (state.hp <= 0) return { result: 'success', reason: state.id === 'boss-golem' ? 'パネルゴーレム撃破！' : 'ビートクラーケン撃破！' };
  return null;
}
