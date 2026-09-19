// 南極観測基地ステージ定義 (Antarctic Adventure Stages)

import { StageConfig, StageId, AntarcticWorldState, GameDifficulty } from './types';

export const STAGE_CONFIGS: Record<StageId, StageConfig> = {
  1: {
    id: 1,
    name: 'オーストラリア基地',
    nameEn: 'Mawson Base (Australia)',
    countryName: 'オーストラリア',
    flagEmoji: '🇦🇺',
    flagColor: '#00247d',
    totalDistanceKm: 900,
    timeLimitSec: 90,
    obstacleFrequency: 1.0,
    weather: 'day',
    stationColor: '#f59e0b', // イエロー・オレンジの基地ドーム
  },
  2: {
    id: 2,
    name: 'フランス基地',
    nameEn: "Dumont d'Urville (France)",
    countryName: 'フランス',
    flagEmoji: '🇫🇷',
    flagColor: '#002395',
    totalDistanceKm: 1000,
    timeLimitSec: 100,
    obstacleFrequency: 1.15,
    weather: 'day',
    stationColor: '#3b82f6', // ブルーの基地
  },
  3: {
    id: 3,
    name: 'オーストラリア第2基地',
    nameEn: 'Davis Base (Australia)',
    countryName: 'オーストラリア',
    flagEmoji: '🇦🇺',
    flagColor: '#00247d',
    totalDistanceKm: 1100,
    timeLimitSec: 105,
    obstacleFrequency: 1.3,
    weather: 'sunset',
    stationColor: '#f97316',
  },
  4: {
    id: 4,
    name: 'ニュージーランド基地',
    nameEn: 'Scott Base (New Zealand)',
    countryName: 'ニュージーランド',
    flagEmoji: '🇳🇿',
    flagColor: '#00247d',
    totalDistanceKm: 1200,
    timeLimitSec: 110,
    obstacleFrequency: 1.45,
    weather: 'aurora',
    stationColor: '#10b981',
  },
  5: {
    id: 5,
    name: '南極点基地',
    nameEn: 'Amundsen-Scott (South Pole)',
    countryName: '南極点',
    flagEmoji: '📍',
    flagColor: '#ef4444',
    totalDistanceKm: 1300,
    timeLimitSec: 115,
    obstacleFrequency: 1.6,
    weather: 'day',
    stationColor: '#ec4899',
  },
  6: {
    id: 6,
    name: 'アメリカ基地',
    nameEn: 'McMurdo Station (USA)',
    countryName: 'アメリカ',
    flagEmoji: '🇺🇸',
    flagColor: '#b22234',
    totalDistanceKm: 1400,
    timeLimitSec: 120,
    obstacleFrequency: 1.75,
    weather: 'sunset',
    stationColor: '#6366f1',
  },
  7: {
    id: 7,
    name: 'アルゼンチン基地',
    nameEn: 'Esperanza Base (Argentina)',
    countryName: 'アルゼンチン',
    flagEmoji: '🇦🇷',
    flagColor: '#74acdf',
    totalDistanceKm: 1500,
    timeLimitSec: 125,
    obstacleFrequency: 1.9,
    weather: 'blizzard',
    stationColor: '#06b6d4',
  },
  8: {
    id: 8,
    name: '昭和基地 (Syowa Station)',
    nameEn: 'Syowa Station (Japan)',
    countryName: '日本',
    flagEmoji: '🇯🇵',
    flagColor: '#bc002d',
    totalDistanceKm: 1600,
    timeLimitSec: 130,
    obstacleFrequency: 2.05,
    weather: 'aurora',
    stationColor: '#ef4444',
  },
};

/**
 * ステージワールドの初期化
 */
export function createAntarcticWorld(
  stageId: StageId,
  difficulty: GameDifficulty = 'normal'
): AntarcticWorldState {
  const baseConfig = STAGE_CONFIGS[stageId] || STAGE_CONFIGS[1];

  // 難易度に応じた補正
  let timeMultiplier = 1.0;
  let freqMultiplier = 1.0;
  if (difficulty === 'easy') {
    timeMultiplier = 1.25; // 制限時間25%延長
    freqMultiplier = 0.8; // 障害物20%減少
  } else if (difficulty === 'hard') {
    timeMultiplier = 0.85; // 制限時間15%短縮
    freqMultiplier = 1.35; // 障害物35%増加
  }

  const adjustedConfig: StageConfig = {
    ...baseConfig,
    timeLimitSec: Math.round(baseConfig.timeLimitSec * timeMultiplier),
    obstacleFrequency: baseConfig.obstacleFrequency * freqMultiplier,
  };

  return {
    stage: adjustedConfig,
    remainingDistanceKm: adjustedConfig.totalDistanceKm,
    remainingTimeSec: adjustedConfig.timeLimitSec,
    obstacles: [],
    flags: [],
    particles: [],
    floatingTexts: [],
    curveOffset: 0,
    targetCurve: 0,
    curveTimer: 0,
    nextObstacleDistance: 40,
    nextFlagDistance: 80,
    idCounter: 1,
    stationVisible: false,
    stationZ: 0,
  };
}
