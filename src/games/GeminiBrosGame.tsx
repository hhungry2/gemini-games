import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Volume2, VolumeX, Tv, Trophy } from 'lucide-react';

interface GeminiBrosGameProps {
  onBackToHub: () => void;
  isDark: boolean;
}

const HIGH_SCORE_KEY = 'gemini_bros_high_score';

export const GeminiBrosGame: React.FC<GeminiBrosGameProps> = ({ onBackToHub, isDark }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [crtEnabled, setCrtEnabled] = useState(true);
  const [highScore, setHighScore] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(HIGH_SCORE_KEY);
      if (saved) return parseInt(saved, 10) || 0;
    }
    return 0;
  });

  // タッチ操作用コールバックへの参照
  const touchHandlersRef = useRef<{
    onKeyStart: (key: string) => void;
    onKeyEnd: (key: string) => void;
  }>({
    onKeyStart: () => {},
    onKeyEnd: () => {},
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    const W = canvas.width;
    const H = canvas.height;
    const TILE = 36;
    const GROUND_Y = 468;
    const GRAVITY = 1750;

    let isMounted = true;
    let animId: number | null = null;
    let audioCtx: AudioContext | null = null;
    let localSoundEnabled = soundEnabled;

    function initAudio() {
      if (!audioCtx) {
        const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtx = new AudioCtxClass();
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }
    }

    function playTone(freq: number, duration: number, type: OscillatorType = 'square', vol = 0.05, delay = 0) {
      if (!localSoundEnabled || !audioCtx) return;
      try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const start = audioCtx.currentTime + delay;
        osc.type = type;
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(vol, start);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(start);
        osc.stop(start + duration);
      } catch {}
    }

    function playNoise(duration: number, vol = 0.04, delay = 0) {
      if (!localSoundEnabled || !audioCtx) return;
      try {
        const bufferSize = audioCtx.sampleRate * duration;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;
        const gain = audioCtx.createGain();
        const start = audioCtx.currentTime + delay;
        gain.gain.setValueAtTime(vol, start);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        noise.connect(gain);
        gain.connect(audioCtx.destination);
        noise.start(start);
      } catch {}
    }

    const SFX = {
      jump() {
        playTone(330, 0.07, 'square', 0.06, 0);
        playTone(493, 0.12, 'square', 0.05, 0.05);
      },
      coin() {
        playTone(987, 0.08, 'square', 0.08, 0);
        playTone(1318, 0.28, 'square', 0.08, 0.08);
      },
      powerup() {
        [330, 392, 659, 523, 587, 784].forEach((f, i) => {
          playTone(f, 0.08, 'triangle', 0.07, i * 0.06);
        });
      },
      powerdown() {
        [600, 500, 400, 300].forEach((f, i) => {
          playTone(f, 0.09, 'sawtooth', 0.06, i * 0.07);
        });
      },
      stomp() {
        playTone(220, 0.06, 'square', 0.08, 0);
        playTone(110, 0.1, 'triangle', 0.08, 0.04);
      },
      bump() {
        playTone(130, 0.08, 'triangle', 0.09, 0);
      },
      breakBlock() {
        playTone(110, 0.12, 'square', 0.07, 0);
        playTone(70, 0.15, 'sawtooth', 0.07, 0.04);
        playNoise(0.1, 0.06, 0);
      },
      kick() {
        playTone(160, 0.08, 'square', 0.08, 0);
        playTone(260, 0.12, 'square', 0.08, 0.04);
      },
      fireball() {
        playTone(550, 0.05, 'triangle', 0.08, 0);
        playTone(750, 0.09, 'sawtooth', 0.07, 0.04);
      },
      fireHit() {
        playTone(120, 0.1, 'sawtooth', 0.08, 0);
        playNoise(0.08, 0.05, 0);
      },
      pipe() {
        [200, 180, 160, 140, 120].forEach((f, i) => {
          playTone(f, 0.08, 'triangle', 0.07, i * 0.06);
        });
      },
      flag() {
        [440, 523, 659, 784, 880, 1046].forEach((f, i) => {
          playTone(f, 0.12, 'square', 0.06, i * 0.09);
        });
      },
      clear() {
        const notes = [523, 659, 784, 1046, 784, 1046, 1318];
        notes.forEach((f, i) => playTone(f, 0.18, 'triangle', 0.09, i * 0.12));
      },
      death() {
        [400, 350, 300, 250, 200, 150].forEach((f, i) => {
          playTone(f, 0.14, 'sawtooth', 0.08, i * 0.11);
        });
      },
      gameover() {
        [330, 261, 220, 174, 164, 130].forEach((f, i) => {
          playTone(f, 0.25, 'triangle', 0.08, i * 0.18);
        });
      },
      bossHit() {
        playTone(90, 0.2, 'sawtooth', 0.1, 0);
        playNoise(0.2, 0.08, 0);
      },
      bossRoar() {
        [120, 100, 80, 60].forEach((f, i) => {
          playTone(f, 0.15, 'sawtooth', 0.12, i * 0.08);
        });
        playNoise(0.35, 0.1, 0);
      },
      oneup() {
        [330, 392, 659, 523, 587, 784, 988, 1318].forEach((f, i) => {
          playTone(f, 0.09, 'sine', 0.08, i * 0.07);
        });
      },
    };

    const BGM_TRACKS = {
      overworld: {
        tempo: 140,
        lead: [
          659, 659, 0, 659, 0, 523, 659, 0, 784, 0, 0, 0, 392, 0, 0, 0,
          523, 0, 0, 392, 0, 0, 330, 0, 0, 440, 0, 493, 0, 466, 440, 0,
          392, 659, 784, 880, 0, 698, 784, 0, 659, 0, 523, 587, 493, 0, 0, 0,
          523, 0, 0, 392, 0, 0, 330, 0, 0, 440, 0, 493, 0, 466, 440, 0,
        ],
        bass: [
          262, 0, 262, 0, 262, 0, 262, 0, 196, 0, 196, 0, 196, 0, 196, 0,
          174, 0, 174, 0, 174, 0, 174, 0, 196, 0, 196, 0, 262, 0, 196, 0,
          174, 0, 174, 0, 174, 0, 174, 0, 196, 0, 196, 0, 262, 0, 196, 0,
          174, 0, 174, 0, 174, 0, 174, 0, 196, 0, 196, 0, 262, 0, 196, 0,
        ],
      },
      underground: {
        tempo: 120,
        lead: [
          523, 1046, 493, 987, 466, 932, 440, 880, 0, 0, 0, 0, 0, 0, 0, 0,
          440, 880, 415, 830, 392, 784, 370, 740, 0, 0, 0, 0, 0, 0, 0, 0,
          262, 277, 294, 311, 330, 349, 370, 392, 415, 440, 466, 493, 523, 0, 0, 0,
          523, 0, 493, 0, 466, 0, 440, 0, 392, 0, 349, 0, 330, 0, 294, 0,
        ],
        bass: [
          130, 0, 130, 130, 0, 130, 0, 130, 123, 0, 123, 123, 0, 123, 0, 123,
          116, 0, 116, 116, 0, 116, 0, 116, 110, 0, 110, 110, 0, 110, 0, 110,
          130, 0, 138, 0, 146, 0, 155, 0, 164, 0, 174, 0, 185, 0, 196, 0,
          261, 0, 246, 0, 233, 0, 220, 0, 196, 0, 174, 0, 164, 0, 146, 0,
        ],
      },
      castle: {
        tempo: 155,
        lead: [
          220, 0, 220, 246, 261, 0, 246, 0, 220, 0, 196, 0, 220, 0, 0, 0,
          174, 0, 174, 196, 220, 0, 196, 0, 174, 0, 164, 0, 174, 0, 0, 0,
          220, 246, 261, 293, 329, 0, 293, 0, 261, 0, 246, 0, 220, 0, 0, 0,
          164, 0, 174, 0, 196, 0, 220, 0, 246, 0, 261, 0, 293, 0, 329, 0,
        ],
        bass: [
          110, 110, 0, 110, 110, 0, 110, 0, 98, 98, 0, 98, 98, 0, 98, 0,
          87, 87, 0, 87, 87, 0, 87, 0, 82, 82, 0, 82, 82, 0, 82, 0,
          110, 0, 110, 0, 110, 0, 110, 0, 98, 0, 98, 0, 98, 0, 98, 0,
          82, 0, 87, 0, 98, 0, 110, 0, 123, 0, 130, 0, 146, 0, 164, 0,
        ],
      },
      star: {
        tempo: 190,
        lead: [
          659, 784, 987, 1318, 987, 784, 659, 784, 587, 740, 880, 1174, 880, 740, 587, 740,
          523, 659, 784, 1046, 784, 659, 523, 659, 493, 587, 740, 987, 740, 587, 493, 587,
        ],
        bass: [
          329, 0, 329, 0, 329, 0, 329, 0, 293, 0, 293, 0, 293, 0, 293, 0,
          261, 0, 261, 0, 261, 0, 261, 0, 246, 0, 246, 0, 246, 0, 246, 0,
        ],
      },
    };

    let currentBgmType: keyof typeof BGM_TRACKS | null = null;
    let bgmStep = 0;
    let bgmTimer = 0;

    function updateBGM(dt: number, state: typeof game) {
      if (!localSoundEnabled || !audioCtx) return;
      let desired: keyof typeof BGM_TRACKS | null = null;
      if (state.mode === 'playing') {
        if (state.player && state.player.starTimer > 0) {
          desired = 'star';
        } else if (state.currentWorld === 4) {
          desired = 'castle';
        } else if (state.currentWorld === 2 || state.inSubZone) {
          desired = 'underground';
        } else {
          desired = 'overworld';
        }
      }

      if (desired !== currentBgmType) {
        currentBgmType = desired;
        bgmStep = 0;
        bgmTimer = 0;
      }

      if (!currentBgmType || !BGM_TRACKS[currentBgmType]) return;

      const track = BGM_TRACKS[currentBgmType];
      const stepTime = 60 / track.tempo / 4;
      bgmTimer += dt;

      while (bgmTimer >= stepTime) {
        bgmTimer -= stepTime;
        const leadFreq = track.lead[bgmStep % track.lead.length];
        const bassFreq = track.bass[bgmStep % track.bass.length];

        if (leadFreq > 0) {
          playTone(leadFreq, stepTime * 0.85, 'square', 0.028, 0);
        }
        if (bassFreq > 0) {
          playTone(bassFreq, stepTime * 0.9, 'triangle', 0.045, 0);
        }
        if (bgmStep % 4 === 0) {
          playNoise(0.03, 0.015, 0);
        } else if (bgmStep % 8 === 4) {
          playNoise(0.04, 0.025, 0);
        }

        bgmStep++;
      }
    }

    const keys = {
      left: false,
      right: false,
      up: false,
      down: false,
      jump: false,
      run: false,
    };
    const pressed = { jump: false, run: false, pause: false };

    const keyMapping: Record<string, keyof typeof keys> = {
      ArrowLeft: 'left',
      KeyA: 'left',
      ArrowRight: 'right',
      KeyD: 'right',
      ArrowUp: 'up',
      KeyW: 'up',
      ArrowDown: 'down',
      KeyS: 'down',
      Space: 'jump',
      KeyZ: 'jump',
      KeyK: 'jump',
      ShiftLeft: 'run',
      ShiftRight: 'run',
      KeyX: 'run',
      KeyJ: 'run',
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      initAudio();
      if (e.code === 'KeyP' || e.code === 'Escape') {
        pressed.pause = true;
        return;
      }
      if (e.code === 'Enter') {
        if (game.mode === 'title' || game.mode === 'won' || game.mode === 'gameover') {
          game.startOrRestart();
        }
        return;
      }
      const mapped = keyMapping[e.code];
      if (mapped) {
        e.preventDefault();
        if (mapped === 'jump' && !keys.jump) pressed.jump = true;
        if (mapped === 'run' && !keys.run) pressed.run = true;
        keys[mapped] = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const mapped = keyMapping[e.code];
      if (mapped) {
        keys[mapped] = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // タッチハンドラーのセットアップ
    touchHandlersRef.current = {
      onKeyStart: (key: string) => {
        initAudio();
        if (game.mode === 'title' || game.mode === 'won' || game.mode === 'gameover') {
          game.startOrRestart();
        }
        const k = key as keyof typeof keys;
        if (k === 'jump' && !keys.jump) pressed.jump = true;
        if (k === 'run' && !keys.run) pressed.run = true;
        if (keys[k] !== undefined) keys[k] = true;
      },
      onKeyEnd: (key: string) => {
        const k = key as keyof typeof keys;
        if (keys[k] !== undefined) keys[k] = false;
      },
    };

    function clamp(v: number, min: number, max: number) {
      return Math.max(min, Math.min(max, v));
    }

    interface Rect {
      x: number;
      y: number;
      w: number;
      h: number;
    }

    function rectOverlap(a: Rect, b: Rect) {
      return (
        a.x < b.x + b.w &&
        a.x + a.w > b.x &&
        a.y < b.y + b.h &&
        a.y + a.h > b.y
      );
    }

    // ゲーム本体ロジック
    const game = {
      mode: 'title' as 'title' | 'playing' | 'paused' | 'goal' | 'warp' | 'gameover' | 'won',
      currentWorld: 1,
      score: 0,
      coins: 0,
      lives: 3,
      timeLeft: 400,
      timeAccumulator: 0,
      cameraX: 0,
      worldWidth: 220 * TILE,
      inSubZone: false,
      subZoneReturnX: 0,
      frame: 0,
      screenFlash: 0,
      transitionTimer: 0,

      player: null as any,
      tiles: [] as any[],
      pipes: [] as any[],
      enemies: [] as any[],
      pickups: [] as any[],
      projectiles: [] as any[],
      particles: [] as any[],
      popups: [] as any[],
      movingPlatforms: [] as any[],
      firebars: [] as any[],
      boss: null as any,
      flag: null as any,
      axe: null as any,

      saveScore() {
        const currentBest = parseInt(localStorage.getItem(HIGH_SCORE_KEY) || '0', 10);
        if (this.score > currentBest) {
          localStorage.setItem(HIGH_SCORE_KEY, this.score.toString());
          setHighScore(this.score);
        }
      },

      startOrRestart() {
        if (this.mode === 'won' || this.mode === 'gameover' || this.mode === 'title') {
          this.currentWorld = 1;
          this.score = 0;
          this.coins = 0;
          this.lives = 3;
        }
        this.loadWorld(this.currentWorld);
        this.mode = 'playing';
        SFX.powerup();
      },

      nextWorld() {
        this.currentWorld++;
        if (this.currentWorld > 4) {
          this.mode = 'won';
          this.saveScore();
          SFX.clear();
        } else {
          this.loadWorld(this.currentWorld);
          this.mode = 'playing';
        }
      },

      loadWorld(worldNum: number, isSubZone = false) {
        this.inSubZone = isSubZone;
        this.timeLeft = 400;
        this.timeAccumulator = 0;
        this.tiles = [];
        this.pipes = [];
        this.enemies = [];
        this.pickups = [];
        this.projectiles = [];
        this.particles = [];
        this.popups = [];
        this.movingPlatforms = [];
        this.firebars = [];
        this.boss = null;
        this.flag = null;
        this.axe = null;

        if (isSubZone) {
          this.buildSubZone();
        } else {
          switch (worldNum) {
            case 1:
              this.buildWorld1();
              break;
            case 2:
              this.buildWorld2();
              break;
            case 3:
              this.buildWorld3();
              break;
            case 4:
              this.buildWorld4();
              break;
            default:
              this.buildWorld1();
              break;
          }
        }

        if (!isSubZone) {
          this.resetPlayer(3 * TILE, GROUND_Y - 34);
        }
      },

      resetPlayer(x: number, y: number) {
        const prevBig = this.player ? this.player.big : false;
        const prevFire = this.player ? this.player.fire : false;
        const prevYoshi = this.player ? this.player.yoshi : false;

        this.player = {
          x,
          y,
          w: 28,
          h: 34,
          vx: 0,
          vy: 0,
          previousY: y,
          grounded: false,
          facing: 1,
          big: prevBig,
          fire: prevFire,
          yoshi: prevYoshi,
          starTimer: 0,
          crouching: false,
          invulnerable: 0,
          fireCooldown: 0,
          coyote: 0,
          jumpBuffer: 0,
          animation: 0,
          dead: false,
          warpTimer: 0,
          targetPipe: null,
        };

        if (this.player.big) {
          this.resizePlayer(58);
        }
        this.cameraX = Math.max(0, x - W * 0.3);
      },

      resizePlayer(newH: number) {
        const bottom = this.player.y + this.player.h;
        this.player.h = newH;
        this.player.y = bottom - newH;
      },

      addTile(c: number, r: number, type: string, content: string | null = null) {
        this.tiles.push({
          x: c * TILE,
          y: r * TILE,
          w: TILE,
          h: TILE,
          type,
          content,
          multiHits: content === 'multi_coin' ? 5 : 0,
          used: false,
          dead: false,
          bump: 0,
        });
      },

      addRow(fromC: number, toC: number, r: number, type: string, content: string | null = null) {
        for (let c = fromC; c <= toC; c++) {
          this.addTile(c, r, type, content);
        }
      },

      addPipe(c: number, heightTiles: number, warpTarget: string | null = null, pipeType = 'normal') {
        this.pipes.push({
          x: c * TILE,
          y: GROUND_Y - heightTiles * TILE,
          w: TILE * 2,
          h: heightTiles * TILE,
          warpTarget,
          type: pipeType,
          hasPiranha: heightTiles >= 2 && !warpTarget,
        });
        if (heightTiles >= 2 && !warpTarget) {
          this.enemies.push({
            x: c * TILE + 16,
            y: GROUND_Y - heightTiles * TILE,
            baseY: GROUND_Y - heightTiles * TILE,
            w: 40,
            h: 46,
            vx: 0,
            vy: 0,
            kind: 'piranha',
            offsetY: 0,
            state: 'rising',
            timer: Math.random() * 2,
            dead: false,
          });
        }
      },

      addPopup(x: number, y: number, text: string, color = '#fff') {
        this.popups.push({ x, y, text, color, life: 0.8 });
      },

      addParticle(x: number, y: number, vx: number, vy: number, type: string, life = 0.6) {
        this.particles.push({ x, y, vx, vy, type, life });
      },

      buildWorld1() {
        this.worldWidth = 210 * TILE;
        const gaps = [
          [68, 70],
          [86, 89],
          [152, 154],
        ];

        for (let c = 0; c < 210; c++) {
          const inGap = gaps.some(([s, e]) => c >= s && c <= e);
          if (!inGap) {
            this.addTile(c, 13, 'ground');
            this.addTile(c, 14, 'ground');
          }
        }

        this.addTile(16, 9, 'question', 'coin');
        this.addTile(21, 9, 'brick');
        this.addTile(22, 9, 'question', 'power');
        this.addTile(23, 9, 'brick');
        this.addTile(24, 9, 'question', 'coin');
        this.addTile(25, 9, 'brick');
        this.addTile(23, 5, 'question', 'star');

        this.addRow(77, 79, 9, 'brick');
        this.addTile(78, 5, 'question', 'power');
        this.addRow(80, 85, 5, 'brick');
        this.addRow(92, 95, 5, 'brick');
        this.addTile(93, 5, 'question', 'multi_coin');
        this.addTile(100, 9, 'question', '1up');

        this.addRow(118, 122, 9, 'brick');
        this.addTile(120, 5, 'question', 'power');
        this.addRow(127, 130, 5, 'brick');
        this.addTile(128, 9, 'question', 'coin');

        this.addPipe(28, 2);
        this.addPipe(38, 3);
        this.addPipe(46, 4);
        this.addPipe(57, 4, 'subzone');
        this.addPipe(162, 2);
        this.addPipe(178, 3);

        for (let i = 0; i < 4; i++) {
          for (let j = 0; j <= i; j++) {
            this.addTile(134 + i, 12 - j, 'step');
            this.addTile(142 - i, 12 - j, 'step');
          }
        }

        for (let i = 0; i < 8; i++) {
          for (let j = 0; j <= i; j++) {
            this.addTile(182 + i, 12 - j, 'step');
          }
        }

        this.flag = { x: 198 * TILE + 12, y: 4 * TILE, w: 8, h: 9 * TILE, reached: false, slide: 0 };
        this.addTile(204, 11, 'stone');
        this.addTile(204, 12, 'stone');

        const bugCols = [22, 33, 41, 51, 53, 98, 102, 115, 124, 126, 170, 172];
        bugCols.forEach((c) => {
          this.enemies.push({
            x: c * TILE,
            y: GROUND_Y - 32,
            w: 32,
            h: 32,
            vx: -50,
            vy: 0,
            grounded: false,
            dead: false,
            deathTimer: 0,
            kind: 'bug',
            awake: false,
          });
        });

        [62, 108, 148].forEach((c) => {
          this.enemies.push({
            x: c * TILE,
            y: GROUND_Y - 36,
            w: 32,
            h: 36,
            vx: -55,
            vy: 0,
            grounded: false,
            dead: false,
            deathTimer: 0,
            kind: 'turtle',
            state: 'walking',
            shellGrace: 0,
            awake: false,
          });
        });

        [18, 19, 20, 77, 78, 79, 104, 105, 106].forEach((c, idx) => {
          this.pickups.push({
            x: c * TILE + 9,
            y: 8 * TILE,
            w: 18,
            h: 24,
            type: 'coin',
            collected: false,
            phase: idx,
          });
        });
      },

      buildSubZone() {
        this.worldWidth = 70 * TILE;
        for (let c = 0; c < 70; c++) {
          this.addTile(c, 13, 'stone');
          this.addTile(c, 14, 'stone');
          this.addTile(c, 0, 'stone');
        }
        for (let r = 1; r < 13; r++) {
          this.addTile(0, r, 'stone');
          this.addTile(69, r, 'stone');
        }

        for (let c = 12; c < 50; c++) {
          this.pickups.push({
            x: c * TILE + 9,
            y: 7 * TILE,
            w: 18,
            h: 24,
            type: 'coin',
            collected: false,
            phase: c * 0.4,
          });
          this.pickups.push({
            x: c * TILE + 9,
            y: 9 * TILE,
            w: 18,
            h: 24,
            type: 'coin',
            collected: false,
            phase: c * 0.4 + 1,
          });
        }

        this.addRow(15, 20, 5, 'brick');
        this.addTile(17, 5, 'question', 'power');
        this.addTile(19, 5, 'question', 'star');

        this.addPipe(58, 3, 'return');
        this.resetPlayer(4 * TILE, GROUND_Y - 34);
      },

      buildWorld2() {
        this.worldWidth = 200 * TILE;
        for (let c = 0; c < 200; c++) {
          this.addTile(c, 13, 'stone');
          this.addTile(c, 14, 'stone');
          this.addTile(c, 0, 'stone');
        }

        this.addRow(15, 28, 9, 'brick');
        this.addTile(18, 9, 'question', 'power');
        this.addTile(22, 9, 'question', 'coin');

        this.addRow(35, 48, 7, 'stone');
        this.addRow(52, 60, 5, 'stone');

        this.movingPlatforms.push({
          x: 65 * TILE,
          y: 8 * TILE,
          w: 3 * TILE,
          h: 18,
          minY: 4 * TILE,
          maxY: 11 * TILE,
          vy: 65,
          dir: 1,
        });

        this.addRow(72, 85, 8, 'stone');
        this.addTile(75, 5, 'question', 'star');

        this.movingPlatforms.push({
          x: 90 * TILE,
          y: 7 * TILE,
          w: 3 * TILE,
          h: 18,
          minX: 88 * TILE,
          maxX: 106 * TILE,
          vx: 80,
          dir: 1,
          horizontal: true,
        });

        this.addRow(110, 130, 9, 'brick');
        this.addTile(115, 5, 'question', 'power');
        this.addTile(125, 9, 'question', '1up');

        this.addPipe(180, 4, 'warp_next');

        [20, 24, 40, 45, 76, 80, 116, 122].forEach((c) => {
          this.enemies.push({
            x: c * TILE,
            y: GROUND_Y - 32,
            w: 32,
            h: 32,
            vx: -55,
            vy: 0,
            grounded: false,
            dead: false,
            deathTimer: 0,
            kind: 'bug',
            awake: false,
          });
        });

        [38, 78, 120].forEach((c) => {
          this.enemies.push({
            x: c * TILE,
            y: GROUND_Y - 36,
            w: 32,
            h: 36,
            vx: -60,
            vy: 0,
            grounded: false,
            dead: false,
            deathTimer: 0,
            kind: 'turtle',
            state: 'walking',
            shellGrace: 0,
            awake: false,
          });
        });
      },

      buildWorld3() {
        this.worldWidth = 200 * TILE;
        const platforms = [
          [0, 18, 13],
          [24, 32, 10],
          [36, 44, 7],
          [48, 56, 11],
          [62, 70, 8],
          [76, 88, 6],
          [94, 102, 9],
          [108, 120, 7],
          [126, 138, 10],
          [144, 156, 6],
          [162, 174, 9],
          [180, 200, 13],
        ];

        platforms.forEach(([fromC, toC, r]) => {
          this.addRow(fromC, toC, r, 'ground');
        });

        this.movingPlatforms.push({
          x: 57 * TILE,
          y: 9 * TILE,
          w: 3 * TILE,
          h: 18,
          minX: 56 * TILE,
          maxX: 61 * TILE,
          vx: 70,
          dir: 1,
          horizontal: true,
        });
        this.movingPlatforms.push({
          x: 89 * TILE,
          y: 7 * TILE,
          w: 3 * TILE,
          h: 18,
          minY: 4 * TILE,
          maxY: 10 * TILE,
          vy: 65,
          dir: 1,
        });
        this.movingPlatforms.push({
          x: 139 * TILE,
          y: 8 * TILE,
          w: 3 * TILE,
          h: 18,
          minX: 138 * TILE,
          maxX: 143 * TILE,
          vx: 75,
          dir: 1,
          horizontal: true,
        });

        this.addTile(28, 6, 'question', 'power');
        this.addTile(82, 3, 'question', 'star');
        this.addTile(114, 4, 'question', 'power');

        [40, 66, 84, 112, 132, 150].forEach((c, idx) => {
          this.enemies.push({
            x: c * TILE,
            y: 5 * TILE,
            w: 32,
            h: 36,
            baseY: 5 * TILE,
            vx: -40,
            vy: 0,
            grounded: false,
            dead: false,
            deathTimer: 0,
            kind: 'paratroopa',
            phase: idx * 1.2,
            awake: false,
          });
        });

        this.flag = { x: 192 * TILE + 12, y: 4 * TILE, w: 8, h: 9 * TILE, reached: false, slide: 0 };
      },

      buildWorld4() {
        this.worldWidth = 190 * TILE;
        for (let c = 0; c < 190; c++) {
          if (c < 120 || c > 180 || (c >= 140 && c <= 165)) {
            this.addTile(c, 13, 'stone');
            this.addTile(c, 14, 'stone');
          }
          this.addTile(c, 0, 'stone');
        }

        this.addRow(15, 30, 9, 'brick');
        this.addTile(20, 9, 'question', 'power');

        this.firebars.push({ x: 35 * TILE, y: 9 * TILE, length: 70, angle: 0, speed: 2.2 });
        this.firebars.push({ x: 55 * TILE, y: 8 * TILE, length: 80, angle: Math.PI, speed: -2.5 });
        this.firebars.push({ x: 80 * TILE, y: 10 * TILE, length: 75, angle: 0.5, speed: 2.0 });
        this.firebars.push({ x: 105 * TILE, y: 8 * TILE, length: 85, angle: 1.5, speed: -2.2 });

        this.addRow(45, 60, 9, 'stone');
        this.addRow(70, 85, 7, 'stone');
        this.addTile(75, 4, 'question', 'power');
        this.addRow(95, 115, 9, 'stone');
        this.addTile(100, 5, 'question', 'star');

        const bridgeStart = 145;
        const bridgeEnd = 162;
        for (let c = bridgeStart; c <= bridgeEnd; c++) {
          this.addTile(c, 11, 'bridge');
        }

        this.axe = { x: (bridgeEnd + 2) * TILE, y: 9 * TILE, w: 32, h: 32, triggered: false };

        this.boss = {
          x: 155 * TILE,
          y: 11 * TILE - 64,
          w: 64,
          h: 64,
          vx: -35,
          vy: 0,
          hp: 5,
          maxHp: 5,
          fireTimer: 1.8,
          jumpTimer: 2.5,
          dead: false,
          deathTimer: 0,
          defeatedByBridge: false,
        };
      },

      getSolids() {
        return this.tiles.filter((t) => !t.dead).concat(this.pipes).concat(this.movingPlatforms);
      },

      resolveHorizontal(entity: any) {
        let collided = false;
        for (const solid of this.getSolids()) {
          if (!rectOverlap(entity, solid)) continue;
          if (entity.vx > 0) {
            entity.x = solid.x - entity.w;
          } else if (entity.vx < 0) {
            entity.x = solid.x + solid.w;
          }
          entity.vx = 0;
          collided = true;
        }
        return collided;
      },

      resolveVertical(entity: any, isPlayer = false) {
        entity.grounded = false;
        for (const solid of this.getSolids()) {
          if (!rectOverlap(entity, solid)) continue;

          if (entity.vy > 0) {
            entity.y = solid.y - entity.h;
            entity.vy = 0;
            entity.grounded = true;
          } else if (entity.vy < 0) {
            entity.y = solid.y + solid.h;
            entity.vy = 0;
            if (isPlayer && solid.type) {
              this.hitBlock(solid);
            }
          }
        }
      },

      hitBlock(tile: any) {
        if (
          tile.bump > 0 ||
          tile.type === 'ground' ||
          tile.type === 'step' ||
          tile.type === 'stone' ||
          tile.type === 'bridge'
        )
          return;

        tile.bump = 1;
        SFX.bump();

        if (tile.type === 'question' && !tile.used) {
          tile.used = true;
          if (tile.content === 'coin') {
            this.coins++;
            this.score += 200;
            this.addPopup(tile.x + 18, tile.y - 15, '+200');
            this.addParticle(tile.x + 10, tile.y - 12, 0, -260, 'coin_pop', 0.6);
            SFX.coin();
          } else if (tile.content === 'multi_coin') {
            tile.multiHits--;
            if (tile.multiHits > 0) tile.used = false;
            this.coins++;
            this.score += 200;
            this.addPopup(tile.x + 18, tile.y - 15, '+200');
            this.addParticle(tile.x + 10, tile.y - 12, 0, -260, 'coin_pop', 0.6);
            SFX.coin();
          } else if (tile.content === '1up') {
            this.spawnPickup(tile.x, tile.y, '1up');
            SFX.powerup();
          } else if (tile.content === 'star') {
            this.spawnPickup(tile.x, tile.y, 'star');
            SFX.powerup();
          } else if (tile.content === 'power') {
            const item = this.player.big ? 'flower' : 'mushroom';
            this.spawnPickup(tile.x, tile.y, item);
            SFX.powerup();
          }
        } else if (tile.type === 'brick') {
          if (this.player.big) {
            tile.dead = true;
            this.score += 50;
            SFX.breakBlock();
            for (let i = 0; i < 4; i++) {
              this.addParticle(
                tile.x + (i % 2) * 18,
                tile.y + Math.floor(i / 2) * 18,
                i % 2 ? 140 : -140,
                i < 2 ? -280 : -160,
                'brick_debris',
                0.75
              );
            }
          }
        }

        this.enemies.forEach((e) => {
          if (
            !e.dead &&
            e.x + e.w > tile.x &&
            e.x < tile.x + tile.w &&
            Math.abs(e.y + e.h - tile.y) < 10
          ) {
            this.defeatEnemy(e, true);
          }
        });
      },

      spawnPickup(x: number, y: number, type: string) {
        this.pickups.push({
          x: x + 4,
          y: y - 4,
          w: 28,
          h: 28,
          type,
          vx: type === 'mushroom' || type === '1up' || type === 'star' ? 75 : 0,
          vy: 0,
          rise: 36,
          grounded: false,
          collected: false,
          phase: 0,
        });
      },

      defeatEnemy(enemy: any, bounced = false) {
        if (enemy.dead) return;
        enemy.dead = true;
        enemy.deathTimer = bounced ? 0.6 : 0.45;
        enemy.vy = bounced ? -220 : 0;
        this.score += 200;
        this.addPopup(enemy.x + enemy.w / 2, enemy.y - 6, '+200');
        SFX.stomp();
      },

      turnIntoShell(enemy: any) {
        enemy.state = 'shell';
        const bottom = enemy.y + enemy.h;
        enemy.h = 24;
        enemy.y = bottom - 24;
        enemy.vx = 0;
        enemy.shellGrace = 0.25;
        this.score += 100;
        this.addPopup(enemy.x + enemy.w / 2, enemy.y - 6, '+100');
        SFX.stomp();
      },

      kickShell(enemy: any, direction: number) {
        enemy.vx = direction * 460;
        enemy.shellGrace = 0.2;
        this.score += 200;
        this.addPopup(enemy.x + enemy.w / 2, enemy.y - 6, 'KICK!');
        SFX.kick();
      },

      hurtPlayer() {
        const p = this.player;
        if (p.invulnerable > 0 || p.dead || this.mode !== 'playing') return;
        if (p.starTimer > 0) return;

        if (p.fire) {
          p.fire = false;
          p.invulnerable = 2.0;
          this.screenFlash = 0.15;
          SFX.powerdown();
        } else if (p.big) {
          p.big = false;
          p.crouching = false;
          this.resizePlayer(34);
          p.invulnerable = 2.0;
          this.screenFlash = 0.15;
          SFX.powerdown();
        } else {
          this.killPlayer();
        }
      },

      killPlayer() {
        const p = this.player;
        if (p.dead) return;
        p.dead = true;
        p.vx = 0;
        p.vy = -540;
        this.transitionTimer = 2.8;
        SFX.death();
      },

      shootFireball() {
        const p = this.player;
        if (!p.fire || p.crouching || p.fireCooldown > 0) return;
        const activeShots = this.projectiles.filter((s) => !s.dead).length;
        if (activeShots >= 3) return;

        this.projectiles.push({
          x: p.x + (p.facing > 0 ? p.w : -12),
          y: p.y + 16,
          w: 14,
          h: 14,
          vx: p.facing * 420,
          vy: 40,
          bounces: 0,
          dead: false,
        });
        p.fireCooldown = 0.22;
        SFX.fireball();
      },

      update(dt: number) {
        this.frame += dt;

        if (pressed.pause) {
          pressed.pause = false;
          if (this.mode === 'playing') this.mode = 'paused';
          else if (this.mode === 'paused') this.mode = 'playing';
        }

        updateBGM(dt, this);

        if (this.mode === 'paused') return;

        if (this.mode === 'playing') {
          this.updatePlayer(dt);
          this.updateEnemies(dt);
          this.updateBoss(dt);
          this.updateMovingPlatforms(dt);
          this.updateFirebars(dt);
          this.updatePickups(dt);
          this.updateProjectiles(dt);
          this.updateParticlesAndPopups(dt);

          if (!this.player.dead) {
            this.timeAccumulator += dt;
            while (this.timeAccumulator >= 1) {
              this.timeLeft--;
              this.timeAccumulator--;
            }
            if (this.timeLeft <= 0) {
              this.killPlayer();
            }
          }

          const targetX = clamp(this.player.x - W * 0.36, 0, this.worldWidth - W);
          this.cameraX += (targetX - this.cameraX) * Math.min(1, dt * 6.5);
        } else if (this.mode === 'goal') {
          this.updateGoalSequence(dt);
        } else if (this.mode === 'warp') {
          this.updateWarpSequence(dt);
        } else if (this.mode === 'gameover' || this.mode === 'won') {
          this.updateParticlesAndPopups(dt);
        }

        pressed.jump = false;
        pressed.run = false;
      },

      updatePlayer(dt: number) {
        const p = this.player;
        p.previousY = p.y;

        if (p.invulnerable > 0) p.invulnerable -= dt;
        if (p.starTimer > 0) p.starTimer -= dt;
        if (p.fireCooldown > 0) p.fireCooldown -= dt;

        if (p.dead) {
          p.vy += GRAVITY * 0.75 * dt;
          p.y += p.vy * dt;
          this.transitionTimer -= dt;
          if (this.transitionTimer <= 0) {
            this.lives--;
            if (this.lives <= 0) {
              this.mode = 'gameover';
              this.saveScore();
              SFX.gameover();
            } else {
              this.loadWorld(this.currentWorld, this.inSubZone);
            }
          }
          return;
        }

        if (p.grounded && keys.down) {
          if (p.big) {
            if (!p.crouching) {
              p.crouching = true;
              this.resizePlayer(34);
            }
          }
          for (const pipe of this.pipes) {
            if (
              pipe.warpTarget &&
              p.x + p.w > pipe.x + 8 &&
              p.x < pipe.x + pipe.w - 8 &&
              Math.abs(p.y + p.h - pipe.y) < 6
            ) {
              this.startWarp(pipe);
              return;
            }
          }
        } else if (p.crouching) {
          p.crouching = false;
          if (p.big) this.resizePlayer(58);
        }

        if (pressed.run && p.fire) {
          this.shootFireball();
        }

        const accel = p.grounded ? 1100 : 720;
        const maxSpeed = p.crouching ? 0 : keys.run ? 300 : 205;
        let dir = 0;
        if (!p.crouching) {
          if (keys.left) dir -= 1;
          if (keys.right) dir += 1;
        }

        if (dir !== 0) {
          p.vx += dir * accel * dt;
          p.vx = clamp(p.vx, -maxSpeed, maxSpeed);
          p.facing = dir;
        } else {
          const friction = p.grounded ? 1300 : 180;
          if (Math.abs(p.vx) <= friction * dt) {
            p.vx = 0;
          } else {
            p.vx -= Math.sign(p.vx) * friction * dt;
          }
        }

        if (p.grounded) p.coyote = 0.1;
        else p.coyote -= dt;

        if (pressed.jump) p.jumpBuffer = 0.12;
        else p.jumpBuffer -= dt;

        if (p.jumpBuffer > 0 && p.coyote > 0) {
          p.vy = keys.run ? -820 : -760;
          p.grounded = false;
          p.coyote = 0;
          p.jumpBuffer = 0;
          SFX.jump();
        }

        if (!keys.jump && p.vy < -200) {
          p.vy += 1550 * dt;
        }
        p.vy = Math.min(p.vy + GRAVITY * dt, 920);

        p.x += p.vx * dt;
        this.resolveHorizontal(p);
        p.x = clamp(p.x, 0, this.worldWidth - p.w);

        p.y += p.vy * dt;
        this.resolveVertical(p, true);

        if (p.grounded && Math.abs(p.vx) > 15) {
          p.animation += Math.abs(p.vx) * dt * 0.15;
        }

        if (p.y > H + 120) {
          this.killPlayer();
        }

        if (
          this.flag &&
          !this.flag.reached &&
          p.x + p.w >= this.flag.x &&
          p.x <= this.flag.x + 30 &&
          p.y + p.h >= this.flag.y
        ) {
          this.startGoalSequence();
        }

        if (this.axe && !this.axe.triggered && rectOverlap(p, this.axe)) {
          this.triggerBossAxe();
        }
      },

      startWarp(pipe: any) {
        this.mode = 'warp';
        this.player.warpTimer = 1.0;
        this.player.targetPipe = pipe;
        SFX.pipe();
      },

      updateWarpSequence(dt: number) {
        const p = this.player;
        p.warpTimer -= dt;
        p.y += 35 * dt;
        if (p.warpTimer <= 0) {
          if (p.targetPipe.warpTarget === 'subzone') {
            this.subZoneReturnX = p.targetPipe.x + TILE * 3;
            this.loadWorld(this.currentWorld, true);
          } else if (p.targetPipe.warpTarget === 'return') {
            this.loadWorld(this.currentWorld, false);
            this.player.x = this.subZoneReturnX || 60 * TILE;
            this.player.y = GROUND_Y - 34;
          } else if (p.targetPipe.warpTarget === 'warp_next') {
            this.nextWorld();
          }
          this.mode = 'playing';
        }
      },

      startGoalSequence() {
        this.flag.reached = true;
        this.flag.slide = 0;
        this.player.vx = 0;
        this.player.vy = 0;
        this.mode = 'goal';
        this.transitionTimer = 4.2;
        this.score += Math.max(0, Math.floor(this.timeLeft)) * 10;
        this.saveScore();
        SFX.flag();
      },

      updateGoalSequence(dt: number) {
        const p = this.player;
        this.flag.slide = Math.min(1, this.flag.slide + dt * 0.85);
        p.y = Math.min(GROUND_Y - p.h, p.y + 110 * dt);
        this.transitionTimer -= dt;

        if (this.transitionTimer < 2.5) {
          p.facing = 1;
          p.vx = 110;
          p.x += p.vx * dt;
          p.animation += 6 * dt;
        }

        if (this.transitionTimer <= 0) {
          this.nextWorld();
        }
        this.updateParticlesAndPopups(dt);
      },

      triggerBossAxe() {
        this.axe.triggered = true;
        SFX.bossRoar();
        this.score += 5000;
        this.saveScore();
        this.addPopup(this.axe.x, this.axe.y - 20, '+5000', '#fbbc04');

        this.tiles.forEach((t) => {
          if (t.type === 'bridge') {
            t.dead = true;
            for (let i = 0; i < 2; i++) {
              this.addParticle(t.x + i * 16, t.y, 0, 100 + Math.random() * 80, 'brick_debris', 1.2);
            }
          }
        });

        if (this.boss && !this.boss.dead) {
          this.boss.dead = true;
          this.boss.defeatedByBridge = true;
          this.boss.deathTimer = 2.5;
          this.boss.vy = 80;
          SFX.bossHit();
        }

        setTimeout(() => {
          if (isMounted) this.nextWorld();
        }, 3200);
      },

      updateEnemies(dt: number) {
        const p = this.player;
        for (const e of this.enemies) {
          if (e.x < this.cameraX + W + 150) e.awake = true;
          if (!e.awake) continue;

          if (e.dead) {
            e.deathTimer -= dt;
            e.y += e.vy * dt;
            e.vy += GRAVITY * dt;
            continue;
          }

          if (e.kind === 'piranha') {
            e.timer += dt;
            if (e.state === 'rising') {
              e.offsetY = Math.min(46, e.offsetY + 45 * dt);
              if (e.offsetY >= 46 && e.timer > 2.0) {
                e.state = 'lowering';
                e.timer = 0;
              }
            } else {
              e.offsetY = Math.max(0, e.offsetY - 45 * dt);
              if (e.offsetY <= 0 && e.timer > 2.0) {
                if (Math.abs(p.x - e.x) > 40) {
                  e.state = 'rising';
                  e.timer = 0;
                }
              }
            }
            e.y = e.baseY - e.offsetY;

            if (rectOverlap(p, e)) {
              if (p.starTimer > 0) this.defeatEnemy(e, true);
              else this.hurtPlayer();
            }
            continue;
          }

          if (e.kind === 'paratroopa') {
            e.phase += dt * 3;
            e.y = e.baseY + Math.sin(e.phase) * 45;
            e.x += e.vx * dt;
            this.resolveHorizontal(e);
          } else {
            e.shellGrace = Math.max(0, (e.shellGrace || 0) - dt);
            e.vy = Math.min(e.vy + GRAVITY * dt, 800);
            const dir = Math.sign(e.vx) || -1;
            e.x += e.vx * dt;
            const hitWall = this.resolveHorizontal(e);
            if (hitWall) {
              e.vx = e.state === 'shell' ? -dir * 460 : -dir * 55;
            }
            e.y += e.vy * dt;
            this.resolveVertical(e);
          }

          if (e.y > H + 150) e.dead = true;

          if (!rectOverlap(p, e) || p.dead || this.mode !== 'playing') continue;

          if (p.starTimer > 0) {
            this.defeatEnemy(e, true);
            continue;
          }

          const isStomp = p.vy > 60 && p.previousY + p.h <= e.y + 14;
          if (isStomp) {
            if (e.kind === 'turtle' && e.state === 'walking') {
              this.turnIntoShell(e);
            } else if (e.state === 'shell') {
              if (Math.abs(e.vx) > 80) {
                e.vx = 0;
                e.shellGrace = 0.25;
                SFX.stomp();
              } else {
                this.kickShell(e, p.facing);
              }
            } else if (e.kind === 'paratroopa') {
              e.kind = 'turtle';
              e.state = 'walking';
              e.vx = -55;
              SFX.stomp();
            } else {
              this.defeatEnemy(e);
            }
            p.vy = -440;
            p.grounded = false;
          } else if (e.state === 'shell' && Math.abs(e.vx) < 30) {
            this.kickShell(e, p.x < e.x ? 1 : -1);
          } else if ((e.shellGrace || 0) <= 0) {
            this.hurtPlayer();
          }
        }

        for (let i = 0; i < this.enemies.length; i++) {
          const a = this.enemies[i];
          if (a.dead || !a.awake) continue;
          for (let j = i + 1; j < this.enemies.length; j++) {
            const b = this.enemies[j];
            if (b.dead || !b.awake || !rectOverlap(a, b)) continue;

            const aIsFastShell = a.state === 'shell' && Math.abs(a.vx) > 100;
            const bIsFastShell = b.state === 'shell' && Math.abs(b.vx) > 100;

            if (aIsFastShell && b.state !== 'shell') {
              this.defeatEnemy(b, true);
            } else if (bIsFastShell && a.state !== 'shell') {
              this.defeatEnemy(a, true);
            } else if (a.state !== 'shell' && b.state !== 'shell') {
              a.vx = -a.vx;
              b.vx = -b.vx;
            }
          }
        }
      },

      updateBoss(dt: number) {
        const b = this.boss;
        if (!b) return;

        if (b.dead) {
          b.deathTimer -= dt;
          b.y += b.vy * dt;
          b.vy += GRAVITY * 0.7 * dt;
          return;
        }

        b.fireTimer -= dt;
        if (b.fireTimer <= 0) {
          b.fireTimer = 2.2 + Math.random() * 1.5;
          this.projectiles.push({
            x: b.x - 16,
            y: b.y + 20,
            w: 20,
            h: 20,
            vx: -240,
            vy: (Math.random() - 0.5) * 60,
            isBossShot: true,
            dead: false,
          });
          SFX.fireball();
        }

        b.jumpTimer -= dt;
        if (b.jumpTimer <= 0 && b.grounded) {
          b.jumpTimer = 2.5 + Math.random() * 2.0;
          b.vy = -560;
          b.grounded = false;
        }

        b.vy = Math.min(b.vy + GRAVITY * dt, 800);
        b.x += b.vx * dt;
        if (b.x < 147 * TILE) b.vx = 35;
        if (b.x > 158 * TILE) b.vx = -35;

        b.y += b.vy * dt;
        this.resolveVertical(b);

        const p = this.player;
        if (rectOverlap(p, b) && !p.dead) {
          if (p.starTimer > 0) {
            b.hp -= 3;
            if (b.hp <= 0) {
              b.dead = true;
              b.deathTimer = 2.0;
              b.vy = -260;
              SFX.bossHit();
            }
          } else {
            this.hurtPlayer();
          }
        }
      },

      updateMovingPlatforms(dt: number) {
        for (const plat of this.movingPlatforms) {
          if (plat.horizontal) {
            plat.x += plat.vx * plat.dir * dt;
            if (plat.x <= plat.minX) {
              plat.x = plat.minX;
              plat.dir = 1;
            }
            if (plat.x >= plat.maxX) {
              plat.x = plat.maxX;
              plat.dir = -1;
            }
          } else {
            plat.y += plat.vy * plat.dir * dt;
            if (plat.y <= plat.minY) {
              plat.y = plat.minY;
              plat.dir = 1;
            }
            if (plat.y >= plat.maxY) {
              plat.y = plat.maxY;
              plat.dir = -1;
            }
          }
        }
      },

      updateFirebars(dt: number) {
        const p = this.player;
        for (const fb of this.firebars) {
          fb.angle += fb.speed * dt;
          const nodeCount = 5;
          for (let i = 1; i <= nodeCount; i++) {
            const dist = (fb.length / nodeCount) * i;
            const nx = fb.x + Math.cos(fb.angle) * dist;
            const ny = fb.y + Math.sin(fb.angle) * dist;
            const nodeRect = { x: nx - 6, y: ny - 6, w: 12, h: 12 };
            if (rectOverlap(p, nodeRect)) {
              this.hurtPlayer();
            }
          }
        }
      },

      updatePickups(dt: number) {
        const p = this.player;
        for (const item of this.pickups) {
          if (item.collected) continue;
          item.phase = (item.phase || 0) + dt * 5;

          if (item.type !== 'coin' && item.rise > 0) {
            const amt = Math.min(item.rise, 40 * dt);
            item.y -= amt;
            item.rise -= amt;
          } else if (item.type === 'mushroom' || item.type === '1up' || item.type === 'star') {
            if (item.rise <= 0) {
              item.vy = Math.min(item.vy + GRAVITY * dt, 800);
              const dir = Math.sign(item.vx) || 1;
              item.x += item.vx * dt;
              if (this.resolveHorizontal(item)) item.vx = -dir * 75;
              item.y += item.vy * dt;
              this.resolveVertical(item);
              if (item.type === 'star' && item.grounded) {
                item.vy = -500;
              }
            }
          }

          if (rectOverlap(p, item) && !p.dead) {
            item.collected = true;
            if (item.type === 'coin') {
              this.coins++;
              this.score += 200;
              this.addPopup(item.x, item.y, '+200');
              SFX.coin();
            } else if (item.type === 'mushroom') {
              if (!p.big) {
                p.big = true;
                this.resizePlayer(58);
              }
              p.invulnerable = 0.8;
              this.score += 1000;
              this.addPopup(item.x, item.y, 'SUPER!');
              SFX.powerup();
            } else if (item.type === 'flower') {
              p.big = true;
              p.fire = true;
              this.resizePlayer(58);
              p.invulnerable = 0.8;
              this.score += 1000;
              this.addPopup(item.x, item.y, 'THINKING FIRE!');
              SFX.powerup();
            } else if (item.type === 'star') {
              p.starTimer = 11;
              p.invulnerable = 11;
              this.score += 1000;
              this.addPopup(item.x, item.y, 'STAR POWER!');
              SFX.powerup();
            } else if (item.type === '1up') {
              this.lives++;
              this.score += 1000;
              this.addPopup(item.x, item.y, '1UP!', '#48bb78');
              SFX.oneup();
            }
          }
        }
      },

      updateProjectiles(dt: number) {
        const p = this.player;
        for (const shot of this.projectiles) {
          if (shot.dead) continue;

          if (shot.isBossShot) {
            shot.x += shot.vx * dt;
            shot.y += shot.vy * dt;
            if (rectOverlap(p, shot)) {
              this.hurtPlayer();
              shot.dead = true;
            }
          } else {
            shot.vy = Math.min(shot.vy + GRAVITY * dt, 750);
            shot.x += shot.vx * dt;
            if (this.resolveHorizontal(shot)) {
              shot.dead = true;
              SFX.fireHit();
              continue;
            }
            shot.y += shot.vy * dt;
            this.resolveVertical(shot);
            if (shot.grounded) {
              shot.vy = -380;
              shot.bounces = (shot.bounces || 0) + 1;
            }

            for (const e of this.enemies) {
              if (!e.dead && rectOverlap(shot, e)) {
                this.defeatEnemy(e, true);
                shot.dead = true;
                SFX.fireHit();
                break;
              }
            }

            if (this.boss && !this.boss.dead && rectOverlap(shot, this.boss)) {
              this.boss.hp--;
              shot.dead = true;
              SFX.bossHit();
              if (this.boss.hp <= 0) {
                this.boss.dead = true;
                this.boss.deathTimer = 2.0;
                this.boss.vy = -280;
              }
            }

            if (shot.y > H + 50 || (shot.bounces || 0) > 6) shot.dead = true;
          }
        }
        this.projectiles = this.projectiles.filter((s) => !s.dead);
      },

      updateParticlesAndPopups(dt: number) {
        for (const t of this.tiles) {
          t.bump = Math.max(0, t.bump - dt * 5);
        }
        for (const pt of this.particles) {
          pt.life -= dt;
          pt.x += pt.vx * dt;
          pt.y += pt.vy * dt;
          pt.vy += GRAVITY * 0.7 * dt;
        }
        this.particles = this.particles.filter((p) => p.life > 0);

        for (const pp of this.popups) {
          pp.life -= dt;
          pp.y -= 45 * dt;
        }
        this.popups = this.popups.filter((p) => p.life > 0);

        this.screenFlash = Math.max(0, this.screenFlash - dt);
      },

      draw() {
        ctx.save();
        if (this.mode === 'title') {
          this.drawTitleScreen();
        } else if (this.mode === 'gameover') {
          this.drawEndScreen('GAME OVER', 'SYSTEM CRASHED - TRY AGAIN', '#ea4335');
        } else if (this.mode === 'won') {
          this.drawEndScreen('CONGRATULATIONS!', 'GEMINI 3.7 SAVED THE DIGITAL REALM!', '#fbbc04');
        } else {
          this.drawGameScene();
        }
        ctx.restore();
      },

      drawGameScene() {
        this.drawBackground();
        this.drawFlagAndCastle();

        for (const plat of this.movingPlatforms) this.drawPlatform(plat);
        for (const fb of this.firebars) this.drawFirebar(fb);

        for (const t of this.tiles) this.drawTile(t);
        for (const pipe of this.pipes) this.drawPipe(pipe);
        if (this.axe) this.drawAxe(this.axe);
        for (const item of this.pickups) this.drawPickup(item);
        for (const enemy of this.enemies) this.drawEnemy(enemy);
        if (this.boss) this.drawBoss(this.boss);

        for (const shot of this.projectiles) this.drawProjectile(shot);
        this.drawPlayer();
        this.drawParticlesAndPopups();
        this.drawHUD();

        if (this.screenFlash > 0) {
          ctx.fillStyle = `rgba(255, 255, 255, ${this.screenFlash * 2})`;
          ctx.fillRect(0, 0, W, H);
        }

        if (this.mode === 'paused') {
          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 36px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('PAUSED', W / 2, H / 2);
        }
      },

      drawBackground() {
        if (this.currentWorld === 4) {
          const grad = ctx.createLinearGradient(0, 0, 0, H);
          grad.addColorStop(0, '#1a0505');
          grad.addColorStop(1, '#450a0a');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, W, H);

          ctx.fillStyle = '#ea580c';
          ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
          ctx.fillStyle = '#fbbf24';
          for (let x = 0; x < W; x += 40) {
            const waveY = GROUND_Y + Math.sin(this.frame * 4 + x) * 6;
            ctx.fillRect(x, waveY, 30, 8);
          }
        } else if (this.currentWorld === 2 || this.inSubZone) {
          const grad = ctx.createLinearGradient(0, 0, 0, H);
          grad.addColorStop(0, '#060814');
          grad.addColorStop(1, '#1e1035');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, W, H);

          ctx.strokeStyle = 'rgba(66, 133, 244, 0.15)';
          ctx.lineWidth = 2;
          const cam = this.cameraX * 0.3;
          for (let x = -cam % 60; x < W; x += 60) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, H);
            ctx.stroke();
          }
        } else if (this.currentWorld === 3) {
          const grad = ctx.createLinearGradient(0, 0, 0, H);
          grad.addColorStop(0, '#0f172a');
          grad.addColorStop(0.6, '#38bdf8');
          grad.addColorStop(1, '#bae6fd');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, W, H);

          const cam = this.cameraX * 0.2;
          for (let i = -1; i < 8; i++) {
            const cx = i * 280 - (cam % 280);
            this.drawCloud(cx, 80 + (i % 3) * 35, 1.2);
          }
        } else {
          const grad = ctx.createLinearGradient(0, 0, 0, H);
          grad.addColorStop(0, '#3b82f6');
          grad.addColorStop(0.7, '#60a5fa');
          grad.addColorStop(1, '#93c5fd');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, W, H);

          const camFar = this.cameraX * 0.18;
          for (let i = -1; i < 7; i++) {
            const cx = i * 320 - (camFar % 320);
            this.drawCloud(cx, 90 + (i % 2) * 50, 1.0);
          }

          const camHills = this.cameraX * 0.35;
          for (let i = -1; i < 6; i++) {
            const hx = i * 420 - (camHills % 420);
            this.drawHill(hx, GROUND_Y, 260, 140, i % 2 ? '#22c55e' : '#16a34a');
          }

          const camBushes = this.cameraX * 0.6;
          for (let i = -1; i < 8; i++) {
            const bx = i * 260 - (camBushes % 260);
            ctx.fillStyle = '#15803d';
            ctx.fillRect(bx, GROUND_Y - 36, 110, 36);
            ctx.fillRect(bx + 25, GROUND_Y - 52, 60, 20);
          }
        }
      },

      drawCloud(x: number, y: number, scale = 1) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillRect(x + 16 * scale, y, 60 * scale, 16 * scale);
        ctx.fillRect(x, y + 16 * scale, 100 * scale, 30 * scale);
        ctx.fillRect(x + 24 * scale, y - 14 * scale, 35 * scale, 16 * scale);
        ctx.fillRect(x + 70 * scale, y + 6 * scale, 22 * scale, 16 * scale);
      },

      drawHill(x: number, y: number, w: number, h: number, color: string) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + w * 0.4, y - h);
        ctx.lineTo(x + w * 0.6, y - h);
        ctx.lineTo(x + w, y);
        ctx.fill();
      },

      drawTile(t: any) {
        const x = t.x - this.cameraX;
        if (x < -TILE || x > W || t.dead) return;
        const bumpOffset = t.bump > 0 ? -Math.sin(t.bump * Math.PI) * 9 : 0;
        const y = t.y + bumpOffset;

        if (t.type === 'ground' || t.type === 'step') {
          ctx.fillStyle = '#d97706';
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(x, y, TILE, 6);
          ctx.fillStyle = '#b45309';
          ctx.fillRect(x + 8, y + 14, 18, 5);
        } else if (t.type === 'brick') {
          ctx.fillStyle = '#b91c1c';
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
          ctx.fillStyle = '#7f1d1d';
          ctx.fillRect(x, y + 16, TILE, 3);
          ctx.fillRect(x + 16, y, 3, 16);
          ctx.fillRect(x + 24, y + 19, 3, 17);
        } else if (t.type === 'question') {
          const bg = t.used ? '#78350f' : '#f59e0b';
          ctx.fillStyle = '#451a03';
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = bg;
          ctx.fillRect(x + 3, y + 3, TILE - 6, TILE - 6);
          if (!t.used) {
            ctx.fillStyle = '#fff';
            ctx.fillRect(x + 14, y + 8, 8, 4);
            ctx.fillRect(x + 18, y + 12, 4, 8);
            ctx.fillRect(x + 18, y + 24, 4, 4);
            ctx.fillStyle = '#fef08a';
            ctx.fillRect(x + 5, y + 5, 3, 3);
            ctx.fillRect(x + 28, y + 28, 3, 3);
          }
        } else if (t.type === 'stone') {
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = '#334155';
          ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
          ctx.fillStyle = '#475569';
          ctx.fillRect(x + 4, y + 4, TILE - 8, 4);
        } else if (t.type === 'bridge') {
          ctx.fillStyle = '#78350f';
          ctx.fillRect(x, y + 8, TILE, 12);
          ctx.fillStyle = '#b45309';
          ctx.fillRect(x + 4, y + 2, 8, 24);
          ctx.fillRect(x + 20, y + 2, 8, 24);
        }
      },

      drawPipe(p: any) {
        const x = p.x - this.cameraX;
        if (x < -p.w || x > W) return;
        const isCyber = this.currentWorld === 2 || this.inSubZone;
        const topColor = isCyber ? '#06b6d4' : '#22c55e';
        const bodyColor = isCyber ? '#0891b2' : '#16a34a';
        const highlight = isCyber ? '#a5f3fc' : '#86efac';
        const shadow = isCyber ? '#164e63' : '#14532d';

        ctx.fillStyle = shadow;
        ctx.fillRect(x - 4, p.y, p.w + 8, 28);
        ctx.fillStyle = topColor;
        ctx.fillRect(x - 2, p.y + 2, p.w + 4, 24);
        ctx.fillStyle = highlight;
        ctx.fillRect(x + 4, p.y + 2, 8, 24);

        ctx.fillStyle = shadow;
        ctx.fillRect(x, p.y + 28, p.w, p.h - 28);
        ctx.fillStyle = bodyColor;
        ctx.fillRect(x + 2, p.y + 28, p.w - 4, p.h - 28);
        ctx.fillStyle = highlight;
        ctx.fillRect(x + 6, p.y + 28, 8, p.h - 28);
      },

      drawPlatform(plat: any) {
        const x = plat.x - this.cameraX;
        if (x < -plat.w || x > W) return;
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(x, plat.y, plat.w, plat.h);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(x + 3, plat.y + 2, plat.w - 6, 4);
        ctx.fillStyle = '#0369a1';
        ctx.fillRect(x + 3, plat.y + 8, plat.w - 6, plat.h - 10);
      },

      drawFirebar(fb: any) {
        const cx = fb.x - this.cameraX;
        const cy = fb.y;
        ctx.fillStyle = '#78350f';
        ctx.beginPath();
        ctx.arc(cx, cy, 10, 0, Math.PI * 2);
        ctx.fill();

        const nodeCount = 5;
        for (let i = 1; i <= nodeCount; i++) {
          const dist = (fb.length / nodeCount) * i;
          const nx = cx + Math.cos(fb.angle) * dist;
          const ny = cy + Math.sin(fb.angle) * dist;
          ctx.fillStyle = '#ea580c';
          ctx.beginPath();
          ctx.arc(nx, ny, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fde047';
          ctx.beginPath();
          ctx.arc(nx, ny, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      },

      drawAxe(axe: any) {
        const x = axe.x - this.cameraX;
        if (x < -axe.w || x > W) return;
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(x + 10, axe.y + 12, 12, 18);
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(x + 4, axe.y + 4, 24, 8);
        ctx.fillRect(x + 2, axe.y + 2, 8, 12);
      },

      drawFlagAndCastle() {
        if (!this.flag) return;
        const fx = this.flag.x - this.cameraX;
        if (fx >= -50 && fx <= W + 150) {
          ctx.fillStyle = '#94a3b8';
          ctx.fillRect(fx, this.flag.y, this.flag.w, this.flag.h);
          ctx.fillStyle = '#facc15';
          ctx.fillRect(fx - 4, this.flag.y - 12, 16, 12);

          const flagY = this.flag.y + this.flag.slide * (this.flag.h - 36);
          ctx.fillStyle = '#2563eb';
          ctx.beginPath();
          ctx.moveTo(fx + 8, flagY);
          ctx.lineTo(fx + 40, flagY + 16);
          ctx.lineTo(fx + 8, flagY + 32);
          ctx.fill();

          const cx = fx + 70;
          const cy = GROUND_Y - 140;
          ctx.fillStyle = '#64748b';
          ctx.fillRect(cx, cy, 140, 140);
          ctx.fillStyle = '#475569';
          for (let i = 0; i < 4; i++) {
            ctx.fillRect(cx + i * 36, cy - 20, 24, 20);
          }
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(cx + 45, cy + 70, 50, 70);
        }
      },

      drawPickup(item: any) {
        if (item.collected) return;
        const x = item.x - this.cameraX;
        if (x < -item.w || x > W) return;
        const y = item.y;

        if (item.type === 'coin') {
          const rot = Math.abs(Math.sin(item.phase));
          const cw = Math.max(4, item.w * rot);
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(x + (item.w - cw) / 2, y, cw, item.h);
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(x + (item.w - cw) / 2 + 2, y + 2, Math.max(2, cw - 4), item.h - 4);
        } else if (item.type === 'mushroom' || item.type === '1up') {
          const capColor = item.type === '1up' ? '#22c55e' : '#2563eb';
          ctx.fillStyle = capColor;
          ctx.fillRect(x + 3, y, item.w - 6, 18);
          ctx.fillRect(x, y + 6, item.w, 12);
          ctx.fillStyle = '#fff';
          ctx.fillRect(x + 8, y + 4, 12, 10);
          ctx.fillStyle = '#fed7aa';
          ctx.fillRect(x + 6, y + 18, item.w - 12, 10);
        } else if (item.type === 'flower') {
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(x + 4, y, 20, 20);
          ctx.fillStyle = '#9333ea';
          ctx.fillRect(x, y + 4, 28, 12);
          ctx.fillStyle = '#fff';
          ctx.fillRect(x + 8, y + 8, 12, 12);
          ctx.fillStyle = '#22c55e';
          ctx.fillRect(x + 12, y + 20, 4, 8);
        } else if (item.type === 'star') {
          const colors = ['#fde047', '#38bdf8', '#c084fc', '#f43f5e'];
          ctx.fillStyle = colors[Math.floor(this.frame * 8) % colors.length];
          ctx.fillRect(x + 6, y, 16, 28);
          ctx.fillRect(x, y + 6, 28, 16);
          ctx.fillStyle = '#000';
          ctx.fillRect(x + 9, y + 8, 3, 6);
          ctx.fillRect(x + 16, y + 8, 3, 6);
        }
      },

      drawEnemy(e: any) {
        const x = e.x - this.cameraX;
        if (x < -e.w || x > W) return;
        const y = e.y;

        if (e.dead && e.kind !== 'piranha') {
          ctx.save();
          ctx.translate(x + e.w / 2, y + e.h / 2);
          ctx.scale(1, -1);
          this.drawBugSprite(0, 0);
          ctx.restore();
          return;
        }

        if (e.kind === 'bug') {
          this.drawBugSprite(x, y);
        } else if (e.kind === 'turtle' || e.kind === 'paratroopa') {
          this.drawTurtleSprite(x, y, e);
        } else if (e.kind === 'piranha') {
          this.drawPiranhaSprite(x, y);
        }
      },

      drawBugSprite(x: number, y: number) {
        const step = Math.floor(this.frame * 5) % 2;
        ctx.fillStyle = '#9333ea';
        ctx.fillRect(x + 4, y, 24, 20);
        ctx.fillRect(x, y + 8, 32, 14);
        ctx.fillStyle = '#fff';
        ctx.fillRect(x + 6, y + 8, 6, 8);
        ctx.fillRect(x + 20, y + 8, 6, 8);
        ctx.fillStyle = '#000';
        ctx.fillRect(x + 8, y + 10, 3, 4);
        ctx.fillRect(x + 22, y + 10, 3, 4);
        ctx.fillStyle = '#4c1d95';
        if (step === 0) {
          ctx.fillRect(x + 2, y + 22, 10, 10);
          ctx.fillRect(x + 20, y + 24, 10, 8);
        } else {
          ctx.fillRect(x + 2, y + 24, 10, 8);
          ctx.fillRect(x + 20, y + 22, 10, 10);
        }
      },

      drawTurtleSprite(x: number, y: number, e: any) {
        if (e.state === 'shell') {
          const rot = Math.abs(e.vx) > 0 ? (this.frame * 20) % (Math.PI * 2) : 0;
          ctx.save();
          ctx.translate(x + 16, y + 12);
          ctx.rotate(rot);
          ctx.fillStyle = '#059669';
          ctx.fillRect(-14, -10, 28, 20);
          ctx.fillStyle = '#34d399';
          ctx.fillRect(-10, -6, 20, 12);
          ctx.restore();
          return;
        }

        ctx.fillStyle = '#059669';
        ctx.fillRect(x + 4, y + 10, 24, 20);
        ctx.fillStyle = '#6ee7b7';
        ctx.fillRect(x + 8, y + 14, 16, 12);
        ctx.fillStyle = '#fde047';
        ctx.fillRect(x + (e.vx < 0 ? 0 : 20), y + 2, 12, 14);
        ctx.fillStyle = '#000';
        ctx.fillRect(x + (e.vx < 0 ? 3 : 25), y + 6, 3, 3);
        if (e.kind === 'paratroopa') {
          ctx.fillStyle = '#fff';
          ctx.fillRect(x + (e.vx < 0 ? 18 : 2), y - 4, 12, 16);
        }
      },

      drawPiranhaSprite(x: number, y: number) {
        const mouthOpen = Math.floor(this.frame * 6) % 2 === 0;
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(x + 4, y, 32, 34);
        ctx.fillStyle = '#fff';
        ctx.fillRect(x + 8, y + 4, 6, 6);
        ctx.fillRect(x + 24, y + 14, 6, 6);
        ctx.fillStyle = '#fff';
        if (mouthOpen) {
          ctx.fillRect(x + 10, y + 12, 20, 8);
          ctx.fillStyle = '#000';
          ctx.fillRect(x + 12, y + 14, 16, 4);
        }
        ctx.fillStyle = '#16a34a';
        ctx.fillRect(x + 16, y + 34, 8, 12);
      },

      drawBoss(b: any) {
        const x = b.x - this.cameraX;
        if (x < -b.w || x > W) return;
        const y = b.y;

        ctx.save();
        if (b.dead) {
          ctx.translate(x + b.w / 2, y + b.h / 2);
          ctx.scale(1, -1);
          ctx.translate(-b.w / 2, -b.h / 2);
        }

        ctx.fillStyle = '#1e1b4b';
        ctx.fillRect(x + 10, y + 12, 44, 46);
        ctx.fillStyle = '#4338ca';
        ctx.fillRect(x + 24, y + 16, 34, 38);
        ctx.fillStyle = '#f43f5e';
        ctx.fillRect(x + 32, y + 8, 8, 8);
        ctx.fillRect(x + 48, y + 16, 8, 8);
        ctx.fillStyle = '#312e81';
        ctx.fillRect(x, y + 4, 28, 28);
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(x + 4, y - 6, 8, 10);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(x + 6, y + 10, 8, 8);
        ctx.fillStyle = '#334155';
        ctx.fillRect(x, y - 18, 64, 6);
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(x, y - 18, (b.hp / b.maxHp) * 64, 6);

        ctx.restore();
      },

      drawProjectile(shot: any) {
        const x = shot.x - this.cameraX;
        if (x < -shot.w || x > W) return;
        const y = shot.y;

        if (shot.isBossShot) {
          ctx.fillStyle = '#ea580c';
          ctx.beginPath();
          ctx.arc(x + shot.w / 2, y + shot.h / 2, 9, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fde047';
          ctx.beginPath();
          ctx.arc(x + shot.w / 2, y + shot.h / 2, 5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          const colors = ['#38bdf8', '#818cf8', '#c084fc', '#fff'];
          ctx.fillStyle = colors[Math.floor(this.frame * 12) % colors.length];
          ctx.beginPath();
          ctx.arc(x + shot.w / 2, y + shot.h / 2, 7, 0, Math.PI * 2);
          ctx.fill();
        }
      },

      drawPlayer() {
        const p = this.player;
        if (p.invulnerable > 0 && Math.floor(this.frame * 20) % 2 === 0) return;

        const x = p.x - this.cameraX;
        const y = p.y;
        const w = p.w;

        ctx.save();
        if (p.facing < 0) {
          ctx.translate(x + w, y);
          ctx.scale(-1, 1);
        } else {
          ctx.translate(x, y);
        }

        let shirtColor = '#1d4ed8';
        let overallColor = '#1e293b';
        let capColor = '#2563eb';

        if (p.fire) {
          shirtColor = '#fff';
          overallColor = '#9333ea';
          capColor = '#38bdf8';
        }

        if (p.starTimer > 0) {
          const rainbow = ['#f43f5e', '#fbbf24', '#34d399', '#38bdf8', '#c084fc'];
          shirtColor = rainbow[Math.floor(this.frame * 12) % rainbow.length];
          overallColor = rainbow[Math.floor(this.frame * 12 + 2) % rainbow.length];
          capColor = shirtColor;
        }

        const animStep = Math.floor(p.animation) % 3;

        if (!p.big || p.crouching) {
          ctx.fillStyle = capColor;
          ctx.fillRect(4, 0, 18, 8);
          ctx.fillRect(8, 2, 18, 6);
          ctx.fillStyle = '#fed7aa';
          ctx.fillRect(6, 8, 16, 10);
          ctx.fillStyle = '#78350f';
          ctx.fillRect(16, 12, 6, 4);
          ctx.fillStyle = shirtColor;
          ctx.fillRect(4, 18, 20, 8);
          ctx.fillStyle = overallColor;
          ctx.fillRect(6, 22, 16, 8);
          ctx.fillStyle = '#60a5fa';
          ctx.fillRect(13, 23, 2, 4);
          ctx.fillRect(12, 24, 4, 2);

          ctx.fillStyle = '#78350f';
          if (!p.grounded) {
            ctx.fillRect(2, 28, 8, 6);
            ctx.fillRect(18, 26, 8, 6);
          } else if (animStep === 1) {
            ctx.fillRect(2, 28, 10, 6);
            ctx.fillRect(16, 28, 10, 6);
          } else {
            ctx.fillRect(6, 28, 8, 6);
            ctx.fillRect(14, 28, 8, 6);
          }
        } else {
          ctx.fillStyle = capColor;
          ctx.fillRect(4, 0, 20, 12);
          ctx.fillRect(8, 4, 20, 8);
          ctx.fillStyle = '#fed7aa';
          ctx.fillRect(6, 12, 18, 14);
          ctx.fillStyle = '#78350f';
          ctx.fillRect(16, 18, 8, 5);
          ctx.fillStyle = shirtColor;
          ctx.fillRect(4, 26, 20, 14);
          ctx.fillStyle = overallColor;
          ctx.fillRect(6, 34, 16, 16);
          ctx.fillStyle = '#93c5fd';
          ctx.fillRect(13, 37, 3, 6);
          ctx.fillRect(11, 38, 7, 3);
          ctx.fillStyle = '#78350f';
          if (!p.grounded) {
            ctx.fillRect(2, 48, 10, 10);
            ctx.fillRect(18, 44, 10, 10);
          } else if (animStep === 1) {
            ctx.fillRect(0, 48, 12, 10);
            ctx.fillRect(16, 48, 12, 10);
          } else {
            ctx.fillRect(4, 48, 10, 10);
            ctx.fillRect(14, 48, 10, 10);
          }
        }

        ctx.restore();
      },

      drawParticlesAndPopups() {
        for (const pt of this.particles) {
          const px = pt.x - this.cameraX;
          if (pt.type === 'coin_pop') {
            ctx.fillStyle = '#facc15';
            ctx.fillRect(px, pt.y, 14, 18);
          } else if (pt.type === 'brick_debris') {
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(px, pt.y, 8, 8);
          }
        }

        for (const pp of this.popups) {
          const px = pp.x - this.cameraX;
          ctx.fillStyle = pp.color || '#fff';
          ctx.font = 'bold 16px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(pp.text, px, pp.y);
        }
      },

      drawHUD() {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 18px monospace';
        ctx.textAlign = 'left';

        ctx.fillText('GEMINI', 30, 32);
        ctx.fillText(String(this.score).padStart(6, '0'), 30, 54);

        ctx.fillStyle = '#facc15';
        ctx.fillRect(260, 38, 10, 14);
        ctx.fillStyle = '#fff';
        ctx.fillText(`× ${String(this.coins).padStart(2, '0')}`, 280, 52);

        ctx.textAlign = 'center';
        ctx.fillText('WORLD', W / 2, 32);
        ctx.fillText(`1-${this.currentWorld}`, W / 2, 54);

        ctx.textAlign = 'right';
        ctx.fillText('TIME', W - 30, 32);
        ctx.fillText(String(Math.max(0, this.timeLeft)).padStart(3, '0'), W - 30, 54);

        ctx.textAlign = 'left';
        ctx.fillText(`♥ × ${this.lives}`, 30, 82);
      },

      drawTitleScreen() {
        this.drawBackground();
        const baseY = 420;
        ctx.fillStyle = '#d97706';
        ctx.fillRect(0, baseY, W, H - baseY);

        ctx.textAlign = 'center';

        ctx.font = '900 68px Arial Black, sans-serif';
        ctx.lineWidth = 14;
        ctx.strokeStyle = '#1e1b4b';
        ctx.strokeText('GEMINI 3.7', W / 2, 140);
        const titleGrad = ctx.createLinearGradient(0, 80, 0, 150);
        titleGrad.addColorStop(0, '#60a5fa');
        titleGrad.addColorStop(0.5, '#3b82f6');
        titleGrad.addColorStop(1, '#9333ea');
        ctx.fillStyle = titleGrad;
        ctx.fillText('GEMINI 3.7', W / 2, 140);

        ctx.font = '900 52px Arial Black, sans-serif';
        ctx.strokeStyle = '#0f172a';
        ctx.strokeText('BROS.', W / 2, 210);
        ctx.fillStyle = '#facc15';
        ctx.fillText('BROS.', W / 2, 210);

        ctx.font = 'bold 22px monospace';
        const blink = Math.floor(this.frame * 2.5) % 2 === 0;
        if (blink) {
          ctx.fillStyle = '#fff';
          ctx.fillText('PRESS ENTER / TAP TO START', W / 2, 290);
        }

        ctx.font = 'bold 15px monospace';
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText('4 WORLDS • BOSS BATTLE • CHIP-TUNE BGM • POWER-UPS', W / 2, 345);

        ctx.font = 'bold 13px monospace';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('← → MOVE   Space/Z JUMP   Shift/X RUN/FIRE   ↓ CROUCH', W / 2, 380);

        ctx.fillText('© 2026 GOOGLE DEEPMIND / GEMINI AI ADVENTURE', W / 2, 510);
      },

      drawEndScreen(title: string, subtitle: string, color: string) {
        ctx.fillStyle = '#090d16';
        ctx.fillRect(0, 0, W, H);

        ctx.textAlign = 'center';
        ctx.font = '900 54px Arial Black, sans-serif';
        ctx.fillStyle = color;
        ctx.fillText(title, W / 2, 180);

        ctx.font = 'bold 22px monospace';
        ctx.fillStyle = '#fff';
        ctx.fillText(subtitle, W / 2, 240);

        ctx.fillStyle = '#facc15';
        ctx.fillText(`FINAL SCORE: ${String(this.score).padStart(6, '0')}`, W / 2, 300);

        if (Math.floor(this.frame * 2.5) % 2 === 0) {
          ctx.fillStyle = '#94a3b8';
          ctx.font = 'bold 18px monospace';
          ctx.fillText('PRESS ENTER / TAP TO REPLAY', W / 2, 380);
        }
      },
    };

    const handleCanvasClick = () => {
      initAudio();
      if (game.mode === 'title' || game.mode === 'won' || game.mode === 'gameover') {
        game.startOrRestart();
      }
    };
    canvas.addEventListener('pointerdown', handleCanvasClick);

    let lastTime = 0;
    function loop(timestamp: number) {
      if (!isMounted) return;
      const dt = Math.min((timestamp - lastTime) / 1000 || 0, 1 / 30);
      lastTime = timestamp;

      game.update(dt);
      game.draw();

      animId = requestAnimationFrame(loop);
    }

    animId = requestAnimationFrame(loop);

    return () => {
      isMounted = false;
      if (animId) cancelAnimationFrame(animId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      canvas.removeEventListener('pointerdown', handleCanvasClick);
      if (audioCtx && audioCtx.state !== 'closed') {
        audioCtx.close().catch(() => {});
      }
    };
  }, [soundEnabled]);

  return (
    <div className="w-full flex flex-col items-center select-none">
      {/* ナビゲーションバー */}
      <div className="w-full max-w-4xl flex items-center justify-between mb-4">
        <button
          onClick={onBackToHub}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl border transition ${
            isDark
              ? 'text-slate-300 hover:text-white bg-slate-900 border-slate-800 hover:bg-slate-800'
              : 'text-slate-700 hover:text-slate-900 bg-white border-slate-200 hover:bg-slate-50 shadow-xs'
          }`}
        >
          <ArrowLeft className="w-4 h-4 text-indigo-500" />
          ゲーム一覧に戻る
        </button>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-amber-500 font-mono font-bold">
            <Trophy className="w-4 h-4" />
            <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
              HIGH SCORE:
            </span>
            <span>{highScore > 0 ? highScore.toLocaleString() : '--'}</span>
          </div>

          <button
            onClick={() => setSoundEnabled((prev: boolean) => !prev)}
            className={`p-2 rounded-xl border transition ${
              isDark
                ? soundEnabled
                  ? 'bg-slate-900 border-slate-700 text-indigo-400'
                  : 'bg-slate-950 border-slate-800 text-slate-500'
                : soundEnabled
                ? 'bg-white border-slate-200 text-indigo-600 shadow-xs'
                : 'bg-slate-100 border-slate-200 text-slate-400'
            }`}
            title={soundEnabled ? 'サウンドON' : 'サウンドOFF'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setCrtEnabled((prev: boolean) => !prev)}
            className={`p-2 rounded-xl border transition ${
              isDark
                ? crtEnabled
                  ? 'bg-slate-900 border-slate-700 text-amber-400'
                  : 'bg-slate-950 border-slate-800 text-slate-500'
                : crtEnabled
                ? 'bg-white border-slate-200 text-amber-600 shadow-xs'
                : 'bg-slate-100 border-slate-200 text-slate-400'
            }`}
            title={crtEnabled ? 'CRTエフェクトON' : 'CRTエフェクトOFF'}
          >
            <Tv className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ゲーム本体画面 */}
      <div
        ref={containerRef}
        className={`relative w-full max-w-4xl aspect-video rounded-3xl overflow-hidden border-2 shadow-2xl transition-all ${
          isDark
            ? 'bg-black border-indigo-500/40 shadow-[0_0_50px_rgba(99,102,241,0.2)]'
            : 'bg-black border-indigo-200 shadow-2xl'
        }`}
      >
        <canvas
          ref={canvasRef}
          width={960}
          height={540}
          className="w-full h-full block pixelated"
          style={{ imageRendering: 'pixelated' }}
        />

        {/* CRT Scanline Overlay */}
        {crtEnabled && (
          <div
            className="absolute inset-0 pointer-events-none z-10 opacity-75"
            style={{
              backgroundImage:
                'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.35) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.03), rgba(0, 255, 0, 0.01), rgba(0, 255, 0, 0.03))',
              backgroundSize: '100% 3px, 6px 100%',
            }}
          />
        )}
      </div>

      {/* スマホ・タッチ用オンスクリーンコントローラー */}
      <div className="w-full max-w-4xl mt-4 flex items-center justify-between px-2 touch-manipulation">
        {/* D-PAD 十字キー */}
        <div className="relative w-36 h-36">
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              touchHandlersRef.current.onKeyStart('left');
            }}
            onPointerUp={(e) => {
              e.preventDefault();
              touchHandlersRef.current.onKeyEnd('left');
            }}
            onPointerCancel={(e) => {
              e.preventDefault();
              touchHandlersRef.current.onKeyEnd('left');
            }}
            className={`absolute left-0 top-12 w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl active:scale-90 transition border ${
              isDark
                ? 'bg-slate-900 border-slate-700 text-white'
                : 'bg-white border-slate-300 text-slate-800 shadow-md'
            }`}
          >
            ◀
          </button>
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              touchHandlersRef.current.onKeyStart('right');
            }}
            onPointerUp={(e) => {
              e.preventDefault();
              touchHandlersRef.current.onKeyEnd('right');
            }}
            onPointerCancel={(e) => {
              e.preventDefault();
              touchHandlersRef.current.onKeyEnd('right');
            }}
            className={`absolute right-0 top-12 w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl active:scale-90 transition border ${
              isDark
                ? 'bg-slate-900 border-slate-700 text-white'
                : 'bg-white border-slate-300 text-slate-800 shadow-md'
            }`}
          >
            ▶
          </button>
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              touchHandlersRef.current.onKeyStart('down');
            }}
            onPointerUp={(e) => {
              e.preventDefault();
              touchHandlersRef.current.onKeyEnd('down');
            }}
            onPointerCancel={(e) => {
              e.preventDefault();
              touchHandlersRef.current.onKeyEnd('down');
            }}
            className={`absolute bottom-0 left-12 w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl active:scale-90 transition border ${
              isDark
                ? 'bg-slate-900 border-slate-700 text-white'
                : 'bg-white border-slate-300 text-slate-800 shadow-md'
            }`}
          >
            ▼
          </button>
        </div>

        {/* アクションボタン (A: ジャンプ, B: ダッシュ/思考ビーム) */}
        <div className="flex items-center gap-3">
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              touchHandlersRef.current.onKeyStart('run');
            }}
            onPointerUp={(e) => {
              e.preventDefault();
              touchHandlersRef.current.onKeyEnd('run');
            }}
            onPointerCancel={(e) => {
              e.preventDefault();
              touchHandlersRef.current.onKeyEnd('run');
            }}
            className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 to-amber-600 text-white font-black text-sm flex flex-col items-center justify-center active:scale-90 shadow-lg border-2 border-white/40"
          >
            <span>B</span>
            <span className="text-[9px] opacity-80">FIRE</span>
          </button>

          <button
            onPointerDown={(e) => {
              e.preventDefault();
              touchHandlersRef.current.onKeyStart('jump');
            }}
            onPointerUp={(e) => {
              e.preventDefault();
              touchHandlersRef.current.onKeyEnd('jump');
            }}
            onPointerCancel={(e) => {
              e.preventDefault();
              touchHandlersRef.current.onKeyEnd('jump');
            }}
            className="w-18 h-18 rounded-full bg-gradient-to-tr from-indigo-500 to-blue-600 text-white font-black text-base flex flex-col items-center justify-center active:scale-90 shadow-xl border-2 border-white/60"
          >
            <span>A</span>
            <span className="text-[10px] opacity-80">JUMP</span>
          </button>
        </div>
      </div>

      {/* 操作説明フッター */}
      <div
        className={`mt-4 p-4 rounded-2xl border max-w-4xl w-full text-xs flex flex-wrap items-center justify-around gap-2 text-center ${
          isDark
            ? 'bg-slate-900/60 border-slate-800 text-slate-400'
            : 'bg-white border-slate-200 text-slate-600 shadow-xs'
        }`}
      >
        <div>
          <span className="font-bold">移動:</span>{' '}
          <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-white font-mono text-[11px]">←</kbd>{' '}
          <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-white font-mono text-[11px]">→</kbd>
        </div>
        <div>
          <span className="font-bold">ジャンプ:</span>{' '}
          <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-white font-mono text-[11px]">Space</kbd> /{' '}
          <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-white font-mono text-[11px]">Z</kbd>
        </div>
        <div>
          <span className="font-bold">ダッシュ / 思考ビーム:</span>{' '}
          <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-white font-mono text-[11px]">Shift</kbd> /{' '}
          <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-white font-mono text-[11px]">X</kbd>
        </div>
        <div>
          <span className="font-bold">しゃがむ / 土管に入る:</span>{' '}
          <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-white font-mono text-[11px]">↓</kbd>
        </div>
      </div>
    </div>
  );
};
