import { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { TetrisBoard } from './components/TetrisBoard';
import { PiecePreview } from './components/HoldNextPanel';
import { MobileControls } from './components/Controls';
import {
  BoardMatrix,
  Piece,
  TetrominoType,
} from './types/tetris';
import {
  createEmptyBoard,
  generateBag,
  createPiece,
  checkCollision,
  tryRotate,
  getGhostPosition,
  mergePieceToBoard,
  clearFullLines,
  calculateScore,
  getDropInterval,
} from './utils/tetrisLogic';
import { sound } from './utils/audio';
import { Trophy, Zap, Layers } from 'lucide-react';

const HIGH_SCORE_KEY = 'tetris_high_score_v1';

export function App() {
  // ボードとピースの状態
  const [board, setBoard] = useState<BoardMatrix>(createEmptyBoard);
  const [currentPiece, setCurrentPiece] = useState<Piece | null>(null);
  const [, setBag] = useState<TetrominoType[]>([]);
  const [nextPieces, setNextPieces] = useState<TetrominoType[]>([]);
  const [holdPiece, setHoldPiece] = useState<TetrominoType | null>(null);
  const [canHold, setCanHold] = useState<boolean>(true);

  // スコアとゲーム進行
  const [score, setScore] = useState<number>(0);
  const [lines, setLines] = useState<number>(0);
  const [level, setLevel] = useState<number>(1);
  const [highScore, setHighScore] = useState<number>(0);

  // フラグ
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [isTetrisClear, setIsTetrisClear] = useState<boolean>(false);

  // 落下タイマー用の参照
  const dropTimerRef = useRef<number | null>(null);

  // ハイスコアの読み込み
  useEffect(() => {
    const saved = localStorage.getItem(HIGH_SCORE_KEY);
    if (saved) {
      setHighScore(parseInt(saved, 10) || 0);
    }
  }, []);

  // ハイスコアの保存
  const updateHighScore = useCallback((newScore: number) => {
    setHighScore((prev) => {
      if (newScore > prev) {
        localStorage.setItem(HIGH_SCORE_KEY, newScore.toString());
        return newScore;
      }
      return prev;
    });
  }, []);

  // 次のピースを取得
  const getNextPieceType = useCallback(
    (currentBag: TetrominoType[], currentNext: TetrominoType[]) => {
      let workingBag = [...currentBag];
      let workingNext = [...currentNext];

      while (workingNext.length < 4) {
        if (workingBag.length === 0) {
          workingBag = generateBag();
        }
        workingNext.push(workingBag.shift()!);
      }

      const nextType = workingNext.shift()!;
      return { nextType, newBag: workingBag, newNext: workingNext };
    },
    []
  );

  // ゲームスタート
  const startGame = useCallback(() => {
    const initialBag1 = generateBag();
    const initialBag2 = generateBag();
    const allPieces = [...initialBag1, ...initialBag2];

    const firstPieceType = allPieces.shift()!;
    const firstNext = allPieces.slice(0, 3);
    const remainingBag = allPieces.slice(3);

    const empty = createEmptyBoard();
    const firstPiece = createPiece(firstPieceType);

    setBoard(empty);
    setCurrentPiece(firstPiece);
    setBag(remainingBag);
    setNextPieces(firstNext);
    setHoldPiece(null);
    setCanHold(true);
    setScore(0);
    setLines(0);
    setLevel(1);
    setIsPlaying(true);
    setIsPaused(false);
    setIsGameOver(false);
    setIsTetrisClear(false);
  }, []);

  // ピースの固定とライン消去の処理
  const lockPiece = useCallback(
    (pieceToLock: Piece) => {
      setBoard((prevBoard) => {
        const merged = mergePieceToBoard(pieceToLock, prevBoard);
        const { newBoard, linesCleared } = clearFullLines(merged);

        if (linesCleared > 0) {
          sound.playClear(linesCleared);
          if (linesCleared === 4) {
            setIsTetrisClear(true);
            setTimeout(() => setIsTetrisClear(false), 1200);
          }

          setLines((prevLines) => {
            const updatedLines = prevLines + linesCleared;
            const newLevel = Math.floor(updatedLines / 10) + 1;
            setLevel(newLevel);
            return updatedLines;
          });

          setScore((prevScore) => {
            const added = calculateScore(linesCleared, level);
            const newScore = prevScore + added;
            updateHighScore(newScore);
            return newScore;
          });
        }

        // 次のピースを召喚
        setBag((currentBag) => {
          let updatedBag = currentBag;
          setNextPieces((currentNext) => {
            const { nextType, newBag, newNext } = getNextPieceType(
              currentBag,
              currentNext
            );
            updatedBag = newBag;
            const newPiece = createPiece(nextType);

            // スポーン位置での衝突判定 -> ゲームオーバー
            if (checkCollision(newPiece, newBoard)) {
              sound.playGameOver();
              setIsGameOver(true);
              setIsPlaying(false);
              setCurrentPiece(null);
            } else {
              setCurrentPiece(newPiece);
            }

            setCanHold(true);
            return newNext;
          });
          return updatedBag;
        });

        return newBoard;
      });
    },
    [level, getNextPieceType, updateHighScore]
  );

  // ピースの1マス落下 (通常・ソフトドロップ)
  const dropPiece = useCallback(() => {
    if (!currentPiece || !isPlaying || isPaused || isGameOver) return;

    if (!checkCollision(currentPiece, board, 0, 1)) {
      setCurrentPiece((prev) => (prev ? { ...prev, y: prev.y + 1 } : null));
    } else {
      lockPiece(currentPiece);
    }
  }, [currentPiece, board, isPlaying, isPaused, isGameOver, lockPiece]);

  // 左移動
  const moveLeft = useCallback(() => {
    if (!currentPiece || !isPlaying || isPaused || isGameOver) return;
    if (!checkCollision(currentPiece, board, -1, 0)) {
      sound.playMove();
      setCurrentPiece((prev) => (prev ? { ...prev, x: prev.x - 1 } : null));
    }
  }, [currentPiece, board, isPlaying, isPaused, isGameOver]);

  // 右移動
  const moveRight = useCallback(() => {
    if (!currentPiece || !isPlaying || isPaused || isGameOver) return;
    if (!checkCollision(currentPiece, board, 1, 0)) {
      sound.playMove();
      setCurrentPiece((prev) => (prev ? { ...prev, x: prev.x + 1 } : null));
    }
  }, [currentPiece, board, isPlaying, isPaused, isGameOver]);

  // 回転
  const rotate = useCallback(() => {
    if (!currentPiece || !isPlaying || isPaused || isGameOver) return;
    const rotated = tryRotate(currentPiece, board);
    if (rotated) {
      sound.playRotate();
      setCurrentPiece(rotated);
    }
  }, [currentPiece, board, isPlaying, isPaused, isGameOver]);

  // ハードドロップ（即時接地＆固定）
  const hardDrop = useCallback(() => {
    if (!currentPiece || !isPlaying || isPaused || isGameOver) return;
    sound.playHardDrop();
    const ghostY = getGhostPosition(currentPiece, board);
    const dropDistance = ghostY - currentPiece.y;
    const droppedPiece = { ...currentPiece, y: ghostY };

    // ハードドロップボーナススコア (1マスにつき2点)
    setScore((prev) => {
      const newScore = prev + dropDistance * 2;
      updateHighScore(newScore);
      return newScore;
    });

    lockPiece(droppedPiece);
  }, [currentPiece, board, isPlaying, isPaused, isGameOver, lockPiece, updateHighScore]);

  // ホールド機能
  const hold = useCallback(() => {
    if (!currentPiece || !canHold || !isPlaying || isPaused || isGameOver) return;
    sound.playHold();

    const currentType = currentPiece.type;
    setCanHold(false);

    if (holdPiece === null) {
      setHoldPiece(currentType);
      // 次のピースを出す
      setBag((currentBag) => {
        let updatedBag = currentBag;
        setNextPieces((currentNext) => {
          const { nextType, newBag, newNext } = getNextPieceType(
            currentBag,
            currentNext
          );
          updatedBag = newBag;
          const newPiece = createPiece(nextType);
          setCurrentPiece(newPiece);
          return newNext;
        });
        return updatedBag;
      });
    } else {
      const pieceFromHold = createPiece(holdPiece);
      setHoldPiece(currentType);
      setCurrentPiece(pieceFromHold);
    }
  }, [currentPiece, canHold, holdPiece, isPlaying, isPaused, isGameOver, getNextPieceType]);

  // ポーズ切替
  const togglePause = useCallback(() => {
    if (!isPlaying || isGameOver) return;
    setIsPaused((prev) => !prev);
  }, [isPlaying, isGameOver]);

  // 自然落下ループ
  useEffect(() => {
    if (!isPlaying || isPaused || isGameOver) {
      if (dropTimerRef.current) clearInterval(dropTimerRef.current);
      return;
    }

    const interval = getDropInterval(level);
    dropTimerRef.current = window.setInterval(() => {
      dropPiece();
    }, interval);

    return () => {
      if (dropTimerRef.current) clearInterval(dropTimerRef.current);
    };
  }, [isPlaying, isPaused, isGameOver, level, dropPiece]);

  // キーボード操作リスナー
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat && (e.key === ' ' || e.key.toLowerCase() === 'c')) return;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          moveLeft();
          break;
        case 'ArrowRight':
          e.preventDefault();
          moveRight();
          break;
        case 'ArrowDown':
          e.preventDefault();
          dropPiece();
          break;
        case 'ArrowUp':
        case 'x':
        case 'X':
          e.preventDefault();
          rotate();
          break;
        case ' ':
          e.preventDefault();
          hardDrop();
          break;
        case 'c':
        case 'C':
        case 'Shift':
          e.preventDefault();
          hold();
          break;
        case 'p':
        case 'P':
          e.preventDefault();
          togglePause();
          break;
        case 'r':
        case 'R':
          if (isGameOver) {
            e.preventDefault();
            startGame();
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [moveLeft, moveRight, dropPiece, rotate, hardDrop, hold, togglePause, isGameOver, startGame]);

  // ゴーストのY座標
  const ghostY = currentPiece ? getGhostPosition(currentPiece, board) : null;

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
      <Header />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 flex flex-col items-center justify-center">
        <div className="w-full flex flex-col md:flex-row items-center justify-center gap-6 lg:gap-8">
          {/* 左サイドパネル: HOLD & STATS */}
          <div className="w-full md:w-auto flex md:flex-col justify-between md:justify-start gap-3 order-2 md:order-1">
            <PiecePreview type={holdPiece} label="HOLD" canHold={canHold} />

            {/* スコア・ハイスコア */}
            <div className="flex-1 md:flex-none bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg backdrop-blur-sm min-w-[110px] space-y-3">
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-400" />
                  SCORE
                </div>
                <div className="text-xl sm:text-2xl font-mono font-black text-white mt-0.5">
                  {score}
                </div>
              </div>

              <div className="border-t border-slate-800 pt-2">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <Trophy className="w-3 h-3 text-amber-400" />
                  HIGH
                </div>
                <div className="text-base sm:text-lg font-mono font-bold text-amber-400 mt-0.5">
                  {highScore}
                </div>
              </div>
            </div>
          </div>

          {/* 中央: テトリスボード */}
          <div className="order-1 md:order-2 flex flex-col items-center">
            <TetrisBoard
              board={board}
              currentPiece={currentPiece}
              ghostY={ghostY}
              isGameOver={isGameOver}
              isPaused={isPaused}
              isPlaying={isPlaying}
              score={score}
              highScore={highScore}
              isTetrisClear={isTetrisClear}
              onStart={startGame}
              onRestart={startGame}
              onResume={() => setIsPaused(false)}
            />
          </div>

          {/* 右サイドパネル: NEXT & LEVEL/LINES */}
          <div className="w-full md:w-auto flex md:flex-col justify-between md:justify-start gap-3 order-3">
            <PiecePreview type={nextPieces[0] || null} label="NEXT" />

            <div className="flex-1 md:flex-none bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg backdrop-blur-sm min-w-[110px] space-y-3">
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <Layers className="w-3 h-3 text-indigo-400" />
                  LINES
                </div>
                <div className="text-xl sm:text-2xl font-mono font-black text-white mt-0.5">
                  {lines}
                </div>
              </div>

              <div className="border-t border-slate-800 pt-2">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  LEVEL
                </div>
                <div className="text-base sm:text-lg font-mono font-bold text-indigo-400 mt-0.5">
                  {level}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* モバイル操作ボタン (スマホ・タッチデバイス用) */}
        <div className="w-full mt-4 md:hidden">
          <MobileControls
            onMoveLeft={moveLeft}
            onMoveRight={moveRight}
            onSoftDrop={dropPiece}
            onHardDrop={hardDrop}
            onRotate={rotate}
            onHold={hold}
            disabled={!isPlaying || isPaused || isGameOver}
          />
        </div>
      </main>

      <footer className="py-4 border-t border-slate-800/60 text-center text-xs text-slate-500">
        <p>Tetris Neon &copy; 2026 - Instant Play in Browser (No API Key Required)</p>
      </footer>
    </div>
  );
}

export default App;
