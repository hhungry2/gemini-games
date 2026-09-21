import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GwCommonGameProps } from '../types';
import { GwDeviceFrame } from '../components/GwDeviceFrame';
import { gwSound } from '../sound';

// ダイバーの位置
// 0: ボート上, 1: 入水ロープ, 2: 海底1, 3: 海底2, 4: 海底3, 5: 宝箱前
type DiverPosition = 0 | 1 | 2 | 3 | 4 | 5;

// タコの4本の触手の長さ (0: 縮小, 1: 中間, 2: 最長/危険)
type TentacleState = [number, number, number, number];

export const OctopusGame: React.FC<GwCommonGameProps> = ({
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
  const [diverPos, setDiverPos] = useState<DiverPosition>(0);
  const diverPosRef = useRef<DiverPosition>(0);
  useEffect(() => {
    diverPosRef.current = diverPos;
  }, [diverPos]);

  const [tentacles, setTentacles] = useState<TentacleState>([0, 0, 0, 0]);
  const tentaclesRef = useRef<TentacleState>([0, 0, 0, 0]);
  useEffect(() => {
    tentaclesRef.current = tentacles;
  }, [tentacles]);
  const [goldInBag, setGoldInBag] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [misses, setMisses] = useState<number>(0);
  const [isCaught, setIsCaught] = useState<boolean>(false);
  const [bonusTriggered, setBonusTriggered] = useState<boolean>(false);
  const [highScore, setHighScore] = useState<number>(() => {
    return parseInt(localStorage.getItem(`gw_octopus_${difficulty}`) || '0', 10);
  });

  const hasGameOverRef = useRef<boolean>(false);
  const tickRef = useRef<number>(0);

  // 速度設定 (ms)
  const baseSpeed = difficulty === 'gameA' ? 480 : 360;
  const currentSpeed = Math.max(180, baseSpeed - Math.floor(score / 25) * 15);

  // スコア・ハイスコア同期
  useEffect(() => {
    onScoreChange(score);
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem(`gw_octopus_${difficulty}`, score.toString());
    }
    if (score >= 300 && !bonusTriggered) {
      setBonusTriggered(true);
      gwSound.bonus();
      setMisses(0);
      onMissChange(0);
    }
  }, [score, highScore, difficulty, bonusTriggered, onScoreChange, onMissChange]);

  useEffect(() => {
    onMissChange(misses);
    if (misses >= 3 && !hasGameOverRef.current) {
      hasGameOverRef.current = true;
      gwSound.gameOver();
      onGameOver(score);
    }
  }, [misses, onMissChange, onGameOver, score]);

  // 捕獲トリガー
  const triggerCaught = useCallback(() => {
    setIsCaught(true);
    gwSound.miss();
    setMisses((m) => m + 1);
    setGoldInBag(0);

    setTimeout(() => {
      setDiverPos(0);
      setIsCaught(false);
    }, 1200);
  }, []);

  // 前進 or 宝取得
  const handleRight = useCallback(() => {
    if (misses >= 3 || isPaused || isCaught) return;

    if (diverPos < 5) {
      const nextPos = (diverPos + 1) as DiverPosition;
      setDiverPos(nextPos);
      gwSound.tick();

      // 飛び込み衝突判定 (触手が伸びている位置に突っ込んだら即捕獲)
      const curTentacles = tentaclesRef.current;
      if (
        (nextPos === 2 && curTentacles[0] === 2) ||
        (nextPos === 3 && curTentacles[1] === 2) ||
        (nextPos === 4 && curTentacles[2] === 2) ||
        (nextPos === 5 && curTentacles[3] === 2)
      ) {
        triggerCaught();
      }
    } else {
      // 宝箱からゴールドを掴む！
      // 触手3（宝箱）が最長なら捕獲
      if (tentaclesRef.current[3] === 2) {
        triggerCaught();
      } else {
        setGoldInBag((prev) => prev + 1);
        setScore((prev) => prev + 1);
        gwSound.score();
      }
    }
  }, [diverPos, misses, isPaused, isCaught, triggerCaught]);

  // 後退 or ボート帰還
  const handleLeft = useCallback(() => {
    if (misses >= 3 || isPaused || isCaught) return;

    if (diverPos > 0) {
      const nextPos = (diverPos - 1) as DiverPosition;
      setDiverPos(nextPos);

      // 後退時の衝突判定
      const curTentacles = tentaclesRef.current;
      if (
        (nextPos === 2 && curTentacles[0] === 2) ||
        (nextPos === 3 && curTentacles[1] === 2) ||
        (nextPos === 4 && curTentacles[2] === 2)
      ) {
        triggerCaught();
        return;
      }

      if (nextPos === 0) {
        // ボートへ生還！ボーナス得点
        if (goldInBag > 0) {
          const returnBonus = goldInBag * 3;
          setScore((s) => s + returnBonus);
          setGoldInBag(0);
          gwSound.bonus();
        } else {
          gwSound.tick();
        }
      } else {
        gwSound.tick();
      }
    }
  }, [diverPos, goldInBag, misses, isPaused, isCaught, triggerCaught]);

  // キーボード操作
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) {
        e.preventDefault();
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D' || e.key === ' ') {
        handleRight();
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        handleLeft();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRight, handleLeft]);

  // タコの動きと衝突判定ループ (diverPosを依存配列から排除し安定稼働)
  useEffect(() => {
    if (misses >= 3 || isPaused || isCaught) return;

    const timer = setInterval(() => {
      tickRef.current += 1;

      setTentacles((prev) => {
        const next: TentacleState = [...prev];
        let movedAny = false;

        for (let i = 0; i < 4; i++) {
          const changeChance = difficulty === 'gameA' ? 0.45 : 0.65;
          if (Math.random() < changeChance) {
            movedAny = true;
            if (next[i] === 0) {
              next[i] = 1;
            } else if (next[i] === 1) {
              next[i] = Math.random() < 0.6 ? 2 : 0;
            } else {
              next[i] = 1;
            }
          }
        }

        if (movedAny) {
          gwSound.octoStep();
        }

        // 捕獲判定
        const curDiver = diverPosRef.current;
        let caught = false;
        if (next[0] === 2 && curDiver === 2) caught = true;
        if (next[1] === 2 && curDiver === 3) caught = true;
        if (next[2] === 2 && curDiver === 4) caught = true;
        if (next[3] === 2 && curDiver === 5) caught = true;

        if (caught) {
          triggerCaught();
        }

        return next;
      });
    }, currentSpeed);

    return () => clearInterval(timer);
  }, [misses, isPaused, isCaught, currentSpeed, difficulty, triggerCaught]);

  const isClassic = screenMode === 'classic';
  const activeColor = isClassic ? '#1c2419' : '#0f172a';
  const diverColor = isClassic ? '#1c2419' : '#0284c7';
  const octopusColor = isClassic ? '#1c2419' : '#dc2626';
  const goldColor = isClassic ? '#1c2419' : '#eab308';

  return (
    <GwDeviceFrame
      title="OCTOPUS"
      series="WIDE SCREEN"
      plateColor="silver"
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
              KEY: ← / A (RETURN) | → / D / SPACE (DIVE &amp; GRAB)
            </span>
            <div className="flex items-center space-x-3">
              <span className="text-amber-900 font-extrabold">
                BAG: {goldInBag > 0 ? `${goldInBag} GOLD` : 'EMPTY'}
              </span>
              <span className="text-amber-900 font-extrabold">BEST: {highScore}</span>
            </div>
          </div>

          {/* 2大アクションボタン */}
          <div className="grid grid-cols-2 gap-4 sm:gap-8 w-full max-w-[420px] px-2">
            <button
              onClick={handleLeft}
              disabled={isCaught || misses >= 3}
              className="py-2.5 px-4 rounded-xl border-2 bg-neutral-800 hover:bg-neutral-700 active:scale-95 text-amber-300 border-neutral-900 shadow-md font-black text-sm flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
            >
              <span>◀ RETURN (LEFT)</span>
            </button>
            <button
              onClick={handleRight}
              disabled={isCaught || misses >= 3}
              className="py-2.5 px-4 rounded-xl border-2 bg-red-600 hover:bg-red-500 active:scale-95 text-white border-red-800 shadow-md font-black text-sm flex items-center justify-center space-x-2 transition-all ring-2 ring-red-300 disabled:opacity-50"
            >
              <span>{diverPos === 5 ? '💰 GRAB GOLD!' : 'FORWARD ▶'}</span>
            </button>
          </div>
        </div>
      }
    >
      <div className="relative w-full h-full">
        {/* スコア・ミス・バッグの表示 */}
        <div className="absolute top-2 left-4 right-4 flex items-center justify-between font-mono z-20 pointer-events-none">
          <div className="flex items-center space-x-2">
            <span className="text-xs sm:text-sm font-black text-neutral-900 bg-neutral-900/10 px-2 py-0.5 rounded">
              {difficulty.toUpperCase()}
            </span>
            {goldInBag > 0 && (
              <span className="text-xs sm:text-sm font-black text-amber-700 bg-yellow-200/90 px-2 py-0.5 rounded animate-pulse">
                BAG: {goldInBag}
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

        {/* 画面タップ領域 (左半分で戻る、右半分で進む/宝) */}
        <div className="absolute inset-0 grid grid-cols-2 z-10">
          <div
            onClick={handleLeft}
            className="cursor-pointer active:bg-black/5 transition-colors"
            title="戻る"
          />
          <div
            onClick={handleRight}
            className="cursor-pointer active:bg-black/5 transition-colors"
            title="進む / 宝を取る"
          />
        </div>

        {/* SVGグラフィックスビュー */}
        <svg
          viewBox="0 0 500 340"
          className="w-full h-full select-none drop-shadow-sm"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* 海面と海底ライン */}
          <line x1="0" y1="75" x2="500" y2="75" stroke="#1c2419" strokeWidth="2" strokeDasharray="4 4" opacity="0.4" />
          <path d="M 0 290 Q 250 280 500 295" stroke="#1c2419" strokeWidth="3" fill="none" opacity="0.6" />

          {/* 左上のボートと相棒 */}
          <path d="M 15 60 L 95 60 L 80 80 L 30 80 Z" fill="#1c2419" opacity="0.8" />
          {/* ボートの相棒 */}
          <circle cx="50" cy="48" r="6" fill={activeColor} />
          <line x1="50" y1="54" x2="52" y2="60" stroke={activeColor} strokeWidth="3" />
          {/* 垂れ下がるロープ */}
          <line x1="75" y1="65" x2="75" y2="135" stroke="#1c2419" strokeWidth="2" strokeDasharray="2 2" opacity="0.7" />

          {/* 右下の沈没船と宝箱 */}
          {/* 沈没船の残骸 */}
          <path d="M 430 295 L 485 240 L 495 295 Z" fill="#1c2419" opacity="0.4" />
          <line x1="460" y1="260" x2="475" y2="225" stroke="#1c2419" strokeWidth="3" opacity="0.4" />
          {/* 宝箱 */}
          <rect x="425" y="270" width="36" height="22" rx="3" fill={goldColor} stroke="#1c2419" strokeWidth="2" />
          <circle cx="443" cy="278" r="2.5" fill="#1c2419" />
          <path d="M 425 270 Q 443 260 461 270" fill="none" stroke="#1c2419" strokeWidth="2" />

          {/* 巨大オクトパス（本体） */}
          {/* 頭部 */}
          <ellipse cx="360" cy="140" rx="42" ry="36" fill={octopusColor} />
          {/* 目 (左目・右目) */}
          <circle cx="345" cy="145" r="7" fill="#fff" />
          <circle cx="343" cy="145" r="3.5" fill="#000" />
          <circle cx="375" cy="145" r="7" fill="#fff" />
          <circle cx="373" cy="145" r="3.5" fill="#000" />

          {/* タコの4本の触手 (各触手 0: 縮小, 1: 中, 2: 最長) */}
          {/* 触手 0 (海底1・ダイバー位置2へ) */}
          {/* 段階0: 縮小 */}
          <path
            d="M 330 160 Q 280 165 250 180"
            fill="none"
            stroke={octopusColor}
            strokeWidth="7"
            strokeLinecap="round"
            opacity={tentacles[0] === 0 ? 1 : 0.05}
          />
          {/* 段階1: 中間 */}
          <path
            d="M 330 160 Q 260 180 200 210"
            fill="none"
            stroke={octopusColor}
            strokeWidth="7"
            strokeLinecap="round"
            opacity={tentacles[0] === 1 ? 1 : 0.05}
          />
          {/* 段階2: 最長 (位置2 x:150 y:275 を直撃) */}
          <path
            d="M 330 160 Q 240 180 180 230 Q 160 255 150 275"
            fill="none"
            stroke={octopusColor}
            strokeWidth="8"
            strokeLinecap="round"
            opacity={tentacles[0] === 2 ? 1 : 0.05}
          />

          {/* 触手 1 (海底2・ダイバー位置3へ) */}
          <path
            d="M 340 170 Q 300 190 280 205"
            fill="none"
            stroke={octopusColor}
            strokeWidth="7"
            strokeLinecap="round"
            opacity={tentacles[1] === 0 ? 1 : 0.05}
          />
          <path
            d="M 340 170 Q 290 200 240 235"
            fill="none"
            stroke={octopusColor}
            strokeWidth="7"
            strokeLinecap="round"
            opacity={tentacles[1] === 1 ? 1 : 0.05}
          />
          <path
            d="M 340 170 Q 280 210 230 250 Q 220 265 215 275"
            fill="none"
            stroke={octopusColor}
            strokeWidth="8"
            strokeLinecap="round"
            opacity={tentacles[1] === 2 ? 1 : 0.05}
          />

          {/* 触手 2 (海底3・ダイバー位置4へ) */}
          <path
            d="M 360 175 Q 340 200 330 215"
            fill="none"
            stroke={octopusColor}
            strokeWidth="7"
            strokeLinecap="round"
            opacity={tentacles[2] === 0 ? 1 : 0.05}
          />
          <path
            d="M 360 175 Q 330 215 300 245"
            fill="none"
            stroke={octopusColor}
            strokeWidth="7"
            strokeLinecap="round"
            opacity={tentacles[2] === 1 ? 1 : 0.05}
          />
          <path
            d="M 360 175 Q 325 220 290 260 Q 285 270 280 275"
            fill="none"
            stroke={octopusColor}
            strokeWidth="8"
            strokeLinecap="round"
            opacity={tentacles[2] === 2 ? 1 : 0.05}
          />

          {/* 触手 3 (宝箱前・ダイバー位置5へ) */}
          <path
            d="M 380 170 Q 400 190 390 210"
            fill="none"
            stroke={octopusColor}
            strokeWidth="7"
            strokeLinecap="round"
            opacity={tentacles[3] === 0 ? 1 : 0.05}
          />
          <path
            d="M 380 170 Q 410 205 385 240"
            fill="none"
            stroke={octopusColor}
            strokeWidth="7"
            strokeLinecap="round"
            opacity={tentacles[3] === 1 ? 1 : 0.05}
          />
          <path
            d="M 380 170 Q 420 210 395 255 Q 390 270 385 275"
            fill="none"
            stroke={octopusColor}
            strokeWidth="8"
            strokeLinecap="round"
            opacity={tentacles[3] === 2 ? 1 : 0.05}
          />

          {/* ダイバーの各位置ポーズ */}
          {/* 位置 0: ボート上 (x: 48, y: 38) */}
          <g opacity={diverPos === 0 && !isCaught ? 1 : 0.04}>
            <circle cx="68" cy="46" r="6" fill={diverColor} />
            <line x1="68" y1="52" x2="70" y2="60" stroke={diverColor} strokeWidth="3" />
            <line x1="68" y1="54" x2="62" y2="58" stroke={diverColor} strokeWidth="2.5" />
          </g>

          {/* 位置 1: 入水中ロープ (x: 75, y: 120) */}
          <g opacity={diverPos === 1 && !isCaught ? 1 : 0.04}>
            <circle cx="75" cy="115" r="7" fill={diverColor} />
            <line x1="75" y1="122" x2="75" y2="140" stroke={diverColor} strokeWidth="4" />
            <line x1="75" y1="128" x2="84" y2="124" stroke={diverColor} strokeWidth="3" />
            <line x1="75" y1="140" x2="70" y2="152" stroke={diverColor} strokeWidth="3" />
            <line x1="75" y1="140" x2="80" y2="152" stroke={diverColor} strokeWidth="3" />
          </g>

          {/* 位置 2: 海底1 (x: 145, y: 265) */}
          <g opacity={diverPos === 2 && !isCaught ? 1 : 0.04}>
            <circle cx="145" cy="250" r="7" fill={diverColor} />
            <line x1="145" y1="257" x2="147" y2="274" stroke={diverColor} strokeWidth="4" />
            <line x1="145" y1="262" x2="154" y2="266" stroke={diverColor} strokeWidth="3" />
            <line x1="147" y1="274" x2="140" y2="285" stroke={diverColor} strokeWidth="3" />
            <line x1="147" y1="274" x2="153" y2="285" stroke={diverColor} strokeWidth="3" />
          </g>

          {/* 位置 3: 海底2 (x: 215, y: 265) */}
          <g opacity={diverPos === 3 && !isCaught ? 1 : 0.04}>
            <circle cx="215" cy="250" r="7" fill={diverColor} />
            <line x1="215" y1="257" x2="217" y2="274" stroke={diverColor} strokeWidth="4" />
            <line x1="215" y1="262" x2="224" y2="266" stroke={diverColor} strokeWidth="3" />
            <line x1="217" y1="274" x2="210" y2="285" stroke={diverColor} strokeWidth="3" />
            <line x1="217" y1="274" x2="223" y2="285" stroke={diverColor} strokeWidth="3" />
          </g>

          {/* 位置 4: 海底3 (x: 280, y: 265) */}
          <g opacity={diverPos === 4 && !isCaught ? 1 : 0.04}>
            <circle cx="280" cy="250" r="7" fill={diverColor} />
            <line x1="280" y1="257" x2="282" y2="274" stroke={diverColor} strokeWidth="4" />
            <line x1="280" y1="262" x2="289" y2="266" stroke={diverColor} strokeWidth="3" />
            <line x1="282" y1="274" x2="275" y2="285" stroke={diverColor} strokeWidth="3" />
            <line x1="282" y1="274" x2="288" y2="285" stroke={diverColor} strokeWidth="3" />
          </g>

          {/* 位置 5: 宝箱前 (x: 390, y: 265) */}
          <g opacity={diverPos === 5 && !isCaught ? 1 : 0.04}>
            <circle cx="390" cy="252" r="7" fill={diverColor} />
            <line x1="390" y1="259" x2="393" y2="275" stroke={diverColor} strokeWidth="4" />
            {/* 宝箱に手を伸ばす腕 */}
            <line x1="390" y1="264" x2="422" y2="273" stroke={diverColor} strokeWidth="3.5" />
            <line x1="393" y1="275" x2="385" y2="287" stroke={diverColor} strokeWidth="3" />
            <line x1="393" y1="275" x2="399" y2="287" stroke={diverColor} strokeWidth="3" />
            {/* 背中のゴールドバッグ */}
            <circle cx="382" cy="265" r="5" fill={goldColor} />
          </g>

          {/* 捕獲された時のアニメーション演出 */}
          {isCaught && (
            <g className="animate-pulse">
              <circle
                cx={
                  diverPos === 2
                    ? 150
                    : diverPos === 3
                    ? 215
                    : diverPos === 4
                    ? 280
                    : 390
                }
                cy="260"
                r="18"
                fill="#dc2626"
                opacity="0.7"
              />
              <text
                x={
                  diverPos === 2
                    ? 150
                    : diverPos === 3
                    ? 215
                    : diverPos === 4
                    ? 280
                    : 390
                }
                y="240"
                textAnchor="middle"
                fill="#ef4444"
                fontSize="14"
                fontWeight="bold"
                fontFamily="monospace"
              >
                CAUGHT!
              </text>
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
