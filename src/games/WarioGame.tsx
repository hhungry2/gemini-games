import { useEffect, useRef, useState } from 'react';
import { BookOpen, Heart, Pause, Play, RotateCcw, Volume2, VolumeX, X, Zap } from 'lucide-react';
import type { WarioGameProps } from './wario/types';
import { createRushSession, clearRushInput, emptyRushInput, pauseRush, readRushRecord, RUSH_GAMES, rushDefinition, rushSpeed, startRush, stepRush, type RushId, type RushSession } from './wario/engine';
import { renderRush } from './wario/render';
import { warioAudio } from './wario/WarioAudio';
import { sound } from '../utils/audio';
import './wario/wario.css';

const SCORE_KEY = 'wario_high_score_v1';
const SPEED_KEY = 'wario_max_speed_v1';
const activePhases = ['brief', 'play', 'result', 'speedup'];
const practiceCategories = [
  { id: 'all', name: 'すべて' },
  { id: 'action', name: 'アクション' },
  { id: 'timing', name: 'タイミング' },
  { id: 'puzzle', name: 'パズル' },
  { id: 'memory', name: 'きおく' },
] as const;
type PracticeCategory = typeof practiceCategories[number]['id'];

export function WarioGame({ isDark, isFullscreen = false }: WarioGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const practiceGridRef = useRef<HTMLDivElement>(null);
  const heldKeysRef = useRef(new Set<string>());
  const sessionRef = useRef(createRushSession());
  const inputRef = useRef(emptyRushInput());
  const [view, setView] = useState<RushSession>(() => ({ ...sessionRef.current }));
  const [records, setRecords] = useState({ score: 0, level: 1 });
  const recordsRef = useRef(records);
  const [muted, setMuted] = useState(sound.getMuted());
  const [selected, setSelected] = useState<RushId>('jump');
  const selectedRef = useRef(selected);
  const [category, setCategory] = useState<PracticeCategory>('all');
  const [fit, setFit] = useState({ width: 640, height: 480 });
  const sync = () => setView({ ...sessionRef.current });
  const focusCanvas = () => canvasRef.current?.focus({ preventScroll: true });
  const selectPractice = (id: RushId) => { setSelected(id); selectedRef.current = id; };

  const playSounds = () => {
    const s = sessionRef.current;
    try {
      for (const sound of s.sounds) {
        if (sound !== 'start' && sound !== 'pop') warioAudio.stopBgm();
        if (sound === 'instruction') warioAudio.playInstruction();
        else if (sound === 'start') warioAudio.startMicrogameBgm(rushSpeed(s.level));
        else if (sound === 'success') warioAudio.playSuccess();
        else if (sound === 'failure') warioAudio.playFailure();
        else if (sound === 'speedup') warioAudio.playSpeedUp();
        else if (sound === 'over') warioAudio.playGameOver();
        else if (sound === 'pop') warioAudio.playPop();
      }
    } catch { /* Audio may be unavailable; every game remains fully playable. */ }
    s.sounds = [];
  };

  const start = (practice: RushId | null = null) => {
    warioAudio.stopBgm();
    heldKeysRef.current.clear();
    startRush(sessionRef.current, inputRef.current, practice);
    playSounds(); sync();
    focusCanvas();
  };
  const showMenu = (phase: 'title' | 'practice') => {
    warioAudio.stopBgm();
    sessionRef.current.phase = phase;
    sessionRef.current.paused = false;
    heldKeysRef.current.clear();
    clearRushInput(inputRef.current);
    sync();
  };
  const togglePause = () => {
    const s = sessionRef.current;
    heldKeysRef.current.clear();
    pauseRush(s, inputRef.current);
    warioAudio.stopBgm();
    if (!s.paused && s.phase === 'play') {
      try { warioAudio.startMicrogameBgm(rushSpeed(s.level)); } catch { /* Optional sound. */ }
    }
    sync();
    if (!s.paused) focusCanvas();
  };

  useEffect(() => {
    if (view.phase !== 'practice') return;
    const frame = requestAnimationFrame(() => {
      const grid = practiceGridRef.current;
      const card = grid?.querySelector<HTMLElement>('[aria-pressed="true"]');
      if (!grid || !card) return;
      const bounds = grid.getBoundingClientRect();
      const selection = card.getBoundingClientRect();
      if (selection.top < bounds.top + 3) grid.scrollTop -= bounds.top + 3 - selection.top;
      else if (selection.bottom > bounds.bottom - 3) grid.scrollTop += selection.bottom - bounds.bottom + 3;
    });
    return () => cancelAnimationFrame(frame);
  }, [selected, category, view.phase, fit]);

  useEffect(() => {
    const updateMute = (next: boolean) => {
      warioAudio.setMuted(next); setMuted(next);
      const session = sessionRef.current;
      if (!next && session.phase === 'play' && !session.paused) {
        try { warioAudio.startMicrogameBgm(rushSpeed(session.level)); } catch { /* Optional sound. */ }
      }
    };
    updateMute(sound.getMuted());
    return sound.subscribeMute(updateMute);
  }, []);

  useEffect(() => {
    try {
      const loaded = { score: readRushRecord(localStorage.getItem(SCORE_KEY), 0), level: readRushRecord(localStorage.getItem(SPEED_KEY), 1) };
      recordsRef.current = loaded; setRecords(loaded);
    } catch { /* Private browsing can disable storage. */ }
    const area = areaRef.current;
    if (!area) return;
    const resize = () => {
      const width = Math.max(1, Math.min(area.clientWidth, area.clientHeight * 4 / 3));
      setFit({ width: Math.floor(width), height: Math.floor(width * 3 / 4) });
    };
    const observer = new ResizeObserver(resize);
    observer.observe(area); resize();
    window.addEventListener('resize', resize);
    return () => { observer.disconnect(); window.removeEventListener('resize', resize); };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.round(fit.width * dpr));
    canvas.height = Math.max(1, Math.round(fit.height * dpr));
  }, [fit]);

  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    let lastUi = 0;
    const loop = (now: number) => {
      const s = sessionRef.current;
      stepRush(s, inputRef.current, (now - last) / 1000);
      if (s.phase !== 'play' || s.paused) heldKeysRef.current.clear();
      last = now;
      playSounds();
      if (!s.practice && (s.score > recordsRef.current.score || s.level > recordsRef.current.level)) {
        const next = { score: Math.max(s.score, recordsRef.current.score), level: Math.max(s.level, recordsRef.current.level) };
        recordsRef.current = next; setRecords(next);
        try { localStorage.setItem(SCORE_KEY, String(next.score)); localStorage.setItem(SPEED_KEY, String(next.level)); } catch { /* Scores still work without persistence. */ }
      }
      const canvas = canvasRef.current;
      const context = canvas?.getContext('2d');
      if (context && canvas) {
        context.setTransform(canvas.width / 640, 0, 0, canvas.height / 480, 0, 0);
        renderRush(context, s, now / 1000);
      }
      if (now - lastUi >= 40) { setView({ ...s }); lastUi = now; }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    const autoPause = () => {
      const s = sessionRef.current;
      heldKeysRef.current.clear();
      if (activePhases.includes(s.phase) && !s.paused) { pauseRush(s, inputRef.current, true); warioAudio.stopBgm(); setView({ ...s }); }
      else clearRushInput(inputRef.current);
    };
    const visibility = () => { if (document.hidden) autoPause(); };
    const keydown = (event: KeyboardEvent) => {
      if (document.querySelector('[data-game-modal]')) return;
      if (event.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)) return;
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Enter', 'Escape', 'p', 'P', 'a', 'A', 'd', 'D', 'w', 'W', 's', 'S'].includes(event.key)) return;
      // A focused DOM button retains its native Enter / Space activation.
      if (event.target instanceof HTMLButtonElement && (event.key === 'Enter' || event.key === ' ')) return;
      const s = sessionRef.current;
      if (s.phase === 'practice' && event.key.startsWith('Arrow')) {
        const cards = Array.from(practiceGridRef.current?.querySelectorAll<HTMLButtonElement>('.wario-game-card') ?? []);
        const index = cards.findIndex(card => card === event.target);
        if (index < 0) return;
        event.preventDefault();
        const offset = event.key === 'ArrowUp' ? -2 : event.key === 'ArrowDown' ? 2 : event.key === 'ArrowLeft' ? -1 : 1;
        const next = cards[Math.max(0, Math.min(cards.length - 1, index + offset))];
        next?.click(); next?.focus({ preventScroll: true });
        return;
      }
      event.preventDefault();
      const input = inputRef.current;
      if (['Escape', 'p', 'P'].includes(event.key)) {
        if (!event.repeat) {
          heldKeysRef.current.clear();
          pauseRush(s, input);
          warioAudio.stopBgm();
          if (!s.paused && s.phase === 'play') { try { warioAudio.startMicrogameBgm(rushSpeed(s.level)); } catch { /* Optional sound. */ } }
          setView({ ...s });
        }
        return;
      }
      if (s.paused) return;
      if (s.phase === 'title' || s.phase === 'over') {
        if (!event.repeat && (event.key === 'Enter' || event.key === ' ')) { heldKeysRef.current.clear(); startRush(s, input); playSounds(); setView({ ...s }); focusCanvas(); }
        return;
      }
      if (s.phase === 'practice') {
        if (!event.repeat && event.key === 'Enter') { heldKeysRef.current.clear(); startRush(s, input, selectedRef.current); playSounds(); setView({ ...s }); focusCanvas(); }
        return;
      }
      if (s.phase !== 'play') return;
      heldKeysRef.current.add(event.key.length === 1 ? event.key.toLowerCase() : event.key);
      if (['ArrowLeft', 'a', 'A'].includes(event.key)) { input.left = true; if (!event.repeat) input.leftPressed = true; }
      if (['ArrowRight', 'd', 'D'].includes(event.key)) { input.right = true; if (!event.repeat) input.rightPressed = true; }
      if (['ArrowUp', 'w', 'W'].includes(event.key)) { input.up = true; if (!event.repeat) input.upPressed = true; }
      if (['ArrowDown', 's', 'S'].includes(event.key)) { input.down = true; if (!event.repeat) input.downPressed = true; }
      if (event.key === ' ' || event.key === 'Enter') { input.actionHeld = true; if (!event.repeat) input.action = true; }
    };
    const keyup = (event: KeyboardEvent) => {
      const keys = heldKeysRef.current;
      const wasHeld = keys.delete(event.key.length === 1 ? event.key.toLowerCase() : event.key);
      const input = inputRef.current;
      const stillHeld = (options: string[]) => options.some(key => keys.has(key));
      if (['ArrowLeft', 'a', 'A'].includes(event.key)) input.left = stillHeld(['ArrowLeft', 'a', 'A']);
      if (['ArrowRight', 'd', 'D'].includes(event.key)) input.right = stillHeld(['ArrowRight', 'd', 'D']);
      if (['ArrowUp', 'w', 'W'].includes(event.key)) input.up = stillHeld(['ArrowUp', 'w', 'W']);
      if (['ArrowDown', 's', 'S'].includes(event.key)) input.down = stillHeld(['ArrowDown', 's', 'S']);
      if (event.key === ' ' || event.key === 'Enter') {
        input.actionHeld = input.pointerDown || stillHeld([' ', 'Enter']);
        if (wasHeld && !input.actionHeld && sessionRef.current.phase === 'play' && !sessionRef.current.paused) input.actionReleased = true;
      }
    };
    window.addEventListener('keydown', keydown);
    window.addEventListener('keyup', keyup);
    window.addEventListener('blur', autoPause);
    window.addEventListener('games-hub:pause', autoPause);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      cancelAnimationFrame(frame); warioAudio.stopBgm(); heldKeysRef.current.clear(); clearRushInput(inputRef.current);
      window.removeEventListener('keydown', keydown); window.removeEventListener('keyup', keyup);
      window.removeEventListener('blur', autoPause); document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('games-hub:pause', autoPause);
    };
  // The engine, input and audio are stable refs. React snapshots never own the game clock.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const playing = activePhases.includes(view.phase);
  const definition = view.game ? rushDefinition(view.game.id) : RUSH_GAMES[0];
  const trainingDefinition = rushDefinition(selected);
  const practiceGames = RUSH_GAMES.filter(game => category === 'all' || game.category === category);
  const chooseCategory = (next: PracticeCategory) => {
    setCategory(next);
    const games = RUSH_GAMES.filter(game => next === 'all' || game.category === next);
    if (!games.some(game => game.id === selected) && games[0]) selectPractice(games[0].id);
  };
  const pointer = (clientX: number, clientY: number) => {
    const bounds = canvasRef.current?.getBoundingClientRect();
    if (!bounds || !bounds.width || !bounds.height) return;
    inputRef.current.pointerX = (clientX - bounds.left) / bounds.width * 640;
    inputRef.current.pointerY = (clientY - bounds.top) / bounds.height * 480;
  };

  return <div className={`wario-root ${isFullscreen ? 'wario-fullscreen' : ''}`} data-theme={isDark ? 'dark' : 'light'}>
    <header className="wario-hud">
      <div className="wario-stats">
        <div><small>{view.practice ? 'PRACTICE' : 'CLEAR'}</small><strong>{view.score.toString().padStart(2, '0')}</strong></div>
        <div><small>BEST</small><strong className="wario-best">{records.score.toString().padStart(2, '0')}</strong></div>
        <div><small>SPEED</small><strong className="wario-speed">{rushSpeed(view.level).toFixed(2)}<em>×</em></strong></div>
      </div>
      <div className="wario-hud-right">
        <div className="wario-lives" aria-label={view.practice ? '練習モード：ライフ無制限' : `残り ${view.lives} ライフ`}>
          {[0, 1, 2, 3].map(index => <Heart key={index} size={16} fill="currentColor" style={{ opacity: index < view.lives ? 1 : 0.2 }} />)}
        </div>
        <button className="wario-icon" aria-label={muted ? '音をオン' : '音をオフ'} onClick={() => sound.toggleMute()}>{muted ? <VolumeX size={19} /> : <Volume2 size={19} />}</button>
        <button className="wario-icon" aria-label="一時停止" disabled={!playing} onClick={togglePause}><Pause size={19} /></button>
      </div>
    </header>

    <div ref={areaRef} className="wario-area">
      <div className="wario-stage" style={{ width: fit.width, height: fit.height }}>
        <canvas ref={canvasRef} className="wario-canvas" aria-label="プチゲーム・ラッシュのゲーム画面" tabIndex={0}
          onPointerDown={event => {
            if (sessionRef.current.phase !== 'play' || sessionRef.current.paused || (event.pointerType === 'mouse' && event.button !== 0)) return;
            event.preventDefault(); event.currentTarget.focus({ preventScroll: true });
            event.currentTarget.setPointerCapture(event.pointerId); pointer(event.clientX, event.clientY);
            inputRef.current.pointerDown = true; inputRef.current.pointerPressed = true; inputRef.current.action = true; inputRef.current.actionHeld = true;
          }}
          onPointerMove={event => { if (inputRef.current.pointerDown) pointer(event.clientX, event.clientY); }}
          onPointerUp={event => {
            const input = inputRef.current;
            const wasDown = input.pointerDown;
            pointer(event.clientX, event.clientY);
            input.pointerDown = false;
            input.actionHeld = heldKeysRef.current.has(' ') || heldKeysRef.current.has('Enter');
            if (wasDown && !input.actionHeld && sessionRef.current.phase === 'play' && !sessionRef.current.paused) input.actionReleased = true;
            if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
          }}
          onPointerCancel={() => { clearRushInput(inputRef.current); }}
          onLostPointerCapture={() => {
            const input = inputRef.current;
            if (!input.pointerDown) return;
            input.pointerDown = false;
            input.actionHeld = heldKeysRef.current.has(' ') || heldKeysRef.current.has('Enter');
            if (!input.actionHeld && sessionRef.current.phase === 'play' && !sessionRef.current.paused) input.actionReleased = true;
          }}
        />

        {playing && <div className="wario-timer" aria-label={`残り ${Math.max(0, view.duration - view.elapsed).toFixed(1)} 秒`}>
          <div className="wario-timer-track"><div style={{ width: `${Math.max(0, 1 - view.elapsed / view.duration) * 100}%`, background: view.elapsed / view.duration > 0.75 ? '#f16c95' : '#f8d94b' }} /></div>
          <span>{view.phase === 'play' ? Math.max(0, view.duration - view.elapsed).toFixed(1) : view.phase === 'brief' ? view.duration.toFixed(1) : '0.0'}s</span>
        </div>}

        {view.phase === 'title' && <div className="wario-overlay wario-title">
          <span className="wario-kicker">INSTANT ARCADE / {RUSH_GAMES.length} GAMES</span>
          <h1>プチゲーム<br /><span>ラッシュ！</span></h1>
          <p>考えるひまは、ない。<br className="wario-mobile-break" /> 5 秒のひらめき、何回つなげる？</p>
          <button className="wario-primary" onClick={() => start()}><Play size={19} fill="currentColor" />ラッシュをはじめる</button>
          <button className="wario-secondary" onClick={() => showMenu('practice')}><BookOpen size={16} />えらんで練習</button>
          <small className="wario-title-record">4 ライフで挑戦 · 5 クリアごとにスピードアップ</small>
        </div>}

        {view.phase === 'brief' && !view.paused && <div className="wario-overlay wario-brief" style={{ background: definition.color }}>
          <span className="wario-kicker">{view.practice ? 'PRACTICE' : `ROUND ${String(view.round).padStart(2, '0')}`} / {definition.name}</span>
          <h2>{definition.command}</h2>
          <p>{definition.shortHint}</p>
          <span className="wario-ready">{view.phaseTime < 0.4 ? 'GO!' : 'READY'}</span>
        </div>}

        {view.phase === 'result' && !view.paused && <div className={`wario-overlay wario-result ${view.result === 'success' ? 'wario-success' : ''}`}>
          <div className="wario-result-symbol">{view.result === 'success' ? '✓' : '×'}</div>
          <h2>{view.result === 'success' ? 'やった！' : 'おしい！'}</h2>
          <p>{view.game?.reason}</p>
          {view.practice && <small>練習中 · 同じゲームでもう一回</small>}
        </div>}

        {view.phase === 'speedup' && !view.paused && <div className="wario-overlay wario-speedup">
          <Zap size={46} fill="currentColor" /><span className="wario-kicker">KEEP IT GOING</span><h2>SPEED UP!</h2><p>{rushSpeed(view.level).toFixed(2)} × にスピードアップ！</p>
        </div>}

        {view.phase === 'over' && <div className="wario-overlay wario-over">
          <span className="wario-kicker">NICE RUN / また挑戦しよう</span><h2>TIME TO<br /><span>RETRY!</span></h2>
          <p className="wario-over-score"><strong>{view.score}</strong><span>クリア<br />BEST {records.score}</span></p>
          <button className="wario-primary" onClick={() => start()}><RotateCcw size={18} />もう一回！</button>
          <button className="wario-secondary" onClick={() => showMenu('title')}>タイトルへ</button>
        </div>}

        {view.phase === 'practice' && <div className="wario-overlay wario-practice">
          <div className="wario-practice-head"><div><span className="wario-kicker">{practiceGames.length} / {RUSH_GAMES.length} GAMES · スクロールで選ぶ</span><h2>えらんで練習</h2></div><button className="wario-icon" aria-label="タイトルに戻る" onClick={() => showMenu('title')}><X size={20} /></button></div>
          <div className="wario-practice-categories" role="group" aria-label="ミニゲームのジャンル">
            {practiceCategories.map(item => <button key={item.id} className={category === item.id ? 'is-active' : ''} aria-pressed={category === item.id} onClick={() => chooseCategory(item.id)}>
              {item.name}<span>{item.id === 'all' ? RUSH_GAMES.length : RUSH_GAMES.filter(game => game.category === item.id).length}</span>
            </button>)}
          </div>
          <div ref={practiceGridRef} className="wario-practice-grid" role="group" aria-label={`${practiceCategories.find(item => item.id === category)?.name}のミニゲーム`}>
            {practiceGames.map(game => <button key={game.id} className={`wario-game-card ${selected === game.id ? 'is-selected' : ''}`} aria-pressed={selected === game.id} onClick={() => selectPractice(game.id)}>
              <b style={{ background: game.color }}>{game.number}</b><span>{game.name}<small>{game.command}</small></span>
            </button>)}
          </div>
          <div className="wario-practice-footer"><p><strong>{trainingDefinition.name}</strong>{trainingDefinition.hint}</p><button className="wario-primary" onClick={() => start(selected)}><Play size={17} fill="currentColor" />練習する</button></div>
        </div>}

        {view.paused && <div className="wario-overlay wario-pause">
          <span className="wario-kicker">TAKE A BREATHER</span><h2>ひとやすみ。</h2><p>ゲームと残り時間を止めています</p>
          <button className="wario-primary" onClick={togglePause}><Play size={18} fill="currentColor" />つづける</button>
          <div className="wario-pause-options"><button className="wario-secondary" onClick={() => start(view.practice)}><RotateCcw size={16} />やり直す</button><button className="wario-secondary" onClick={() => showMenu('practice')}><BookOpen size={16} />練習</button></div>
          <button className="wario-text-button" onClick={() => showMenu('title')}>タイトルへ</button>
        </div>}
      </div>
    </div>
    <footer className="wario-footer"><span>{view.practice ? 'PRACTICE · 記録には入りません' : `${RUSH_GAMES.length} 種類のプチゲーム`}</span><span>タップ / Space / ↑ ↓ ← → <i> · P / Esc で一時停止</i></span></footer>
  </div>;
}
