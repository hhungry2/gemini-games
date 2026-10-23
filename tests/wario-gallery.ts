import { RUSH_GAMES, createRushSession, emptyRushInput, startRush, stepRush } from '../src/games/wario/engine';
import { renderRush } from '../src/games/wario/render';

// Browser-only regression gallery. Vite does not include test entries in dist.
const host = document.querySelector<HTMLElement>('#gallery')!;
const failures: string[] = [];
for (const [index, definition] of RUSH_GAMES.entries()) {
  const card = document.createElement('article');
  const title = document.createElement('h2');
  title.textContent = `${definition.number} · ${definition.name}`;
  const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 480;
  canvas.setAttribute('aria-label', definition.name);
  const hint = document.createElement('p'); hint.textContent = definition.hint;
  card.append(title, canvas, hint); host.append(card);
  try {
    const state = createRushSession(2048 + index), input = emptyRushInput();
    startRush(state, input, definition.id);
    for (let frame = 0; frame < 150 && state.phase === 'brief'; frame++) stepRush(state, input, 1 / 60);
    for (let frame = 0; frame < 18; frame++) stepRush(state, input, 1 / 60);
    renderRush(canvas.getContext('2d')!, state, 1);
  } catch (error) { failures.push(`${definition.id}: ${String(error)}`); }
}
document.querySelector('#status')!.textContent = failures.length ? failures.join(' / ') : `${RUSH_GAMES.length} scenes / 0 errors`;
Object.assign(window, { warioGalleryResult: { scenes: RUSH_GAMES.length, failures } });
