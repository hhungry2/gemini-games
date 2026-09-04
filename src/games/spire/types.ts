// Slay the Spire クローン: スパイア・オブ・フェイト (Spire of Fate) 型定義

export type HeroClass = 'warrior' | 'rogue' | 'mage';

export type CardType = 'attack' | 'skill' | 'power' | 'curse' | 'status';
export type CardRarity = 'basic' | 'common' | 'uncommon' | 'rare';
export type CardTarget = 'enemy' | 'all_enemies' | 'self' | 'none';

export interface Card {
  id: string;
  name: string;
  cost: number;
  type: CardType;
  rarity: CardRarity;
  target: CardTarget;
  description: string;
  upgraded: boolean;
  upgradeName?: string;
  class: HeroClass | 'neutral';
  // 効果パラメータ
  damage?: number;
  block?: number;
  hits?: number;
  draw?: number;
  energy?: number;
  strength?: number;
  dexterity?: number;
  vulnerable?: number;
  weak?: number;
  poison?: number;
  metallicize?: number;
  thorns?: number;
  focus?: number;
  orbChannel?: OrbType;
  evokeOrbs?: number;
  exhaust?: boolean;
  ethereal?: boolean;
}

export type OrbType = 'lightning' | 'frost' | 'dark';

export interface OrbInstance {
  type: OrbType;
  passiveVal: number;
  evokeVal: number;
}

export interface StatusEffects {
  strength: number;
  dexterity: number;
  vulnerable: number; // 残りターン
  weak: number; // 残りターン
  poison: number; // ターン終了時被ダメージ
  metallicize: number; // ターン終了時自動ブロック
  thorns: number; // 被ダメ時反射
  focus: number; // オーブ強化 (メイジ専用)
  intangible?: number; // 被ダメージ1にする (無形)
  ritual?: number; // ターン終了時に筋力+X (カルティスト用)
}

export type IntentType =
  | 'attack'
  | 'attack_buff'
  | 'attack_debuff'
  | 'defend'
  | 'buff'
  | 'debuff'
  | 'defend_buff'
  | 'special';

export interface EnemyIntent {
  type: IntentType;
  damage?: number;
  hits?: number;
  block?: number;
  description: string;
  vulnerable?: number;
  weak?: number;
  strength?: number;
  poison?: number;
}

export interface Enemy {
  id: string;
  instanceId: string;
  name: string;
  maxHp: number;
  hp: number;
  block: number;
  statuses: StatusEffects;
  intents: EnemyIntent[];
  currentIntentIndex: number;
  isBoss?: boolean;
  isElite?: boolean;
  color: string;
  avatarIcon: string;
}

export interface Relic {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'starter' | 'common' | 'uncommon' | 'rare' | 'boss';
  price?: number;
  counter?: number;
}

export interface Potion {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  rarity: 'common' | 'uncommon' | 'rare';
  price?: number;
  target: CardTarget;
  effect: {
    heal?: number;
    damage?: number;
    block?: number;
    strength?: number;
    draw?: number;
    energy?: number;
    poison?: number;
    vulnerable?: number;
    weak?: number;
  };
}

export type NodeType =
  | 'monster'
  | 'elite'
  | 'event'
  | 'rest'
  | 'shop'
  | 'treasure'
  | 'boss';

export interface MapNode {
  id: string;
  floor: number;
  lane: number; // 0, 1, 2, 3 などの横位置
  type: NodeType;
  nextNodes: string[]; // 接続先ノードIDリスト
  visited: boolean;
  available: boolean;
}

export interface EventOption {
  text: string;
  description: string;
  disabled?: boolean;
  outcome: (state: GameStateModifier) => string; // 選択後の結果テキスト
}

export interface SpireEvent {
  id: string;
  title: string;
  description: string;
  imageIcon: string;
  options: EventOption[];
}

export interface GameStateModifier {
  hp: number;
  maxHp: number;
  gold: number;
  deck: Card[];
  relics: Relic[];
  potions: (Potion | null)[];
}

export type GamePhase =
  | 'class_select'
  | 'map'
  | 'battle'
  | 'battle_rewards'
  | 'shop'
  | 'rest'
  | 'event'
  | 'treasure'
  | 'game_over'
  | 'victory';

export interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  opacity: number;
}

export interface BattleFx {
  id: string;
  type: 'slash' | 'shield' | 'fire' | 'lightning' | 'poison' | 'buff';
  target: 'player' | string; // プレイヤー または enemy instanceId
  createdAt: number;
}

export interface BattleReward {
  gold: number;
  cards: Card[];
  relic?: Relic;
  potion?: Potion;
}
