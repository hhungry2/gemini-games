export type DifficultyId = 'easy' | 'medium' | 'hard';

export interface DifficultyConfig {
  id: DifficultyId;
  name: string;
  rows: number;
  cols: number;
  mines: number;
}

export const DIFFICULTIES: Record<DifficultyId, DifficultyConfig> = {
  easy: {
    id: 'easy',
    name: '初級 (Easy)',
    rows: 9,
    cols: 9,
    mines: 10,
  },
  medium: {
    id: 'medium',
    name: '中級 (Medium)',
    rows: 16,
    cols: 16,
    mines: 40,
  },
  hard: {
    id: 'hard',
    name: '上級 (Hard)',
    rows: 16,
    cols: 30,
    mines: 99,
  },
};

export interface Cell {
  r: number;
  c: number;
  isMine: boolean;
  isRevealed: boolean;
  isFlagged: boolean;
  neighborMines: number;
  isExploded?: boolean;
}

export type MinesweeperStatus = 'idle' | 'playing' | 'won' | 'lost';

// 数字ごとのネオンカラー
export const NUMBER_COLORS: Record<number, { text: string; glow: string }> = {
  1: { text: 'text-cyan-400', glow: 'drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]' },
  2: { text: 'text-emerald-400', glow: 'drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]' },
  3: { text: 'text-rose-400', glow: 'drop-shadow-[0_0_8px_rgba(251,113,133,0.8)]' },
  4: { text: 'text-indigo-400', glow: 'drop-shadow-[0_0_8px_rgba(129,140,248,0.8)]' },
  5: { text: 'text-amber-400', glow: 'drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]' },
  6: { text: 'text-teal-300', glow: 'drop-shadow-[0_0_8px_rgba(94,234,212,0.8)]' },
  7: { text: 'text-fuchsia-400', glow: 'drop-shadow-[0_0_8px_rgba(232,121,249,0.8)]' },
  8: { text: 'text-slate-100', glow: 'drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]' },
};
