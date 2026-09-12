import { BoardCell, CellGimmick, SkillTriggerCondition } from './types';

export const BOARD_SIZE = 6;

// 8方向ベクトル
export const DIRECTIONS = [
  { dx: 0, dy: -1 }, // 上
  { dx: 0, dy: 1 },  // 下
  { dx: -1, dy: 0 }, // 左
  { dx: 1, dy: 0 },  // 右
  { dx: -1, dy: -1 },// 左上
  { dx: 1, dy: -1 }, // 右上
  { dx: -1, dy: 1 }, // 左下
  { dx: 1, dy: 1 },  // 右下
];

// 初期盤面生成
export function createInitialBoard(gimmicks?: { x: number; y: number; gimmick: CellGimmick }[]): BoardCell[][] {
  const board: BoardCell[][] = [];
  for (let y = 0; y < BOARD_SIZE; y++) {
    const row: BoardCell[] = [];
    for (let x = 0; x < BOARD_SIZE; x++) {
      let gimmick: CellGimmick = 'none';
      if (gimmicks) {
        const found = gimmicks.find((g) => g.x === x && g.y === y);
        if (found) gimmick = found.gimmick;
      }
      row.push({
        x,
        y,
        owner: null,
        piece: null,
        gimmick,
      });
    }
    board.push(row);
  }

  // オセロニア標準の初期配置 (6x6中央4マス)
  // (2, 2): プレイヤー, (3, 3): プレイヤー
  // (2, 3): 敵, (3, 2): 敵
  board[2][2].owner = 'player';
  board[3][3].owner = 'player';
  board[2][3].owner = 'enemy';
  board[3][2].owner = 'enemy';

  return board;
}

// 座標が盤面内か
export function isInBounds(x: number, y: number): boolean {
  return x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE;
}

// 指定マスに置いた時にひっくり返せる相手のマス一覧を取得
export function getFlippableCells(
  board: BoardCell[][],
  startX: number,
  startY: number,
  currentTurn: 'player' | 'enemy'
): { flippedCells: { x: number; y: number }[]; bracketPieces: BoardCell[] } {
  if (!isInBounds(startX, startY)) {
    return { flippedCells: [], bracketPieces: [] };
  }
  // すでに駒があるマスやブロックマスには置けない
  if (board[startY][startX].owner !== null || board[startY][startX].gimmick === 'block') {
    return { flippedCells: [], bracketPieces: [] };
  }

  const opponent = currentTurn === 'player' ? 'enemy' : 'player';
  const allFlipped: { x: number; y: number }[] = [];
  const bracketPieces: BoardCell[] = [];

  for (const { dx, dy } of DIRECTIONS) {
    let curX = startX + dx;
    let curY = startY + dy;
    const lineFlipped: { x: number; y: number }[] = [];

    // 相手の石が続く間走査
    while (isInBounds(curX, curY) && board[curY][curX].owner === opponent) {
      lineFlipped.push({ x: curX, y: curY });
      curX += dx;
      curY += dy;
    }

    // 相手の石の先に自分の石があれば挟み成功
    if (
      lineFlipped.length > 0 &&
      isInBounds(curX, curY) &&
      board[curY][curX].owner === currentTurn
    ) {
      allFlipped.push(...lineFlipped);
      bracketPieces.push(board[curY][curX]);
    }
  }

  return { flippedCells: allFlipped, bracketPieces };
}

// 着手可能なすべてのマスをリストアップ
export function getValidMoves(
  board: BoardCell[][],
  currentTurn: 'player' | 'enemy'
): { x: number; y: number; flipsCount: number }[] {
  const validMoves: { x: number; y: number; flipsCount: number }[] = [];

  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (board[y][x].owner === null && board[y][x].gimmick !== 'block') {
        const { flippedCells } = getFlippableCells(board, x, y, currentTurn);
        if (flippedCells.length > 0) {
          validMoves.push({ x, y, flipsCount: flippedCells.length });
        }
      }
    }
  }

  return validMoves;
}

// ひっくり返し枚数に応じた通常攻撃ダメージ倍率
export function getFlipMultiplier(flipsCount: number): number {
  if (flipsCount <= 0) return 1.0;
  if (flipsCount === 1) return 1.2;
  if (flipsCount === 2) return 1.4;
  if (flipsCount === 3) return 1.6;
  if (flipsCount === 4) return 1.8;
  return 2.0; // 5枚以上
}

// スキル条件判定
export function isConditionMet(
  condition: SkillTriggerCondition,
  context: {
    flipsCount: number;
    currentHpPercent: number;
    board: BoardCell[][];
    currentTurn: 'player' | 'enemy';
    turnNumber: number;
  }
): boolean {
  switch (condition.type) {
    case 'always':
      return true;
    case 'flip_count':
      return context.flipsCount >= condition.minFlips;
    case 'hp_lte':
      return context.currentHpPercent <= condition.percent;
    case 'board_element_count': {
      let count = 0;
      for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
          const cell = context.board[y][x];
          if (cell.owner === context.currentTurn && cell.piece?.attribute === condition.attribute) {
            count++;
          }
        }
      }
      return count >= condition.minCount;
    }
    case 'turn_gte':
      return context.turnNumber >= condition.minTurn;
    default:
      return true;
  }
}

// 盤面石カウント
export function countBoardPieces(board: BoardCell[][]): { player: number; enemy: number; empty: number } {
  let player = 0;
  let enemy = 0;
  let empty = 0;
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (board[y][x].owner === 'player') player++;
      else if (board[y][x].owner === 'enemy') enemy++;
      else empty++;
    }
  }
  return { player, enemy, empty };
}

// 盤面上の指定オーナーの特定属性の駒数をカウント
export function countAttributePieces(
  board: BoardCell[][],
  owner: 'player' | 'enemy',
  attribute?: string
): number {
  let count = 0;
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      const cell = board[y][x];
      if (cell.owner === owner) {
        if (!attribute || cell.piece?.attribute === attribute) {
          count++;
        }
      }
    }
  }
  return count;
}

// 角マス判定
export function isCorner(x: number, y: number): boolean {
  return (
    (x === 0 && y === 0) ||
    (x === 0 && y === BOARD_SIZE - 1) ||
    (x === BOARD_SIZE - 1 && y === 0) ||
    (x === BOARD_SIZE - 1 && y === BOARD_SIZE - 1)
  );
}

// C打ち/X打ち判定 (角の隣の危険マス)
export function isDangerSquare(x: number, y: number): boolean {
  const corners = [
    { cx: 0, cy: 0 },
    { cx: BOARD_SIZE - 1, cy: 0 },
    { cx: 0, cy: BOARD_SIZE - 1 },
    { cx: BOARD_SIZE - 1, cy: BOARD_SIZE - 1 },
  ];
  for (const { cx, cy } of corners) {
    const dist = Math.abs(x - cx) + Math.abs(y - cy);
    if ((dist === 1 || (Math.abs(x - cx) === 1 && Math.abs(y - cy) === 1)) && !(x === cx && y === cy)) {
      return true;
    }
  }
  return false;
}
