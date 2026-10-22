export type ArenaMode = 'ffa' | 'timeattack';
export type ArenaStatus = 'playing' | 'over';
export const WORLD_SIZE = 2400;
export const ROUND_SECONDS = 90;
export const CELL_LIMIT = 8;
export const COLORS = ['#55def3', '#ffad65', '#b49aff', '#ff81ae', '#83e5ac', '#ffe283'];
export const BOT_NAMES = ['momo', 'ORBIT', 'くらげ', 'NOVA', 'peach', 'しずく', 'PLUTO', 'luna', 'もち', 'SOLO', 'pico', 'ねむ', 'MINT', 'HACHI'];

export interface Cell {
  id: number;
  owner: number;
  x: number;
  y: number;
  mass: number;
  vx: number;
  vy: number;
  mergeAt: number;
  shieldUntil: number;
}
export interface Owner {
  id: number;
  name: string;
  color: string;
  targetX: number;
  targetY: number;
  thinkAt: number;
  respawnAt: number;
}
export interface Pellet {
  x: number;
  y: number;
  mass: number;
  color: string;
  vx: number;
  vy: number;
  collectibleAt: number;
  expires: number;
}
export interface ArenaInput { x: number; y: number }
export interface ArenaEvent {
  type: 'pellet' | 'eat' | 'split' | 'merge' | 'eject';
  x: number;
  y: number;
  color: string;
  value: number;
}
export interface Arena {
  mode: ArenaMode;
  status: ArenaStatus;
  time: number;
  cells: Cell[];
  owners: Owner[];
  pellets: Pellet[];
  events: ArenaEvent[];
  kills: number;
  peak: number;
  bestRank: number;
  lastEject: number;
  nextId: number;
  rng: () => number;
}
export interface Leader { id: number; name: string; color: string; mass: number }

export const radius = (mass: number) => Math.sqrt(Math.max(1, mass)) * 3.5;
export const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
export const totalMass = (arena: Arena, owner = 0) => arena.cells.reduce((sum, cell) => sum + (cell.owner === owner ? cell.mass : 0), 0);
const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

export function playerCenter(arena: Arena) {
  const cells = arena.cells.filter(cell => cell.owner === 0);
  const mass = cells.reduce((sum, cell) => sum + cell.mass, 0);
  return mass > 0
    ? { x: cells.reduce((sum, cell) => sum + cell.x * cell.mass, 0) / mass, y: cells.reduce((sum, cell) => sum + cell.y * cell.mass, 0) / mass }
    : { x: WORLD_SIZE / 2, y: WORLD_SIZE / 2 };
}

export function leaderboard(arena: Arena): Leader[] {
  const mass = new Map<number, number>();
  for (const cell of arena.cells) mass.set(cell.owner, (mass.get(cell.owner) ?? 0) + cell.mass);
  return arena.owners.map(owner => ({ id: owner.id, name: owner.name, color: owner.color, mass: mass.get(owner.id) ?? 0 }))
    .filter(owner => owner.mass > 0).sort((a, b) => b.mass - a.mass || a.id - b.id);
}

function createPellet(arena: Arena): Pellet {
  return { x: 20 + arena.rng() * (WORLD_SIZE - 40), y: 20 + arena.rng() * (WORLD_SIZE - 40), mass: 1 + arena.rng() * 2,
    color: COLORS[Math.floor(arena.rng() * COLORS.length)], vx: 0, vy: 0, collectibleAt: 0, expires: Infinity };
}

function safePosition(arena: Arena, mass: number) {
  let best = { x: WORLD_SIZE / 2, y: WORLD_SIZE / 2 };
  let bestGap = -Infinity;
  for (let i = 0; i < 35; i++) {
    const candidate = { x: 130 + arena.rng() * (WORLD_SIZE - 260), y: 130 + arena.rng() * (WORLD_SIZE - 260) };
    let gap = WORLD_SIZE;
    for (const cell of arena.cells) gap = Math.min(gap, distance(candidate, cell) - radius(cell.mass) - radius(mass));
    if (gap > bestGap) { best = candidate; bestGap = gap; }
    if (gap > 250) break;
  }
  return best;
}

function addCell(arena: Arena, owner: number, mass: number, position: { x: number; y: number }): Cell {
  const cell: Cell = { id: arena.nextId++, owner, ...position, mass, vx: 0, vy: 0, mergeAt: arena.time,
    shieldUntil: arena.time + (owner === 0 ? 4 : 1.5) };
  arena.cells.push(cell);
  return cell;
}

export function createArena(mode: ArenaMode = 'ffa', name = 'あなた', color = COLORS[0], rng = Math.random): Arena {
  const arena: Arena = { mode, status: 'playing', time: 0, cells: [], owners: [], pellets: [], events: [], kills: 0,
    peak: 85, bestRank: 15, lastEject: -1, nextId: 0, rng };
  arena.owners.push({ id: 0, name: name.trim().slice(0, 12) || 'あなた', color, targetX: 0, targetY: 0, thinkAt: 0, respawnAt: 0 });
  addCell(arena, 0, 85, { x: WORLD_SIZE / 2, y: WORLD_SIZE / 2 });
  for (let id = 1; id <= BOT_NAMES.length; id++) {
    arena.owners.push({ id, name: BOT_NAMES[id - 1], color: COLORS[id % COLORS.length], targetX: 0, targetY: 0, thinkAt: 0, respawnAt: 0 });
    const mass = 48 + rng() * 105;
    addCell(arena, id, mass, safePosition(arena, mass));
  }
  for (let i = 0; i < 950; i++) arena.pellets.push(createPellet(arena));
  // A small opening trail makes the growth loop immediately discoverable.
  for (let i = 0; i < 28; i++) {
    const angle = rng() * Math.PI * 2;
    const spread = 65 + rng() * 220;
    arena.pellets[i].x = WORLD_SIZE / 2 + Math.cos(angle) * spread;
    arena.pellets[i].y = WORLD_SIZE / 2 + Math.sin(angle) * spread;
  }
  arena.bestRank = leaderboard(arena).findIndex(owner => owner.id === 0) + 1;
  return arena;
}

function botDirection(arena: Arena, cell: Cell, owner: Owner): ArenaInput {
  if (arena.time >= owner.thinkAt) {
    owner.thinkAt = arena.time + 0.2 + arena.rng() * 0.3;
    let threat: Cell | undefined;
    let prey: Cell | undefined;
    let threatGap = Infinity;
    let preyGap = 400;
    for (const other of arena.cells) {
      if (other.owner === cell.owner) continue;
      const gap = distance(cell, other) - radius(other.mass);
      if (other.mass > cell.mass * 1.18 && gap < 250 && gap < threatGap) { threat = other; threatGap = gap; }
      if (cell.mass > other.mass * 1.22 && other.shieldUntil <= arena.time && gap < preyGap) { prey = other; preyGap = gap; }
    }
    if (threat) {
      owner.targetX = clamp(cell.x + (cell.x - threat.x) * 3, 40, WORLD_SIZE - 40);
      owner.targetY = clamp(cell.y + (cell.y - threat.y) * 3, 40, WORLD_SIZE - 40);
    } else if (prey) {
      owner.targetX = prey.x; owner.targetY = prey.y;
    } else {
      let target: Pellet | undefined;
      let nearest = Infinity;
      for (let i = cell.owner % 3; i < arena.pellets.length; i += 3) {
        const pellet = arena.pellets[i];
        const d = distance(cell, pellet);
        if (d < nearest) { nearest = d; target = pellet; }
      }
      owner.targetX = target?.x ?? WORLD_SIZE / 2;
      owner.targetY = target?.y ?? WORLD_SIZE / 2;
    }
  }
  const dx = owner.targetX - cell.x;
  const dy = owner.targetY - cell.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  return { x: dx / length, y: dy / length };
}

function emit(arena: Arena, type: ArenaEvent['type'], cell: Cell, value = 0) {
  arena.events.push({ type, x: cell.x, y: cell.y, color: arena.owners[cell.owner].color, value });
}

export function splitPlayer(arena: Arena, input: ArenaInput): boolean {
  if (arena.status !== 'playing') return false;
  const player = arena.cells.filter(cell => cell.owner === 0);
  const length = Math.hypot(input.x, input.y);
  const dx = length > 0.01 ? input.x / length : 1;
  const dy = length > 0.01 ? input.y / length : 0;
  let slots = CELL_LIMIT - player.length;
  let split = false;
  for (const cell of player) {
    if (cell.mass < 60 || slots <= 0) continue;
    cell.mass /= 2;
    cell.mergeAt = arena.time + 12;
    const next = addCell(arena, 0, cell.mass, { x: cell.x + dx * radius(cell.mass) * 1.5, y: cell.y + dy * radius(cell.mass) * 1.5 });
    next.vx = dx * 580; next.vy = dy * 580;
    next.mergeAt = cell.mergeAt;
    next.shieldUntil = cell.shieldUntil;
    clampCell(next);
    emit(arena, 'split', next);
    slots--; split = true;
  }
  return split;
}

export function ejectPlayer(arena: Arena, input: ArenaInput): boolean {
  if (arena.status !== 'playing' || arena.time - arena.lastEject < 0.22) return false;
  const length = Math.hypot(input.x, input.y);
  const dx = length > 0.01 ? input.x / length : 1;
  const dy = length > 0.01 ? input.y / length : 0;
  let ejected = false;
  for (const cell of arena.cells) {
    if (cell.owner !== 0 || cell.mass < 30) continue;
    cell.mass -= 8;
    arena.pellets.push({ x: cell.x + dx * (radius(cell.mass) + 14), y: cell.y + dy * (radius(cell.mass) + 14),
      mass: 8, color: arena.owners[0].color, vx: dx * 420, vy: dy * 420, collectibleAt: arena.time + 1.3, expires: arena.time + 18 });
    emit(arena, 'eject', cell); ejected = true;
  }
  if (ejected) arena.lastEject = arena.time;
  return ejected;
}

function clampCell(cell: Cell) {
  const edge = Math.min(WORLD_SIZE / 2, radius(cell.mass));
  cell.x = clamp(cell.x, edge, WORLD_SIZE - edge);
  cell.y = clamp(cell.y, edge, WORLD_SIZE - edge);
}

export function stepArena(arena: Arena, input: ArenaInput, delta = 1 / 60) {
  if (arena.status !== 'playing') return;
  const dt = clamp(Number.isFinite(delta) ? delta : 0, 0, 1 / 30);
  arena.events = [];
  if (dt === 0) return;
  arena.time = Math.min(arena.time + dt, arena.mode === 'timeattack' ? ROUND_SECONDS : Infinity);
  const player = playerCenter(arena);
  const rawLength = Math.hypot(input.x, input.y);
  const direction = { x: input.x / Math.max(1, rawLength), y: input.y / Math.max(1, rawLength) };
  for (const cell of arena.cells) {
    const owner = arena.owners[cell.owner];
    let move = cell.owner === 0 ? direction : botDirection(arena, cell, owner);
    // After the cooldown, separated cells naturally converge without needing another action.
    if (cell.owner === 0 && cell.mergeAt <= arena.time) {
      move = { x: move.x + (player.x - cell.x) / 150, y: move.y + (player.y - cell.y) / 150 };
      const length = Math.max(1, Math.hypot(move.x, move.y));
      move.x /= length; move.y /= length;
    }
    const speed = 188 * Math.pow(85 / Math.max(20, cell.mass), 0.18) * (cell.owner === 0 ? 1 : 0.89);
    cell.x += (move.x * speed + cell.vx) * dt;
    cell.y += (move.y * speed + cell.vy) * dt;
    cell.vx *= Math.exp(-4.5 * dt); cell.vy *= Math.exp(-4.5 * dt);
    if (cell.mass > 240) cell.mass -= (cell.mass - 240) * 0.002 * dt;
    clampCell(cell);
  }
  for (let i = arena.pellets.length - 1; i >= 0; i--) {
    const pellet = arena.pellets[i];
    pellet.x = clamp(pellet.x + pellet.vx * dt, 8, WORLD_SIZE - 8);
    pellet.y = clamp(pellet.y + pellet.vy * dt, 8, WORLD_SIZE - 8);
    pellet.vx *= Math.exp(-3.5 * dt); pellet.vy *= Math.exp(-3.5 * dt);
    if (pellet.expires < arena.time) { arena.pellets.splice(i, 1); continue; }
    if (pellet.collectibleAt > arena.time) continue;
    for (const cell of arena.cells) {
      if (Math.abs(cell.x - pellet.x) > radius(cell.mass) || Math.abs(cell.y - pellet.y) > radius(cell.mass)) continue;
      if (distance(cell, pellet) < radius(cell.mass)) {
        cell.mass += pellet.mass;
        if (cell.owner === 0) emit(arena, 'pellet', cell, pellet.mass);
        arena.pellets.splice(i, 1);
        break;
      }
    }
  }
  const removed = new Set<number>();
  // Resolve large cells first so a prey cannot eat after being consumed in the same frame.
  const ordered = [...arena.cells].sort((a, b) => b.mass - a.mass);
  for (let i = 0; i < ordered.length; i++) {
    const large = ordered[i];
    if (removed.has(large.id)) continue;
    for (let j = i + 1; j < ordered.length; j++) {
      const small = ordered[j];
      if (removed.has(small.id)) continue;
      const dist = distance(large, small);
      if (large.owner === small.owner) {
        if (large.mergeAt <= arena.time && small.mergeAt <= arena.time && dist < (radius(large.mass) + radius(small.mass)) * 0.78) {
          const total = large.mass + small.mass;
          large.x = (large.x * large.mass + small.x * small.mass) / total;
          large.y = (large.y * large.mass + small.y * small.mass) / total;
          large.mass = total;
          removed.add(small.id);
          if (large.owner === 0) emit(arena, 'merge', large);
        } else if (dist < radius(large.mass) + radius(small.mass)) {
          const angle = dist < 0.01 ? ((large.id + small.id) * 2.4) : Math.atan2(small.y - large.y, small.x - large.x);
          const push = (radius(large.mass) + radius(small.mass) - dist) * Math.min(0.5, dt * 9);
          large.x -= Math.cos(angle) * push * small.mass / (large.mass + small.mass);
          large.y -= Math.sin(angle) * push * small.mass / (large.mass + small.mass);
          small.x += Math.cos(angle) * push * large.mass / (large.mass + small.mass);
          small.y += Math.sin(angle) * push * large.mass / (large.mass + small.mass);
        }
      } else if (large.mass > small.mass * 1.18 && large.shieldUntil <= arena.time && small.shieldUntil <= arena.time
        && dist < radius(large.mass) - radius(small.mass) * 0.35) {
        large.mass += small.mass;
        removed.add(small.id);
        if (large.owner === 0) emit(arena, 'eat', small, small.mass);
        if (!ordered.some(cell => cell.owner === small.owner && !removed.has(cell.id))) {
          arena.owners[small.owner].respawnAt = arena.time + 4;
          if (large.owner === 0) arena.kills++;
        }
      }
    }
  }
  arena.cells = arena.cells.filter(cell => !removed.has(cell.id));
  for (const cell of arena.cells) clampCell(cell);
  const mass = totalMass(arena);
  arena.peak = Math.max(arena.peak, mass);
  if (mass <= 0 || (arena.mode === 'timeattack' && arena.time >= ROUND_SECONDS)) { arena.status = 'over'; return; }
  const rank = leaderboard(arena).findIndex(owner => owner.id === 0) + 1;
  arena.bestRank = Math.min(arena.bestRank, rank);
  for (const owner of arena.owners) {
    if (owner.id === 0 || arena.cells.some(cell => cell.owner === owner.id) || arena.time < owner.respawnAt) continue;
    const spawnMass = 45 + arena.rng() * 65;
    addCell(arena, owner.id, spawnMass, safePosition(arena, spawnMass));
  }
  while (arena.pellets.length < 950) arena.pellets.push(createPellet(arena));
}
