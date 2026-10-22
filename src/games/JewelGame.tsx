import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, Gem as GemIcon, Hammer, Lightbulb, Pause, Play, RotateCcw, Shuffle, Trophy, Undo2, Volume2, VolumeX, X } from 'lucide-react';
import { sound } from '../utils/audio';
import { COLORS, STAGES, cloneGame, createGame, findMove, shuffleGame, swapGems, tickGame, useHammer } from './jewel/engine';
import type { Board, Game, Gem, Mode, Turn } from './jewel/engine';
import './jewel/jewel.css';

export interface JewelGameProps { onBackToHub: () => void; isDark: boolean; isFullscreen?: boolean }
const HEX = ['#fb7185', '#67d4ff', '#53e4bc', '#f8d76b', '#c99aff', '#ffab69'];
const SHAPES = ['50,4 92,34 79,82 50,97 21,82 8,34', '50,3 95,50 50,97 5,50', '24,8 76,8 92,28 92,72 76,92 24,92 8,72 8,28', '50,4 96,83 4,83', '27,7 73,7 96,50 73,93 27,93 4,50', '25,6 75,6 95,35 82,80 50,95 18,80 5,35'];
const SPECIAL_LABEL = { row: '横一列', column: '縦一列', bomb: '爆弾', rainbow: 'レインボー' };
function readRecord(key: string) { try { const value = Number(localStorage.getItem(key)); return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0; } catch { return 0; } }
function storeRecord(key: string, value: number) { try { localStorage.setItem(key, String(Math.max(readRecord(key), value))); } catch { /* Storage is optional. */ } }
function Crystal({ gem }: { gem: Gem }) {
  return <svg viewBox="0 0 100 100" aria-hidden="true" className="jq-crystal" style={{ color: HEX[gem.color] }}>
    <polygon points={SHAPES[gem.color]} fill="currentColor" />
    <polygon points="50,14 76,32 68,68 50,82 29,65 25,32" fill="#fff" opacity=".16" />
    <polygon points="50,14 25,32 29,65 8,34" fill="#fff" opacity=".28" />
    <polygon points="50,82 68,68 86,72 50,95 18,80 29,65" fill="#061f37" opacity=".3" />
    <path d="M27 30 L45 17 M23 39 L22 44" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" opacity=".75" />
    {gem.special === 'row' && <path d="M15 50H85 M22 43L13 50L22 57 M78 43L87 50L78 57" stroke="white" strokeWidth="6" fill="none" />}
    {gem.special === 'column' && <path d="M50 15V85 M43 22L50 13L57 22 M43 78L50 87L57 78" stroke="white" strokeWidth="6" fill="none" />}
    {gem.special === 'bomb' && <><circle cx="50" cy="53" r="20" fill="#15334b" /><path d="M55 34L61 23L70 27" stroke="white" strokeWidth="5" fill="none" /><circle cx="70" cy="25" r="5" fill="#fff" /></>}
    {gem.special === 'rainbow' && <><circle cx="50" cy="50" r="25" fill="#fff" /><path d="M27 53 A23 23 0 0 1 73 53" fill="none" stroke="#fb7185" strokeWidth="9" /><path d="M35 53 A15 15 0 0 1 65 53" fill="none" stroke="#f8d76b" strokeWidth="7" /><path d="M42 53 A8 8 0 0 1 58 53" fill="none" stroke="#53e4bc" strokeWidth="6" /></>}
  </svg>;
}

export const JewelGame = ({ isDark, isFullscreen = false }: JewelGameProps) => {
  const [game, setGame] = useState(() => createGame('classic', 1, 123456));
  const gameRef = useRef(game);
  const [screen, setScreen] = useState<'menu' | 'playing' | 'paused' | 'result'>('menu');
  const screenRef = useRef(screen);
  const [mode, setMode] = useState<Mode>('classic');
  const [stage, setStage] = useState(1);
  const [selected, setSelected] = useState<number | null>(null);
  const [hint, setHint] = useState<number[]>([]);
  const [displayBoard, setDisplayBoard] = useState<Board | null>(null);
  const [cleared, setCleared] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [hammerActive, setHammerActive] = useState(false);
  const [notice, setNotice] = useState('隣り合う宝石を入れ替えて、3つそろえよう');
  const [muted, setMuted] = useState(sound.getMuted());
  const [record, setRecord] = useState(() => readRecord('jewel_quest_high_score_classic'));
  const history = useRef<Game[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const generation = useRef(0);
  const timers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const pointer = useRef<{ index: number; x: number; y: number; id: number } | null>(null);
  const boardArea = useRef<HTMLDivElement>(null);
  const [boardSize, setBoardSize] = useState(400);
  const commit = useCallback((next: Game) => { gameRef.current = next; setGame(next); }, []);
  const changeScreen = useCallback((next: typeof screen) => { screenRef.current = next; setScreen(next); }, []);
  const cancelAnimations = useCallback(() => {
    generation.current++; timers.current.forEach(clearTimeout); timers.current.clear();
    setDisplayBoard(null); setCleared([]); busyRef.current = false; setBusy(false);
  }, []);
  const save = useCallback((current: Game) => {
    const key = `jewel_quest_high_score_${current.mode}`;
    storeRecord(key, current.score); setRecord(readRecord(key));
    if (current.mode === 'mission' && current.status === 'won') storeRecord(`jewel_quest_stage_stars_${current.stage}`, current.moves >= 10 ? 3 : current.moves >= 5 ? 2 : 1);
  }, []);
  const start = (nextMode = mode, nextStage = stage) => {
    cancelAnimations(); history.current = []; setCanUndo(false); setSelected(null); setHint([]); setHammerActive(false);
    commit(createGame(nextMode, nextStage)); setMode(nextMode); setStage(nextStage);
    setRecord(readRecord(`jewel_quest_high_score_${nextMode}`));
    setNotice('3つで消す。4つで光線。5つでレインボー！'); changeScreen('playing'); sound.playJewelSelect();
  };
  useEffect(() => sound.subscribeMute(setMuted), []);
  useEffect(() => {
    const element = boardArea.current; if (!element) return;
    const resize = () => setBoardSize(Math.max(64, Math.floor(Math.min(element.clientWidth - 24, element.clientHeight - 20))));
    const observer = new ResizeObserver(resize); observer.observe(element); resize(); return () => observer.disconnect();
  }, [isFullscreen]);
  useEffect(() => {
    const pause = () => { if (screenRef.current === 'playing') changeScreen('paused'); };
    const visibility = () => { if (document.hidden) pause(); };
    const key = (event: KeyboardEvent) => {
      if (document.querySelector('[data-game-modal]')) return;
      if (event.code === 'Escape' || event.code === 'KeyP') {
        event.preventDefault();
        if (screenRef.current === 'playing') changeScreen('paused'); else if (screenRef.current === 'paused') changeScreen('playing');
      }
    };
    window.addEventListener('blur', pause); document.addEventListener('visibilitychange', visibility); window.addEventListener('keydown', key);
    window.addEventListener('games-hub:pause', pause);
    return () => { cancelAnimations(); window.removeEventListener('blur', pause); window.removeEventListener('games-hub:pause', pause); document.removeEventListener('visibilitychange', visibility); window.removeEventListener('keydown', key); };
  }, [cancelAnimations, changeScreen]);
  useEffect(() => {
    let last = performance.now();
    const timer = setInterval(() => {
      const now = performance.now(), dt = Math.min(0.3, (now - last) / 1000); last = now;
      if (screenRef.current !== 'playing' || gameRef.current.mode !== 'timeAttack') return;
      const next = tickGame(gameRef.current, dt); commit(next);
      if (next.status !== 'playing' && !busyRef.current) { save(next); changeScreen('result'); sound.playJewelGameOver(); }
    }, 100);
    return () => clearInterval(timer);
  }, [commit, changeScreen, save]);
  const animateTurn = (turn: Turn, before: Game) => {
    setSelected(null); setHint([]); setHammerActive(false);
    if (!turn.valid) { setNotice('3つ以上そろう場所へ入れ替えてね'); sound.playJewelInvalid(); return; }
    history.current = [...history.current.slice(-9), cloneGame(before)]; setCanUndo(true); busyRef.current = true; setBusy(true);
    const token = generation.current;
    const schedule = (callback: () => void, delay: number) => {
      const timer = setTimeout(() => { timers.current.delete(timer); callback(); }, delay); timers.current.add(timer);
    };
    const run = (i: number) => {
      if (token !== generation.current) return;
      if (screenRef.current === 'paused') { schedule(() => run(i), 100); return; }
      if (i < turn.frames.length) {
        const frame = turn.frames[i]; setDisplayBoard(frame.board); setCleared(frame.cleared);
        setNotice(`${frame.combo > 1 ? `${frame.combo} CHAIN!　` : ''}+${frame.points.toLocaleString()}`);
        sound.playJewelMatch(frame.combo); schedule(() => run(i + 1), 210);
      } else {
        if (turn.game.mode === 'timeAttack') turn.game.time = gameRef.current.time;
        const next = tickGame(turn.game, 0); commit(next); setDisplayBoard(null); setCleared([]); busyRef.current = false; setBusy(false); save(next);
        if (next.status !== 'playing') { changeScreen('result'); if (next.status === 'won') sound.playJewelClear(); else sound.playJewelGameOver(); }
        else if (turn.shuffled) setNotice('次の一手が見つかるように自動シャッフル！');
      }
    }; run(0);
  };
  const swap = (a: number, b: number) => {
    if (screenRef.current !== 'playing' || busyRef.current) return;
    const before = gameRef.current; animateTurn(swapGems(before, a, b), before);
  };
  const choose = (index: number) => {
    if (screenRef.current !== 'playing' || busyRef.current) return;
    if (hammerActive) { const before = gameRef.current; animateTurn(useHammer(before, index), before); return; }
    if (selected === null) { setSelected(index); sound.playJewelSelect(); }
    else if (selected === index) setSelected(null);
    else if (Math.abs(Math.floor(selected / 8) - Math.floor(index / 8)) + Math.abs(selected % 8 - index % 8) === 1) swap(selected, index);
    else setSelected(index);
  };
  const undo = () => {
    if (busyRef.current || !history.current.length) return;
    const previous = history.current.pop()!; if (previous.mode === 'timeAttack') previous.time = gameRef.current.time;
    commit(previous); setCanUndo(history.current.length > 0); setSelected(null); setHint([]); setHammerActive(false); setNotice('ひとつ前の手に戻しました');
  };
  const stageInfo = STAGES[game.stage - 1], goal = game.mode === 'mission' ? stageInfo.target : 5000;
  const board = displayBoard ?? game.board;
  return <div className={`jq-game ${isFullscreen ? 'jq-fullscreen' : ''}`} data-theme={isDark ? 'dark' : 'light'}>
    <header className="jq-header"><div className="jq-brand"><span className="jq-brand-icon"><GemIcon size={22} /></span><div><span className="jq-eyebrow">THE CRYSTAL COLLECTION</span><h1>JEWEL <span>QUEST</span></h1></div></div><div className="jq-header-actions"><span className="jq-best"><Trophy size={14} /> {record.toLocaleString()}</span><button aria-label={muted ? 'サウンドをオン' : 'サウンドをオフ'} onClick={() => sound.toggleMute()}>{muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>{screen === 'playing' && <button aria-label="一時停止" onClick={() => changeScreen('paused')}><Pause size={18} /></button>}{screen !== 'menu' && <button aria-label="タイトルに戻る" onClick={() => { cancelAnimations(); save(gameRef.current); changeScreen('menu'); }}><X size={18} /></button>}</div></header>
    <div className="jq-scorebar"><div><span>SCORE</span><strong>{game.score.toLocaleString().padStart(4, '0')}</strong></div><div className="jq-goal"><span>{game.mode === 'mission' ? `STAGE ${game.stage} · ${stageInfo.title}` : game.mode === 'timeAttack' ? '90秒 タイムアタック' : '30手 スコアチャレンジ'}</span><div className="jq-progress"><i style={{ width: `${Math.min(100, game.score / goal * 100)}%` }} /></div>{game.mode === 'mission' && <small>{COLORS[stageInfo.color]} {game.collected[stageInfo.color]} / {stageInfo.gems} ・ {game.score} / {goal} pts</small>}</div><div><span>{game.mode === 'timeAttack' ? 'TIME' : 'MOVES'}</span><strong className={game.mode === 'timeAttack' ? game.time < 15 ? 'jq-danger' : '' : game.moves < 5 ? 'jq-danger' : ''}>{game.mode === 'timeAttack' ? Math.ceil(game.time) : game.moves}<small>{game.mode === 'timeAttack' ? 's' : '手'}</small></strong></div></div>
    <div className="jq-board-area" ref={boardArea}><div className={`jq-board ${screen === 'menu' ? 'jq-board-preview' : ''}`} role="grid" aria-label="8×8の宝石盤" aria-busy={busy} style={{ width: boardSize, height: boardSize }}>
      {board.map((gem, index) => <button key={index} role="gridcell" className={`jq-cell ${selected === index ? 'jq-selected' : ''} ${hint.includes(index) ? 'jq-hint' : ''} ${cleared.includes(index) ? 'jq-cleared' : ''}`} aria-label={`${Math.floor(index / 8) + 1}行${index % 8 + 1}列 ${COLORS[gem.color]}${gem.special ? ` ${SPECIAL_LABEL[gem.special]}` : ''}`} aria-selected={selected === index} tabIndex={screen === 'playing' ? 0 : -1} disabled={screen !== 'playing' || busy}
        onPointerDown={e => { if (e.button !== 0 || busyRef.current) return; pointer.current = { index, x: e.clientX, y: e.clientY, id: e.pointerId }; e.currentTarget.setPointerCapture(e.pointerId); }}
        onPointerUp={e => { const p = pointer.current; pointer.current = null; if (!p || p.id !== e.pointerId) return; const dx = e.clientX - p.x, dy = e.clientY - p.y; if (Math.hypot(dx, dy) > Math.max(10, boardSize / 24) && !hammerActive) { const next = Math.abs(dx) > Math.abs(dy) ? p.index + Math.sign(dx) : p.index + Math.sign(dy) * 8; swap(p.index, next); } else choose(p.index); }}
        onPointerCancel={() => { pointer.current = null; }} onClick={e => { if (e.detail === 0) choose(index); }} onKeyDown={e => { const offset = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -8, ArrowDown: 8 }[e.key]; if (offset !== undefined) { e.preventDefault(); const next = index + offset; if (next >= 0 && next < 64 && (Math.abs(offset) === 8 || Math.floor(index / 8) === Math.floor(next / 8))) (e.currentTarget.parentElement?.children[next] as HTMLButtonElement)?.focus(); } }}><span key={gem.id} className="jq-gem-enter"><Crystal gem={gem} /></span></button>)}
    </div>
    {screen === 'menu' && <div className="jq-overlay"><section className="jq-menu"><div className="jq-menu-crystals"><Crystal gem={{ id: 0, color: 4 }} /><Crystal gem={{ id: 1, color: 1 }} /><Crystal gem={{ id: 2, color: 2 }} /></div><span className="jq-eyebrow">A LITTLE SPARK. A BIG CHAIN.</span><h2>ひらめきが、<br /><em>きらめきになる。</em></h2><p>宝石を入れ替えて、3つそろえる。<br />連鎖をつないで、自分だけのハイスコアへ。</p><div className="jq-modes">{([['classic', '30手', 'じっくり'], ['timeAttack', '90秒', 'すばやく'], ['mission', '冒険', '全5ステージ']] as const).map(([value, title, detail]) => <button key={value} onClick={() => { setMode(value); setRecord(readRecord(`jewel_quest_high_score_${value}`)); }} className={mode === value ? 'active' : ''}><strong>{title}</strong><small>{detail}</small></button>)}</div>{mode === 'mission' && <div className="jq-stage-select" aria-label="ステージ選択">{STAGES.map((s, i) => <button key={s.title} onClick={() => setStage(i + 1)} className={stage === i + 1 ? 'active' : ''}>{i + 1}<small>{'★'.repeat(Math.min(3, readRecord(`jewel_quest_stage_stars_${i + 1}`))) || '☆'}</small></button>)}</div>}<button className="jq-primary" onClick={() => start()}><Play size={17} fill="currentColor" />{mode === 'mission' ? `ステージ ${stage} をはじめる` : 'プレイする'}<ArrowRight size={18} /></button><span className="jq-menu-help">スワイプ / クリックで交換 · キーボードにも対応</span></section></div>}
    {screen === 'paused' && <div className="jq-overlay"><section className="jq-dialog"><Pause size={34} /><span className="jq-eyebrow">TAKE YOUR TIME</span><h2>ちょっと、ひと休み。</h2><p>準備ができたら、続きからどうぞ。</p><button className="jq-primary" onClick={() => changeScreen('playing')}><Play size={17} />つづける</button><button className="jq-secondary" onClick={() => start()}><RotateCcw size={16} />最初からやり直す</button><button className="jq-text-button" onClick={() => { cancelAnimations(); changeScreen('menu'); }}>タイトルに戻る</button></section></div>}
    {screen === 'result' && <div className="jq-overlay"><section className="jq-dialog"><span className="jq-result-icon">{game.status === 'won' ? <Check size={35} /> : <Trophy size={35} />}</span><span className="jq-eyebrow">{game.status === 'won' ? 'STAGE CLEAR' : 'NICE SPARKLE'}</span><h2>{game.status === 'won' ? '宝石の道が、ひらけた！' : game.mode === 'mission' ? 'もう一度、ひらめこう。' : 'きらめき、集まりました。'}</h2><strong className="jq-result-score">{game.score.toLocaleString()}<small> pts</small></strong><p>最大 {game.bestCombo} 連鎖 · ベスト {record.toLocaleString()} pts</p>{game.mode === 'mission' && <p>{COLORS[stageInfo.color]} {game.collected[stageInfo.color]} / {stageInfo.gems} · スコア {game.score} / {goal}</p>}<button className="jq-primary" onClick={() => game.status === 'won' && game.stage < 5 ? start('mission', game.stage + 1) : start()}><RotateCcw size={17} />{game.status === 'won' && game.stage < 5 ? '次のステージへ' : 'もう一度プレイ'}</button><button className="jq-text-button" onClick={() => changeScreen('menu')}>タイトルに戻る</button></section></div>}
    </div>
    <footer className="jq-footer"><div className="jq-notice" role="status" aria-live="polite">{screen === 'menu' ? '4つで光線 ↔　交差で爆弾 ✦　5つでレインボー ◉' : hammerActive ? 'ハンマーで消す宝石を選んでね（手数は消費しません）' : notice}</div><div className="jq-tools"><button disabled={screen !== 'playing' || busy} onClick={() => { const move = findMove(game.board); setHint(move ?? []); setNotice('光っている2つを入れ替えてみよう'); }}><Lightbulb size={17} /><span>ヒント</span></button><button className={hammerActive ? 'active' : ''} disabled={screen !== 'playing' || busy || !game.hammer} onClick={() => { setHammerActive(!hammerActive); setSelected(null); }}><Hammer size={17} /><span>ハンマー</span><b>{game.hammer}</b></button><button disabled={screen !== 'playing' || busy || !game.shuffles} onClick={() => { history.current.push(cloneGame(gameRef.current)); commit(shuffleGame(gameRef.current)); setCanUndo(true); setSelected(null); setHint([]); setHammerActive(false); setNotice('新しい並びから、次のひらめきを。'); sound.playJewelShuffle(); }}><Shuffle size={17} /><span>シャッフル</span><b>{game.shuffles}</b></button><button disabled={screen !== 'playing' || busy || !canUndo} onClick={undo}><Undo2 size={17} /><span>一手戻す</span></button></div></footer>
  </div>;
};
