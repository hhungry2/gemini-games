import { Card, HeroClass } from './types';

// 初期デッキ生成
export function getStarterDeck(heroClass: HeroClass): Card[] {
  const cards: Card[] = [];

  if (heroClass === 'warrior') {
    // ストライク5枚、防御4枚、強打1枚
    for (let i = 0; i < 5; i++) cards.push(createCard('strike_warrior'));
    for (let i = 0; i < 4; i++) cards.push(createCard('defend_warrior'));
    cards.push(createCard('bash'));
  } else if (heroClass === 'rogue') {
    // ストライク5枚、防御5枚、無力化1枚、サバイバー(準備)1枚
    for (let i = 0; i < 5; i++) cards.push(createCard('strike_rogue'));
    for (let i = 0; i < 5; i++) cards.push(createCard('defend_rogue'));
    cards.push(createCard('neutralize'));
    cards.push(createCard('survivor'));
  } else {
    // メイジ: ストライク4枚、防御4枚、ザップ1枚、デュアルキャスト1枚
    for (let i = 0; i < 4; i++) cards.push(createCard('strike_mage'));
    for (let i = 0; i < 4; i++) cards.push(createCard('defend_mage'));
    cards.push(createCard('zap'));
    cards.push(createCard('dualcast'));
  }

  return cards;
}

// カードのマスター定義テンプレート
interface CardTemplate {
  base: Omit<Card, 'id' | 'upgraded'>;
  upgraded: Partial<Card>;
}

export const CARD_TEMPLATES: Record<string, CardTemplate> = {
  // --- 共通・基本 ---
  strike_warrior: {
    base: {
      name: 'ストライク',
      cost: 1,
      type: 'attack',
      rarity: 'basic',
      target: 'enemy',
      class: 'warrior',
      damage: 6,
      description: '敵に 6 ダメージを与える。',
    },
    upgraded: {
      damage: 9,
      description: '敵に 9 ダメージを与える。',
    },
  },
  defend_warrior: {
    base: {
      name: '防御',
      cost: 1,
      type: 'skill',
      rarity: 'basic',
      target: 'self',
      class: 'warrior',
      block: 5,
      description: '5 ブロックを得る。',
    },
    upgraded: {
      block: 8,
      description: '8 ブロックを得る。',
    },
  },
  bash: {
    base: {
      name: '強打',
      cost: 2,
      type: 'attack',
      rarity: 'basic',
      target: 'enemy',
      class: 'warrior',
      damage: 8,
      vulnerable: 2,
      description: '8 ダメージを与え、脆弱 2 を付与する。',
    },
    upgraded: {
      damage: 10,
      vulnerable: 3,
      description: '10 ダメージを与え、脆弱 3 を付与する。',
    },
  },

  // --- ウォリアー追加カード ---
  anger: {
    base: {
      name: '怒り',
      cost: 0,
      type: 'attack',
      rarity: 'common',
      target: 'enemy',
      class: 'warrior',
      damage: 6,
      description: '6 ダメージ。このカードの複製を捨て札に加える。',
    },
    upgraded: {
      damage: 8,
      description: '8 ダメージ。このカードの複製を捨て札に加える。',
    },
  },
  iron_wave: {
    base: {
      name: 'アイアンウェーブ',
      cost: 1,
      type: 'attack',
      rarity: 'common',
      target: 'enemy',
      class: 'warrior',
      damage: 5,
      block: 5,
      description: '5 ダメージを与え、5 ブロックを得る。',
    },
    upgraded: {
      damage: 7,
      block: 7,
      description: '7 ダメージを与え、7 ブロックを得る。',
    },
  },
  cleave: {
    base: {
      name: 'なぎ払い',
      cost: 1,
      type: 'attack',
      rarity: 'common',
      target: 'all_enemies',
      class: 'warrior',
      damage: 8,
      description: '敵全体に 8 ダメージを与える。',
    },
    upgraded: {
      damage: 11,
      description: '敵全体に 11 ダメージを与える。',
    },
  },
  heavy_blade: {
    base: {
      name: 'ヘビーブレード',
      cost: 2,
      type: 'attack',
      rarity: 'common',
      target: 'enemy',
      class: 'warrior',
      damage: 14,
      description: '14 ダメージ。筋力の影響を 3 倍受ける。',
    },
    upgraded: {
      damage: 14,
      description: '14 ダメージ。筋力の影響を 5 倍受ける。',
    },
  },
  shrug_it_off: {
    base: {
      name: '受け流し',
      cost: 1,
      type: 'skill',
      rarity: 'common',
      target: 'self',
      class: 'warrior',
      block: 8,
      draw: 1,
      description: '8 ブロックを得る。カードを 1 枚引く。',
    },
    upgraded: {
      block: 11,
      description: '11 ブロックを得る。カードを 1 枚引く。',
    },
  },
  inflame: {
    base: {
      name: '発火',
      cost: 1,
      type: 'power',
      rarity: 'uncommon',
      target: 'self',
      class: 'warrior',
      strength: 2,
      description: '筋力を 2 得る。',
    },
    upgraded: {
      strength: 3,
      description: '筋力を 3 得る。',
    },
  },
  metallicize: {
    base: {
      name: '金属化',
      cost: 1,
      type: 'power',
      rarity: 'uncommon',
      target: 'self',
      class: 'warrior',
      metallicize: 3,
      description: 'ターン終了時、3 ブロックを得る。',
    },
    upgraded: {
      metallicize: 4,
      description: 'ターン終了時、4 ブロックを得る。',
    },
  },
  shockwave: {
    base: {
      name: '衝撃波',
      cost: 2,
      type: 'skill',
      rarity: 'uncommon',
      target: 'all_enemies',
      class: 'warrior',
      weak: 3,
      vulnerable: 3,
      exhaust: true,
      description: '敵全体に脱力 3 と脆弱 3 を付与。消滅。',
    },
    upgraded: {
      weak: 5,
      vulnerable: 5,
      description: '敵全体に脱力 5 と脆弱 5 を付与。消滅。',
    },
  },
  demon_form: {
    base: {
      name: '悪魔化',
      cost: 3,
      type: 'power',
      rarity: 'rare',
      target: 'self',
      class: 'warrior',
      description: 'ターン開始時、筋力 +2 を得る。',
    },
    upgraded: {
      description: 'ターン開始時、筋力 +3 を得る。',
    },
  },
  whirlwind: {
    base: {
      name: '旋風刃',
      cost: 1, // 簡易化: 1コストで全敵8ダメ+消費エナジー連動
      type: 'attack',
      rarity: 'uncommon',
      target: 'all_enemies',
      class: 'warrior',
      damage: 6,
      hits: 2,
      description: '敵全体に 6 ダメージを 2 回与える。',
    },
    upgraded: {
      damage: 8,
      hits: 2,
      description: '敵全体に 8 ダメージを 2 回与える。',
    },
  },

  // --- ローグ基本 ---
  strike_rogue: {
    base: {
      name: 'ストライク',
      cost: 1,
      type: 'attack',
      rarity: 'basic',
      target: 'enemy',
      class: 'rogue',
      damage: 6,
      description: '敵に 6 ダメージを与える。',
    },
    upgraded: {
      damage: 9,
      description: '敵に 9 ダメージを与える。',
    },
  },
  defend_rogue: {
    base: {
      name: '防御',
      cost: 1,
      type: 'skill',
      rarity: 'basic',
      target: 'self',
      class: 'rogue',
      block: 5,
      description: '5 ブロックを得る。',
    },
    upgraded: {
      block: 8,
      description: '8 ブロックを得る。',
    },
  },
  neutralize: {
    base: {
      name: '無力化',
      cost: 0,
      type: 'attack',
      rarity: 'basic',
      target: 'enemy',
      class: 'rogue',
      damage: 3,
      weak: 1,
      description: '3 ダメージを与え、脱力 1 を付与する。',
    },
    upgraded: {
      damage: 4,
      weak: 2,
      description: '4 ダメージを与え、脱力 2 を付与する。',
    },
  },
  survivor: {
    base: {
      name: 'サバイバー',
      cost: 1,
      type: 'skill',
      rarity: 'basic',
      target: 'self',
      class: 'rogue',
      block: 8,
      description: '8 ブロックを得る。',
    },
    upgraded: {
      block: 11,
      description: '11 ブロックを得る。',
    },
  },

  // --- ローグ追加カード ---
  shiv: {
    base: {
      name: 'シヴ',
      cost: 0,
      type: 'attack',
      rarity: 'common',
      target: 'enemy',
      class: 'rogue',
      damage: 4,
      exhaust: true,
      description: '4 ダメージ。消滅。',
    },
    upgraded: {
      damage: 6,
      description: '6 ダメージ。消滅。',
    },
  },
  blade_dance: {
    base: {
      name: '刃の舞',
      cost: 1,
      type: 'skill',
      rarity: 'common',
      target: 'self',
      class: 'rogue',
      description: 'シヴを 3 枚手札に加える。',
    },
    upgraded: {
      description: 'シヴを 4 枚手札に加える。',
    },
  },
  poisoned_stab: {
    base: {
      name: '毒刺し',
      cost: 1,
      type: 'attack',
      rarity: 'common',
      target: 'enemy',
      class: 'rogue',
      damage: 6,
      poison: 3,
      description: '6 ダメージを与え、毒 3 を付与する。',
    },
    upgraded: {
      damage: 8,
      poison: 4,
      description: '8 ダメージを与え、毒 4 を付与する。',
    },
  },
  bouncing_flask: {
    base: {
      name: 'バウンドフラスコ',
      cost: 2,
      type: 'skill',
      rarity: 'uncommon',
      target: 'enemy',
      class: 'rogue',
      poison: 9,
      description: '対象に 毒 9 を付与する。',
    },
    upgraded: {
      poison: 12,
      description: '対象に 毒 12 を付与する。',
    },
  },
  dagger_spray: {
    base: {
      name: '短剣の雨',
      cost: 1,
      type: 'attack',
      rarity: 'common',
      target: 'all_enemies',
      class: 'rogue',
      damage: 4,
      hits: 2,
      description: '敵全体に 4 ダメージを 2 回与える。',
    },
    upgraded: {
      damage: 6,
      hits: 2,
      description: '敵全体に 6 ダメージを 2 回与える。',
    },
  },
  backflip: {
    base: {
      name: 'バックフリップ',
      cost: 1,
      type: 'skill',
      rarity: 'common',
      target: 'self',
      class: 'rogue',
      block: 5,
      draw: 2,
      description: '5 ブロックを得る。カードを 2 枚引く。',
    },
    upgraded: {
      block: 8,
      draw: 2,
      description: '8 ブロックを得る。カードを 2 枚引く。',
    },
  },
  footwork: {
    base: {
      name: 'フットワーク',
      cost: 1,
      type: 'power',
      rarity: 'uncommon',
      target: 'self',
      class: 'rogue',
      dexterity: 2,
      description: '敏捷性を 2 得る。',
    },
    upgraded: {
      dexterity: 3,
      description: '敏捷性を 3 得る。',
    },
  },
  deadly_poison: {
    base: {
      name: '猛毒',
      cost: 1,
      type: 'skill',
      rarity: 'common',
      target: 'enemy',
      class: 'rogue',
      poison: 5,
      description: '対象に 毒 5 を付与する。',
    },
    upgraded: {
      poison: 7,
      description: '対象に 毒 7 を付与する。',
    },
  },
  adrenaline: {
    base: {
      name: 'アドレナリン',
      cost: 0,
      type: 'skill',
      rarity: 'rare',
      target: 'self',
      class: 'rogue',
      energy: 1,
      draw: 2,
      exhaust: true,
      description: '1 エナジーを得る。カードを 2 枚引く。消滅。',
    },
    upgraded: {
      energy: 2,
      draw: 2,
      description: '2 エナジーを得る。カードを 2 枚引く。消滅。',
    },
  },

  // --- メイジ基本 ---
  strike_mage: {
    base: {
      name: 'ストライク',
      cost: 1,
      type: 'attack',
      rarity: 'basic',
      target: 'enemy',
      class: 'mage',
      damage: 6,
      description: '敵に 6 ダメージを与える。',
    },
    upgraded: {
      damage: 9,
      description: '敵に 9 ダメージを与える。',
    },
  },
  defend_mage: {
    base: {
      name: '防御',
      cost: 1,
      type: 'skill',
      rarity: 'basic',
      target: 'self',
      class: 'mage',
      block: 5,
      description: '5 ブロックを得る。',
    },
    upgraded: {
      block: 8,
      description: '8 ブロックを得る。',
    },
  },
  zap: {
    base: {
      name: 'ザップ',
      cost: 1,
      type: 'skill',
      rarity: 'basic',
      target: 'self',
      class: 'mage',
      orbChannel: 'lightning',
      description: '電撃オーブを 1 個生成する。',
    },
    upgraded: {
      cost: 0,
      description: '電撃オーブを 1 個生成する。',
    },
  },
  dualcast: {
    base: {
      name: 'デュアルキャスト',
      cost: 1,
      type: 'skill',
      rarity: 'basic',
      target: 'self',
      class: 'mage',
      evokeOrbs: 2,
      description: '先頭のオーブを 2 回解放(Evoke)する。',
    },
    upgraded: {
      cost: 0,
      description: '先頭のオーブを 2 回解放(Evoke)する。',
    },
  },

  // --- メイジ追加カード ---
  ball_lightning: {
    base: {
      name: 'ボールライトニング',
      cost: 1,
      type: 'attack',
      rarity: 'common',
      target: 'enemy',
      class: 'mage',
      damage: 7,
      orbChannel: 'lightning',
      description: '7 ダメージを与え、電撃オーブを 1 個生成する。',
    },
    upgraded: {
      damage: 10,
      description: '10 ダメージを与え、電撃オーブを 1 個生成する。',
    },
  },
  cold_snap: {
    base: {
      name: '寒気(コールドスナップ)',
      cost: 1,
      type: 'attack',
      rarity: 'common',
      target: 'enemy',
      class: 'mage',
      damage: 6,
      orbChannel: 'frost',
      description: '6 ダメージを与え、氷結オーブを 1 個生成する。',
    },
    upgraded: {
      damage: 9,
      description: '9 ダメージを与え、氷結オーブを 1 個生成する。',
    },
  },
  darkness: {
    base: {
      name: '暗黒',
      cost: 1,
      type: 'skill',
      rarity: 'uncommon',
      target: 'self',
      class: 'mage',
      orbChannel: 'dark',
      description: '暗黒オーブを 1 個生成する。',
    },
    upgraded: {
      cost: 0,
      description: '暗黒オーブを 1 個生成する。',
    },
  },
  charge_battery: {
    base: {
      name: '充電',
      cost: 1,
      type: 'skill',
      rarity: 'common',
      target: 'self',
      class: 'mage',
      block: 7,
      energy: 1,
      description: '7 ブロックを得る。次のターン、エナジー +1。',
    },
    upgraded: {
      block: 10,
      description: '10 ブロックを得る。次のターン、エナジー +1。',
    },
  },
  defragment: {
    base: {
      name: 'デフラグ',
      cost: 1,
      type: 'power',
      rarity: 'uncommon',
      target: 'self',
      class: 'mage',
      focus: 1,
      description: '集中力(オーブの威力) +1 を得る。',
    },
    upgraded: {
      focus: 2,
      description: '集中力(オーブの威力) +2 を得る。',
    },
  },
  electrodynamics: {
    base: {
      name: 'エレクトロダイナミクス',
      cost: 2,
      type: 'power',
      rarity: 'rare',
      target: 'self',
      class: 'mage',
      orbChannel: 'lightning',
      description: '電撃オーブが敵全体にヒットするようになる。電撃オーブを 2 個生成。',
    },
    upgraded: {
      description: '電撃オーブが敵全体にヒットするようになる。電撃オーブを 3 個生成。',
    },
  },
  sweeping_beam: {
    base: {
      name: '走査ビーム',
      cost: 1,
      type: 'attack',
      rarity: 'common',
      target: 'all_enemies',
      class: 'mage',
      damage: 6,
      draw: 1,
      description: '敵全体に 6 ダメージ。カードを 1 枚引く。',
    },
    upgraded: {
      damage: 9,
      draw: 1,
      description: '敵全体に 9 ダメージ。カードを 1 枚引く。',
    },
  },
};

// ユニークなカードインスタンスを作成
let cardIdCounter = 1;

export function createCard(templateKey: string, upgraded = false): Card {
  const template = CARD_TEMPLATES[templateKey];
  if (!template) {
    throw new Error(`Unknown card template: ${templateKey}`);
  }

  const id = `card_${templateKey}_${cardIdCounter++}`;
  const card: Card = {
    ...template.base,
    id,
    upgraded: false,
  };

  if (upgraded) {
    upgradeCard(card);
  }

  return card;
}

// カードのアップグレード
export function upgradeCard(card: Card): Card {
  if (card.upgraded) return card;

  // templateKey を推定
  const templateKey = Object.keys(CARD_TEMPLATES).find(
    (k) => CARD_TEMPLATES[k].base.name === card.name
  );
  if (!templateKey) return card;

  const template = CARD_TEMPLATES[templateKey];
  if (!template) return card;

  card.upgraded = true;
  card.name = `${card.name}+`;
  card.upgradeName = card.name;

  Object.assign(card, template.upgraded);
  return card;
}

// 報酬用のランダムカード提示（3枚）
export function getRandomRewardCards(heroClass: HeroClass): Card[] {
  const classCards = Object.keys(CARD_TEMPLATES).filter((key) => {
    const c = CARD_TEMPLATES[key].base;
    return c.class === heroClass && c.rarity !== 'basic';
  });

  const shuffled = [...classCards].sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, 3);

  // 15% の確率でアップグレード済み
  return selected.map((key) => {
    const isUpgraded = Math.random() < 0.15;
    return createCard(key, isUpgraded);
  });
}
