import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Plus,
  Trash2,
  Zap,
  HelpCircle,
} from 'lucide-react';
import {
  BikeState,
  GameMode,
  InputState,
  Particle,
  SegmentType,
  TrackData,
  TrackSegment,
} from './excitebike/types';
import {
  ALL_OFFICIAL_TRACKS,
  getCustomTrack,
  saveCustomTrack,
} from './excitebike/tracks';
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  renderGame,
} from './excitebike/renderer';
import {
  LANE_Y_POSITIONS,
  updateBike,
  updateRivalAI,
  checkBikeCollisions,
} from './excitebike/physics';
import { exciteAudio } from './excitebike/audio';

const BEST_TIMES_KEY = 'excitebike_best_times_v1';

interface ExcitebikeGameProps {
  onBackToHub: () => void;
  isDark?: boolean;
  isFullscreen?: boolean;
}

export const ExcitebikeGame: React.FC<ExcitebikeGameProps> = ({
  onBackToHub,
  isDark = true,
  isFullscreen = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<
    'title' | 'track_select' | 'countdown' | 'playing' | 'paused' | 'finished' | 'editor'
  >('title');
  const [gameMode, setGameMode] = useState<GameMode>('mode_a');
  const [currentTrack, setCurrentTrack] = useState<TrackData>(ALL_OFFICIAL_TRACKS[0]);
  const [countdownNum, setCountdownNum] = useState<number>(3);
  const [isMuted, setIsMuted] = useState<boolean>(() => exciteAudio.getMuted());
  const [bestTimes, setBestTimes] = useState<Record<string, number>>({});
  const [showHowToPlay, setShowHowToPlay] = useState<boolean>(false);

  // エディタ用状態
  const [editorSegments, setEditorSegments] = useState<TrackSegment[]>([]);
  const [selectedEditorSegmentId, setSelectedEditorSegmentId] = useState<string | null>(null);
  const [editorNewType, setEditorNewType] = useState<SegmentType>('table_top');

  // ゲームループ用 Mutable State
  const stateRef = useRef({
    player: createInitialBike('player', true, '#ef4444', 1, 1),
    rivals: [] as BikeState[],
    particles: [] as Particle[],
    inputs: {
      up: false,
      down: false,
      left: false,
      right: false,
      accelA: false,
      accelB: false,
    } as InputState,
    elapsedTime: 0,
    isLoopRunning: false,
    animFrameId: 0,
    lastTime: 0,
    countdownTimer: 0,
  });

  // ベストタイム読み込み
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(BEST_TIMES_KEY);
      if (saved) {
        try {
          setBestTimes(JSON.parse(saved));
        } catch {}
      }
    }
  }, []);

  // ベストタイム保存
  const recordBestTime = useCallback((trackId: string, time: number) => {
    setBestTimes((prev) => {
      const current = prev[trackId];
      if (current === undefined || time < current) {
        const next = { ...prev, [trackId]: time };
        if (typeof window !== 'undefined') {
          localStorage.setItem(BEST_TIMES_KEY, JSON.stringify(next));
        }
        return next;
      }
      return prev;
    });
  }, []);

  // ミュート切り替え
  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    exciteAudio.setMuted(next);
  };

  // 初期バイク生成ヘルパー
  function createInitialBike(
    id: string,
    isPlayer: boolean,
    color: string,
    number: number,
    lane: number
  ): BikeState {
    const y = LANE_Y_POSITIONS[lane] || 288;
    return {
      id,
      isPlayer,
      color,
      number,
      x: isPlayer ? 100 : 60 + Math.random() * 40,
      lane,
      targetLane: lane,
      y,
      z: 0,
      vz: 0,
      speed: 0,
      pitch: 0,
      targetPitch: 0,
      temp: 0,
      isOverheated: false,
      overheatCooldown: 0,
      crashed: false,
      crashTimer: 0,
      crashEndo: false,
      riderX: 0,
      riderY: 0,
      isReturning: false,
      grounded: true,
      wheelie: false,
      lap: 1,
      finished: false,
      finishTime: null,
      airTime: 0,
      jumpStartX: 0,
      niceLandingTimer: 0,
      mudTimer: 0,
    };
  }

  // レースのセットアップ
  const setupRace = useCallback(
    (track: TrackData, mode: GameMode) => {
      const p = createInitialBike('player', true, '#dc2626', 1, 1);
      const rivs: BikeState[] = [];

      if (mode === 'mode_b') {
        // ライバル3台 (青、緑、黄)
        rivs.push(createInitialBike('rival_1', false, '#2563eb', 2, 0));
        rivs.push(createInitialBike('rival_2', false, '#16a34a', 3, 2));
        rivs.push(createInitialBike('rival_3', false, '#ca8a04', 4, 3));
      }

      stateRef.current.player = p;
      stateRef.current.rivals = rivs;
      stateRef.current.particles = [];
      stateRef.current.elapsedTime = 0;
      stateRef.current.inputs = {
        up: false,
        down: false,
        left: false,
        right: false,
        accelA: false,
        accelB: false,
      };

      setCurrentTrack(track);
      setGameMode(mode);
      setGameState('countdown');
      setCountdownNum(3);

      // カウントダウン開始
      exciteAudio.playCountBeep(false);

      let step = 3;
      const countInterval = setInterval(() => {
        step--;
        if (step > 0) {
          setCountdownNum(step);
          exciteAudio.playCountBeep(false);
        } else if (step === 0) {
          setCountdownNum(0); // GO!
          exciteAudio.playCountBeep(true);
          exciteAudio.startEngine();
          setGameState('playing');
        } else {
          clearInterval(countInterval);
        }
      }, 900);
    },
    []
  );

  // ゲームループ
  useEffect(() => {
    let animId = 0;
    let lastTs = performance.now();

    const loop = (ts: number) => {
      const dt = Math.min((ts - lastTs) / 1000, 0.1);
      lastTs = ts;

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const { player, rivals, particles, inputs } = stateRef.current;
          const allBikes = [player, ...rivals];

          if (gameState === 'playing') {
            stateRef.current.elapsedTime += dt;

            // プレイヤーの更新
            updateBike(
              player,
              inputs,
              currentTrack.segments,
              currentTrack.totalLength,
              particles,
              true,
              1
            );

            // エンジン音の更新
            const speedRatio = player.speed / 20.5;
            exciteAudio.updateEngine(
              speedRatio,
              inputs.accelB,
              inputs.accelA || inputs.accelB,
              player.grounded
            );

            // ナイス着地タイマー減少
            if (player.niceLandingTimer > 0) {
              player.niceLandingTimer--;
            }

            // CPUライバルの更新 (MODE B)
            for (const riv of rivals) {
              const rInput = updateRivalAI(
                riv,
                currentTrack.segments,
                currentTrack.totalLength,
                allBikes
              );
              updateBike(
                riv,
                rInput,
                currentTrack.segments,
                currentTrack.totalLength,
                particles,
                true,
                1
              );
            }

            // バイク同士の衝突判定 (MODE B)
            if (rivals.length > 0) {
              checkBikeCollisions(allBikes, particles);
            }

            // プレイヤーゴール判定
            if (player.finished && player.finishTime === null) {
              player.finishTime = stateRef.current.elapsedTime;
              recordBestTime(currentTrack.id, player.finishTime);
              setGameState('finished');
            }
          }

          // 描画実行
          renderGame(
            ctx,
            player,
            allBikes,
            currentTrack.segments,
            currentTrack.totalLength,
            particles,
            stateRef.current.elapsedTime,
            bestTimes[currentTrack.id] || null,
            gameState === 'editor',
            selectedEditorSegmentId
          );
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animId);
      exciteAudio.stopEngine();
    };
  }, [gameState, currentTrack, bestTimes, recordBestTime, selectedEditorSegmentId]);

  // キーボードイベントハンドラ
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      const inp = stateRef.current.inputs;
      const key = e.key.toLowerCase();

      if (e.key === 'ArrowUp' || key === 'w') inp.up = true;
      if (e.key === 'ArrowDown' || key === 's') inp.down = true;
      if (e.key === 'ArrowLeft' || key === 'a') inp.left = true;
      if (e.key === 'ArrowRight' || key === 'd') inp.right = true;

      // アクセルA (通常)
      if (key === 'x' || key === 'j' || e.key === ' ') {
        inp.accelA = true;
        // クラッシュ時の連打音＆ダッシュ
        if (stateRef.current.player.crashed && stateRef.current.player.isReturning) {
          exciteAudio.playStep();
        }
      }

      // アクセルB (ターボ)
      if (key === 'z' || key === 'k' || e.key === 'Shift') {
        inp.accelB = true;
        if (stateRef.current.player.crashed && stateRef.current.player.isReturning) {
          exciteAudio.playStep();
        }
      }

      // 一時停止 P
      if (key === 'p' || e.key === 'Escape') {
        if (gameState === 'playing') setGameState('paused');
        else if (gameState === 'paused') setGameState('playing');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const inp = stateRef.current.inputs;
      const key = e.key.toLowerCase();

      if (e.key === 'ArrowUp' || key === 'w') inp.up = false;
      if (e.key === 'ArrowDown' || key === 's') inp.down = false;
      if (e.key === 'ArrowLeft' || key === 'a') inp.left = false;
      if (e.key === 'ArrowRight' || key === 'd') inp.right = false;
      if (key === 'x' || key === 'j' || e.key === ' ') inp.accelA = false;
      if (key === 'z' || key === 'k' || e.key === 'Shift') inp.accelB = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState]);

  // トラックエディタ開始
  const handleOpenEditor = () => {
    const custom = getCustomTrack();
    setEditorSegments([...custom.segments]);
    setCurrentTrack(custom);
    setSelectedEditorSegmentId(null);
    setGameState('editor');
  };

  // エディタにセグメント追加
  const handleAddSegment = () => {
    let w = 150;
    if (editorNewType === 'small_ramp') w = 80;
    if (editorNewType === 'big_ramp') w = 140;
    if (editorNewType === 'table_top') w = 240;
    if (editorNewType === 'whoops') w = 240;
    if (editorNewType === 'mud') w = 160;
    if (editorNewType === 'hurdle') w = 40;
    if (editorNewType === 'cooler') w = 100;
    if (editorNewType === 'finish') w = 200;

    const newSegs = [...editorSegments];
    // フィニッシュラインの直前に挿入 (フィニッシュラインがある場合)
    const finishIdx = newSegs.findIndex((s) => s.type === 'finish');
    const insertIdx = finishIdx >= 0 ? finishIdx : newSegs.length;

    newSegs.splice(insertIdx, 0, {
      id: `seg_${Date.now()}`,
      type: editorNewType,
      x: 0,
      width: w,
    });

    // X座標の再計算
    let curX = 0;
    for (const s of newSegs) {
      s.x = curX;
      curX += s.width;
    }

    setEditorSegments(newSegs);
    const updatedTrack: TrackData = {
      ...currentTrack,
      segments: newSegs,
      totalLength: curX,
    };
    setCurrentTrack(updatedTrack);
    saveCustomTrack(updatedTrack);
  };

  // エディタで選択したセグメントの削除
  const handleDeleteSegment = (id: string) => {
    const newSegs = editorSegments.filter((s) => s.id !== id);
    let curX = 0;
    for (const s of newSegs) {
      s.x = curX;
      curX += s.width;
    }
    setEditorSegments(newSegs);
    const updatedTrack: TrackData = {
      ...currentTrack,
      segments: newSegs,
      totalLength: curX,
    };
    setCurrentTrack(updatedTrack);
    saveCustomTrack(updatedTrack);
    setSelectedEditorSegmentId(null);
  };

  // エディタ作成コースのテスト走行
  const handleTestRunEditorTrack = () => {
    setupRace(currentTrack, 'mode_a');
  };

  // クラッシュ時の画面タップ連打
  const handleMashTap = () => {
    if (stateRef.current.player.crashed && stateRef.current.player.isReturning) {
      stateRef.current.player.riderX -= 4.0; // 連打で素早くバイクに戻る
      exciteAudio.playStep();
    }
  };

  return (
    <div
      className={`relative select-none ${
        isFullscreen
          ? `w-screen h-screen flex flex-col items-center justify-center p-0 overflow-hidden ${isDark ? 'bg-slate-950' : 'bg-slate-900'}`
          : 'w-full max-w-5xl flex flex-col items-center justify-center p-3'
      }`}
    >
      {/* トップコントロールバー */}
      <div
        className={`w-full flex items-center justify-between px-3 py-2 text-white rounded-xl mb-2 border shadow-md ${
          isDark
            ? 'bg-slate-900/90 border-slate-800'
            : 'bg-slate-800 border-slate-700'
        }`}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              exciteAudio.stopEngine();
              onBackToHub();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-lg text-xs font-bold transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            一覧へ戻る
          </button>

          <span className="text-xs font-black tracking-wide text-amber-400 hidden sm:inline">
            ⚡ EXCITE BIKE ⚡
          </span>
          <span className="text-[11px] text-slate-400 hidden md:inline">
            {currentTrack.name}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHowToPlay(!showHowToPlay)}
            className="p-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer text-slate-300 hover:text-white"
            title="遊び方・操作説明"
          >
            <HelpCircle className="w-4 h-4" />
            <span className="hidden sm:inline">操作方法</span>
          </button>

          <button
            onClick={toggleMute}
            className={`p-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              isMuted
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
            title={isMuted ? 'サウンドをONにする' : 'サウンドを消音する'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 遊び方モーダル */}
      {showHowToPlay && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 text-white shadow-2xl space-y-4">
            <h3 className="text-xl font-black text-amber-400 flex items-center gap-2">
              ⚡ エキサイトバイクの操作方法
            </h3>

            <div className="text-xs text-slate-300 space-y-2.5 leading-relaxed">
              <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700">
                <span className="font-bold text-amber-300">【アクセル】</span>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li><kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-white">X</kbd> / <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-white">Space</kbd>：通常アクセル (A)。安定走行、水温が上がりにくい。</li>
                  <li><kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-white">Z</kbd> / <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-white">Shift</kbd>：ターボアクセル (B)。圧倒的最高速！ただしTEMPゲージが急上昇。</li>
                </ul>
              </div>

              <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700">
                <span className="font-bold text-cyan-300">【空中姿勢制御 ＆ ウイリー】</span>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li><kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-white">←</kbd> (Left)：ウイリー（前輪上げ）。泥やハードルを乗り越える。</li>
                  <li><kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-white">→</kbd> (Right)：前傾（前輪下げ）。下り坂への着地角度調整！</li>
                  <li>ジャンプ着地時に地面の坂道と角度が合えば「NICE LANDING!」で加速。ズレると大転倒！</li>
                </ul>
              </div>

              <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700">
                <span className="font-bold text-emerald-300">【レーン変更 ＆ 復帰】</span>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li><kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-white">↑</kbd> / <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-white">↓</kbd>：全4レーンを移動。クーラーパッド（Chevron）を踏むと水温が瞬時に冷える！</li>
                  <li>転倒時は <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-white">A/Bボタン</kbd> または画面連打で素早くバイクに駆け寄って復帰！</li>
                </ul>
              </div>
            </div>

            <button
              onClick={() => setShowHowToPlay(false)}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 font-bold rounded-xl transition cursor-pointer text-sm"
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      {/* メインゲームCanvasコンテナ */}
      <div
        className={`relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl ${
          isFullscreen
            ? 'w-full flex-1 flex items-center justify-center'
            : 'w-full aspect-[16/9] max-h-[580px]'
        }`}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="w-full h-full object-contain block"
        />

        {/* 1. タイトル画面オーバーレイ */}
        {gameState === 'title' && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center text-white space-y-6 animate-in fade-in duration-300">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-xs font-black tracking-widest uppercase">
                <Zap className="w-3.5 h-3.5" /> NES Classic Tribute
              </div>
              <h1 className="text-4xl sm:text-6xl font-black italic tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 via-amber-300 to-red-500 drop-shadow-md">
                EXCITE BIKE
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 font-mono tracking-wider">
                モトクロス 2.5D レーシング
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
              <button
                onClick={() => {
                  setGameMode('mode_a');
                  setGameState('track_select');
                }}
                className="flex-1 py-4 px-6 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 active:scale-98 text-white font-black text-sm rounded-2xl shadow-xl transition transform hover:scale-102 flex flex-col items-center justify-center cursor-pointer"
              >
                <span className="text-base">SELECTION A</span>
                <span className="text-[11px] font-normal text-amber-100">1人タイムアタック</span>
              </button>

              <button
                onClick={() => {
                  setGameMode('mode_b');
                  setGameState('track_select');
                }}
                className="flex-1 py-4 px-6 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 active:scale-98 text-white font-black text-sm rounded-2xl shadow-xl transition transform hover:scale-102 flex flex-col items-center justify-center cursor-pointer"
              >
                <span className="text-base">SELECTION B</span>
                <span className="text-[11px] font-normal text-indigo-100">VS ライバルバトル (混走)</span>
              </button>
            </div>

            <button
              onClick={handleOpenEditor}
              className="py-2.5 px-6 bg-slate-800/90 hover:bg-slate-700 active:scale-98 text-slate-200 border border-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer"
            >
              🛠 コースエディタ (TRACK BUILDER)
            </button>
          </div>
        )}

        {/* 2. コース選択オーバーレイ */}
        {gameState === 'track_select' && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-white space-y-5 animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-amber-400">
              コースを選択 (SELECT TRACK)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-2xl w-full">
              {ALL_OFFICIAL_TRACKS.map((t, idx) => {
                const bTime = bestTimes[t.id];
                return (
                  <button
                    key={t.id}
                    onClick={() => setupRace(t, gameMode)}
                    className="p-4 bg-slate-900/90 hover:bg-slate-800 active:scale-98 border border-slate-700 hover:border-amber-500/60 rounded-2xl transition text-left cursor-pointer group shadow-lg"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-amber-400 group-hover:text-amber-300">
                        TRACK {idx + 1}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 bg-slate-800 rounded font-mono font-bold text-slate-300">
                        {t.difficulty}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-white mt-1 truncate">
                      {t.name}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-2 font-mono flex items-center justify-between">
                      <span>目標: {t.targetTime}s</span>
                      <span className="text-amber-400 font-bold">
                        {bTime ? `BEST: ${bTime.toFixed(2)}s` : 'BEST: --'}
                      </span>
                    </div>
                  </button>
                );
              })}

              {/* カスタムコース選択枠 */}
              <button
                onClick={() => setupRace(getCustomTrack(), gameMode)}
                className="p-4 bg-slate-900/90 hover:bg-slate-800 active:scale-98 border border-dashed border-indigo-500/60 rounded-2xl transition text-left cursor-pointer group shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-indigo-400">
                    CUSTOM
                  </span>
                  <span className="text-[10px] px-2 py-0.5 bg-indigo-900/50 text-indigo-300 rounded font-bold">
                    自作コース
                  </span>
                </div>
                <div className="text-sm font-bold text-white mt-1 truncate">
                  MY CUSTOM TRACK
                </div>
                <div className="text-[11px] text-slate-400 mt-2 font-mono">
                  エディタで作ったコースを走る
                </div>
              </button>
            </div>

            <button
              onClick={() => setGameState('title')}
              className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-xl transition cursor-pointer text-slate-300"
            >
              タイトルへ戻る
            </button>
          </div>
        )}

        {/* 3. カウントダウンオーバーレイ */}
        {gameState === 'countdown' && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex flex-col items-center justify-center text-white pointer-events-none">
            <div className="text-7xl sm:text-9xl font-black italic tracking-tighter text-amber-400 drop-shadow-2xl animate-ping">
              {countdownNum > 0 ? countdownNum : 'GO!'}
            </div>
            <div className="text-sm font-mono mt-4 text-slate-200">
              READY...
            </div>
          </div>
        )}

        {/* 4. クラッシュ時の連打アシストオーバーレイ (スマホ・PC共通) */}
        {gameState === 'playing' &&
          stateRef.current.player.crashed &&
          stateRef.current.player.isReturning && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <button
                onClick={handleMashTap}
                className="pointer-events-auto px-8 py-5 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-black text-xl sm:text-2xl rounded-3xl shadow-2xl border-4 border-amber-300 animate-bounce cursor-pointer flex flex-col items-center gap-1"
              >
                <span>🏃 連打してダッシュ！ 🏃</span>
                <span className="text-xs font-normal text-amber-200">
                  TAP / A・Bボタン連打で高速復帰！
                </span>
              </button>
            </div>
          )}

        {/* 5. 一時停止オーバーレイ */}
        {gameState === 'paused' && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-white space-y-4 animate-in fade-in duration-150">
            <h3 className="text-3xl font-black text-amber-400">PAUSED</h3>
            <div className="flex gap-3">
              <button
                onClick={() => setGameState('playing')}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 font-bold rounded-xl shadow transition cursor-pointer"
              >
                レース再開
              </button>
              <button
                onClick={() => setupRace(currentTrack, gameMode)}
                className="px-6 py-3 bg-slate-800 hover:bg-slate-700 font-bold rounded-xl border border-slate-700 transition cursor-pointer"
              >
                リトライ
              </button>
              <button
                onClick={() => setGameState('track_select')}
                className="px-5 py-3 bg-slate-800 hover:bg-slate-700 font-bold rounded-xl border border-slate-700 transition cursor-pointer text-slate-300"
              >
                コース選択へ
              </button>
            </div>
          </div>
        )}

        {/* 6. ゴール（FINISH）オーバーレイ */}
        {gameState === 'finished' && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-white space-y-4 animate-in zoom-in-95 duration-200">
            <div className="text-5xl sm:text-6xl font-black italic text-amber-400 tracking-tight">
              GOAL!!
            </div>
            <div className="bg-slate-900/90 border border-slate-700 rounded-2xl p-5 max-w-sm w-full text-center space-y-2 font-mono">
              <div className="text-xs text-slate-400">FINISH TIME</div>
              <div className="text-3xl font-black text-white">
                {stateRef.current.player.finishTime?.toFixed(2)}s
              </div>
              <div className="text-xs text-amber-300">
                目標タイム: {currentTrack.targetTime}s
              </div>
              {bestTimes[currentTrack.id] && (
                <div className="text-xs text-emerald-400 pt-2 border-t border-slate-800">
                  🏆 ベストタイム: {bestTimes[currentTrack.id].toFixed(2)}s
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setupRace(currentTrack, gameMode)}
                className="px-7 py-3.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold rounded-2xl shadow-lg transition flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" /> もう一度走る
              </button>
              <button
                onClick={() => setGameState('track_select')}
                className="px-6 py-3.5 bg-slate-800 hover:bg-slate-700 font-bold rounded-2xl border border-slate-700 transition cursor-pointer text-slate-200"
              >
                コース選択へ
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 7. コースエディタ UI (エディタモード時) */}
      {gameState === 'editor' && (
        <div className="w-full mt-3 p-4 bg-slate-900 border border-slate-800 rounded-2xl text-white space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="font-black text-amber-400 text-sm">🛠 コースエディタ</span>
              <span className="text-xs text-slate-400">
                全長: {currentTrack.totalLength}px (パーツ数: {editorSegments.length})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleTestRunEditorTrack}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow"
              >
                <Play className="w-4 h-4 fill-white" /> このコースをテスト走行！
              </button>
              <button
                onClick={() => setGameState('title')}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-xl transition cursor-pointer text-slate-300"
              >
                終了
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-bold text-slate-300">パーツを追加:</span>
            <select
              value={editorNewType}
              onChange={(e) => setEditorNewType(e.target.value as SegmentType)}
              className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-hidden"
            >
              <option value="small_ramp">小ジャンプ台 (Small Ramp)</option>
              <option value="big_ramp">大ジャンプ台 (Big Ramp)</option>
              <option value="table_top">テーブルトップ (Table Top)</option>
              <option value="whoops">フープス・波状コブ (Whoops)</option>
              <option value="mud">泥だまり (Mud Pool)</option>
              <option value="hurdle">ハードル (Hurdle)</option>
              <option value="cooler">クーラーパッド (Cooler)</option>
              <option value="flat">平地 (Flat Dirt)</option>
            </select>
            <button
              onClick={handleAddSegment}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 font-bold text-xs rounded-xl transition flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> 追加
            </button>
          </div>

          {/* セグメント一覧チップ */}
          <div className="flex items-center gap-2 overflow-x-auto py-2">
            {editorSegments.map((seg, idx) => (
              <div
                key={seg.id}
                onClick={() => setSelectedEditorSegmentId(seg.id)}
                className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-2 cursor-pointer border ${
                  seg.id === selectedEditorSegmentId
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
                }`}
              >
                <span>
                  {idx + 1}. {seg.type} ({seg.width}px)
                </span>
                {seg.type !== 'finish' && idx !== 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSegment(seg.id);
                    }}
                    className="hover:text-rose-400 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 8. スマホ／タブレット用オンスクリーンコントローラー */}
      <div className="w-full flex sm:hidden items-center justify-between gap-4 mt-3 px-2">
        {/* 左手側: 十字キー (Up/Down: レーン変更, Left: ウイリー, Right: 前傾) */}
        <div className="grid grid-cols-3 gap-1 w-36 h-36">
          <div />
          <button
            onTouchStart={() => (stateRef.current.inputs.up = true)}
            onTouchEnd={() => (stateRef.current.inputs.up = false)}
            onMouseDown={() => (stateRef.current.inputs.up = true)}
            onMouseUp={() => (stateRef.current.inputs.up = false)}
            className="bg-slate-800 active:bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center border border-slate-700 shadow touch-none select-none text-lg"
          >
            ▲
          </button>
          <div />

          <button
            onTouchStart={() => (stateRef.current.inputs.left = true)}
            onTouchEnd={() => (stateRef.current.inputs.left = false)}
            onMouseDown={() => (stateRef.current.inputs.left = true)}
            onMouseUp={() => (stateRef.current.inputs.left = false)}
            className="bg-slate-800 active:bg-indigo-600 text-white rounded-xl font-bold flex flex-col items-center justify-center border border-slate-700 shadow touch-none select-none text-xs"
          >
            <span>◀</span>
            <span className="text-[8px] text-amber-300">ウイリー</span>
          </button>
          <div className="bg-slate-900 rounded-xl border border-slate-800" />
          <button
            onTouchStart={() => (stateRef.current.inputs.right = true)}
            onTouchEnd={() => (stateRef.current.inputs.right = false)}
            onMouseDown={() => (stateRef.current.inputs.right = true)}
            onMouseUp={() => (stateRef.current.inputs.right = false)}
            className="bg-slate-800 active:bg-indigo-600 text-white rounded-xl font-bold flex flex-col items-center justify-center border border-slate-700 shadow touch-none select-none text-xs"
          >
            <span>▶</span>
            <span className="text-[8px] text-cyan-300">前傾</span>
          </button>

          <div />
          <button
            onTouchStart={() => (stateRef.current.inputs.down = true)}
            onTouchEnd={() => (stateRef.current.inputs.down = false)}
            onMouseDown={() => (stateRef.current.inputs.down = true)}
            onMouseUp={() => (stateRef.current.inputs.down = false)}
            className="bg-slate-800 active:bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center border border-slate-700 shadow touch-none select-none text-lg"
          >
            ▼
          </button>
          <div />
        </div>

        {/* 右手側: Aボタン (通常アクセル) & Bボタン (ターボ) */}
        <div className="flex items-center gap-3">
          <button
            onTouchStart={() => {
              stateRef.current.inputs.accelA = true;
              handleMashTap();
            }}
            onTouchEnd={() => (stateRef.current.inputs.accelA = false)}
            onMouseDown={() => {
              stateRef.current.inputs.accelA = true;
              handleMashTap();
            }}
            onMouseUp={() => (stateRef.current.inputs.accelA = false)}
            className="w-18 h-18 bg-amber-600 active:bg-amber-500 text-white rounded-full font-black text-sm flex flex-col items-center justify-center shadow-lg border-2 border-amber-400 touch-none select-none"
          >
            <span>A</span>
            <span className="text-[9px]">通常</span>
          </button>

          <button
            onTouchStart={() => {
              stateRef.current.inputs.accelB = true;
              handleMashTap();
            }}
            onTouchEnd={() => (stateRef.current.inputs.accelB = false)}
            onMouseDown={() => {
              stateRef.current.inputs.accelB = true;
              handleMashTap();
            }}
            onMouseUp={() => (stateRef.current.inputs.accelB = false)}
            className="w-18 h-18 bg-red-600 active:bg-red-500 text-white rounded-full font-black text-sm flex flex-col items-center justify-center shadow-lg border-2 border-red-400 touch-none select-none"
          >
            <span>B</span>
            <span className="text-[9px]">ターボ</span>
          </button>
        </div>
      </div>
    </div>
  );
};
