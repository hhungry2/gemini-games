import { Cell } from '../types/minesweeper';

export function createInitialGrid(rows: number, cols: number): Cell[][] {
  const grid: Cell[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < cols; c++) {
      row.push({
        r,
        c,
        isMine: false,
        isRevealed: false,
        isFlagged: false,
        neighborMines: 0,
      });
    }
    grid.push(row);
  }
  return grid;
}

// 初手安全保証付きの地雷配置
export function populateMines(
  grid: Cell[][],
  rows: number,
  cols: number,
  totalMines: number,
  firstR: number,
  firstC: number
): Cell[][] {
  const newGrid = grid.map((row) => row.map((cell) => ({ ...cell })));

  // 初手クリックのセル及びその周囲の座標リスト (地雷禁止ゾーン)
  const forbidden = new Set<string>();
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const nr = firstR + dr;
      const nc = firstC + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
        forbidden.add(`${nr},${nc}`);
      }
    }
  }

  // 地雷を配置可能な全座標
  const candidates: [number, number][] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!forbidden.has(`${r},${c}`)) {
        candidates.push([r, c]);
      }
    }
  }

  // 候補が足りない場合のフォールバック（極端に小さい盤面）
  if (candidates.length < totalMines) {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (r !== firstR || c !== firstC) {
          if (!candidates.some(([cr, cc]) => cr === r && cc === c)) {
            candidates.push([r, c]);
          }
        }
      }
    }
  }

  // シャッフルして地雷を配置
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  const placedMines = Math.min(totalMines, candidates.length);
  for (let i = 0; i < placedMines; i++) {
    const [mr, mc] = candidates[i];
    newGrid[mr][mc].isMine = true;
  }

  // 周囲の地雷数を計算
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (newGrid[r][c].isMine) continue;

      let count = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
            if (newGrid[nr][nc].isMine) count++;
          }
        }
      }
      newGrid[r][c].neighborMines = count;
    }
  }

  return newGrid;
}

// セルの開封 (連鎖展開を含む)
export function revealCell(
  grid: Cell[][],
  startR: number,
  startC: number,
  rows: number,
  cols: number
): {
  newGrid: Cell[][];
  hitMine: boolean;
  revealedCount: number;
} {
  const newGrid = grid.map((row) => row.map((cell) => ({ ...cell })));
  const target = newGrid[startR][startC];

  if (target.isFlagged || target.isRevealed) {
    return { newGrid, hitMine: false, revealedCount: 0 };
  }

  if (target.isMine) {
    target.isRevealed = true;
    target.isExploded = true;
    // 全ての地雷を表示
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (newGrid[r][c].isMine) {
          newGrid[r][c].isRevealed = true;
        }
      }
    }
    return { newGrid, hitMine: true, revealedCount: 1 };
  }

  let revealedCount = 0;
  const queue: [number, number][] = [[startR, startC]];
  target.isRevealed = true;
  revealedCount++;

  // BFS で 0 の周囲を連鎖展開
  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    const current = newGrid[r][c];

    if (current.neighborMines === 0) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr;
          const nc = c + dc;

          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
            const neighbor = newGrid[nr][nc];
            if (!neighbor.isRevealed && !neighbor.isFlagged && !neighbor.isMine) {
              neighbor.isRevealed = true;
              revealedCount++;
              if (neighbor.neighborMines === 0) {
                queue.push([nr, nc]);
              }
            }
          }
        }
      }
    }
  }

  return { newGrid, hitMine: false, revealedCount };
}

// Chording (数字セル周囲の一括オープン)
export function chordCell(
  grid: Cell[][],
  r: number,
  c: number,
  rows: number,
  cols: number
): {
  newGrid: Cell[][];
  hitMine: boolean;
  revealedCount: number;
} {
  const current = grid[r][c];
  if (!current.isRevealed || current.neighborMines === 0) {
    return { newGrid: grid, hitMine: false, revealedCount: 0 };
  }

  // 周囲のフラグ数をカウント
  let flagCount = 0;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
        if (grid[nr][nc].isFlagged) flagCount++;
      }
    }
  }

  // フラグ数が一致していれば、未開封かつ未フラグのセルをオープン
  if (flagCount === current.neighborMines) {
    let workingGrid = grid;
    let hitMine = false;
    let totalRevealed = 0;

    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
          const neighbor = workingGrid[nr][nc];
          if (!neighbor.isRevealed && !neighbor.isFlagged) {
            const res = revealCell(workingGrid, nr, nc, rows, cols);
            workingGrid = res.newGrid;
            totalRevealed += res.revealedCount;
            if (res.hitMine) {
              hitMine = true;
            }
          }
        }
      }
    }

    return { newGrid: workingGrid, hitMine, revealedCount: totalRevealed };
  }

  return { newGrid: grid, hitMine: false, revealedCount: 0 };
}

// 勝利判定
export function checkWinCondition(grid: Cell[][], rows: number, cols: number): boolean {
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = grid[r][c];
      // 地雷でないセルが1つでも開いていなければまだ未勝利
      if (!cell.isMine && !cell.isRevealed) {
        return false;
      }
    }
  }
  return true;
}
