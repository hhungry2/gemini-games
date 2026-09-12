// Web Audio API による 8-bit PSG サウンドエンジン（Circus Charlie）

class CircusAudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private bgmPlaying: boolean = false;
  private bgmTimeoutId: number | null = null;
  private currentStep: number = 0;

  constructor() {
    // ユーザー操作時にコンテキスト初期化
  }

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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

  // ノート周波数変換 (例: 'C4' -> 261.63)
  private noteToFreq(note: string): number {
    const notes: Record<string, number> = {
      'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61, 'G3': 196.00, 'A3': 220.00, 'B3': 246.94,
      'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13, 'E4': 329.63, 'F4': 349.23, 'F#4': 369.99,
      'G4': 392.00, 'G#4': 415.30, 'A4': 440.00, 'A#4': 466.16, 'B4': 493.88,
      'C5': 523.25, 'C#5': 554.37, 'D5': 587.33, 'D#5': 622.25, 'E5': 659.25, 'F5': 698.46, 'F#5': 739.99,
      'G5': 783.99, 'G#5': 830.61, 'A5': 880.00, 'A#5': 932.33, 'B5': 987.77,
      'C6': 1046.50, 'D6': 1174.66, 'E6': 1318.51
    };
    return notes[note] || 440;
  }

  // 短音再生 (Pulse/Square)
  private playTone(freq: number, duration: number, type: OscillatorType = 'square', gainVal: number = 0.1, delay: number = 0) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const startTime = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(gainVal, startTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  // ノイズ再生 (ドラム・拍手)
  private playNoise(duration: number, gainVal: number = 0.05, delay: number = 0) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 800;

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

  // --- SE（効果音） ---

  // ジャンプ音（ポヨ〜ン / キュイッ）
  public playJump() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.16);
  }

  // コイン・火の輪通過ボーナス（ピロリン♪）
  public playCoin() {
    if (this.isMuted) return;
    const now = 0;
    this.playTone(987.77, 0.08, 'square', 0.15, now);       // B5
    this.playTone(1318.51, 0.22, 'square', 0.15, now + 0.08); // E6
  }

  // お猿ジャンプボーナス（ポワン♪）
  public playBonus() {
    if (this.isMuted) return;
    const now = 0;
    this.playTone(523.25, 0.06, 'triangle', 0.18, now);       // C5
    this.playTone(659.25, 0.06, 'triangle', 0.18, now + 0.06); // E5
    this.playTone(783.99, 0.14, 'triangle', 0.18, now + 0.12); // G5
  }

  // トランポリンバウンド音（ボヨヨン）
  public playBounce() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(440, now + 0.08);
    osc.frequency.linearRampToValueAtTime(200, now + 0.2);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.22);
  }

  // ブランコキャッチ
  public playCatch() {
    if (this.isMuted) return;
    this.playTone(880, 0.06, 'triangle', 0.18);
    this.playTone(1046.5, 0.12, 'square', 0.15, 0.06);
  }

  // 落下・ミス音（あのサーカスチャーリー特有の哀愁ある脱力ジングル）
  public playMiss() {
    this.stopBgm();
    if (this.isMuted) return;

    const seq: [string, number, number][] = [
      ['G4', 0.12, 0.0],
      ['F#4', 0.12, 0.12],
      ['F4', 0.12, 0.24],
      ['E4', 0.24, 0.36],
      ['D4', 0.15, 0.65],
      ['D4', 0.25, 0.85],
    ];

    seq.forEach(([note, dur, delay]) => {
      this.playTone(this.noteToFreq(note), dur, 'square', 0.18, delay);
    });
  }

  // ステージクリアファンファーレ
  public playStageClear() {
    this.stopBgm();
    if (this.isMuted) return;

    const fanfare: [string, number, number][] = [
      ['C5', 0.1, 0.0],
      ['E5', 0.1, 0.1],
      ['G5', 0.1, 0.2],
      ['C6', 0.25, 0.3],
      ['G5', 0.15, 0.58],
      ['C6', 0.45, 0.75],
    ];

    fanfare.forEach(([note, dur, delay]) => {
      this.playTone(this.noteToFreq(note), dur, 'square', 0.2, delay);
      this.playTone(this.noteToFreq(note) * 0.5, dur, 'triangle', 0.15, delay);
    });

    // 歓声・拍手
    for (let i = 0; i < 8; i++) {
      this.playNoise(0.12, 0.08, 0.4 + i * 0.1);
    }
  }

  // 観客の拍手
  public playApplause() {
    if (this.isMuted) return;
    for (let i = 0; i < 10; i++) {
      this.playNoise(0.15, 0.06, i * 0.08 + Math.random() * 0.03);
    }
  }

  // --- BGM（アメリカン・パトロール風の軽快サーカスマーチ） ---
  public startBgm() {
    if (this.bgmPlaying || this.isMuted) return;
    this.bgmPlaying = true;
    this.currentStep = 0;
    this.scheduleBgmTick();
  }

  public stopBgm() {
    this.bgmPlaying = false;
    if (this.bgmTimeoutId !== null) {
      window.clearTimeout(this.bgmTimeoutId);
      this.bgmTimeoutId = null;
    }
  }

  private scheduleBgmTick() {
    if (!this.bgmPlaying || this.isMuted) return;

    // 軽快なサーカスBGMのステップ配列 (メロディ, ベース, ドラム)
    // テンポ: 16分音符 ~ 125ms (BPM 120)
    const bpm = 126;
    const stepTime = (60 / bpm) / 4; // 約 119ms

    // アメリカン・パトロール調のモチーフ（8小節分 = 64ステップ）
    const melodyPattern: (string | null)[] = [
      // Bar 1
      'C5', null, 'C5', null, 'E5', null, 'G5', null,
      'C5', null, 'C5', null, 'E5', null, 'G5', null,
      // Bar 2
      'A5', null, 'G5', null, 'F5', null, 'E5', null,
      'D5', null, null, null, 'G4', null, null, null,
      // Bar 3
      'D5', null, 'D5', null, 'F5', null, 'A5', null,
      'D5', null, 'D5', null, 'F5', null, 'A5', null,
      // Bar 4
      'B5', null, 'A5', null, 'G5', null, 'F5', null,
      'E5', null, null, null, 'C5', null, null, null,
      // Bar 5
      'E5', null, 'G5', null, 'C6', null, 'E5', null,
      'F5', null, 'A5', null, 'D6', null, 'F5', null,
      // Bar 6
      'G5', null, 'B5', null, 'E6', null, 'D6', null,
      'C6', null, null, null, 'G5', null, null, null,
      // Bar 7
      'A5', null, 'F5', null, 'D5', null, 'F5', null,
      'G5', null, 'E5', null, 'C5', null, 'E5', null,
      // Bar 8
      'D5', null, 'E5', null, 'D5', null, 'B4', null,
      'C5', null, null, null, null, null, null, null,
    ];

    const bassPattern: (string | null)[] = [
      'C3', null, 'G3', null, 'C3', null, 'G3', null,
      'C3', null, 'G3', null, 'C3', null, 'G3', null,
      'F3', null, 'C3', null, 'G3', null, 'C3', null,
      'G3', null, 'D3', null, 'G3', null, 'D3', null,
      'G3', null, 'D3', null, 'G3', null, 'D3', null,
      'G3', null, 'D3', null, 'G3', null, 'D3', null,
      'C3', null, 'G3', null, 'D3', null, 'G3', null,
      'C3', null, 'G3', null, 'C3', null, 'G3', null,
      'C3', null, 'G3', null, 'C3', null, 'G3', null,
      'F3', null, 'C3', null, 'F3', null, 'C3', null,
      'G3', null, 'D3', null, 'G3', null, 'D3', null,
      'C3', null, 'G3', null, 'C3', null, 'G3', null,
      'F3', null, 'C3', null, 'F3', null, 'C3', null,
      'C3', null, 'G3', null, 'C3', null, 'G3', null,
      'G3', null, 'D3', null, 'G3', null, 'G3', null,
      'C3', null, 'C3', null, 'C3', null, null, null,
    ];

    const step = this.currentStep % melodyPattern.length;
    const note = melodyPattern[step];
    const bass = bassPattern[step];

    if (note) {
      this.playTone(this.noteToFreq(note), stepTime * 1.5, 'square', 0.08);
    }
    if (bass) {
      this.playTone(this.noteToFreq(bass), stepTime * 1.8, 'triangle', 0.12);
    }
    // ノイズハイハット・スネア
    if (step % 4 === 0) {
      this.playNoise(0.03, 0.04);
    } else if (step % 4 === 2) {
      this.playNoise(0.05, 0.06);
    }

    this.currentStep++;
    this.bgmTimeoutId = window.setTimeout(() => {
      this.scheduleBgmTick();
    }, stepTime * 1000);
  }
}

export const circusAudio = new CircusAudioEngine();
