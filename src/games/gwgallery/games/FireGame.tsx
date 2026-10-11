import React from 'react';
import { GwCommonGameProps } from '../types';
import { GwDeviceFrame } from '../components/GwDeviceFrame';
import { createFire, tickFire, type RescuePosition } from '../engine';
import { useGwGame } from '../useGwGame';
import { useGwKeys } from '../useGwKeys';

export const FireGame: React.FC<GwCommonGameProps> = ({
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

  const { state, act, highScore, blocked } = useGwGame('fire', difficulty, isPaused, createFire, tickFire,
    score => Math.max(160, (difficulty === 'gameA' ? 440 : 330) - Math.floor(score / 20) * 15), onGameOver);
  const { playerPos, victims, score, misses, missAnimation } = state;
  const setPlayerPos = (playerPos: RescuePosition) => act(previous =>
    playerPos === previous.playerPos ? previous : { ...previous, playerPos, sounds: ['catch'] });
  const moveLeft = () => act(previous => previous.playerPos === 0 ? previous :
    { ...previous, playerPos: (previous.playerPos - 1) as RescuePosition, sounds: ['catch'] });
  const moveRight = () => act(previous => previous.playerPos === 2 ? previous :
    { ...previous, playerPos: (previous.playerPos + 1) as RescuePosition, sounds: ['catch'] });
  useGwKeys(key => {
    if (key === 'arrowleft' || key === 'a') moveLeft();
    else if (key === 'arrowright' || key === 'd') moveRight();
    else if (['1', '2', '3'].includes(key)) setPlayerPos((Number(key) - 1) as RescuePosition);
    else return false;
    return true;
  });

  const isClassic = screenMode === 'classic';
  const activeColor = isClassic ? '#1c2419' : '#0f172a';
  const rescuerColor = isClassic ? '#1c2419' : '#0284c7';
  const fireColor = isClassic ? '#1c2419' : '#ea580c';
  const ambulanceColor = isClassic ? '#1c2419' : '#dc2626';

  return (
    <GwDeviceFrame
      title="FIRE"
      series="WIDE SCREEN"
      plateColor="silver"
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
              KEY: ← / A (LEFT) | → / D (RIGHT) | 1, 2, 3 (DIRECT)
            </span>
            <span className="text-amber-900 font-extrabold">BEST: {highScore}</span>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:gap-8 w-full max-w-[420px] px-2">
            <button
              onClick={moveLeft}
              disabled={blocked}
              className="py-2.5 px-4 rounded-xl border-2 bg-neutral-800 hover:bg-neutral-700 active:scale-95 text-amber-300 border-neutral-900 shadow-md font-black text-sm flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
            >
              <span>◀ MOVE LEFT</span>
            </button>
            <button
              onClick={moveRight}
              disabled={blocked}
              className="py-2.5 px-4 rounded-xl border-2 bg-red-600 hover:bg-red-500 active:scale-95 text-white border-red-800 shadow-md font-black text-sm flex items-center justify-center space-x-2 transition-all ring-2 ring-red-300 disabled:opacity-50"
            >
              <span>MOVE RIGHT ▶</span>
            </button>
          </div>
        </div>
      }
    >
      <div className="relative w-full h-full">
        {/* LCDヘッダー */}
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

        {/* 3分割ダイレクトタップ領域 */}
        <div className="absolute inset-0 grid grid-cols-3 z-10">
          <div
            onClick={() => {
              setPlayerPos(0);
            }}
            className="cursor-pointer active:bg-black/5"
            title="左へ移動"
          />
          <div
            onClick={() => {
              setPlayerPos(1);
            }}
            className="cursor-pointer active:bg-black/5"
            title="中央へ移動"
          />
          <div
            onClick={() => {
              setPlayerPos(2);
            }}
            className="cursor-pointer active:bg-black/5"
            title="右へ移動"
          />
        </div>

        <svg
          viewBox="0 0 500 340"
          className="w-full h-full select-none drop-shadow-sm"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* 地面 */}
          <line x1="0" y1="280" x2="500" y2="280" stroke="#1c2419" strokeWidth="4" strokeLinecap="round" />

          {/* 左側の燃えるビル */}
          <rect x="0" y="40" width="85" height="240" fill="#1c2419" opacity="0.85" />
          {/* ビルの窓 */}
          <rect x="15" y="60" width="18" height="24" fill="#fef08a" />
          <rect x="45" y="60" width="18" height="24" fill="#fef08a" />
          <rect x="15" y="110" width="18" height="24" fill="#fef08a" />
          <rect x="45" y="110" width="18" height="24" fill="#fef08a" />
          {/* 炎 */}
          <path
            d="M 10 40 Q 30 15 45 40 Q 60 10 75 40 Z"
            fill={fireColor}
            className="animate-pulse"
          />

          {/* 右側の救急車 (AMBULANCE) */}
          <rect x="400" y="210" width="95" height="70" rx="6" fill={ambulanceColor} />
          {/* 救急車の窓 */}
          <rect x="410" y="220" width="30" height="20" rx="3" fill="#67e8f9" />
          {/* 赤十字マーク */}
          <rect x="460" y="235" width="20" height="6" fill="#fff" />
          <rect x="467" y="228" width="6" height="20" fill="#fff" />
          {/* 車輪 */}
          <circle cx="425" cy="280" r="10" fill="#000" />
          <circle cx="475" cy="280" r="10" fill="#000" />
          {/* 赤色灯 */}
          <ellipse cx="450" cy="205" rx="8" ry="5" fill="#ef4444" className="animate-pulse" />

          {/* 避難者の放物線セグメント (Step 0..7) */}
          {/* Step 0: 窓から飛び出す (x: 88, y: 70) */}
          <g opacity={victims.some((v) => v.step === 0) ? 1 : 0.04}>
            <circle cx="95" cy="65" r="7" fill={activeColor} />
            <line x1="95" y1="72" x2="105" y2="85" stroke={activeColor} strokeWidth="3" />
            <line x1="105" y1="85" x2="100" y2="98" stroke={activeColor} strokeWidth="3" />
          </g>

          {/* Step 1: 落下中・左空中 (x: 115, y: 130) */}
          <g opacity={victims.some((v) => v.step === 1) ? 1 : 0.04}>
            <circle cx="118" cy="125" r="7" fill={activeColor} />
            <line x1="118" y1="132" x2="128" y2="150" stroke={activeColor} strokeWidth="3" />
            <line x1="128" y1="150" x2="120" y2="168" stroke={activeColor} strokeWidth="3" />
          </g>

          {/* Step 2: 第1バウンド地点 (x: 140, y: 228) */}
          <g opacity={victims.some((v) => v.step === 2) ? 1 : 0.04}>
            <circle cx="140" cy="215" r="7" fill={activeColor} />
            <line x1="140" y1="222" x2="140" y2="235" stroke={activeColor} strokeWidth="3" />
            <line x1="140" y1="235" x2="132" y2="242" stroke={activeColor} strokeWidth="3" />
            <line x1="140" y1="235" x2="148" y2="242" stroke={activeColor} strokeWidth="3" />
          </g>

          {/* Step 3: 第1頂点・空中中央左 (x: 195, y: 120) */}
          <g opacity={victims.some((v) => v.step === 3) ? 1 : 0.04}>
            <circle cx="195" cy="115" r="7" fill={activeColor} />
            <line x1="195" y1="122" x2="202" y2="138" stroke={activeColor} strokeWidth="3" />
            <line x1="202" y1="138" x2="208" y2="152" stroke={activeColor} strokeWidth="3" />
          </g>

          {/* Step 4: 第2バウンド地点 (x: 250, y: 228) */}
          <g opacity={victims.some((v) => v.step === 4) ? 1 : 0.04}>
            <circle cx="250" cy="215" r="7" fill={activeColor} />
            <line x1="250" y1="222" x2="250" y2="235" stroke={activeColor} strokeWidth="3" />
            <line x1="250" y1="235" x2="242" y2="242" stroke={activeColor} strokeWidth="3" />
            <line x1="250" y1="235" x2="258" y2="242" stroke={activeColor} strokeWidth="3" />
          </g>

          {/* Step 5: 第2頂点・空中中央右 (x: 305, y: 120) */}
          <g opacity={victims.some((v) => v.step === 5) ? 1 : 0.04}>
            <circle cx="305" cy="115" r="7" fill={activeColor} />
            <line x1="305" y1="122" x2="312" y2="138" stroke={activeColor} strokeWidth="3" />
            <line x1="312" y1="138" x2="318" y2="152" stroke={activeColor} strokeWidth="3" />
          </g>

          {/* Step 6: 第3バウンド地点 (x: 360, y: 228) */}
          <g opacity={victims.some((v) => v.step === 6) ? 1 : 0.04}>
            <circle cx="360" cy="215" r="7" fill={activeColor} />
            <line x1="360" y1="222" x2="360" y2="235" stroke={activeColor} strokeWidth="3" />
            <line x1="360" y1="235" x2="352" y2="242" stroke={activeColor} strokeWidth="3" />
            <line x1="360" y1="235" x2="368" y2="242" stroke={activeColor} strokeWidth="3" />
          </g>

          {/* Step 7: 救急車へ飛び込み (x: 405, y: 195) */}
          <g opacity={victims.some((v) => v.step === 7) ? 1 : 0.04}>
            <circle cx="405" cy="190" r="7" fill={activeColor} />
            <line x1="405" y1="197" x2="415" y2="208" stroke={activeColor} strokeWidth="3" />
          </g>

          {/* レスキュー隊2人組とネット (位置 0: 左, 1: 中央, 2: 右) */}
          {/* ポジション 0: 左 */}
          <g opacity={playerPos === 0 ? 1 : 0.04}>
            {/* 隊員1 */}
            <circle cx="115" cy="245" r="7" fill={rescuerColor} />
            <line x1="115" y1="252" x2="115" y2="270" stroke={rescuerColor} strokeWidth="4" />
            <line x1="115" y1="270" x2="110" y2="280" stroke={rescuerColor} strokeWidth="3" />
            <line x1="115" y1="270" x2="120" y2="280" stroke={rescuerColor} strokeWidth="3" />
            {/* 隊員2 */}
            <circle cx="165" cy="245" r="7" fill={rescuerColor} />
            <line x1="165" y1="252" x2="165" y2="270" stroke={rescuerColor} strokeWidth="4" />
            <line x1="165" y1="270" x2="160" y2="280" stroke={rescuerColor} strokeWidth="3" />
            <line x1="165" y1="270" x2="170" y2="280" stroke={rescuerColor} strokeWidth="3" />
            {/* ネット */}
            <line x1="120" y1="252" x2="160" y2="252" stroke="#dc2626" strokeWidth="5" strokeLinecap="round" />
          </g>

          {/* ポジション 1: 中央 */}
          <g opacity={playerPos === 1 ? 1 : 0.04}>
            <circle cx="225" cy="245" r="7" fill={rescuerColor} />
            <line x1="225" y1="252" x2="225" y2="270" stroke={rescuerColor} strokeWidth="4" />
            <line x1="225" y1="270" x2="220" y2="280" stroke={rescuerColor} strokeWidth="3" />
            <line x1="225" y1="270" x2="230" y2="280" stroke={rescuerColor} strokeWidth="3" />

            <circle cx="275" cy="245" r="7" fill={rescuerColor} />
            <line x1="275" y1="252" x2="275" y2="270" stroke={rescuerColor} strokeWidth="4" />
            <line x1="275" y1="270" x2="270" y2="280" stroke={rescuerColor} strokeWidth="3" />
            <line x1="275" y1="270" x2="280" y2="280" stroke={rescuerColor} strokeWidth="3" />

            <line x1="230" y1="252" x2="270" y2="252" stroke="#dc2626" strokeWidth="5" strokeLinecap="round" />
          </g>

          {/* ポジション 2: 右 */}
          <g opacity={playerPos === 2 ? 1 : 0.04}>
            <circle cx="335" cy="245" r="7" fill={rescuerColor} />
            <line x1="335" y1="252" x2="335" y2="270" stroke={rescuerColor} strokeWidth="4" />
            <line x1="335" y1="270" x2="330" y2="280" stroke={rescuerColor} strokeWidth="3" />
            <line x1="335" y1="270" x2="340" y2="280" stroke={rescuerColor} strokeWidth="3" />

            <circle cx="385" cy="245" r="7" fill={rescuerColor} />
            <line x1="385" y1="252" x2="385" y2="270" stroke={rescuerColor} strokeWidth="4" />
            <line x1="385" y1="270" x2="380" y2="280" stroke={rescuerColor} strokeWidth="3" />
            <line x1="385" y1="270" x2="390" y2="280" stroke={rescuerColor} strokeWidth="3" />

            <line x1="340" y1="252" x2="380" y2="252" stroke="#dc2626" strokeWidth="5" strokeLinecap="round" />
          </g>

          {/* 落下ミス・天使昇天演出 */}
          {missAnimation !== null && (
            <g className="animate-pulse">
              <ellipse cx={missAnimation} cy={278} rx="16" ry="4" fill="#dc2626" />
              {/* 天使 */}
              <circle cx={missAnimation} cy={230} r="5" fill="#fef08a" />
              <path
                d={`M ${missAnimation - 8} 235 L ${missAnimation} 242 L ${missAnimation + 8} 235`}
                fill="none"
                stroke="#fef08a"
                strokeWidth="2"
              />
              <ellipse cx={missAnimation} cy={223} rx="6" ry="2" fill="none" stroke="#fef08a" strokeWidth="1.5" />
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
