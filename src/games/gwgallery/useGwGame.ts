import { useCallback, useEffect, useRef, useState } from 'react';
import { canPlay, finishTransition } from './engine';
import type { SessionState } from './engine';
import type { GameDifficulty, GwGameId } from './types';
import { readBest, saveBest } from './storage';
import { gwSound } from './sound';

/** Commit one complete tick/input at a time; React updater functions stay pure. */
export function useGwGame<S extends SessionState>(
  game: GwGameId,
  difficulty: GameDifficulty,
  isPaused: boolean,
  create: () => S,
  tick: (state: S, difficulty: GameDifficulty) => S,
  speed: (score: number) => number,
  onGameOver: (score: number) => void,
) {
  const [state, setState] = useState(create);
  const stateRef = useRef(state);
  const pausedRef = useRef(isPaused);
  const [highScore, setHighScore] = useState(() => readBest(game, difficulty));
  const onGameOverRef = useRef(onGameOver);
  pausedRef.current = isPaused;
  onGameOverRef.current = onGameOver;

  const commit = useCallback((transition: (previous: S) => S) => {
    const previous = stateRef.current;
    const result = transition(previous);
    if (result === previous) return;
    const next = finishTransition(result);
    stateRef.current = next;
    setState(next);
    next.sounds.forEach(sound => gwSound[sound]());
    if (next.misses >= 3 && previous.misses < 3) {
      saveBest(game, difficulty, next.score);
      gwSound.gameOver();
      onGameOverRef.current(next.score);
    }
  }, [game, difficulty]);

  const act = useCallback((transition: (previous: S) => S) => {
    if (!pausedRef.current && canPlay(stateRef.current)) commit(transition);
  }, [commit]);

  const delay = state.recoveryMs || speed(state.score);
  useEffect(() => {
    if (isPaused || state.misses >= 3) return;
    const timer = window.setInterval(() => commit(previous => tick(previous, difficulty)), delay);
    return () => window.clearInterval(timer);
  }, [isPaused, state.misses, state.recoveryMs, delay, difficulty, tick, commit]);

  useEffect(() => {
    if (state.score > highScore) {
      setHighScore(state.score);
      saveBest(game, difficulty, state.score);
    }
  }, [state.score, highScore, game, difficulty]);

  return { state, act, highScore, blocked: isPaused || !canPlay(state) };
}
