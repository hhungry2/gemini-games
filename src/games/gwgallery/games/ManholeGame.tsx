import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GwCommonGameProps } from '../types';
import { GwDeviceFrame } from '../components/GwDeviceFrame';
import { gwSound } from '../sound';

type Position = 0 | 1 | 2 | 3; // 0: Top-Left, 1: Bottom-Left, 2: Top-Right, 3: Bottom-Right

interface Pedestrian {
  id: number;
  lane: Position;
  step: number; // 0: 出現, 1: 歩行1, 2: 穴の直前, 3: 渡る(穴の上), 4: 渡りきり
}

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
  const [playerPos, setPlayerPos] = useState<Position>(1); // 初期位置は下段左
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

  const nextIdRef = useRef<number>(1);
  const tickRef = useRef<number>(0);

  // 難易度に応じたベース速度 (ms)
  const baseSpeed = difficulty === 'gameA' ? 420 : 320;
  // スコア上昇に伴う加速
  const currentSpeed = Math.max(160, baseSpeed - Math.floor(score / 20) * 15);

  // スコア＆ミス更新時の親通知とハイスコア更新
  useEffect(() => {
    onScoreChange(score);
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem(`gw_manhole_${difficulty}`, score.toString());
    }
    // 300点ミス消去ボーナス
    if (score >= 300 && !bonusTriggered) {
      setBonusTriggered(true);
      gwSound.bonus();
      setMisses(0);
      onMissChange(0);
    }
  }, [score, highScore, difficulty, bonusTriggered, onScoreChange, onMissChange]);

  useEffect(() => {
    onMissChange(misses);
    if (misses >= 3) {
      gwSound.gameOver();
      onGameOver(score);
    }
  }, [misses, onMissChange, onGameOver, score]);

  // プレイヤー移動アクション
  const movePlayer = useCallback((posOrFn: Position | ((prev: Position) => Position)) => {
    if (misses >= 3 || isPaused) return;
    setPlayerPos((prev) => {
      const next = typeof posOrFn === 'function' ? posOrFn(prev) : posOrFn;
      if (next !== prev) gwSound.catch();
      return next;
    });
  }, [misses, isPaused]);

  // キーボード操作
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      if (misses >= 3 || isPaused) return;

      switch (e.key) {
        // Q/A/E/D または 7/1/9/3
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
        // 十字キーでの直感操作
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
  }, [movePlayer, misses, isPaused]);

  // ゲームループ Tick (依存配列からpedestriansとplayerPosを排除し安定周期を保証)
  useEffect(() => {
    if (misses >= 3 || isPaused || isMissSequence) return;

    const timer = setInterval(() => {
      tickRef.current += 1;

      // 歩行者進行と判定
      setPedestrians((prev) => {
        let currentPedestrians = prev;

        // 歩行者生成ロジック
        const spawnRate = difficulty === 'gameA' ? 4 : 3;
        if (tickRef.current % spawnRate === 0) {
          const occupiedLanes = new Set(currentPedestrians.filter((p) => p.step <= 2).map((p) => p.lane));
          const freeLanes: Position[] = ([0, 1, 2, 3] as Position[]).filter((l) => !occupiedLanes.has(l));
          if (freeLanes.length > 0) {
            const chosenLane = freeLanes[Math.floor(Math.random() * freeLanes.length)];
            currentPedestrians = [
              ...currentPedestrians,
              { id: nextIdRef.current++, lane: chosenLane, step: 0 },
            ];
          }
        }

        const nextList: Pedestrian[] = [];
        let scoreGain = 0;
        let newMiss = false;
        let missLane: Position | null = null;
        let walkedAny = false;

        const curPlayerPos = playerPosRef.current;

        for (const p of currentPedestrians) {
          const nextStep = p.step + 1;

          if (nextStep === 3) {
            // 穴の上に踏み出した！マンホールマンがいるか？
            if (curPlayerPos === p.lane) {
              scoreGain += 1;
              gwSound.score();
              nextList.push({ ...p, step: nextStep });
            } else {
              newMiss = true;
              missLane = p.lane;
              gwSound.miss();
            }
          } else if (nextStep <= 4) {
            walkedAny = true;
            nextList.push({ ...p, step: nextStep });
          }
        }

        if (scoreGain > 0) {
          setScore((s) => s + scoreGain);
        } else if (walkedAny && !newMiss) {
          gwSound.tick(); // 1Tickに1回だけ鳴らす（音割れ防止）
        }

        if (newMiss && missLane !== null) {
          setMisses((m) => m + 1);
          setMissAnimation(missLane);
          setIsMissSequence(true);

          // ミス演出中は仕切り直し（連続即死を防止）
          setTimeout(() => {
            setMissAnimation(null);
            setPedestrians([]); // 歩行者をクリアして安全に再開
            setIsMissSequence(false);
          }, 1000);

          return [];
        }

        return nextList;
      });
    }, currentSpeed);

    return () => clearInterval(timer);
  }, [misses, isPaused, isMissSequence, difficulty, currentSpeed]);

  // クラシック/モダン用のスタイル設定
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

          {/* 実機風 4方向操作ボタン */}
          <div className="grid grid-cols-2 gap-x-12 sm:gap-x-24 gap-y-2 w-full max-w-[420px] px-2">
            {/* 上段左 */}
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
            {/* 上段右 */}
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
            {/* 下段左 */}
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
            {/* 下段右 */}
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
      {/* 画面本体: SVG による固定セグメント液晶グラフィックス */}
      <div className="relative w-full h-full">
        {/* スコア・ミス・難易度表示ヘッダー (LCD上部セグメント) */}
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

          {/* スコア (7セグメント風) */}
          <div className="text-xl sm:text-2xl font-black tracking-widest text-neutral-900 font-mono">
            {score.toString().padStart(4, '0')}
          </div>

          {/* ミス表示（3つのバツ印 / ミスアイコン） */}
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

        {/* 四隅直接タップ用タッチエリア (スマホ・タブレット向け直感UI) */}
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
          {/* 背景：2階層の通路・街並みライン */}
          {/* 上段歩道 (左・右) */}
          <line x1="10" y1="120" x2="160" y2="120" stroke="#1c2419" strokeWidth="4" strokeLinecap="round" />
          <line x1="340" y1="120" x2="490" y2="120" stroke="#1c2419" strokeWidth="4" strokeLinecap="round" />
          {/* 下段歩道 (左・右) */}
          <line x1="10" y1="230" x2="160" y2="230" stroke="#1c2419" strokeWidth="4" strokeLinecap="round" />
          <line x1="340" y1="230" x2="490" y2="230" stroke="#1c2419" strokeWidth="4" strokeLinecap="round" />

          {/* 橋の柱・ビル・手すり・水面 */}
          <path d="M 20 280 Q 250 270 480 280" stroke="#1c2419" strokeWidth="2" fill="none" opacity="0.4" />
          <path d="M 10 300 Q 250 290 490 300" stroke="#1c2419" strokeWidth="3" fill="none" opacity="0.6" />

          {/* 4つのマンホールの穴 */}
          {/* 上段左の穴 (x: 160-220, y: 120) */}
          <ellipse cx="190" cy="122" rx="28" ry="6" fill="#000" opacity="0.15" />
          {/* 下段左の穴 (x: 160-220, y: 230) */}
          <ellipse cx="190" cy="232" rx="28" ry="6" fill="#000" opacity="0.15" />
          {/* 上段右の穴 (x: 280-340, y: 120) */}
          <ellipse cx="310" cy="122" rx="28" ry="6" fill="#000" opacity="0.15" />
          {/* 下段右の穴 (x: 280-340, y: 230) */}
          <ellipse cx="310" cy="232" rx="28" ry="6" fill="#000" opacity="0.15" />

          {/* マンホールフタ（プレイヤーがいる位置で持ち上げられ橋になる） */}
          {/* 0: 上左フタ */}
          <rect
            x="164"
            y="118"
            width="52"
            height="5"
            rx="2"
            fill={playerPos === 0 ? manholeActive : ghostColor}
          />
          {/* 1: 下左フタ */}
          <rect
            x="164"
            y="228"
            width="52"
            height="5"
            rx="2"
            fill={playerPos === 1 ? manholeActive : ghostColor}
          />
          {/* 2: 上右フタ */}
          <rect
            x="284"
            y="118"
            width="52"
            height="5"
            rx="2"
            fill={playerPos === 2 ? manholeActive : ghostColor}
          />
          {/* 3: 下右フタ */}
          <rect
            x="284"
            y="228"
            width="52"
            height="5"
            rx="2"
            fill={playerPos === 3 ? manholeActive : ghostColor}
          />

          {/* プレイヤー（中央でマンホールを持ち上げるマンホールマン） */}
          {/* 中央足場 */}
          <rect x="220" y="240" width="60" height="8" rx="2" fill="#1c2419" opacity="0.3" />

          {/* プレイヤーポーズ 0: 上左を持ち上げる */}
          <g opacity={playerPos === 0 ? 1 : 0.05}>
            {/* 頭 */}
            <circle cx="238" cy="155" r="9" fill={playerActive} />
            {/* 胴体 */}
            <line x1="240" y1="164" x2="246" y2="215" stroke={playerActive} strokeWidth="6" strokeLinecap="round" />
            {/* 左腕（上左のフタを支える） */}
            <path d="M 240 170 L 210 150 L 190 123" fill="none" stroke={playerActive} strokeWidth="5" strokeLinecap="round" />
            {/* 右腕 */}
            <line x1="240" y1="175" x2="255" y2="195" stroke={playerActive} strokeWidth="4" strokeLinecap="round" />
            {/* 足 */}
            <line x1="246" y1="215" x2="236" y2="240" stroke={playerActive} strokeWidth="5" strokeLinecap="round" />
            <line x1="246" y1="215" x2="256" y2="240" stroke={playerActive} strokeWidth="5" strokeLinecap="round" />
          </g>

          {/* プレイヤーポーズ 1: 下左を持ち上げる */}
          <g opacity={playerPos === 1 ? 1 : 0.05}>
            <circle cx="236" cy="180" r="9" fill={playerActive} />
            <line x1="238" y1="189" x2="244" y2="225" stroke={playerActive} strokeWidth="6" strokeLinecap="round" />
            {/* 左腕（下左のフタを支える） */}
            <path d="M 238 195 L 210 215 L 190 232" fill="none" stroke={playerActive} strokeWidth="5" strokeLinecap="round" />
            <line x1="238" y1="195" x2="252" y2="210" stroke={playerActive} strokeWidth="4" strokeLinecap="round" />
            <line x1="244" y1="225" x2="234" y2="240" stroke={playerActive} strokeWidth="5" strokeLinecap="round" />
            <line x1="244" y1="225" x2="254" y2="240" stroke={playerActive} strokeWidth="5" strokeLinecap="round" />
          </g>

          {/* プレイヤーポーズ 2: 上右を持ち上げる */}
          <g opacity={playerPos === 2 ? 1 : 0.05}>
            <circle cx="262" cy="155" r="9" fill={playerActive} />
            <line x1="260" y1="164" x2="254" y2="215" stroke={playerActive} strokeWidth="6" strokeLinecap="round" />
            {/* 右腕（上右のフタを支える） */}
            <path d="M 260 170 L 290 150 L 310 123" fill="none" stroke={playerActive} strokeWidth="5" strokeLinecap="round" />
            <line x1="260" y1="175" x2="245" y2="195" stroke={playerActive} strokeWidth="4" strokeLinecap="round" />
            <line x1="254" y1="215" x2="244" y2="240" stroke={playerActive} strokeWidth="5" strokeLinecap="round" />
            <line x1="254" y1="215" x2="264" y2="240" stroke={playerActive} strokeWidth="5" strokeLinecap="round" />
          </g>

          {/* プレイヤーポーズ 3: 下右を持ち上げる */}
          <g opacity={playerPos === 3 ? 1 : 0.05}>
            <circle cx="264" cy="180" r="9" fill={playerActive} />
            <line x1="262" y1="189" x2="256" y2="225" stroke={playerActive} strokeWidth="6" strokeLinecap="round" />
            {/* 右腕（下右のフタを支える） */}
            <path d="M 262 195 L 290 215 L 310 232" fill="none" stroke={playerActive} strokeWidth="5" strokeLinecap="round" />
            <line x1="262" y1="195" x2="248" y2="210" stroke={playerActive} strokeWidth="4" strokeLinecap="round" />
            <line x1="256" y1="225" x2="246" y2="240" stroke={playerActive} strokeWidth="5" strokeLinecap="round" />
            <line x1="256" y1="225" x2="266" y2="240" stroke={playerActive} strokeWidth="5" strokeLinecap="round" />
          </g>

          {/* 歩行者（各レーンのステップ表示） */}
          {/* レーン0: 上段左 (x: 30 -> 70 -> 120 -> 190[穴] -> 250) */}
          {[0, 1, 2, 3, 4].map((step) => {
            const isActive = pedestrians.some((p) => p.lane === 0 && p.step === step);
            const xCoords = [35, 75, 120, 190, 245];
            const cx = xCoords[step];
            const cy = 100;
            return (
              <g key={`l0-${step}`} opacity={isActive ? 1 : 0.04}>
                <circle cx={cx} cy={cy - 12} r="6" fill={activeColor} />
                <line x1={cx} y1={cy - 6} x2={cx} y2={cy + 10} stroke={activeColor} strokeWidth="3" />
                <line x1={cx} y1={cy + 10} x2={cx - 5} y2={cy + 18} stroke={activeColor} strokeWidth="2.5" />
                <line x1={cx} y1={cy + 10} x2={cx + 5} y2={cy + 18} stroke={activeColor} strokeWidth="2.5" />
              </g>
            );
          })}

          {/* レーン1: 下段左 (x: 30 -> 70 -> 120 -> 190[穴] -> 250) */}
          {[0, 1, 2, 3, 4].map((step) => {
            const isActive = pedestrians.some((p) => p.lane === 1 && p.step === step);
            const xCoords = [35, 75, 120, 190, 245];
            const cx = xCoords[step];
            const cy = 210;
            return (
              <g key={`l1-${step}`} opacity={isActive ? 1 : 0.04}>
                <circle cx={cx} cy={cy - 12} r="6" fill={activeColor} />
                <line x1={cx} y1={cy - 6} x2={cx} y2={cy + 10} stroke={activeColor} strokeWidth="3" />
                <line x1={cx} y1={cy + 10} x2={cx - 5} y2={cy + 18} stroke={activeColor} strokeWidth="2.5" />
                <line x1={cx} y1={cy + 10} x2={cx + 5} y2={cy + 18} stroke={activeColor} strokeWidth="2.5" />
              </g>
            );
          })}

          {/* レーン2: 上段右 (右から左へ: x: 465 -> 425 -> 380 -> 310[穴] -> 255) */}
          {[0, 1, 2, 3, 4].map((step) => {
            const isActive = pedestrians.some((p) => p.lane === 2 && p.step === step);
            const xCoords = [465, 425, 380, 310, 255];
            const cx = xCoords[step];
            const cy = 100;
            return (
              <g key={`l2-${step}`} opacity={isActive ? 1 : 0.04}>
                <circle cx={cx} cy={cy - 12} r="6" fill={activeColor} />
                <line x1={cx} y1={cy - 6} x2={cx} y2={cy + 10} stroke={activeColor} strokeWidth="3" />
                <line x1={cx} y1={cy + 10} x2={cx - 5} y2={cy + 18} stroke={activeColor} strokeWidth="2.5" />
                <line x1={cx} y1={cy + 10} x2={cx + 5} y2={cy + 18} stroke={activeColor} strokeWidth="2.5" />
              </g>
            );
          })}

          {/* レーン3: 下段右 (右から左へ: x: 465 -> 425 -> 380 -> 310[穴] -> 255) */}
          {[0, 1, 2, 3, 4].map((step) => {
            const isActive = pedestrians.some((p) => p.lane === 3 && p.step === step);
            const xCoords = [465, 425, 380, 310, 255];
            const cx = xCoords[step];
            const cy = 210;
            return (
              <g key={`l3-${step}`} opacity={isActive ? 1 : 0.04}>
                <circle cx={cx} cy={cy - 12} r="6" fill={activeColor} />
                <line x1={cx} y1={cy - 6} x2={cx} y2={cy + 10} stroke={activeColor} strokeWidth="3" />
                <line x1={cx} y1={cy + 10} x2={cx - 5} y2={cy + 18} stroke={activeColor} strokeWidth="2.5" />
                <line x1={cx} y1={cy + 10} x2={cx + 5} y2={cy + 18} stroke={activeColor} strokeWidth="2.5" />
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
              {/* 跳ねる小魚 */}
              <circle
                cx={missAnimation === 0 || missAnimation === 1 ? 180 : 320}
                cy="270"
                r="3"
                fill="#f59e0b"
              />
            </g>
          )}

          {/* ゲームオーバー表示 */}
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
