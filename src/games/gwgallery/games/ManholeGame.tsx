import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GwCommonGameProps } from '../types';
import { GwDeviceFrame } from '../components/GwDeviceFrame';
import { gwSound } from '../sound';

// プレイヤー位置: 0: Top-Left, 1: Bottom-Left, 2: Top-Right, 3: Bottom-Right
type Position = 0 | 1 | 2 | 3;

// 歩行者ストリートと方向
type Street = 'upper' | 'lower';
type Direction = 'left-to-right' | 'right-to-left';

interface Pedestrian {
  id: number;
  street: Street;
  direction: Direction;
  step: number; // 0..9 (端から端まで全10ステップ)
}

// ステップごとのX座標定義 (left-to-right)
const STEPS_L2R_X = [35, 80, 125, 190, 235, 265, 310, 375, 420, 465];
// ステップごとのX座標定義 (right-to-left)
const STEPS_R2L_X = [465, 420, 375, 310, 265, 235, 190, 125, 80, 35];

export const ManholeGame: React.FC<GwCommonGameProps> = ({
  difficulty,
  screenMode,
  isFullscreen,
  onGameOver,
  onBackToMenu,
  onScoreChange,
  onMissChange,
  isPaused,
  onTogglePause,
  onRestart,
  onToggleScreenMode,
  onChangeDifficulty,
}) => {
  const [playerPos, setPlayerPos] = useState<Position>(1);
  const playerPosRef = useRef<Position>(1);
  useEffect(() => {
    playerPosRef.current = playerPos;
  }, [playerPos]);

  const [pedestrians, setPedestrians] = useState<Pedestrian[]>([]);
  const [score, setScore] = useState<number>(0);
  const [misses, setMisses] = useState<number>(0);
  const [missAnimation, setMissAnimation] = useState<Position | null>(null);
  const [isMissSequence, setIsMissSequence] = useState<boolean>(false);
  const [bonusTriggered, setBonusTriggered] = useState<boolean>(false);
  const [highScore, setHighScore] = useState<number>(() => {
    return parseInt(localStorage.getItem(`gw_manhole_${difficulty}`) || '0', 10);
  });

  const hasGameOverRef = useRef<boolean>(false);
  const nextIdRef = useRef<number>(1);
  const tickRef = useRef<number>(0);

  const baseSpeed = difficulty === 'gameA' ? 440 : 330;
  const currentSpeed = Math.max(170, baseSpeed - Math.floor(score / 25) * 15);

  useEffect(() => {
    onScoreChange(score);
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem(`gw_manhole_${difficulty}`, score.toString());
    }
    if (score >= 300 && !bonusTriggered) {
      setBonusTriggered(true);
      gwSound.bonus();
      setMisses(0);
      onMissChange(0);
    }
  }, [score, highScore, difficulty, bonusTriggered, onScoreChange, onMissChange]);

  // ゲームオーバー判定 (多重再生防止ガード)
  useEffect(() => {
    onMissChange(misses);
    if (misses >= 3 && !hasGameOverRef.current) {
      hasGameOverRef.current = true;
      gwSound.gameOver();
      onGameOver(score);
    }
  }, [misses, onMissChange, onGameOver, score]);

  const movePlayer = useCallback((posOrFn: Position | ((prev: Position) => Position)) => {
    if (misses >= 3 || isPaused || isMissSequence) return;
    setPlayerPos((prev) => {
      const next = typeof posOrFn === 'function' ? posOrFn(prev) : posOrFn;
      if (next !== prev) gwSound.catch();
      return next;
    });
  }, [misses, isPaused, isMissSequence]);

  // キーボード操作
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      if (misses >= 3 || isPaused || isMissSequence) return;

      switch (e.key) {
        case 'q':
        case 'Q':
        case '7':
          movePlayer(0);
          break;
        case 'a':
        case 'A':
        case '1':
          movePlayer(1);
          break;
        case 'e':
        case 'E':
        case '9':
          movePlayer(2);
          break;
        case 'd':
        case 'D':
        case '3':
          movePlayer(3);
          break;
        case 'ArrowUp':
          movePlayer((prev) => (prev === 1 ? 0 : prev === 3 ? 2 : prev));
          break;
        case 'ArrowDown':
          movePlayer((prev) => (prev === 0 ? 1 : prev === 2 ? 3 : prev));
          break;
        case 'ArrowLeft':
          movePlayer((prev) => (prev === 2 ? 0 : prev === 3 ? 1 : prev));
          break;
        case 'ArrowRight':
          movePlayer((prev) => (prev === 0 ? 2 : prev === 1 ? 3 : prev));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [movePlayer, misses, isPaused, isMissSequence]);

  // メインゲームループ Tick (端から端まで全10ステップ歩行)
  useEffect(() => {
    if (misses >= 3 || isPaused || isMissSequence) return;

    const timer = setInterval(() => {
      tickRef.current += 1;

      setPedestrians((prev) => {
        let currentList = prev;

        // 歩行者出現ロジック (上段/下段、左発/右発)
        const spawnInterval = difficulty === 'gameA' ? 4 : 3;
        if (tickRef.current % spawnInterval === 0) {
          // 出発口(step 0〜2)に既にいるストリート・方向は避ける
          const activeStarts = new Set(
            currentList.filter((p) => p.step <= 2).map((p) => `${p.street}-${p.direction}`)
          );
          const allCombos: { street: Street; direction: Direction }[] = [
            { street: 'upper', direction: 'left-to-right' },
            { street: 'upper', direction: 'right-to-left' },
            { street: 'lower', direction: 'left-to-right' },
            { street: 'lower', direction: 'right-to-left' },
          ];
          const freeCombos = allCombos.filter((c) => !activeStarts.has(`${c.street}-${c.direction}`));

          if (freeCombos.length > 0) {
            const chosen = freeCombos[Math.floor(Math.random() * freeCombos.length)];
            currentList = [
              ...currentList,
              {
                id: nextIdRef.current++,
                street: chosen.street,
                direction: chosen.direction,
                step: 0,
              },
            ];
          }
        }

        const nextList: Pedestrian[] = [];
        let scoreGain = 0;
        let newMiss = false;
        let missHole: Position | null = null;
        let walkedAny = false;

        const curPlayer = playerPosRef.current;

        for (const p of currentList) {
          const nextStep = p.step + 1;

          // マンホール穴の判定:
          // left-to-right: step 3(左穴), step 6(右穴)
          // right-to-left: step 3(右穴), step 6(左穴)
          let requiredHole: Position | null = null;

          if (p.direction === 'left-to-right') {
            if (nextStep === 3) {
              requiredHole = p.street === 'upper' ? 0 : 1; // 左穴
            } else if (nextStep === 6) {
              requiredHole = p.street === 'upper' ? 2 : 3; // 右穴
            }
          } else {
            if (nextStep === 3) {
              requiredHole = p.street === 'upper' ? 2 : 3; // 右穴
            } else if (nextStep === 6) {
              requiredHole = p.street === 'upper' ? 0 : 1; // 左穴
            }
          }

          if (requiredHole !== null) {
            // 穴の上に踏み出した！マンホールマンがいるか？
            if (curPlayer === requiredHole) {
              scoreGain += 1;
              gwSound.score();
              nextList.push({ ...p, step: nextStep });
            } else {
              // 落下！ミス！
              newMiss = true;
              missHole = requiredHole;
              gwSound.miss();
            }
          } else if (nextStep === 10) {
            // 端から端まで渡り切って建物に到着！ゴールボーナス！
            scoreGain += 2;
            gwSound.score();
            // step 10 で建物内へ退場
          } else if (nextStep < 10) {
            walkedAny = true;
            nextList.push({ ...p, step: nextStep });
          }
        }

        if (scoreGain > 0) {
          setScore((s) => s + scoreGain);
        } else if (walkedAny && !newMiss) {
          gwSound.tick(); // 1Tickに1回のみ軽快に再生
        }

        if (newMiss && missHole !== null) {
          setMisses((m) => m + 1);
          setMissAnimation(missHole);
          setIsMissSequence(true);

          setTimeout(() => {
            setMissAnimation(null);
            setPedestrians([]); // 他の歩行者をクリアして安全に再開
            setIsMissSequence(false);
          }, 1100);

          return [];
        }

        return nextList;
      });
    }, currentSpeed);

    return () => clearInterval(timer);
  }, [misses, isPaused, isMissSequence, difficulty, currentSpeed]);

  const isClassic = screenMode === 'classic';
  const activeColor = isClassic ? '#1c2419' : '#0284c7';
  const ghostColor = isClassic ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.05)';
  const manholeActive = isClassic ? '#1c2419' : '#f59e0b';
  const playerActive = isClassic ? '#1c2419' : '#dc2626';

  return (
    <GwDeviceFrame
      title="MANHOLE"
      series="GOLD"
      plateColor="gold"
      screenMode={screenMode}
      onToggleScreenMode={onToggleScreenMode}
      difficulty={difficulty}
      onChangeDifficulty={onChangeDifficulty}
      isMuted={gwSound.getMuted()}
      onToggleMute={() => gwSound.toggleMute()}
      isPaused={isPaused}
      onTogglePause={onTogglePause}
      onRestart={onRestart}
      onBackToMenu={onBackToMenu}
      isFullscreen={isFullscreen}
      controls={
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="text-[10px] font-mono font-bold text-neutral-800 flex items-center justify-between w-full px-4">
            <span className="bg-amber-100/80 px-2 py-0.5 rounded border border-amber-300">
              KEY: Q/A/E/D or ARROWS or NUM 7/1/9/3
            </span>
            <span className="text-amber-900 font-extrabold">BEST: {highScore}</span>
          </div>

          <div className="grid grid-cols-2 gap-x-12 sm:gap-x-24 gap-y-2 w-full max-w-[420px] px-2">
            <button
              onClick={() => movePlayer(0)}
              className={`py-2 px-3 sm:py-2.5 rounded-lg border-2 shadow-md flex items-center justify-center space-x-1 font-bold text-xs active:scale-95 transition-all ${
                playerPos === 0
                  ? 'bg-red-600 text-white border-red-800 ring-2 ring-red-300'
                  : 'bg-neutral-800 text-amber-200 border-neutral-900 hover:bg-neutral-700'
              }`}
            >
              <span>▲ LEFT UP</span>
            </button>
            <button
              onClick={() => movePlayer(2)}
              className={`py-2 px-3 sm:py-2.5 rounded-lg border-2 shadow-md flex items-center justify-center space-x-1 font-bold text-xs active:scale-95 transition-all ${
                playerPos === 2
                  ? 'bg-red-600 text-white border-red-800 ring-2 ring-red-300'
                  : 'bg-neutral-800 text-amber-200 border-neutral-900 hover:bg-neutral-700'
              }`}
            >
              <span>RIGHT UP ▲</span>
            </button>
            <button
              onClick={() => movePlayer(1)}
              className={`py-2 px-3 sm:py-2.5 rounded-lg border-2 shadow-md flex items-center justify-center space-x-1 font-bold text-xs active:scale-95 transition-all ${
                playerPos === 1
                  ? 'bg-red-600 text-white border-red-800 ring-2 ring-red-300'
                  : 'bg-neutral-800 text-amber-200 border-neutral-900 hover:bg-neutral-700'
              }`}
            >
              <span>▼ LEFT DOWN</span>
            </button>
            <button
              onClick={() => movePlayer(3)}
              className={`py-2 px-3 sm:py-2.5 rounded-lg border-2 shadow-md flex items-center justify-center space-x-1 font-bold text-xs active:scale-95 transition-all ${
                playerPos === 3
                  ? 'bg-red-600 text-white border-red-800 ring-2 ring-red-300'
                  : 'bg-neutral-800 text-amber-200 border-neutral-900 hover:bg-neutral-700'
              }`}
            >
              <span>RIGHT DOWN ▼</span>
            </button>
          </div>
        </div>
      }
    >
      <div className="relative w-full h-full">
        {/* LCDヘッダー情報 */}
        <div className="absolute top-2 left-4 right-4 flex items-center justify-between font-mono z-20 pointer-events-none">
          <div className="flex items-center space-x-2">
            <span className="text-xs sm:text-sm font-black text-neutral-900 bg-neutral-900/10 px-2 py-0.5 rounded">
              {difficulty.toUpperCase()}
            </span>
            {isPaused && (
              <span className="text-xs sm:text-sm font-black text-red-700 animate-pulse bg-red-100/80 px-2 py-0.5 rounded">
                PAUSED
              </span>
            )}
          </div>

          <div className="text-xl sm:text-2xl font-black tracking-widest text-neutral-900 font-mono">
            {score.toString().padStart(4, '0')}
          </div>

          <div className="flex items-center space-x-1">
            <span className="text-[10px] font-bold text-neutral-700">MISS:</span>
            {[0, 1, 2].map((idx) => (
              <span
                key={idx}
                className={`text-sm sm:text-base font-black ${
                  idx < misses ? 'text-red-700' : 'text-neutral-400/30'
                }`}
              >
                ✕
              </span>
            ))}
          </div>
        </div>

        {/* 画面直接タップ領域 */}
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 z-10">
          <div
            onClick={() => movePlayer(0)}
            className="cursor-pointer active:bg-black/5 transition-colors"
            title="上段左へ移動"
          />
          <div
            onClick={() => movePlayer(2)}
            className="cursor-pointer active:bg-black/5 transition-colors"
            title="上段右へ移動"
          />
          <div
            onClick={() => movePlayer(1)}
            className="cursor-pointer active:bg-black/5 transition-colors"
            title="下段左へ移動"
          />
          <div
            onClick={() => movePlayer(3)}
            className="cursor-pointer active:bg-black/5 transition-colors"
            title="下段右へ移動"
          />
        </div>

        {/* SVGグラフィックスビュー */}
        <svg
          viewBox="0 0 500 340"
          className="w-full h-full drop-shadow-sm select-none"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* 背景：端から端まで通じる2階層の通路 */}
          {/* 上段ストリート (y: 120): 左通路・中央島・右通路 */}
          <line x1="10" y1="120" x2="164" y2="120" stroke="#1c2419" strokeWidth="4" strokeLinecap="round" />
          <line x1="216" y1="120" x2="284" y2="120" stroke="#1c2419" strokeWidth="4" strokeLinecap="round" />
          <line x1="336" y1="120" x2="490" y2="120" stroke="#1c2419" strokeWidth="4" strokeLinecap="round" />

          {/* 下段ストリート (y: 230): 左通路・中央島・右通路 */}
          <line x1="10" y1="230" x2="164" y2="230" stroke="#1c2419" strokeWidth="4" strokeLinecap="round" />
          <line x1="216" y1="230" x2="284" y2="230" stroke="#1c2419" strokeWidth="4" strokeLinecap="round" />
          <line x1="336" y1="230" x2="490" y2="230" stroke="#1c2419" strokeWidth="4" strokeLinecap="round" />

          {/* 左右のビル（建物と出入口ドア） */}
          {/* 左ビル (x: 0〜25) */}
          <rect x="0" y="50" width="25" height="230" fill="#1c2419" opacity="0.3" />
          <line x1="25" y1="50" x2="25" y2="280" stroke="#1c2419" strokeWidth="2" opacity="0.6" />
          {/* 左ビル 上段ドア */}
          <rect x="5" y="86" width="16" height="34" rx="2" fill="#1c2419" opacity="0.7" />
          <circle cx="18" cy="103" r="1.5" fill="#fef08a" />
          {/* 左ビル 下段ドア */}
          <rect x="5" y="196" width="16" height="34" rx="2" fill="#1c2419" opacity="0.7" />
          <circle cx="18" cy="213" r="1.5" fill="#fef08a" />

          {/* 右ビル (x: 475〜500) */}
          <rect x="475" y="50" width="25" height="230" fill="#1c2419" opacity="0.3" />
          <line x1="475" y1="50" x2="475" y2="280" stroke="#1c2419" strokeWidth="2" opacity="0.6" />
          {/* 右ビル 上段ドア */}
          <rect x="479" y="86" width="16" height="34" rx="2" fill="#1c2419" opacity="0.7" />
          <circle cx="482" cy="103" r="1.5" fill="#fef08a" />
          {/* 右ビル 下段ドア */}
          <rect x="479" y="196" width="16" height="34" rx="2" fill="#1c2419" opacity="0.7" />
          <circle cx="482" cy="213" r="1.5" fill="#fef08a" />

          {/* 水面と波 */}
          <path d="M 20 280 Q 250 270 480 280" stroke="#1c2419" strokeWidth="2" fill="none" opacity="0.4" />
          <path d="M 10 300 Q 250 290 490 300" stroke="#1c2419" strokeWidth="3" fill="none" opacity="0.6" />

          {/* 4つのマンホールの穴 */}
          {/* 上段左の穴 (164〜216) */}
          <ellipse cx="190" cy="122" rx="26" ry="6" fill="#000" opacity="0.2" />
          {/* 下段左の穴 (164〜216) */}
          <ellipse cx="190" cy="232" rx="26" ry="6" fill="#000" opacity="0.2" />
          {/* 上段右の穴 (284〜336) */}
          <ellipse cx="310" cy="122" rx="26" ry="6" fill="#000" opacity="0.2" />
          {/* 下段右の穴 (284〜336) */}
          <ellipse cx="310" cy="232" rx="26" ry="6" fill="#000" opacity="0.2" />

          {/* マンホールフタ（プレイヤーがいる位置で持ち上げられ橋になる） */}
          <rect
            x="164"
            y="118"
            width="52"
            height="5"
            rx="2"
            fill={playerPos === 0 ? manholeActive : ghostColor}
          />
          <rect
            x="164"
            y="228"
            width="52"
            height="5"
            rx="2"
            fill={playerPos === 1 ? manholeActive : ghostColor}
          />
          <rect
            x="284"
            y="118"
            width="52"
            height="5"
            rx="2"
            fill={playerPos === 2 ? manholeActive : ghostColor}
          />
          <rect
            x="284"
            y="228"
            width="52"
            height="5"
            rx="2"
            fill={playerPos === 3 ? manholeActive : ghostColor}
          />

          {/* プレイヤー（中央でマンホールを持ち上げる作業員マン） */}
          <rect x="220" y="240" width="60" height="8" rx="2" fill="#1c2419" opacity="0.3" />

          {/* ポーズ 0: 上左を持ち上げる */}
          <g opacity={playerPos === 0 ? 1 : 0.05}>
            <circle cx="238" cy="155" r="9" fill={playerActive} />
            <line x1="240" y1="164" x2="246" y2="215" stroke={playerActive} strokeWidth="6" strokeLinecap="round" />
            <path d="M 240 170 L 210 150 L 190 123" fill="none" stroke={playerActive} strokeWidth="5" strokeLinecap="round" />
            <line x1="240" y1="175" x2="255" y2="195" stroke={playerActive} strokeWidth="4" strokeLinecap="round" />
            <line x1="246" y1="215" x2="236" y2="240" stroke={playerActive} strokeWidth="5" strokeLinecap="round" />
            <line x1="246" y1="215" x2="256" y2="240" stroke={playerActive} strokeWidth="5" strokeLinecap="round" />
          </g>

          {/* ポーズ 1: 下左を持ち上げる */}
          <g opacity={playerPos === 1 ? 1 : 0.05}>
            <circle cx="236" cy="180" r="9" fill={playerActive} />
            <line x1="238" y1="189" x2="244" y2="225" stroke={playerActive} strokeWidth="6" strokeLinecap="round" />
            <path d="M 238 195 L 210 215 L 190 232" fill="none" stroke={playerActive} strokeWidth="5" strokeLinecap="round" />
            <line x1="238" y1="195" x2="252" y2="210" stroke={playerActive} strokeWidth="4" strokeLinecap="round" />
            <line x1="244" y1="225" x2="234" y2="240" stroke={playerActive} strokeWidth="5" strokeLinecap="round" />
            <line x1="244" y1="225" x2="254" y2="240" stroke={playerActive} strokeWidth="5" strokeLinecap="round" />
          </g>

          {/* ポーズ 2: 上右を持ち上げる */}
          <g opacity={playerPos === 2 ? 1 : 0.05}>
            <circle cx="262" cy="155" r="9" fill={playerActive} />
            <line x1="260" y1="164" x2="254" y2="215" stroke={playerActive} strokeWidth="6" strokeLinecap="round" />
            <path d="M 260 170 L 290 150 L 310 123" fill="none" stroke={playerActive} strokeWidth="5" strokeLinecap="round" />
            <line x1="260" y1="175" x2="245" y2="195" stroke={playerActive} strokeWidth="4" strokeLinecap="round" />
            <line x1="254" y1="215" x2="244" y2="240" stroke={playerActive} strokeWidth="5" strokeLinecap="round" />
            <line x1="254" y1="215" x2="264" y2="240" stroke={playerActive} strokeWidth="5" strokeLinecap="round" />
          </g>

          {/* ポーズ 3: 下右を持ち上げる */}
          <g opacity={playerPos === 3 ? 1 : 0.05}>
            <circle cx="264" cy="180" r="9" fill={playerActive} />
            <line x1="262" y1="189" x2="256" y2="225" stroke={playerActive} strokeWidth="6" strokeLinecap="round" />
            <path d="M 262 195 L 290 215 L 310 232" fill="none" stroke={playerActive} strokeWidth="5" strokeLinecap="round" />
            <line x1="262" y1="195" x2="248" y2="210" stroke={playerActive} strokeWidth="4" strokeLinecap="round" />
            <line x1="256" y1="225" x2="246" y2="240" stroke={playerActive} strokeWidth="5" strokeLinecap="round" />
            <line x1="256" y1="225" x2="266" y2="240" stroke={playerActive} strokeWidth="5" strokeLinecap="round" />
          </g>

          {/* 歩行者セグメント描画 (端から端まで全10ステップ・進行方向ウォーキングポーズ) */}
          {/* 1. 上段ストリート (y: 100) */}
          {STEPS_L2R_X.map((cx, stepIdx) => {
            const activeL2R = pedestrians.some(
              (p) => p.street === 'upper' && p.direction === 'left-to-right' && p.step === stepIdx
            );
            const r2lStep = STEPS_R2L_X.indexOf(cx);
            const activeR2L = pedestrians.some(
              (p) => p.street === 'upper' && p.direction === 'right-to-left' && p.step === r2lStep
            );
            const isActive = activeL2R || activeR2L;
            const isRight = activeL2R;
            const isLeft = activeR2L && !activeL2R;
            const cy = 100;

            return (
              <g key={`upper-${stepIdx}`} opacity={isActive ? 1 : 0.035}>
                {/* 頭とハット */}
                <circle cx={cx} cy={cy - 12} r="5" fill={activeColor} />
                <line x1={cx - 7} y1={cy - 15} x2={cx + 7} y2={cy - 15} stroke={activeColor} strokeWidth="2" strokeLinecap="round" />
                <rect x={cx - 3.5} y={cy - 19} width="7" height="4" fill={activeColor} rx="1" />
                {/* 体幹 */}
                <line
                  x1={isRight ? cx - 1 : isLeft ? cx + 1 : cx}
                  y1={cy - 7}
                  x2={isRight ? cx + 2 : isLeft ? cx - 2 : cx}
                  y2={cy + 7}
                  stroke={activeColor}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                {/* 腕・ステッキ */}
                {isRight ? (
                  <path
                    d={`M ${cx} ${cy - 2} L ${cx + 6} ${cy + 5} L ${cx + 8} ${cy + 16}`}
                    stroke={activeColor}
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                  />
                ) : isLeft ? (
                  <path
                    d={`M ${cx} ${cy - 2} L ${cx - 6} ${cy + 5} L ${cx - 8} ${cy + 16}`}
                    stroke={activeColor}
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                  />
                ) : (
                  <line x1={cx} y1={cy} x2={cx + 5} y2={cy + 10} stroke={activeColor} strokeWidth="1.5" />
                )}
                {/* 脚部 */}
                {isRight ? (
                  <>
                    <line x1={cx + 2} y1={cy + 7} x2={cx + 7} y2={cy + 18} stroke={activeColor} strokeWidth="2.5" strokeLinecap="round" />
                    <line x1={cx + 2} y1={cy + 7} x2={cx - 5} y2={cy + 17} stroke={activeColor} strokeWidth="2" strokeLinecap="round" />
                  </>
                ) : isLeft ? (
                  <>
                    <line x1={cx - 2} y1={cy + 7} x2={cx - 7} y2={cy + 18} stroke={activeColor} strokeWidth="2.5" strokeLinecap="round" />
                    <line x1={cx - 2} y1={cy + 7} x2={cx + 5} y2={cy + 17} stroke={activeColor} strokeWidth="2" strokeLinecap="round" />
                  </>
                ) : (
                  <>
                    <line x1={cx} y1={cy + 7} x2={cx - 5} y2={cy + 18} stroke={activeColor} strokeWidth="2" />
                    <line x1={cx} y1={cy + 7} x2={cx + 5} y2={cy + 18} stroke={activeColor} strokeWidth="2" />
                  </>
                )}
              </g>
            );
          })}

          {/* 2. 下段ストリート (y: 210) */}
          {STEPS_L2R_X.map((cx, stepIdx) => {
            const activeL2R = pedestrians.some(
              (p) => p.street === 'lower' && p.direction === 'left-to-right' && p.step === stepIdx
            );
            const r2lStep = STEPS_R2L_X.indexOf(cx);
            const activeR2L = pedestrians.some(
              (p) => p.street === 'lower' && p.direction === 'right-to-left' && p.step === r2lStep
            );
            const isActive = activeL2R || activeR2L;
            const isRight = activeL2R;
            const isLeft = activeR2L && !activeL2R;
            const cy = 210;

            return (
              <g key={`lower-${stepIdx}`} opacity={isActive ? 1 : 0.035}>
                {/* 頭とハット */}
                <circle cx={cx} cy={cy - 12} r="5" fill={activeColor} />
                <line x1={cx - 7} y1={cy - 15} x2={cx + 7} y2={cy - 15} stroke={activeColor} strokeWidth="2" strokeLinecap="round" />
                <rect x={cx - 3.5} y={cy - 19} width="7" height="4" fill={activeColor} rx="1" />
                {/* 体幹 */}
                <line
                  x1={isRight ? cx - 1 : isLeft ? cx + 1 : cx}
                  y1={cy - 7}
                  x2={isRight ? cx + 2 : isLeft ? cx - 2 : cx}
                  y2={cy + 7}
                  stroke={activeColor}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                {/* 腕・ステッキ */}
                {isRight ? (
                  <path
                    d={`M ${cx} ${cy - 2} L ${cx + 6} ${cy + 5} L ${cx + 8} ${cy + 16}`}
                    stroke={activeColor}
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                  />
                ) : isLeft ? (
                  <path
                    d={`M ${cx} ${cy - 2} L ${cx - 6} ${cy + 5} L ${cx - 8} ${cy + 16}`}
                    stroke={activeColor}
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                  />
                ) : (
                  <line x1={cx} y1={cy} x2={cx + 5} y2={cy + 10} stroke={activeColor} strokeWidth="1.5" />
                )}
                {/* 脚部 */}
                {isRight ? (
                  <>
                    <line x1={cx + 2} y1={cy + 7} x2={cx + 7} y2={cy + 18} stroke={activeColor} strokeWidth="2.5" strokeLinecap="round" />
                    <line x1={cx + 2} y1={cy + 7} x2={cx - 5} y2={cy + 17} stroke={activeColor} strokeWidth="2" strokeLinecap="round" />
                  </>
                ) : isLeft ? (
                  <>
                    <line x1={cx - 2} y1={cy + 7} x2={cx - 7} y2={cy + 18} stroke={activeColor} strokeWidth="2.5" strokeLinecap="round" />
                    <line x1={cx - 2} y1={cy + 7} x2={cx + 5} y2={cy + 17} stroke={activeColor} strokeWidth="2" strokeLinecap="round" />
                  </>
                ) : (
                  <>
                    <line x1={cx} y1={cy + 7} x2={cx - 5} y2={cy + 18} stroke={activeColor} strokeWidth="2" />
                    <line x1={cx} y1={cy + 7} x2={cx + 5} y2={cy + 18} stroke={activeColor} strokeWidth="2" />
                  </>
                )}
              </g>
            );
          })}

          {/* 水中への落下・水しぶきと魚演出 */}
          {missAnimation !== null && (
            <g className="animate-bounce">
              <ellipse
                cx={missAnimation === 0 || missAnimation === 1 ? 190 : 310}
                cy={295}
                rx="18"
                ry="4"
                fill="#ef4444"
              />
              <path
                d={`M ${missAnimation === 0 || missAnimation === 1 ? 190 : 310} 290 L ${
                  missAnimation === 0 || missAnimation === 1 ? 175 : 295
                } 275 M ${missAnimation === 0 || missAnimation === 1 ? 190 : 310} 290 L ${
                  missAnimation === 0 || missAnimation === 1 ? 205 : 325
                } 275`}
                stroke="#ef4444"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <circle
                cx={missAnimation === 0 || missAnimation === 1 ? 180 : 320}
                cy="270"
                r="3"
                fill="#f59e0b"
              />
            </g>
          )}

          {/* ゲームオーバー */}
          {misses >= 3 && (
            <g>
              <rect x="150" y="140" width="200" height="60" rx="8" fill="#1c2419" opacity="0.9" />
              <text
                x="250"
                y="178"
                textAnchor="middle"
                fill="#fef08a"
                fontSize="22"
                fontFamily="monospace"
                fontWeight="900"
              >
                GAME OVER
              </text>
            </g>
          )}
        </svg>
      </div>
    </GwDeviceFrame>
  );
};
