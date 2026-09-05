import React, { useState, useEffect, useRef, useCallback } from 'react';
import { sound } from '../utils/audio';
import {
  RotateCcw,
  Trophy,
  Sparkles,
  Volume2,
  VolumeX,
  Shuffle,
  Lightbulb,
  Hammer,
  Bomb,
  Star,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Target,
  Compass,
} from 'lucide-react';

export interface JewelGameProps {
  onBackToHub: () => void;
  isDark: boolean;
  isFullscreen?: boolean;
}

// ゲームモード
export type JewelGameMode = 'timeAttack' | 'endless' | 'mission';

// 宝石の種類 (6色 + レインボー)
export type JewelColor = 'ruby' | 'diamond' | 'emerald' | 'topaz' | 'amethyst' | 'citrine';

export const JEWEL_COLORS: JewelColor[] = [
  'ruby', // 赤
  'diamond', // 青・水色
  'emerald', // 緑
  'topaz', // 黄色
  'amethyst', // 紫
  'citrine', // 橙
];

// 特殊ジュエル
export type SpecialType = 'none' | 'line_h' | 'line_v' | 'bomb' | 'rainbow';

export interface JewelItem {
  id: number;
  color: JewelColor;
  special: SpecialType;
  row: number;
  col: number;
  // 描画・アニメーション用座標
  displayRow: number;
  displayCol: number;
  scale: number; // 0〜1 (出現・消滅)
  alpha: number;
  animOffset: { x: number; y: number };
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  shape?: 'sparkle' | 'circle' | 'star';
}

interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
  lineWidth: number;
}

interface FloatingText {
  id: number;
  text: string;
  x: number;
  y: number;
  color: string;
  scale: number;
  alpha: number;
  vy: number;
}

interface LaserBeam {
  isRow: boolean;
  index: number;
  progress: number;
  color: string;
}

// ミッション定義
export interface MissionStage {
  stage: number;
  title: string;
  targetScore: number;
  targetGems: Partial<Record<JewelColor, number>>;
  targetSpecials: number;
  movesLimit: number;
}

const MISSION_STAGES: MissionStage[] = [
  {
    stage: 1,
    title: 'ジュエルの目覚め',
    targetScore: 2000,
    targetGems: { ruby: 15, emerald: 15 },
    targetSpecials: 1,
    movesLimit: 22,
  },
  {
    stage: 2,
    title: 'サファイア・ウェーブ',
    targetScore: 3500,
    targetGems: { diamond: 20, topaz: 20 },
    targetSpecials: 2,
    movesLimit: 20,
  },
  {
    stage: 3,
    title: '雷光の一撃',
    targetScore: 5000,
    targetGems: { amethyst: 25, citrine: 25 },
    targetSpecials: 3,
    movesLimit: 22,
  },
  {
    stage: 4,
    title: '大爆発の宴',
    targetScore: 7000,
    targetGems: { ruby: 30, diamond: 30 },
    targetSpecials: 4,
    movesLimit: 24,
  },
  {
    stage: 5,
    title: 'レインボー・マスター',
    targetScore: 10000,
    targetGems: { emerald: 35, topaz: 35 },
    targetSpecials: 5,
    movesLimit: 25,
  },
];

const GRID_SIZE = 8;
const HIGH_SCORE_KEY = 'jewel_quest_high_score_';
const STAGE_STARS_KEY = 'jewel_quest_stage_stars_';

let jewelGlobalId = 1;

export const JewelGame: React.FC<JewelGameProps> = ({
  isDark,
  isFullscreen = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // ゲームステート
  const [mode, setMode] = useState<JewelGameMode>('timeAttack');
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover' | 'stageClear'>('menu');
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(90);
  const [movesLeft, setMovesLeft] = useState<number>(20);
  const [currentStage, setCurrentStage] = useState<number>(1);
  const [stageStars, setStageStars] = useState<Record<number, number>>({});
  const [feverGauge, setFeverGauge] = useState<number>(0); // 0〜100
  const [isFever, setIsFever] = useState<boolean>(false);
  const [feverTimeLeft, setFeverTimeLeft] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(() => sound.getMuted());

  // ミッション進捗
  const [missionGemsCollected, setMissionGemsCollected] = useState<Record<JewelColor, number>>({
    ruby: 0,
    diamond: 0,
    emerald: 0,
    topaz: 0,
    amethyst: 0,
    citrine: 0,
  });
  const [missionSpecialsTriggered, setMissionSpecialsTriggered] = useState<number>(0);

  // お助けアイテム
  const [hammerCount, setHammerCount] = useState<number>(3);
  const [bombCount, setBombCount] = useState<number>(2);
  const [shuffleCount, setShuffleCount] = useState<number>(3);
  const [activeItem, setActiveItem] = useState<'none' | 'hammer' | 'bomb'>('none');

  // グリッド実体
  const gridRef = useRef<(JewelItem | null)[][]>([]);
  // 操作制御
  const isProcessingRef = useRef<boolean>(false);
  const selectedCellRef = useRef<{ row: number; col: number } | null>(null);
  const touchStartRef = useRef<{ row: number; col: number; x: number; y: number } | null>(null);
  const isDraggingRef = useRef<boolean>(false);

  // エフェクト関連
  const particlesRef = useRef<Particle[]>([]);
  const shockwavesRef = useRef<Shockwave[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const lasersRef = useRef<LaserBeam[]>([]);
  const comboCountRef = useRef<number>(0);
  const hintRef = useRef<{ r1: number; c1: number; r2: number; c2: number } | null>(null);
  const lastInteractionTimeRef = useRef<number>(Date.now());

  // アニメーションループ用
  const animationFrameIdRef = useRef<number | null>(null);
  const canvasLayoutRef = useRef<{ x: number; y: number; size: number; cellSize: number }>({
    x: 0,
    y: 0,
    size: 400,
    cellSize: 50,
  });

  // ハイスコア等の読み込み
  useEffect(() => {
    const saved = localStorage.getItem(`${HIGH_SCORE_KEY}${mode}`);
    if (saved) setHighScore(parseInt(saved, 10) || 0);

    const starsStr = localStorage.getItem(STAGE_STARS_KEY);
    if (starsStr) {
      try {
        setStageStars(JSON.parse(starsStr));
      } catch {}
    }
  }, [mode]);

  // ハイスコア更新
  const checkUpdateHighScore = useCallback(
    (currentScore: number) => {
      setHighScore((prev) => {
        if (currentScore > prev) {
          localStorage.setItem(`${HIGH_SCORE_KEY}${mode}`, currentScore.toString());
          return currentScore;
        }
        return prev;
      });
    },
    [mode]
  );

  // --- ヘルパー: ランダムな色 ---
  const getRandomColor = (): JewelColor => {
    return JEWEL_COLORS[Math.floor(Math.random() * JEWEL_COLORS.length)];
  };

  // --- 盤面の初期化 ---
  const initBoard = () => {
    const newGrid: (JewelItem | null)[][] = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      newGrid[r] = [];
      for (let c = 0; c < GRID_SIZE; c++) {
        let color: JewelColor;
        // 初期配置で3つ並ばないように色を選択
        do {
          color = getRandomColor();
        } while (
          (r >= 2 && newGrid[r - 1][c]?.color === color && newGrid[r - 2][c]?.color === color) ||
          (c >= 2 && newGrid[r][c - 1]?.color === color && newGrid[r][c - 2]?.color === color)
        );

        newGrid[r][c] = {
          id: jewelGlobalId++,
          color,
          special: 'none',
          row: r,
          col: c,
          displayRow: r,
          displayCol: c,
          scale: 1,
          alpha: 1,
          animOffset: { x: 0, y: 0 },
        };
      }
    }
    gridRef.current = newGrid;

    // 有効な手がない場合はシャッフル
    if (!hasValidMoves(newGrid)) {
      shuffleBoard(false);
    }
    hintRef.current = findPossibleMove(gridRef.current);
    lastInteractionTimeRef.current = Date.now();
  };

  // --- 有効手の探索 ---
  const hasValidMoves = (grid: (JewelItem | null)[][]): boolean => {
    return findPossibleMove(grid) !== null;
  };

  const findPossibleMove = (
    grid: (JewelItem | null)[][]
  ): { r1: number; c1: number; r2: number; c2: number } | null => {
    // 盤面上のすべての隣接ペアを仮スワップして3マッチができるか判定
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const item1 = grid[r][c];
        if (!item1) continue;

        // レインボージュエルは隣接するどのジュエルともスワップ可能
        if (item1.special === 'rainbow') {
          if (c + 1 < GRID_SIZE && grid[r][c + 1]) return { r1: r, c1: c, r2: r, c2: c + 1 };
          if (r + 1 < GRID_SIZE && grid[r + 1][c]) return { r1: r, c1: c, r2: r + 1, c2: c };
        }

        // 右とスワップ試行
        if (c + 1 < GRID_SIZE && grid[r][c + 1]) {
          swapCellsInGrid(grid, r, c, r, c + 1);
          const matches = checkMatches(grid);
          swapCellsInGrid(grid, r, c, r, c + 1);
          if (matches.length > 0) return { r1: r, c1: c, r2: r, c2: c + 1 };
        }

        // 下とスワップ試行
        if (r + 1 < GRID_SIZE && grid[r + 1][c]) {
          swapCellsInGrid(grid, r, c, r + 1, c);
          const matches = checkMatches(grid);
          swapCellsInGrid(grid, r, c, r + 1, c);
          if (matches.length > 0) return { r1: r, c1: c, r2: r + 1, c2: c };
        }
      }
    }
    return null;
  };

  const swapCellsInGrid = (
    grid: (JewelItem | null)[][],
    r1: number,
    c1: number,
    r2: number,
    c2: number
  ) => {
    const temp = grid[r1][c1];
    grid[r1][c1] = grid[r2][c2];
    grid[r2][c2] = temp;
    if (grid[r1][c1]) {
      grid[r1][c1]!.row = r1;
      grid[r1][c1]!.col = c1;
    }
    if (grid[r2][c2]) {
      grid[r2][c2]!.row = r2;
      grid[r2][c2]!.col = c2;
    }
  };

  // --- 盤面シャッフル ---
  const shuffleBoard = (playEffect = true) => {
    if (playEffect) {
      sound.playJewelShuffle();
      addFloatingText('盤面シャッフル！', 4, 4, '#38bdf8', 1.4);
    }
    let valid = false;
    let attempts = 0;
    while (!valid && attempts < 50) {
      attempts++;
      const allItems: JewelItem[] = [];
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (gridRef.current[r][c]) {
            allItems.push(gridRef.current[r][c]!);
          }
        }
      }
      // フィッシャー・イェーツ シャッフル
      for (let i = allItems.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allItems[i], allItems[j]] = [allItems[j], allItems[i]];
      }
      let idx = 0;
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          const item = allItems[idx++];
          item.row = r;
          item.col = c;
          item.displayRow = r;
          item.displayCol = c;
          gridRef.current[r][c] = item;
        }
      }
      // シャッフル直後にマッチが勝手に発生しない＆有効手があるか確認
      const matches = checkMatches(gridRef.current);
      if (matches.length === 0 && hasValidMoves(gridRef.current)) {
        valid = true;
      }
    }
    // 50回試行しても有効手が見つからない場合の安全フォールバック
    if (!valid) {
      initBoard();
    } else {
      hintRef.current = findPossibleMove(gridRef.current);
    }
  };

  // --- ゲーム開始 ---
  const startGame = (selectedMode: JewelGameMode, stage = 1) => {
    setMode(selectedMode);
    setCurrentStage(stage);
    setScore(0);
    setTimeLeft(90);
    setMovesLeft(selectedMode === 'mission' ? MISSION_STAGES[stage - 1].movesLimit : 30);
    setGameState('playing');
    setFeverGauge(0);
    setIsFever(false);
    setFeverTimeLeft(0);
    setActiveItem('none');
    setMissionGemsCollected({
      ruby: 0,
      diamond: 0,
      emerald: 0,
      topaz: 0,
      amethyst: 0,
      citrine: 0,
    });
    setMissionSpecialsTriggered(0);
    particlesRef.current = [];
    shockwavesRef.current = [];
    floatingTextsRef.current = [];
    lasersRef.current = [];
    comboCountRef.current = 0;
    selectedCellRef.current = null;
    isProcessingRef.current = false;

    initBoard();
  };

  // --- タイマー処理 ---
  useEffect(() => {
    if (gameState !== 'playing') return;

    const timer = setInterval(() => {
      // タイムアタックモードの時間減算
      if (mode === 'timeAttack') {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleGameOver();
            return 0;
          }
          return prev - 1;
        });
      }

      // フィーバー状態の減算
      if (isFever) {
        setFeverTimeLeft((prev) => {
          if (prev <= 1) {
            setIsFever(false);
            setFeverGauge(0);
            return 0;
          }
          return prev - 1;
        });
      }

      // ヒントの更新（アイドル4秒以上）
      if (!isProcessingRef.current && Date.now() - lastInteractionTimeRef.current > 4000) {
        if (!hintRef.current) {
          hintRef.current = findPossibleMove(gridRef.current);
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, mode, isFever]);

  // --- ゲームオーバー処理 ---
  const handleGameOver = () => {
    setGameState('gameover');
    sound.playJewelGameOver();
    checkUpdateHighScore(score);
  };

  // --- ステージクリア判定 ---
  const checkStageClear = (updatedScore: number, updatedGems: Record<JewelColor, number>, updatedSpecials: number) => {
    if (mode !== 'mission' || gameState !== 'playing') return;
    const mission = MISSION_STAGES[currentStage - 1];
    if (!mission) return;

    let gemsMet = true;
    for (const [col, req] of Object.entries(mission.targetGems)) {
      if ((updatedGems[col as JewelColor] || 0) < (req || 0)) {
        gemsMet = false;
        break;
      }
    }
    const scoreMet = updatedScore >= mission.targetScore;
    const specialsMet = updatedSpecials >= mission.targetSpecials;

    if (gemsMet && scoreMet && specialsMet) {
      setGameState('stageClear');
      sound.playJewelClear();

      // 残り手数に応じた星計算
      let stars = 1;
      if (movesLeft >= 8) stars = 3;
      else if (movesLeft >= 4) stars = 2;

      setStageStars((prev) => {
        const next = { ...prev, [currentStage]: Math.max(prev[currentStage] || 0, stars) };
        localStorage.setItem(STAGE_STARS_KEY, JSON.stringify(next));
        return next;
      });
      checkUpdateHighScore(updatedScore);
    }
  };

  // --- マッチ検出ロジック ---
  interface MatchGroup {
    cells: { row: number; col: number }[];
    color: JewelColor;
    isRow: boolean;
    len: number;
  }

  const checkMatches = (grid: (JewelItem | null)[][]): MatchGroup[] => {
    const matches: MatchGroup[] = [];

    // 1. 横方向のマッチ判定
    for (let r = 0; r < GRID_SIZE; r++) {
      let matchLen = 1;
      for (let c = 0; c < GRID_SIZE; c++) {
        const current = grid[r][c];
        const next = c + 1 < GRID_SIZE ? grid[r][c + 1] : null;

        if (
          current &&
          next &&
          current.color === next.color &&
          current.special !== 'rainbow' &&
          next.special !== 'rainbow'
        ) {
          matchLen++;
        } else {
          if (matchLen >= 3) {
            const cells = [];
            for (let k = c - matchLen + 1; k <= c; k++) {
              cells.push({ row: r, col: k });
            }
            matches.push({
              cells,
              color: grid[r][c]!.color,
              isRow: true,
              len: matchLen,
            });
          }
          matchLen = 1;
        }
      }
    }

    // 2. 縦方向のマッチ判定
    for (let c = 0; c < GRID_SIZE; c++) {
      let matchLen = 1;
      for (let r = 0; r < GRID_SIZE; r++) {
        const current = grid[r][c];
        const next = r + 1 < GRID_SIZE ? grid[r + 1][c] : null;

        if (
          current &&
          next &&
          current.color === next.color &&
          current.special !== 'rainbow' &&
          next.special !== 'rainbow'
        ) {
          matchLen++;
        } else {
          if (matchLen >= 3) {
            const cells = [];
            for (let k = r - matchLen + 1; k <= r; k++) {
              cells.push({ row: k, col: c });
            }
            matches.push({
              cells,
              color: grid[r][c]!.color,
              isRow: false,
              len: matchLen,
            });
          }
          matchLen = 1;
        }
      }
    }

    return matches;
  };

  // --- スワップ実行とアニメーション処理 ---
  const handleSwap = async (
    r1: number,
    c1: number,
    r2: number,
    c2: number,
    isManual = true
  ) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    lastInteractionTimeRef.current = Date.now();
    hintRef.current = null;

    const item1 = gridRef.current[r1][c1];
    const item2 = gridRef.current[r2][c2];

    if (!item1 || !item2) {
      isProcessingRef.current = false;
      return;
    }

    sound.playJewelSwap();

    // 1. スワップアニメーション
    await animateSwap(item1, item2);
    swapCellsInGrid(gridRef.current, r1, c1, r2, c2);

    // 2. スペシャルジュエル同士の合成チェック
    const isSpecialCombo =
      (item1.special !== 'none' && item2.special !== 'none') ||
      item1.special === 'rainbow' ||
      item2.special === 'rainbow';

    if (isSpecialCombo) {
      await triggerSpecialCombo(item1, item2);
      if (mode === 'mission') {
        setMovesLeft((prev) => {
          const next = prev - 1;
          if (next <= 0 && gameState === 'playing') {
            setTimeout(() => handleGameOver(), 1000);
          }
          return next;
        });
      }
      await processCascades();
      isProcessingRef.current = false;
      return;
    }

    // 3. マッチの判定
    const matches = checkMatches(gridRef.current);

    if (matches.length === 0) {
      // マッチしなかった場合: ロールバック（元に戻す）
      sound.playJewelInvalid();
      await animateSwap(item1, item2);
      swapCellsInGrid(gridRef.current, r1, c1, r2, c2);
      isProcessingRef.current = false;
      return;
    }

    // 有効な手だった場合: 手数を減らす
    if (isManual && mode === 'mission') {
      setMovesLeft((prev) => {
        const next = prev - 1;
        if (next <= 0 && gameState === 'playing') {
          setTimeout(() => handleGameOver(), 1200);
        }
        return next;
      });
    }

    // 連鎖カスケード処理の開始
    comboCountRef.current = 0;
    await processMatchesAndCascades(matches, { r: r2, c: c2 });
    isProcessingRef.current = false;
  };

  // --- スワップのアニメーション (Promise) ---
  const animateSwap = (item1: JewelItem, item2: JewelItem): Promise<void> => {
    return new Promise((resolve) => {
      const duration = 180; // ms
      const startTime = performance.now();
      const dr = item2.row - item1.row;
      const dc = item2.col - item1.col;

      const step = (time: number) => {
        const progress = Math.min(1, (time - startTime) / duration);
        const ease = 0.5 - Math.cos(progress * Math.PI) / 2; // Smooth cosine ease

        item1.animOffset.x = dc * ease;
        item1.animOffset.y = dr * ease;
        item2.animOffset.x = -dc * ease;
        item2.animOffset.y = -dr * ease;

        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          item1.animOffset.x = 0;
          item1.animOffset.y = 0;
          item2.animOffset.x = 0;
          item2.animOffset.y = 0;
          resolve();
        }
      };
      requestAnimationFrame(step);
    });
  };

  // --- スペシャルジュエル合成爆破 ---
  const triggerSpecialCombo = async (item1: JewelItem, item2: JewelItem) => {
    sound.playJewelSpecialCreate();
    const cellsToDestroy: Set<string> = new Set();
    const specialsToSpawn: { row: number; col: number; special: SpecialType; color: JewelColor }[] = [];

    // 1. Rainbow + Rainbow
    if (item1.special === 'rainbow' && item2.special === 'rainbow') {
      sound.playJewelRainbow();
      addShockwave(4, 4, '#ffffff', 300);
      addFloatingText('SUPERNOVA BOMB!', 4, 4, '#ec4899', 2.0);
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          cellsToDestroy.add(`${r},${c}`);
        }
      }
    }
    // 2. Rainbow + Special または Rainbow + 通常色
    else if (item1.special === 'rainbow' || item2.special === 'rainbow') {
      const rainbowItem = item1.special === 'rainbow' ? item1 : item2;
      const otherItem = item1.special === 'rainbow' ? item2 : item1;
      sound.playJewelRainbow();

      const targetColor = otherItem.color;
      cellsToDestroy.add(`${rainbowItem.row},${rainbowItem.col}`);
      cellsToDestroy.add(`${otherItem.row},${otherItem.col}`);

      if (otherItem.special !== 'none') {
        // レインボー × 特殊ジュエル: その色の全ジュエルを特殊ジュエルに変換して大連鎖
        const specialType = otherItem.special;
        addFloatingText('RAINBOW OVERLOAD!', rainbowItem.row, rainbowItem.col, '#a855f7', 1.8);
        for (let r = 0; r < GRID_SIZE; r++) {
          for (let c = 0; c < GRID_SIZE; c++) {
            const item = gridRef.current[r][c];
            if (item && item.color === targetColor) {
              item.special = specialType;
              cellsToDestroy.add(`${r},${c}`);
            }
          }
        }
      } else {
        // レインボー × 通常色: その色の全ジュエルを一掃
        addFloatingText('RAINBOW BURST!', rainbowItem.row, rainbowItem.col, '#ec4899', 1.8);
        addShockwave(rainbowItem.row, rainbowItem.col, '#ec4899', 180);
        for (let r = 0; r < GRID_SIZE; r++) {
          for (let c = 0; c < GRID_SIZE; c++) {
            const item = gridRef.current[r][c];
            if (item && item.color === targetColor) {
              cellsToDestroy.add(`${r},${c}`);
            }
          }
        }
      }
    }
    // 3. Bomb + Bomb (超弩級 5x5 大爆破)
    else if (item1.special === 'bomb' && item2.special === 'bomb') {
      sound.playJewelBomb();
      const centerR = Math.floor((item1.row + item2.row) / 2);
      const centerC = Math.floor((item1.col + item2.col) / 2);
      addShockwave(centerR, centerC, '#f97316', 220);
      addFloatingText('MEGA BOMB!', centerR, centerC, '#ef4444', 1.8);

      for (let r = Math.max(0, centerR - 2); r <= Math.min(GRID_SIZE - 1, centerR + 2); r++) {
        for (let c = Math.max(0, centerC - 2); c <= Math.min(GRID_SIZE - 1, centerC + 2); c++) {
          cellsToDestroy.add(`${r},${c}`);
        }
      }
    }
    // 4. Line + Bomb (幅3マスの超メガレーザー)
    else if (
      (item1.special.startsWith('line') && item2.special === 'bomb') ||
      (item2.special.startsWith('line') && item1.special === 'bomb')
    ) {
      sound.playJewelLaser();
      sound.playJewelBomb();
      const centerR = item1.row;
      const centerC = item1.col;
      addFloatingText('LASER BOMB!', centerR, centerC, '#38bdf8', 1.8);

      for (let dr = -1; dr <= 1; dr++) {
        const r = centerR + dr;
        if (r >= 0 && r < GRID_SIZE) {
          lasersRef.current.push({ isRow: true, index: r, progress: 0, color: '#38bdf8' });
          for (let c = 0; c < GRID_SIZE; c++) cellsToDestroy.add(`${r},${c}`);
        }
      }
      for (let dc = -1; dc <= 1; dc++) {
        const c = centerC + dc;
        if (c >= 0 && c < GRID_SIZE) {
          lasersRef.current.push({ isRow: false, index: c, progress: 0, color: '#38bdf8' });
          for (let r = 0; r < GRID_SIZE; r++) cellsToDestroy.add(`${r},${c}`);
        }
      }
    }
    // 5. Line + Line (十字レーザー)
    else if (item1.special.startsWith('line') && item2.special.startsWith('line')) {
      sound.playJewelLaser();
      addFloatingText('CROSS LASER!', item1.row, item1.col, '#eab308', 1.7);
      lasersRef.current.push({ isRow: true, index: item1.row, progress: 0, color: '#eab308' });
      lasersRef.current.push({ isRow: false, index: item1.col, progress: 0, color: '#eab308' });
      for (let c = 0; c < GRID_SIZE; c++) cellsToDestroy.add(`${item1.row},${c}`);
      for (let r = 0; r < GRID_SIZE; r++) cellsToDestroy.add(`${r},${item1.col}`);
    }

    // 破壊とスコア
    await executeDestruction(cellsToDestroy, specialsToSpawn);
  };

  // --- マッチ処理と連鎖カスケード ---
  const processMatchesAndCascades = async (
    initialMatches: MatchGroup[],
    actionPoint?: { r: number; c: number }
  ) => {
    let currentMatches = initialMatches;

    while (currentMatches.length > 0) {
      comboCountRef.current++;
      const combo = comboCountRef.current;
      sound.playJewelMatch(combo);

      // フィーバーゲージ蓄積
      setFeverGauge((prev) => {
        const next = Math.min(100, prev + 15 + combo * 5);
        if (next >= 100 && !isFever) {
          setIsFever(true);
          setFeverTimeLeft(10);
          sound.playJewelSpecialCreate();
          addFloatingText('FEVER MODE (2X)!', 4, 4, '#fbbf24', 2.0);
        }
        return next;
      });

      // 破壊対象のセルと生成する特殊ジュエルを算出
      const cellsToDestroy: Set<string> = new Set();
      const specialsToSpawn: { row: number; col: number; special: SpecialType; color: JewelColor }[] = [];

      // 各マッチグループのセルを登録
      const matchCellCountMap: Record<string, number> = {};
      currentMatches.forEach((m) => {
        m.cells.forEach((cell) => {
          const key = `${cell.row},${cell.col}`;
          matchCellCountMap[key] = (matchCellCountMap[key] || 0) + 1;
          cellsToDestroy.add(key);
        });
      });

      // スペシャルジュエル生成判定
      // 1. T字/L字（同色が縦横で交差）→ Bomb
      for (const [key, count] of Object.entries(matchCellCountMap)) {
        if (count >= 2) {
          const [r, c] = key.split(',').map(Number);
          const color = gridRef.current[r][c]?.color || 'ruby';
          specialsToSpawn.push({ row: r, col: c, special: 'bomb', color });
          sound.playJewelSpecialCreate();
          break;
        }
      }

      // 2. 5個一列消し → Rainbow
      const match5 = currentMatches.find((m) => m.len >= 5);
      if (match5) {
        let spawnCell = match5.cells[2];
        if (actionPoint && match5.cells.some((c) => c.row === actionPoint.r && c.col === actionPoint.c)) {
          spawnCell = { row: actionPoint.r, col: actionPoint.c };
        }
        specialsToSpawn.push({ row: spawnCell.row, col: spawnCell.col, special: 'rainbow', color: match5.color });
        sound.playJewelSpecialCreate();
      }
      // 3. 4個一列消し → Line
      else {
        const match4 = currentMatches.find((m) => m.len === 4);
        if (match4) {
          let spawnCell = match4.cells[1];
          if (actionPoint && match4.cells.some((c) => c.row === actionPoint.r && c.col === actionPoint.c)) {
            spawnCell = { row: actionPoint.r, col: actionPoint.c };
          }
          const specialType: SpecialType = match4.isRow ? 'line_h' : 'line_v';
          specialsToSpawn.push({ row: spawnCell.row, col: spawnCell.col, special: specialType, color: match4.color });
          sound.playJewelSpecialCreate();
        }
      }

      // マッチしたセルの中に既存の特殊ジュエルがあれば起爆
      const processedSpecials = new Set<string>();
      const checkSpecials = Array.from(cellsToDestroy);
      while (checkSpecials.length > 0) {
        const key = checkSpecials.pop()!;
        if (processedSpecials.has(key)) continue;
        processedSpecials.add(key);

        const [r, c] = key.split(',').map(Number);
        const item = gridRef.current[r][c];
        if (!item || item.special === 'none') continue;

        if (item.special === 'line_h') {
          sound.playJewelLaser();
          lasersRef.current.push({ isRow: true, index: r, progress: 0, color: '#38bdf8' });
          for (let col = 0; col < GRID_SIZE; col++) {
            const k = `${r},${col}`;
            if (!cellsToDestroy.has(k)) {
              cellsToDestroy.add(k);
              checkSpecials.push(k);
            }
          }
        } else if (item.special === 'line_v') {
          sound.playJewelLaser();
          lasersRef.current.push({ isRow: false, index: c, progress: 0, color: '#38bdf8' });
          for (let row = 0; row < GRID_SIZE; row++) {
            const k = `${row},${c}`;
            if (!cellsToDestroy.has(k)) {
              cellsToDestroy.add(k);
              checkSpecials.push(k);
            }
          }
        } else if (item.special === 'bomb') {
          sound.playJewelBomb();
          addShockwave(r, c, '#f97316', 150);
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const nr = r + dr;
              const nc = c + dc;
              if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
                const k = `${nr},${nc}`;
                if (!cellsToDestroy.has(k)) {
                  cellsToDestroy.add(k);
                  checkSpecials.push(k);
                }
              }
            }
          }
        }
      }

      // 破壊実行とアニメーション
      await executeDestruction(cellsToDestroy, specialsToSpawn);

      // 連鎖コンボテキスト演出
      if (combo >= 2) {
        const comboTexts = ['', '', 'Double Combo!', 'Great 3x!', 'Mega 4x!', 'FANTASTIC!', 'LEGENDARY!!'];
        const label = comboTexts[Math.min(combo, comboTexts.length - 1)];
        addFloatingText(label, 4, 4, combo >= 4 ? '#f43f5e' : '#38bdf8', 1.5 + combo * 0.1);
        if (mode === 'timeAttack') {
          setTimeLeft((prev) => Math.min(99, prev + Math.min(combo, 4)));
        }
      }

      // 落下と補充
      await executeGravityAndFill();

      // 新たなマッチをチェック
      currentMatches = checkMatches(gridRef.current);
    }

    // 盤面が安定した後の手詰まりチェック
    if (!hasValidMoves(gridRef.current)) {
      setTimeout(() => shuffleBoard(true), 400);
    }
    hintRef.current = findPossibleMove(gridRef.current);
  };

  // --- カスケードのみを継続する処理 ---
  const processCascades = async () => {
    await executeGravityAndFill();
    const newMatches = checkMatches(gridRef.current);
    if (newMatches.length > 0) {
      await processMatchesAndCascades(newMatches);
    } else {
      if (!hasValidMoves(gridRef.current)) {
        setTimeout(() => shuffleBoard(true), 400);
      }
      hintRef.current = findPossibleMove(gridRef.current);
    }
  };

  // --- 破壊アニメーションとスコア計算 ---
  const executeDestruction = async (
    cellsToDestroy: Set<string>,
    specialsToSpawn: { row: number; col: number; special: SpecialType; color: JewelColor }[]
  ): Promise<void> => {
    const multiplier = isFever ? 2 : 1;
    const basePointsPerGem = 50;
    const count = cellsToDestroy.size;
    const pointsGained = count * basePointsPerGem * multiplier * Math.max(1, comboCountRef.current);

    setScore((prev) => {
      const next = prev + pointsGained;
      checkUpdateHighScore(next);
      return next;
    });

    // ミッションカウントの更新
    const gemsGathered = { ...missionGemsCollected };
    let specialsCount = missionSpecialsTriggered;

    // パーティクル生成 & セル消去
    cellsToDestroy.forEach((key) => {
      const [r, c] = key.split(',').map(Number);
      const item = gridRef.current[r][c];
      if (item) {
        gemsGathered[item.color] = (gemsGathered[item.color] || 0) + 1;
        if (item.special !== 'none') specialsCount++;
        spawnGemParticles(r, c, item.color);
        gridRef.current[r][c] = null;
      }
    });

    setMissionGemsCollected(gemsGathered);
    setMissionSpecialsTriggered(specialsCount);

    if (mode === 'mission') {
      checkStageClear(score + pointsGained, gemsGathered, specialsCount);
    }

    // 生成すべき特殊ジュエルを再配置
    specialsToSpawn.forEach((spec) => {
      gridRef.current[spec.row][spec.col] = {
        id: jewelGlobalId++,
        color: spec.color,
        special: spec.special,
        row: spec.row,
        col: spec.col,
        displayRow: spec.row,
        displayCol: spec.col,
        scale: 1,
        alpha: 1,
        animOffset: { x: 0, y: 0 },
      };
      addFloatingText(
        spec.special === 'rainbow' ? 'RAINBOW!' : spec.special === 'bomb' ? 'BOMB!' : 'LIGHTNING!',
        spec.row,
        spec.col,
        '#ffffff',
        1.3
      );
    });

    // 少し待機（消滅エフェクトを魅せる）
    await new Promise((r) => setTimeout(r, 140));
  };

  // --- 重力落下と上部新ジュエル補充アニメーション ---
  const executeGravityAndFill = async (): Promise<void> => {
    // 各列ごとに落下を計算
    const fallItems: { item: JewelItem; startR: number; targetR: number }[] = [];

    for (let c = 0; c < GRID_SIZE; c++) {
      let emptyRow = GRID_SIZE - 1;
      for (let r = GRID_SIZE - 1; r >= 0; r--) {
        if (gridRef.current[r][c] !== null) {
          if (r !== emptyRow) {
            const item = gridRef.current[r][c]!;
            gridRef.current[emptyRow][c] = item;
            gridRef.current[r][c] = null;
            item.row = emptyRow;
            fallItems.push({ item, startR: r, targetR: emptyRow });
          }
          emptyRow--;
        }
      }

      // 空いた上部マスに新ジュエルを生成
      let spawnOffset = -1;
      for (let r = emptyRow; r >= 0; r--) {
        const newItem: JewelItem = {
          id: jewelGlobalId++,
          color: getRandomColor(),
          special: 'none',
          row: r,
          col: c,
          displayRow: spawnOffset--,
          displayCol: c,
          scale: 1,
          alpha: 1,
          animOffset: { x: 0, y: 0 },
        };
        gridRef.current[r][c] = newItem;
        fallItems.push({ item: newItem, startR: newItem.displayRow, targetR: r });
      }
    }

    if (fallItems.length === 0) return;

    // なめらかな落下＋バウンスアニメーション
    return new Promise((resolve) => {
      const duration = 220; // ms
      const startTime = performance.now();

      const step = (now: number) => {
        const p = Math.min(1, (now - startTime) / duration);
        // バウンスイージング
        const ease = p === 1 ? 1 : Math.sin((p * Math.PI) / 2) * (1 + 0.05 * Math.sin(p * Math.PI * 3));

        fallItems.forEach(({ item, startR, targetR }) => {
          item.displayRow = startR + (targetR - startR) * ease;
        });

        if (p < 1) {
          requestAnimationFrame(step);
        } else {
          fallItems.forEach(({ item, targetR }) => {
            item.displayRow = targetR;
          });
          resolve();
        }
      };
      requestAnimationFrame(step);
    });
  };

  // --- お助けアイテムの使用 ---
  const handleUseItem = (type: 'hammer' | 'bomb' | 'shuffle') => {
    if (isProcessingRef.current || gameState !== 'playing') return;

    if (type === 'shuffle') {
      if (shuffleCount <= 0) return;
      setShuffleCount((prev) => prev - 1);
      shuffleBoard(true);
      return;
    }

    if (type === 'hammer') {
      if (hammerCount <= 0) return;
      setActiveItem(activeItem === 'hammer' ? 'none' : 'hammer');
    } else if (type === 'bomb') {
      if (bombCount <= 0) return;
      setActiveItem(activeItem === 'bomb' ? 'none' : 'bomb');
    }
  };

  // --- セルクリックまたはタップ時の処理 ---
  const handleCellAction = async (row: number, col: number) => {
    if (isProcessingRef.current || gameState !== 'playing') return;

    // 1. アイテム発動モードの場合
    if (activeItem === 'hammer') {
      if (hammerCount <= 0 || !gridRef.current[row][col]) return;
      setHammerCount((prev) => prev - 1);
      setActiveItem('none');
      sound.playJewelBomb();
      const cells = new Set<string>([`${row},${col}`]);
      addShockwave(row, col, '#ffffff', 80);
      addFloatingText('HAMMER SMASH!', row, col, '#fbbf24', 1.5);
      isProcessingRef.current = true;
      await executeDestruction(cells, []);
      await processCascades();
      isProcessingRef.current = false;
      return;
    }

    if (activeItem === 'bomb') {
      if (bombCount <= 0 || !gridRef.current[row][col]) return;
      setBombCount((prev) => prev - 1);
      setActiveItem('none');
      sound.playJewelSpecialCreate();
      gridRef.current[row][col]!.special = 'bomb';
      addFloatingText('BOMB SET!', row, col, '#f97316', 1.5);
      addShockwave(row, col, '#f97316', 60);
      return;
    }

    // 2. 通常のジュエル選択またはスワップ
    const selected = selectedCellRef.current;

    if (!selected) {
      // 最初の1個を選択
      selectedCellRef.current = { row, col };
      sound.playJewelSelect();
    } else {
      // 既に選択されていた場合
      if (selected.row === row && selected.col === col) {
        // 同じセルをタップしたら選択解除
        selectedCellRef.current = null;
        sound.playJewelSelect();
      } else {
        // 隣接セルかどうか判定
        const dr = Math.abs(selected.row - row);
        const dc = Math.abs(selected.col - col);

        if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
          // 隣接しているのでスワップ実行
          const prev = selected;
          selectedCellRef.current = null;
          handleSwap(prev.row, prev.col, row, col, true);
        } else {
          // 隣接していない別のセルを選択し直す
          selectedCellRef.current = { row, col };
          sound.playJewelSelect();
        }
      }
    }
  };

  // --- パーティクル・エフェクト追加ヘルパー ---
  const spawnGemParticles = (r: number, c: number, color: JewelColor) => {
    const layout = canvasLayoutRef.current;
    const cx = layout.x + (c + 0.5) * layout.cellSize;
    const cy = layout.y + (r + 0.5) * layout.cellSize;
    const hexColor = getColorHex(color);

    for (let i = 0; i < 14; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 5.0;
      particlesRef.current.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.0,
        size: 3 + Math.random() * 5,
        color: hexColor,
        alpha: 1,
        life: 0,
        maxLife: 25 + Math.random() * 15,
        shape: Math.random() > 0.4 ? 'sparkle' : 'circle',
      });
    }
  };

  const addShockwave = (r: number, c: number, color: string, maxRadius: number) => {
    const layout = canvasLayoutRef.current;
    const cx = layout.x + (c + 0.5) * layout.cellSize;
    const cy = layout.y + (r + 0.5) * layout.cellSize;
    shockwavesRef.current.push({
      x: cx,
      y: cy,
      radius: 5,
      maxRadius,
      color,
      alpha: 1,
      lineWidth: 6,
    });
  };

  const addFloatingText = (text: string, r: number, c: number, color: string, scale = 1.0) => {
    const layout = canvasLayoutRef.current;
    const cx = layout.x + (c + 0.5) * layout.cellSize;
    const cy = layout.y + (r + 0.5) * layout.cellSize;
    floatingTextsRef.current.push({
      id: Math.random(),
      text,
      x: cx,
      y: cy,
      color,
      scale,
      alpha: 1,
      vy: -1.2,
    });
  };

  const getColorHex = (color: JewelColor): string => {
    switch (color) {
      case 'ruby':
        return '#f43f5e';
      case 'diamond':
        return '#38bdf8';
      case 'emerald':
        return '#10b981';
      case 'topaz':
        return '#facc15';
      case 'amethyst':
        return '#a855f7';
      case 'citrine':
        return '#f97316';
      default:
        return '#ffffff';
    }
  };

  // --- スワイプ / タッチ・マウス操作ハンドラー ---
  const getCellFromCoords = (clientX: number, clientY: number): { row: number; col: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const layout = canvasLayoutRef.current;

    if (
      x >= layout.x &&
      x <= layout.x + layout.size &&
      y >= layout.y &&
      y <= layout.y + layout.size
    ) {
      const col = Math.floor((x - layout.x) / layout.cellSize);
      const row = Math.floor((y - layout.y) / layout.cellSize);
      if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
        return { row, col };
      }
    }
    return null;
  };

  const handlePointerDown = (clientX: number, clientY: number) => {
    const cell = getCellFromCoords(clientX, clientY);
    if (cell) {
      touchStartRef.current = { row: cell.row, col: cell.col, x: clientX, y: clientY };
      isDraggingRef.current = true;
    }
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (!isDraggingRef.current || !touchStartRef.current || isProcessingRef.current) return;
    const start = touchStartRef.current;
    const dx = clientX - start.x;
    const dy = clientY - start.y;
    const threshold = canvasLayoutRef.current.cellSize * 0.45;

    // スワイプ検出
    if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
      isDraggingRef.current = false;
      touchStartRef.current = null;
      let targetRow = start.row;
      let targetCol = start.col;

      if (Math.abs(dx) > Math.abs(dy)) {
        targetCol += dx > 0 ? 1 : -1;
      } else {
        targetRow += dy > 0 ? 1 : -1;
      }

      if (targetRow >= 0 && targetRow < GRID_SIZE && targetCol >= 0 && targetCol < GRID_SIZE) {
        selectedCellRef.current = null;
        handleSwap(start.row, start.col, targetRow, targetCol, true);
      }
    }
  };

  const handlePointerUp = (_clientX: number, _clientY: number) => {
    if (isDraggingRef.current && touchStartRef.current) {
      // スワイプ閾値未満のタップ操作
      const cell = touchStartRef.current;
      handleCellAction(cell.row, cell.col);
    }
    isDraggingRef.current = false;
    touchStartRef.current = null;
  };

  // --- Canvas 描画ループ ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;

    const render = () => {
      if (!isRunning) return;

      // 1. 動的リサイズ (Retina対応 & フルスクリーンスケーリング)
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();

      if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, rect.width, rect.height);

      // レイアウト計算: アスペクト比を維持しつつ最大サイズに拡大
      const padding = isFullscreen ? 16 : 14;
      const availWidth = rect.width - padding * 2;
      const availHeight = rect.height - padding * 2;
      const boardSize = Math.floor(Math.min(availWidth, availHeight));
      const cellSize = boardSize / GRID_SIZE;
      const boardX = Math.floor((rect.width - boardSize) / 2);
      const boardY = Math.floor((rect.height - boardSize) / 2);

      canvasLayoutRef.current = { x: boardX, y: boardY, size: boardSize, cellSize };

      // 2. ボード背景・グリッド描画
      drawBoardBackground(ctx, boardX, boardY, boardSize, cellSize, isDark);

      // 3. レーザービーム描画 (背景とジュエルの間)
      drawLasers(ctx, boardX, boardY, boardSize, cellSize);

      // 4. ヒントのパルス発光描画
      if (hintRef.current && !isProcessingRef.current) {
        drawHintPulse(ctx, boardX, boardY, cellSize, hintRef.current);
      }

      // 5. ジュエルの描画
      drawJewels(ctx, boardX, boardY, cellSize);

      // 6. 選択枠の描画
      if (selectedCellRef.current) {
        drawSelection(ctx, boardX, boardY, cellSize, selectedCellRef.current);
      }

      // 7. パーティクル描画
      drawParticles(ctx);

      // 8. 衝撃波描画
      drawShockwaves(ctx);

      // 9. 浮遊スコア・テキスト描画
      drawFloatingTexts(ctx);

      ctx.restore();

      animationFrameIdRef.current = requestAnimationFrame(render);
    };

    animationFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      isRunning = false;
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
    };
  }, [isDark, isFullscreen]);

  // --- ボード背景の描画 ---
  const drawBoardBackground = (
    ctx: CanvasRenderingContext2D,
    bx: number,
    by: number,
    size: number,
    cellSize: number,
    dark: boolean
  ) => {
    // 外枠グラデーションパネル
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(bx - 8, by - 8, size + 16, size + 16, 24);
    ctx.fillStyle = dark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(241, 245, 249, 0.9)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = dark ? 'rgba(79, 70, 229, 0.35)' : 'rgba(99, 102, 241, 0.4)';
    ctx.stroke();

    // グリッドセルのチェッカー模様
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const x = bx + c * cellSize;
        const y = by + r * cellSize;
        const isEven = (r + c) % 2 === 0;

        ctx.fillStyle = dark
          ? isEven
            ? 'rgba(30, 41, 59, 0.4)'
            : 'rgba(15, 23, 42, 0.4)'
          : isEven
          ? 'rgba(255, 255, 255, 0.6)'
          : 'rgba(226, 232, 240, 0.5)';

        ctx.beginPath();
        ctx.roundRect(x + 2, y + 2, cellSize - 4, cellSize - 4, 10);
        ctx.fill();
      }
    }
    ctx.restore();
  };

  // --- ジュエル自体の描画 (立体感・光沢・記号) ---
  const drawJewels = (
    ctx: CanvasRenderingContext2D,
    bx: number,
    by: number,
    cellSize: number
  ) => {
    const now = Date.now();
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const item = gridRef.current[r][c];
        if (!item) continue;

        const x = bx + (item.displayCol + item.animOffset.x + 0.5) * cellSize;
        const y = by + (item.displayRow + item.animOffset.y + 0.5) * cellSize;
        const radius = (cellSize * 0.42) * item.scale;

        ctx.save();
        ctx.translate(x, y);

        // 特殊ジュエルのグロー効果
        if (item.special !== 'none') {
          const glowPulse = 0.5 + 0.5 * Math.sin(now * 0.006);
          ctx.shadowBlur = 12 + glowPulse * 8;
          ctx.shadowColor = item.special === 'rainbow' ? '#ec4899' : getColorHex(item.color);
        }

        // 宝石の幾何学シェイプ描画
        drawGemShape(ctx, item.color, item.special, radius, now);

        // 特殊ジュエルのアイコン／オーラ描画
        if (item.special === 'line_h') {
          drawLaserGlow(ctx, radius, true, now);
        } else if (item.special === 'line_v') {
          drawLaserGlow(ctx, radius, false, now);
        } else if (item.special === 'bomb') {
          drawBombCore(ctx, radius, now);
        } else if (item.special === 'rainbow') {
          drawRainbowAura(ctx, radius, now);
        }

        ctx.restore();
      }
    }
  };

  // --- 宝石の立体描画 (形状とハイライト) ---
  const drawGemShape = (
    ctx: CanvasRenderingContext2D,
    color: JewelColor,
    special: SpecialType,
    r: number,
    now: number
  ) => {
    ctx.save();

    if (special === 'rainbow') {
      // レインボーハイパージュエル: 七色サイケデリックグラデーション
      const hue = (now * 0.1) % 360;
      const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 2, 0, 0, r);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.3, `hsl(${hue}, 100%, 75%)`);
      grad.addColorStop(0.7, `hsl(${(hue + 60) % 360}, 100%, 55%)`);
      grad.addColorStop(1, `hsl(${(hue + 180) % 360}, 90%, 35%)`);

      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      // 星型ハイライト
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
      return;
    }

    // 各色のグラデーションカラー
    const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 1, 0, 0, r * 1.1);

    switch (color) {
      case 'ruby': { // 赤・六角形
        grad.addColorStop(0, '#fda4af');
        grad.addColorStop(0.4, '#f43f5e');
        grad.addColorStop(1, '#9f1239');
        drawPolygon(ctx, 0, 0, r, 6);
        break;
      }
      case 'diamond': { // 青・菱形
        grad.addColorStop(0, '#bae6fd');
        grad.addColorStop(0.4, '#0ea5e9');
        grad.addColorStop(1, '#0369a1');
        drawDiamond(ctx, 0, 0, r * 1.05, r * 1.15);
        break;
      }
      case 'emerald': { // 緑・正方形
        grad.addColorStop(0, '#a7f3d0');
        grad.addColorStop(0.4, '#10b981');
        grad.addColorStop(1, '#065f46');
        drawRoundedRect(ctx, -r * 0.85, -r * 0.85, r * 1.7, r * 1.7, 8);
        break;
      }
      case 'topaz': { // 黄・八角形
        grad.addColorStop(0, '#fef08a');
        grad.addColorStop(0.4, '#eab308');
        grad.addColorStop(1, '#854d0e');
        drawPolygon(ctx, 0, 0, r, 8);
        break;
      }
      case 'amethyst': { // 紫・雫形 / ティアドロップ
        grad.addColorStop(0, '#e9d5ff');
        grad.addColorStop(0.4, '#a855f7');
        grad.addColorStop(1, '#581c87');
        drawTeardrop(ctx, 0, 0, r);
        break;
      }
      case 'citrine': { // 橙・三角形
        grad.addColorStop(0, '#fed7aa');
        grad.addColorStop(0.4, '#f97316');
        grad.addColorStop(1, '#9a3412');
        drawTriangle(ctx, 0, 0, r * 1.15);
        break;
      }
    }

    ctx.fillStyle = grad;
    ctx.fill();

    // 宝石のファセット（カッティングライン）
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 上部光沢ハイライト
    ctx.beginPath();
    ctx.ellipse(-r * 0.3, -r * 0.35, r * 0.35, r * 0.18, -Math.PI / 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.fill();

    ctx.restore();
  };

  // --- 幾何学シェイプヘルパー ---
  const drawPolygon = (ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, sides: number) => {
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  };

  const drawDiamond = (ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number) => {
    ctx.beginPath();
    ctx.moveTo(cx, cy - h);
    ctx.lineTo(cx + w, cy);
    ctx.lineTo(cx, cy + h);
    ctx.lineTo(cx - w, cy);
    ctx.closePath();
  };

  const drawTriangle = (ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r * 0.9, cy + r * 0.7);
    ctx.lineTo(cx - r * 0.9, cy + r * 0.7);
    ctx.closePath();
  };

  const drawTeardrop = (ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(cx, cy - r * 1.1);
    ctx.bezierCurveTo(cx + r * 1.1, cy - r * 0.2, cx + r, cy + r, cx, cy + r);
    ctx.bezierCurveTo(cx - r, cy + r, cx - r * 1.1, cy - r * 0.2, cx, cy - r * 1.1);
    ctx.closePath();
  };

  const drawRoundedRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    rad: number
  ) => {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, rad);
  };

  // --- 特殊ジュエルエフェクト描画 ---
  const drawLaserGlow = (ctx: CanvasRenderingContext2D, r: number, isHorizontal: boolean, _now: number) => {
    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#38bdf8';
    ctx.beginPath();
    if (isHorizontal) {
      ctx.moveTo(-r * 1.2, 0);
      ctx.lineTo(r * 1.2, 0);
    } else {
      ctx.moveTo(0, -r * 1.2);
      ctx.lineTo(0, r * 1.2);
    }
    ctx.stroke();

    // ⚡ マーク
    ctx.fillStyle = '#fef08a';
    ctx.font = `bold ${r * 0.85}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚡', 0, 1);
    ctx.restore();
  };

  const drawBombCore = (ctx: CanvasRenderingContext2D, r: number, now: number) => {
    ctx.save();
    const pulse = 1 + 0.15 * Math.sin(now * 0.01);
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.55 * pulse, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(239, 68, 68, 0.85)';
    ctx.fill();
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${r * 0.8}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('💣', 0, 1);
    ctx.restore();
  };

  const drawRainbowAura = (ctx: CanvasRenderingContext2D, r: number, now: number) => {
    ctx.save();
    ctx.rotate(now * 0.003);
    for (let i = 0; i < 4; i++) {
      ctx.rotate(Math.PI / 4);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-r * 1.15, 0);
      ctx.lineTo(r * 1.15, 0);
      ctx.stroke();
    }
    ctx.restore();
  };

  // --- 選択枠描画 ---
  const drawSelection = (
    ctx: CanvasRenderingContext2D,
    bx: number,
    by: number,
    cellSize: number,
    sel: { row: number; col: number }
  ) => {
    const x = bx + sel.col * cellSize;
    const y = by + sel.row * cellSize;
    const now = Date.now();
    const pulse = 0.5 + 0.5 * Math.sin(now * 0.008);

    ctx.save();
    ctx.strokeStyle = `rgba(250, 204, 21, ${0.7 + pulse * 0.3})`;
    ctx.lineWidth = 3.5;
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#facc15';
    ctx.beginPath();
    ctx.roundRect(x + 3, y + 3, cellSize - 6, cellSize - 6, 12);
    ctx.stroke();
    ctx.restore();
  };

  // --- ヒントパルス描画 ---
  const drawHintPulse = (
    ctx: CanvasRenderingContext2D,
    bx: number,
    by: number,
    cellSize: number,
    hint: { r1: number; c1: number; r2: number; c2: number }
  ) => {
    const now = Date.now();
    const alpha = 0.4 + 0.4 * Math.sin(now * 0.006);

    [
      { r: hint.r1, c: hint.c1 },
      { r: hint.r2, c: hint.c2 },
    ].forEach(({ r, c }) => {
      const x = bx + c * cellSize;
      const y = by + r * cellSize;
      ctx.save();
      ctx.strokeStyle = `rgba(56, 189, 248, ${alpha})`;
      ctx.lineWidth = 3;
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#38bdf8';
      ctx.beginPath();
      ctx.roundRect(x + 4, y + 4, cellSize - 8, cellSize - 8, 12);
      ctx.stroke();
      ctx.restore();
    });
  };

  // --- レーザービーム描画 ---
  const drawLasers = (
    ctx: CanvasRenderingContext2D,
    bx: number,
    by: number,
    size: number,
    cellSize: number
  ) => {
    for (let i = lasersRef.current.length - 1; i >= 0; i--) {
      const laser = lasersRef.current[i];
      laser.progress += 0.08;

      ctx.save();
      ctx.shadowBlur = 16;
      ctx.shadowColor = laser.color;
      ctx.fillStyle = laser.color;
      const alpha = Math.max(0, 1 - laser.progress);
      ctx.globalAlpha = alpha;

      if (laser.isRow) {
        const y = by + (laser.index + 0.5) * cellSize;
        ctx.fillRect(bx, y - 8, size, 16);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(bx, y - 3, size, 6);
      } else {
        const x = bx + (laser.index + 0.5) * cellSize;
        ctx.fillRect(x - 8, by, 16, size);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x - 3, by, 6, size);
      }
      ctx.restore();

      if (laser.progress >= 1) {
        lasersRef.current.splice(i, 1);
      }
    }
  };

  // --- パーティクル描画 ---
  const drawParticles = (ctx: CanvasRenderingContext2D) => {
    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
      const p = particlesRef.current[i];
      p.life++;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.12; // 重力
      p.alpha = Math.max(0, 1 - p.life / p.maxLife);

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;

      if (p.shape === 'sparkle') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.7, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      if (p.life >= p.maxLife) {
        particlesRef.current.splice(i, 1);
      }
    }
  };

  // --- 衝撃波描画 ---
  const drawShockwaves = (ctx: CanvasRenderingContext2D) => {
    for (let i = shockwavesRef.current.length - 1; i >= 0; i--) {
      const s = shockwavesRef.current[i];
      s.radius += (s.maxRadius - s.radius) * 0.22;
      s.alpha *= 0.88;

      ctx.save();
      ctx.globalAlpha = s.alpha;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.lineWidth;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      if (s.alpha <= 0.05 || s.radius >= s.maxRadius * 0.95) {
        shockwavesRef.current.splice(i, 1);
      }
    }
  };

  // --- 浮遊テキスト描画 ---
  const drawFloatingTexts = (ctx: CanvasRenderingContext2D) => {
    for (let i = floatingTextsRef.current.length - 1; i >= 0; i--) {
      const t = floatingTextsRef.current[i];
      t.y += t.vy;
      t.alpha *= 0.95;

      ctx.save();
      ctx.globalAlpha = t.alpha;
      ctx.fillStyle = t.color;
      ctx.font = `black ${Math.round(18 * t.scale)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#000000';
      ctx.fillText(t.text, t.x, t.y);
      ctx.restore();

      if (t.alpha <= 0.04) {
        floatingTextsRef.current.splice(i, 1);
      }
    }
  };

  // ミュート切り替え
  const toggleMute = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  return (
    <div
      className={`relative select-none overflow-hidden transition-all duration-300 flex flex-col ${
        isFullscreen
          ? 'fixed inset-0 w-screen h-screen z-50 bg-slate-950 text-white'
          : `w-full max-w-4xl mx-auto my-2 rounded-3xl border shadow-2xl ${
              isDark
                ? 'border-slate-800 bg-slate-950 text-slate-100'
                : 'border-slate-200 bg-slate-900 text-slate-100'
            }`
      }`}
    >
      {/* 上部ヘッダーコントロールバー */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md z-10 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
            title={isMuted ? 'ミュート解除' : 'ミュート'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>

        {/* スコア ＆ 目標表示 */}
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="text-center">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">SCORE</div>
            <div className="text-lg sm:text-2xl font-black font-mono text-amber-400">
              {score.toLocaleString()}
            </div>
          </div>

          {mode === 'timeAttack' && (
            <div className="text-center">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1 justify-center">
                <Clock className="w-3 h-3 text-sky-400" /> TIME
              </div>
              <div
                className={`text-lg sm:text-2xl font-black font-mono ${
                  timeLeft <= 15 ? 'text-rose-500 animate-pulse' : 'text-sky-300'
                }`}
              >
                {timeLeft}s
              </div>
            </div>
          )}

          {mode === 'mission' && (
            <div className="text-center">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1 justify-center">
                <Target className="w-3 h-3 text-emerald-400" /> MOVES
              </div>
              <div
                className={`text-lg sm:text-2xl font-black font-mono ${
                  movesLeft <= 5 ? 'text-rose-500 animate-pulse' : 'text-emerald-400'
                }`}
              >
                {movesLeft}
              </div>
            </div>
          )}

          <div className="hidden sm:block text-center">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1 justify-center">
              <Trophy className="w-3 h-3 text-amber-500" /> BEST
            </div>
            <div className="text-base font-bold font-mono text-slate-300">
              {highScore.toLocaleString()}
            </div>
          </div>
        </div>

        {/* 右側リスタート・メニュー */}
        <div className="flex items-center gap-2">
          {gameState === 'playing' && (
            <button
              onClick={() => setGameState('menu')}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-sm cursor-pointer"
            >
              モード選択
            </button>
          )}
        </div>
      </div>

      {/* フィーバーゲージバー */}
      {gameState === 'playing' && (
        <div className="w-full bg-slate-900/90 h-1.5 relative overflow-hidden shrink-0">
          <div
            className={`h-full transition-all duration-300 ${
              isFever
                ? 'bg-gradient-to-r from-amber-400 via-rose-500 to-amber-300 animate-pulse'
                : 'bg-gradient-to-r from-indigo-500 to-sky-400'
            }`}
            style={{ width: `${isFever ? (feverTimeLeft / 10) * 100 : feverGauge}%` }}
          />
        </div>
      )}

      {/* メインゲームプレイ領域 */}
      <div className="relative flex-1 flex flex-col items-center justify-center min-h-0 w-full overflow-hidden p-2">
        {/* メインCanvas */}
        <canvas
          ref={canvasRef}
          onMouseDown={(e) => handlePointerDown(e.clientX, e.clientY)}
          onMouseMove={(e) => handlePointerMove(e.clientX, e.clientY)}
          onMouseUp={(e) => handlePointerUp(e.clientX, e.clientY)}
          onTouchStart={(e) => {
            if (e.touches[0]) handlePointerDown(e.touches[0].clientX, e.touches[0].clientY);
          }}
          onTouchMove={(e) => {
            if (e.touches[0]) handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
          }}
          onTouchEnd={(e) => {
            if (e.changedTouches[0]) {
              handlePointerUp(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
            }
          }}
          className={`w-full h-full block cursor-pointer touch-none ${
            isFullscreen ? 'h-full max-h-none' : 'h-[520px] max-h-[70vh]'
          }`}
        />

        {/* --- タイトル / モード選択オーバーレイ --- */}
        {gameState === 'menu' && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20 animate-in fade-in duration-200">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-xl shadow-indigo-500/30 mb-4 animate-bounce">
              <Sparkles className="w-9 h-9 text-white" />
            </div>

            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white mb-2">
              ジュエルクエスト <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-indigo-400 to-cyan-400">Match 3</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-md mb-6 leading-relaxed">
              3つ以上並べてジュエルを粉砕！4消し雷光レーザー、交差爆弾、5消しレインボーを駆使して超絶連鎖を決めろ！
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 w-full max-w-lg mb-6">
              <button
                onClick={() => {
                  sound.playJewelSelect();
                  startGame('timeAttack');
                }}
                className="p-4 rounded-2xl bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700 hover:border-sky-400/60 hover:scale-103 transition shadow-lg text-left cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center mb-2.5 group-hover:scale-110 transition">
                  <Clock className="w-5 h-5" />
                </div>
                <div className="font-bold text-white text-sm">タイムアタック</div>
                <div className="text-[11px] text-slate-400 mt-1">90秒間で怒涛のハイスコア＆フィーバーを狙う！</div>
              </button>

              <button
                onClick={() => {
                  sound.playJewelSelect();
                  startGame('endless');
                }}
                className="p-4 rounded-2xl bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700 hover:border-purple-400/60 hover:scale-103 transition shadow-lg text-left cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center mb-2.5 group-hover:scale-110 transition">
                  <Compass className="w-5 h-5" />
                </div>
                <div className="font-bold text-white text-sm">エンドレス</div>
                <div className="text-[11px] text-slate-400 mt-1">時間制限なし。落ち着いて連鎖と思考を楽しむ。</div>
              </button>

              <button
                onClick={() => {
                  sound.playJewelSelect();
                  startGame('mission', 1);
                }}
                className="p-4 rounded-2xl bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700 hover:border-emerald-400/60 hover:scale-103 transition shadow-lg text-left cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2.5 group-hover:scale-110 transition">
                  <Target className="w-5 h-5" />
                </div>
                <div className="font-bold text-white text-sm">ステージミッション</div>
                <div className="text-[11px] text-slate-400 mt-1">規定の手数内で目標ノルマを達成する全5面。</div>
              </button>
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Lightbulb className="w-3.5 h-3.5 text-amber-400" /> スワイプ / クリック両対応
              </span>
              <span>•</span>
              <span>手詰まり自動シャッフル完備</span>
            </div>
          </div>
        )}

        {/* --- ゲームオーバー画面 --- */}
        {gameState === 'gameover' && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20 animate-in zoom-in-95 duration-200">
            <XCircle className="w-16 h-16 text-rose-500 mb-3" />
            <h2 className="text-2xl sm:text-3xl font-black text-white mb-1">
              {mode === 'timeAttack' ? 'TIME UP!' : 'GAME OVER'}
            </h2>
            <p className="text-xs text-slate-400 mb-6">華麗なジュエルプレイでした！</p>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 w-full max-w-xs mb-6 space-y-2">
              <div className="flex justify-between text-xs text-slate-400">
                <span>最終スコア</span>
                <span className="font-mono font-bold text-amber-400 text-sm">{score.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-400 border-t border-slate-800 pt-2">
                <span>ハイスコア</span>
                <span className="font-mono font-bold text-slate-200 text-sm">{highScore.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => startGame(mode, currentStage)}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm transition shadow-lg shadow-indigo-500/25 flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" /> もう一度プレイ
              </button>
              <button
                onClick={() => setGameState('menu')}
                className="px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-sm transition cursor-pointer"
              >
                モード選択
              </button>
            </div>
          </div>
        )}

        {/* --- ステージクリア画面 (Mission Mode) --- */}
        {gameState === 'stageClear' && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20 animate-in zoom-in-95 duration-200">
            <CheckCircle2 className="w-16 h-16 text-emerald-400 mb-3" />
            <h2 className="text-2xl sm:text-3xl font-black text-white mb-1">STAGE CLEARED!</h2>
            <p className="text-xs text-emerald-300 font-bold mb-4">ミッション目標をすべて達成しました！</p>

            {/* 星評価 */}
            <div className="flex items-center justify-center gap-2 mb-6">
              {[1, 2, 3].map((starIdx) => (
                <Star
                  key={starIdx}
                  className={`w-9 h-9 ${
                    (stageStars[currentStage] || 1) >= starIdx
                      ? 'text-amber-400 fill-amber-400 scale-110'
                      : 'text-slate-700'
                  } transition`}
                />
              ))}
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 w-full max-w-xs mb-6 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>獲得スコア</span>
                <span className="font-mono font-bold text-amber-400 text-sm">{score.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>残り手数</span>
                <span className="font-mono font-bold text-emerald-400 text-sm">{movesLeft} 手</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {currentStage < MISSION_STAGES.length ? (
                <button
                  onClick={() => startGame('mission', currentStage + 1)}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm transition shadow-lg flex items-center gap-2 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-white" /> 次のステージへ
                </button>
              ) : (
                <button
                  onClick={() => setGameState('menu')}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm transition shadow-lg cursor-pointer"
                >
                  全ステージ制覇！メニューへ
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 下部アイテム＆ミッションHUDバー */}
      {gameState === 'playing' && (
        <div className="px-4 py-2.5 border-t border-slate-800/80 bg-slate-900/60 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 shrink-0 z-10">
          {/* ミッション目標ミニバー */}
          {mode === 'mission' && MISSION_STAGES[currentStage - 1] && (
            <div className="flex items-center gap-3 text-xs">
              <span className="font-bold text-indigo-300">
                Stage {currentStage}:
              </span>
              <div className="flex items-center gap-2 text-slate-300">
                {Object.entries(MISSION_STAGES[currentStage - 1].targetGems).map(([col, req]) => (
                  <span key={col} className="flex items-center gap-1 font-mono">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: getColorHex(col as JewelColor) }}
                    />
                    {missionGemsCollected[col as JewelColor] || 0}/{req}
                  </span>
                ))}
                <span className="text-slate-400">|</span>
                <span className="text-amber-400 font-mono">
                  {score}/{MISSION_STAGES[currentStage - 1].targetScore}pts
                </span>
              </div>
            </div>
          )}

          {mode !== 'mission' && (
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>隣接するジュエルをスワイプまたはクリックで入れ替え</span>
            </div>
          )}

          {/* アイテムボタン群 */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => {
                const move = findPossibleMove(gridRef.current);
                hintRef.current = move;
                sound.playJewelSelect();
                if (move) {
                  addFloatingText('ここをスワップ！', move.r1, move.c1, '#38bdf8', 1.2);
                }
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              title="ヒント表示"
            >
              <Lightbulb className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ヒント</span>
            </button>

            <button
              onClick={() => handleUseItem('hammer')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                activeItem === 'hammer'
                  ? 'bg-amber-500 text-slate-950 font-black scale-105 shadow-md shadow-amber-500/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
              title="ハンマー: 1マス粉砕"
            >
              <Hammer className="w-3.5 h-3.5" />
              <span>{hammerCount}</span>
            </button>

            <button
              onClick={() => handleUseItem('bomb')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                activeItem === 'bomb'
                  ? 'bg-rose-500 text-white font-black scale-105 shadow-md shadow-rose-500/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
              title="ボム設置"
            >
              <Bomb className="w-3.5 h-3.5" />
              <span>{bombCount}</span>
            </button>

            <button
              onClick={() => handleUseItem('shuffle')}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              title="手動シャッフル"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>{shuffleCount}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
