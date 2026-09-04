import { Enemy, EnemyIntent, StatusEffects } from './types';

let enemyIdCounter = 1;

export function createDefaultStatuses(): StatusEffects {
  return {
    strength: 0,
    dexterity: 0,
    vulnerable: 0,
    weak: 0,
    poison: 0,
    metallicize: 0,
    thorns: 0,
    focus: 0,
    intangible: 0,
    ritual: 0,
  };
}

// 通常敵の生成
export function createNormalEncounter(floor: number): Enemy[] {
  const encType = Math.floor(Math.random() * 4);

  if (encType === 0) {
    // カルティスト
    return [
      {
        id: 'cultist',
        instanceId: `enemy_${enemyIdCounter++}`,
        name: 'カルティスト',
        maxHp: 48 + floor * 2,
        hp: 48 + floor * 2,
        block: 0,
        statuses: { ...createDefaultStatuses(), ritual: 3 },
        avatarIcon: '🦅',
        color: 'from-amber-700 to-red-900',
        currentIntentIndex: 0,
        intents: [
          {
            type: 'buff',
            description: '祈り: 毎ターン終了時に筋力+3を得る。',
            strength: 3,
          },
          {
            type: 'attack',
            damage: 6,
            description: '暗黒突き (6 ダメージ + 筋力)',
          },
        ],
      },
    ];
  }

  if (encType === 1) {
    // アゴの怪獣 (Jaw Worm)
    return [
      {
        id: 'jaw_worm',
        instanceId: `enemy_${enemyIdCounter++}`,
        name: 'ジョーワーム',
        maxHp: 42 + floor * 2,
        hp: 42 + floor * 2,
        block: 0,
        statuses: createDefaultStatuses(),
        avatarIcon: '🐛',
        color: 'from-orange-800 to-amber-950',
        currentIntentIndex: 0,
        intents: [
          {
            type: 'attack',
            damage: 11,
            description: '大あご噛み砕き (11 ダメージ)',
          },
          {
            type: 'defend_buff',
            block: 6,
            strength: 3,
            description: '外殻硬化 (6 ブロック & 筋力+3)',
          },
        ],
      },
    ];
  }

  if (encType === 2) {
    // スライムコンビ (Acid Slime & Spike Slime)
    return [
      {
        id: 'acid_slime',
        instanceId: `enemy_${enemyIdCounter++}`,
        name: 'アシッドスライム',
        maxHp: 28 + floor,
        hp: 28 + floor,
        block: 0,
        statuses: createDefaultStatuses(),
        avatarIcon: '🟢',
        color: 'from-emerald-700 to-green-950',
        currentIntentIndex: 0,
        intents: [
          {
            type: 'attack_debuff',
            damage: 8,
            weak: 1,
            description: '溶解タックル (8 ダメージ & 脱力 1)',
          },
          {
            type: 'attack',
            damage: 10,
            description: '強酸スプレー (10 ダメージ)',
          },
        ],
      },
      {
        id: 'spike_slime',
        instanceId: `enemy_${enemyIdCounter++}`,
        name: 'トゲスライム',
        maxHp: 26 + floor,
        hp: 26 + floor,
        block: 0,
        statuses: createDefaultStatuses(),
        avatarIcon: '🟣',
        color: 'from-purple-800 to-violet-950',
        currentIntentIndex: 0,
        intents: [
          {
            type: 'attack_debuff',
            damage: 6,
            vulnerable: 1,
            description: 'トゲ突撃 (6 ダメージ & 脆弱 1)',
          },
          {
            type: 'attack',
            damage: 8,
            description: '体当たり (8 ダメージ)',
          },
        ],
      },
    ];
  }

  // 盗賊 (Looter)
  return [
    {
      id: 'looter',
      instanceId: `enemy_${enemyIdCounter++}`,
      name: '尖塔の強盗',
      maxHp: 44 + floor * 2,
      hp: 44 + floor * 2,
      block: 0,
      statuses: createDefaultStatuses(),
      avatarIcon: '🦹',
      color: 'from-slate-700 to-stone-900',
      currentIntentIndex: 0,
      intents: [
        {
          type: 'attack',
          damage: 10,
          description: 'かっぱらい突き (10 ダメージ)',
        },
        {
          type: 'attack_buff',
          damage: 12,
          block: 6,
          description: '身構え切り裂き (12 ダメージ & 6 ブロック)',
        },
      ],
    },
  ];
}

// エリート敵の生成
export function createEliteEncounter(floor: number): Enemy[] {
  const eliteType = Math.random() < 0.5 ? 0 : 1;

  if (eliteType === 0) {
    // グレムリンの頭目 (Gremlin Nob)
    return [
      {
        id: 'gremlin_nob',
        instanceId: `enemy_${enemyIdCounter++}`,
        name: 'グレムリン・ノブ',
        maxHp: 82 + floor * 3,
        hp: 82 + floor * 3,
        block: 0,
        statuses: createDefaultStatuses(),
        isElite: true,
        avatarIcon: '👹',
        color: 'from-red-700 to-rose-950',
        currentIntentIndex: 0,
        intents: [
          {
            type: 'buff',
            description: '咆哮: スキル使用に憤怒し筋力を激増させる構え。',
            strength: 2,
          },
          {
            type: 'attack_debuff',
            damage: 8,
            vulnerable: 2,
            description: '激痛の頭突き (8 ダメージ & 脆弱 2)',
          },
          {
            type: 'attack',
            damage: 16,
            description: '大棍棒乱舞 (16 ダメージ)',
          },
        ],
      },
    ];
  }

  // ラガヴーリン (Lagavulin)
  return [
    {
      id: 'lagavulin',
      instanceId: `enemy_${enemyIdCounter++}`,
      name: 'ラガヴーリン',
      maxHp: 105,
      hp: 105,
      block: 15,
      statuses: { ...createDefaultStatuses(), metallicize: 5 },
      isElite: true,
      avatarIcon: '🦀',
      color: 'from-indigo-900 to-slate-950',
      currentIntentIndex: 0,
      intents: [
        {
          type: 'attack',
          damage: 18,
          description: '大鋏粉砕 (18 ダメージ)',
        },
        {
          type: 'debuff',
          description: '精神吸引 (プレイヤーの筋力-1 & 敏捷性-1)',
          strength: -1,
        },
      ],
    },
  ];
}

// Act 1 ボス敵の生成
export function createBossEncounter(): Enemy[] {
  return [
    {
      id: 'slime_boss',
      instanceId: `enemy_${enemyIdCounter++}`,
      name: 'スライムボス (巨躯の帝王)',
      maxHp: 140,
      hp: 140,
      block: 0,
      statuses: createDefaultStatuses(),
      isBoss: true,
      avatarIcon: '👑',
      color: 'from-emerald-600 via-teal-800 to-slate-950',
      currentIntentIndex: 0,
      intents: [
        {
          type: 'special',
          description: '溜め息: 全身に魔力を凝縮している…！(次ターン超壊滅攻撃)',
        },
        {
          type: 'attack',
          damage: 32,
          description: '破滅のギガプレス (32 ダメージ！)',
        },
        {
          type: 'attack_debuff',
          damage: 12,
          weak: 2,
          vulnerable: 2,
          description: 'ヘドロ大噴射 (12 ダメージ & 脱力2 & 脆弱2)',
        },
      ],
    },
  ];
}

// 敵の次のターン用インテントを更新
export function advanceEnemyIntent(enemy: Enemy): EnemyIntent {
  let nextIndex = (enemy.currentIntentIndex + 1) % enemy.intents.length;
  enemy.currentIntentIndex = nextIndex;
  return enemy.intents[nextIndex];
}
