import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { ArrowLeft, CircleHelp, Pause, Play, RotateCcw, Timer, Trophy, Volume2, VolumeX, Zap } from 'lucide-react';
import { sound } from '../utils/audio';
import { HOLE_COLORS, INITIAL_RADIUS, createHoleWorld, getGrowthProgress, ranking, stepHoleWorld, type HoleInput, type HoleWorld } from './holeio/engine';
import { renderHoleWorld, updateHoleCamera, type HoleCamera, type PointerVisual } from './holeio/render';
import './holeio/holeio.css';

interface HoleIoGameProps { onBackToHub: () => void; isDark: boolean; isFullscreen?: boolean }
type Phase = 'menu' | 'playing' | 'paused' | 'results';
interface Records { score: number; kills: number; size: number }
const RECORD_KEYS = ['holeio_high_score', 'holeio_best_kills', 'holeio_max_size'];
const readRecords = (): Records => {
  const values = RECORD_KEYS.map(key => {
    try { const value = Number(localStorage.getItem(key)); return Number.isFinite(value) && value >= 0 ? value : 0; } catch { return 0; }
  });
  return { score: values[0], kills: values[1], size: values[2] };
};
const emptyPointer = (): PointerVisual => ({ active: false, x: 0, y: 0, anchorX: 0, anchorY: 0, touch: false });
const makeHud = (world: HoleWorld) => {
  const player = world.holes[0];
  const leaders = ranking(world);
  return {
    score: player.score, radius: player.radius, kills: player.kills, eaten: player.eaten, stamina: player.stamina,
    rank: leaders.findIndex(h => h.id === 0) + 1, remaining: Math.ceil(Math.max(0, world.duration - world.elapsed)),
    leaders: leaders.map(h => ({ id: h.id, name: h.name, score: h.score, color: h.color })),
    combo: player.combo, respawn: player.respawn, growth: getGrowthProgress(player), message: world.messageTime > 0 ? world.message : '',
  };
};

export function HoleIoGame({ onBackToHub, isDark, isFullscreen = false }: HoleIoGameProps) {
  const [phase, setPhase] = useState<Phase>('menu');
  const [duration, setDuration] = useState(120);
  const [color, setColor] = useState(HOLE_COLORS[0]);
  const [records, setRecords] = useState(readRecords);
  const [muted, setMuted] = useState(sound.getMuted());
  const [help, setHelp] = useState(false);
  const [initialWorld] = useState(() => createHoleWorld(120, 31415));
  const worldRef = useRef<HoleWorld>(initialWorld);
  const [hud, setHud] = useState(() => makeHud(worldRef.current));
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const phaseRef = useRef<Phase>('menu');
  const keysRef = useRef(new Set<string>());
  const pointerRef = useRef<PointerVisual>(emptyPointer());
  const boostRef = useRef(false);
  const sizeRef = useRef({ width: 800, height: 600, dpr: 1 });
  const cameraRef = useRef<HoleCamera>({ x: 1100, y: 1100, zoom: 0.95 });
  const resultSavedRef = useRef(false);

  const clearInput = useCallback(() => {
    keysRef.current.clear(); pointerRef.current = emptyPointer(); boostRef.current = false;
  }, []);
  const changePhase = useCallback((next: Phase) => {
    clearInput(); phaseRef.current = next; setPhase(next);
    if (next === 'playing') canvasRef.current?.focus({ preventScroll: true });
  }, [clearInput]);
  const start = useCallback(() => {
    worldRef.current = createHoleWorld(duration, Date.now(), color);
    cameraRef.current = { x: 1100, y: 1100, zoom: Math.min(sizeRef.current.width, sizeRef.current.height) / 640 };
    resultSavedRef.current = false; setHud(makeHud(worldRef.current)); setHelp(false);
    changePhase('playing');
    sound.playCellClick();
  }, [color, duration, changePhase]);

  useEffect(() => {
    const stage = stageRef.current, canvas = canvasRef.current;
    if (!stage || !canvas) return;
    const resize = () => {
      const bounds = stage.getBoundingClientRect();
      const width = Math.max(1, Math.round(bounds.width)), height = Math.max(1, Math.round(bounds.height));
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      sizeRef.current = { width, height, dpr };
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    };
    resize();
    const observer = new ResizeObserver(resize); observer.observe(stage);
    window.addEventListener('resize', resize);
    return () => { observer.disconnect(); window.removeEventListener('resize', resize); };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current, ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    let raf = 0, previous = performance.now(), accumulator = 0, lastHud = 0, lastSound = 0, swallowed = 0;
    const frame = (now: number) => {
      const dt = Math.min(0.05, Math.max(0, (now - previous) / 1000)); previous = now;
      const world = worldRef.current, player = world.holes[0], size = sizeRef.current, camera = cameraRef.current;
      if (phaseRef.current === 'playing') {
        const keys = keysRef.current, pointer = pointerRef.current;
        const input: HoleInput = { x: 0, y: 0, boost: boostRef.current || keys.has(' ') || keys.has('shift') };
        input.x = Number(keys.has('arrowright') || keys.has('d')) - Number(keys.has('arrowleft') || keys.has('a'));
        input.y = Number(keys.has('arrowdown') || keys.has('s')) - Number(keys.has('arrowup') || keys.has('w'));
        if (input.x === 0 && input.y === 0 && pointer.active) {
          if (pointer.touch) { input.x = (pointer.x - pointer.anchorX) / 42; input.y = (pointer.y - pointer.anchorY) / 42; }
          else {
            const dx = (pointer.x - size.width / 2) / camera.zoom + camera.x - player.x;
            const dy = (pointer.y - size.height / 2) / camera.zoom + camera.y - player.y;
            const length = Math.hypot(dx, dy);
            if (length > 5) { input.x = dx / Math.max(35, length); input.y = dy / Math.max(35, length); }
          }
        }
        accumulator += dt;
        while (accumulator >= 1 / 60) { stepHoleWorld(world, input, 1 / 60); accumulator -= 1 / 60; }
        if (world.swallowSerial !== swallowed) {
          swallowed = world.swallowSerial;
          if (now - lastSound > 100) { sound.playCellClick(); lastSound = now; }
        }
        if (world.ended && !resultSavedRef.current) {
          resultSavedRef.current = true;
          setRecords(old => {
            const next = { score: Math.max(old.score, player.score), kills: Math.max(old.kills, player.kills), size: Math.max(old.size, Math.round(player.peakRadius)) };
            Object.values(next).forEach((value, index) => { try { localStorage.setItem(RECORD_KEYS[index], String(value)); } catch { /* Records are optional in private browsing. */ } });
            return next;
          });
          setHud(makeHud(world));
          phaseRef.current = 'results'; setPhase('results'); clearInput();
          if (ranking(world)[0].id === 0) sound.playWin(); else sound.playGameOver();
        }
      } else accumulator = 0;
      updateHoleCamera(camera, player, size.width, size.height, dt);
      ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
      renderHoleWorld(ctx, world, camera, size.width, size.height, pointerRef.current);
      if (now - lastHud > 100) { setHud(makeHud(world)); lastHud = now; }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [clearInput]);

  useEffect(() => {
    const pause = () => { if (phaseRef.current === 'playing') changePhase('paused'); else clearInput(); };
    const visibility = () => { if (document.hidden) pause(); };
    window.addEventListener('blur', pause); document.addEventListener('visibilitychange', visibility);
    window.addEventListener('games-hub:pause', pause);
    return () => { window.removeEventListener('blur', pause); window.removeEventListener('games-hub:pause', pause); document.removeEventListener('visibilitychange', visibility); };
  }, [changePhase, clearInput]);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (!stageRef.current?.contains(document.activeElement)) return;
      if (phaseRef.current === 'menu' || phaseRef.current === 'results') return;
      const key = event.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd', ' ', 'shift', 'escape', 'p'].includes(key)) event.preventDefault();
      if ((key === 'escape' || key === 'p') && !event.repeat) {
        if (phaseRef.current === 'playing') changePhase('paused');
        else if (phaseRef.current === 'paused') changePhase('playing');
      } else if (phaseRef.current === 'playing') keysRef.current.add(key);
    };
    const up = (event: KeyboardEvent) => keysRef.current.delete(event.key.toLowerCase());
    window.addEventListener('keydown', down); window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [changePhase]);

  const timer = `${Math.floor(hud.remaining / 60)}:${String(hud.remaining % 60).padStart(2, '0')}`;
  const running = phase === 'playing' || phase === 'paused';
  const leaderboard = hud.leaders.slice(0, 3);

  return (
    <section className={`holeio ${isFullscreen ? 'holeio-fullscreen' : ''} ${isDark ? 'holeio-dark' : ''}`} aria-label="ホール・シティ">
      <div ref={stageRef} className="holeio-stage">
        <canvas ref={canvasRef} className="holeio-canvas" tabIndex={0} aria-label="街を飲み込むゲーム画面。矢印キーかWASDで移動、Spaceでダッシュ、Pで一時停止。"
          onPointerDown={event => {
            if (phaseRef.current !== 'playing') return;
            event.preventDefault(); event.currentTarget.focus({ preventScroll: true });
            event.currentTarget.setPointerCapture(event.pointerId);
            const rect = event.currentTarget.getBoundingClientRect();
            const x = event.clientX - rect.left, y = event.clientY - rect.top;
            pointerRef.current = { active: true, x, y, anchorX: x, anchorY: y, touch: event.pointerType !== 'mouse' };
          }}
          onPointerMove={event => {
            if (!pointerRef.current.active) return;
            const rect = event.currentTarget.getBoundingClientRect();
            pointerRef.current.x = event.clientX - rect.left; pointerRef.current.y = event.clientY - rect.top;
          }}
          onPointerUp={() => { pointerRef.current.active = false; }}
          onPointerCancel={() => { pointerRef.current.active = false; }}
          onLostPointerCapture={() => { pointerRef.current.active = false; }}
          onContextMenu={event => event.preventDefault()}
        />

        {running && <>
          <div className="holeio-top-hud">
            <div className="holeio-score-card">
              <span className="holeio-eyebrow">CITY SCORE</span>
              <strong>{hud.score.toLocaleString()}<small>pt</small></strong>
              <div className="holeio-growth-label"><span>{hud.growth.next}</span><b>Ø {Math.round(hud.radius / INITIAL_RADIUS * 2.4)}m</b></div>
              <div className="holeio-growth-track"><i style={{ width: `${hud.growth.progress * 100}%` }} /></div>
            </div>
            <div className={`holeio-timer ${hud.remaining <= 20 ? 'holeio-timer-urgent' : ''}`}><Timer size={15} /><strong>{timer}</strong></div>
            <div className="holeio-hud-actions">
              <button className="holeio-icon-button" aria-label={muted ? 'サウンドを有効にする' : 'サウンドをミュート'} onClick={() => setMuted(sound.toggleMute())}>{muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
              <button className="holeio-icon-button" aria-label="一時停止" onClick={() => changePhase('paused')}><Pause size={18} /></button>
            </div>
          </div>
          <div className="holeio-rank-card">
            <div><Trophy size={14} /><b>{hud.rank}<small> / 6位</small></b></div>
            {leaderboard.map((leader, index) => <p className={leader.id === 0 ? 'holeio-player-row' : ''} key={leader.id}><span><i style={{ background: leader.color }} />{index + 1}. {leader.id === 0 ? 'あなた' : leader.name}</span><b>{leader.score.toLocaleString()}</b></p>)}
          </div>
          {hud.message && <div className="holeio-toast" role="status">{hud.message}</div>}
          {hud.combo >= 4 && <div className="holeio-combo">{hud.combo}<small> COMBO</small></div>}
          {hud.respawn > 0 && <div className="holeio-respawn"><strong>{Math.ceil(hud.respawn)}</strong><span>少し小さくなって復活！</span></div>}
          <div className="holeio-bottom-hud"><span className="holeio-control-hint">ドラッグ / WASDで移動<br /><i />光るものを飲み込もう</span>
            <button className="holeio-boost" aria-label="長押しでダッシュ。キーボードはSpace" onPointerDown={event => {
              if (phaseRef.current !== 'playing') return;
              event.currentTarget.setPointerCapture(event.pointerId); boostRef.current = true;
            }} onPointerUp={() => { boostRef.current = false; }} onPointerCancel={() => { boostRef.current = false; }} onLostPointerCapture={() => { boostRef.current = false; }}>
              <Zap size={21} fill="currentColor" /><span>ダッシュ</span><i><b style={{ width: `${hud.stamina}%` }} /></i>
            </button>
          </div>
        </>}

        {phase === 'menu' && <div className="holeio-overlay holeio-menu-overlay">
          <div className="holeio-menu">
            <div className="holeio-title-mark"><span style={{ borderColor: color }} /></div>
            <p className="holeio-eyebrow">A LITTLE HOLE. A BIG APPETITE.</p>
            <h1>ホール・シティ<span>HOLE CITY</span></h1>
            <p className="holeio-intro">ひとくちから、街まるごと。</p>
            <p className="holeio-menu-description">小物 → 木 → クルマ → ビル。<br />飲み込んで大きくなり、6つのホールの頂点へ。</p>
            <div className="holeio-duration" aria-label="ラウンド時間">
              {[120, 90].map(value => <button aria-pressed={duration === value} className={duration === value ? 'selected' : ''} onClick={() => setDuration(value)} key={value}><b>{value === 120 ? 'のんびり2分' : 'さくっと90秒'}</b><span>{value === 120 ? '街を食べつくそう' : '短期スコア勝負'}</span></button>)}
            </div>
            <div className="holeio-color-row"><span>あなたの色</span>{HOLE_COLORS.map((item, index) => <button key={item} style={{ '--swatch': item } as CSSProperties} className={color === item ? 'selected' : ''} aria-label={`ホールの色 ${['ターコイズ', 'ピンク', 'オレンジ', 'パープル', 'グリーン', 'ブルー'][index]}`} aria-pressed={color === item} onClick={() => setColor(item)} />)}</div>
            <button className="holeio-primary" onClick={start}><Play size={19} fill="currentColor" /> 街をいただきます</button>
            <div className="holeio-menu-footer"><span><Trophy size={13} /> BEST {records.score.toLocaleString()}</span><button onClick={() => setHelp(!help)} aria-expanded={help}><CircleHelp size={14} /> 遊び方</button></div>
            {help && <div className="holeio-help">ドラッグ / タッチスティック / 矢印・WASDで移動。光る輪のあるものを飲み込めます。Space・Shiftかダッシュボタン長押しで加速。大きな相手からは逃げよう！ P・Escで一時停止。</div>}
            <button className="holeio-back" onClick={onBackToHub}><ArrowLeft size={14} /> ハブへ戻る</button>
          </div>
        </div>}

        {phase === 'paused' && <div className="holeio-overlay"><div className="holeio-dialog">
          <p className="holeio-eyebrow">TAKE A LITTLE BREAK</p><h2>ひとやすみ</h2><p>街はあなたを待っています。</p>
          <button className="holeio-primary" onClick={() => changePhase('playing')}><Play size={18} fill="currentColor" /> 続ける</button>
          <button className="holeio-secondary" onClick={start}><RotateCcw size={16} /> 最初から</button>
          <button className="holeio-back" onClick={() => changePhase('menu')}>メニューへ</button>
        </div></div>}

        {phase === 'results' && <div className="holeio-overlay"><div className="holeio-dialog holeio-results">
          <div className="holeio-result-medal"><Trophy size={27} /></div>
          <p className="holeio-eyebrow">CITY, DELICIOUSLY CLEARED</p><h2>{hud.rank === 1 ? 'ごちそうさまでした！' : 'おなかいっぱい！'}</h2>
          <div className="holeio-result-rank"><strong>{hud.rank}</strong><span>/ 6 位</span></div>
          <div className="holeio-result-stats"><div><span>スコア</span><strong>{hud.score.toLocaleString()}</strong></div><div><span>飲み込んだもの</span><strong>{hud.eaten}<small>個</small></strong></div><div><span>ホール撃破</span><strong>{hud.kills}<small>回</small></strong></div></div>
          <div className="holeio-final-table">{hud.leaders.map((leader, index) => <p key={leader.id} className={leader.id === 0 ? 'holeio-player-row' : ''}><span>{index + 1}<i style={{ background: leader.color }} />{leader.id === 0 ? 'あなた' : leader.name}</span><b>{leader.score.toLocaleString()} pt</b></p>)}</div>
          <p className="holeio-record-text">ベスト {records.score.toLocaleString()} pt ・ 最大サイズ {records.size} ・ 撃破記録 {records.kills}回</p>
          <button className="holeio-primary" onClick={start}><RotateCcw size={18} /> もうひとくち！</button>
          <button className="holeio-back" onClick={() => changePhase('menu')}>メニューへ</button>
        </div></div>}
      </div>
    </section>
  );
}
