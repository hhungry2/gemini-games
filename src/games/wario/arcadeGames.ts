import type { RushDefinition, RushId, RushInput, RushSession } from './engine';

export type ArcadeId = 'lander' | 'tower' | 'mole' | 'racer' | 'pour' | 'puck' | 'fire' | 'tug';
interface Base { pack: 'arcade'; id: ArcadeId; variation: number }
interface Lander extends Base { id: 'lander'; x: number; y: number; vy: number; pad: number; thrust: boolean; gravity: number; thrustPower: number; safeSpeed: number }
interface Tower extends Base { id: 'tower'; x: number; y: number; phase: number; dropping: boolean; stack: { x: number; width: number }[] }
interface Mole extends Base { id: 'mole'; selected: number; targets: number[]; bombs: number[]; secondBombs: number[]; cadence: number; required: number; slot: number; hitSlots: number[]; count: number; misses: number }
interface Racer extends Base { id: 'racer'; lane: number; rows: { safe: number; time: number; passed: boolean }[]; count: number; moved: boolean }
interface Pour extends Base { id: 'pour'; fills: number[]; targets: number[]; cup: number; pouring: boolean; flow: number }
interface Puck extends Base { id: 'puck'; x: number; y: number; vx: number; vy: number; goalY: number; gates: { x: number; y: number }[]; gapHalf: number; bumps: number }
interface Fire extends Base { id: 'fire'; x: number; y: number; water: number; spraying: boolean; flames: { x: number; y: number; heat: number }[] }
interface Tug extends Base { id: 'tug'; progress: number; next: -1 | 1; pattern: (-1 | 1)[]; pulls: number; lastPull: number }
export type ArcadeState = Lander | Tower | Mole | Racer | Pour | Puck | Fire | Tug;

export const ARCADE_GAMES: RushDefinition[] = [
  { id: 'lander', number: '33', category: 'action', name: 'ふんわり月面着陸', command: 'やさしく 着陸！', hint: '← → / 指の左右で移動。Space / 画面長押しで逆噴射。緑の台へゆっくり着陸！', shortHint: '左右で台をねらう ＋ 長押しで逆噴射', color: '#c9b5ef', variations: [
    { name: '月面のまんなか' },
    { name: '左の低重力基地', command: '左へ ふんわり！', hint: '左の基地へ移動！ 重力が弱いので、逆噴射は短く。下降速度の数字を見て着陸しよう。' },
    { name: '右の高重力基地', command: '右で しっかり減速！', hint: '右の基地へ！ 重力が強い星では早めの逆噴射。下降70以下で着陸しよう。' },
  ] },
  { id: 'tower', number: '34', category: 'timing', name: 'つみつみタワー', command: '3段 つみあげろ！', hint: '下のブロックに重なる瞬間、タップ / Space で落とそう。はみ出た部分は切れる！', shortHint: '下のブロックに重ねて タップ / Space', color: '#f8c07c', variations: [
    { name: 'いつもの3段' }, { name: 'ワイドな大移動', hint: '横に大きく動く幅広ブロックを3段！ 下のブロックと重なる瞬間に落とそう。' },
    { name: '高速スリムタワー', hint: '細いブロックが速く動く！ 真ん中付近で重ねると、幅を残しやすい。' },
  ] },
  { id: 'mole', number: '35', category: 'action', name: 'もぐらとバクダン', command: 'もぐらだけ たたけ！', hint: 'もぐらを3匹タップ / 矢印で穴を選んで Space。黒い爆弾にはさわらない！', shortHint: 'もぐらをタップ / 矢印 ＋ Space。爆弾注意', color: '#b9e2a0', variations: [
    { name: '3匹チャレンジ' }, { name: '4匹スピードラッシュ', command: 'すばやく 4匹！', hint: 'いつもより速いもぐらを4匹！ 矢印で移動＋Space / もぐらをタップ。' },
    { name: '爆弾ふたつ', command: '爆弾2個に 注意！', hint: '爆弾が2つある！ ゆっくり顔を出すもぐらだけを3匹たたこう。' },
  ] },
  { id: 'racer', number: '36', category: 'action', name: 'スイスイ車線チェンジ', command: 'あいた車線へ！', hint: '← → / 車線をタップ。4列の工事バリケードをよけてゴールしよう。', shortHint: '← → / あいた車線をタップ', color: '#a4dbe8', variations: [
    { name: '工事中の4列' }, { name: '左右スラローム', hint: '5列を左右へ大きく切り返そう！ 近づく矢印の車線を早めに選ぼう。' },
    { name: '中央にもどろう', hint: '中央を通りながら5列を突破！ ← → / あいた車線をタップ。' },
  ] },
  { id: 'pour', number: '37', category: 'timing', name: 'ぴったりジュース', command: '2杯 そそげ！', hint: 'タップ / Space を長押しで注ぐ。緑の線まで来たら離す！ こぼすと失敗。', shortHint: '長押しでそそぐ → 緑の線で離す', color: '#ff9db8', variations: [
    { name: 'いつもの2杯' }, { name: 'すこしとたっぷり', hint: '1杯目は少なめ、2杯目はたっぷり！ それぞれ違う緑の線で離そう。' },
    { name: 'きまぐれ蛇口', hint: '注ぐ勢いが強弱を繰り返す！ 液面を見ながら、緑の線で離そう。' },
  ] },
  { id: 'puck', number: '38', category: 'action', name: 'つるつるアイスパック', command: 'すべらせて ゴール！', hint: '↑↓←→ / 指へ向かって加速。2つの壁のすき間を通り、ゴールで減速！ Space でブレーキ。', shortHint: '矢印 / 指へ加速。ゴールで止まろう', color: '#9fdcd0', variations: [
    { name: '上から下へS字' }, { name: '下から上へS字', hint: 'いつもと逆向きのS字コース！ 下のすき間→上のすき間→右下のゴールへ。' },
    { name: '3つの精密ゲート', hint: '狭いすき間を3つ通ろう！ 上→下→上へジグザグに進み、右上のゴールで停止。' },
  ] },
  { id: 'fire', number: '39', category: 'action', name: 'おたすけ消防隊', command: '火を けせ！', hint: '指で火をねらって長押し / 矢印 ＋ Space 長押し。水をむだにせず3つ消そう。', shortHint: '火をねらって長押し / 矢印 ＋ Space', color: '#f8d94b', variations: [
    { name: '横ならびの3軒' }, { name: '三角屋根の火事', hint: '上下に離れた3つの火を消そう！ 指で火をねらって長押し / 矢印＋Space。' },
    { name: '4軒まとめて救助', command: '4つの火を けせ！', hint: '小さい火が4つ！ 少しずつ正確に放水し、すべて消そう。' },
  ] },
  { id: 'tug', number: '40', category: 'action', name: '交互に！つなひき', command: '左右交互に ひけ！', hint: '← → を交互に押す / 左右のボタンを交互にタップ。相手に引き返される前に勝負！', shortHint: '光る ← → / 左右ボタンを交互にタップ', color: '#f5b4d1', variations: [
    { name: '左右交互' }, { name: '2回ずつのリズム', command: '2回ずつ ひけ！', shortHint: '光る側を2回ずつ。矢印 / タップ', hint: '左左・右右のリズム！ 光った側を2回ずつ引く。矢印 / 左右ボタンをタップ。' },
    { name: '折り返しリズム', command: '光る順に ひけ！', shortHint: '矢印の順番で。矢印 / タップ', hint: '左右右左の折り返しリズム！ 上に出る矢印と光る側を見て、順番に引こう。' },
  ] },
];

const clamp = (v: number, low: number, high: number) => Math.max(low, Math.min(high, v));
const success = (reason: string) => ({ result: 'success' as const, reason });
const failure = (reason: string) => ({ result: 'failure' as const, reason });
export const towerMovingX = (time: number, phase: number, variation = 0) => 320 + Math.sin(time * [3.8, 4.8, 5.4][variation] + phase) * [192, 210, 170][variation];
export const molePosition = (cell: number) => ({ x: 170 + cell % 3 * 150, y: 225 + Math.floor(cell / 3) * 120 });
export const racerLaneX = (lane: number) => 180 + lane * 140;

export function createArcadeState(id: RushId, _level: number, random: () => number, variation = 0): ArcadeState | undefined {
  variation = clamp(Math.trunc(variation), 0, 2);
  switch (id) {
    case 'lander': return { pack: 'arcade', id, variation, x: 250 + random() * 140, y: 157, vy: 25, pad: variation === 0 ? 240 + random() * 160 : variation === 1 ? 155 + random() * 30 : 455 + random() * 30, thrust: false, gravity: [100, 85, 140][variation], thrustPower: [150, 135, 210][variation], safeSpeed: variation === 2 ? 70 : 76 };
    case 'tower': return { pack: 'arcade', id, variation, x: 320, y: 205, phase: random() * Math.PI * 2, dropping: false, stack: [{ x: 320, width: [156, 188, 132][variation] }] };
    case 'mole': {
      const targets = Array.from({ length: variation === 1 ? 9 : 7 }, () => Math.floor(random() * 6));
      const bombs = targets.map(t => (t + 1 + Math.floor(random() * 5)) % 6);
      const secondBombs = variation === 2 ? targets.map((t, i) => [0, 1, 2, 3, 4, 5].find(cell => cell !== t && cell !== bombs[i])!) : [];
      return { pack: 'arcade', id, variation, selected: 4, targets, bombs, secondBombs, cadence: [0.65, 0.48, 0.82][variation], required: variation === 1 ? 4 : 3, slot: -1, hitSlots: [], count: 0, misses: 0 };
    }
    case 'racer': {
      const offset = Math.floor(random() * 3);
      const pattern = [[0, 2, 1, 0], [0, 2, 0, 2, 1], [1, 0, 1, 2, 1]][variation];
      return { pack: 'arcade', id, variation, lane: 1, rows: pattern.map((v, i) => ({ safe: variation === 0 ? (v + offset) % 3 : offset % 2 ? 2 - v : v, time: variation ? 0.9 + i * 0.78 : 1.1 + i, passed: false })), count: 0, moved: false };
    }
    case 'pour': return { pack: 'arcade', id, variation, fills: [0, 0], targets: variation === 1 ? [0.29 + random() * 0.08, 0.79 + random() * 0.06] : [0.58 + random() * 0.12, 0.69 + random() * 0.12], cup: 0, pouring: false, flow: variation === 2 ? 0.72 : 0.75 };
    case 'puck': return { pack: 'arcade', id, variation, x: 105, y: variation === 1 ? 205 : 325, vx: 0, vy: 0, goalY: variation === 1 ? 325 : 205, gates: variation === 2 ? [{ x: 235, y: 245 }, { x: 345, y: 285 }, { x: 455, y: 245 }] : [{ x: 260, y: variation === 1 ? 330 : 220 }, { x: 410, y: variation === 1 ? 220 : 330 }], gapHalf: variation === 2 ? 43 : 53, bumps: 0 };
    case 'fire': return { pack: 'arcade', id, variation, x: 320, y: 340, water: 1, spraying: false, flames: variation === 2 ? [140, 260, 380, 500].map((x, i) => ({ x, y: i % 2 ? 290 : 215, heat: 0.75 })) : [165, 320, 475].map((x, i) => ({ x, y: variation === 1 ? i === 1 ? 185 : 285 : 230 + random() * 22, heat: 1 })) };
    case 'tug': {
      const sign = variation === 0 && random() < 0.5 ? -1 : 1;
      const pattern = (variation === 1 ? [-1, -1, 1, 1] : variation === 2 ? [-1, 1, 1, -1] : [-1, 1]).map(direction => direction * sign) as (-1 | 1)[];
      return { pack: 'arcade', id, variation, progress: 0, next: pattern[0], pattern, pulls: 0, lastPull: -10 };
    }
    default: return undefined;
  }
}

/** Local dt and game.time belong to the engine; no callbacks survive pause or restart. */
export function updateArcadeGame(session: RushSession, input: RushInput, dt: number): { result: 'success' | 'failure'; reason: string } | null {
  const g = session.game, a = g?.extra;
  if (!g || a?.pack !== 'arcade') return null;
  const held = input.actionHeld || input.pointerDown;
  switch (a.id) {
    case 'lander': {
      const dx = input.pointerDown ? clamp((input.pointerX - a.x) / 40, -1, 1) : Number(input.right) - Number(input.left);
      a.x = clamp(a.x + dx * 185 * dt, 55, 585); a.thrust = held;
      const ay = held ? -a.thrustPower : a.gravity;
      a.y += a.vy * dt + ay * dt * dt / 2; a.vy = clamp(a.vy + ay * dt, -100, 230);
      if (a.y < 138) { a.y = 138; a.vy = Math.max(0, a.vy); }
      if (a.y >= 374) {
        a.y = 374;
        return Math.abs(a.x - a.pad) <= 46 && a.vy <= a.safeSpeed ? success('ふんわり着陸！ 月面へようこそ！') : failure('緑の台に合わせて 逆噴射で減速しよう');
      }
      break;
    }
    case 'tower': {
      const top = a.stack[a.stack.length - 1], landingY = 394 - a.stack.length * 47;
      if (!a.dropping) {
        a.x = towerMovingX(g.time, a.phase, a.variation);
        if (input.action || input.pointerPressed) { a.dropping = true; session.sounds.push('pop'); }
      }
      if (a.dropping) {
        a.y += dt * 950;
        if (a.y >= landingY) {
          const left = Math.max(a.x - top.width / 2, top.x - top.width / 2), right = Math.min(a.x + top.width / 2, top.x + top.width / 2);
          if (right - left < 44) return failure('下のブロックと 重なるところで落とそう');
          a.stack.push({ x: (left + right) / 2, width: right - left }); a.dropping = false; a.y = 205;
          if (a.stack.length === 4) return success('3段完成！ みごとなタワー！');
        }
      }
      break;
    }
    case 'mole': {
      a.slot = Math.floor((g.time - 0.25) / a.cadence);
      if (input.leftPressed) a.selected = a.selected % 3 === 0 ? a.selected : a.selected - 1;
      if (input.rightPressed) a.selected = a.selected % 3 === 2 ? a.selected : a.selected + 1;
      if (input.upPressed) a.selected = Math.max(0, a.selected - 3);
      if (input.downPressed) a.selected = Math.min(5, a.selected + 3);
      let strike = input.action && !input.pointerPressed;
      if (input.pointerPressed) {
        const index = Array.from({ length: 6 }, (_, i) => i).find(i => { const p = molePosition(i); return Math.hypot(input.pointerX - p.x, input.pointerY - p.y) <= 58; });
        if (index !== undefined) { a.selected = index; strike = true; }
      }
      if (strike && a.slot >= 0 && a.slot < a.targets.length) {
        if (a.selected === a.bombs[a.slot] || a.selected === a.secondBombs[a.slot]) return failure('黒い爆弾！ もぐらだけをたたこう');
        if (a.selected === a.targets[a.slot] && !a.hitSlots.includes(a.slot)) { a.hitSlots.push(a.slot); a.count++; session.sounds.push('pop'); }
        else if (!a.hitSlots.includes(a.slot)) { a.misses++; if (a.misses >= 3) return failure('もぐらが顔を出した穴を たたこう'); }
      }
      if (a.count === a.required) return success(`${a.required}匹ヒット！ もぐら名人！`);
      break;
    }
    case 'racer': {
      const previous = a.lane;
      if (input.leftPressed) a.lane = Math.max(0, a.lane - 1);
      if (input.rightPressed) a.lane = Math.min(2, a.lane + 1);
      if (input.pointerPressed && input.pointerY > 145) a.lane = clamp(Math.round((input.pointerX - 180) / 140), 0, 2);
      if (previous !== a.lane) a.moved = true;
      for (const row of a.rows) {
        if (row.passed || g.time < row.time) continue;
        if (a.lane !== row.safe) return failure('工事中！ バリケードのない車線へ移ろう');
        row.passed = true; a.count++; session.sounds.push('pop');
      }
      if (a.count === a.rows.length && a.moved) return success('無事故ゴール！ ナイスドライブ！');
      break;
    }
    case 'pour': {
      if (a.cup >= 2) break;
      a.pouring = held;
      a.flow = a.variation === 2 ? 0.72 + Math.sin(g.time * 8) * 0.44 : 0.75;
      if (held) a.fills[a.cup] += dt * a.flow;
      if (a.fills[a.cup] > a.targets[a.cup] + 0.14) return failure('あふれちゃった！ 緑の線で離そう');
      if (input.actionReleased && a.fills[a.cup] > 0) {
        if (Math.abs(a.fills[a.cup] - a.targets[a.cup]) > 0.09) return failure('緑の線まで そそいでから離そう');
        a.cup++; a.pouring = false; session.sounds.push('pop');
        if (a.cup === 2) return success('2杯ぴったり！ いただきます！');
      }
      break;
    }
    case 'puck': {
      let dx = Number(input.right) - Number(input.left), dy = Number(input.down) - Number(input.up);
      if (input.pointerDown) { dx = clamp((input.pointerX - a.x) / 55, -1, 1); dy = clamp((input.pointerY - a.y) / 55, -1, 1); }
      const norm = Math.max(1, Math.hypot(dx, dy)); dx /= norm; dy /= norm;
      const damping = input.actionHeld ? 17 : 5.7;
      a.vx = (a.vx + dx * 1950 * dt) * Math.exp(-damping * dt); a.vy = (a.vy + dy * 1950 * dt) * Math.exp(-damping * dt);
      const oldX = a.x; a.x += a.vx * dt; a.y += a.vy * dt;
      for (const gate of a.gates) {
        const side = oldX < gate.x ? -1 : 1, face = gate.x + side * 24;
        const crossing = side < 0 ? oldX <= face && a.x > face : oldX >= face && a.x < face;
        if (crossing && Math.abs(a.y - gate.y) > a.gapHalf && Math.abs(oldX - gate.x) >= 23) {
          a.x = face; a.vx *= -0.4; a.bumps++;
        }
      }
      if (a.x < 65 || a.x > 580) { a.x = clamp(a.x, 65, 580); a.vx *= -0.4; }
      if (a.y < 151 || a.y > 407) { a.y = clamp(a.y, 151, 407); a.vy *= -0.4; }
      if (Math.hypot(a.x - 550, a.y - a.goalY) < 31 && Math.hypot(a.vx, a.vy) < 125) return success('ピタッと停止！ アイスゴール！');
      break;
    }
    case 'fire': {
      if (input.pointerDown) { a.x = clamp(input.pointerX, 60, 580); a.y = clamp(input.pointerY, 150, 395); }
      else { a.x = clamp(a.x + (Number(input.right) - Number(input.left)) * 585 * dt, 60, 580); a.y = clamp(a.y + (Number(input.down) - Number(input.up)) * 585 * dt, 150, 395); }
      a.spraying = held && a.water > 0;
      if (a.spraying) {
        a.water = Math.max(0, a.water - dt * 0.29);
        for (const flame of a.flames) if (flame.heat > 0 && Math.hypot(a.x - flame.x, a.y - flame.y) < 43) flame.heat = Math.max(0, flame.heat - dt * 2.6);
      }
      if (a.flames.every(flame => flame.heat === 0)) return success('鎮火完了！ みんなを守った！');
      if (a.water <= 0) return failure('水切れ！ 火をねらってから 放水しよう');
      break;
    }
    case 'tug': {
      a.progress = Math.max(-0.25, a.progress - dt * 0.13);
      const pull = input.pointerPressed && input.pointerY >= 320 ? (input.pointerX < 320 ? -1 : 1) : input.leftPressed ? -1 : input.rightPressed ? 1 : 0;
      if (pull) {
        if (pull === a.next) { a.progress += 0.17; a.pulls++; a.next = a.pattern[a.pulls % a.pattern.length]; a.lastPull = g.time; session.sounds.push('pop'); }
        else a.progress = Math.max(-0.25, a.progress - 0.12);
      }
      if (a.progress >= 1) return success('ぐいっと勝利！ 息ぴったり！');
      break;
    }
  }
  return null;
}
