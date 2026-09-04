export interface FruitDef {
  level: number;
  name: string;
  nameEn: string;
  radius: number;
  score: number;
  color: string;
  secondaryColor: string;
  accentColor: string;
  restitution: number;
  friction: number;
  density: number;
  emoji: string;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  rotation: number;
  vRot: number;
  type: 'sparkle' | 'splash' | 'star';
}

export interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  life: number;
  scale: number;
}

export interface FruitBodyData {
  id: number;
  level: number;
  createdAt: number;
  isMerged: boolean;
  blinkTimer: number;
  isBlinking: boolean;
  isHappy: boolean;
  happyTimer: number;
  isScared: boolean;
}

export interface SuikaGameProps {
  onBackToHub: () => void;
  isDark: boolean;
  isFullscreen?: boolean;
}
