import { TrackData, TrackSegment } from './types';

const CUSTOM_TRACK_KEY = 'excitebike_custom_track_v1';

export const TRACK_1: TrackData = {
  id: 'track_1',
  name: 'TRACK 1: BEGINNER CIRUCT',
  difficulty: 'EASY',
  targetTime: 65,
  totalLength: 4200,
  segments: [
    { id: 't1_s1', type: 'flat', x: 0, width: 400 },
    { id: 't1_s2', type: 'small_ramp', x: 400, width: 80 },
    { id: 't1_s3', type: 'flat', x: 480, width: 200 },
    { id: 't1_s4', type: 'mud', x: 680, width: 150 },
    { id: 't1_s5', type: 'cooler', x: 850, width: 100 },
    { id: 't1_s6', type: 'flat', x: 950, width: 150 },
    { id: 't1_s7', type: 'big_ramp', x: 1100, width: 130 },
    { id: 't1_s8', type: 'flat', x: 1230, width: 250 },
    { id: 't1_s9', type: 'small_ramp', x: 1480, width: 80 },
    { id: 't1_s10', type: 'flat', x: 1560, width: 180 },
    { id: 't1_s11', type: 'table_top', x: 1740, width: 240 },
    { id: 't1_s12', type: 'flat', x: 1980, width: 120 },
    { id: 't1_s13', type: 'cooler', x: 2100, width: 100 },
    { id: 't1_s14', type: 'whoops', x: 2220, width: 240 },
    { id: 't1_s15', type: 'flat', x: 2460, width: 200 },
    { id: 't1_s16', type: 'big_ramp', x: 2660, width: 130 },
    { id: 't1_s17', type: 'mud', x: 2850, width: 160 },
    { id: 't1_s18', type: 'flat', x: 3010, width: 150 },
    { id: 't1_s19', type: 'table_top', x: 3160, width: 240 },
    { id: 't1_s20', type: 'cooler', x: 3420, width: 100 },
    { id: 't1_s21', type: 'small_ramp', x: 3540, width: 80 },
    { id: 't1_s22', type: 'flat', x: 3620, width: 380 },
    { id: 't1_s23', type: 'finish', x: 4000, width: 200 },
  ],
};

export const TRACK_2: TrackData = {
  id: 'track_2',
  name: 'TRACK 2: SPEEDWAY PRO',
  difficulty: 'NORMAL',
  targetTime: 62,
  totalLength: 4500,
  segments: [
    { id: 't2_s1', type: 'flat', x: 0, width: 350 },
    { id: 't2_s2', type: 'table_top', x: 350, width: 240 },
    { id: 't2_s3', type: 'cooler', x: 610, width: 90 },
    { id: 't2_s4', type: 'small_ramp', x: 720, width: 80 },
    { id: 't2_s5', type: 'flat', x: 800, width: 120 },
    { id: 't2_s6', type: 'whoops', x: 920, width: 240 },
    { id: 't2_s7', type: 'flat', x: 1160, width: 150 },
    { id: 't2_s8', type: 'big_ramp', x: 1310, width: 140 },
    { id: 't2_s9', type: 'flat', x: 1450, width: 180 },
    { id: 't2_s10', type: 'mud', x: 1630, width: 180 },
    { id: 't2_s11', type: 'hurdle', x: 1830, width: 40 },
    { id: 't2_s12', type: 'cooler', x: 1910, width: 100 },
    { id: 't2_s13', type: 'small_ramp', x: 2030, width: 80 },
    { id: 't2_s14', type: 'table_top', x: 2150, width: 240 },
    { id: 't2_s15', type: 'whoops', x: 2410, width: 240 },
    { id: 't2_s16', type: 'flat', x: 2650, width: 160 },
    { id: 't2_s17', type: 'big_ramp', x: 2810, width: 140 },
    { id: 't2_s18', type: 'mud', x: 3000, width: 160 },
    { id: 't2_s19', type: 'cooler', x: 3180, width: 100 },
    { id: 't2_s20', type: 'small_ramp', x: 3300, width: 80 },
    { id: 't2_s21', type: 'table_top', x: 3420, width: 240 },
    { id: 't2_s22', type: 'flat', x: 3680, width: 620 },
    { id: 't2_s23', type: 'finish', x: 4300, width: 200 },
  ],
};

export const TRACK_3: TrackData = {
  id: 'track_3',
  name: 'TRACK 3: SUPER HOOPS',
  difficulty: 'HARD',
  targetTime: 68,
  totalLength: 4800,
  segments: [
    { id: 't3_s1', type: 'flat', x: 0, width: 300 },
    { id: 't3_s2', type: 'whoops', x: 300, width: 240 },
    { id: 't3_s3', type: 'whoops', x: 540, width: 240 },
    { id: 't3_s4', type: 'cooler', x: 800, width: 100 },
    { id: 't3_s5', type: 'big_ramp', x: 920, width: 140 },
    { id: 't3_s6', type: 'mud', x: 1120, width: 180 },
    { id: 't3_s7', type: 'table_top', x: 1320, width: 240 },
    { id: 't3_s8', type: 'small_ramp', x: 1580, width: 80 },
    { id: 't3_s9', type: 'flat', x: 1660, width: 100 },
    { id: 't3_s10', type: 'hurdle', x: 1760, width: 40 },
    { id: 't3_s11', type: 'cooler', x: 1840, width: 100 },
    { id: 't3_s12', type: 'big_ramp', x: 1960, width: 140 },
    { id: 't3_s13', type: 'big_ramp', x: 2160, width: 140 },
    { id: 't3_s14', type: 'mud', x: 2350, width: 200 },
    { id: 't3_s15', type: 'cooler', x: 2570, width: 100 },
    { id: 't3_s16', type: 'whoops', x: 2690, width: 240 },
    { id: 't3_s17', type: 'table_top', x: 2950, width: 240 },
    { id: 't3_s18', type: 'small_ramp', x: 3210, width: 80 },
    { id: 't3_s19', type: 'mud', x: 3310, width: 160 },
    { id: 't3_s20', type: 'big_ramp', x: 3490, width: 140 },
    { id: 't3_s21', type: 'cooler', x: 3700, width: 100 },
    { id: 't3_s22', type: 'whoops', x: 3820, width: 240 },
    { id: 't3_s23', type: 'flat', x: 4080, width: 520 },
    { id: 't3_s24', type: 'finish', x: 4600, width: 200 },
  ],
};

export const TRACK_4: TrackData = {
  id: 'track_4',
  name: 'TRACK 4: MUD & JUMPS',
  difficulty: 'EXPERT',
  targetTime: 72,
  totalLength: 5000,
  segments: [
    { id: 't4_s1', type: 'flat', x: 0, width: 300 },
    { id: 't4_s2', type: 'big_ramp', x: 300, width: 140 },
    { id: 't4_s3', type: 'table_top', x: 500, width: 240 },
    { id: 't4_s4', type: 'cooler', x: 760, width: 90 },
    { id: 't4_s5', type: 'mud', x: 870, width: 200 },
    { id: 't4_s6', type: 'hurdle', x: 1090, width: 40 },
    { id: 't4_s7', type: 'big_ramp', x: 1150, width: 140 },
    { id: 't4_s8', type: 'mud', x: 1350, width: 180 },
    { id: 't4_s9', type: 'cooler', x: 1550, width: 100 },
    { id: 't4_s10', type: 'whoops', x: 1670, width: 240 },
    { id: 't4_s11', type: 'whoops', x: 1910, width: 240 },
    { id: 't4_s12', type: 'small_ramp', x: 2170, width: 80 },
    { id: 't4_s13', type: 'table_top', x: 2270, width: 240 },
    { id: 't4_s14', type: 'big_ramp', x: 2530, width: 140 },
    { id: 't4_s15', type: 'cooler', x: 2750, width: 100 },
    { id: 't4_s16', type: 'mud', x: 2870, width: 220 },
    { id: 't4_s17', type: 'hurdle', x: 3110, width: 40 },
    { id: 't4_s18', type: 'table_top', x: 3180, width: 240 },
    { id: 't4_s19', type: 'big_ramp', x: 3440, width: 140 },
    { id: 't4_s20', type: 'whoops', x: 3660, width: 240 },
    { id: 't4_s21', type: 'cooler', x: 3920, width: 100 },
    { id: 't4_s22', type: 'small_ramp', x: 4040, width: 80 },
    { id: 't4_s23', type: 'flat', x: 4140, width: 660 },
    { id: 't4_s24', type: 'finish', x: 4800, width: 200 },
  ],
};

export const TRACK_5: TrackData = {
  id: 'track_5',
  name: 'TRACK 5: CHAMPION STADIUM',
  difficulty: 'MASTER',
  targetTime: 75,
  totalLength: 5400,
  segments: [
    { id: 't5_s1', type: 'flat', x: 0, width: 280 },
    { id: 't5_s2', type: 'table_top', x: 280, width: 240 },
    { id: 't5_s3', type: 'big_ramp', x: 540, width: 140 },
    { id: 't5_s4', type: 'mud', x: 740, width: 180 },
    { id: 't5_s5', type: 'cooler', x: 940, width: 90 },
    { id: 't5_s6', type: 'whoops', x: 1050, width: 240 },
    { id: 't5_s7', type: 'whoops', x: 1290, width: 240 },
    { id: 't5_s8', type: 'hurdle', x: 1550, width: 40 },
    { id: 't5_s9', type: 'big_ramp', x: 1610, width: 140 },
    { id: 't5_s10', type: 'big_ramp', x: 1810, width: 140 },
    { id: 't5_s11', type: 'table_top', x: 2010, width: 240 },
    { id: 't5_s12', type: 'cooler', x: 2270, width: 100 },
    { id: 't5_s13', type: 'mud', x: 2390, width: 220 },
    { id: 't5_s14', type: 'small_ramp', x: 2630, width: 80 },
    { id: 't5_s15', type: 'table_top', x: 2730, width: 240 },
    { id: 't5_s16', type: 'whoops', x: 2990, width: 240 },
    { id: 't5_s17', type: 'cooler', x: 3250, width: 100 },
    { id: 't5_s18', type: 'big_ramp', x: 3370, width: 140 },
    { id: 't5_s19', type: 'mud', x: 3570, width: 200 },
    { id: 't5_s20', type: 'hurdle', x: 3790, width: 40 },
    { id: 't5_s21', type: 'small_ramp', x: 3850, width: 80 },
    { id: 't5_s22', type: 'table_top', x: 3950, width: 240 },
    { id: 't5_s23', type: 'cooler', x: 4210, width: 100 },
    { id: 't5_s24', type: 'big_ramp', x: 4330, width: 140 },
    { id: 't5_s25', type: 'whoops', x: 4530, width: 240 },
    { id: 't5_s26', type: 'flat', x: 4790, width: 410 },
    { id: 't5_s27', type: 'finish', x: 5200, width: 200 },
  ],
};

export const ALL_OFFICIAL_TRACKS: TrackData[] = [
  TRACK_1,
  TRACK_2,
  TRACK_3,
  TRACK_4,
  TRACK_5,
];

// カスタムコースのデフォルト
export const DEFAULT_CUSTOM_SEGMENTS: TrackSegment[] = [
  { id: 'c_1', type: 'flat', x: 0, width: 350 },
  { id: 'c_2', type: 'small_ramp', x: 350, width: 80 },
  { id: 'c_3', type: 'flat', x: 430, width: 150 },
  { id: 'c_4', type: 'table_top', x: 580, width: 240 },
  { id: 'c_5', type: 'cooler', x: 840, width: 100 },
  { id: 'c_6', type: 'big_ramp', x: 960, width: 140 },
  { id: 'c_7', type: 'flat', x: 1100, width: 200 },
  { id: 'c_8', type: 'mud', x: 1300, width: 160 },
  { id: 'c_9', type: 'whoops', x: 1480, width: 240 },
  { id: 'c_10', type: 'cooler', x: 1740, width: 100 },
  { id: 'c_11', type: 'finish', x: 1860, width: 200 },
];

export function getCustomTrack(): TrackData {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(CUSTOM_TRACK_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.segments) && parsed.segments.length > 0) {
          return parsed;
        }
      } catch {}
    }
  }

  // デフォルト
  let curX = 0;
  const segments = DEFAULT_CUSTOM_SEGMENTS.map((s, idx) => {
    const seg = { ...s, id: `custom_${idx}`, x: curX };
    curX += seg.width;
    return seg;
  });

  return {
    id: 'track_custom',
    name: 'CUSTOM TRACK (MY DESIGN)',
    difficulty: 'CUSTOM',
    targetTime: 45,
    segments,
    totalLength: curX,
  };
}

export function saveCustomTrack(track: TrackData) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CUSTOM_TRACK_KEY, JSON.stringify(track));
  } catch {}
}
