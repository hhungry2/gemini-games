export type Faction = 'player' | 'enemy';

export type TerrainType = 'plain' | 'forest' | 'mountain' | 'base' | 'sea';

export interface TerrainInfo {
  type: TerrainType;
  name: string;
  defenseMod: number; // 例: 0.1 (10%)
  evadeMod: number;   // 例: 0.1 (10%)
  moveCost: {
    ground: number;
    flight: number;
  };
  healRate?: number;  // 基地などのターン開始時回復率 (例: 0.15)
  color: string;
}

export type WeaponType = 'melee' | 'beam' | 'missile' | 'special';

export interface Weapon {
  id: string;
  name: string;
  power: number;
  basePower?: number; // 改造計算用の基礎威力
  minRange: number;
  maxRange: number;
  accuracyMod: number; // 命中補正 (%単位, 例: +10, -5)
  critMod: number;     // クリティカル補正 (%単位)
  enCost: number;
  moraleReq: number;   // 必要気力 (100〜140)
  postMove: boolean;   // 移動後攻撃可能か
  type: WeaponType;
  description: string;
  animationKey: 'punch' | 'slash' | 'rifle' | 'cannon' | 'nova' | 'missile' | 'darkness';
}

export type SpiritType =
  | 'hotBlood'  // 熱血: 次回与ダメ2.0倍
  | 'flash'     // ひらめき: 次回被弾を100%回避
  | 'sureHit'   // 必中: 次回攻撃の命中率100%
  | 'ironWall'  // 鉄壁: 1ターンの間被ダメ1/4
  | 'focus'     // 集中: 1ターンの間命中・回避+30%
  | 'accel'     // 加速: 1ターンの間移動力+3
  | 'guts'      // 根性: 自機HP30%回復
  | 'greatGuts' // ド根性: 自機HP全快
  | 'moraleUp'  // 気合: 気力+10
  | 'fortune'   // 幸運: 次回敵撃破時の獲得資金2倍
  | 'cheer'     // 応援: 指定味方の獲得EXP2倍
  | 'bless'     // 祝福: 指定味方の次回獲得資金2倍
  | 'trust';    // 信頼: 指定味方のHP50%回復

export interface SpiritCommand {
  id: SpiritType;
  name: string;
  spCost: number;
  description: string;
  icon: string;
}

export interface SpiritBuffs {
  hotBlood?: boolean;
  flash?: boolean;
  sureHit?: boolean;
  ironWall?: boolean;
  focus?: boolean;
  accel?: boolean;
  fortune?: boolean;
}

export interface UnitUpgrades {
  hp: number;        // 0-10段階
  en: number;        // 0-10段階
  armor: number;     // 0-10段階
  mobility: number;  // 0-10段階
  weapons: number;   // 0-10段階
}

export interface Pilot {
  name: string;
  callsign: string;
  portrait: string; // アバターアイコン/絵文字
  color: string;
  meleeSkill: number;    // 格闘能力
  shootingSkill: number; // 射撃能力
  defenseSkill: number;  // 防御能力
  evadeSkill: number;    // 回避能力
  hitSkill: number;      // 命中能力
  spirits: SpiritType[];
  lines: {
    attack: string[];
    damaged: string[];
    evade: string[];
    destroy: string[];
    win: string[];
  };
}

export interface Unit {
  id: string;
  mechName: string;
  pilot: Pilot;
  faction: Faction;
  isBoss?: boolean;
  icon: string;
  themeColor: string;
  
  // 基本ステータス（改造前ベース）
  baseHp: number;
  baseEn: number;
  baseArmor: number;
  baseMobility: number;
  baseMove: number;
  
  // 改造状態
  upgrades: UnitUpgrades;
  
  // 現在ステータス
  hp: number;
  maxHp: number;
  en: number;
  maxEn: number;
  armor: number;
  mobility: number;
  move: number;
  
  morale: number; // 気力 (通常 100〜150)
  sp: number;
  maxSp: number;
  level: number;
  exp: number;
  
  // 装備武器
  weapons: Weapon[];
  
  // マップ座標と状態
  x: number;
  y: number;
  hasMoved: boolean;
  hasActed: boolean;
  activeBuffs: SpiritBuffs;
  
  // 特殊機能
  canRepair?: boolean; // 修理装置
  canResupply?: boolean; // 補給装置
}

export interface DialogMessage {
  speaker: string;
  portrait: string;
  text: string;
  side: 'left' | 'right';
  themeColor: string;
}

export interface StageData {
  stageNumber: number;
  title: string;
  subtitle: string;
  description: string;
  mapWidth: number;
  mapHeight: number;
  terrainGrid: TerrainType[][];
  playerUnits: { unitId: string; x: number; y: number }[];
  enemyUnits: { unitId: string; x: number; y: number }[];
  victoryConditions: string[];
  defeatConditions: string[];
  openingDialog?: DialogMessage[];
  endingDialog?: DialogMessage[];
  reinforcements?: {
    turn: number;
    enemies?: { unitId: string; x: number; y: number }[];
    dialog?: DialogMessage[];
  }[];
}

export type GamePhase =
  | 'dialog'         // 会話イベント中
  | 'player_phase'   // 味方行動ターン
  | 'enemy_phase'    // 敵行動ターン
  | 'combat_prep'    // 戦闘予測・確認ウィンドウ
  | 'battle'         // 戦闘アニメーション演出
  | 'intermission'   // ステージ間インターミッション（改造・育成）
  | 'game_over'      // 作戦失敗
  | 'stage_clear'    // ステージクリア演出
  | 'all_clear';     // 全ステージ制覇

export interface CombatAction {
  attacker: Unit;
  defender: Unit;
  weapon: Weapon;
  counterWeapon?: Weapon;
  defenderAction: 'counter' | 'defend' | 'evade';
  attackerHitChance: number;
  attackerEstimatedDamage: number;
  defenderHitChance: number;
  defenderEstimatedDamage: number;
  isCounter: boolean;
}

export interface BattleResult {
  attackerHit: boolean;
  attackerCrit: boolean;
  attackerDamage: number;
  defenderDied: boolean;
  
  defenderHit?: boolean;
  defenderCrit?: boolean;
  defenderDamage?: number;
  attackerDied?: boolean;
  
  expGained: number;
  fundsGained: number;
}
