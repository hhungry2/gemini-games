import type { GameDifficulty, GwGameId } from './types';

export function readBest(game: GwGameId, difficulty: GameDifficulty): number {
  try {
    const value = Number(localStorage.getItem(`gw_${game}_${difficulty}`));
    return Number.isSafeInteger(value) && value >= 0 ? value : 0;
  } catch {
    return 0;
  }
}

export function saveBest(game: GwGameId, difficulty: GameDifficulty, score: number) {
  try {
    localStorage.setItem(`gw_${game}_${difficulty}`, Math.max(readBest(game, difficulty), score).toString());
  } catch {
    // The current session remains playable if browser storage is unavailable.
  }
}
