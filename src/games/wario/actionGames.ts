import type { RushDefinition, RushId, RushInput, RushSession } from './engine';

export type ActionId = 'target' | 'rally' | 'balance' | 'fishing' | 'launch' | 'glide' | 'rhythm' | 'scrub';
type Point = { x: number; y: number };
interface Base { pack: 'action'; id: ActionId }
interface TargetState extends Base { id: 'target'; x: number; y: number; targets: Point[]; count: number; misses: number }
interface RallyState extends Base { id: 'rally'; x: number; ball: Point; vx: number; vy: number; count: number; width: number }
interface BalanceState extends Base { id: 'balance'; angle: number; velocity: number; wind: number; progress: number }
interface FishingState extends Base { id: 'fishing'; x: number; y: number; fishPhase: number; stage: 'aim' | 'drop' | 'reel'; progress: number }
interface LaunchState extends Base { id: 'launch'; x: number; y: number; vx: number; vy: number; charge: number; launched: boolean; target: number }
interface GlideState extends Base { id: 'glide'; y: number; vy: number; gates: { x: number; y: number; passed: boolean }[]; gap: number; count: number }
interface RhythmState extends Base { id: 'rhythm'; beats: number[]; count: number; window: number; lastHit: number }
interface ScrubState extends Base { id: 'scrub'; x: number; y: number; spots: (Point & { clean: number })[]; count: number }
export type ActionState = TargetState | RallyState | BalanceState | FishingState | LaunchState | GlideState | RhythmState | ScrubState;

export const ACTION_GAMES: RushDefinition[] = [
  { id: 'target', name: 'ポップ・シュート', command: '3つの的を うて！', hint: '光る的をタップ / ↑↓←→ でねらって Space。3つ当てよう。', shortHint: '的をタップ / 矢印で照準 ＋ Space', number: '17', category: 'action', color: '#f8c07c' },
  { id: 'rally', name: 'おかえしラリー', command: '3回 うちかえせ！', hint: '指でパドルを動かす / ← →。ボールの下へ先回り！', shortHint: '指でパドルを動かす / ← →', number: '18', category: 'action', color: '#a4dbe8' },
  { id: 'balance', name: 'ぐらぐらケーキ', command: 'バランスを とれ！', hint: '← → / 指を左右へ。ケーキが傾いた反対側へ支えよう。', shortHint: '← → / 指を左右へ。水平をキープ', number: '19', category: 'action', color: '#f5b4d1' },
  { id: 'fishing', name: 'つりあげフィッシュ', command: 'つって 巻きあげろ！', hint: '指 / ← → で魚をねらう。タップ / Space で針を下ろし、そのまま長押しで巻く。', shortHint: '魚をねらう → 押して針 → 長押しで巻く', number: '20', category: 'action', color: '#9fdcd0' },
  { id: 'launch', name: 'チャージ・ロケット', command: '島に とどけ！', hint: 'タップ / Space を長押しでパワーをためる。緑のゾーンで離して発射！', shortHint: '長押しでためる → 緑で離して発射', number: '21', category: 'timing', color: '#c9b5ef' },
  { id: 'glide', name: 'ふわふわグライド', command: '3つのゲートを くぐれ！', hint: 'タップ / Space を長押しで上昇、離すと下降。すき間をぬけよう。', shortHint: '長押しで上昇 / 離すと下降', number: '22', category: 'action', color: '#b9e2a0' },
  { id: 'rhythm', name: 'リズム・スリーヒット', command: 'リズムよく たたけ！', hint: '音符が左の輪に重なる瞬間、タップ / Space。3拍続けよう。', shortHint: '音符が左の輪に重なったら タップ / Space', number: '23', category: 'timing', color: '#ff9db8' },
  { id: 'scrub', name: 'ピカピカ・スクラブ', command: 'よごれを こすれ！', hint: '指を押しながらこする / ↑↓←→ でスポンジを動かす。6つのよごれをピカピカに！', shortHint: '指でこする / ↑↓←→ でスポンジを動かす', number: '24', category: 'action', color: '#f8d94b' },
];

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const success = (reason: string) => ({ result: 'success' as const, reason });
const failure = (reason: string) => ({ result: 'failure' as const, reason });
export const fishingX = (time: number, phase: number) => 320 + Math.sin(time * 1.8 + phase) * 145;
export const launchLandingX = (charge: number) => 105 + (125 + charge * 410) * (640 / 780);

export function createActionState(id: RushId, level: number, random: () => number): ActionState | undefined {
  switch (id) {
    case 'target': return { pack: 'action', id, x: 320, y: 275, count: 0, misses: 0, targets: [{ x: 130 + random() * 65, y: 180 + random() * 70 }, { x: 420 + random() * 65, y: 180 + random() * 70 }, { x: 270 + random() * 100, y: 340 + random() * 25 }] };
    case 'rally': return { pack: 'action', id, x: 320, ball: { x: 260 + random() * 120, y: 190 }, vx: (random() < 0.5 ? -1 : 1) * (100 + random() * 40), vy: 320, count: 0, width: Math.max(100, 130 - level * 3) };
    case 'balance': return { pack: 'action', id, angle: 0, velocity: 0.05, wind: random() * Math.PI * 2, progress: 0 };
    case 'fishing': return { pack: 'action', id, x: 320, y: 145, fishPhase: random() * Math.PI * 2, stage: 'aim', progress: 0 };
    case 'launch': return { pack: 'action', id, x: 105, y: 365, vx: 0, vy: 0, charge: 0, launched: false, target: 420 + random() * 90 };
    case 'glide': return { pack: 'action', id, y: 265, vy: 0, gates: [460, 700, 940].map((x, i) => ({ x, y: 250 + (random() - 0.5) * (i === 1 ? 80 : 50), passed: false })), gap: Math.max(134, 154 - level * 2), count: 0 };
    case 'rhythm': { const start = 0.85 + random() * 0.18; return { pack: 'action', id, beats: [start, start + 0.85, start + 1.7], count: 0, window: Math.max(0.13, 0.18 - level * 0.004), lastHit: -10 }; }
    case 'scrub': return { pack: 'action', id, x: 320, y: 280, spots: [190, 320, 450, 190, 320, 450].map((x, i) => ({ x: x + (random() - 0.5) * 12, y: (i < 3 ? 220 : 335) + (random() - 0.5) * 12, clean: 0 })), count: 0 };
    default: return undefined;
  }
}

function movePoint(state: Point, input: RushInput, dt: number, speed: number) {
  if (input.pointerDown || input.pointerPressed) { state.x = clamp(input.pointerX, 45, 595); state.y = clamp(input.pointerY, 135, 415); }
  else {
    const dx = Number(input.right) - Number(input.left), dy = Number(input.down) - Number(input.up);
    const norm = dx && dy ? Math.SQRT1_2 : 1;
    state.x = clamp(state.x + dx * speed * norm * dt, 45, 595);
    state.y = clamp(state.y + dy * speed * norm * dt, 135, 415);
  }
}

/** dt is already in the microgame's local time. The engine owns the round clock. */
export function updateActionGame(session: RushSession, input: RushInput, dt: number): { result: 'success' | 'failure'; reason: string } | null {
  const game = session.game;
  const a = game?.extra;
  if (!game || a?.pack !== 'action') return null;
  const held = input.actionHeld || input.pointerDown;
  switch (a.id) {
    case 'target': {
      movePoint(a, input, dt, 490);
      if (input.action) {
        const target = a.targets[a.count];
        if (target && Math.hypot(a.x - target.x, a.y - target.y) <= 40) { a.count++; session.sounds.push('pop'); }
        else { a.misses++; if (a.misses >= 3) return failure('光っている的に 照準を合わせよう'); }
      }
      if (a.count === a.targets.length) return success('3発命中！ ナイスシュート！');
      break;
    }
    case 'rally': {
      a.x = input.pointerDown ? clamp(input.pointerX, 65, 575) : clamp(a.x + (Number(input.right) - Number(input.left)) * 610 * dt, 65, 575);
      const previousY = a.ball.y;
      a.ball.x += a.vx * dt; a.ball.y += a.vy * dt;
      if (a.ball.x < 65) { a.ball.x = 130 - a.ball.x; a.vx = Math.abs(a.vx); }
      if (a.ball.x > 575) { a.ball.x = 1150 - a.ball.x; a.vx = -Math.abs(a.vx); }
      if (a.ball.y < 142) { a.ball.y = 284 - a.ball.y; a.vy = Math.abs(a.vy); }
      if (a.vy > 0 && previousY < 374 && a.ball.y >= 374) {
        if (Math.abs(a.ball.x - a.x) > a.width / 2 + 9) return failure('ボールの下に パドルを動かそう');
        a.ball.y = 748 - a.ball.y; a.vy = -320; a.count++; session.sounds.push('pop');
        if (a.count >= 3) return success('3ラリー！ おみごと！');
      }
      break;
    }
    case 'balance': {
      const control = input.pointerDown ? clamp((input.pointerX - 320) / 130, -1, 1) : Number(input.right) - Number(input.left);
      const wind = 0.5 + Math.sin(game.time * 2.8 + a.wind) * 0.48;
      a.velocity = a.velocity * Math.exp(-2 * dt) + (wind + control * 2.4) * dt;
      a.angle += a.velocity * dt;
      if (Math.abs(a.angle) > 0.5) return failure('傾いたら 反対側を支えよう');
      a.progress = clamp(game.time / 4.1, 0, 1);
      if (a.progress >= 1) return success('水平キープ！ ケーキも無事！');
      break;
    }
    case 'fishing': {
      if (a.stage === 'aim') {
        a.x = input.pointerDown || input.pointerPressed ? clamp(input.pointerX, 75, 565) : clamp(a.x + (Number(input.right) - Number(input.left)) * 440 * dt, 75, 565);
        if (input.action) { a.stage = 'drop'; session.sounds.push('pop'); }
      } else if (a.stage === 'drop') {
        a.y += 510 * dt;
        if (a.y >= 310) {
          a.y = 310;
          if (Math.abs(a.x - fishingX(game.time, a.fishPhase)) <= 56) { a.stage = 'reel'; session.sounds.push('pop'); }
          else { a.stage = 'aim'; a.y = 145; }
        }
      } else {
        if (held) { a.progress = Math.min(1, a.progress + dt * 1.45); a.y = 310 - a.progress * 165; }
        if (a.progress >= 1) return success('大漁！ つりあげた！');
      }
      break;
    }
    case 'launch': {
      if (!a.launched) {
        if (held) a.charge = clamp(a.charge + dt * 0.78, 0, 1);
        if (input.actionReleased && a.charge > 0) { a.launched = true; a.vx = 125 + a.charge * 410; a.vy = -320; session.sounds.push('pop'); }
      } else {
        const oldX = a.x, oldY = a.y;
        a.x += a.vx * dt; a.y += a.vy * dt + 390 * dt * dt; a.vy += 780 * dt;
        if (a.y >= 365 && a.vy > 0) {
          // Interpolate the landing crossing so results do not depend on frame rate.
          const landing = oldX + (a.x - oldX) * clamp((365 - oldY) / (a.y - oldY), 0, 1);
          a.x = landing; a.y = 365;
          return Math.abs(landing - a.target) <= 40 ? success('着地成功！ ぴったり届いた！') : failure('パワーを緑のゾーンまで ためて離そう');
        }
      }
      break;
    }
    case 'glide': {
      a.vy = clamp(a.vy + (held ? -720 : 600) * dt, -210, 210); a.y += a.vy * dt;
      if (a.y < 130 || a.y > 409) return failure('長押しと離す操作で 高さを調整しよう');
      for (const gate of a.gates) {
        const x = gate.x - game.time * 220;
        if (Math.abs(x - 130) < 37 && Math.abs(a.y - gate.y) > a.gap / 2 - 15) return failure('ゲートのすき間に 高さを合わせよう');
        if (!gate.passed && x < 93) { gate.passed = true; a.count++; session.sounds.push('pop'); }
      }
      if (a.count === 3) return success('すいすい！ 全ゲート突破！');
      break;
    }
    case 'rhythm': {
      const beat = a.beats[a.count];
      if (input.action) {
        if (Math.abs(game.time - beat) > a.window) return failure('音符が左の輪に 重なる瞬間に！');
        a.count++; a.lastHit = game.time; session.sounds.push('pop');
        if (a.count === 3) return success('パーフェクト！ いいリズム！');
      } else if (game.time > beat + a.window) return failure('3つの音符を リズムよくたたこう');
      break;
    }
    case 'scrub': {
      const previous = { x: a.x, y: a.y };
      movePoint(a, input, dt, 520);
      const moving = Math.hypot(a.x - previous.x, a.y - previous.y) > 0.4;
      if (moving) {
        for (const spot of a.spots) {
          if (spot.clean >= 1 || Math.hypot(a.x - spot.x, a.y - spot.y) > 44) continue;
          spot.clean = Math.min(1, spot.clean + dt * 6);
          if (spot.clean >= 1) { a.count++; session.sounds.push('pop'); }
        }
      }
      if (a.count === a.spots.length) return success('ピカピカ！ おそうじ名人！');
      break;
    }
  }
  return null;
}
