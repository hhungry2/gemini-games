import {
  BoardMatrix,
  Piece,
  TetrominoType,
  BOARD_WIDTH,
  BOARD_HEIGHT,
  TETROMINO_SHAPES,
} from '../types/tetris';

export function createEmptyBoard(): BoardMatrix {
  return Array.from({ length: BOARD_HEIGHT }, () =>
    Array(BOARD_WIDTH).fill(null)
  );
}

// 7-bag ランダマイザー
export function generateBag(): TetrominoType[] {
  const types: TetrominoType[] = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
  for (let i = types.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [types[i], types[j]] = [types[j], types[i]];
  }
  return types;
}

export function createPiece(type: TetrominoType): Piece {
  const shape = TETROMINO_SHAPES[type].map((row) => [...row]);
  const width = shape[0].length;
  const x = Math.floor((BOARD_WIDTH - width) / 2);
  const y = type === 'I' ? -1 : 0;
  return { type, shape, x, y };
}

// 衝突判定
export function checkCollision(
  piece: Piece,
  board: BoardMatrix,
  offsetX = 0,
  offsetY = 0,
  shape = piece.shape
): boolean {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (shape[r][c] !== 0) {
        const newX = piece.x + c + offsetX;
        const newY = piece.y + r + offsetY;

        // 壁や底の判定
        if (newX < 0 || newX >= BOARD_WIDTH || newY >= BOARD_HEIGHT) {
          return true;
        }

        // ボード上の既存ブロックとの判定 (y >= 0 の場合)
        if (newY >= 0 && board[newY][newX] !== null) {
          return true;
        }
      }
    }
  }
  return false;
}

// 行列の90度時計回り回転
export function rotateMatrix(matrix: number[][]): number[][] {
  const N = matrix.length;
  const result: number[][] = Array.from({ length: N }, () => Array(N).fill(0));
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      result[c][N - 1 - r] = matrix[r][c];
    }
  }
  return result;
}

// 回転とウォールキック（壁蹴り）
export function tryRotate(piece: Piece, board: BoardMatrix): Piece | null {
  if (piece.type === 'O') return piece; // Oミノは回転不要

  const rotatedShape = rotateMatrix(piece.shape);
  // キックのオフセット試行リスト (標準, 左右1マス, 左右2マス, 上1マス)
  const kicks = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: -1 },
    { x: 2, y: 0 },
    { x: -2, y: 0 },
  ];

  for (const kick of kicks) {
    if (!checkCollision(piece, board, kick.x, kick.y, rotatedShape)) {
      return {
        ...piece,
        shape: rotatedShape,
        x: piece.x + kick.x,
        y: piece.y + kick.y,
      };
    }
  }
  return null;
}

// ゴーストブロック（落下予測位置）の算出
export function getGhostPosition(piece: Piece, board: BoardMatrix): number {
  let offsetY = 0;
  while (!checkCollision(piece, board, 0, offsetY + 1)) {
    offsetY++;
  }
  return piece.y + offsetY;
}

// ボードへのピース固定
export function mergePieceToBoard(piece: Piece, board: BoardMatrix): BoardMatrix {
  const newBoard = board.map((row) => [...row]);
  for (let r = 0; r < piece.shape.length; r++) {
    for (let c = 0; c < piece.shape[r].length; c++) {
      if (piece.shape[r][c] !== 0) {
        const boardY = piece.y + r;
        const boardX = piece.x + c;
        if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
          newBoard[boardY][boardX] = piece.type;
        }
      }
    }
  }
  return newBoard;
}

// ライン消去
export function clearFullLines(board: BoardMatrix): {
  newBoard: BoardMatrix;
  linesCleared: number;
  clearedRowIndices: number[];
} {
  const clearedRowIndices: number[] = [];
  const remainingRows = board.filter((row, idx) => {
    const isFull = row.every((cell) => cell !== null);
    if (isFull) {
      clearedRowIndices.push(idx);
      return false;
    }
    return true;
  });

  const linesCleared = BOARD_HEIGHT - remainingRows.length;
  const newRows = Array.from({ length: linesCleared }, () =>
    Array(BOARD_WIDTH).fill(null)
  );

  return {
    newBoard: [...newRows, ...remainingRows],
    linesCleared,
    clearedRowIndices,
  };
}

// スコア計算
export function calculateScore(lines: number, level: number): number {
  const linePoints = [0, 100, 300, 500, 800]; // 1, 2, 3, 4(Tetris)
  const base = linePoints[lines] || 0;
  return base * (level + 1);
}

// レベルに応じた落下間隔（ミリ秒）
export function getDropInterval(level: number): number {
  // レベルが上がるほど高速化 (最速約 80ms)
  return Math.max(80, Math.floor(1000 * Math.pow(0.8 - (level - 1) * 0.005, level - 1)));
}
