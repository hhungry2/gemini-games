import type { Driver, Point, Track } from './types';

export const DRIVERS: Driver[] = [
  {
    name: 'マリオ',
    color: '#ef493b',
    accent: '#4289df',
    speed: 1,
    turn: 1,
    weight: 1,
    symbol: 'M',
  },
  {
    name: 'ルイージ',
    color: '#3bc76b',
    accent: '#536fce',
    speed: 1,
    turn: 1.05,
    weight: 1,
    symbol: 'L',
  },
  {
    name: 'ピーチ',
    color: '#ff8eb8',
    accent: '#ffcb58',
    speed: 0.96,
    turn: 1.16,
    weight: 0.8,
    symbol: 'P',
  },
  {
    name: 'ヨッシー',
    color: '#7ed544',
    accent: '#fdf5dd',
    speed: 0.98,
    turn: 1.12,
    weight: 0.85,
    symbol: 'Y',
  },
  {
    name: 'クッパ',
    color: '#f4a938',
    accent: '#61a555',
    speed: 1.07,
    turn: 0.89,
    weight: 1.4,
    symbol: 'B',
  },
  {
    name: 'ドンキーJr.',
    color: '#ad764f',
    accent: '#f5c48f',
    speed: 1.06,
    turn: 0.92,
    weight: 1.3,
    symbol: 'D',
  },
  {
    name: 'キノピオ',
    color: '#f2f1e4',
    accent: '#ed5747',
    speed: 0.95,
    turn: 1.22,
    weight: 0.72,
    symbol: 'T',
  },
  {
    name: 'ノコノコ',
    color: '#70d8a0',
    accent: '#f6d25a',
    speed: 0.96,
    turn: 1.18,
    weight: 0.78,
    symbol: 'K',
  },
];

function makeTrack(
  id: string,
  name: string,
  subtitle: string,
  theme: Track['theme'],
  width: number,
  nodes: number[][],
): Track {
  const points: Point[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[(i + nodes.length - 1) % nodes.length],
      b = nodes[i],
      c = nodes[(i + 1) % nodes.length],
      d = nodes[(i + 2) % nodes.length];
    for (let j = 0; j < 32; j++) {
      const t = j / 32,
        t2 = t * t,
        t3 = t2 * t;
      const v = (k: number) =>
        0.5 *
        (2 * b[k] +
          (-a[k] + c[k]) * t +
          (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * t2 +
          (-a[k] + 3 * b[k] - 3 * c[k] + d[k]) * t3);
      points.push({ x: v(0), y: v(1) });
    }
  }
  const lengths = [0];
  for (let i = 0; i < points.length; i++) {
    const a = points[i],
      b = points[(i + 1) % points.length];
    lengths.push(lengths[i] + Math.hypot(b.x - a.x, b.y - a.y));
  }
  const palette = {
    meadow: ['#87dceb', '#72b85b', '#71797e'],
    beach: ['#d5b6d8', '#d8bf81', '#ad9873'],
    haunted: ['#252d58', '#252e45', '#887e91'],
    rainbow: ['#151a3c', '#161b38', '#9980bf'],
  }[theme];
  return {
    id,
    name,
    subtitle,
    theme,
    width,
    sky: palette[0],
    ground: palette[1],
    road: palette[2],
    points,
    lengths,
    length: lengths.at(-1)!,
  };
}

export const TRACKS: Track[] = [
  makeTrack(
    'circuit',
    'マリオサーキット',
    'MARIO CIRCUIT · 草原の高速コーナー',
    'meadow',
    76,
    [
      [470, 805],
      [240, 800],
      [160, 630],
      [190, 280],
      [390, 175],
      [610, 270],
      [800, 220],
      [855, 470],
      [760, 760],
    ],
  ),
  makeTrack(
    'plains',
    'ドーナツへいや',
    'DONUT PLAINS · 湖畔のテクニカルコース',
    'beach',
    72,
    [
      [470, 830],
      [215, 770],
      [175, 550],
      [350, 450],
      [195, 270],
      [420, 160],
      [750, 220],
      [810, 440],
      [620, 580],
      [820, 735],
    ],
  ),
  makeTrack(
    'ghost',
    'おばけぬま',
    'GHOST VALLEY · 闇に浮かぶ木のレースウェイ',
    'haunted',
    68,
    [
      [490, 820],
      [205, 795],
      [160, 560],
      [340, 540],
      [340, 310],
      [210, 185],
      [600, 165],
      [820, 290],
      [785, 580],
      [665, 780],
    ],
  ),
  makeTrack(
    'rainbow',
    'レインボーロード',
    'RAINBOW ROAD · 星をつなぐ最後のレース',
    'rainbow',
    66,
    [
      [480, 835],
      [235, 785],
      [180, 570],
      [370, 455],
      [205, 260],
      [400, 150],
      [710, 175],
      [830, 375],
      [670, 520],
      [830, 745],
    ],
  ),
];

export function wrap(value: number, length: number) {
  return ((value % length) + length) % length;
}
export function angleDiff(a: number, b: number) {
  return Math.atan2(Math.sin(a - b), Math.cos(a - b));
}
export function at(track: Track, distance: number, offset = 0) {
  const s = wrap(distance, track.length);
  let lo = 0,
    hi = track.points.length;
  while (lo + 1 < hi) {
    const mid = (lo + hi) >> 1;
    if (track.lengths[mid] <= s) lo = mid;
    else hi = mid;
  }
  const a = track.points[lo],
    b = track.points[(lo + 1) % track.points.length];
  const t =
    (s - track.lengths[lo]) / (track.lengths[lo + 1] - track.lengths[lo]);
  const angle = Math.atan2(b.y - a.y, b.x - a.x);
  return {
    x: a.x + (b.x - a.x) * t - Math.sin(angle) * offset,
    y: a.y + (b.y - a.y) * t + Math.cos(angle) * offset,
    angle,
  };
}

export function project(track: Track, point: Point) {
  let best = Infinity,
    s = 0,
    offset = 0;
  for (let i = 0; i < track.points.length; i++) {
    const a = track.points[i],
      b = track.points[(i + 1) % track.points.length];
    const dx = b.x - a.x,
      dy = b.y - a.y,
      len2 = dx * dx + dy * dy;
    const t = Math.max(
      0,
      Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / len2),
    );
    const ex = point.x - a.x - dx * t,
      ey = point.y - a.y - dy * t;
    const dist2 = ex * ex + ey * ey;
    if (dist2 < best) {
      best = dist2;
      s = track.lengths[i] + Math.sqrt(len2) * t;
      offset = (dx * ey - dy * ex) / Math.sqrt(len2);
    }
  }
  return { s, offset, distance: Math.sqrt(best) };
}
