import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GwCommonGameProps } from '../types';
import { GwMultiScreenFrame } from '../components/GwMultiScreenFrame';
import { gwSound } from '../sound';

// プレイヤーの位置 (上画面)
// -1: 左窓(流す), 0: 左オイル直下, 1: 中央オイル直下, 2: 右オイル直下, 3: 右窓(流す)
type UpperPosition = -1 | 0 | 1 | 2 | 3;

// 下画面のオッサンの位置 (0: 左窓直下, 1: 中央, 2: 右窓直下)
type HelperPosition = 0 | 1 | 2;

interface OilDrop {
  id: number;
  lane: 0 | 1 | 2; // 0: 左, 1: 中, 2: 右
  step: number;    // 0: 発生, 1: 滴下中, 2: 落下直前, 3: キャッチ位置
}

interface FallingOil {
  id: number;
  side: 'left' | 'right';
  step: number; // 0..3 下画面に落ちていく
  amount: number;
}

export const OilPanicGame: React.FC<GwCommonGameProps> = ({
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
  const [playerPos, setPlayerPos] = useState<UpperPosition>(1);
  const playerPosRef = useRef<UpperPosition>(1);
  useEffect(() => {
    playerPosRef.current = playerPos;
  }, [playerPos]);

  const [bucketAmount, setBucketAmount] = useState<number>(0); // 0..3
  const bucketAmountRef = useRef<number>(0);
  useEffect(() => {
    bucketAmountRef.current = bucketAmount;
  }, [bucketAmount]);

  const [oilDrops, setOilDrops] = useState<OilDrop[]>([]);
  const [helperPos, setHelperPos] = useState<HelperPosition>(1);
  const helperPosRef = useRef<HelperPosition>(1);
  useEffect(() => {
    helperPosRef.current = helperPos;
  }, [helperPos]);

  const [fallingOil, setFallingOil] = useState<FallingOil[]>([]);
  const [score, setScore] = useState<number>(0);
  const [misses, setMisses] = useState<number>(0);
  const [bonusTriggered, setBonusTriggered] = useState<boolean>(false);
  const [missEffect, setMissEffect] = useState<{ screen: 'top' | 'bottom'; x: number } | null>(null);
  const [isMissSequence, setIsMissSequence] = useState<boolean>(false);
  const [highScore, setHighScore] = useState<number>(() => {
    return parseInt(localStorage.getItem(`gw_oilpanic_${difficulty}`) || '0', 10);
  });

  const hasGameOverRef = useRef<boolean>(false);
  const nextDropId = useRef<number>(1);
  const nextFallId = useRef<number>(1);
  const tickRef = useRef<number>(0);

  const baseSpeed = difficulty === 'gameA' ? 460 : 340;
  const currentSpeed = Math.max(170, baseSpeed - Math.floor(score / 25) * 15);

  useEffect(() => {
    onScoreChange(score);
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem(`gw_oilpanic_${difficulty}`, score.toString());
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

  // プレイヤー移動（左）
  const moveLeft = useCallback(() => {
    if (misses >= 3 || isPaused) return;
    setPlayerPos((prev) => {
      const next = (prev > -1 ? prev - 1 : prev) as UpperPosition;
      gwSound.catch();
      return next;
    });
  }, [misses, isPaused]);

  // プレイヤー移動（右）
  const moveRight = useCallback(() => {
    if (misses >= 3 || isPaused) return;
    setPlayerPos((prev) => {
      const next = (prev < 3 ? prev + 1 : prev) as UpperPosition;
      gwSound.catch();
      return next;
    });
  }, [misses, isPaused]);

  // オイルを窓から流すアクション (手動操作時のみ実行)
  const dumpOil = useCallback(() => {
    if (misses >= 3 || isPaused || isMissSequence) return;
    const curBucket = bucketAmountRef.current;
    const curPos = playerPosRef.current;

    if (curBucket === 0) return;

    if (curPos === -1) {
      // 左窓から流す
      gwSound.dump();
      setFallingOil((prev) => [
        ...prev,
        { id: nextFallId.current++, side: 'left', step: 0, amount: curBucket },
      ]);
      setBucketAmount(0);
    } else if (curPos === 3) {
      // 右窓から流す
      gwSound.dump();
      setFallingOil((prev) => [
        ...prev,
        { id: nextFallId.current++, side: 'right', step: 0, amount: curBucket },
      ]);
      setBucketAmount(0);
    }
  }, [misses, isPaused, isMissSequence]);

  // キーボード操作
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) {
        e.preventDefault();
      }
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        moveLeft();
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        moveRight();
      } else if (e.key === ' ' || e.key === 'ArrowDown' || e.key === 's') {
        dumpOil();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [moveLeft, moveRight, dumpOil]);

  // メインゲームループ Tick (依存配列からstateを排除し安定稼働)
  useEffect(() => {
    if (misses >= 3 || isPaused || isMissSequence) return;

    const timer = setInterval(() => {
      tickRef.current += 1;

      // 下画面のオッサンのAI移動
      if (tickRef.current % 2 === 0) {
        setHelperPos(() => {
          const rand = Math.random();
          if (difficulty === 'gameA') {
            return rand < 0.5 ? 0 : rand < 0.8 ? 1 : 2;
          } else {
            return (Math.floor(Math.random() * 3)) as HelperPosition;
          }
        });
      }

      // 上画面オイル滴下生成
      const spawnInterval = difficulty === 'gameA' ? 4 : 3;
      if (tickRef.current % spawnInterval === 0) {
        setOilDrops((prev) => {
          const availableLanes = ([0, 1, 2] as const).filter(
            (l) => !prev.some((d) => d.lane === l && d.step <= 1)
          );
          if (availableLanes.length > 0) {
            const chosen = availableLanes[Math.floor(Math.random() * availableLanes.length)];
            return [...prev, { id: nextDropId.current++, lane: chosen, step: 0 }];
          }
          return prev;
        });
      }

      // 上画面オイルの落下進行と判定
      setOilDrops((prev) => {
        const nextList: OilDrop[] = [];
        let newMiss = false;
        let missX = 0;
        let droppedAny = false;

        const curPlayer = playerPosRef.current;
        const curBucket = bucketAmountRef.current;

        for (const drop of prev) {
          const nextStep = drop.step + 1;

          if (nextStep === 3) {
            // キャッチ判定！
            if (curPlayer === drop.lane) {
              if (curBucket >= 3) {
                // バケツ満杯なのにキャッチして溢れた！ミス！
                newMiss = true;
                missX = drop.lane === 0 ? 120 : drop.lane === 1 ? 250 : 380;
                gwSound.miss();
              } else {
                // キャッチ成功！
                gwSound.catch();
                setBucketAmount((b) => Math.min(3, b + 1));
                setScore((s) => s + 1);
              }
            } else {
              // 床にこぼして発火！ミス！
              newMiss = true;
              missX = drop.lane === 0 ? 120 : drop.lane === 1 ? 250 : 380;
              gwSound.miss();
            }
          } else if (nextStep < 3) {
            droppedAny = true;
            nextList.push({ ...drop, step: nextStep });
          }
        }

        if (droppedAny && !newMiss) {
          gwSound.drop(); // 1Tickに1回のみ（音割れ防止）
        }

        if (newMiss) {
          setMisses((m) => m + 1);
          setMissEffect({ screen: 'top', x: missX });
          setIsMissSequence(true);

          setTimeout(() => {
            setMissEffect(null);
            setOilDrops([]); // 未キャッチの雫をクリアして安全に再開
            setFallingOil([]);
            setIsMissSequence(false);
          }, 1100);

          return [];
        }

        return nextList;
      });

      // 下画面に落下中のオイル進行と判定
      setFallingOil((prev) => {
        const nextList: FallingOil[] = [];
        let scoreGain = 0;
        let newMiss = false;
        let missX = 0;

        const curHelper = helperPosRef.current;

        for (const item of prev) {
          const nextStep = item.step + 1;

          if (nextStep >= 3) {
            // 下画面のオッサンがキャッチできたか？
            const targetPos = item.side === 'left' ? 0 : 2;
            if (curHelper === targetPos) {
              scoreGain += item.amount * 2 + 1;
              gwSound.score();
            } else {
              newMiss = true;
              missX = item.side === 'left' ? 90 : 410;
              gwSound.miss();
            }
          } else {
            nextList.push({ ...item, step: nextStep });
          }
        }

        if (scoreGain > 0) setScore((s) => s + scoreGain);
        if (newMiss) {
          setMisses((m) => m + 1);
          setMissEffect({ screen: 'bottom', x: missX });
          setIsMissSequence(true);

          setTimeout(() => {
            setMissEffect(null);
            setOilDrops([]);
            setFallingOil([]);
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
      isMuted={gwSound.getMuted()}
      onToggleMute={() => gwSound.toggleMute()}
      isPaused={isPaused}
      onTogglePause={onTogglePause}
      onRestart={onRestart}
      onBackToMenu={onBackToMenu}
      isFullscreen={isFullscreen}
      topScreen={
        /* 上画面: 配管から落ちるオイル雫とバケツキャッチ */
        <div className="relative w-full h-full">
          {/* LCD情報 */}
          <div className="absolute top-1 left-3 right-3 flex items-center justify-between font-mono z-20 pointer-events-none text-[10px]">
            <span className="font-black bg-neutral-900/10 px-1.5 py-0.5 rounded text-neutral-900">
              {difficulty.toUpperCase()}
            </span>
            <div className="text-base sm:text-lg font-black tracking-widest text-neutral-900">
              {score.toString().padStart(4, '0')}
            </div>
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
            <line x1="20" y1="30" x2="480" y2="30" stroke={pipeColor} strokeWidth="8" strokeLinecap="round" />
            <circle cx="120" cy="30" r="7" fill={pipeColor} />
            <circle cx="250" cy="30" r="7" fill={pipeColor} />
            <circle cx="380" cy="30" r="7" fill={pipeColor} />

            {/* 床ライン */}
            <line x1="10" y1="210" x2="490" y2="210" stroke="#1c2419" strokeWidth="4" />
            {/* 左右の窓 */}
            <rect x="10" y="120" width="30" height="90" fill="none" stroke="#1c2419" strokeWidth="3" />
            <rect x="460" y="120" width="30" height="90" fill="none" stroke="#1c2419" strokeWidth="3" />

            {/* オイル雫セグメント (3レーン x 3ステップ) */}
            {/* レーン0: 左 (x: 120) */}
            {[0, 1, 2].map((step) => {
              const active = oilDrops.some((d) => d.lane === 0 && d.step === step);
              const yCoords = [55, 105, 155];
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
              const yCoords = [55, 105, 155];
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
              const yCoords = [55, 105, 155];
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
            <span>OIL DRUM CATCH</span>
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
              <rect x="60" y="125" width="30" height="24" rx="3" fill="#0284c7" stroke="#1c2419" strokeWidth="2" />
            </g>

            {/* 位置 1: 中央 (x: 250) */}
            <g opacity={helperPos === 1 ? 1 : 0.04}>
              <circle cx="250" cy="155" r="9" fill={helperColor} />
              <line x1="250" y1="164" x2="250" y2="190" stroke={helperColor} strokeWidth="6" />
              <line x1="250" y1="190" x2="243" y2="210" stroke={helperColor} strokeWidth="5" />
              <line x1="250" y1="190" x2="257" y2="210" stroke={helperColor} strokeWidth="5" />
              <rect x="235" y="125" width="30" height="24" rx="3" fill="#0284c7" stroke="#1c2419" strokeWidth="2" />
            </g>

            {/* 位置 2: 右窓直下 (x: 425) */}
            <g opacity={helperPos === 2 ? 1 : 0.04}>
              <circle cx="425" cy="155" r="9" fill={helperColor} />
              <line x1="425" y1="164" x2="425" y2="190" stroke={helperColor} strokeWidth="6" />
              <line x1="425" y1="190" x2="418" y2="210" stroke={helperColor} strokeWidth="5" />
              <line x1="425" y1="190" x2="432" y2="210" stroke={helperColor} strokeWidth="5" />
              <rect x="410" y="125" width="30" height="24" rx="3" fill="#0284c7" stroke="#1c2419" strokeWidth="2" />
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
              disabled={misses >= 3}
              className="py-2.5 px-3 rounded-xl border-2 bg-neutral-800 hover:bg-neutral-700 active:scale-95 text-amber-300 border-neutral-900 shadow font-black text-xs transition-all disabled:opacity-50"
            >
              ◀ LEFT
            </button>
            <button
              onClick={dumpOil}
              disabled={misses >= 3 || bucketAmount === 0 || (playerPos !== -1 && playerPos !== 3)}
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
              disabled={misses >= 3}
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
