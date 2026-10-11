export type Point = { x: number; y: number };
export type Mode = 'gp' | 'race' | 'trial';
export type Item = 'mushroom' | 'shell' | 'banana' | 'star' | 'lightning';
export type Input = {
  gas: boolean;
  brake: boolean;
  left: boolean;
  right: boolean;
  drift: boolean;
  item: boolean;
};
export type Driver = {
  name: string;
  color: string;
  accent: string;
  speed: number;
  turn: number;
  weight: number;
  symbol: string;
};
export type Track = {
  id: string;
  name: string;
  subtitle: string;
  theme: 'meadow' | 'beach' | 'haunted' | 'rainbow';
  sky: string;
  ground: string;
  road: string;
  width: number;
  points: Point[];
  lengths: number[];
  length: number;
};
export type Kart = Point & {
  id: number;
  driver: number;
  angle: number;
  speed: number;
  distance: number;
  pathS: number;
  lap: number;
  lapStart: number;
  lapTimes: number[];
  coins: number;
  driftCharge: number;
  driftDirection: number;
  boost: number;
  spin: number;
  immune: number;
  star: number;
  small: number;
  rescue: number;
  item: Item | null;
  roulette: number;
  itemClock: number;
  finished: boolean;
  finishTime: number;
  rank: number;
  offroad: boolean;
};
export type Pickup = Point & {
  kind: 'coin' | 'box' | 'boost';
  cooldown: number;
};
export type Hazard = Point & {
  kind: 'shell' | 'banana';
  angle: number;
  life: number;
  owner: number;
  age: number;
};
export type Particle = Point & {
  vx: number;
  vy: number;
  life: number;
  color: string;
};
export type Race = {
  track: Track;
  mode: Mode;
  cc: number;
  laps: number;
  karts: Kart[];
  pickups: Pickup[];
  hazards: Hazard[];
  particles: Particle[];
  time: number;
  countdown: number;
  done: boolean;
  seed: number;
  message: string;
  messageTime: number;
  events: string[];
  startHeld: boolean;
  startCharge: boolean;
};
export const emptyInput = (): Input => ({
  gas: false,
  brake: false,
  left: false,
  right: false,
  drift: false,
  item: false,
});
