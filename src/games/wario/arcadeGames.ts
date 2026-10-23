import type { RushDefinition, RushId, RushInput, RushSession } from './engine';

export type ArcadeId = 'lander' | 'tower' | 'mole' | 'racer' | 'pour' | 'puck' | 'fire' | 'tug';
interface Base { pack: 'arcade'; id: ArcadeId }
interface Lander extends Base { id: 'lander'; x: number; y: number; vy: number; pad: number; thrust: boolean }
interface Tower extends Base { id: 'tower'; x: number; y: number; phase: number; dropping: boolean; stack: { x: number; width: number }[] }
interface Mole extends Base { id: 'mole'; selected: number; targets: number[]; bombs: number[]; slot: number; hitSlots: number[]; count: number; misses: number }
interface Racer extends Base { id: 'racer'; lane: number; rows: { safe: number; time: number; passed: boolean }[]; count: number; moved: boolean }
interface Pour extends Base { id: 'pour'; fills: number[]; targets: number[]; cup: number; pouring: boolean }
interface Puck extends Base { id: 'puck'; x: number; y: number; vx: number; vy: number; goalY: number; gates: { x: number; y: number }[]; bumps: number }
interface Fire extends Base { id: 'fire'; x: number; y: number; water: number; spraying: boolean; flames: { x: number; y: number; heat: number }[] }
interface Tug extends Base { id: 'tug'; progress: number; next: -1 | 1; pulls: number; lastPull: number }
export type ArcadeState = Lander | Tower | Mole | Racer | Pour | Puck | Fire | Tug;

export const ARCADE_GAMES: RushDefinition[] = [
  { id: 'lander', number: '33', category: 'action', name: 'ふんわり月面着陸', command: 'やさしく 着陸！', hint: '← → / 指の左右で移動。Space / 画面長押しで逆噴射。緑の台へゆっくり着陸！', shortHint: '左右で台をねらう ＋ 長押しで逆噴射', color: '#c9b5ef' },
  { id: 'tower', number: '34', category: 'timing', name: 'つみつみタワー', command: '3段 つみあげろ！', hint: '下のブロックに重なる瞬間、タップ / Space で落とそう。はみ出た部分は切れる！', shortHint: '下のブロックに重ねて タップ / Space', color: '#f8c07c' },
  { id: 'mole', number: '35', category: 'action', name: 'もぐらとバクダン', command: 'もぐらだけ たたけ！', hint: 'もぐらを3匹タップ / 矢印で穴を選んで Space。黒い爆弾にはさわらない！', shortHint: 'もぐらをタップ / 矢印 ＋ Space。爆弾注意', color: '#b9e2a0' },
  { id: 'racer', number: '36', category: 'action', name: 'スイスイ車線チェンジ', command: 'あいた車線へ！', hint: '← → / 車線をタップ。4列の工事バリケードをよけてゴールしよう。', shortHint: '← → / あいた車線をタップ', color: '#a4dbe8' },
  { id: 'pour', number: '37', category: 'timing', name: 'ぴったりジュース', command: '2杯 そそげ！', hint: 'タップ / Space を長押しで注ぐ。緑の線まで来たら離す！ こぼすと失敗。', shortHint: '長押しでそそぐ → 緑の線で離す', color: '#ff9db8' },
  { id: 'puck', number: '38', category: 'action', name: 'つるつるアイスパック', command: 'すべらせて ゴール！', hint: '↑↓←→ / 指へ向かって加速。2つの壁のすき間を通り、ゴールで減速！ Space でブレーキ。', shortHint: '矢印 / 指へ加速。ゴールで止まろう', color: '#9fdcd0' },
  { id: 'fire', number: '39', category: 'action', name: 'おたすけ消防隊', command: '火を けせ！', hint: '指で火をねらって長押し / 矢印 ＋ Space 長押し。水をむだにせず3つ消そう。', shortHint: '火をねらって長押し / 矢印 ＋ Space', color: '#f8d94b' },
  { id: 'tug', number: '40', category: 'action', name: '交互に！つなひき', command: '左右交互に ひけ！', hint: '← → を交互に押す / 左右のボタンを交互にタップ。相手に引き返される前に勝負！', shortHint: '光る ← → / 左右ボタンを交互にタップ', color: '#f5b4d1' },
];

const clamp = (v: number, low: number, high: number) => Math.max(low, Math.min(high, v));
const success = (reason: string) => ({ result: 'success' as const, reason });
const failure = (reason: string) => ({ result: 'failure' as const, reason });
export const towerMovingX = (time: number, phase: number) => 320 + Math.sin(time * 3.8 + phase) * 192;
export const molePosition = (cell: number) => ({ x: 170 + cell % 3 * 150, y: 225 + Math.floor(cell / 3) * 120 });
export const racerLaneX = (lane: number) => 180 + lane * 140;

export function createArcadeState(id: RushId, _level: number, random: () => number): ArcadeState | undefined {
  switch (id) {
    case 'lander': return { pack: 'arcade', id, x: 250 + random() * 140, y: 157, vy: 25, pad: 240 + random() * 160, thrust: false };
    case 'tower': return { pack: 'arcade', id, x: 320, y: 205, phase: random() * Math.PI * 2, dropping: false, stack: [{ x: 320, width: 156 }] };
    case 'mole': {
      const targets = Array.from({ length: 7 }, () => Math.floor(random() * 6));
      return { pack: 'arcade', id, selected: 4, targets, bombs: targets.map(t => (t + 1 + Math.floor(random() * 5)) % 6), slot: -1, hitSlots: [], count: 0, misses: 0 };
    }
    case 'racer': {
      const offset = Math.floor(random() * 3);
      return { pack: 'arcade', id, lane: 1, rows: [0, 2, 1, 0].map((v, i) => ({ safe: (v + offset) % 3, time: 1.1 + i, passed: false })), count: 0, moved: false };
    }
    case 'pour': return { pack: 'arcade', id, fills: [0, 0], targets: [0.58 + random() * 0.12, 0.69 + random() * 0.12], cup: 0, pouring: false };
    case 'puck': return { pack: 'arcade', id, x: 105, y: 325, vx: 0, vy: 0, goalY: 205, gates: [{ x: 260, y: 220 }, { x: 410, y: 330 }], bumps: 0 };
    case 'fire': return { pack: 'arcade', id, x: 320, y: 340, water: 1, spraying: false, flames: [165, 320, 475].map(x => ({ x, y: 230 + random() * 22, heat: 1 })) };
    case 'tug': return { pack: 'arcade', id, progress: 0, next: random() < 0.5 ? -1 : 1, pulls: 0, lastPull: -10 };
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
      const ay = held ? -150 : 100;
      a.y += a.vy * dt + ay * dt * dt / 2; a.vy = clamp(a.vy + ay * dt, -100, 230);
      if (a.y < 138) { a.y = 138; a.vy = Math.max(0, a.vy); }
      if (a.y >= 374) {
        a.y = 374;
        return Math.abs(a.x - a.pad) <= 46 && a.vy <= 76 ? success('ふんわり着陸！ 月面へようこそ！') : failure('緑の台に合わせて 逆噴射で減速しよう');
      }
      break;
    }
    case 'tower': {
      const top = a.stack[a.stack.length - 1], landingY = 394 - a.stack.length * 47;
      if (!a.dropping) {
        a.x = towerMovingX(g.time, a.phase);
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
      a.slot = Math.floor((g.time - 0.25) / 0.65);
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
        if (a.selected === a.bombs[a.slot]) return failure('黒い爆弾！ もぐらだけをたたこう');
        if (a.selected === a.targets[a.slot] && !a.hitSlots.includes(a.slot)) { a.hitSlots.push(a.slot); a.count++; session.sounds.push('pop'); }
        else if (!a.hitSlots.includes(a.slot)) { a.misses++; if (a.misses >= 3) return failure('もぐらが顔を出した穴を たたこう'); }
      }
      if (a.count === 3) return success('3匹ヒット！ もぐら名人！');
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
      if (held) a.fills[a.cup] += dt * 0.75;
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
        if (crossing && Math.abs(a.y - gate.y) > 53 && Math.abs(oldX - gate.x) >= 23) {
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
        if (pull === a.next) { a.progress += 0.17; a.next = a.next === -1 ? 1 : -1; a.pulls++; a.lastPull = g.time; session.sounds.push('pop'); }
        else a.progress = Math.max(-0.25, a.progress - 0.12);
      }
      if (a.progress >= 1) return success('ぐいっと勝利！ 息ぴったり！');
      break;
    }
  }
  return null;
}
