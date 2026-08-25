import React, { useState, useEffect, useCallback, useRef } from 'react';
import { sound } from '../utils/audio';
import {
  ArrowLeft,
  RotateCcw,
  Undo2,
  Trophy,
  Zap,
  Award,
  Bomb,
  Shuffle,
  TrendingUp,
} from 'lucide-react';

const HIGH_SCORE_KEY = '2048_high_score';

interface Game2048Props {
  onBackToHub: () => void;
  isDark: boolean;
  isFullscreen?: boolean;
}

type GridMode = 3 | 4 | 5;

export interface TileItem {
  id: number;
  row: number;
  col: number;
  value: number;
  isNew?: boolean;
  isMerged?: boolean;
}

interface FloatingText {
  id: number;
  text: string;
  x: number;
  y: number;
}

interface HistoryState {
  tiles: TileItem[];
  score: number;
  moves: number;
}

let nextTileId = 1;

export const Game2048: React.FC<Game2048Props> = ({
  onBackToHub,
  isDark,
  isFullscreen = false,
}) => {
  const [gridSize, setGridSize] = useState<GridMode>(4);
  const [tiles, setTiles] = useState<TileItem[]>([]);
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  const [moves, setMoves] = useState<number>(0);
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [hasWon, setHasWon] = useState<boolean>(false);
  const [keepPlaying, setKeepPlaying] = useState<boolean>(false);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [isMoving, setIsMoving] = useState<boolean>(false);

  // パワーアップスキルのストック
  const [bombStock, setBombStock] = useState<number>(3);
  const [shuffleStock, setShuffleStock] = useState<number>(2);
  const [doubleStock, setDoubleStock] = useState<number>(2);

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  // ハイスコア読み込み
  useEffect(() => {
    const saved = localStorage.getItem(`${HIGH_SCORE_KEY}_${gridSize}`);
    if (saved) {
      setHighScore(parseInt(saved, 10) || 0);
    } else {
      setHighScore(0);
    }
  }, [gridSize]);

  const updateHighScore = useCallback(
    (newScore: number) => {
      setHighScore((prev) => {
        if (newScore > prev) {
          localStorage.setItem(`${HIGH_SCORE_KEY}_${gridSize}`, newScore.toString());
          return newScore;
        }
        return prev;
      });
    },
    [gridSize]
  );

  // 空きマス取得
  const getEmptyCoords = (currentTiles: TileItem[], size: number): [number, number][] => {
    const occupied = new Set(currentTiles.map((t) => `${t.row},${t.col}`));
    const empty: [number, number][] = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!occupied.has(`${r},${c}`)) {
          empty.push([r, c]);
        }
      }
    }
    return empty;
  };

  // ランダムタイル生成
  const generateRandomTile = (currentTiles: TileItem[], size: number): TileItem | null => {
    const empty = getEmptyCoords(currentTiles, size);
    if (empty.length === 0) return null;
    const [row, col] = empty[Math.floor(Math.random() * empty.length)];
    return {
      id: nextTileId++,
      row,
      col,
      value: Math.random() < 0.9 ? 2 : 4,
      isNew: true,
    };
  };

  // 初期タイル配置
  const initGameTiles = (size: number): TileItem[] => {
    const t1 = {
      id: nextTileId++,
      row: Math.floor(Math.random() * size),
      col: Math.floor(Math.random() * size),
      value: 2,
      isNew: true,
    };
    let r2 = Math.floor(Math.random() * size);
    let c2 = Math.floor(Math.random() * size);
    while (r2 === t1.row && c2 === t1.col) {
      r2 = Math.floor(Math.random() * size);
      c2 = Math.floor(Math.random() * size);
    }
    const t2 = {
      id: nextTileId++,
      row: r2,
      col: c2,
      value: Math.random() < 0.9 ? 2 : 4,
      isNew: true,
    };
    return [t1, t2];
  };

  // 初回ゲーム開始
  useEffect(() => {
    setTiles(initGameTiles(gridSize));
  }, [gridSize]);

  // リスタート
  const restartGame = useCallback(
    (size = gridSize) => {
      setTiles(initGameTiles(size));
      setScore(0);
      setMoves(0);
      setHistory([]);
      setIsGameOver(false);
      setHasWon(false);
      setKeepPlaying(false);
      setBombStock(3);
      setShuffleStock(2);
      setDoubleStock(2);
      setFloatingTexts([]);
    },
    [gridSize]
  );

  // モード（サイズ）変更
  const handleSizeChange = (newSize: GridMode) => {
    if (newSize === gridSize) return;
    setGridSize(newSize);
    restartGame(newSize);
  };

  // 1手戻す (Undo)
  const undo = () => {
    if (history.length === 0 || isGameOver) return;
    const last = history[history.length - 1];
    setTiles(last.tiles);
    setScore(last.score);
    setMoves(last.moves);
    setHistory((prev) => prev.slice(0, prev.length - 1));
    sound.playTileMove();
  };

  // 浮遊テキスト追加
  const addFloatingText = (text: string) => {
    const id = Date.now() + Math.random();
    setFloatingTexts((prev) => [...prev, { id, text, x: 50 + (Math.random() * 20 - 10), y: 40 }]);
    setTimeout(() => {
      setFloatingTexts((prev) => prev.filter((item) => item.id !== id));
    }, 1000);
  };

  // --- パワーアップスキル 1: ボム (最小のタイルを1つ消去) ---
  const useBombSkill = () => {
    if (bombStock <= 0 || isGameOver || isMoving) return;
    let minVal = Infinity;
    tiles.forEach((t) => {
      if (t.value < minVal) minVal = t.value;
    });

    if (minVal === Infinity) return;

    const minTiles = tiles.filter((t) => t.value === minVal);
    const target = minTiles[Math.floor(Math.random() * minTiles.length)];

    setHistory((prev) => [...prev, { tiles: tiles.map((t) => ({ ...t })), score, moves }]);
    setTiles((prev) => prev.filter((t) => t.id !== target.id));
    setBombStock((prev) => prev - 1);
    sound.playExplosion();
    addFloatingText(`💣 -${minVal}`);
  };

  // --- パワーアップスキル 2: シャッフル (全タイルの位置を再配置) ---
  const useShuffleSkill = () => {
    if (shuffleStock <= 0 || isGameOver || isMoving || tiles.length <= 1) return;

    const allCoords: [number, number][] = [];
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        allCoords.push([r, c]);
      }
    }
    // シャッフル
    for (let i = allCoords.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allCoords[i], allCoords[j]] = [allCoords[j], allCoords[i]];
    }

    setHistory((prev) => [...prev, { tiles: tiles.map((t) => ({ ...t })), score, moves }]);
    setTiles((prev) =>
      prev.map((t, idx) => ({
        ...t,
        row: allCoords[idx][0],
        col: allCoords[idx][1],
        isNew: false,
        isMerged: true,
      }))
    );
    setShuffleStock((prev) => prev - 1);
    sound.playPowerup();
    addFloatingText('🔄 SHUFFLE!');
  };

  // --- パワーアップスキル 3: 2倍化 (最小タイルを2倍に昇格) ---
  const useDoubleSkill = () => {
    if (doubleStock <= 0 || isGameOver || isMoving || tiles.length === 0) return;
    let minVal = Infinity;
    tiles.forEach((t) => {
      if (t.value < minVal) minVal = t.value;
    });

    if (minVal === Infinity) return;

    const minTiles = tiles.filter((t) => t.value === minVal);
    const target = minTiles[Math.floor(Math.random() * minTiles.length)];

    const addedScore = minVal * 2;
    const nextScore = score + addedScore;

    setHistory((prev) => [...prev, { tiles: tiles.map((t) => ({ ...t })), score, moves }]);
    setTiles((prev) =>
      prev.map((t) =>
        t.id === target.id
          ? { ...t, value: minVal * 2, isMerged: true }
          : t
      )
    );
    setScore(nextScore);
    updateHighScore(nextScore);
    setDoubleStock((prev) => prev - 1);
    sound.playTileMerge(minVal * 2);
    addFloatingText(`⚡ x2 (+${addedScore})`);
  };

  // ゲームオーバー判定
  const checkGameOver = (currentTiles: TileItem[], size: number): boolean => {
    if (currentTiles.length < size * size) return false;
    const grid: number[][] = Array(size)
      .fill(null)
      .map(() => Array(size).fill(0));
    currentTiles.forEach((t) => {
      grid[t.row][t.col] = t.value;
    });

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const val = grid[r][c];
        if (r < size - 1 && grid[r + 1][c] === val) return false;
        if (c < size - 1 && grid[r][c + 1] === val) return false;
      }
    }
    return true;
  };

  // スライドアニメーション付き移動処理
  const move = useCallback(
    (direction: 'up' | 'down' | 'left' | 'right') => {
      if (isGameOver || isMoving) return;
      if (hasWon && !keepPlaying) return;

      const size = gridSize;
      let hasMoved = false;
      let addedScore = 0;
      let maxMergedVal = 0;

      // 2Dグリッドマップを作成
      const grid: (TileItem | null)[][] = Array(size)
        .fill(null)
        .map(() => Array(size).fill(null));
      tiles.forEach((t) => {
        grid[t.row][t.col] = { ...t, isNew: false, isMerged: false };
      });

      const nextTiles: TileItem[] = [];

      const processLine = (line: (TileItem | null)[], getCoord: (idx: number) => [number, number]) => {
        const nonNulls = line.filter((t): t is TileItem => t !== null);
        let targetIdx = 0;

        for (let i = 0; i < nonNulls.length; i++) {
          const current = nonNulls[i];
          if (i < nonNulls.length - 1 && nonNulls[i].value === nonNulls[i + 1].value) {
            // 合体
            const [tr, tc] = getCoord(targetIdx);
            const mergedValue = current.value * 2;

            // 新しく合体生成されるタイル
            const mergedTile: TileItem = {
              id: nextTileId++,
              row: tr,
              col: tc,
              value: mergedValue,
              isMerged: true,
            };
            nextTiles.push(mergedTile);

            addedScore += mergedValue;
            if (mergedValue > maxMergedVal) maxMergedVal = mergedValue;
            if (mergedValue === 2048 && !hasWon && !keepPlaying) {
              setHasWon(true);
              sound.playWin();
            }

            hasMoved = true;
            i++; // 次のタイルを消費
            targetIdx++;
          } else {
            // 単独移動
            const [tr, tc] = getCoord(targetIdx);
            if (current.row !== tr || current.col !== tc) {
              hasMoved = true;
            }
            nextTiles.push({
              ...current,
              row: tr,
              col: tc,
            });
            targetIdx++;
          }
        }
      };

      if (direction === 'left') {
        for (let r = 0; r < size; r++) {
          processLine(grid[r], (c) => [r, c]);
        }
      } else if (direction === 'right') {
        for (let r = 0; r < size; r++) {
          const reversed = [...grid[r]].reverse();
          processLine(reversed, (idx) => [r, size - 1 - idx]);
        }
      } else if (direction === 'up') {
        for (let c = 0; c < size; c++) {
          const colLine = grid.map((row) => row[c]);
          processLine(colLine, (r) => [r, c]);
        }
      } else if (direction === 'down') {
        for (let c = 0; c < size; c++) {
          const colLine = grid.map((row) => row[c]).reverse();
          processLine(colLine, (idx) => [size - 1 - idx, c]);
        }
      }

      if (!hasMoved) return;

      setIsMoving(true);

      // 履歴保存 (最大10手)
      setHistory((prev) => {
        const updated = [...prev, { tiles: tiles.map((t) => ({ ...t })), score, moves }];
        return updated.slice(-10);
      });

      // 新しいランダムタイルを追加
      const newRandomTile = generateRandomTile(nextTiles, size);
      const finalTiles = newRandomTile ? [...nextTiles, newRandomTile] : nextTiles;

      setTiles(finalTiles);

      const nextMoves = moves + 1;
      setMoves(nextMoves);

      const updatedScore = score + addedScore;
      setScore(updatedScore);
      updateHighScore(updatedScore);

      if (addedScore > 0) {
        addFloatingText(`+${addedScore}`);
      }

      if (maxMergedVal > 0) {
        sound.playTileMerge(maxMergedVal);
      } else {
        sound.playTileMove();
      }

      // ゲームオーバー判定
      if (checkGameOver(finalTiles, size)) {
        setIsGameOver(true);
        sound.playGameOver();
      }

      setTimeout(() => {
        setIsMoving(false);
      }, 200);
    },
    [tiles, score, moves, isGameOver, isMoving, hasWon, keepPlaying, gridSize, updateHighScore]
  );

  // キーボードイベント
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.code) {
        case 'ArrowUp':
        case 'KeyW':
          e.preventDefault();
          move('up');
          break;
        case 'ArrowDown':
        case 'KeyS':
          e.preventDefault();
          move('down');
          break;
        case 'ArrowLeft':
        case 'KeyA':
          e.preventDefault();
          move('left');
          break;
        case 'ArrowRight':
        case 'KeyD':
          e.preventDefault();
          move('right');
          break;
        case 'KeyZ':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            undo();
          }
          break;
        case 'KeyR':
          e.preventDefault();
          restartGame();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [move, restartGame]);

  // タッチスワイプハンドラ
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || e.changedTouches.length === 0) return;
    const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
    const deltaY = e.changedTouches[0].clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    const minSwipe = 25;
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (Math.abs(deltaX) > minSwipe) {
        if (deltaX > 0) move('right');
        else move('left');
      }
    } else {
      if (Math.abs(deltaY) > minSwipe) {
        if (deltaY > 0) move('down');
        else move('up');
      }
    }
  };

  // 盤面上の最大タイル値
  const getMaxTile = (): number => {
    let max = 0;
    tiles.forEach((t) => {
      if (t.value > max) max = t.value;
    });
    return max;
  };

  // タイルのスタイル
  const getTileStyle = (val: number) => {
    switch (val) {
      case 2:
        return 'bg-[#eee4da] text-[#776e65]';
      case 4:
        return 'bg-[#ede0c8] text-[#776e65]';
      case 8:
        return 'bg-[#f2b179] text-[#f9f6f2] font-bold';
      case 16:
        return 'bg-[#f59563] text-[#f9f6f2] font-bold';
      case 32:
        return 'bg-[#f67c5f] text-[#f9f6f2] font-black';
      case 64:
        return 'bg-[#f65e3b] text-[#f9f6f2] font-black';
      case 128:
        return 'bg-[#edcf72] text-[#f9f6f2] font-black shadow-sm';
      case 256:
        return 'bg-[#edcc61] text-[#f9f6f2] font-black shadow-sm';
      case 512:
        return 'bg-[#edc850] text-[#f9f6f2] font-black shadow-sm';
      case 1024:
        return 'bg-[#edc53f] text-[#f9f6f2] font-black shadow-md';
      case 2048:
        return 'bg-[#edc22e] text-[#f9f6f2] font-black shadow-lg border-2 border-amber-300';
      case 4096:
        return 'bg-[#3b82f6] text-white font-black shadow-lg border-2 border-sky-300';
      case 8192:
        return 'bg-[#8b5cf6] text-white font-black shadow-lg border-2 border-purple-300';
      default:
        return val > 8192
          ? 'bg-[#10b981] text-white font-black shadow-lg border-2 border-emerald-300'
          : isDark
          ? 'bg-slate-800/80 text-transparent'
          : 'bg-slate-200/80 text-transparent';
    }
  };

  const maxTileVal = getMaxTile();

  return (
    <div
      className="w-full flex flex-col items-center select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* CSSアニメーション定義 */}
      <style>{`
        @keyframes tile-appear {
          0% { opacity: 0; transform: scale(0.2); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes tile-pop {
          0% { transform: scale(0.85); }
          50% { transform: scale(1.18); }
          100% { transform: scale(1); }
        }
        .tile-animate-new {
          animation: tile-appear 220ms cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        .tile-animate-merged {
          animation: tile-pop 240ms cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }
        .tile-smooth-slide {
          transition: left 220ms cubic-bezier(0.2, 0.9, 0.3, 1), top 220ms cubic-bezier(0.2, 0.9, 0.3, 1);
        }
      `}</style>

      {/* 上部ヘッダーナビゲーション */}
      <div
        className={`w-full flex items-center justify-between mb-3 transition-all ${
          isFullscreen ? 'w-[min(94vw,calc(100vh-140px))] max-w-[560px]' : 'w-full max-w-[460px]'
        }`}
      >
        <button
          onClick={onBackToHub}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl border transition cursor-pointer ${
            isDark
              ? 'text-slate-300 hover:text-white bg-slate-900 border-slate-800 hover:bg-slate-800'
              : 'text-slate-700 hover:text-slate-900 bg-white border-slate-200 hover:bg-slate-50 shadow-xs'
          }`}
        >
          <ArrowLeft className="w-4 h-4 text-indigo-500" />
          ゲーム一覧に戻る
        </button>

        {/* グリッドサイズ切替 (3x3 / 4x4 / 5x5) */}
        <div className="flex items-center gap-1 bg-slate-800/60 p-1 rounded-xl border border-slate-700/60 text-xs font-bold">
          {([3, 4, 5] as GridMode[]).map((sz) => (
            <button
              key={sz}
              onClick={() => handleSizeChange(sz)}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                gridSize === sz
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {sz}x{sz}
            </button>
          ))}
        </div>
      </div>

      {/* スコア・ベスト・最大タイル表示 */}
      <div
        className={`w-full flex items-center justify-between mb-3 transition-all ${
          isFullscreen ? 'w-[min(94vw,calc(100vh-140px))] max-w-[560px]' : 'w-full max-w-[460px]'
        }`}
      >
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight">2048</h1>
            {maxTileVal >= 128 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-bold font-mono">
                MAX: {maxTileVal}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            手数: <span className="font-mono font-bold">{moves}</span>
          </p>
        </div>

        <div className="flex gap-2">
          <div
            className={`relative px-3.5 py-1.5 rounded-2xl border text-center min-w-[70px] ${
              isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-xs'
            }`}
          >
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-center gap-1">
              <Zap className="w-3 h-3 text-amber-500" />
              SCORE
            </div>
            <div className="text-base sm:text-lg font-mono font-black mt-0.5">{score}</div>

            {/* 浮遊スコアエフェクト */}
            {floatingTexts.map((f) => (
              <div
                key={f.id}
                className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-black text-amber-400 animate-out fade-out slide-out-to-top-3 duration-1000 pointer-events-none"
              >
                {f.text}
              </div>
            ))}
          </div>

          <div
            className={`px-3.5 py-1.5 rounded-2xl border text-center min-w-[70px] ${
              isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-xs'
            }`}
          >
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-center gap-1">
              <Trophy className="w-3 h-3 text-amber-500" />
              BEST
            </div>
            <div className="text-base sm:text-lg font-mono font-bold text-amber-500 mt-0.5">{highScore}</div>
          </div>
        </div>
      </div>

      {/* パワーアップスキルバー */}
      <div
        className={`w-full flex items-center justify-between gap-2 mb-3 transition-all ${
          isFullscreen ? 'w-[min(94vw,calc(100vh-140px))] max-w-[560px]' : 'w-full max-w-[460px]'
        }`}
      >
        <div className="flex items-center gap-1.5 text-xs font-bold">
          <span className="text-[11px] text-slate-400 font-sans hidden sm:inline">SKILLS:</span>
          {/* ボムスキル */}
          <button
            onClick={useBombSkill}
            disabled={bombStock <= 0 || isGameOver || isMoving}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
              bombStock > 0 && !isGameOver
                ? 'bg-rose-500/15 border-rose-500/40 text-rose-400 hover:bg-rose-500/25 active:scale-95'
                : 'opacity-40 cursor-not-allowed bg-slate-900 border-slate-800 text-slate-500'
            }`}
            title="最小タイルを1つ爆破消去"
          >
            <Bomb className="w-3.5 h-3.5 text-rose-500" />
            <span>ボム ({bombStock})</span>
          </button>

          {/* シャッフルスキル */}
          <button
            onClick={useShuffleSkill}
            disabled={shuffleStock <= 0 || isGameOver || isMoving}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
              shuffleStock > 0 && !isGameOver
                ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-400 hover:bg-indigo-500/25 active:scale-95'
                : 'opacity-40 cursor-not-allowed bg-slate-900 border-slate-800 text-slate-500'
            }`}
            title="盤面タイルをシャッフル"
          >
            <Shuffle className="w-3.5 h-3.5 text-indigo-400" />
            <span>シャッフル ({shuffleStock})</span>
          </button>

          {/* 2倍化スキル */}
          <button
            onClick={useDoubleSkill}
            disabled={doubleStock <= 0 || isGameOver || isMoving}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
              doubleStock > 0 && !isGameOver
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-400 hover:bg-amber-500/25 active:scale-95'
                : 'opacity-40 cursor-not-allowed bg-slate-900 border-slate-800 text-slate-500'
            }`}
            title="最小タイルを2倍に昇格"
          >
            <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
            <span>2倍化 ({doubleStock})</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={undo}
            disabled={history.length === 0 || isGameOver || isMoving}
            className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-xl border transition cursor-pointer ${
              history.length === 0 || isGameOver
                ? 'opacity-40 cursor-not-allowed border-transparent text-slate-500'
                : isDark
                ? 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200'
                : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700 shadow-xs'
            }`}
            title="1手戻す"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span className="text-[11px]">Undo ({history.length})</span>
          </button>

          <button
            onClick={() => restartGame()}
            className={`p-1.5 text-xs font-bold rounded-xl border transition cursor-pointer ${
              isDark
                ? 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200'
                : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700 shadow-xs'
            }`}
            title="リスタート"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2048 ボード (背景グリッド + スムーズスライドタイルレイヤー) */}
      <div
        className={`relative rounded-3xl p-2.5 sm:p-3.5 border shadow-xl transition-all duration-300 ${
          isDark ? 'bg-slate-900/95 border-slate-800' : 'bg-[#bbada0] border-[#bbada0] shadow-md'
        } ${
          isFullscreen
            ? 'w-[min(94vw,calc(100vh-140px))] max-w-[560px] aspect-square my-auto'
            : 'w-full max-w-[460px] aspect-square'
        }`}
      >
        {/* 背景空グリッドセル */}
        <div
          className="w-full h-full grid gap-2 sm:gap-3"
          style={{
            gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${gridSize}, minmax(0, 1fr))`,
          }}
        >
          {Array(gridSize * gridSize)
            .fill(null)
            .map((_, idx) => (
              <div
                key={idx}
                className={`w-full h-full aspect-square rounded-2xl ${
                  isDark ? 'bg-slate-800/60' : 'bg-[#cdc1b4]/70'
                }`}
              />
            ))}
        </div>

        {/* スムーズに移動するタイルレイヤー */}
        <div className="absolute inset-2.5 sm:inset-3.5 pointer-events-none">
          {tiles.map((tile) => {
            const tileSizePercent = 100 / gridSize;
            const top = `${tile.row * tileSizePercent}%`;
            const left = `${tile.col * tileSizePercent}%`;
            const width = `${tileSizePercent}%`;
            const height = `${tileSizePercent}%`;

            const animClass = tile.isNew
              ? 'tile-animate-new'
              : tile.isMerged
              ? 'tile-animate-merged'
              : '';

            return (
              <div
                key={tile.id}
                className="absolute tile-smooth-slide p-1 sm:p-1.5"
                style={{
                  top,
                  left,
                  width,
                  height,
                }}
              >
                <div
                  className={`w-full h-full rounded-2xl flex items-center justify-center font-mono select-none shadow-sm transition-colors ${getTileStyle(
                    tile.value
                  )} ${animClass} ${
                    gridSize === 5
                      ? tile.value >= 1024
                        ? 'text-xs sm:text-base font-black'
                        : 'text-sm sm:text-lg font-bold'
                      : gridSize === 3
                      ? tile.value >= 1024
                        ? 'text-2xl sm:text-3xl font-black'
                        : 'text-3xl sm:text-5xl font-black'
                      : tile.value >= 1024
                      ? 'text-base sm:text-xl font-black'
                      : 'text-2xl sm:text-4xl font-black'
                  }`}
                >
                  {tile.value}
                </div>
              </div>
            );
          })}
        </div>

        {/* 勝利モーダル */}
        {hasWon && !keepPlaying && (
          <div className="absolute inset-0 bg-amber-500/85 backdrop-blur-xs rounded-3xl flex flex-col items-center justify-center p-6 text-white text-center space-y-4 animate-in zoom-in-95 duration-200 z-20">
            <div className="p-3 bg-white/20 rounded-full">
              <Award className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-4xl font-black">2048 達成！</h2>
            <p className="text-sm font-medium">おめでとうございます！さらに4096を目指しますか？</p>
            <div className="flex gap-3 mt-2">
              <button
                onClick={() => setKeepPlaying(true)}
                className="px-5 py-2.5 bg-white text-amber-600 font-bold rounded-xl shadow-lg hover:bg-slate-100 transition cursor-pointer"
              >
                プレイを続ける
              </button>
              <button
                onClick={() => restartGame()}
                className="px-5 py-2.5 bg-amber-700/60 hover:bg-amber-700 text-white font-bold rounded-xl border border-white/30 transition cursor-pointer"
              >
                やり直す
              </button>
            </div>
          </div>
        )}

        {/* ゲームオーバーモーダル */}
        {isGameOver && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-xs rounded-3xl flex flex-col items-center justify-center p-6 text-white text-center space-y-4 animate-in zoom-in-95 duration-200 z-20">
            <h2 className="text-3xl sm:text-4xl font-black text-rose-500">GAME OVER</h2>
            <div className="text-xs text-slate-300 font-mono space-y-1">
              <div>SCORE: <span className="text-lg font-bold text-white">{score}</span></div>
              <div>BEST: <span className="font-bold text-amber-400">{highScore}</span></div>
              <div>MOVES: <span className="font-bold text-indigo-400">{moves}</span></div>
            </div>
            <div className="flex gap-2.5 mt-2">
              {history.length > 0 && (
                <button
                  onClick={() => {
                    setIsGameOver(false);
                    undo();
                  }}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg transition flex items-center gap-1.5 cursor-pointer text-xs"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  1手戻してやり直す
                </button>
              )}
              <button
                onClick={() => restartGame()}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl border border-slate-700 transition flex items-center gap-1.5 cursor-pointer text-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                リスタート
              </button>
            </div>
          </div>
        )}
      </div>

      {/* スマホ用操作補助 D-Pad */}
      <div className="w-full max-w-[320px] grid grid-cols-3 gap-2 mt-4 sm:hidden">
        <div />
        <button
          onClick={() => move('up')}
          className="py-3 bg-slate-800 active:bg-indigo-600 text-white font-bold rounded-xl border border-slate-700"
        >
          ▲
        </button>
        <div />
        <button
          onClick={() => move('left')}
          className="py-3 bg-slate-800 active:bg-indigo-600 text-white font-bold rounded-xl border border-slate-700"
        >
          ◀
        </button>
        <button
          onClick={() => move('down')}
          className="py-3 bg-slate-800 active:bg-indigo-600 text-white font-bold rounded-xl border border-slate-700"
        >
          ▼
        </button>
        <button
          onClick={() => move('right')}
          className="py-3 bg-slate-800 active:bg-indigo-600 text-white font-bold rounded-xl border border-slate-700"
        >
          ▶
        </button>
      </div>
    </div>
  );
};
