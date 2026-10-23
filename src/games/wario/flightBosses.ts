import type { RushDefinition, RushId, RushInput, RushSession } from './engine';

export type FlightBossId = 'boss-dragon' | 'boss-slime';
export const FLIGHT_BOSSES: RushDefinition[] = [
  {
    id: 'boss-dragon', number: 'B2', category: 'action', name: '天空竜ドラグーン', command: '光のリングを 6つ くぐれ！', color: '#92dce7',
    shortHint: '↑ ↓ / 指を上下に動かす。光の輪を6つくぐろう',
    hint: '↑ ↓ / 指を上下に動かして飛ぼう。竜のブレスのすき間にある光の輪を6つくぐると撃破！ 3回ぶつかると失敗。',
    variations: [
      { name: '天空のジグザグ' },
      { name: 'ゆらゆら気流', command: '動くリングを 6つ くぐれ！', shortHint: '↑ ↓ / 指で上下。動く輪の中心を追いかけよう', hint: '↑ ↓ / 指で上下に飛行。上下にゆれる光の輪を6つくぐろう。輪の動きを見ながら中心へ！' },
      { name: 'チャージ・ストーム', command: 'ためて リングを くぐれ！', shortHint: '上下に飛行 ＋ Space / 画面長押しでチャージ', hint: '↑ ↓ / 指で上下に飛行し、Space / 画面を長押しして力をためよう。チャージした状態で金色の輪を6つくぐれ！' },
    ],
  },
  {
    id: 'boss-slime', number: 'B3', category: 'action', name: 'スライムクイーン', command: 'ボールを うちかえせ！', color: '#d4b0f4',
    shortHint: '← → / 指でパドルを動かす。8回うちかえして撃破！',
    hint: '← → / 指を左右に動かしてパドルを操作。落ちてくる光のボールを8回うちかえそう。3回落とすと失敗！',
    variations: [
      { name: 'ぷるぷるラリー' },
      { name: 'いたずら横風', command: '曲がるボールを かえせ！', shortHint: '← → / 指でパドル移動。横風で曲がる球を追おう', hint: '← → / 指でパドルを動かそう。横風でボールが曲がる！ ボールを見て追いかけ、8回うちかえそう。' },
      { name: 'ゼリー・バンパー', command: 'バンパーに まけるな！', shortHint: '← → / 指でパドル移動。ゼリーに当たると横にはねる', hint: '← → / 指でパドルを動かそう。中央のゼリーに当たるとボールが横へはねる。落とさず8回うちかえして撃破！' },
    ],
  },
];

interface FlightParticle { x: number; y: number; vx: number; vy: number; life: number; color: string }
interface FlightBossBase {
  pack: 'flight-boss'; variation: number; tier: number; phase: 1 | 2 | 3;
  hp: number; maxHp: number; armor: number; maxArmor: number; inputSeen: boolean;
  hit: number; hurt: number; particles: FlightParticle[];
}
export interface DragonGate { x: number; y: number; baseY: number; wave: number; passed: boolean; collected: boolean }
export interface DragonBossState extends FlightBossBase {
  id: 'boss-dragon'; playerX: number; playerY: number; speed: number; aperture: number;
  gates: DragonGate[]; collected: number; needed: number; charge: number;
}
export interface SlimeBossState extends FlightBossBase {
  id: 'boss-slime'; paddleX: number; paddleY: number; paddleWidth: number;
  ballX: number; ballY: number; ballVx: number; ballVy: number;
  returnCount: number; rally: number; serveDelay: number; bumperCooldown: number;
  wind: number; routeOffset: number;
}
export type FlightBossState = DragonBossState | SlimeBossState;

const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
const approach = (value: number, target: number, distance: number) => value + clamp(target - value, -distance, distance);
const phaseFor = (hp: number, max: number): 1 | 2 | 3 => hp <= max / 3 ? 3 : hp <= max * 2 / 3 ? 2 : 1;

/** Independent arenas use real seconds; the shared engine owns the 20 second clock. */
export function createFlightBossState(id: RushId, level: number, variation = 0, random: () => number = () => 0.5): FlightBossState | undefined {
  if (id !== 'boss-dragon' && id !== 'boss-slime') return undefined;
  const tier = clamp(Math.floor(Number.isFinite(level) ? level : 1), 1, 3);
  const selected = clamp(Math.floor(Number.isFinite(variation) ? variation : 0), 0, 2);
  const base = { pack: 'flight-boss' as const, variation: selected, tier, phase: 1 as const, armor: 3, maxArmor: 3, inputSeen: false, hit: 0, hurt: 0, particles: [] };
  if (id === 'boss-dragon') {
    const offset = (clamp(random(), 0, 1) - 0.5) * 16;
    const route = selected === 2 ? [358, 197, 333, 213, 364, 232, 326, 190] : [203, 354, 235, 365, 188, 328, 219, 351];
    return { ...base, id, hp: 6, maxHp: 6, playerX: 155, playerY: 282, speed: 132 + (tier - 1) * 7 + (selected === 2 ? 10 : 0), aperture: tier === 3 ? 42 : 46,
      gates: route.map((y, index) => ({ x: 595 + index * 250, y: y + offset, baseY: y + offset, wave: index * 1.31 + random() * 0.4, passed: false, collected: false })), collected: 0, needed: 6, charge: 0 };
  }
  return { ...base, id, hp: 8, maxHp: 8, paddleX: 320, paddleY: 393, paddleWidth: tier === 3 ? 108 : 116,
    ballX: 176 + random() * 20, ballY: 271, ballVx: 150, ballVy: 245 + tier * 8,
    returnCount: 0, rally: 0, serveDelay: 0.6, bumperCooldown: 0, wind: 0, routeOffset: Math.floor(random() * 5) };
}

function sparks(state: FlightBossState, x: number, y: number, color: string) {
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4;
    state.particles.push({ x, y, vx: Math.cos(angle) * 75, vy: Math.sin(angle) * 75, life: 0.4, color });
  }
}

function updateDragon(session: RushSession, state: DragonBossState, input: RushInput, dt: number) {
  const game = session.game!;
  if (input.pointerDown) {
    state.inputSeen = true;
    state.playerY = approach(state.playerY, clamp(input.pointerY, 170, 391), dt * 350);
  } else {
    const direction = Number(input.down) - Number(input.up);
    if (direction) state.inputSeen = true;
    state.playerY = clamp(state.playerY + direction * 350 * dt, 170, 391);
  }
  state.charge = clamp(state.charge + (input.actionHeld || input.pointerDown ? 1.8 : -0.7) * dt, 0, 1);
  for (const gate of state.gates) {
    const previousX = gate.x;
    gate.x -= state.speed * dt;
    gate.y = gate.baseY + (state.variation === 1 ? Math.sin(game.time * 1.8 + gate.wave) * 25 : 0);
    if (!gate.passed && previousX > state.playerX && gate.x <= state.playerX) {
      gate.passed = true;
      if (state.inputSeen && Math.abs(state.playerY - gate.y) <= state.aperture && (state.variation !== 2 || state.charge >= 0.5)) {
        gate.collected = true; state.collected++; state.hp = Math.max(0, state.needed - state.collected); state.phase = phaseFor(state.hp, state.maxHp); state.hit = 0.35;
        if (state.variation === 2) state.charge = Math.max(0, state.charge - 0.3);
        sparks(state, state.playerX, state.playerY, '#ffe47b'); session.sounds.push('pop');
      } else {
        state.armor--; state.hurt = 0.65; sparks(state, state.playerX, state.playerY, '#ff8ca0'); session.sounds.push('pop');
      }
    }
  }
  if (state.hp === 0) return { result: 'success' as const, reason: '光の力で天空竜ドラグーンをしずめた！' };
  if (state.armor <= 0) return { result: 'failure' as const, reason: state.variation === 2 ? '長押しでチャージして、金色の輪の中心をくぐろう' : '上下に飛んで、光の輪の中心へ移動しよう' };
  return null;
}

function serveSlime(state: SlimeBossState) {
  state.ballX = state.rally % 2 ? 454 : 186;
  state.ballY = 245;
  state.ballVx = state.rally % 2 ? -155 : 155;
  state.ballVy = 245 + state.tier * 8;
  state.serveDelay = 0.55; state.bumperCooldown = 0;
}

function updateSlime(session: RushSession, state: SlimeBossState, input: RushInput, dt: number) {
  const game = session.game!;
  if (input.pointerDown) {
    state.inputSeen = true;
    state.paddleX = approach(state.paddleX, clamp(input.pointerX, 54 + state.paddleWidth / 2, 586 - state.paddleWidth / 2), dt * 610);
  } else {
    const direction = Number(input.right) - Number(input.left);
    if (direction) state.inputSeen = true;
    state.paddleX = clamp(state.paddleX + direction * dt * 610, 54 + state.paddleWidth / 2, 586 - state.paddleWidth / 2);
  }
  state.bumperCooldown = Math.max(0, state.bumperCooldown - dt);
  state.wind = state.variation === 1 ? Math.sin(game.time * 1.7) * 105 : 0;
  if (state.serveDelay > 0) { state.serveDelay = Math.max(0, state.serveDelay - dt); return null; }
  const oldY = state.ballY;
  state.ballVx = clamp(state.ballVx + state.wind * dt, -295, 295);
  state.ballX += state.ballVx * dt; state.ballY += state.ballVy * dt;
  if (state.ballX < 62) { state.ballX = 124 - state.ballX; state.ballVx = Math.abs(state.ballVx); }
  if (state.ballX > 578) { state.ballX = 1156 - state.ballX; state.ballVx = -Math.abs(state.ballVx); }
  if (state.variation === 2 && state.bumperCooldown === 0) {
    for (const x of [221, 419]) if (Math.hypot(state.ballX - x, state.ballY - 289) < 31) {
      state.ballVx = (state.ballX < x ? -1 : 1) * Math.min(290, Math.abs(state.ballVx) + 65);
      state.ballX += Math.sign(state.ballVx) * 9; state.bumperCooldown = 0.22;
      sparks(state, x, 289, '#b5f0d3'); session.sounds.push('pop'); break;
    }
  }
  const paddleSurface = state.paddleY - 15;
  if (state.ballVy > 0 && oldY <= paddleSurface && state.ballY >= paddleSurface && state.inputSeen
    && Math.abs(state.ballX - state.paddleX) <= state.paddleWidth / 2 + 8) {
    state.ballY = paddleSurface - (state.ballY - paddleSurface);
    state.ballVy = -(285 + state.tier * 12 + state.phase * 9);
    const offset = (state.ballX - state.paddleX) / (state.paddleWidth / 2);
    state.ballVx = clamp(state.ballVx * 0.5 + offset * 105, -260, 260);
    sparks(state, state.ballX, paddleSurface, '#ffe47b'); session.sounds.push('pop');
  }
  if (state.ballVy < 0 && state.ballY <= 210) {
    state.ballY = 420 - state.ballY; state.hp = Math.max(0, state.hp - 1); state.returnCount++; state.hit = 0.3;
    state.phase = phaseFor(state.hp, state.maxHp);
    const routes = [155, -184, 205, -165, 180, -210, 145, -190];
    state.ballVx = routes[(state.returnCount + state.routeOffset) % routes.length];
    state.ballVy = 265 + state.tier * 10 + state.phase * 10;
    sparks(state, state.ballX, 209, '#e0bbff'); session.sounds.push('pop');
  }
  if (state.ballY > 434) {
    state.armor--; state.hurt = 0.65; state.rally++; session.sounds.push('pop');
    if (state.armor > 0) serveSlime(state);
  }
  if (state.hp === 0) return { result: 'success' as const, reason: '8連打でスライムクイーンを撃破！' };
  if (state.armor <= 0) return { result: 'failure' as const, reason: 'ボールの真下へパドルを動かそう。左右の壁でもはね返るよ' };
  return null;
}

export function updateFlightBossGame(session: RushSession, input: RushInput, dt: number): { result: 'success' | 'failure'; reason: string } | null {
  const state = session.game?.extra;
  if (state?.pack !== 'flight-boss') return null;
  if (state.hp <= 0) return { result: 'success', reason: state.id === 'boss-dragon' ? '天空竜ドラグーン撃破！' : 'スライムクイーン撃破！' };
  if (state.armor <= 0) return { result: 'failure', reason: '装甲がなくなった！ 動きを見てよけよう' };
  state.hit = Math.max(0, state.hit - dt); state.hurt = Math.max(0, state.hurt - dt);
  for (const particle of state.particles) { particle.x += particle.vx * dt; particle.y += particle.vy * dt; particle.life -= dt; }
  state.particles = state.particles.filter(particle => particle.life > 0);
  return state.id === 'boss-dragon' ? updateDragon(session, state, input, dt) : updateSlime(session, state, input, dt);
}
