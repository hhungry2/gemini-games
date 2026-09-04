import { Potion } from './types';

export const POTIONS_DATABASE: Record<string, Omit<Potion, 'id'>> = {
  fire_potion: {
    name: '火炎ポーション',
    description: '敵単体に 20 ダメージを与える。',
    icon: '🔥',
    color: 'bg-red-600',
    rarity: 'common',
    price: 50,
    target: 'enemy',
    effect: { damage: 20 },
  },
  explosive_potion: {
    name: '爆発ポーション',
    description: '敵全体に 10 ダメージを与える。',
    icon: '💥',
    color: 'bg-orange-600',
    rarity: 'common',
    price: 50,
    target: 'all_enemies',
    effect: { damage: 10 },
  },
  block_potion: {
    name: 'ブロックポーション',
    description: '12 ブロックを得る。',
    icon: '🛡️',
    color: 'bg-blue-600',
    rarity: 'common',
    price: 50,
    target: 'self',
    effect: { block: 12 },
  },
  strength_potion: {
    name: '筋力ポーション',
    description: '筋力 +2 を得る。',
    icon: '💪',
    color: 'bg-amber-600',
    rarity: 'common',
    price: 60,
    target: 'self',
    effect: { strength: 2 },
  },
  poison_potion: {
    name: '猛毒ポーション',
    description: '敵単体に 毒 6 を付与する。',
    icon: '🧪',
    color: 'bg-emerald-600',
    rarity: 'common',
    price: 50,
    target: 'enemy',
    effect: { poison: 6 },
  },
  heal_potion: {
    name: '治癒ポーション',
    description: 'HPを 15 回復する。',
    icon: '💖',
    color: 'bg-rose-500',
    rarity: 'uncommon',
    price: 75,
    target: 'self',
    effect: { heal: 15 },
  },
};

let potionIdCounter = 1;

export function createPotion(key: string): Potion {
  const base = POTIONS_DATABASE[key];
  if (!base) {
    throw new Error(`Unknown potion key: ${key}`);
  }
  return {
    id: `potion_${key}_${potionIdCounter++}`,
    ...base,
  };
}

export function getRandomPotion(): Potion {
  const keys = Object.keys(POTIONS_DATABASE);
  const picked = keys[Math.floor(Math.random() * keys.length)];
  return createPotion(picked);
}
