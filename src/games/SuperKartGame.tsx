import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  ChevronRight,
  Flag,
  HelpCircle,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  Trophy,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { DRIVERS, TRACKS } from './superkart/tracks';
import {
  aiInput,
  createRace,
  emptyInput,
  formatTime,
  ITEMS,
  POINTS,
  readRecords,
  saveRecord,
  STEP,
} from './superkart/engine';
import { KartRenderer, kartSprite } from './superkart/renderer';
import { KartAudio } from './superkart/audio';
import type { Input, Mode, Race, Track } from './superkart/types';
import './superkart/superkart.css';

type Phase = 'menu' | 'garage' | 'racing' | 'paused' | 'results' | 'podium';
type Props = {
  onBackToHub: () => void;
  isDark?: boolean;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
};
const CONTROL_KEYS: Record<string, keyof Input> = {
  ArrowUp: 'gas',
  KeyW: 'gas',
  ArrowDown: 'brake',
  KeyS: 'brake',
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  Space: 'drift',
  ShiftLeft: 'drift',
  ShiftRight: 'drift',
  KeyE: 'item',
  KeyX: 'item',
  Enter: 'item',
};

function Avatar({ driver, size = 52 }: { driver: number; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    ref.current?.getContext('2d')?.drawImage(kartSprite(driver, true), 0, 0);
  }, [driver]);
  return (
    <canvas
      ref={ref}
      width={40}
      height={42}
      style={{
        width: size,
        height: (size * 42) / 40,
        imageRendering: 'pixelated',
      }}
      aria-hidden="true"
    />
  );
}
function TrackMap({
  track,
  race,
  small = false,
}: {
  track: Track;
  race?: Race;
  small?: boolean;
}) {
  const points = track.points.map((p) => `${p.x},${p.y}`).join(' ');
  return (
    <svg
      className={small ? 'sk-track-map' : 'sk-minimap'}
      viewBox="60 60 900 900"
      aria-label={`${track.name} コースマップ`}
    >
      <polyline
        points={`${points} ${track.points[0].x},${track.points[0].y}`}
        fill="none"
        stroke="#172d40"
        strokeWidth="79"
        strokeLinejoin="round"
      />
      <polyline
        points={`${points} ${track.points[0].x},${track.points[0].y}`}
        fill="none"
        stroke={track.theme === 'rainbow' ? '#b49ae8' : '#b5cfb9'}
        strokeWidth="40"
        strokeLinejoin="round"
      />
      <rect
        x={track.points[0].x - 10}
        y={track.points[0].y - 40}
        width="20"
        height="80"
        fill="#ffdf86"
      />
      {race &&
        [...race.karts]
          .reverse()
          .map((k) => (
            <circle
              key={k.id}
              cx={k.x}
              cy={k.y}
              r={k.id === 0 ? 26 : 18}
              fill={DRIVERS[k.driver].color}
              stroke={k.id === 0 ? '#ffffff' : '#172d40'}
              strokeWidth={k.id === 0 ? 13 : 6}
            />
          ))}
    </svg>
  );
}

export function SuperKartGame({
  onBackToHub,
  isFullscreen = false,
  onToggleFullscreen,
}: Props) {
  const root = useRef<HTMLDivElement>(null),
    canvas = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<Phase>('menu'),
    phaseRef = useRef<Phase>('menu');
  const [driver, setDriver] = useState(0),
    [course, setCourse] = useState(0),
    [cc, setCc] = useState(100),
    [mode, setMode] = useState<Mode>('race');
  const [muted, setMuted] = useState(false),
    [help, setHelp] = useState(false);
  const [autoGas, setAutoGas] = useState(
    () => window.matchMedia('(pointer: coarse)').matches,
  );
  const autoRef = useRef(autoGas);
  autoRef.current = autoGas;
  const [records, setRecords] = useState(readRecords),
    recordsRef = useRef(records);
  recordsRef.current = records;
  const [newBest, setNewBest] = useState(false),
    [persisted, setPersisted] = useState(true);
  const [scores, setScores] = useState<number[]>(Array(8).fill(0)),
    scoresRef = useRef(scores);
  scoresRef.current = scores;
  const [round, setRound] = useState(0);
  const [, redraw] = useState(0);
  const race = useRef<Race>(createRace(0, 0, 100, 'race'));
  const renderer = useRef<KartRenderer | null>(null),
    audio = useRef<KartAudio | null>(null);
  const keys = useRef(new Set<string>()),
    pointers = useRef(new Map<number, keyof Input>()),
    itemPressed = useRef(false);
  const clearInput = useCallback(() => {
    keys.current.clear();
    pointers.current.clear();
    itemPressed.current = false;
  }, []);
  const changePhase = useCallback(
    (next: Phase) => {
      clearInput();
      phaseRef.current = next;
      setPhase(next);
    },
    [clearInput],
  );
  const pause = useCallback(() => {
    if (phaseRef.current === 'racing') changePhase('paused');
  }, [changePhase]);
  const resume = () => {
    audio.current?.unlock();
    changePhase('racing');
    root.current?.focus();
  };

  useEffect(() => {
    renderer.current = new KartRenderer();
    audio.current = new KartAudio();
    const preview = race.current;
    preview.countdown = 0;
    preview.karts[0].speed = 85;
    let animation = 0,
      previous = performance.now(),
      accumulated = 0,
      lastUi = 0;
    const frame = (now: number) => {
      const dt = Math.min(0.08, Math.max(0, (now - previous) / 1000));
      previous = now;
      const phaseNow = phaseRef.current,
        current = race.current;
      if (phaseNow === 'racing' || phaseNow === 'menu') {
        accumulated += dt;
        while (accumulated >= STEP) {
          const input = emptyInput();
          for (const code of keys.current)
            if (CONTROL_KEYS[code]) input[CONTROL_KEYS[code]] = true;
          for (const control of pointers.current.values())
            input[control] = true;
          input.item = itemPressed.current;
          itemPressed.current = false;
          if (autoRef.current) input.gas = current.countdown < 1;
          const selected =
            phaseNow === 'menu' ? aiInput(current, current.karts[0]) : input;
          // The same deterministic engine powers the live title-screen demonstration.
          step(current, selected);
          accumulated -= STEP;
          if (current.done) {
            if (phaseNow === 'menu') {
              race.current = createRace(0, 0, 100, 'race');
              race.current.countdown = 0;
              renderer.current?.resetCamera();
            } else {
              const record = saveRecord(current, recordsRef.current);
              recordsRef.current = record.records;
              setRecords(record.records);
              setNewBest(record.best);
              setPersisted(record.persisted);
              if (current.mode === 'gp') {
                const next = [...scoresRef.current];
                current.karts.forEach((k) => {
                  next[k.driver] += POINTS[k.rank - 1];
                });
                scoresRef.current = next;
                setScores(next);
              }
              changePhase('results');
            }
            accumulated = 0;
            break;
          }
        }
      } else accumulated = 0;
      if (canvas.current)
        renderer.current?.draw(canvas.current, race.current, now / 1000);
      for (const event of current.events.splice(0))
        if (phaseNow !== 'menu') audio.current?.event(event);
      audio.current?.update(
        current.karts[0].speed,
        current.time,
        phaseNow === 'racing' && current.countdown <= 0 && !current.done,
        TRACKS.indexOf(current.track),
      );
      if (now - lastUi > 100) {
        lastUi = now;
        redraw((n) => n + 1);
      }
      animation = requestAnimationFrame(frame);
    };
    animation = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(animation);
      audio.current?.dispose();
      renderer.current = null;
    };
  }, [changePhase]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (e.repeat) return;
        if (help) {
          setHelp(false);
          return;
        }
        if (phaseRef.current === 'racing') {
          e.preventDefault();
          pause();
        } else if (phaseRef.current === 'paused') {
          e.preventDefault();
          changePhase('racing');
        }
        return;
      }
      if (phaseRef.current !== 'racing' || help || !CONTROL_KEYS[e.code])
        return;
      e.preventDefault();
      if (CONTROL_KEYS[e.code] === 'item' && !e.repeat)
        itemPressed.current = true;
      keys.current.add(e.code);
    };
    const up = (e: KeyboardEvent) => {
      keys.current.delete(e.code);
    };
    const hidden = () => {
      if (document.hidden) pause();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', pause);
    document.addEventListener('visibilitychange', hidden);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', pause);
      document.removeEventListener('visibilitychange', hidden);
    };
  }, [pause, changePhase, help]);

  const start = (nextCourse = course, nextRound = 0, freshCup = true) => {
    audio.current?.unlock();
    renderer.current?.resetCamera();
    if (freshCup) {
      const fresh = Array(8).fill(0);
      setScores(fresh);
      scoresRef.current = fresh;
    }
    setCourse(nextCourse);
    setRound(nextRound);
    setNewBest(false);
    setHelp(false);
    race.current = createRace(
      nextCourse,
      driver,
      cc,
      mode,
      2026 + nextCourse * 311 + (Date.now() % 10000),
    );
    audio.current?.event('count');
    changePhase('racing');
    root.current?.focus();
  };
  const showGarage = () => {
    changePhase('garage');
    setHelp(false);
  };
  const previewCourse = (index: number) => {
    setCourse(index);
    race.current = createRace(index, driver, cc, mode);
    renderer.current?.resetCamera();
  };
  const touch = (key: keyof Input) => ({
    onPointerDown: (e: ReactPointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      pointers.current.set(e.pointerId, key);
      if (key === 'item') itemPressed.current = true;
    },
    onPointerUp: (e: ReactPointerEvent<HTMLButtonElement>) =>
      pointers.current.delete(e.pointerId),
    onPointerCancel: (e: ReactPointerEvent<HTMLButtonElement>) =>
      pointers.current.delete(e.pointerId),
    onLostPointerCapture: (e: ReactPointerEvent<HTMLButtonElement>) =>
      pointers.current.delete(e.pointerId),
  });
  const current = race.current,
    player = current.karts[0],
    racingView = ['racing', 'paused', 'results'].includes(phase);
  const sorted = [...current.karts].sort((a, b) => a.rank - b.rank);
  const cup = DRIVERS.map((d, i) => ({ ...d, id: i, points: scores[i] })).sort(
    (a, b) => b.points - a.points || a.id - b.id,
  );
  const standing = 1 + cup.filter((d) => d.points > scores[driver]).length;
  const content = (
    <div
      ref={root}
      tabIndex={-1}
      className={`sk-game ${isFullscreen ? 'sk-fullscreen' : ''}`}
      data-phase={phase}
    >
      <div className="sk-world">
        <canvas ref={canvas} aria-label="疑似3Dカートレース画面" />
      </div>
      <div className="sk-topbar">
        <button
          className="sk-icon sk-back"
          aria-label={phase === 'menu' ? 'Games Hubに戻る' : 'タイトルに戻る'}
          onClick={() => {
            setHelp(false);
            if (phase === 'menu') {
              if (isFullscreen) onToggleFullscreen?.();
              onBackToHub();
            } else {
              race.current = createRace(0, 0, 100, 'race');
              race.current.countdown = 0;
              renderer.current?.resetCamera();
              changePhase('menu');
            }
          }}
        >
          <ArrowLeft size={17} />
          <span>{phase === 'menu' ? 'GAMES HUB' : 'TITLE'}</span>
        </button>
        <span className="sk-brand">
          <span className="sk-brand-dot" /> 16-BIT GP{' '}
          <span className="sk-brand-sub">/ SUPER KART</span>
        </span>
        <div className="sk-tools">
          {phase === 'racing' && (
            <button className="sk-icon" aria-label="一時停止" onClick={pause}>
              <Pause size={17} />
            </button>
          )}
          <button
            className="sk-icon"
            aria-label="遊び方"
            onClick={() => {
              pause();
              setHelp(true);
            }}
          >
            <HelpCircle size={17} />
          </button>
          <button
            className="sk-icon"
            aria-label={muted ? 'サウンドをオン' : 'サウンドをオフ'}
            onClick={() => {
              audio.current?.unlock();
              audio.current?.setMuted(!muted);
              setMuted(!muted);
            }}
          >
            {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
          </button>
          {onToggleFullscreen && (
            <button
              className="sk-icon"
              aria-label={isFullscreen ? '全画面を解除' : '全画面にする'}
              onClick={onToggleFullscreen}
            >
              {isFullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
            </button>
          )}
        </div>
      </div>

      {phase === 'menu' && (
        <div className="sk-menu">
          <div className="sk-menu-copy">
            <span className="sk-eyebrow">
              <Flag size={14} /> THE LITTLE KART. THE BIG RACE.
            </span>
            <h1>
              SUPER
              <br />
              <span>MARIO KART</span>
            </h1>
            <div className="sk-edition">
              <span /> 16-BIT GRAND PRIX <span />
            </div>
            <p className="sk-intro">
              あのコーナーを、ドリフトで。
              <br />
              小さなカートで、大きな逆転を。
            </p>
            <div className="sk-menu-actions">
              <button className="sk-primary" onClick={() => start(0)}>
                <Play size={18} fill="currentColor" />
                すぐにレース <ChevronRight size={20} />
              </button>
              <button className="sk-secondary" onClick={showGarage}>
                カート・コースを選ぶ <ChevronRight size={16} />
              </button>
            </div>
            <div className="sk-menu-specs">
              <span>
                <b>08</b> DRIVERS
              </span>
              <span>
                <b>04</b> COURSES
              </span>
              <span>
                <b>03</b> LAPS
              </span>
            </div>
          </div>
          <div className="sk-attract-label">
            <span className="sk-live-dot" /> LIVE DEMO <b>MARIO CIRCUIT</b>
          </div>
          <div className="sk-menu-footer">
            <span>RETRO RACING, BUILT FROM SCRATCH.</span>
            <span>ブラウザで遊べるファンメイド・レース</span>
          </div>
        </div>
      )}

      {phase === 'garage' && (
        <div className="sk-overlay sk-garage">
          <div className="sk-garage-heading">
            <div>
              <span className="sk-eyebrow">GET READY TO RACE</span>
              <h2>きみのレースを、選ぼう。</h2>
            </div>
            <span className="sk-small">全3周 / 8台レース</span>
          </div>
          <div className="sk-setup-row">
            <div>
              <span className="sk-label">01 / RACE MODE</span>
              <div className="sk-segments">
                {(
                  [
                    ['race', 'VS レース'],
                    ['gp', 'グランプリ'],
                    ['trial', 'タイムアタック'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    aria-pressed={mode === id}
                    onClick={() => setMode(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="sk-label">ENGINE CLASS</span>
              <div className="sk-segments">
                {[50, 100, 150].map((value) => (
                  <button
                    key={value}
                    aria-pressed={cc === value}
                    onClick={() => setCc(value)}
                  >
                    {value}
                    <small>cc</small>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="sk-section-label">
            <span className="sk-label">02 / SELECT DRIVER</span>
            <span>
              {DRIVERS[driver].name}{' '}
              <i>
                ·{' '}
                {driver < 2
                  ? 'バランス型'
                  : [4, 5].includes(driver)
                    ? '最高速重視'
                    : 'コーナリング重視'}
              </i>
            </span>
          </div>
          <div className="sk-drivers">
            {DRIVERS.map((d, i) => (
              <button
                key={d.name}
                className="sk-driver"
                aria-pressed={driver === i}
                onClick={() => setDriver(i)}
                style={{ '--driver-color': d.color } as CSSProperties}
              >
                <Avatar driver={i} />
                <span>{d.name}</span>
                <span className="sk-driver-no">
                  {String(i + 1).padStart(2, '0')}
                </span>
              </button>
            ))}
          </div>
          <div className="sk-section-label">
            <span className="sk-label">03 / SELECT COURSE</span>
            <span>
              {mode === 'gp'
                ? '4コースを順番に走るカップ戦'
                : mode === 'trial'
                  ? 'ライバルなし・自分の記録に挑戦'
                  : '好きなコースで一発勝負'}
            </span>
          </div>
          <div className="sk-tracks">
            {TRACKS.map((track, i) => (
              <button
                key={track.id}
                className={`sk-track sk-track-${track.theme}`}
                aria-pressed={mode === 'gp' || course === i}
                disabled={mode === 'gp'}
                onClick={() => previewCourse(i)}
              >
                <span className="sk-track-number">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <TrackMap track={track} small />
                <strong>{track.name}</strong>
                <span className="sk-course-difficulty">
                  {'★'.repeat(i + 1)}
                  {'☆'.repeat(3 - i)}
                </span>
                <small>
                  {records[`${track.id}_${cc}_${mode}`]
                    ? formatTime(records[`${track.id}_${cc}_${mode}`])
                    : 'NO RECORD YET'}
                </small>
              </button>
            ))}
          </div>
          <div className="sk-setup-bottom">
            <label className="sk-auto">
              <input
                type="checkbox"
                checked={autoGas}
                onChange={(e) => setAutoGas(e.target.checked)}
              />
              オートアクセル <span>スマホにおすすめ</span>
            </label>
            <button
              className="sk-primary"
              onClick={() => start(mode === 'gp' ? 0 : course)}
            >
              <Flag size={18} />
              {mode === 'gp' ? 'グランプリをはじめる' : 'レースをはじめる'}
              <ChevronRight size={20} />
            </button>
          </div>
          <p className="sk-garage-hint">
            ↑ / W アクセル　 ← → / A D ハンドル　 Space ドリフト　 E / X
            アイテム
          </p>
        </div>
      )}

      {racingView && (
        <>
          <div className="sk-race-hud">
            <div className="sk-position">
              <b>{player.rank}</b>
              <span>
                {player.rank === 1
                  ? 'st'
                  : player.rank === 2
                    ? 'nd'
                    : player.rank === 3
                      ? 'rd'
                      : 'th'}
                <small>/ {current.karts.length}</small>
              </span>
            </div>
            <div className="sk-race-meta">
              <span>
                {current.track.name}
                {current.mode === 'gp' ? ` · RACE ${round + 1}/4` : ''}
              </span>
              <div>
                <b>
                  LAP {Math.min(current.laps, player.lap)}
                  <i> / {current.laps}</i>
                </b>
                <span className="sk-clock">{formatTime(current.time)}</span>
              </div>
            </div>
            <div className={`sk-item ${player.item ? 'sk-item-ready' : ''}`}>
              <span className="sk-label">ITEM / E</span>
              <b>
                {player.roulette > 0
                  ? ['🍄', '★', '🍌', '🐢'][Math.floor(current.time * 12) % 4]
                  : player.item
                    ? ITEMS[player.item].icon
                    : '–'}
              </b>
              <small>
                {player.item ? ITEMS[player.item].name : 'BOXをひろおう'}
              </small>
            </div>
          </div>
          <div className="sk-telemetry">
            <div>
              <span className="sk-coin">●</span>{' '}
              <b>{String(player.coins).padStart(2, '0')}</b>
              <span>/ 10</span>
            </div>
            <div className="sk-speed">
              <b>{Math.round(player.speed * 0.8)}</b>
              <span>km/h</span>
            </div>
            <div className="sk-drift-meter">
              <span
                style={{
                  width: `${(player.driftCharge / 2.5) * 100}%`,
                  background: player.driftCharge > 1.5 ? '#ffba69' : '#74dcf0',
                }}
              />
            </div>
            <small>
              {player.driftCharge > 0
                ? 'DRIFT → RELEASE TO BOOST'
                : player.offroad
                  ? 'OFF ROAD'
                  : autoGas
                    ? 'AUTO ACCEL ON'
                    : 'SPACE TO DRIFT'}
            </small>
          </div>
          <div className="sk-map-panel">
            <TrackMap track={current.track} race={current} />
            <span>
              {current.cc}cc ·{' '}
              {current.mode === 'trial' ? 'TIME ATTACK' : '3 LAP RACE'}
            </span>
          </div>
          {phase === 'racing' && (
            <>
              {current.countdown > 0 ? (
                <div className="sk-countdown" aria-live="polite">
                  <b>{Math.ceil(current.countdown)}</b>
                  <span>「1」でアクセル → ロケットスタート</span>
                </div>
              ) : (
                current.messageTime > 0 && (
                  <div className="sk-race-message" role="status">
                    {current.message}
                  </div>
                )
              )}
              <div className="sk-touch">
                <div>
                  <button {...touch('left')} aria-label="左にハンドル">
                    ◀
                  </button>
                  <button {...touch('right')} aria-label="右にハンドル">
                    ▶
                  </button>
                </div>
                <div>
                  <button
                    className="sk-touch-item"
                    {...touch('item')}
                    aria-label="アイテムを使う"
                  >
                    {player.item ? ITEMS[player.item].icon : 'ITEM'}
                  </button>
                  <button {...touch('drift')} aria-label="ドリフト">
                    DRIFT
                  </button>
                  {!autoGas && (
                    <button
                      className="sk-touch-gas"
                      {...touch('gas')}
                      aria-label="アクセル"
                    >
                      GAS
                    </button>
                  )}
                  <button
                    className="sk-touch-brake"
                    {...touch('brake')}
                    aria-label="ブレーキ"
                  >
                    BRAKE
                  </button>
                </div>
              </div>
              <div className="sk-keyboard-hint">
                ↑ アクセル <span>← → ハンドル</span> SPACE ドリフト{' '}
                <span>E アイテム</span> P ポーズ
              </div>
            </>
          )}
        </>
      )}

      {phase === 'paused' && !help && (
        <div className="sk-modal-shade">
          <div className="sk-dialog sk-pause">
            <span className="sk-eyebrow">TAKE A PIT STOP</span>
            <h2>PAUSED</h2>
            <p>ひと休み。レースはここで待っています。</p>
            <button className="sk-primary" onClick={resume}>
              <Play size={18} />
              レースにもどる
            </button>
            <button
              className="sk-secondary"
              onClick={() => start(course, round, false)}
            >
              <RotateCcw size={16} />
              このレースをやり直す
            </button>
            <button className="sk-text-button" onClick={showGarage}>
              ガレージに戻る
            </button>
          </div>
        </div>
      )}

      {phase === 'results' && (
        <div className="sk-modal-shade">
          <div className="sk-dialog sk-results">
            <span className="sk-eyebrow">
              {current.mode === 'gp'
                ? `GRAND PRIX · ROUND ${round + 1} / 4`
                : 'THE CHECKERED FLAG'}
            </span>
            <h2>{player.rank === 1 ? 'VICTORY!' : 'FINISH!'}</h2>
            <p>
              {current.track.name} <span>·</span> {current.cc}cc
            </p>
            <div className="sk-result-hero">
              <Avatar driver={driver} size={85} />
              <div>
                <b>
                  {player.rank}
                  <small>位</small>
                </b>
                <strong>{formatTime(player.finishTime)}</strong>
                {newBest && <span className="sk-best">NEW PERSONAL BEST</span>}
              </div>
            </div>
            <div className="sk-result-columns">
              <div className="sk-rank-list">
                {sorted.map((k) => (
                  <div key={k.id} className={k.id === 0 ? 'sk-you' : ''}>
                    <span>{k.rank}</span>
                    <i style={{ background: DRIVERS[k.driver].color }} />
                    <b>{DRIVERS[k.driver].name}</b>
                    <small>
                      {current.mode === 'gp'
                        ? `+${POINTS[k.rank - 1]} PTS`
                        : k.id === 0
                          ? 'YOU'
                          : 'CPU'}
                    </small>
                  </div>
                ))}
              </div>
              <div className="sk-lap-list">
                <span className="sk-label">LAP TIMES</span>
                {player.lapTimes.map((time, i) => (
                  <div key={i}>
                    <span>LAP {i + 1}</span>
                    <b>{formatTime(time)}</b>
                  </div>
                ))}
                {current.mode === 'gp' && (
                  <p>
                    総合 {standing} 位 <b>{scores[driver]} PTS</b>
                  </p>
                )}
              </div>
            </div>
            {!persisted && (
              <p className="sk-storage-note">
                ブラウザの保存が利用できないため、記録はこの画面を開いている間のみ保持されます。
              </p>
            )}
            <div className="sk-result-actions">
              {current.mode === 'gp' ? (
                <button
                  className="sk-primary"
                  onClick={() =>
                    round < 3
                      ? start(round + 1, round + 1, false)
                      : changePhase('podium')
                  }
                >
                  {round < 3 ? '次のレースへ' : '表彰台へ'}
                  <ChevronRight size={18} />
                </button>
              ) : (
                <button className="sk-primary" onClick={() => start(course)}>
                  <RotateCcw size={17} />
                  もう一度走る
                </button>
              )}
              <button className="sk-secondary" onClick={showGarage}>
                ガレージに戻る
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === 'podium' && (
        <div className="sk-modal-shade">
          <div className="sk-dialog sk-podium">
            <Trophy className="sk-trophy" size={50} />
            <span className="sk-eyebrow">16-BIT GRAND PRIX COMPLETE</span>
            <h2>{standing === 1 ? 'CHAMPION!' : 'NICE RACING!'}</h2>
            <p>
              4つのコースを走り切った！ 総合 {standing} 位 / {scores[driver]}{' '}
              PTS
            </p>
            <div className="sk-podium-steps">
              {[cup[1], cup[0], cup[2]].map((d, i) => (
                <div
                  key={d.id}
                  className={`sk-podium-place sk-place-${[2, 1, 3][i]}`}
                >
                  <Avatar driver={d.id} size={70} />
                  <b>{d.name}</b>
                  <span>
                    {[2, 1, 3][i]}
                    <small>{d.points} PTS</small>
                  </span>
                </div>
              ))}
            </div>
            <button className="sk-primary" onClick={showGarage}>
              ガレージに戻る <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {help && (
        <div className="sk-modal-shade">
          <div
            className="sk-dialog sk-help"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sk-help-title"
          >
            <button
              className="sk-help-close sk-icon"
              aria-label="遊び方を閉じる"
              onClick={() => setHelp(false)}
            >
              <X size={20} />
            </button>
            <span className="sk-eyebrow">A LITTLE GUIDE TO BIG WINS</span>
            <h2 id="sk-help-title">走り方のヒント</h2>
            <div className="sk-help-controls">
              <div>
                <kbd>↑ W</kbd>
                <span>アクセル</span>
              </div>
              <div>
                <kbd>← → A D</kbd>
                <span>ハンドル</span>
              </div>
              <div>
                <kbd>↓ S</kbd>
                <span>ブレーキ</span>
              </div>
              <div>
                <kbd>SPACE / SHIFT</kbd>
                <span>ドリフト</span>
              </div>
              <div>
                <kbd>E / X / ENTER</kbd>
                <span>アイテム</span>
              </div>
              <div>
                <kbd>P / ESC</kbd>
                <span>一時停止・再開</span>
              </div>
            </div>
            <p>
              <b>ミニターボ：</b>
              ハンドルを切りながらドリフトを押し続け、青い火花が出たら離すと加速。オレンジまで溜めるとさらに強力！
            </p>
            <p>
              <b>ロケットスタート：</b>
              カウント「1」でアクセルを押しはじめると、スタート直後に加速できます。
            </p>
            <p>
              <b>コイン：</b>
              10枚まで最高速度がアップ。コース外では減速し、遠くに落ちると自動でコースに戻ります。
            </p>
            <div className="sk-item-guide">
              {Object.values(ITEMS).map((item) => (
                <div key={item.name}>
                  <b>{item.icon}</b>
                  <span>
                    {item.name}
                    <small>{item.help}</small>
                  </span>
                </div>
              ))}
            </div>
            <p>
              スマートフォンは画面下のボタンで操作できます。ガレージの「オートアクセル」を使うと、ハンドル操作に集中できます。
            </p>
            <button className="sk-primary" onClick={() => setHelp(false)}>
              準備OK <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
  return isFullscreen ? createPortal(content, document.body) : content;
}

// Kept separate to keep the frame callback small and the engine testable without a browser.
import { stepRace as step } from './superkart/engine';
