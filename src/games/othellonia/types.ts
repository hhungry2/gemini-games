export type ElementAttribute = 'god' | 'demon' | 'dragon';

export type PieceRarity = 'S+' | 'S' | 'A';

export type SkillTriggerCondition =
  | { type: 'always' }
  | { type: 'flip_count'; minFlips: number }
  | { type: 'hp_lte'; percent: number }
  | { type: 'board_element_count'; attribute: ElementAttribute; minCount: number }
  | { type: 'turn_gte'; minTurn: number };

export type SkillEffectType =
  | 'special_damage' // 特殊ダメージ (ATK比例または固定または割合)
  | 'poison'         // 相手に継続毒
  | 'trap'           // 罠・カウンター (攻撃受弾時やひっくり返された時に反撃)
  | 'heal'           // HP回復
  | 'buff'           // 攻撃力バフ
  | 'pierce'         // 貫通 (罠や防御を無視)
  | 'drain'          // 吸収 (ダメージを与え、与えた分回復)
  | 'curse';         // 呪い (相手の手駒に呪いをかけ毎ターンダメージ)

export interface Skill {
  name: string;
  description: string;
  effectType: SkillEffectType;
  condition: SkillTriggerCondition;
  power: number;         // 倍率(例: 1.8 = 1.8倍) または 固定値(例: 1500) または 割合(例: 15 = 15%)
  extraValue?: number;   // 追加値 (例: 毒のターン数や割合)
}

export interface ComboSkill {
  name: string;
  description: string;
  effectType: SkillEffectType;
  condition: SkillTriggerCondition;
  power: number;
  extraValue?: number;
}

export interface LeaderSkill {
  name: string;
  description: string;
  // リーダーオーラ: 手駒にある時、毎ターンまたは常時発動する効果
  effectType: 'aura_atk' | 'aura_hp_regen' | 'aura_poison_boost' | 'aura_all_stat';
  power: number; // 例: 1.2 = 攻撃1.2倍, 400 = 毎ターン400回復
}

export interface OthelloniaPiece {
  id: string;
  name: string;
  title: string;          // 二つ名 (例: 「天穹の大天使」)
  attribute: ElementAttribute;
  rarity: PieceRarity;
  hp: number;
  atk: number;
  skill: Skill;
  comboSkill?: ComboSkill;
  leaderSkill?: LeaderSkill;
  iconBg: string;         // グラデーションクラス
  avatarSvg: string;      // アイコン用SVG識別子
  flavorText: string;     // キャラ背景やセリフ
}

export type CellGimmick = 'none' | 'heal' | 'damage' | 'buff' | 'block';

export interface BoardCell {
  x: number; // 0..5
  y: number; // 0..5
  owner: 'player' | 'enemy' | null;
  piece: OthelloniaPiece | null;
  gimmick: CellGimmick;
  // 罠が仕掛けられているか
  trap?: {
    owner: 'player' | 'enemy';
    damageRatio: number; // 受けた通常ダメージの倍率で返す
    fixedDamage?: number; // 固定追加ダメージ
    sourcePieceName: string;
  };
  flipsThisTurn?: boolean;
  justPlaced?: boolean;
}

export type Difficulty = 'easy' | 'normal' | 'hard' | 'nightmare';

export type GameMode = 'quest' | 'cpu' | 'pvp' | 'deck_builder';

export interface StageInfo {
  id: number;
  name: string;
  subtitle: string;
  bossName: string;
  bossTitle: string;
  bossAttribute: ElementAttribute;
  bossDeck: OthelloniaPiece[];
  bossLeader: OthelloniaPiece;
  bossHp: number;
  description: string;
  storyDialog: string;
  rewardExp: number;
  gimmicks?: { x: number; y: number; gimmick: CellGimmick }[];
  starConditions: [string, string, string]; // 例: クリア, 残HP50%以上, 10ターン以内
}

export interface DamageLog {
  id: string;
  turn: number;
  source: 'player' | 'enemy';
  actorName: string;
  normalDamage: number;
  specialDamage: number;
  poisonDamage: number;
  healAmount: number;
  flipsCount: number;
  comboPieceNames: string[];
  trapTriggered?: { by: 'player' | 'enemy'; damage: number; name: string };
  message: string;
}

export interface FloatingText {
  id: string;
  x: number; // 盤面上の座標 or 画面％
  y: number;
  text: string;
  type: 'damage' | 'special' | 'poison' | 'heal' | 'combo' | 'trap';
}

export interface CutinEffect {
  piece: OthelloniaPiece;
  skillName: string;
  skillType: string;
  isCombo?: boolean;
  playerSide: 'player' | 'enemy';
}
