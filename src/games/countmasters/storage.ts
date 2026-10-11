import type { Upgrades } from './types';

export const readStored = (key: string): unknown => {
  try {
    const value = localStorage.getItem(key);
    return value === null ? undefined : JSON.parse(value);
  } catch { return undefined; }
};

export const readNumber = (key: string, fallback: number, min = 0, max = Number.MAX_SAFE_INTEGER): number => {
  const value = readStored(key);
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max ? value : fallback;
};

export const readUpgrades = (key: string): Upgrades => {
  const value = readStored(key);
  const saved = value && typeof value === 'object' ? value as Partial<Upgrades> : {};
  const level = (input: unknown) => typeof input === 'number' && Number.isInteger(input) && input >= 1 && input <= 10 ? input : 1;
  return {
    startCrowdLevel: level(saved.startCrowdLevel),
    attackPowerLevel: level(saved.attackPowerLevel),
    coinBonusLevel: level(saved.coinBonusLevel),
  };
};

export const writeStored = (key: string, value: unknown) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Playable when storage is unavailable. */ }
};
