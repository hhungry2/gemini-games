export type TetrominoType = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z';

export type CellValue = TetrominoType | null;

export type BoardMatrix = CellValue[][];

export interface Position {
  x: number;
  y: number;
}

export interface Piece {
  type: TetrominoType;
  shape: number[][];
  x: number;
  y: number;
}

export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;

export const TETROMINO_SHAPES: Record<TetrominoType, number[][]> = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
};

export const TETROMINO_COLORS: Record<TetrominoType, {
  main: string;
  glow: string;
  border: string;
  ghost: string;
}> = {
  I: {
    main: 'bg-cyan-400',
    glow: 'shadow-[0_0_12px_rgba(34,211,238,0.7)]',
    border: 'border-cyan-200',
    ghost: 'border-cyan-400/40 bg-cyan-400/10',
  },
  J: {
    main: 'bg-blue-500',
    glow: 'shadow-[0_0_12px_rgba(59,130,246,0.7)]',
    border: 'border-blue-300',
    ghost: 'border-blue-500/40 bg-blue-500/10',
  },
  L: {
    main: 'bg-orange-500',
    glow: 'shadow-[0_0_12px_rgba(249,115,22,0.7)]',
    border: 'border-orange-300',
    ghost: 'border-orange-500/40 bg-orange-500/10',
  },
  O: {
    main: 'bg-amber-400',
    glow: 'shadow-[0_0_12px_rgba(251,191,36,0.7)]',
    border: 'border-amber-200',
    ghost: 'border-amber-400/40 bg-amber-400/10',
  },
  S: {
    main: 'bg-emerald-500',
    glow: 'shadow-[0_0_12px_rgba(16,185,129,0.7)]',
    border: 'border-emerald-300',
    ghost: 'border-emerald-500/40 bg-emerald-500/10',
  },
  T: {
    main: 'bg-purple-500',
    glow: 'shadow-[0_0_12px_rgba(168,85,247,0.7)]',
    border: 'border-purple-300',
    ghost: 'border-purple-500/40 bg-purple-500/10',
  },
  Z: {
    main: 'bg-rose-500',
    glow: 'shadow-[0_0_12px_rgba(244,63,94,0.7)]',
    border: 'border-rose-300',
    ghost: 'border-rose-500/40 bg-rose-500/10',
  },
};
