import { FruitDef } from './types';

export const FRUITS: FruitDef[] = [
  {
    level: 0,
    name: 'さくらんぼ',
    nameEn: 'Cherry',
    radius: 17,
    score: 2,
    color: '#ef4444', // 鮮やかな赤
    secondaryColor: '#f87171',
    accentColor: '#15803d', // 茎の緑
    restitution: 0.25,
    friction: 0.15,
    density: 0.001,
    emoji: '🍒',
  },
  {
    level: 1,
    name: 'いちご',
    nameEn: 'Strawberry',
    radius: 24,
    score: 4,
    color: '#f43f5e', // ローズピンク・赤
    secondaryColor: '#fb7185',
    accentColor: '#22c55e', // ヘタ
    restitution: 0.22,
    friction: 0.16,
    density: 0.0011,
    emoji: '🍓',
  },
  {
    level: 2,
    name: 'ぶどう',
    nameEn: 'Grape',
    radius: 32,
    score: 8,
    color: '#a855f7', // パープル
    secondaryColor: '#c084fc',
    accentColor: '#86efac',
    restitution: 0.2,
    friction: 0.17,
    density: 0.0012,
    emoji: '🍇',
  },
  {
    level: 3,
    name: 'デコポン',
    nameEn: 'Dekopon',
    radius: 41,
    score: 16,
    color: '#f97316', // オレンジ
    secondaryColor: '#fb923c',
    accentColor: '#16a34a',
    restitution: 0.18,
    friction: 0.18,
    density: 0.0013,
    emoji: '🍊',
  },
  {
    level: 4,
    name: 'かき',
    nameEn: 'Persimmon',
    radius: 51,
    score: 32,
    color: '#ea580c', // 柿色（深めのオレンジ）
    secondaryColor: '#f97316',
    accentColor: '#15803d',
    restitution: 0.16,
    friction: 0.19,
    density: 0.0014,
    emoji: '🍂',
  },
  {
    level: 5,
    name: 'りんご',
    nameEn: 'Apple',
    radius: 63,
    score: 64,
    color: '#dc2626', // 真紅
    secondaryColor: '#ef4444',
    accentColor: '#16a34a',
    restitution: 0.15,
    friction: 0.2,
    density: 0.0015,
    emoji: '🍎',
  },
  {
    level: 6,
    name: 'なし',
    nameEn: 'Pear',
    radius: 76,
    score: 128,
    color: '#84cc16', // 洋梨ライムグリーン
    secondaryColor: '#a3e635',
    accentColor: '#4d7c0f',
    restitution: 0.13,
    friction: 0.22,
    density: 0.0016,
    emoji: '🍐',
  },
  {
    level: 7,
    name: 'もも',
    nameEn: 'Peach',
    radius: 90,
    score: 256,
    color: '#f472b6', // 桃色ピンク
    secondaryColor: '#fbcfe8',
    accentColor: '#10b981',
    restitution: 0.12,
    friction: 0.22,
    density: 0.0017,
    emoji: '🍑',
  },
  {
    level: 8,
    name: 'パイナップル',
    nameEn: 'Pineapple',
    radius: 106,
    score: 512,
    color: '#eab308', // ゴールデンイエロー
    secondaryColor: '#fde047',
    accentColor: '#16a34a',
    restitution: 0.1,
    friction: 0.24,
    density: 0.0018,
    emoji: '🍍',
  },
  {
    level: 9,
    name: 'メロン',
    nameEn: 'Melon',
    radius: 124,
    score: 1024,
    color: '#22c55e', // メロングリーン
    secondaryColor: '#86efac',
    accentColor: '#15803d',
    restitution: 0.08,
    friction: 0.25,
    density: 0.002,
    emoji: '🍈',
  },
  {
    level: 10,
    name: 'スイカ',
    nameEn: 'Watermelon',
    radius: 146,
    score: 2048,
    color: '#16a34a', // スイカ緑
    secondaryColor: '#15803d',
    accentColor: '#1e293b', // 黒ストライプ
    restitution: 0.06,
    friction: 0.28,
    density: 0.0022,
    emoji: '🍉',
  },
];

// 投下可能なフルーツの出現レベル（通常は0〜4: さくらんぼ〜かき）
export const DROP_LEVELS = [0, 0, 0, 1, 1, 1, 2, 2, 3, 4];

export const getRandomDropLevel = (): number => {
  const idx = Math.floor(Math.random() * DROP_LEVELS.length);
  return DROP_LEVELS[idx];
};
