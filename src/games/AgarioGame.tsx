import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { ArrowLeft, ArrowUpRight, CircleDot, Crown, Droplets, Home, Pause, Play, RotateCcw, Shield, Timer, Trophy, Volume2, VolumeX } from 'lucide-react';
import { sound } from '../utils/audio';
import { COLORS, ROUND_SECONDS, createArena, ejectPlayer, leaderboard, playerCenter, splitPlayer, stepArena, totalMass, type ArenaInput, type ArenaMode } from './agario/engine';
import { captureEvents, createView, renderArena } from './agario/renderer';
import './agario/agario.css';

export const AGARIO_HIGH_SCORE_KEY = 'agario_high_mass';
export const AGARIO_BEST_KILLS_KEY = 'agario_best_kills';
export const AGARIO_BEST_RANK_KEY = 'agario_best_rank';
const NAME_KEY = 'agario_player_name';
const COLOR_KEY = 'agario_color_v2';
type Screen = 'menu' | 'playing' | 'paused' | 'over';

interface AgarioGameProps { onBackToHub: () => void; isDark: boolean; isFullscreen?: boolean }
const readStored = (key: string, fallback = '') => { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } };
const saveStored = (key: string, value: string | number) => { try { localStorage.setItem(key, String(value)); } catch { /* Storage may be unavailable in a private browser. */ } };
const readNumber = (key: string, fallback = 0) => { const value = Number(readStored(key, String(fallback))); return Number.isFinite(value) && value >= 0 ? value : fallback; };
const formatClock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

export function AgarioGame({ onBackToHub, isFullscreen = false }: AgarioGameProps) {
  const [screen, setScreen] = useState<Screen>('menu');
  const [mode, setMode] = useState<ArenaMode>('ffa');
  const [name, setName] = useState(() => readStored(NAME_KEY, 'あなた').slice(0, 12));
  const [color, setColor] = useState(() => { const saved = readStored(COLOR_KEY); return COLORS.includes(saved) ? saved : COLORS[0]; });
  const [muted, setMuted] = useState(() => sound.getMuted());
  const [record, setRecord] = useState(() => Math.floor(readNumber(AGARIO_HIGH_SCORE_KEY)));
  const [initialArena] = useState(() => createArena());
  const [hud, setHud] = useState(() => ({ mass: 85, kills: 0, rank: 1, time: 0, cells: 1, merge: 0, peak: 85, bestRank: 1, canSplit: true, canEject: true, leaders: leaderboard(initialArena).slice(0, 5) }));
  const [stick, setStick] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const arenaRef = useRef(initialArena);
  const viewRef = useRef(createView());
  const screenRef = useRef<Screen>('menu');
  const sizeRef = useRef({ width: 1, height: 1, dpr: 1 });
  const keysRef = useRef(new Set<string>());
  const pointerRef = useRef({ x: 0, y: 0, active: false });
  const joystickRef = useRef<ArenaInput>({ x: 0, y: 0 });
  const touchIdRef = useRef<number | null>(null);
  const aimRef = useRef<ArenaInput>({ x: 1, y: 0 });
  const reducedMotionRef = useRef(false);
  const lastSoundRef = useRef(0);

  const updateHud = useCallback(() => {
    const arena = arenaRef.current;
    const cells = arena.cells.filter(cell => cell.owner === 0);
    const leaders = leaderboard(arena);
    setHud({ mass: Math.floor(totalMass(arena)), kills: arena.kills, rank: Math.max(1, leaders.findIndex(owner => owner.id === 0) + 1),
      time: arena.time, cells: cells.length, merge: cells.length > 1 ? Math.max(0, ...cells.map(cell => cell.mergeAt - arena.time)) : 0,
      peak: Math.floor(arena.peak), bestRank: arena.bestRank, canSplit: cells.length < 8 && cells.some(cell => cell.mass >= 60),
      canEject: cells.some(cell => cell.mass >= 30), leaders: leaders.slice(0, 5) });
  }, []);

  const saveRecords = useCallback(() => {
    const arena = arenaRef.current;
    const peak = Math.max(Math.floor(arena.peak), readNumber(AGARIO_HIGH_SCORE_KEY));
    saveStored(AGARIO_HIGH_SCORE_KEY, peak);
    saveStored(AGARIO_BEST_KILLS_KEY, Math.max(arena.kills, readNumber(AGARIO_BEST_KILLS_KEY)));
    saveStored(AGARIO_BEST_RANK_KEY, Math.min(arena.bestRank, readNumber(AGARIO_BEST_RANK_KEY, 99) || 99));
    setRecord(peak);
  }, []);

  const resetInput = useCallback(() => {
    keysRef.current.clear(); pointerRef.current.active = false; joystickRef.current = { x: 0, y: 0 };
    touchIdRef.current = null; setStick({ x: 0, y: 0 });
  }, []);

  const changeScreen = useCallback((next: Screen) => { screenRef.current = next; setScreen(next); resetInput(); }, [resetInput]);
  const start = useCallback(() => {
    saveStored(NAME_KEY, name.trim() || 'あなた'); saveStored(COLOR_KEY, color);
    arenaRef.current = createArena(mode, name, color);
    viewRef.current = createView();
    aimRef.current = { x: 1, y: 0 };
    changeScreen('playing'); updateHud();
    canvasRef.current?.focus({ preventScroll: true });
  }, [changeScreen, color, mode, name, updateHud]);

  const pause = useCallback(() => {
    if (screenRef.current === 'playing') { saveRecords(); changeScreen('paused'); }
    else if (screenRef.current === 'paused') { changeScreen('playing'); canvasRef.current?.focus({ preventScroll: true }); }
  }, [changeScreen, saveRecords]);

  const split = useCallback(() => {
    if (screenRef.current !== 'playing') return;
    if (splitPlayer(arenaRef.current, aimRef.current)) {
      sound.playAgarioSplit();
      captureEvents(viewRef.current, arenaRef.current.events, reducedMotionRef.current); arenaRef.current.events = [];
      updateHud();
    }
  }, [updateHud]);
  const eject = useCallback(() => {
    if (screenRef.current !== 'playing') return;
    if (ejectPlayer(arenaRef.current, aimRef.current)) { sound.playAgarioEject(); updateHud(); }
  }, [updateHud]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const resize = () => {
      const bounds = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      sizeRef.current = { width: Math.max(1, bounds.width), height: Math.max(1, bounds.height), dpr };
      canvas.width = Math.round(bounds.width * dpr); canvas.height = Math.round(bounds.height * dpr);
    };
    resize(); const observer = new ResizeObserver(resize); observer.observe(container);
    window.addEventListener('resize', resize);
    return () => { observer.disconnect(); window.removeEventListener('resize', resize); };
  }, []);

  useEffect(() => {
    reducedMotionRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    return sound.subscribeMute(setMuted);
  }, []);

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (document.querySelector('[data-game-modal]')) return;
      if (event.target instanceof HTMLButtonElement && (event.code === 'Space' || event.code === 'Enter')) return;
      if ((event.target as HTMLElement).closest('input, textarea, select')) return;
      if (event.code === 'Escape' || event.code === 'KeyP') { event.preventDefault(); if (!event.repeat) pause(); return; }
      if (screenRef.current !== 'playing') return;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyW'].includes(event.code)) event.preventDefault();
      keysRef.current.add(event.code);
      if (event.code === 'Space' && !event.repeat) split();
      if (event.code === 'KeyW') eject();
    };
    const keyup = (event: KeyboardEvent) => keysRef.current.delete(event.code);
    const blur = () => { if (screenRef.current === 'playing') pause(); else resetInput(); };
    const visibility = () => { if (document.hidden) blur(); };
    window.addEventListener('keydown', keydown); window.addEventListener('keyup', keyup); window.addEventListener('blur', blur);
    window.addEventListener('games-hub:pause', blur);
    document.addEventListener('visibilitychange', visibility);
    return () => { window.removeEventListener('keydown', keydown); window.removeEventListener('keyup', keyup); window.removeEventListener('blur', blur); window.removeEventListener('games-hub:pause', blur); document.removeEventListener('visibilitychange', visibility); };
  }, [eject, pause, resetInput, split]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;
    let frame = 0;
    let previous = performance.now();
    let accumulator = 0;
    let hudElapsed = 0;
    let recordElapsed = 0;
    const animate = (now: number) => {
      const elapsed = Math.min(0.05, (now - previous) / 1000); previous = now;
      const arena = arenaRef.current;
      if (screenRef.current === 'playing') {
        accumulator += elapsed; hudElapsed += elapsed; recordElapsed += elapsed;
        const keys = keysRef.current;
        let input = { x: Number(keys.has('ArrowRight')) - Number(keys.has('ArrowLeft')), y: Number(keys.has('ArrowDown')) - Number(keys.has('ArrowUp')) };
        if (!input.x && !input.y) {
          input = joystickRef.current;
          const pointer = pointerRef.current;
          if (!input.x && !input.y && pointer.active) {
            const center = playerCenter(arena);
            const view = viewRef.current;
            const cx = sizeRef.current.width / 2 + (center.x - view.x) * view.zoom;
            const cy = sizeRef.current.height / 2 + (center.y - view.y) * view.zoom;
            const dx = pointer.x - cx; const dy = pointer.y - cy;
            const distance = Math.hypot(dx, dy);
            input = distance > 8 ? { x: dx / Math.max(65, distance), y: dy / Math.max(65, distance) } : { x: 0, y: 0 };
          }
        }
        if (Math.hypot(input.x, input.y) > 0.05) aimRef.current = input;
        while (accumulator >= 1 / 60 && arena.status === 'playing') {
          if (keys.has('KeyW')) ejectPlayer(arena, aimRef.current);
          stepArena(arena, input);
          captureEvents(viewRef.current, arena.events, reducedMotionRef.current);
          if (arena.events.some(event => event.type === 'eat')) sound.playAgarioCellEat();
          else if (arena.events.some(event => event.type === 'merge')) sound.playAgarioMerge();
          else if (arena.events.some(event => event.type === 'pellet') && now - lastSoundRef.current > 90) { sound.playAgarioPelletEat(); lastSoundRef.current = now; }
          accumulator -= 1 / 60;
        }
        if (hudElapsed >= 0.1) { updateHud(); hudElapsed = 0; }
        if (recordElapsed > 3) { saveRecords(); recordElapsed = 0; }
        if (arena.status === 'over') { saveRecords(); updateHud(); changeScreen('over'); }
      } else accumulator = 0;
      const { width, height, dpr } = sizeRef.current;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      renderArena(ctx, arena, viewRef.current, width, height, screenRef.current === 'paused' ? 0 : elapsed, reducedMotionRef.current);
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [changeScreen, saveRecords, updateHud]);

  const pointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (screenRef.current !== 'playing') return;
    if (event.pointerType === 'touch' && event.buttons === 0) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    pointerRef.current = { x: event.clientX - bounds.left, y: event.clientY - bounds.top, active: true };
  };
  const moveStick = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (screenRef.current !== 'playing' || touchIdRef.current !== event.pointerId) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const dx = event.clientX - bounds.left - bounds.width / 2;
    const dy = event.clientY - bounds.top - bounds.height / 2;
    const length = Math.hypot(dx, dy);
    const limit = bounds.width * 0.32;
    const ratio = Math.min(1, limit / Math.max(1, length));
    setStick({ x: dx * ratio, y: dy * ratio });
    joystickRef.current = { x: dx * ratio / limit, y: dy * ratio / limit };
    if (length > 2) aimRef.current = joystickRef.current;
  };
  const stopStick = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (touchIdRef.current !== event.pointerId) return;
    touchIdRef.current = null; joystickRef.current = { x: 0, y: 0 }; setStick({ x: 0, y: 0 });
  };
  const backToMenu = () => { saveRecords(); changeScreen('menu'); };
  const leave = () => { if (screenRef.current !== 'menu') saveRecords(); onBackToHub(); };
  const remaining = Math.max(0, Math.ceil(ROUND_SECONDS - hud.time));
  const playing = screen === 'playing';

  return (
    <div ref={containerRef} className={`agar-game ${isFullscreen ? 'agar-fullscreen' : ''}`} aria-label="Agar.io 細胞アリーナ">
      <canvas ref={canvasRef} className="agar-canvas" tabIndex={0} aria-label="ゲーム画面。マウスか方向キーで移動、スペースで分裂、Wで放出、Pで一時停止。"
        onPointerMove={pointerMove} onPointerDown={event => { if (playing) { event.currentTarget.focus({ preventScroll: true }); event.currentTarget.setPointerCapture(event.pointerId); pointerMove(event); } }}
        onPointerUp={event => { if (event.pointerType !== 'mouse') pointerRef.current.active = false; }}
        onPointerCancel={() => { pointerRef.current.active = false; }} onPointerLeave={event => { if (event.pointerType === 'mouse') pointerRef.current.active = false; }} />

      {screen !== 'menu' && <>
        <div className="agar-top">
          <div className="agar-score" aria-live="off">
            <div><div className="agar-score-label">MASS</div><div className="agar-score-number">{hud.mass.toLocaleString()}</div></div>
            <div className="agar-score-divider" />
            <div className="agar-score-side">{hud.rank === 1 ? '♛ ' : ''}{hud.rank}位 <small>{hud.kills} 撃破 · {hud.cells} 細胞</small></div>
            {mode === 'timeattack' && <><div className="agar-score-divider" /><div className="agar-score-side" style={{ color: remaining <= 15 ? '#ffad9e' : undefined }}>{formatClock(remaining)}<small>残り時間</small></div></>}
          </div>
          <div className="agar-right">
            <div className="agar-tools">
              <button type="button" className="agar-icon" onClick={() => sound.toggleMute()} aria-label={muted ? '音をオンにする' : '音をオフにする'}>{muted ? <VolumeX size={15} /> : <Volume2 size={15} />}</button>
              <button type="button" className="agar-icon" onClick={pause} aria-label="一時停止" disabled={!playing}><Pause size={16} /></button>
            </div>
            <div className="agar-leaders"><div className="agar-leaders-title"><Crown size={12} /> LEADERBOARD</div>
              {hud.leaders.map((owner, index) => <div key={owner.id} className={`agar-leader ${owner.id === 0 ? 'agar-self' : ''}`}><span>{index + 1}</span><span className="agar-leader-name">{owner.name}</span><span className="agar-leader-mass">{Math.floor(owner.mass)}</span></div>)}
            </div>
          </div>
        </div>
        {playing && hud.time < 4 && <div className="agar-shield"><Shield size={11} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 5 }} />スタート保護 · あと {Math.ceil(4 - hud.time)} 秒</div>}
        {playing && <div className="agar-bottom">
          <div className="agar-hint"><strong>小さい細胞を食べて、大きく。</strong><br />マウス / 方向キーで移動 · P で休憩</div>
          <div className="agar-joystick" role="group" aria-label="移動スティック"
            onPointerDown={event => { if (touchIdRef.current !== null) return; touchIdRef.current = event.pointerId; event.currentTarget.setPointerCapture(event.pointerId); pointerRef.current.active = false; moveStick(event); }}
            onPointerMove={moveStick} onPointerUp={stopStick} onPointerCancel={stopStick} onLostPointerCapture={stopStick}>
            <div className="agar-stick" style={{ transform: `translate(${stick.x}px, ${stick.y}px)` }} />
          </div>
          <div className="agar-actions">
            <button type="button" className="agar-action" onClick={eject} disabled={!hud.canEject} aria-label="質量を放出、Wキー"><Droplets size={16} /><span>放出<small>質量 −8</small></span><kbd>W</kbd></button>
            <button type="button" className="agar-action" onClick={split} disabled={!hud.canSplit} aria-label="分裂、スペースキー"><CircleDot size={17} /><span>分裂<small>{hud.merge > 0 ? `再結合 ${Math.ceil(hud.merge)}秒` : '質量60から'}</small></span><kbd>SPACE</kbd></button>
          </div>
        </div>}
      </>}

      {screen === 'menu' && <div className="agar-overlay">
        <div className="agar-menu">
          <div className="agar-eyebrow">THE LITTLE CELL, BIG AMBITION</div>
          <h1>agar<span>.io</span></h1>
          <p className="agar-menu-desc">小さなひと粒から、アリーナの頂点へ。<br /><b>光る粒と小さい相手を食べて成長。</b>大きい相手からは逃げよう。</p>
          <div className="agar-setup">
            <div className="agar-field-row">
              <label className="agar-name"><span className="agar-label">あなたの名前</span><input value={name} maxLength={12} onChange={event => setName(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') start(); }} placeholder="あなた" aria-label="プレイヤー名" /></label>
              <div><span className="agar-label">カラー</span><div className="agar-colors">{COLORS.map((value, index) => <button type="button" key={value} className="agar-color" style={{ background: value }} aria-label={['シアン', 'オレンジ', 'パープル', 'ピンク', 'ミント', 'イエロー'][index]} aria-pressed={color === value} onClick={() => setColor(value)} />)}</div></div>
            </div>
            <div className="agar-modes" role="group" aria-label="ゲームモード">
              <button type="button" className="agar-mode" aria-pressed={mode === 'ffa'} onClick={() => setMode('ffa')}><CircleDot size={20} /><span><b>フリーアリーナ</b><small>14体のCPU · 時間制限なし</small></span></button>
              <button type="button" className="agar-mode" aria-pressed={mode === 'timeattack'} onClick={() => setMode('timeattack')}><Timer size={20} /><span><b>90秒アタック</b><small>制限時間で最大の質量へ</small></span></button>
            </div>
            <button type="button" className="agar-primary" onClick={start}>アリーナへ <ArrowUpRight size={19} /></button>
          </div>
          <div className="agar-controls"><span className="agar-desktop-control">マウス / <b>方向キー</b> で移動</span><span className="agar-desktop-control"><b>SPACE</b> 分裂</span><span className="agar-desktop-control"><b>W</b> 放出</span><span className="agar-touch-control">左スティックで移動 · 右ボタンで分裂 / 放出</span></div>
          <div className="agar-menu-footer"><button type="button" onClick={leave}><ArrowLeft size={12} /> ゲーム一覧</button><span className="agar-record">BEST {record.toLocaleString()} MASS</span><button type="button" onClick={() => sound.toggleMute()} aria-label={muted ? '音をオンにする' : '音をオフにする'}>{muted ? <VolumeX size={14} /> : <Volume2 size={14} />}</button></div>
        </div>
      </div>}

      {screen === 'paused' && <div className="agar-overlay"><div className="agar-dialog" role="dialog" aria-modal="true" aria-label="一時停止">
        <div className="agar-dialog-icon"><Pause size={25} /></div><h2>ひと休み。</h2><p>時間も相手の細胞も止まっています。<br />分裂した細胞は12秒後から再結合できます。</p>
        <button type="button" className="agar-primary" onClick={pause} autoFocus><Play size={16} /> 続ける</button>
        <button type="button" className="agar-secondary" onClick={start}><RotateCcw size={14} /> 最初から遊ぶ</button>
        <button type="button" className="agar-secondary" onClick={backToMenu}><Home size={14} /> モード選択へ</button>
      </div></div>}

      {screen === 'over' && <div className="agar-overlay"><div className="agar-dialog" role="dialog" aria-modal="true" aria-label="ゲーム結果">
        <div className="agar-dialog-icon"><Trophy size={26} /></div><h2>{hud.mass === 0 ? '次は、もっと大きく。' : 'タイムアップ！'}</h2>
        <p>{hud.mass === 0 ? '大きな細胞に吸収されました。粒を集めて再挑戦。' : '90秒のアリーナ、おつかれさま。'}<br />ベスト記録 {record.toLocaleString()} MASS</p>
        <div className="agar-result-grid"><div><b>{hud.peak.toLocaleString()}</b><span>最大の質量</span></div><div><b>{hud.kills}</b><span>撃破した相手</span></div><div><b>{hud.bestRank}位</b><span>最高順位</span></div></div>
        <button type="button" className="agar-primary" onClick={start} autoFocus><RotateCcw size={16} /> もう一度遊ぶ</button>
        <button type="button" className="agar-secondary" onClick={backToMenu}><Home size={14} /> モード選択へ</button>
      </div></div>}
    </div>
  );
}
