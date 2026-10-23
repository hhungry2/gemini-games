import type { RushDefinition, RushId, RushInput, RushSession } from './engine';

export type ActionId = 'target' | 'rally' | 'balance' | 'fishing' | 'launch' | 'glide' | 'rhythm' | 'scrub';
type Point = { x: number; y: number };
interface Base { pack: 'action'; id: ActionId; variation: number }
interface TargetState extends Base { id: 'target'; x: number; y: number; targets: Point[]; anchors: Point[]; count: number; misses: number }
interface RallyState extends Base { id: 'rally'; x: number; ball: Point; vx: number; vy: number; count: number; width: number; ceiling: number; speed: number }
interface BalanceState extends Base { id: 'balance'; angle: number; velocity: number; wind: number; progress: number; steered: boolean }
interface FishingState extends Base { id: 'fishing'; x: number; y: number; fishPhase: number; stage: 'aim' | 'drop' | 'reel'; progress: number; depth: number }
interface LaunchState extends Base { id: 'launch'; x: number; y: number; vx: number; vy: number; charge: number; launched: boolean; target: number; origin: number; direction: number }
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

const actionVariations: Record<ActionId, NonNullable<RushDefinition['variations']>> = {
  target: [
    { name: 'さんかくターゲット' },
    { name: '四すみターゲット', command: '4つの的を うて！', hint: '四すみの光る的を順番にタップ / 矢印でねらって Space。4発当てよう。', shortHint: '光る的を順番に4つ タップ / 矢印 ＋ Space' },
    { name: 'ゆらゆらターゲット', command: '動く的を うて！', hint: '上下左右に動く的を追いかけ、光った的から3発当てよう。タップ / 矢印 ＋ Space。', shortHint: 'ゆれる光る的を追いかけて タップ / 矢印 ＋ Space' },
  ],
  rally: [
    { name: 'いつものラリー' },
    { name: 'ななめラリー', command: 'ななめ球を うちかえせ！', hint: '左右によくはねるボール！ 指 / ← → でパドルを先回りさせ、3回返そう。', shortHint: '斜めにはねる球の下へ 指 / ← →' },
    { name: 'ハイテンポラリー', command: '速い球を うちかえせ！', hint: '上の壁が低く、球の往復も速い！ 指 / ← → で追いかけ、3回返そう。', shortHint: '短いコートの速い球を3回返す / 指・← →' },
  ],
  balance: [
    { name: '右風ケーキ' },
    { name: '左風ケーキ', command: '左風から まもれ！', hint: '左へ傾くケーキを、指 / ← → で支えよう。反対側へ細かく調整！', shortHint: '左風に負けず 指 / ← → で水平をキープ' },
    { name: '突風ケーキ', command: '突風でも たもて！', hint: '強さの変わる突風！ 指 / ← → で傾いた反対側を支え、水平を保とう。', shortHint: '風が変わる！ 指 / ← → で細かく支える' },
  ],
  fishing: [
    { name: 'ゆったりフィッシュ' },
    { name: 'すばやいフィッシュ', command: '速い魚を つれ！', hint: 'すばやく泳ぐ魚の進む先をねらう。指 / ← →、タップ / Space で針、そのまま長押しで巻く。', shortHint: '速い魚を先回り → 押して針 → 長押し' },
    { name: '深場フィッシュ', command: '深い魚を つれ！', hint: '魚は深い水底。針が届く時間を読んで指 / ← → でねらい、タップ / Space、長押しで巻く。', shortHint: '深い魚の先をねらう → 押して針 → 長押し' },
  ],
  launch: [
    { name: '遠くの島' },
    { name: '近くの島', command: '近くの島に とどけ！', hint: '島はすぐ近く！ タップ / Space を短くため、緑のゾーンで離そう。ためすぎに注意。', shortHint: '短めに長押し → 緑で離す' },
    { name: '反対の島', command: '左の島へ とどけ！', hint: '今度は右から左へ発射！ タップ / Space を長押し、緑で離して左の島へ着地しよう。', shortHint: '右から左へ発射！ 長押し → 緑で離す' },
  ],
  glide: [
    { name: 'まっすぐゲート' },
    { name: 'でこぼこゲート', command: '上下のすき間を ぬけろ！', hint: 'ゲートが上・下・上に並ぶ！ タップ / Space を長押しで上昇、離して下降。', shortHint: '上下のゲートへ 長押しで上昇 / 離して下降' },
    { name: 'ゆれるゲート', command: 'ゆれるすき間を ぬけろ！', hint: 'すき間が上下に動く！ タップ / Space の長押しと離す操作で、通る瞬間の高さに合わせよう。', shortHint: '動くすき間へ 長押しで上昇 / 離して下降' },
  ],
  rhythm: [
    { name: '等間隔リズム' },
    { name: 'タタ・タン', hint: '最初の2拍は短く、次はひと呼吸！ 音符が左の輪に重なったらタップ / Space。', shortHint: '短い間隔 → 長い間隔 / タップ・Space' },
    { name: 'タン・タタ', hint: '最初はゆっくり、最後の2拍はすばやく！ 音符が左の輪に重なったらタップ / Space。', shortHint: '長い間隔 → 短い間隔 / タップ・Space' },
  ],
  scrub: [
    { name: '窓そうじ' },
    { name: 'ななめよごれ', command: 'ななめのよごれを こすれ！', hint: '斜めに並んだ6つのよごれ。指を押してこする / 矢印でスポンジを動かし、端から順にきれいに！', shortHint: '斜めの6つをこする / 指・矢印' },
    { name: 'しつこいよごれ', command: 'しつこいよごれを おとせ！', hint: '5つのしつこいよごれを、少し長めに往復してこすろう。指を押して動かす / 矢印。', shortHint: '5つのよごれを長めに往復 / 指・矢印' },
  ],
};
for (const definition of ACTION_GAMES) definition.variations = actionVariations[definition.id as ActionId];

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const success = (reason: string) => ({ result: 'success' as const, reason });
const failure = (reason: string) => ({ result: 'failure' as const, reason });
export const fishingX = (time: number, phase: number, variation = 0) => 320 + Math.sin(time * [1.8, 2.65, 1.3][variation] + phase) * [145, 160, 95][variation];
export const launchLandingX = (charge: number, variation = 0) => (variation === 2 ? 535 : 105) + (variation === 2 ? -1 : 1) * (125 + charge * 410) * (640 / 780);
export const glideGateY = (gate: Point, time: number, variation = 0) => gate.y + (variation === 2 ? Math.sin(time * 2.2 + gate.x * 0.008) * 26 : 0);
export const balanceWind = (time: number, phase: number, variation = 0) => variation === 1 ? -0.62 + Math.sin(time * 2.2 + phase) * 0.55 : variation === 2 ? 0.6 + Math.sin(time * 5 + phase) * 0.85 : 0.5 + Math.sin(time * 2.8 + phase) * 0.48;

export function createActionState(id: RushId, level: number, random: () => number, variation = 0): ActionState | undefined {
  const variant = clamp(Math.floor(variation), 0, 2);
  switch (id) {
    case 'target': {
      const points = variant === 1 ? [{ x: 175, y: 210 }, { x: 465, y: 210 }, { x: 465, y: 340 }, { x: 175, y: 340 }] : [{ x: 130 + random() * 65, y: 180 + random() * 70 }, { x: 420 + random() * 65, y: 180 + random() * 70 }, { x: 270 + random() * 100, y: 340 + random() * 25 }];
      return { pack: 'action', id, variation: variant, x: 320, y: 275, count: 0, misses: 0, targets: points.map(point => ({ ...point })), anchors: points };
    }
    case 'rally': return { pack: 'action', id, variation: variant, x: 320, ball: { x: 260 + random() * 120, y: 190 }, vx: (random() < 0.5 ? -1 : 1) * (variant === 0 ? 100 + random() * 40 : 200 + random() * 40), vy: [320, 360, 410][variant], count: 0, width: Math.max(100, 130 - level * 3), ceiling: variant === 2 ? 178 : 142, speed: [320, 360, 410][variant] };
    case 'balance': return { pack: 'action', id, variation: variant, angle: 0, velocity: 0.05, wind: random() * Math.PI * 2, progress: 0, steered: false };
    case 'fishing': return { pack: 'action', id, variation: variant, x: 320, y: 145, fishPhase: random() * Math.PI * 2, stage: 'aim', progress: 0, depth: variant === 2 ? 360 : 310 };
    case 'launch': { const origin = variant === 2 ? 535 : 105; return { pack: 'action', id, variation: variant, x: origin, y: 365, vx: 0, vy: 0, charge: 0, launched: false, target: variant === 1 ? 280 + random() * 65 : variant === 2 ? 140 + random() * 90 : 420 + random() * 90, origin, direction: variant === 2 ? -1 : 1 }; }
    case 'glide': return { pack: 'action', id, variation: variant, y: 265, vy: 0, gates: [460, 700, 940].map((x, i) => ({ x, y: variant === 1 ? [215, 310, 225][i] + (random() - 0.5) * 14 : variant === 2 ? 260 + (random() - 0.5) * 60 : 250 + (random() - 0.5) * (i === 1 ? 80 : 50), passed: false })), gap: Math.max(134, 154 - level * 2), count: 0 };
    case 'rhythm': { const start = 0.85 + random() * 0.18; const intervals = variant === 1 ? [0.5, 1.2] : variant === 2 ? [1.2, 0.5] : [0.85, 0.85]; return { pack: 'action', id, variation: variant, beats: [start, start + intervals[0], start + intervals[0] + intervals[1]], count: 0, window: Math.max(0.13, 0.18 - level * 0.004), lastHit: -10 }; }
    case 'scrub': {
      const points = variant === 1 ? [{ x: 170, y: 210 }, { x: 230, y: 250 }, { x: 290, y: 290 }, { x: 350, y: 330 }, { x: 410, y: 290 }, { x: 470, y: 250 }] : variant === 2 ? [{ x: 175, y: 215 }, { x: 430, y: 215 }, { x: 300, y: 280 }, { x: 185, y: 340 }, { x: 445, y: 340 }] : [190, 320, 450, 190, 320, 450].map((x, i) => ({ x: x + (random() - 0.5) * 12, y: (i < 3 ? 220 : 335) + (random() - 0.5) * 12 }));
      return { pack: 'action', id, variation: variant, x: 320, y: 280, spots: points.map(point => ({ ...point, clean: 0 })), count: 0 };
    }
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
      if (a.variation === 2) for (let i = 0; i < a.targets.length; i++) {
        a.targets[i].x = a.anchors[i].x + Math.sin(game.time * 2.8 + i * 1.6) * 23;
        a.targets[i].y = a.anchors[i].y + Math.cos(game.time * 2.2 + i) * 16;
      }
      movePoint(a, input, dt, 490);
      if (input.action) {
        const target = a.targets[a.count];
        if (target && Math.hypot(a.x - target.x, a.y - target.y) <= 40) { a.count++; session.sounds.push('pop'); }
        else { a.misses++; if (a.misses >= 3) return failure('光っている的に 照準を合わせよう'); }
      }
      if (a.count === a.targets.length) return success(`${a.targets.length}発命中！ ナイスシュート！`);
      break;
    }
    case 'rally': {
      a.x = input.pointerDown ? clamp(input.pointerX, 65, 575) : clamp(a.x + (Number(input.right) - Number(input.left)) * 610 * dt, 65, 575);
      const previousY = a.ball.y;
      a.ball.x += a.vx * dt; a.ball.y += a.vy * dt;
      if (a.ball.x < 65) { a.ball.x = 130 - a.ball.x; a.vx = Math.abs(a.vx); }
      if (a.ball.x > 575) { a.ball.x = 1150 - a.ball.x; a.vx = -Math.abs(a.vx); }
      if (a.ball.y < a.ceiling) { a.ball.y = a.ceiling * 2 - a.ball.y; a.vy = Math.abs(a.vy); }
      if (a.vy > 0 && previousY < 374 && a.ball.y >= 374) {
        if (Math.abs(a.ball.x - a.x) > a.width / 2 + 9) return failure('ボールの下に パドルを動かそう');
        a.ball.y = 748 - a.ball.y; a.vy = -a.speed; a.count++; session.sounds.push('pop');
        if (a.count >= 3) return success('3ラリー！ おみごと！');
      }
      break;
    }
    case 'balance': {
      const control = input.pointerDown ? clamp((input.pointerX - 320) / 130, -1, 1) : Number(input.right) - Number(input.left);
      const wind = balanceWind(game.time, a.wind, a.variation);
      if (Math.abs(control) > 0.05) a.steered = true;
      a.velocity = a.velocity * Math.exp(-2 * dt) + (wind + control * 2.4) * dt;
      a.angle += a.velocity * dt;
      if (Math.abs(a.angle) > 0.5) return failure('傾いたら 反対側を支えよう');
      a.progress = a.steered ? clamp(game.time / 4.1, 0, 1) : 0;
      if (a.progress >= 1) return success('水平キープ！ ケーキも無事！');
      break;
    }
    case 'fishing': {
      if (a.stage === 'aim') {
        a.x = input.pointerDown || input.pointerPressed ? clamp(input.pointerX, 75, 565) : clamp(a.x + (Number(input.right) - Number(input.left)) * 440 * dt, 75, 565);
        if (input.action) { a.stage = 'drop'; session.sounds.push('pop'); }
      } else if (a.stage === 'drop') {
        a.y += 510 * dt;
        if (a.y >= a.depth) {
          a.y = a.depth;
          if (Math.abs(a.x - fishingX(game.time, a.fishPhase, a.variation)) <= 56) { a.stage = 'reel'; session.sounds.push('pop'); }
          else { a.stage = 'aim'; a.y = 145; }
        }
      } else {
        if (held) { a.progress = Math.min(1, a.progress + dt * 1.45); a.y = a.depth - a.progress * (a.depth - 145); }
        if (a.progress >= 1) return success('大漁！ つりあげた！');
      }
      break;
    }
    case 'launch': {
      if (!a.launched) {
        if (held) a.charge = clamp(a.charge + dt * 0.78, 0, 1);
        if (input.actionReleased && a.charge > 0) { a.launched = true; a.vx = a.direction * (125 + a.charge * 410); a.vy = -320; session.sounds.push('pop'); }
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
        if (Math.abs(x - 130) < 37 && Math.abs(a.y - glideGateY(gate, game.time, a.variation)) > a.gap / 2 - 15) return failure('ゲートのすき間に 高さを合わせよう');
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
          spot.clean = Math.min(1, spot.clean + dt * (a.variation === 2 ? 3.8 : 6));
          if (spot.clean >= 1) { a.count++; session.sounds.push('pop'); }
        }
      }
      if (a.count === a.spots.length) return success('ピカピカ！ おそうじ名人！');
      break;
    }
  }
  return null;
}
