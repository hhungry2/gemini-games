import { COLORS, WORLD_SIZE, clamp, playerCenter, radius, totalMass, type Arena, type ArenaEvent } from './engine';

interface Particle { x: number; y: number; vx: number; vy: number; age: number; life: number; color: string; text?: string }
export interface ArenaView {
  x: number;
  y: number;
  zoom: number;
  particles: Particle[];
  width: number;
  height: number;
}
export const createView = (): ArenaView => ({ x: WORLD_SIZE / 2, y: WORLD_SIZE / 2, zoom: 0.8, particles: [], width: 1, height: 1 });

export function captureEvents(view: ArenaView, events: ArenaEvent[], reducedMotion = false) {
  for (const event of events) {
    if (event.type === 'pellet' && view.particles.length > 50) continue;
    const count = reducedMotion ? 0 : event.type === 'eat' ? 15 : event.type === 'pellet' ? 2 : 7;
    for (let i = 0; i < count; i++) {
      const angle = (i / Math.max(1, count)) * Math.PI * 2;
      view.particles.push({ x: event.x, y: event.y, vx: Math.cos(angle) * (25 + i * 7), vy: Math.sin(angle) * (25 + i * 7),
        age: 0, life: event.type === 'eat' ? 0.7 : 0.32, color: event.color });
    }
    if (event.type === 'eat') view.particles.push({ x: event.x, y: event.y, vx: 0, vy: -40, age: 0, life: 1.2, color: '#ffffff', text: `+${Math.round(event.value)}` });
  }
  if (view.particles.length > 140) view.particles.splice(0, view.particles.length - 140);
}

export function renderArena(ctx: CanvasRenderingContext2D, arena: Arena, view: ArenaView, width: number, height: number, dt: number, reducedMotion = false) {
  view.width = width; view.height = height;
  const center = playerCenter(arena);
  const mass = totalMass(arena);
  const wantedZoom = clamp(Math.min(width, height) / 760 * Math.pow(85 / Math.max(85, mass), 0.16), 0.28, 1.35);
  const ease = reducedMotion ? 1 : 1 - Math.exp(-Math.min(dt, 0.1) * 5);
  view.x += (center.x - view.x) * ease;
  view.y += (center.y - view.y) * ease;
  view.zoom += (wantedZoom - view.zoom) * ease;
  const zoom = view.zoom;
  const left = view.x - width / (2 * zoom);
  const top = view.y - height / (2 * zoom);
  const right = left + width / zoom;
  const bottom = top + height / zoom;
  ctx.fillStyle = '#080f20'; ctx.fillRect(0, 0, width, height);
  ctx.save();
  ctx.translate(width / 2, height / 2); ctx.scale(zoom, zoom); ctx.translate(-view.x, -view.y);
  ctx.fillStyle = '#0e1b30'; ctx.fillRect(0, 0, WORLD_SIZE, WORLD_SIZE);
  ctx.strokeStyle = 'rgba(129,160,200,.065)'; ctx.lineWidth = 1 / zoom; ctx.beginPath();
  for (let x = Math.max(0, Math.floor(left / 80) * 80); x <= Math.min(WORLD_SIZE, right); x += 80) { ctx.moveTo(x, Math.max(0, top)); ctx.lineTo(x, Math.min(WORLD_SIZE, bottom)); }
  for (let y = Math.max(0, Math.floor(top / 80) * 80); y <= Math.min(WORLD_SIZE, bottom); y += 80) { ctx.moveTo(Math.max(0, left), y); ctx.lineTo(Math.min(WORLD_SIZE, right), y); }
  ctx.stroke();
  ctx.strokeStyle = '#263d58'; ctx.lineWidth = 5; ctx.strokeRect(0, 0, WORLD_SIZE, WORLD_SIZE);
  for (const pellet of arena.pellets) {
    if (pellet.x < left - 12 || pellet.x > right + 12 || pellet.y < top - 12 || pellet.y > bottom + 12) continue;
    const r = pellet.mass >= 7 ? 7 : 2.5 + pellet.mass * 0.65;
    ctx.fillStyle = pellet.color; ctx.globalAlpha = 0.78;
    ctx.beginPath(); ctx.arc(pellet.x, pellet.y, r, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.08; ctx.beginPath(); ctx.arc(pellet.x, pellet.y, r * 2.3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  const playerCells = arena.cells.filter(cell => cell.owner === 0);
  for (const cell of [...arena.cells].sort((a, b) => a.mass - b.mass)) {
    const r = radius(cell.mass);
    if (cell.x + r < left || cell.x - r > right || cell.y + r < top || cell.y - r > bottom) continue;
    const owner = arena.owners[cell.owner];
    const isPlayer = cell.owner === 0;
    const threat = !isPlayer && playerCells.some(player => cell.mass > player.mass * 1.18);
    ctx.save(); ctx.translate(cell.x, cell.y);
    ctx.shadowColor = owner.color; ctx.shadowBlur = isPlayer ? 26 : 12;
    const fill = ctx.createRadialGradient(-r * 0.32, -r * 0.38, r * 0.05, 0, 0, r);
    fill.addColorStop(0, owner.color); fill.addColorStop(1, `${owner.color}a8`);
    ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0; ctx.strokeStyle = isPlayer ? '#d3fbff' : threat ? '#ffb7aa' : `${owner.color}cc`;
    ctx.lineWidth = isPlayer ? 2.5 / zoom : 1.5 / zoom; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(-r * 0.04, -r * 0.04, r * 0.85, Math.PI * 1.1, Math.PI * 1.55); ctx.stroke();
    // Simple eyes make the cells readable at a glance without external art.
    const eye = Math.max(3, r * 0.12);
    ctx.fillStyle = '#0b1830';
    ctx.beginPath(); ctx.ellipse(-r * 0.22, -r * 0.14, eye, eye * 1.25, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(r * 0.22, -r * 0.14, eye, eye * 1.25, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(-r * 0.22 + eye * 0.2, -r * 0.14 - eye * 0.3, eye * 0.32, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(r * 0.22 + eye * 0.2, -r * 0.14 - eye * 0.3, eye * 0.32, 0, Math.PI * 2); ctx.fill();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `700 ${Math.max(10, Math.min(20, r * 0.3))}px Inter, "Noto Sans JP", sans-serif`;
    ctx.fillStyle = '#061327'; ctx.fillText(owner.name, 0, r * 0.27, r * 1.65);
    if (isPlayer) {
      ctx.font = `800 ${Math.max(9, Math.min(15, r * 0.24))}px ui-monospace, monospace`;
      ctx.fillStyle = '#07192e'; ctx.fillText(String(Math.floor(cell.mass)), 0, r * 0.63);
      if (cell.mergeAt > arena.time) {
        ctx.strokeStyle = '#ffffff80'; ctx.lineWidth = 2 / zoom; ctx.beginPath();
        ctx.arc(0, 0, r + 6 / zoom, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, (cell.mergeAt - arena.time) / 12)); ctx.stroke();
      }
    }
    if (cell.shieldUntil > arena.time) {
      ctx.strokeStyle = '#d2f7ffb3'; ctx.lineWidth = 1.5 / zoom; ctx.setLineDash([5 / zoom, 6 / zoom]);
      ctx.beginPath(); ctx.arc(0, 0, r + 10 / zoom, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.restore();
  }
  for (const particle of view.particles) {
    particle.age += Math.min(0.04, dt); particle.x += particle.vx * dt; particle.y += particle.vy * dt;
    if (particle.age >= particle.life) continue;
    ctx.globalAlpha = Math.max(0, 1 - particle.age / particle.life); ctx.fillStyle = particle.color;
    if (particle.text) { ctx.textAlign = 'center'; ctx.font = '800 22px ui-monospace, monospace'; ctx.fillText(particle.text, particle.x, particle.y); }
    else { ctx.beginPath(); ctx.arc(particle.x, particle.y, 3 * (1 - particle.age / particle.life), 0, Math.PI * 2); ctx.fill(); }
  }
  view.particles = view.particles.filter(particle => particle.age < particle.life);
  ctx.globalAlpha = 1; ctx.restore();
  // A small map gives the open world an edge and helps avoid corner traps.
  const size = width < 540 ? 74 : 94;
  const mx = width - size - 18;
  const my = height - size - 95;
  if (height > 350) {
    ctx.save(); ctx.fillStyle = '#071225b8'; ctx.strokeStyle = '#45607970'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(mx, my, size, size, 9); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#94bbd52b';
    ctx.strokeRect(mx + clamp(left / WORLD_SIZE, 0, 1) * size, my + clamp(top / WORLD_SIZE, 0, 1) * size,
      Math.min(right / WORLD_SIZE, 1) * size - clamp(left / WORLD_SIZE, 0, 1) * size,
      Math.min(bottom / WORLD_SIZE, 1) * size - clamp(top / WORLD_SIZE, 0, 1) * size);
    for (const cell of arena.cells) {
      ctx.fillStyle = cell.owner === 0 ? '#ffffff' : COLORS[cell.owner % COLORS.length]; ctx.globalAlpha = cell.owner === 0 ? 1 : 0.5;
      ctx.beginPath(); ctx.arc(mx + cell.x / WORLD_SIZE * size, my + cell.y / WORLD_SIZE * size, cell.owner === 0 ? 3 : 1.8, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
}
