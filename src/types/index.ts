export type GameId = 'detective' | 'wordchain' | 'adventure';

export interface GameInfo {
  id: GameId;
  title: string;
  titleEn: string;
  description: string;
  badge: string;
  iconName: string;
  color: string;
}

export interface ChatMessage {
  role: 'user' | 'model' | 'system';
  text: string;
  timestamp: number;
}
