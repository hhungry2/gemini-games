import React from 'react';
import { GwCommonGameProps } from '../types';
import { GwDeviceFrame } from '../components/GwDeviceFrame';
import { createOctopus, tickOctopus, moveDiver } from '../engine';
import { useGwGame } from '../useGwGame';
import { useGwKeys } from '../useGwKeys';

// Each arm has one route with three consecutive segments, aligned with its diver position.
const LANES = [
  { x: 120, segments: [
    { path: 'M262 135 Q220 139 190 162', end: [190, 162] },
    { path: 'M190 162 Q143 177 120 207', end: [120, 207] },
    { path: 'M120 207 Q111 228 120 252', end: [120, 252] },
  ] },
  { x: 220, segments: [
    { path: 'M286 140 Q261 147 244 170', end: [244, 170] },
    { path: 'M244 170 Q225 188 220 207', end: [220, 207] },
    { path: 'M220 207 Q216 229 220 252', end: [220, 252] },
  ] },
  { x: 320, segments: [
    { path: 'M311 140 Q316 152 318 174', end: [318, 174] },
    { path: 'M318 174 Q320 191 320 207', end: [320, 207] },
    { path: 'M320 207 Q324 229 320 252', end: [320, 252] },
  ] },
  { x: 420, segments: [
    { path: 'M335 135 Q377 141 399 168', end: [399, 168] },
    { path: 'M399 168 Q417 188 420 207', end: [420, 207] },
    { path: 'M420 207 Q429 229 420 252', end: [420, 252] },
  ] },
] as const;

export const OctopusGame: React.FC<GwCommonGameProps> = ({
  difficulty, screenMode, isFullscreen, onGameOver, onBackToMenu, isPaused,
  onTogglePause, onRestart, onToggleScreenMode, onChangeDifficulty, isMuted, onToggleMute,
}) => {
  const { state, act, highScore, blocked } = useGwGame('octopus', difficulty, isPaused, createOctopus, tickOctopus,
    score => Math.max(180, (difficulty === 'gameA' ? 480 : 360) - Math.floor(score / 25) * 15), onGameOver);
  const { diverPos, tentacles, activeTentacle, tentacleDirection, goldInBag, score, misses, recoveryMs } = state;
  const isCaught = recoveryMs > 0;
  const handleRight = () => act(previous => moveDiver(previous, 1));
  const handleLeft = () => act(previous => moveDiver(previous, -1));
  useGwKeys(key => {
    if (key === 'arrowright' || key === 'd' || key === ' ') handleRight();
    else if (key === 'arrowleft' || key === 'a') handleLeft();
    else return false;
    return true;
  });

  const isClassic = screenMode === 'classic';
  const activeColor = isClassic ? '#1c2419' : '#0f172a';
  const diverColor = isClassic ? '#1c2419' : '#0284c7';
  const octopusColor = isClassic ? '#1c2419' : '#b91c1c';
  const goldColor = isClassic ? '#1c2419' : '#ca8a04';
  const lcdColor = '#9fb393';
  const caughtX = LANES[Math.max(0, diverPos - 2)].x;

  return (
    <GwDeviceFrame
      title="OCTOPUS"
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
              ← / A 戻る ｜ → / D / SPACE 進む・宝
            </span>
            <div className="flex items-center space-x-3">
              <span className="text-amber-900 font-extrabold">袋：{goldInBag || '空'}</span>
              <span className="text-amber-900 font-extrabold">BEST: {highScore}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:gap-8 w-full max-w-[420px] px-2">
            <button onClick={handleLeft} disabled={blocked}
              className="py-2.5 px-4 rounded-xl border-2 bg-neutral-800 hover:bg-neutral-700 active:scale-95 text-amber-300 border-neutral-900 shadow-md font-black text-sm transition-all disabled:opacity-50">
              ◀ 戻る
            </button>
            <button onClick={handleRight} disabled={blocked}
              className="py-2.5 px-4 rounded-xl border-2 bg-red-600 hover:bg-red-500 active:scale-95 text-white border-red-800 shadow-md font-black text-sm transition-all ring-2 ring-red-300 disabled:opacity-50">
              {diverPos === 5 ? '💰 宝を取る' : '進む ▶'}
            </button>
          </div>
        </div>
      }
    >
      <div className="relative w-full h-full">
        <div className="absolute top-2 left-4 right-4 flex items-center justify-between font-mono z-20 pointer-events-none">
          <div className="flex items-center space-x-2">
            <span className="text-xs sm:text-sm font-black text-neutral-900 bg-neutral-900/10 px-2 py-0.5 rounded">
              {difficulty === 'gameA' ? 'GAME A' : 'GAME B'}
            </span>
            {goldInBag > 0 && (
              <span className="text-xs sm:text-sm font-black text-amber-700 bg-yellow-200/90 px-2 py-0.5 rounded">
                BAG: {goldInBag}
              </span>
            )}
          </div>
          <output aria-label="スコア" className="text-xl sm:text-2xl font-black tracking-widest text-neutral-900 font-mono">
            {score.toString().padStart(4, '0')}
          </output>
          <div className="flex items-center space-x-1">
            <span className="text-[10px] font-bold text-neutral-700">MISS:</span>
            {[0, 1, 2].map(idx => (
              <span key={idx} className={`text-sm sm:text-base font-black ${idx < misses ? 'text-red-700' : 'text-neutral-400/30'}`}>✕</span>
            ))}
          </div>
        </div>

        <div className="absolute inset-0 grid grid-cols-2 z-10">
          <div onClick={handleLeft} className="cursor-pointer active:bg-black/5 transition-colors" title="戻る" />
          <div onClick={handleRight} className="cursor-pointer active:bg-black/5 transition-colors" title="進む / 宝を取る" />
        </div>

        <svg viewBox="0 0 500 340" className="w-full h-full select-none"
          preserveAspectRatio="xMidYMid meet" role="img" data-diver-position={diverPos}
          aria-label={`オクトパス。足は左から1、2、3、4の順番。現在は足${activeTentacle + 1}の番。${tentacles.map((length, i) => `足${i + 1}は長さ${length + 1}/3${length === 2 ? '、危険' : ''}`).join('。')}`}>
          <line x1="0" y1="82" x2="500" y2="82" stroke={activeColor} strokeWidth="1.5" strokeDasharray="4 5" opacity=".3" />
          <path d="M0 291 Q250 287 500 291" stroke={activeColor} strokeWidth="2" fill="none" opacity=".5" />
          <text x="300" y="55" textAnchor="middle" fill={activeColor} fontSize="14" fontWeight="bold">
            足の順番 1 → 2 → 3 → 4
          </text>

          <path d="M12 65 H104 L88 82 H28 Z" fill={activeColor} />
          <circle cx="40" cy="53" r="6" fill={activeColor} />
          <path d="M40 59 L43 65 M40 60 L34 64" stroke={activeColor} strokeWidth="3" fill="none" />
          <line x1="58" y1="76" x2="58" y2="189" stroke={activeColor} strokeWidth="2" strokeDasharray="2 3" opacity=".6" />
          <path d="M58 202 V266 Q58 282 95 282" stroke={activeColor} strokeWidth="1.5" strokeDasharray="3 6" fill="none" opacity=".2" />
          <g fill={diverColor} stroke={diverColor} opacity={diverPos === 0 && !isCaught ? 1 : .09}>
            <circle cx="72" cy="52" r="6" stroke="none" />
            <path d="M72 58 L74 65 M72 59 L64 63" strokeWidth="3" fill="none" />
          </g>
          <g transform="translate(58 156)" fill={diverColor} stroke={diverColor} opacity={diverPos === 1 && !isCaught ? 1 : .09}>
            <circle r="7" stroke="none" />
            <path d="M0 7 V24 M0 12 L10 8 M0 24 L-7 36 M0 24 L7 36" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          </g>

          <path d="M458 290 L485 240 L496 290 Z M472 262 L483 230" fill={activeColor} stroke={activeColor} strokeWidth="2" opacity=".16" />
          <rect x="450" y="267" width="35" height="23" rx="3" fill={goldColor} />
          <path d="M450 267 Q468 254 485 267 M450 275 H485" fill="none" stroke={activeColor} strokeWidth="2" />
          <rect x="465" y="271" width="6" height="8" rx="1" fill={lcdColor} />

          {LANES.map((lane, index) => {
            const length = tentacles[index];
            const active = activeTentacle === index;
            const danger = length === 2;
            const tip = lane.segments[length].end;
            return (
              <g key={lane.x} data-octopus-lane={index + 1} data-length={length + 1} data-active={active}
                fill="none" stroke={octopusColor} strokeLinecap="round">
                {lane.segments.map((segment, stage) => (
                  <g key={segment.path}>
                    <path d={segment.path} strokeWidth={stage <= length ? 7 : 1.5}
                      strokeDasharray={stage <= length ? undefined : '3 5'} opacity={stage <= length ? 1 : .3} />
                    {stage < length && <circle cx={segment.end[0]} cy={segment.end[1]} r="3.5" fill={lcdColor} strokeWidth="2" />}
                  </g>
                ))}
                <circle cx={tip[0]} cy={tip[1]} r={danger ? 6 : 4.5} fill={octopusColor} stroke="none" />
                {danger && (
                  <g fill={octopusColor} stroke="none">
                    <text x={lane.x + 27} y="233" textAnchor="middle" fontSize="12" fontWeight="bold">危険</text>
                    <path d={`M${lane.x - 21} 285 L${lane.x} 289 L${lane.x + 21} 285`} stroke={octopusColor} strokeWidth="2" fill="none" />
                  </g>
                )}
                <g transform={`translate(${lane.x - 40} 299)`}>
                  <rect width="80" height="35" rx="6" stroke={active ? activeColor : octopusColor}
                    strokeWidth={active ? 2.2 : 1} opacity={active ? 1 : .4}
                    fill={activeColor} fillOpacity={active ? .09 : .02} />
                  <circle cx="12" cy="12" r="8" fill={active ? activeColor : 'none'} stroke={activeColor} strokeWidth="1" />
                  <text x="12" y="16" textAnchor="middle" fill={active ? lcdColor : activeColor} stroke="none" fontSize="11" fontWeight="bold">{index + 1}</text>
                  <text x="43" y="18" textAnchor="middle" fill={activeColor} stroke="none" fontSize="17" fontWeight="bold" fontFamily="monospace">{length + 1}/3</text>
                  <text x="70" y="18" textAnchor="middle" fill={activeColor} stroke="none" fontSize="16" fontWeight="bold">{danger ? '!' : active ? (tentacleDirection === 1 ? '↓' : '↑') : ''}</text>
                  {[0, 1, 2].map(stage => (
                    <rect key={stage} x={11 + stage * 20} y="25" width="17" height="5" rx="1"
                      fill={stage <= length ? octopusColor : 'none'} strokeWidth="1" opacity={stage <= length ? 1 : .35} />
                  ))}
                </g>
              </g>
            );
          })}

          <ellipse cx="300" cy="108" rx="50" ry="35" fill={octopusColor} />
          {[280, 320].map(x => (
            <g key={x}>
              <circle cx={x} cy="111" r="8" fill="#fff" />
              <circle cx={x - 1} cy="113" r="4" fill={activeColor} />
            </g>
          ))}

          {LANES.map((lane, index) => {
            const visible = diverPos === index + 2 && !isCaught;
            return (
              <g key={lane.x} transform={`translate(${lane.x} 249)`} fill={diverColor} stroke={diverColor}
                strokeLinecap="round" opacity={visible ? 1 : .08}>
                {visible && <ellipse cy="38" rx="20" ry="4" stroke="none" opacity=".2" />}
                <circle r="7" stroke="none" />
                <rect x="-10" y="9" width="5" height="13" rx="2" stroke="none" />
                <path d={`M0 7 L2 25 M0 13 L${index === 3 ? 28 : 11} ${index === 3 ? 24 : 18} M2 25 L-6 37 M2 25 L9 37 M-6 37 H-11 M9 37 H14`}
                  fill="none" strokeWidth="3.5" />
                {visible && goldInBag > 0 && <circle cx="-12" cy="22" r="6" fill={goldColor} stroke="none" />}
              </g>
            );
          })}

          {isCaught && (
            <g fill={octopusColor} stroke={octopusColor}>
              <circle cx={caughtX} cy="264" r="19" fillOpacity=".12" strokeWidth="2.5" />
              <path d={`M${caughtX - 7} 257 L${caughtX + 7} 271 M${caughtX + 7} 257 L${caughtX - 7} 271`} strokeWidth="3" />
              <rect x={caughtX - 43} y="205" width="86" height="22" rx="5" fill={lcdColor} stroke="none" />
              <text x={caughtX} y="222" textAnchor="middle" stroke="none" fontSize="14" fontWeight="bold">つかまった!</text>
            </g>
          )}
        </svg>
      </div>
    </GwDeviceFrame>
  );
};
