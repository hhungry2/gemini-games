import React from 'react';
import { GwCommonGameProps } from '../types';
import { GwDeviceFrame } from '../components/GwDeviceFrame';
import { createManhole, tickManhole, type ManholePosition } from '../engine';
import { useGwGame } from '../useGwGame';
import { useGwKeys } from '../useGwKeys';

type Position = ManholePosition;
const STEPS_L2R_X = [35, 80, 125, 190, 235, 265, 310, 375, 420, 465];
const STEPS_R2L_X = [465, 420, 375, 310, 265, 235, 190, 125, 80, 35];

export const ManholeGame: React.FC<GwCommonGameProps> = ({
  difficulty,
  screenMode,
  isFullscreen,
  onGameOver,
  onBackToMenu,
  isPaused,
  onTogglePause,
  onRestart,
  onToggleScreenMode,
  onChangeDifficulty,
  isMuted,
  onToggleMute,
}) => {

  const { state, act, highScore, blocked } = useGwGame('manhole', difficulty, isPaused, createManhole, tickManhole,
    score => Math.max(170, (difficulty === 'gameA' ? 440 : 330) - Math.floor(score / 25) * 15), onGameOver);
  const { playerPos, pedestrians, score, misses, missAnimation } = state;
  const movePlayer = (posOrFn: Position | ((prev: Position) => Position)) => act(previous => {
    const playerPos = typeof posOrFn === 'function' ? posOrFn(previous.playerPos) : posOrFn;
    return playerPos === previous.playerPos ? previous : { ...previous, playerPos, sounds: ['catch'] };
  });
  useGwKeys(key => {
    const positions: Record<string, Position> = { q: 0, '7': 0, a: 1, '1': 1, e: 2, '9': 2, d: 3, '3': 3 };
    if (key in positions) movePlayer(positions[key]);
    else if (key === 'arrowup') movePlayer(p => (p === 1 ? 0 : p === 3 ? 2 : p));
    else if (key === 'arrowdown') movePlayer(p => (p === 0 ? 1 : p === 2 ? 3 : p));
    else if (key === 'arrowleft') movePlayer(p => (p === 2 ? 0 : p === 3 ? 1 : p));
    else if (key === 'arrowright') movePlayer(p => (p === 0 ? 2 : p === 1 ? 3 : p));
    else return false;
    return true;
  });

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
      isMuted={isMuted}
      onToggleMute={onToggleMute}
      isPaused={isPaused}
      onTogglePause={onTogglePause}
      onRestart={onRestart}
      onBackToMenu={onBackToMenu}
      isFullscreen={isFullscreen}
      isGameOver={misses >= 3}
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
              disabled={blocked}
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
              disabled={blocked}
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
              disabled={blocked}
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
              disabled={blocked}
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

          <output aria-label="スコア" className="text-xl sm:text-2xl font-black tracking-widest text-neutral-900 font-mono">
            {score.toString().padStart(4, '0')}
          </output>

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
