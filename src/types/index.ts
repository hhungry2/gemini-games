export type GameId =
  | 'tetris'
  | 'minesweeper'
  | 'bros'
  | 'shooter'
  | 'breakout'
  | 'game2048'
  | 'doteater'
  | 'pong'
  | 'paperio'
  | 'angrybirds'
  | 'bomberman'
  | 'excitebike'
  | 'holeio'
  | 'jewel'
  | 'chiikawa'
  | 'spire'
  | 'cookie'
  | 'suika'
  | 'wario'
  | 'sonic';

export type GameGenre = 'action' | 'puzzle' | 'arcade' | 'racing' | 'io';

export interface GameInfo {
  id: GameId;
  title: string;
  titleEn: string;
  description: string;
  badge: string;
  iconName: string;
  color: string;
  genre: GameGenre;
  genres: GameGenre[];
  tags: string[];
}
