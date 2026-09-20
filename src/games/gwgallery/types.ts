// GAME&WATCH GALLERY 型定義

export type GwGameId = 'manhole' | 'octopus' | 'fire' | 'oilpanic';

export type GameDifficulty = 'gameA' | 'gameB';

export type ScreenMode = 'classic' | 'modern';

export interface GwGameScore {
  gameA: number;
  gameB: number;
}

export interface GwHighScores {
  manhole: GwGameScore;
  octopus: GwGameScore;
  fire: GwGameScore;
  oilpanic: GwGameScore;
}

export interface GwCommonGameProps {
  difficulty: GameDifficulty;
  screenMode: ScreenMode;
  isFullscreen: boolean;
  onGameOver: (score: number) => void;
  onBackToMenu: () => void;
  onScoreChange: (score: number) => void;
  onMissChange: (misses: number) => void;
  isPaused: boolean;
  onTogglePause: () => void;
  onRestart: () => void;
  onToggleScreenMode: () => void;
  onChangeDifficulty: (diff: GameDifficulty) => void;
}
