import React from 'react';
import { GwCommonGameProps } from '../types';
import { GwMultiScreenFrame } from '../components/GwMultiScreenFrame';
import { createOil, tickOil, dumpOil as pourOil, type UpperPosition } from '../engine';
import { useGwGame } from '../useGwGame';
import { useGwKeys } from '../useGwKeys';

export const OilPanicGame: React.FC<GwCommonGameProps> = ({
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

  const { state, act, highScore, blocked } = useGwGame('oilpanic', difficulty, isPaused, createOil, tickOil,
    score => Math.max(170, (difficulty === 'gameA' ? 460 : 340) - Math.floor(score / 25) * 15), onGameOver);
  const { playerPos, bucketAmount, helperPos, helperDirection, oilDrops, fallingOil, score, misses, missEffect } = state;
  const moveLeft = () => act(previous => previous.playerPos === -1 ? previous :
    { ...previous, playerPos: (previous.playerPos - 1) as UpperPosition, sounds: ['catch'] });
  const moveRight = () => act(previous => previous.playerPos === 3 ? previous :
    { ...previous, playerPos: (previous.playerPos + 1) as UpperPosition, sounds: ['catch'] });
  const dumpOil = () => act(pourOil);
  useGwKeys(key => {
    if (key === 'arrowleft' || key === 'a') moveLeft();
    else if (key === 'arrowright' || key === 'd') moveRight();
    else if (key === ' ' || key === 'arrowdown' || key === 's') dumpOil();
    else return false;
    return true;
  });

  const isClassic = screenMode === 'classic';
  const oilColor = isClassic ? '#1c2419' : '#000000';
  const playerColor = isClassic ? '#1c2419' : '#0284c7';
  const helperColor = isClassic ? '#1c2419' : '#ca8a04';
  const pipeColor = isClassic ? '#1c2419' : '#475569';

  return (
    <GwMultiScreenFrame
      title="OIL PANIC"
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
      topScreen={
        /* 上画面: 配管から落ちるオイル雫とバケツキャッチ */
        <div className="relative w-full h-full">
          {/* LCD情報 */}
          <div className="absolute top-1 left-3 right-3 flex items-center justify-between font-mono z-20 pointer-events-none text-[10px]">
            <span className="font-black bg-neutral-900/10 px-1.5 py-0.5 rounded text-neutral-900">
              {difficulty.toUpperCase()}
            </span>
            <output aria-label="スコア" className="text-base sm:text-lg font-black tracking-widest text-neutral-900">
            {score.toString().padStart(4, '0')}
          </output>
            <div className="flex items-center space-x-1">
              <span className="font-bold text-neutral-700">MISS:</span>
              {[0, 1, 2].map((idx) => (
                <span
                  key={idx}
                  className={`text-xs font-black ${
                    idx < misses ? 'text-red-700' : 'text-neutral-400/30'
                  }`}
                >
                  ✕
                </span>
              ))}
            </div>
          </div>

          {/* 画面直接タップ領域 (左半分で左移動、右半分で右移動、窓では流す) */}
          <div className="absolute inset-0 grid grid-cols-2 z-10">
            <div
              onClick={() => {
                if (playerPos === -1 && bucketAmount > 0) {
                  dumpOil();
                } else {
                  moveLeft();
                }
              }}
              className="cursor-pointer active:bg-black/5"
            />
            <div
              onClick={() => {
                if (playerPos === 3 && bucketAmount > 0) {
                  dumpOil();
                } else {
                  moveRight();
                }
              }}
              className="cursor-pointer active:bg-black/5"
            />
          </div>

          <svg viewBox="0 0 500 240" className="w-full h-full select-none" preserveAspectRatio="xMidYMid meet">
            {/* 上部配管 (左・中・右から漏れる) */}
            <line x1="20" y1="45" x2="480" y2="45" stroke={pipeColor} strokeWidth="8" strokeLinecap="round" />
            <circle cx="120" cy="45" r="7" fill={pipeColor} />
            <circle cx="250" cy="45" r="7" fill={pipeColor} />
            <circle cx="380" cy="45" r="7" fill={pipeColor} />

            {/* 床ライン */}
            <line x1="10" y1="210" x2="490" y2="210" stroke="#1c2419" strokeWidth="4" />
            {/* 左右の窓 */}
            <rect x="10" y="120" width="30" height="90" fill="none" stroke="#1c2419" strokeWidth="3" />
            <rect x="460" y="120" width="30" height="90" fill="none" stroke="#1c2419" strokeWidth="3" />

            {/* オイル雫セグメント (3レーン x 3ステップ) */}
            {/* レーン0: 左 (x: 120) */}
            {[0, 1, 2].map((step) => {
              const active = oilDrops.some((d) => d.lane === 0 && d.step === step);
              const yCoords = [65, 110, 155];
              return (
                <ellipse
                  key={`drop-0-${step}`}
                  cx="120"
                  cy={yCoords[step]}
                  rx="5"
                  ry="9"
                  fill={oilColor}
                  opacity={active ? 1 : 0.04}
                />
              );
            })}

            {/* レーン1: 中 (x: 250) */}
            {[0, 1, 2].map((step) => {
              const active = oilDrops.some((d) => d.lane === 1 && d.step === step);
              const yCoords = [65, 110, 155];
              return (
                <ellipse
                  key={`drop-1-${step}`}
                  cx="250"
                  cy={yCoords[step]}
                  rx="5"
                  ry="9"
                  fill={oilColor}
                  opacity={active ? 1 : 0.04}
                />
              );
            })}

            {/* レーン2: 右 (x: 380) */}
            {[0, 1, 2].map((step) => {
              const active = oilDrops.some((d) => d.lane === 2 && d.step === step);
              const yCoords = [65, 110, 155];
              return (
                <ellipse
                  key={`drop-2-${step}`}
                  cx="380"
                  cy={yCoords[step]}
                  rx="5"
                  ry="9"
                  fill={oilColor}
                  opacity={active ? 1 : 0.04}
                />
              );
            })}

            {/* プレイヤー（店員）の各位置ポーズ */}
            {/* -1: 左窓から流す */}
            <g opacity={playerPos === -1 ? 1 : 0.04}>
              <circle cx="45" cy="150" r="8" fill={playerColor} />
              <line x1="45" y1="158" x2="48" y2="188" stroke={playerColor} strokeWidth="5" />
              <line x1="48" y1="188" x2="42" y2="210" stroke={playerColor} strokeWidth="4" />
              <line x1="48" y1="188" x2="54" y2="210" stroke={playerColor} strokeWidth="4" />
              {/* 傾けたバケツ */}
              <path d="M 45 165 L 20 175 L 25 190 L 48 178 Z" fill={helperColor} />
            </g>

            {/* 0: 左直下 */}
            <g opacity={playerPos === 0 ? 1 : 0.04}>
              <circle cx="120" cy="160" r="8" fill={playerColor} />
              <line x1="120" y1="168" x2="120" y2="192" stroke={playerColor} strokeWidth="5" />
              <line x1="120" y1="192" x2="114" y2="210" stroke={playerColor} strokeWidth="4" />
              <line x1="120" y1="192" x2="126" y2="210" stroke={playerColor} strokeWidth="4" />
              {/* バケツ */}
              <rect x="110" y="166" width="20" height="14" rx="2" fill={helperColor} />
              {/* 溜まったオイル表示 */}
              <text x="120" y="177" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#000">
                {bucketAmount}
              </text>
            </g>

            {/* 1: 中央直下 */}
            <g opacity={playerPos === 1 ? 1 : 0.04}>
              <circle cx="250" cy="160" r="8" fill={playerColor} />
              <line x1="250" y1="168" x2="250" y2="192" stroke={playerColor} strokeWidth="5" />
              <line x1="250" y1="192" x2="244" y2="210" stroke={playerColor} strokeWidth="4" />
              <line x1="250" y1="192" x2="256" y2="210" stroke={playerColor} strokeWidth="4" />
              <rect x="240" y="166" width="20" height="14" rx="2" fill={helperColor} />
              <text x="250" y="177" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#000">
                {bucketAmount}
              </text>
            </g>

            {/* 2: 右直下 */}
            <g opacity={playerPos === 2 ? 1 : 0.04}>
              <circle cx="380" cy="160" r="8" fill={playerColor} />
              <line x1="380" y1="168" x2="380" y2="192" stroke={playerColor} strokeWidth="5" />
              <line x1="380" y1="192" x2="374" y2="210" stroke={playerColor} strokeWidth="4" />
              <line x1="380" y1="192" x2="386" y2="210" stroke={playerColor} strokeWidth="4" />
              <rect x="370" y="166" width="20" height="14" rx="2" fill={helperColor} />
              <text x="380" y="177" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#000">
                {bucketAmount}
              </text>
            </g>

            {/* 3: 右窓から流す */}
            <g opacity={playerPos === 3 ? 1 : 0.04}>
              <circle cx="455" cy="150" r="8" fill={playerColor} />
              <line x1="455" y1="158" x2="452" y2="188" stroke={playerColor} strokeWidth="5" />
              <line x1="452" y1="188" x2="446" y2="210" stroke={playerColor} strokeWidth="4" />
              <line x1="452" y1="188" x2="458" y2="210" stroke={playerColor} strokeWidth="4" />
              <path d="M 455 165 L 480 175 L 475 190 L 452 178 Z" fill={helperColor} />
            </g>

            {/* 上画面ミス火災演出 */}
            {missEffect?.screen === 'top' && (
              <g className="animate-bounce">
                <ellipse cx={missEffect.x} cy="210" rx="14" ry="4" fill="#dc2626" />
                <path
                  d={`M ${missEffect.x - 10} 210 Q ${missEffect.x} 185 ${missEffect.x + 10} 210 Z`}
                  fill="#ea580c"
                />
              </g>
            )}
          </svg>
        </div>
      }
      bottomScreen={
        /* 下画面: 外でドラム缶を持ったオッサンがキャッチ */
        <div className="relative w-full h-full">
          <div className="absolute top-1 left-3 right-3 flex items-center justify-between font-mono z-20 pointer-events-none text-[9px] text-neutral-700 font-bold">
            <span>OUTSIDE STATION</span>
            <span>DRUM {helperDirection === -1 ? "←" : "→"} · 2 TICKS / STEP</span>
          </div>

          <svg viewBox="0 0 500 240" className="w-full h-full select-none" preserveAspectRatio="xMidYMid meet">
            {/* 地面 */}
            <line x1="10" y1="210" x2="490" y2="210" stroke="#1c2419" strokeWidth="4" />

            {/* 建物の壁と落下ガイド */}
            <line x1="40" y1="0" x2="40" y2="160" stroke="#1c2419" strokeWidth="3" opacity="0.4" />
            <line x1="460" y1="0" x2="460" y2="160" stroke="#1c2419" strokeWidth="3" opacity="0.4" />

            {/* 左窓から落ちてくるオイル (x: 75, steps) */}
            {[0, 1, 2].map((step) => {
              const active = fallingOil.some((f) => f.side === 'left' && f.step === step);
              const yCoords = [40, 95, 145];
              return (
                <ellipse
                  key={`fall-left-${step}`}
                  cx="75"
                  cy={yCoords[step]}
                  rx="6"
                  ry="12"
                  fill={oilColor}
                  opacity={active ? 1 : 0.04}
                />
              );
            })}

            {/* 右窓から落ちてくるオイル (x: 425, steps) */}
            {[0, 1, 2].map((step) => {
              const active = fallingOil.some((f) => f.side === 'right' && f.step === step);
              const yCoords = [40, 95, 145];
              return (
                <ellipse
                  key={`fall-right-${step}`}
                  cx="425"
                  cy={yCoords[step]}
                  rx="6"
                  ry="12"
                  fill={oilColor}
                  opacity={active ? 1 : 0.04}
                />
              );
            })}

            {/* オッサン (相棒) と頭上のドラム缶 */}
            {/* 位置 0: 左窓直下 (x: 75) */}
            <g opacity={helperPos === 0 ? 1 : 0.04}>
              <circle cx="75" cy="155" r="9" fill={helperColor} />
              <line x1="75" y1="164" x2="75" y2="190" stroke={helperColor} strokeWidth="6" />
              <line x1="75" y1="190" x2="68" y2="210" stroke={helperColor} strokeWidth="5" />
              <line x1="75" y1="190" x2="82" y2="210" stroke={helperColor} strokeWidth="5" />
              {/* ドラム缶 */}
              <rect x="60" y="125" width="30" height="24" rx="3" fill={isClassic ? '#1c2419' : '#0284c7'} stroke="#1c2419" strokeWidth="2" />
            </g>

            {/* 位置 1: 中央 (x: 250) */}
            <g opacity={helperPos === 1 ? 1 : 0.04}>
              <circle cx="250" cy="155" r="9" fill={helperColor} />
              <line x1="250" y1="164" x2="250" y2="190" stroke={helperColor} strokeWidth="6" />
              <line x1="250" y1="190" x2="243" y2="210" stroke={helperColor} strokeWidth="5" />
              <line x1="250" y1="190" x2="257" y2="210" stroke={helperColor} strokeWidth="5" />
              <rect x="235" y="125" width="30" height="24" rx="3" fill={isClassic ? '#1c2419' : '#0284c7'} stroke="#1c2419" strokeWidth="2" />
            </g>

            {/* 位置 2: 右窓直下 (x: 425) */}
            <g opacity={helperPos === 2 ? 1 : 0.04}>
              <circle cx="425" cy="155" r="9" fill={helperColor} />
              <line x1="425" y1="164" x2="425" y2="190" stroke={helperColor} strokeWidth="6" />
              <line x1="425" y1="190" x2="418" y2="210" stroke={helperColor} strokeWidth="5" />
              <line x1="425" y1="190" x2="432" y2="210" stroke={helperColor} strokeWidth="5" />
              <rect x="410" y="125" width="30" height="24" rx="3" fill={isClassic ? '#1c2419' : '#0284c7'} stroke="#1c2419" strokeWidth="2" />
            </g>

            {/* 通行人直撃ミス演出 */}
            {missEffect?.screen === 'bottom' && (
              <g className="animate-pulse">
                <circle cx={missEffect.x} cy="180" r="10" fill="#000" />
                <text x={missEffect.x} y="160" textAnchor="middle" fill="#dc2626" fontSize="14" fontWeight="bold">
                  ANGER!
                </text>
              </g>
            )}

            {/* ゲームオーバー */}
            {misses >= 3 && (
              <g>
                <rect x="150" y="80" width="200" height="55" rx="8" fill="#1c2419" opacity="0.9" />
                <text
                  x="250"
                  y="115"
                  textAnchor="middle"
                  fill="#fef08a"
                  fontSize="20"
                  fontFamily="monospace"
                  fontWeight="900"
                >
                  GAME OVER
                </text>
              </g>
            )}
          </svg>
        </div>
      }
      controls={
        <div className="flex flex-col items-center justify-center gap-1.5 sm:gap-2">
          <div className="text-[10px] font-mono font-bold text-amber-200 flex items-center justify-between w-full px-4">
            <span>KEY: ← / A (LEFT) | → / D (RIGHT) | SPACE (DUMP)</span>
            <span className="text-amber-300 font-extrabold">BEST: {highScore}</span>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-4 w-full max-w-[440px] px-2">
            <button
              onClick={moveLeft}
              disabled={blocked}
              className="py-2.5 px-3 rounded-xl border-2 bg-neutral-800 hover:bg-neutral-700 active:scale-95 text-amber-300 border-neutral-900 shadow font-black text-xs transition-all disabled:opacity-50"
            >
              ◀ LEFT
            </button>
            <button
              onClick={dumpOil}
              disabled={blocked || bucketAmount === 0 || (playerPos !== -1 && playerPos !== 3)}
              className={`py-2.5 px-3 rounded-xl border-2 font-black text-xs shadow transition-all active:scale-95 ${
                (playerPos === -1 || playerPos === 3) && bucketAmount > 0
                  ? 'bg-amber-400 text-neutral-950 border-amber-200 ring-4 ring-amber-400/60 animate-bounce'
                  : 'bg-neutral-800 text-neutral-500 border-neutral-900 opacity-50'
              }`}
            >
              🛢️ DUMP OIL
            </button>
            <button
              onClick={moveRight}
              disabled={blocked}
              className="py-2.5 px-3 rounded-xl border-2 bg-neutral-800 hover:bg-neutral-700 active:scale-95 text-amber-300 border-neutral-900 shadow font-black text-xs transition-all disabled:opacity-50"
            >
              RIGHT ▶
            </button>
          </div>
        </div>
      }
    />
  );
};
