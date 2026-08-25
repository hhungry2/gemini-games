export type GameId =
  | 'tetris'
  | 'minesweeper'
  | 'bros'
  | 'shooter'
  | 'breakout'
  | 'game2048'
  | 'doteater'
  | 'pong';

export interface GameInfo {
  id: GameId;
  title: string;
  titleEn: string;
  description: string;
  badge: string;
  iconName: string;
  color: string;
  tags: string[];
}
