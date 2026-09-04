import { Relic, HeroClass } from './types';

export const RELICS_DATABASE: Record<string, Omit<Relic, 'id'>> = {
  // スターター
  burning_blood: {
    name: '紅蓮の心臓',
    description: '戦闘終了時、HPを 6 回復する。',
    icon: '🩸',
    rarity: 'starter',
  },
  ring_of_snake: {
    name: '毒蛇の指輪',
    description: '戦闘開始の最初のターン、カードを追加で 2 枚引く。',
    icon: '🐍',
    rarity: 'starter',
  },
  cracked_core: {
    name: '共鳴コア',
    description: '戦闘開始時、電撃オーブを 1 個生成する。',
    icon: '⚡',
    rarity: 'starter',
  },

  // コモン・アンコモン・レア
  vajra: {
    name: '金剛杵 (ヴァジュラ)',
    description: '戦闘開始時、筋力を 1 得る。',
    icon: '🗡️',
    rarity: 'common',
    price: 150,
  },
  smooth_stone: {
    name: '滑らかな小石',
    description: '戦闘開始時、敏捷性を 1 得る。',
    icon: '🪨',
    rarity: 'common',
    price: 150,
  },
  anchor: {
    name: '重錨 (アンカー)',
    description: '戦闘の最初のターン開始時、10 ブロックを得る。',
    icon: '⚓',
    rarity: 'common',
    price: 160,
  },
  bag_of_marbles: {
    name: 'ビー玉の袋',
    description: '戦闘開始時、すべての敵に脆弱 1 を付与する。',
    icon: '🔮',
    rarity: 'uncommon',
    price: 200,
  },
  orichalcum: {
    name: 'オリハルコン',
    description: 'ターン終了時、ブロックが 0 の場合、6 ブロックを得る。',
    icon: '🛡️',
    rarity: 'common',
    price: 150,
  },
  lantern: {
    name: 'ランタン',
    description: '戦闘開始の最初のターン、エナジー +1 を得る。',
    icon: '🏮',
    rarity: 'common',
    price: 160,
  },
  blood_vial: {
    name: '血液の小瓶',
    description: '戦闘開始時、HPを 2 回復する。',
    icon: '🧪',
    rarity: 'common',
    price: 140,
  },
  meat_on_bone: {
    name: '骨付き肉',
    description: '戦闘終了時、HPが 50% 以下の場合、HPを 12 回復する。',
    icon: '🍖',
    rarity: 'uncommon',
    price: 220,
  },
  preserved_insect: {
    name: '昆虫の標本',
    description: 'エリート敵の最大HPが 25% 減少する。',
    icon: '🦗',
    rarity: 'rare',
    price: 250,
  },
};

export function getStarterRelic(heroClass: HeroClass): Relic {
  let key = 'burning_blood';
  if (heroClass === 'rogue') key = 'ring_of_snake';
  if (heroClass === 'mage') key = 'cracked_core';

  return {
    id: key,
    ...RELICS_DATABASE[key],
  };
}

export function getRandomRelic(existingRelics: Relic[]): Relic {
  const existingIds = new Set(existingRelics.map((r) => r.id));
  const availableKeys = Object.keys(RELICS_DATABASE).filter(
    (k) => !existingIds.has(k) && RELICS_DATABASE[k].rarity !== 'starter'
  );

  if (availableKeys.length === 0) {
    // 予備
    return {
      id: `gold_coin_${Date.now()}`,
      name: '黄金のコイン',
      description: '所持ゴールドが少し増える。',
      icon: '🪙',
      rarity: 'common',
    };
  }

  const pickedKey =
    availableKeys[Math.floor(Math.random() * availableKeys.length)];
  return {
    id: pickedKey,
    ...RELICS_DATABASE[pickedKey],
  };
}
