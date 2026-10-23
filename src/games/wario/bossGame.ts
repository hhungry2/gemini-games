import type { RushDefinition, RushInput, RushSession } from './engine';

export type BossId = 'boss';
export const BOSS_DURATION = 20;
export const BOSS_GAME: RushDefinition = {
  id: 'boss', number: 'B', category: 'action', name: 'ギアキング', command: 'ボスを たおせ！',
  hint: '← → / 指を左右に動かして赤い予告をよけよう。Space / 画面を長押しで連射。盾が開いたコアをねらえ！',
  shortHint: '左右でよける ＋ 長押しで連射。盾が開いたら攻撃！', color: '#f5bd58',
  variations: [
    { name: '標準レーザー' },
    { name: '逆回りレーザー', hint: '逆回りに移動するギアキング。← → / 指で赤い予告をよけ、長押し連射で開いたコアを撃とう。', shortHint: '逆回りの砲台！ 左右で回避 ＋ 長押し連射' },
    { name: 'ダブルレーザー', hint: '最初から2本のレーザーが来る。安全な1列に移動し、開いたコアを長押し連射で攻撃！', shortHint: '安全な1列へ移動 ＋ 長押しでコアを攻撃' },
  ],
};

export interface BossShot { x: number; y: number }
export interface BossParticle { x: number; y: number; vx: number; vy: number; life: number; color: string }
export interface BossState {
  pack: 'boss';
  id: 'boss';
  variation: number;
  laneOrder: number[];
  hp: number;
  maxHp: number;
  phase: 1 | 2 | 3;
  tier: number;
  playerX: number;
  playerY: number;
  bossX: number;
  bossY: number;
  armor: number;
  maxArmor: number;
  invulnerable: number;
  bossHit: number;
  shooting: boolean;
  cycle: number;
  stage: 'warning' | 'strike' | 'open';
  stageTime: number;
  stageDuration: number;
  dangerLanes: number[];
  targetLane: number;
  shots: BossShot[];
  particles: BossParticle[];
  damageThisOpening: number;
  shotCooldown: number;
}

const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
export const bossLaneX = (lane: number) => 160 + lane * 160;
const approach = (value: number, target: number, distance: number) => value + clamp(target - value, -distance, distance);
const warningDuration = (tier: number, phase = 1) => Math.max(1, 1.25 - (tier - 1) * 0.075 - (phase === 3 ? 0.1 : 0));

export function createBossState(level: number, variation = 0, random: () => number = () => 0.5): BossState {
  const tier = clamp(Math.floor(Number.isFinite(level) ? level : 1), 1, 3);
  const selected = clamp(Math.floor(variation), 0, 2);
  const laneOrder = selected === 0 ? [0, 2, 1] : selected === 1 ? [2, 0, 1] : Array.from({ length: 9 }, () => Math.floor(random() * 3));
  if (selected === 2) for (let index = 1; index < laneOrder.length; index++) if (laneOrder[index] === laneOrder[index - 1]) laneOrder[index] = (laneOrder[index] + 1) % 3;
  const targetLane = laneOrder[0];
  return {
    pack: 'boss', id: 'boss', variation: selected, laneOrder, hp: 18, maxHp: 18, phase: 1, tier,
    playerX: 320, playerY: 393, bossX: 320, bossY: 205,
    armor: 3, maxArmor: 3, invulnerable: 0, bossHit: 0, shooting: false,
    cycle: 0, stage: 'warning', stageTime: 0, stageDuration: warningDuration(tier),
    dangerLanes: selected === 2 ? [0, 1, 2].filter(lane => lane !== targetLane) : [(targetLane + (selected === 1 ? 2 : 1)) % 3], targetLane, shots: [], particles: [], damageThisOpening: 0, shotCooldown: 0,
  };
}

function sparks(state: BossState, x: number, y: number, color: string, count = 8) {
  for (let index = 0; index < count; index++) {
    const angle = index / count * Math.PI * 2;
    state.particles.push({ x, y, vx: Math.cos(angle) * 90, vy: Math.sin(angle) * 90, life: 0.3, color });
  }
}

function advanceAttack(state: BossState) {
  if (state.stage === 'warning') {
    state.stage = 'strike'; state.stageDuration = 0.5;
  } else if (state.stage === 'strike') {
    state.stage = 'open'; state.stageDuration = state.phase === 3 ? 1.5 : 1.7; state.damageThisOpening = 0;
  } else {
    state.cycle++;
    state.targetLane = state.laneOrder[state.cycle % state.laneOrder.length];
    state.dangerLanes = state.phase === 1 && state.variation !== 2
      ? [(state.targetLane + (state.variation === 1 ? 2 : 1)) % 3]
      : [0, 1, 2].filter(lane => lane !== state.targetLane);
    state.stage = 'warning'; state.stageDuration = warningDuration(state.tier, state.phase);
  }
}

/** Boss time is real time, independent of the microgame rush multiplier. */
export function updateBossGame(session: RushSession, input: RushInput, dt: number): { result: 'success' | 'failure'; reason: string } | null {
  const game = session.game, state = game?.extra;
  if (!game || state?.pack !== 'boss') return null;
  if (state.hp <= 0) return { result: 'success', reason: 'ギアキング撃破！' };
  if (state.armor <= 0) return { result: 'failure', reason: '赤い予告の外へ移動して、盾が開いたら攻撃しよう' };

  state.invulnerable = Math.max(0, state.invulnerable - dt);
  state.bossHit = Math.max(0, state.bossHit - dt);
  state.shotCooldown = Math.max(0, state.shotCooldown - dt);
  state.shooting = input.actionHeld || input.pointerDown;
  if (input.pointerDown) state.playerX = approach(state.playerX, clamp(input.pointerX, 58, 582), 440 * dt);
  else state.playerX = clamp(state.playerX + (Number(input.right) - Number(input.left)) * 440 * dt, 58, 582);
  state.bossX = approach(state.bossX, bossLaneX(state.targetLane), 500 * dt);

  state.stageTime += dt;
  while (state.stageTime >= state.stageDuration) {
    state.stageTime -= state.stageDuration;
    advanceAttack(state);
  }

  if (state.stage === 'strike' && state.invulnerable === 0
    && state.dangerLanes.some(lane => Math.abs(state.playerX - bossLaneX(lane)) < 80)) {
    state.armor--;
    state.invulnerable = 0.9;
    sparks(state, state.playerX, state.playerY, '#ff6b6b', 12);
    session.sounds.push('pop');
    if (state.armor === 0) return { result: 'failure', reason: '赤い予告の外へ移動して、盾が開いたら攻撃しよう' };
  }

  if (state.shooting && state.shotCooldown === 0) {
    state.shots.push({ x: state.playerX, y: state.playerY - 18 });
    state.shotCooldown = 0.23;
  }
  const remaining: BossShot[] = [];
  for (const shot of state.shots) {
    const previousY = shot.y;
    shot.y -= 620 * dt;
    if (previousY >= state.bossY - 15 && shot.y <= state.bossY + 15 && Math.abs(shot.x - state.bossX) < 46) {
      if (state.stage === 'open' && state.damageThisOpening < 5) {
        state.hp = Math.max(0, state.hp - 1); state.damageThisOpening++; state.bossHit = 0.12;
        state.phase = state.hp <= 6 ? 3 : state.hp <= 12 ? 2 : 1;
        sparks(state, shot.x, state.bossY, '#ffe27a');
        session.sounds.push('pop');
      } else sparks(state, shot.x, state.bossY + 22, '#8ee4eb', 4);
    } else if (shot.y > 122) remaining.push(shot);
  }
  state.shots = remaining;
  for (const particle of state.particles) {
    particle.x += particle.vx * dt; particle.y += particle.vy * dt; particle.life -= dt;
  }
  state.particles = state.particles.filter(particle => particle.life > 0);
  if (state.hp === 0) return { result: 'success', reason: 'ギアキング撃破！' };
  return null;
}
