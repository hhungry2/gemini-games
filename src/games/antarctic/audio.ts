// Web Audio API による 8-bit PSG サウンドエンジン
// けっきょく南極大冒険（BGM: スケーターズ・ワルツ / The Skater's Waltz）

type NoteItem = {
  pitch: string | null; // null represents rest
  duration: number; // in beats (1 beat = quarter note)
};

const NOTE_FREQS: Record<string, number> = {
  'C2': 65.41, 'D2': 73.42, 'E2': 82.41, 'F2': 87.31, 'G2': 98.00, 'A2': 110.00, 'B2': 123.47,
  'C3': 130.81, 'C#3': 138.59, 'D3': 146.83, 'D#3': 155.56, 'E3': 164.81, 'F3': 174.61, 'F#3': 185.00,
  'G3': 196.00, 'G#3': 207.65, 'A3': 220.00, 'A#3': 233.08, 'B3': 246.94,
  'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13, 'E4': 329.63, 'F4': 349.23, 'F#4': 369.99,
  'G4': 392.00, 'G#4': 415.30, 'A4': 440.00, 'A#4': 466.16, 'B4': 493.88,
  'C5': 523.25, 'C#5': 554.37, 'D5': 587.33, 'D#5': 622.25, 'E5': 659.25, 'F5': 698.46, 'F#5': 739.99,
  'G5': 783.99, 'G#5': 830.61, 'A5': 880.00, 'A#5': 932.33, 'B5': 987.77,
  'C6': 1046.50, 'D6': 1174.66, 'E6': 1318.51, 'F6': 1396.91, 'G6': 1567.98
};

// スケーターズ・ワルツ 主旋律 (Lead Melody, 3/4拍子)
const SKATERS_WALTZ_MELODY: NoteItem[] = [
  // イントロ (4小節)
  { pitch: 'G4', duration: 1 }, { pitch: 'C5', duration: 1 }, { pitch: 'E5', duration: 1 },
  { pitch: 'G5', duration: 3 },
  { pitch: 'E5', duration: 1.5 }, { pitch: 'C5', duration: 1.5 },
  { pitch: 'G4', duration: 3 },

  // Aメロ (16小節)
  { pitch: 'E5', duration: 3 },
  { pitch: 'E5', duration: 2 }, { pitch: 'D#5', duration: 1 },
  { pitch: 'E5', duration: 2 }, { pitch: 'F5', duration: 1 },
  { pitch: 'E5', duration: 3 },

  { pitch: 'D5', duration: 3 },
  { pitch: 'D5', duration: 2 }, { pitch: 'C#5', duration: 1 },
  { pitch: 'D5', duration: 2 }, { pitch: 'E5', duration: 1 },
  { pitch: 'D5', duration: 3 },

  { pitch: 'C5', duration: 2 }, { pitch: 'B4', duration: 1 },
  { pitch: 'C5', duration: 2 }, { pitch: 'D5', duration: 1 },
  { pitch: 'E5', duration: 2 }, { pitch: 'D5', duration: 1 },
  { pitch: 'C5', duration: 2 }, { pitch: 'B4', duration: 1 },

  { pitch: 'A4', duration: 3 },
  { pitch: 'B4', duration: 3 },
  { pitch: 'C5', duration: 3 },
  { pitch: 'G4', duration: 3 },

  // A'メロ (16小節)
  { pitch: 'E5', duration: 3 },
  { pitch: 'E5', duration: 2 }, { pitch: 'D#5', duration: 1 },
  { pitch: 'E5', duration: 2 }, { pitch: 'F5', duration: 1 },
  { pitch: 'E5', duration: 3 },

  { pitch: 'D5', duration: 3 },
  { pitch: 'D5', duration: 2 }, { pitch: 'C#5', duration: 1 },
  { pitch: 'D5', duration: 2 }, { pitch: 'E5', duration: 1 },
  { pitch: 'D5', duration: 3 },

  { pitch: 'C5', duration: 2 }, { pitch: 'B4', duration: 1 },
  { pitch: 'C5', duration: 2 }, { pitch: 'D5', duration: 1 },
  { pitch: 'E5', duration: 2 }, { pitch: 'D5', duration: 1 },
  { pitch: 'C5', duration: 2 }, { pitch: 'B4', duration: 1 },

  { pitch: 'A4', duration: 3 },
  { pitch: 'B4', duration: 3 },
  { pitch: 'C5', duration: 3 },
  { pitch: 'C5', duration: 3 },

  // Bメロ (高揚パート 16小節)
  { pitch: 'G5', duration: 3 },
  { pitch: 'F5', duration: 2 }, { pitch: 'D5', duration: 1 },
  { pitch: 'B4', duration: 3 },
  { pitch: 'G4', duration: 3 },

  { pitch: 'A4', duration: 2 }, { pitch: 'B4', duration: 1 },
  { pitch: 'C5', duration: 2 }, { pitch: 'D5', duration: 1 },
  { pitch: 'E5', duration: 3 },
  { pitch: 'C5', duration: 3 },

  { pitch: 'G5', duration: 3 },
  { pitch: 'F5', duration: 2 }, { pitch: 'D5', duration: 1 },
  { pitch: 'B4', duration: 3 },
  { pitch: 'G4', duration: 3 },

  { pitch: 'A4', duration: 2 }, { pitch: 'B4', duration: 1 },
  { pitch: 'D5', duration: 2 }, { pitch: 'B4', duration: 1 },
  { pitch: 'C5', duration: 3 },
  { pitch: null, duration: 3 },
];

// スケーターズ・ワルツ ハーモニー (Harmony / Counter, 3/4拍子)
const SKATERS_WALTZ_HARMONY: NoteItem[] = [
  // イントロ
  { pitch: null, duration: 3 },
  { pitch: 'C5', duration: 3 },
  { pitch: 'G4', duration: 3 },
  { pitch: 'E4', duration: 3 },

  // Aメロ
  { pitch: 'C5', duration: 3 },
  { pitch: 'C5', duration: 2 }, { pitch: 'B4', duration: 1 },
  { pitch: 'C5', duration: 2 }, { pitch: 'D5', duration: 1 },
  { pitch: 'C5', duration: 3 },

  { pitch: 'B4', duration: 3 },
  { pitch: 'B4', duration: 2 }, { pitch: 'A#4', duration: 1 },
  { pitch: 'B4', duration: 2 }, { pitch: 'C5', duration: 1 },
  { pitch: 'B4', duration: 3 },

  { pitch: 'A4', duration: 2 }, { pitch: 'G#4', duration: 1 },
  { pitch: 'A4', duration: 2 }, { pitch: 'B4', duration: 1 },
  { pitch: 'C5', duration: 2 }, { pitch: 'B4', duration: 1 },
  { pitch: 'A4', duration: 2 }, { pitch: 'G4', duration: 1 },

  { pitch: 'F4', duration: 3 },
  { pitch: 'G4', duration: 3 },
  { pitch: 'E4', duration: 3 },
  { pitch: 'E4', duration: 3 },

  // A'メロ
  { pitch: 'C5', duration: 3 },
  { pitch: 'C5', duration: 2 }, { pitch: 'B4', duration: 1 },
  { pitch: 'C5', duration: 2 }, { pitch: 'D5', duration: 1 },
  { pitch: 'C5', duration: 3 },

  { pitch: 'B4', duration: 3 },
  { pitch: 'B4', duration: 2 }, { pitch: 'A#4', duration: 1 },
  { pitch: 'B4', duration: 2 }, { pitch: 'C5', duration: 1 },
  { pitch: 'B4', duration: 3 },

  { pitch: 'A4', duration: 2 }, { pitch: 'G#4', duration: 1 },
  { pitch: 'A4', duration: 2 }, { pitch: 'B4', duration: 1 },
  { pitch: 'C5', duration: 2 }, { pitch: 'B4', duration: 1 },
  { pitch: 'A4', duration: 2 }, { pitch: 'G4', duration: 1 },

  { pitch: 'F4', duration: 3 },
  { pitch: 'G4', duration: 3 },
  { pitch: 'E4', duration: 3 },
  { pitch: 'E4', duration: 3 },

  // Bメロ
  { pitch: 'E5', duration: 3 },
  { pitch: 'D5', duration: 2 }, { pitch: 'B4', duration: 1 },
  { pitch: 'G4', duration: 3 },
  { pitch: 'E4', duration: 3 },

  { pitch: 'F4', duration: 2 }, { pitch: 'G4', duration: 1 },
  { pitch: 'A4', duration: 2 }, { pitch: 'B4', duration: 1 },
  { pitch: 'C5', duration: 3 },
  { pitch: 'G4', duration: 3 },

  { pitch: 'E5', duration: 3 },
  { pitch: 'D5', duration: 2 }, { pitch: 'B4', duration: 1 },
  { pitch: 'G4', duration: 3 },
  { pitch: 'E4', duration: 3 },

  { pitch: 'F4', duration: 2 }, { pitch: 'G4', duration: 1 },
  { pitch: 'G4', duration: 2 }, { pitch: 'F4', duration: 1 },
  { pitch: 'E4', duration: 3 },
  { pitch: null, duration: 3 },
];

// スケーターズ・ワルツ ベースライン (Bass: ズン・チャッ・チャッ)
const SKATERS_WALTZ_BASS: NoteItem[] = [
  // イントロ (4小節)
  { pitch: 'C3', duration: 1 }, { pitch: 'G3', duration: 1 }, { pitch: 'G3', duration: 1 },
  { pitch: 'C3', duration: 1 }, { pitch: 'G3', duration: 1 }, { pitch: 'G3', duration: 1 },
  { pitch: 'G2', duration: 1 }, { pitch: 'G3', duration: 1 }, { pitch: 'G3', duration: 1 },
  { pitch: 'C3', duration: 1 }, { pitch: 'G3', duration: 1 }, { pitch: 'G3', duration: 1 },

  // Aメロ (16小節: C -> C -> C -> C -> G -> G -> G -> G -> F -> F -> C -> C -> F -> G -> C -> C)
  { pitch: 'C3', duration: 1 }, { pitch: 'E3', duration: 1 }, { pitch: 'G3', duration: 1 },
  { pitch: 'C3', duration: 1 }, { pitch: 'G3', duration: 1 }, { pitch: 'G3', duration: 1 },
  { pitch: 'C3', duration: 1 }, { pitch: 'G3', duration: 1 }, { pitch: 'G3', duration: 1 },
  { pitch: 'C3', duration: 1 }, { pitch: 'G3', duration: 1 }, { pitch: 'G3', duration: 1 },

  { pitch: 'G2', duration: 1 }, { pitch: 'B2', duration: 1 }, { pitch: 'D3', duration: 1 },
  { pitch: 'G2', duration: 1 }, { pitch: 'F3', duration: 1 }, { pitch: 'F3', duration: 1 },
  { pitch: 'G2', duration: 1 }, { pitch: 'F3', duration: 1 }, { pitch: 'F3', duration: 1 },
  { pitch: 'G2', duration: 1 }, { pitch: 'F3', duration: 1 }, { pitch: 'F3', duration: 1 },

  { pitch: 'A2', duration: 1 }, { pitch: 'C3', duration: 1 }, { pitch: 'E3', duration: 1 },
  { pitch: 'F2', duration: 1 }, { pitch: 'A2', duration: 1 }, { pitch: 'C3', duration: 1 },
  { pitch: 'C3', duration: 1 }, { pitch: 'G3', duration: 1 }, { pitch: 'G3', duration: 1 },
  { pitch: 'C3', duration: 1 }, { pitch: 'G3', duration: 1 }, { pitch: 'G3', duration: 1 },

  { pitch: 'F2', duration: 1 }, { pitch: 'A2', duration: 1 }, { pitch: 'C3', duration: 1 },
  { pitch: 'G2', duration: 1 }, { pitch: 'B2', duration: 1 }, { pitch: 'D3', duration: 1 },
  { pitch: 'C3', duration: 1 }, { pitch: 'G3', duration: 1 }, { pitch: 'G3', duration: 1 },
  { pitch: 'G2', duration: 1 }, { pitch: 'B2', duration: 1 }, { pitch: 'D3', duration: 1 },

  // A'メロ (16小節)
  { pitch: 'C3', duration: 1 }, { pitch: 'E3', duration: 1 }, { pitch: 'G3', duration: 1 },
  { pitch: 'C3', duration: 1 }, { pitch: 'G3', duration: 1 }, { pitch: 'G3', duration: 1 },
  { pitch: 'C3', duration: 1 }, { pitch: 'G3', duration: 1 }, { pitch: 'G3', duration: 1 },
  { pitch: 'C3', duration: 1 }, { pitch: 'G3', duration: 1 }, { pitch: 'G3', duration: 1 },

  { pitch: 'G2', duration: 1 }, { pitch: 'B2', duration: 1 }, { pitch: 'D3', duration: 1 },
  { pitch: 'G2', duration: 1 }, { pitch: 'F3', duration: 1 }, { pitch: 'F3', duration: 1 },
  { pitch: 'G2', duration: 1 }, { pitch: 'F3', duration: 1 }, { pitch: 'F3', duration: 1 },
  { pitch: 'G2', duration: 1 }, { pitch: 'F3', duration: 1 }, { pitch: 'F3', duration: 1 },

  { pitch: 'A2', duration: 1 }, { pitch: 'C3', duration: 1 }, { pitch: 'E3', duration: 1 },
  { pitch: 'F2', duration: 1 }, { pitch: 'A2', duration: 1 }, { pitch: 'C3', duration: 1 },
  { pitch: 'C3', duration: 1 }, { pitch: 'G3', duration: 1 }, { pitch: 'G3', duration: 1 },
  { pitch: 'C3', duration: 1 }, { pitch: 'G3', duration: 1 }, { pitch: 'G3', duration: 1 },

  { pitch: 'F2', duration: 1 }, { pitch: 'A2', duration: 1 }, { pitch: 'C3', duration: 1 },
  { pitch: 'G2', duration: 1 }, { pitch: 'B2', duration: 1 }, { pitch: 'D3', duration: 1 },
  { pitch: 'C3', duration: 1 }, { pitch: 'G3', duration: 1 }, { pitch: 'G3', duration: 1 },
  { pitch: 'C3', duration: 1 }, { pitch: 'G3', duration: 1 }, { pitch: 'G3', duration: 1 },

  // Bメロ (16小節)
  { pitch: 'G2', duration: 1 }, { pitch: 'B2', duration: 1 }, { pitch: 'D3', duration: 1 },
  { pitch: 'G2', duration: 1 }, { pitch: 'B2', duration: 1 }, { pitch: 'D3', duration: 1 },
  { pitch: 'G2', duration: 1 }, { pitch: 'B2', duration: 1 }, { pitch: 'D3', duration: 1 },
  { pitch: 'G2', duration: 1 }, { pitch: 'B2', duration: 1 }, { pitch: 'D3', duration: 1 },

  { pitch: 'F2', duration: 1 }, { pitch: 'A2', duration: 1 }, { pitch: 'C3', duration: 1 },
  { pitch: 'G2', duration: 1 }, { pitch: 'B2', duration: 1 }, { pitch: 'D3', duration: 1 },
  { pitch: 'C3', duration: 1 }, { pitch: 'G3', duration: 1 }, { pitch: 'G3', duration: 1 },
  { pitch: 'C3', duration: 1 }, { pitch: 'G3', duration: 1 }, { pitch: 'G3', duration: 1 },

  { pitch: 'G2', duration: 1 }, { pitch: 'B2', duration: 1 }, { pitch: 'D3', duration: 1 },
  { pitch: 'G2', duration: 1 }, { pitch: 'B2', duration: 1 }, { pitch: 'D3', duration: 1 },
  { pitch: 'G2', duration: 1 }, { pitch: 'B2', duration: 1 }, { pitch: 'D3', duration: 1 },
  { pitch: 'G2', duration: 1 }, { pitch: 'B2', duration: 1 }, { pitch: 'D3', duration: 1 },

  { pitch: 'F2', duration: 1 }, { pitch: 'A2', duration: 1 }, { pitch: 'C3', duration: 1 },
  { pitch: 'G2', duration: 1 }, { pitch: 'B2', duration: 1 }, { pitch: 'D3', duration: 1 },
  { pitch: 'C3', duration: 1 }, { pitch: 'G3', duration: 1 }, { pitch: 'G3', duration: 1 },
  { pitch: 'C3', duration: 1 }, { pitch: 'E3', duration: 1 }, { pitch: 'G3', duration: 1 },
];

export class AntarcticAudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private isBgmPlaying: boolean = false;
  private bpm: number = 175; // スケーターズ・ワルツ テンポ
  private loopTimeoutId: number | null = null;
  private scheduledOscs: OscillatorNode[] = [];

  constructor() {
    // ユーザーインタラクション時に初期化
  }

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.stopBgm();
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  // 短音再生 (Pulse/Square/Triangle)
  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'square',
    gainVal: number = 0.08,
    delay: number = 0,
    frequencyRampTo?: number
  ) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const startTime = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    if (frequencyRampTo !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(10, frequencyRampTo), startTime + duration);
    }

    gain.gain.setValueAtTime(gainVal, startTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  // ホワイトノイズ再生（スネア・ハイハット・激突）
  private playNoise(duration: number, gainVal: number = 0.04, delay: number = 0, filterFreq: number = 1000) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, Math.max(bufferSize, 100), this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = filterFreq;

    const gain = this.ctx.createGain();
    const startTime = this.ctx.currentTime + delay;

    gain.gain.setValueAtTime(gainVal, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(startTime);
    noise.stop(startTime + duration);
  }

  // ================= BGM 演奏 (スケーターズ・ワルツ) =================

  public startBgm() {
    if (this.isMuted || this.isBgmPlaying) return;
    this.initContext();
    if (!this.ctx) return;

    this.isBgmPlaying = true;
    this.scheduleBgmLoop();
  }

  public stopBgm() {
    this.isBgmPlaying = false;
    if (this.loopTimeoutId !== null) {
      window.clearTimeout(this.loopTimeoutId);
      this.loopTimeoutId = null;
    }
    // 既存のスケジュール済みノードを停止
    for (const osc of this.scheduledOscs) {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // ignore
      }
    }
    this.scheduledOscs = [];
  }

  private scheduleBgmLoop() {
    if (!this.isBgmPlaying || !this.ctx) return;

    const beatSec = 60 / this.bpm;
    const now = this.ctx.currentTime + 0.05;

    // トラックごとの音符をスケジュール
    const scheduleTrack = (
      notes: NoteItem[],
      type: OscillatorType,
      volume: number,
      detune: number = 0
    ) => {
      let timeCursor = now;
      for (const item of notes) {
        const noteDuration = item.duration * beatSec;
        if (item.pitch && NOTE_FREQS[item.pitch]) {
          const freq = NOTE_FREQS[item.pitch];
          const osc = this.ctx!.createOscillator();
          const gain = this.ctx!.createGain();

          osc.type = type;
          osc.frequency.setValueAtTime(freq, timeCursor);
          osc.detune.setValueAtTime(detune, timeCursor);

          // ピコピコ特有のスタッカート＆エンベロープ
          const soundDuration = noteDuration * 0.88;
          gain.gain.setValueAtTime(0.0001, timeCursor);
          gain.gain.linearRampToValueAtTime(volume, timeCursor + 0.015);
          gain.gain.setValueAtTime(volume * 0.8, timeCursor + soundDuration * 0.7);
          gain.gain.exponentialRampToValueAtTime(0.0001, timeCursor + soundDuration);

          osc.connect(gain);
          gain.connect(this.ctx!.destination);

          osc.start(timeCursor);
          osc.stop(timeCursor + soundDuration);
          this.scheduledOscs.push(osc);
        }
        timeCursor += noteDuration;
      }
      return timeCursor;
    };

    // メロディ (Lead 矩形波)
    const melodyEnd = scheduleTrack(SKATERS_WALTZ_MELODY, 'square', 0.07, 0);
    // ハーモニー (Ch 2 矩形波・微小デチューンでレトロな厚み)
    scheduleTrack(SKATERS_WALTZ_HARMONY, 'square', 0.04, 5);
    // ベース (Ch 3 三角波ベース)
    scheduleTrack(SKATERS_WALTZ_BASS, 'triangle', 0.12, 0);

    // リズム（ハイハット：2拍目と3拍目にチッチッ）
    let t = now;
    const totalBeats = SKATERS_WALTZ_MELODY.reduce((acc, cur) => acc + cur.duration, 0);
    for (let beat = 0; beat < totalBeats; beat++) {
      // 3/4拍子の2拍目・3拍目に軽いハット
      if (beat % 3 !== 0) {
        this.playNoise(0.02, 0.015, t - now, 3500);
      }
      t += beatSec;
    }

    // 次のループのタイマーセット
    const totalDurationMs = (melodyEnd - now) * 1000;
    this.loopTimeoutId = window.setTimeout(() => {
      if (this.isBgmPlaying) {
        this.scheduleBgmLoop();
      }
    }, Math.max(100, totalDurationMs - 150));
  }

  // ================= 効果音 (SE) =================

  /** ペン太の足音 (氷をシャッシャッ蹴る音) */
  public playFootstep(alt: boolean) {
    if (this.isMuted) return;
    const freq = alt ? 440 : 520;
    this.playTone(freq, 0.03, 'square', 0.02);
    this.playNoise(0.03, 0.02, 0, 2000);
  }

  /** ジャンプ音 (ポヨーン) */
  public playJump() {
    if (this.isMuted) return;
    this.playTone(280, 0.18, 'square', 0.09, 0, 720);
  }

  /** 着地音 (トン) */
  public playLand() {
    if (this.isMuted) return;
    this.playTone(180, 0.05, 'triangle', 0.06, 0, 90);
  }

  /** 魚キャッチ音 (ピロリロリン！) */
  public playCatchFish() {
    if (this.isMuted) return;
    const notes = [659.25, 783.99, 1046.5, 1318.51]; // E5, G5, C6, E6
    notes.forEach((freq, idx) => {
      this.playTone(freq, 0.09, 'square', 0.07, idx * 0.045);
    });
  }

  /** 旗（ペナント）取得音 */
  public playCatchFlag() {
    if (this.isMuted) return;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      this.playTone(freq, 0.08, 'square', 0.07, idx * 0.04);
    });
  }

  /** プロペラ旗取得＆装着音 */
  public playGetPropeller() {
    if (this.isMuted) return;
    const notes = [440, 554.37, 659.25, 880, 1108.73, 1318.51];
    notes.forEach((freq, idx) => {
      this.playTone(freq, 0.1, 'square', 0.08, idx * 0.04);
    });
  }

  /** プロペラ飛行音 (パタパタカタカタ) */
  public playPropellerFlap() {
    if (this.isMuted) return;
    this.playTone(600, 0.025, 'square', 0.04);
  }

  /** 穴落下・つまずき音 (ドスン！) */
  public playFallHole() {
    if (this.isMuted) return;
    this.playTone(400, 0.22, 'sawtooth', 0.09, 0, 110);
    this.playNoise(0.18, 0.06, 0.05, 500);
  }

  /** 穴からもがく音 */
  public playStruggle() {
    if (this.isMuted) return;
    this.playTone(320, 0.06, 'square', 0.05, 0, 480);
  }

  /** アザラシ激突・転倒音 */
  public playHitSeal() {
    if (this.isMuted) return;
    this.playTone(200, 0.3, 'sawtooth', 0.1, 0, 60);
    this.playNoise(0.25, 0.09, 0, 400);
  }

  /** 魚が穴から飛び出す音 (ピョーン) */
  public playFishJump() {
    if (this.isMuted) return;
    this.playTone(400, 0.12, 'sine', 0.05, 0, 850);
  }

  /** アザラシ出現音 (ニョキッ) */
  public playSealPop() {
    if (this.isMuted) return;
    this.playTone(250, 0.1, 'triangle', 0.05, 0, 450);
  }

  /** 残り時間アラーム (ピピピッ) */
  public playTimeAlarm() {
    if (this.isMuted) return;
    this.playTone(1200, 0.05, 'square', 0.08, 0);
    this.playTone(1200, 0.05, 'square', 0.08, 0.08);
  }

  /** ゴールファンファーレ (ステージクリア) */
  public playClearFanfare() {
    if (this.isMuted) return;
    this.stopBgm();
    // 華やかなクリアファンファーレ
    const notes = [
      { f: 523.25, d: 0.12 }, // C5
      { f: 659.25, d: 0.12 }, // E5
      { f: 783.99, d: 0.12 }, // G5
      { f: 1046.50, d: 0.28 }, // C6
      { f: 880.00, d: 0.12 }, // A5
      { f: 1046.50, d: 0.45 }, // C6
    ];
    let offset = 0;
    notes.forEach((n) => {
      this.playTone(n.f, n.d, 'square', 0.1, offset);
      this.playTone(n.f / 2, n.d, 'triangle', 0.12, offset);
      offset += n.d * 1.1;
    });
  }

  /** ゲームオーバー音 (時間切れ) */
  public playGameOver() {
    if (this.isMuted) return;
    this.stopBgm();
    const notes = [587.33, 554.37, 523.25, 493.88, 466.16, 440];
    notes.forEach((f, idx) => {
      this.playTone(f, 0.2, 'sawtooth', 0.08, idx * 0.18, f * 0.9);
    });
  }
}

export const antarcticAudio = new AntarcticAudioEngine();
