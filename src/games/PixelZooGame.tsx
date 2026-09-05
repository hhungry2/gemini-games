import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  Volume2,
  VolumeX,
  Heart,
  FileText,
  Gamepad2,
  Sun,
  Moon,
  CloudRain,
  Sunset,
  Smile,
  Apple,
  CircleDot,
  Store,
  X,
} from 'lucide-react';

export interface PixelZooGameProps {
  onBackToHub: () => void;
  isDark: boolean;
  isFullscreen?: boolean;
}

// 厳密な1文字カラーパレット定義
const PAL: Record<string, string> = {
  W: '#FFFFFF',     // 白
  K: '#1E232A',     // 黒・濃炭
  G: '#64748B',     // グレー
  P: '#FFAAA6',     // ほっぺピンク
  H: '#FF4081',     // 赤ピンク
  B: '#C48D58',     // カピバラ薄茶
  D: '#8C5528',     // カピバラ濃茶
  C: '#4A2810',     // 焦げ茶
  O: '#F97316',     // オレンジ
  R: '#D95D39',     // レッサー赤茶
  Y: '#FEE440',     // レモン黄色
  U: '#F59E0B',     // 濃黄・くちばし
  N: '#4ADE80',     // 若草緑
  M: '#16A34A',     // 濃緑・笹
  A: '#FDF0D5',     // アルパカクリーム
  E: '#D4A373',     // ベージュ
};

// 動物テンプレート定義 (16x16)
interface AnimalTemplate {
  id: string;
  name: string;
  icon: string;
  desc: string;
  cost: number;
  w: number;
  h: number;
  grid: string[];
}

const ANIMAL_TEMPLATES: Record<string, AnimalTemplate> = {
  panda: {
    id: 'panda',
    name: 'パンダ',
    icon: '🐼',
    desc: '笹をもぐもぐ、のんびりゴロゴロ。',
    cost: 0,
    w: 16,
    h: 16,
    grid: [
      "____KK____KK____",
      "___KKKK__KKKK___",
      "__KKWWWWWWWWKK__",
      "__KWWWWWWWWWWK__",
      "_WWWWWWWWWWWWWW_",
      "_WWKKWWWWWWKKWW_",
      "_WWKKWWWWWWKKWW_",
      "_WWWWWWKKWWWWWW_",
      "_WWPWWWKKWWWPWW_",
      "__WWWWKKKKWWWW__",
      "___KKWWWWWWKK___",
      "__KKKKWWWWKKKK__",
      "__KKKKWWWWKKKK__",
      "___KKWWWWWWKK___",
      "___KKKK__KKKK___",
      "____KK____KK____"
    ]
  },
  capybara: {
    id: 'capybara',
    name: 'カピバラ',
    icon: '🦫',
    desc: '温泉とゆずが大好き。見ているだけで平和。',
    cost: 15,
    w: 16,
    h: 16,
    grid: [
      "______YYYY______",
      "_____YYNYY______",
      "____BBBBBBBB____",
      "___BBBBBBBBBB___",
      "__BBBBBBBBBBBB__",
      "_BBBBBBBBBBBBBB_",
      "_BBCBBBBBBCBBB__",
      "_BBBBBBBBBBBB___",
      "_DDDDDDDDDDDD___",
      "_BBBBBBBBBBBB___",
      "_BBBBBBBBBBBB___",
      "BBBBBBBBBBBBBBBB",
      "BBBBBBBBBBBBBBBB",
      "_DDDDDDDDDDDDDD_",
      "__CC______CC____",
      "__CC______CC____"
    ]
  },
  redpanda: {
    id: 'redpanda',
    name: 'レッサーパンダ',
    icon: '🦊',
    desc: '両手を挙げてかわいい威嚇。しっぽふさふさ。',
    cost: 35,
    w: 16,
    h: 16,
    grid: [
      "___WW______WW___",
      "__WWRR____RRWW__",
      "_WWRRRRRRRRRRWW_",
      "_RRRRRRRRRRRRRR_",
      "RRWWWRRRRRWWWRRR",
      "RRKWWWRRRKWWWRRR",
      "RRRRRRWWWRRRRRRR",
      "WWRRRKCCWPWWWRR_",
      "_WWRRWWWWWRRWW__",
      "___CCCCCCCCCC___",
      "__CCCCCCCCCCRO__",
      "__CCCCCCCCCCOR__",
      "__CCCCCCCCCCRO__",
      "___CC____CC_OR__",
      "___CC____CC_____",
      "___KK____KK_____"
    ]
  },
  penguin: {
    id: 'penguin',
    name: 'ペンギン',
    icon: '🐧',
    desc: 'よちよち歩き。ときどきお腹で滑るよ。',
    cost: 60,
    w: 16,
    h: 16,
    grid: [
      "______KKKK______",
      "____KKKKKKKK____",
      "___KKKWWWWKKK___",
      "___KKKWWWWKKK___",
      "___KKKWKKWKKK___",
      "___KKPPUUPPKK___",
      "____KKUUUUKK____",
      "____KWWWWWWK____",
      "___KKWWWWWWKK___",
      "__KKKWWWWWWKKK__",
      "__KKKWWWWWWKKK__",
      "__KKKWWWWWWKKK__",
      "___KKWWWWWWKK___",
      "____KWWWWWWK____",
      "_____UUUUUU_____",
      "_____UU__UU_____"
    ]
  },
  shiba: {
    id: 'shiba',
    name: 'シバイヌ',
    icon: '🐕',
    desc: 'しっぽフリフリ。ボールを投げると大喜び！',
    cost: 100,
    w: 16,
    h: 16,
    grid: [
      "__OO______OO____",
      "_OOOO____OOOO___",
      "_OOOOOOOOOOOO___",
      "_OWW_OOOO_WWO___",
      "_OK__OOOO__KO___",
      "_OWWWWWWWWWWO___",
      "__WWWWKKWWWW____",
      "___WWWWWWWW_____",
      "__OOOOOOOOOO____",
      "_OOOOOOOOOOOO___",
      "_OOOOOOOOOOOOO__",
      "_OOOOOOOOOOOOO__",
      "__OOOOOOOOOOO___",
      "___WW____WW_____",
      "___WW____WW_____",
      "___WW____WW_____"
    ]
  },
  cat: {
    id: 'cat',
    name: 'ミケネコ',
    icon: '🐱',
    desc: '丸くなってすやすや。毛づくろいが日課。',
    cost: 150,
    w: 16,
    h: 16,
    grid: [
      "_OP________PC___",
      "_OO________CC___",
      "_WOOWWWWWWCCW___",
      "_WWWWWWWWWWWW___",
      "_WKWWWWWWWWKW___",
      "_WWWWWPWWWWWW___",
      "_WWWWWWWWWWWW___",
      "__WWWWWWWWWW____",
      "_WOOWWWWWWCCW___",
      "_WOOWWWWWWCCW___",
      "_WWWWWWWWWWWW___",
      "_WWWWWWWWWWWW___",
      "__WWWWWWWWWW____",
      "___WW____WW_____",
      "___WW____WW_____",
      "___PP____PP_____"
    ]
  },
  rabbit: {
    id: 'rabbit',
    name: 'ウサギ',
    icon: '🐰',
    desc: 'ぴょんぴょん跳ねる。人参をあげると大満足。',
    cost: 220,
    w: 16,
    h: 16,
    grid: [
      "_WW________WW___",
      "_WPW______WPW___",
      "_WPW______WPW___",
      "_WPW______WPW___",
      "_WWW______WWW___",
      "__WWWWWWWWWW____",
      "_WWWWWWWWWWWW___",
      "_WWHWWWWWWHWW___",
      "_WWPWWWWWWPWW___",
      "__WWWWWWWWWW____",
      "___WWWWWWWW_____",
      "__WWWWWWWWWW____",
      "_WWWWWWWWWWWW___",
      "_WWWWWWWWWWWWWW_",
      "__WW______WW____",
      "__WW______WW____"
    ]
  },
  alpaca: {
    id: 'alpaca',
    name: 'アルパカ',
    icon: '🦙',
    desc: 'もふもふの貴公子。のんびり首をかしげる。',
    cost: 320,
    w: 16,
    h: 16,
    grid: [
      "____AAAAAAAA____",
      "___AAAAAAAAAA___",
      "___AAKAAAAKAA___",
      "___AAAAAAAAAA___",
      "____AAAAAAAA____",
      "_____AAAAAA_____",
      "_____AAAAAA_____",
      "_____AAAAAA_____",
      "____AAAAAAAA____",
      "__AAAAAAAAAAAA__",
      "_AAAAAAAAAAAAAA_",
      "_AAAAAAAAAAAAAA_",
      "__AAAAAAAAAAAA__",
      "___EE______EE___",
      "___EE______EE___",
      "___KK______KK___"
    ]
  }
};

interface FacilityItem {
  id: string;
  name: string;
  icon: string;
  desc: string;
  cost: number;
  x: number;
  y: number;
  unlocked: boolean;
}

const INITIAL_FACILITIES: FacilityItem[] = [
  { id: 'hotspring', name: 'カピバラ温泉', icon: '♨️', desc: 'あったかい岩風呂。カピバラが温まる。', cost: 50, x: 180, y: 160, unlocked: false },
  { id: 'cherry', name: '満開の桜の木', icon: '🌸', desc: '舞い散る花びらでハピネスUP！', cost: 120, x: 480, y: 130, unlocked: false },
  { id: 'sunflower', name: 'ひまわり畑', icon: '🌻', desc: '太陽に向かって咲く元気なひまわり。', cost: 180, x: 620, y: 320, unlocked: false },
  { id: 'fountain', name: '癒やしの噴水', icon: '⛲', desc: '涼しげな水しぶきと虹色のきらめき。', cost: 280, x: 320, y: 340, unlocked: false }
];

interface AnimalInstance {
  id: number;
  type: string;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;
  speed: number;
  direction: number;
  animTimer: number;
  state: 'idle' | 'walk' | 'eat' | 'sleep' | 'happy';
  stateTimer: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  text: string;
  size?: number;
}

export const PixelZooGame: React.FC<PixelZooGameProps> = ({
  onBackToHub,
  isDark,
  isFullscreen = false,
}) => {
  const [activeTab, setActiveTab] = useState<'game' | 'doc'>('game');
  const [hearts, setHearts] = useState(30);
  const [selectedTool, setSelectedTool] = useState<'pet' | 'feed' | 'ball'>('pet');
  const [weatherIndex, setWeatherIndex] = useState(0);
  const [muted, setMuted] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [unlockedAnimals, setUnlockedAnimals] = useState<Record<string, boolean>>({
    panda: true,
    capybara: true,
    redpanda: true,
  });
  const [facilities, setFacilities] = useState<FacilityItem[]>(INITIAL_FACILITIES);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const bgmTimerRef = useRef<number | null>(null);

  const animalsRef = useRef<AnimalInstance[]>([]);
  const foodsRef = useRef<{ x: number; y: number; icon: string }[]>([]);
  const ballsRef = useRef<{ x: number; y: number; vx: number; vy: number }[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const cameraRef = useRef({ x: 0, y: 0, zoom: 1.3 });
  const worldSize = useRef({ width: 900, height: 650 });

  const weathers = [
    { name: '☀️ 昼 (ぽかぽか)', icon: <Sun className="w-4 h-4 text-amber-500" />, ground: '#79a86a', tint: null, rain: false },
    { name: '🌅 夕方 (エモい夕焼け)', icon: <Sunset className="w-4 h-4 text-orange-500" />, ground: '#a67c52', tint: 'rgba(255, 120, 50, 0.15)', rain: false },
    { name: '🌙 夜 (満天の星空)', icon: <Moon className="w-4 h-4 text-indigo-400" />, ground: '#2e493a', tint: 'rgba(10, 20, 50, 0.45)', rain: false },
    { name: '🌧️ 雨 (しとしと癒やし)', icon: <CloudRain className="w-4 h-4 text-sky-400" />, ground: '#547255', tint: null, rain: true },
  ];

  const initAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtxRef.current = new AudioCtx();
    } else if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  }, []);

  const playPetSound = useCallback(() => {
    if (muted) return;
    initAudio();
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(523.25, now);
    osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.15);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  }, [muted, initAudio]);

  const playEatSound = useCallback(() => {
    if (muted) return;
    initAudio();
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const now = ctx.currentTime;
    for (let i = 0; i < 2; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320 + i * 80, now + i * 0.1);
      gain.gain.setValueAtTime(0.18, now + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.09);
    }
  }, [muted, initAudio]);

  const playBounceSound = useCallback(() => {
    if (muted) return;
    initAudio();
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.12);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  }, [muted, initAudio]);

  const playUnlockSound = useCallback(() => {
    if (muted) return;
    initAudio();
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const now = ctx.currentTime + idx * 0.09;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.26);
    });
  }, [muted, initAudio]);

  // BGMループ
  useEffect(() => {
    const scale = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25];
    const pattern = [0, 2, 4, 3, 1, 2, 5, 4, 2, 3, 1, 0, 4, 5, 7, 5];
    let noteIdx = 0;

    const timer = window.setInterval(() => {
      if (muted || !audioCtxRef.current || audioCtxRef.current.state !== 'running') return;
      const freq = scale[pattern[noteIdx % pattern.length]];
      noteIdx++;
      const now = audioCtxRef.current.currentTime;
      const osc = audioCtxRef.current.createOscillator();
      const gain = audioCtxRef.current.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
      osc.connect(gain);
      gain.connect(audioCtxRef.current.destination);
      osc.start(now);
      osc.stop(now + 0.8);
    }, 450);

    bgmTimerRef.current = timer;
    return () => clearInterval(timer);
  }, [muted]);

  // 初期動物配置
  useEffect(() => {
    if (animalsRef.current.length === 0) {
      animalsRef.current = [
        {
          id: 1,
          type: 'panda',
          name: 'パンダ',
          x: 220,
          y: 260,
          vx: 0,
          vy: 0,
          targetX: 220,
          targetY: 260,
          speed: 0.8,
          direction: 1,
          animTimer: 0,
          state: 'idle',
          stateTimer: 80,
        },
        {
          id: 2,
          type: 'capybara',
          name: 'カピバラ',
          x: 380,
          y: 240,
          vx: 0,
          vy: 0,
          targetX: 380,
          targetY: 240,
          speed: 0.6,
          direction: 1,
          animTimer: 0,
          state: 'idle',
          stateTimer: 90,
        },
        {
          id: 3,
          type: 'redpanda',
          name: 'レッサーパンダ',
          x: 500,
          y: 280,
          vx: 0,
          vy: 0,
          targetX: 500,
          targetY: 280,
          speed: 0.9,
          direction: -1,
          animTimer: 0,
          state: 'idle',
          stateTimer: 70,
        },
      ];
    }
  }, []);

  const addHearts = useCallback((amt: number, x?: number, y?: number, playSound = true) => {
    setHearts(prev => prev + amt);
    if (x !== undefined && y !== undefined) {
      particlesRef.current.push({
        x: x + (Math.random() - 0.5) * 10,
        y: y,
        vx: (Math.random() - 0.5) * 0.6,
        vy: -1.2,
        life: 50,
        text: '💖',
        size: 18,
      });
    }
    if (playSound) playPetSound();
  }, [playPetSound]);

  // 1文字1ピクセル形式の描画
  const drawPixelMatrix = (
    ctx: CanvasRenderingContext2D,
    tmpl: AnimalTemplate,
    x: number,
    y: number,
    scale = 2.5,
    flipX = false,
    animFrame = 0,
    actionState = 'idle'
  ) => {
    const grid = tmpl.grid;
    const w = tmpl.w;
    const h = tmpl.h;

    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));

    if (flipX) {
      ctx.scale(-1, 1);
      ctx.translate(-w * scale, 0);
    }

    let offsetY = 0;
    let stretchY = 1;

    if (actionState === 'walk') {
      offsetY = Math.sin(animFrame * 0.4) * 2;
    } else if (actionState === 'happy') {
      offsetY = -Math.abs(Math.sin(animFrame * 0.5)) * 6;
    } else if (actionState === 'sleep') {
      stretchY = 0.9 + Math.sin(animFrame * 0.1) * 0.05;
      offsetY = 2;
    }

    ctx.translate(0, offsetY);
    ctx.scale(1, stretchY);

    for (let r = 0; r < h; r++) {
      const row = grid[r];
      for (let c = 0; c < w; c++) {
        const code = row[c];
        if (code === '_') continue;
        const color = PAL[code];
        if (!color) continue;

        ctx.fillStyle = color;
        ctx.fillRect(Math.round(c * scale), Math.round(r * scale), Math.ceil(scale), Math.ceil(scale));
      }
    }

    if (actionState === 'sleep') {
      ctx.fillStyle = '#fff';
      ctx.font = '10px monospace';
      ctx.fillText('z', w * scale + 2, -2 - (animFrame % 20) * 0.5);
      ctx.fillText('Z', w * scale + 6, -8 - (animFrame % 20) * 0.5);
    }

    ctx.restore();
  };

  // メインループ
  useEffect(() => {
    if (activeTab !== 'game') return;

    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const curWeather = weathers[weatherIndex];
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(dpr, dpr);

      ctx.save();
      ctx.translate(cameraRef.current.x, cameraRef.current.y);
      ctx.scale(cameraRef.current.zoom, cameraRef.current.zoom);

      // 地面
      ctx.fillStyle = curWeather.ground;
      ctx.fillRect(0, 0, worldSize.current.width, worldSize.current.height);

      // 小道
      ctx.fillStyle = '#c5a059';
      ctx.fillRect(60, 290, worldSize.current.width - 120, 48);
      ctx.fillRect(290, 80, 44, worldSize.current.height - 160);

      // 池
      ctx.fillStyle = '#42a5f5';
      ctx.beginPath();
      ctx.ellipse(720, 200, 90, 60, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#29b6f6';
      ctx.beginPath();
      ctx.ellipse(720, 200, 80, 50, 0, 0, Math.PI * 2);
      ctx.fill();

      // 施設
      facilities.forEach(fac => {
        if (!fac.unlocked) return;
        if (fac.id === 'hotspring') {
          ctx.fillStyle = '#616161';
          ctx.beginPath();
          ctx.ellipse(fac.x, fac.y, 65, 45, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#4fc3f7';
          ctx.beginPath();
          ctx.ellipse(fac.x, fac.y, 55, 36, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fbc02d';
          ctx.beginPath();
          ctx.arc(fac.x - 15, fac.y - 5, 6, 0, Math.PI * 2);
          ctx.arc(fac.x + 20, fac.y + 8, 7, 0, Math.PI * 2);
          ctx.fill();
        } else if (fac.id === 'cherry') {
          ctx.fillStyle = '#5d4037';
          ctx.fillRect(fac.x - 8, fac.y, 16, 40);
          ctx.fillStyle = '#f48fb1';
          ctx.beginPath();
          ctx.arc(fac.x, fac.y - 15, 38, 0, Math.PI * 2);
          ctx.fill();
        } else if (fac.id === 'sunflower') {
          for (let dx = -30; dx <= 30; dx += 20) {
            ctx.fillStyle = '#388e3c';
            ctx.fillRect(fac.x + dx - 2, fac.y, 4, 25);
            ctx.fillStyle = '#fbc02d';
            ctx.beginPath();
            ctx.arc(fac.x + dx, fac.y - 6, 12, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (fac.id === 'fountain') {
          ctx.fillStyle = '#b0bec5';
          ctx.beginPath();
          ctx.ellipse(fac.x, fac.y, 44, 30, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#0288d1';
          ctx.beginPath();
          ctx.ellipse(fac.x, fac.y, 36, 22, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // エサ
      foodsRef.current.forEach(f => {
        ctx.font = '16px serif';
        ctx.fillText(f.icon, f.x - 8, f.y + 6);
      });

      // ボール
      ballsRef.current.forEach(b => {
        b.x += b.vx;
        b.y += b.vy;
        b.vx *= 0.97;
        b.vy *= 0.97;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(b.x, b.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#e53935';
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      // 動物
      animalsRef.current.sort((a, b) => a.y - b.y);
      animalsRef.current.forEach(a => {
        a.animTimer++;
        a.stateTimer--;

        if (a.stateTimer <= 0) {
          const r = Math.random();
          if (r < 0.45) {
            a.state = 'walk';
            a.targetX = Math.max(80, Math.min(worldSize.current.width - 80, a.x + (Math.random() - 0.5) * 200));
            a.targetY = Math.max(80, Math.min(worldSize.current.height - 80, a.y + (Math.random() - 0.5) * 160));
            a.stateTimer = 80 + Math.floor(Math.random() * 120);
          } else if (r < 0.8) {
            a.state = 'idle';
            a.stateTimer = 60 + Math.floor(Math.random() * 90);
          } else if (curWeather.name.includes('夜') || r < 0.92) {
            a.state = 'sleep';
            a.stateTimer = 180 + Math.floor(Math.random() * 200);
          } else {
            a.state = 'happy';
            a.stateTimer = 45;
            addHearts(1, a.x, a.y - 20, false);
          }
        }

        if (foodsRef.current.length > 0 && a.state !== 'sleep') {
          const food = foodsRef.current[0];
          const dist = Math.hypot(food.x - a.x, food.y - a.y);
          if (dist < 180) {
            a.targetX = food.x;
            a.targetY = food.y;
            a.state = 'walk';
            if (dist < 20) {
              a.state = 'eat';
              a.stateTimer = 60;
              playEatSound();
              addHearts(3, a.x, a.y - 24);
              foodsRef.current.splice(0, 1);
            }
          }
        }

        if (a.state === 'walk') {
          const dx = a.targetX - a.x;
          const dy = animalDeltaY(a.targetY, a.y);
          const dist = Math.hypot(dx, dy);
          if (dist > 4) {
            a.vx = (dx / dist) * a.speed;
            a.vy = (dy / dist) * a.speed;
            a.x += a.vx;
            a.y += a.vy;
            a.direction = a.vx >= 0 ? 1 : -1;
          } else {
            a.state = 'idle';
          }
        }

        const tmpl = ANIMAL_TEMPLATES[a.type];
        if (tmpl) {
          drawPixelMatrix(
            ctx,
            tmpl,
            a.x - (tmpl.w * 2.5) / 2,
            a.y - (tmpl.h * 2.5) / 2,
            2.5,
            a.direction === -1,
            a.animTimer,
            a.state
          );
        }
      });

      // パーティクル
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        ctx.save();
        ctx.font = `${p.size || 16}px sans-serif`;
        ctx.globalAlpha = Math.max(0, p.life / 60);
        ctx.fillText(p.text, p.x, p.y);
        ctx.restore();
        if (p.life <= 0) particlesRef.current.splice(i, 1);
      }

      // 天候ティント
      if (curWeather.tint) {
        ctx.fillStyle = curWeather.tint;
        ctx.fillRect(0, 0, worldSize.current.width, worldSize.current.height);
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [activeTab, weatherIndex, facilities, playEatSound, addHearts]);

  function animalDeltaY(targetY: number, curY: number) {
    return targetY - curY;
  }

  // タップ＆ドラッグ＆ホイール
  const dragStart = useRef({ x: 0, y: 0, isDragging: false, moved: false });

  const handlePointerDown = (e: React.PointerEvent) => {
    dragStart.current = {
      x: e.clientX - cameraRef.current.x,
      y: e.clientY - cameraRef.current.y,
      isDragging: true,
      moved: false,
    };
    initAudio();
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStart.current.isDragging) return;
    const newX = e.clientX - dragStart.current.x;
    const newY = e.clientY - dragStart.current.y;
    if (Math.abs(newX - cameraRef.current.x) > 4 || Math.abs(newY - cameraRef.current.y) > 4) {
      dragStart.current.moved = true;
    }
    cameraRef.current.x = newX;
    cameraRef.current.y = newY;
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragStart.current.isDragging) return;
    dragStart.current.isDragging = false;

    if (!dragStart.current.moved && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const worldX = (screenX - cameraRef.current.x) / cameraRef.current.zoom;
      const worldY = (screenY - cameraRef.current.y) / cameraRef.current.zoom;

      let hit = false;
      for (const a of animalsRef.current) {
        if (Math.hypot(a.x - worldX, a.y - worldY) < 32) {
          a.state = 'happy';
          a.stateTimer = 60;
          addHearts(2, a.x, a.y - 25);
          hit = true;
          break;
        }
      }

      if (!hit) {
        if (selectedTool === 'feed') {
          foodsRef.current.push({
            x: worldX,
            y: worldY,
            icon: ['🍎', '🎋', '🥕', '🐟'][Math.floor(Math.random() * 4)],
          });
          playBounceSound();
        } else if (selectedTool === 'ball') {
          ballsRef.current.push({
            x: worldX,
            y: worldY,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
          });
          playBounceSound();
        }
      }
    }
  };

  const unlockAnimal = (type: string) => {
    const tmpl = ANIMAL_TEMPLATES[type];
    if (!unlockedAnimals[type]) {
      if (hearts < tmpl.cost) return;
      setHearts(h => h - tmpl.cost);
      setUnlockedAnimals(prev => ({ ...prev, [type]: true }));
      playUnlockSound();
    }
    animalsRef.current.push({
      id: Date.now(),
      type,
      name: tmpl.name,
      x: 200 + Math.random() * 400,
      y: 200 + Math.random() * 250,
      vx: 0,
      vy: 0,
      targetX: 300,
      targetY: 300,
      speed: 0.7,
      direction: 1,
      animTimer: 0,
      state: 'happy',
      stateTimer: 60,
    });
    setShopOpen(false);
  };

  const unlockFacility = (facId: string) => {
    const fac = facilities.find(f => f.id === facId);
    if (!fac || fac.unlocked || hearts < fac.cost) return;
    setHearts(h => h - fac.cost);
    setFacilities(prev => prev.map(f => f.id === facId ? { ...f, unlocked: true } : f));
    playUnlockSound();
    setShopOpen(false);
  };

  return (
    <div
      className={`w-full h-full flex flex-col select-none overflow-hidden ${
        isDark ? 'bg-zinc-950 text-zinc-100' : 'bg-emerald-950 text-zinc-800'
      } ${isFullscreen ? 'fixed inset-0 z-50 p-0 m-0' : 'relative'}`}
    >
      {/* トップナビゲーションバー */}
      <div className="h-14 bg-white/95 dark:bg-zinc-900/95 backdrop-blur border-b border-emerald-500/20 px-4 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToHub}
            className="p-2 rounded-xl bg-emerald-100 dark:bg-zinc-800 text-emerald-800 dark:text-emerald-300 hover:scale-105 transition"
            title="ゲーム一覧へ戻る"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xl">🐼</span>
            <span className="font-extrabold text-sm sm:text-base text-emerald-800 dark:text-emerald-400">
              ぽかぽかドット動物園
            </span>
          </div>
        </div>

        {/* タブ切り替え */}
        <div className="flex items-center bg-emerald-100/70 dark:bg-zinc-800/80 p-1 rounded-2xl gap-1">
          <button
            onClick={() => setActiveTab('game')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 transition ${
              activeTab === 'game'
                ? 'bg-emerald-700 text-white shadow'
                : 'text-emerald-800 dark:text-zinc-300 hover:bg-emerald-200/50'
            }`}
          >
            <Gamepad2 className="w-4 h-4" />
            <span>遊ぶ</span>
          </button>
          <button
            onClick={() => setActiveTab('doc')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 transition ${
              activeTab === 'doc'
                ? 'bg-emerald-700 text-white shadow'
                : 'text-emerald-800 dark:text-zinc-300 hover:bg-emerald-200/50'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>仕様書</span>
          </button>
        </div>

        {/* サウンド＆天候 */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeatherIndex(w => (w + 1) % weathers.length)}
            className="p-2 rounded-xl bg-emerald-100 dark:bg-zinc-800 text-emerald-800 dark:text-emerald-300 hover:scale-105 transition"
            title="天候・時間帯を変更"
          >
            {weathers[weatherIndex].icon}
          </button>
          <button
            onClick={() => {
              initAudio();
              setMuted(m => !m);
            }}
            className="p-2 rounded-xl bg-emerald-100 dark:bg-zinc-800 text-emerald-800 dark:text-emerald-300 hover:scale-105 transition"
            title="サウンド切替"
          >
            {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 relative overflow-hidden">
        {activeTab === 'game' ? (
          <div className="w-full h-full relative">
            <canvas
              ref={canvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              className="w-full h-full block cursor-grab active:cursor-grabbing touch-none"
              style={{ imageRendering: 'pixelated' }}
            />

            {/* ゲーム内HUD */}
            <div className="absolute inset-0 pointer-events-none p-3 flex flex-col justify-between">
              <div className="flex justify-between items-center pointer-events-auto">
                <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur px-4 py-2 rounded-2xl border border-emerald-500/30 shadow flex items-center gap-4">
                  <div className="flex items-center gap-1.5 font-black text-rose-500 text-sm sm:text-base">
                    <Heart className="w-4 h-4 fill-rose-500" />
                    <span>{hearts}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm">
                    <span>🐾</span>
                    <span>{animalsRef.current.length}匹</span>
                  </div>
                </div>

                <div
                  onClick={() => setWeatherIndex(w => (w + 1) % weathers.length)}
                  className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur px-3 py-1.5 rounded-2xl border border-emerald-500/30 shadow text-xs font-bold text-emerald-800 dark:text-emerald-300 cursor-pointer flex items-center gap-1.5"
                >
                  {weathers[weatherIndex].icon}
                  <span>{weathers[weatherIndex].name}</span>
                </div>
              </div>

              {/* 下部ツールバー */}
              <div className="flex flex-col items-center gap-2 pointer-events-auto mb-2">
                <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur px-3 py-1.5 rounded-3xl border border-emerald-500/30 shadow flex items-center gap-2">
                  <button
                    onClick={() => setSelectedTool('pet')}
                    className={`px-3.5 py-1.5 rounded-2xl font-bold text-xs flex items-center gap-1.5 transition ${
                      selectedTool === 'pet'
                        ? 'bg-emerald-700 text-white shadow'
                        : 'bg-emerald-100/70 dark:bg-zinc-800 text-emerald-800 dark:text-zinc-200'
                    }`}
                  >
                    <Smile className="w-4 h-4" />
                    <span>なでる</span>
                  </button>
                  <button
                    onClick={() => setSelectedTool('feed')}
                    className={`px-3.5 py-1.5 rounded-2xl font-bold text-xs flex items-center gap-1.5 transition ${
                      selectedTool === 'feed'
                        ? 'bg-emerald-700 text-white shadow'
                        : 'bg-emerald-100/70 dark:bg-zinc-800 text-emerald-800 dark:text-zinc-200'
                    }`}
                  >
                    <Apple className="w-4 h-4" />
                    <span>エサやり</span>
                  </button>
                  <button
                    onClick={() => setSelectedTool('ball')}
                    className={`px-3.5 py-1.5 rounded-2xl font-bold text-xs flex items-center gap-1.5 transition ${
                      selectedTool === 'ball'
                        ? 'bg-emerald-700 text-white shadow'
                        : 'bg-emerald-100/70 dark:bg-zinc-800 text-emerald-800 dark:text-zinc-200'
                    }`}
                  >
                    <CircleDot className="w-4 h-4" />
                    <span>ボール</span>
                  </button>
                  <button
                    onClick={() => setShopOpen(true)}
                    className="px-3.5 py-1.5 rounded-2xl font-bold text-xs bg-amber-500 text-white flex items-center gap-1.5 shadow hover:bg-amber-600 transition"
                  >
                    <Store className="w-4 h-4" />
                    <span>なかま・施設</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* 仕様書ビュー */
          <div className="w-full h-full overflow-y-auto p-4 sm:p-8 bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200">
            <div className="max-w-4xl mx-auto bg-white dark:bg-zinc-800 p-6 sm:p-10 rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-sm space-y-8 leading-relaxed">
              <div className="border-b-2 border-emerald-500 pb-4">
                <span className="text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 rounded-full">
                  Game Design Document / v1.0.0
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-emerald-800 dark:text-emerald-400 mt-3">
                  『ぽかぽかドット動物園 (Pixel Zoo Sanctuary)』 開発仕様書
                </h1>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">
                  プログラム描画ピクセルアートによる癒やしのブラウザ＆スマートフォン対応動物園ゲーム
                </p>
              </div>

              <div>
                <h2 className="text-xl font-bold text-emerald-700 dark:text-emerald-400 border-l-4 border-emerald-500 pl-3 mb-3">
                  1. ゲーム概要・企画コンセプト
                </h2>
                <p className="text-sm">
                  <strong>コンセプト：</strong>「かわいい動物たちを眺めて、触れ合って、心がふんわり癒やされるドット絵動物園」<br />
                  外部画像アセットに依存せず、すべての動物・植物・施設を<strong>プログラム内のカラーパレットとドットマトリクス（Canvas 2D）</strong>でクリスプに描画します。
                </p>
              </div>

              <div>
                <h2 className="text-xl font-bold text-emerald-700 dark:text-emerald-400 border-l-4 border-emerald-500 pl-3 mb-3">
                  2. 登場動物キャラクター仕様
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {Object.values(ANIMAL_TEMPLATES).map(tmpl => (
                    <div key={tmpl.id} className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 text-center">
                      <div className="text-3xl mb-1">{tmpl.icon}</div>
                      <div className="font-bold text-sm text-emerald-700 dark:text-emerald-400">{tmpl.name}</div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{tmpl.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold text-emerald-700 dark:text-emerald-400 border-l-4 border-emerald-500 pl-3 mb-3">
                  3. ゲームシステム＆コア・ゲームループ
                </h2>
                <ul className="list-disc list-inside text-sm space-y-2">
                  <li><strong>なでなで：</strong>動物をタップして触れ合うとハートがポロロンと湧き出る。</li>
                  <li><strong>エサやり：</strong>地面をタップして美味しいごはんを投げると、近くの動物がトコトコ寄ってきてモグモグ食べる。</li>
                  <li><strong>ボール遊び：</strong>ボールを転がすと動物たちが追いかけて楽しく遊ぶ。</li>
                  <li><strong>温泉＆昼夜サイクル：</strong>カピバラ温泉や桜の木を設置でき、時間帯（昼・夕・夜・雨）に応じて動物たちが眠ったり活発に行動する。</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-bold text-emerald-700 dark:text-emerald-400 border-l-4 border-emerald-500 pl-3 mb-3">
                  4. 操作系＆スマホ・フルスクリーン最適化仕様
                </h2>
                <p className="text-sm">
                  スワイプでのパークスクロール、ピンチズーム、タップ操作に対応。フルスクリーン時はビューポート限界までダイナミックに拡大表示されます（AGENTS.md ルール1遵守）。
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ショップモーダル */}
      {shopOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border-2 border-emerald-500 shadow-2xl max-w-md w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-4 bg-emerald-50 dark:bg-zinc-800 border-b border-emerald-100 dark:border-zinc-700 flex items-center justify-between">
              <div className="font-extrabold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <span>🎁</span>
                <span>なかま・施設をふやす</span>
              </div>
              <button
                onClick={() => setShopOpen(false)}
                className="p-1 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto grid grid-cols-2 gap-3">
              {Object.values(ANIMAL_TEMPLATES).map(tmpl => {
                const unlocked = unlockedAnimals[tmpl.id];
                return (
                  <div
                    key={tmpl.id}
                    className={`p-3 rounded-xl border flex flex-col items-center text-center ${
                      unlocked ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300' : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700'
                    }`}
                  >
                    <div className="text-3xl mb-1">{tmpl.icon}</div>
                    <div className="font-bold text-xs text-zinc-800 dark:text-zinc-200">{tmpl.name}</div>
                    <div className="text-xs font-bold text-rose-500 my-1 flex items-center gap-1">
                      <Heart className="w-3 h-3 fill-rose-500" />
                      <span>{tmpl.cost}</span>
                    </div>
                    <button
                      onClick={() => unlockAnimal(tmpl.id)}
                      disabled={!unlocked && hearts < tmpl.cost}
                      className={`w-full py-1 rounded-lg text-xs font-bold transition ${
                        unlocked
                          ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                          : hearts >= tmpl.cost
                          ? 'bg-amber-500 text-white hover:bg-amber-600'
                          : 'bg-zinc-300 dark:bg-zinc-700 text-zinc-500 cursor-not-allowed'
                      }`}
                    >
                      {unlocked ? 'お迎えする' : 'なかまにする'}
                    </button>
                  </div>
                );
              })}

              {facilities.map(fac => (
                <div
                  key={fac.id}
                  className={`p-3 rounded-xl border flex flex-col items-center text-center ${
                    fac.unlocked ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300' : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700'
                  }`}
                >
                  <div className="text-3xl mb-1">{fac.icon}</div>
                  <div className="font-bold text-xs text-zinc-800 dark:text-zinc-200">{fac.name}</div>
                  <div className="text-xs font-bold text-rose-500 my-1 flex items-center gap-1">
                    <Heart className="w-3 h-3 fill-rose-500" />
                    <span>{fac.cost}</span>
                  </div>
                  <button
                    onClick={() => unlockFacility(fac.id)}
                    disabled={fac.unlocked || hearts < fac.cost}
                    className={`w-full py-1 rounded-lg text-xs font-bold transition ${
                      fac.unlocked
                        ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
                        : hearts >= fac.cost
                        ? 'bg-amber-500 text-white hover:bg-amber-600'
                        : 'bg-zinc-300 dark:bg-zinc-700 text-zinc-500 cursor-not-allowed'
                    }`}
                  >
                    {fac.unlocked ? '設置済み' : '建設する'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
