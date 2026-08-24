// Web Audio API によるシンセ効果音 & BGM エンジン (外部音声ファイル不要)

// 『コロベイニキ（Korobeiniki / Type A）』のノート周波数 (Hz)
const NOTE = {
  REST: 0,
  A2: 110.0,
  B2: 123.47,
  C3: 130.81,
  D3: 146.83,
  E3: 164.81,
  F3: 174.61,
  G3: 196.0,
  GS3: 207.65,
  A3: 220.0,
  B3: 246.94,
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  F4: 349.23,
  G4: 392.0,
  GS4: 415.3,
  A4: 440.0,
  B4: 493.88,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  F5: 698.46,
  G5: 783.99,
  GS5: 830.61,
  A5: 880.0,
  B5: 987.77,
};

// コロベイニキ メロディ (16分音符単位)
const KOROBEINIKI_LEAD = [
  // パート A (1回目)
  NOTE.E5, NOTE.E5, NOTE.B4, NOTE.C5, NOTE.D5, NOTE.D5, NOTE.C5, NOTE.B4,
  NOTE.A4, NOTE.A4, NOTE.A4, NOTE.C5, NOTE.E5, NOTE.E5, NOTE.D5, NOTE.C5,
  NOTE.B4, NOTE.B4, NOTE.B4, NOTE.C5, NOTE.D5, NOTE.D5, NOTE.E5, NOTE.E5,
  NOTE.C5, NOTE.C5, NOTE.A4, NOTE.A4, NOTE.A4, NOTE.REST, NOTE.REST, NOTE.REST,

  // パート A リピート (少し変化)
  NOTE.D5, NOTE.D5, NOTE.D5, NOTE.F5, NOTE.A5, NOTE.A5, NOTE.G5, NOTE.F5,
  NOTE.E5, NOTE.E5, NOTE.E5, NOTE.C5, NOTE.E5, NOTE.E5, NOTE.D5, NOTE.C5,
  NOTE.B4, NOTE.B4, NOTE.B4, NOTE.C5, NOTE.D5, NOTE.D5, NOTE.E5, NOTE.E5,
  NOTE.C5, NOTE.C5, NOTE.A4, NOTE.A4, NOTE.A4, NOTE.REST, NOTE.REST, NOTE.REST,

  // パート B (高揚するサビ)
  NOTE.E5, NOTE.E5, NOTE.C5, NOTE.C5, NOTE.D5, NOTE.D5, NOTE.B4, NOTE.B4,
  NOTE.C5, NOTE.C5, NOTE.A4, NOTE.A4, NOTE.GS4, NOTE.GS4, NOTE.B4, NOTE.B4,
  NOTE.E5, NOTE.E5, NOTE.C5, NOTE.C5, NOTE.D5, NOTE.D5, NOTE.B4, NOTE.B4,
  NOTE.C5, NOTE.C5, NOTE.E5, NOTE.E5, NOTE.A5, NOTE.A5, NOTE.A5, NOTE.REST,

  // パート B リピート
  NOTE.E5, NOTE.E5, NOTE.C5, NOTE.C5, NOTE.D5, NOTE.D5, NOTE.B4, NOTE.B4,
  NOTE.C5, NOTE.C5, NOTE.A4, NOTE.A4, NOTE.GS4, NOTE.GS4, NOTE.B4, NOTE.B4,
  NOTE.E5, NOTE.E5, NOTE.C5, NOTE.C5, NOTE.D5, NOTE.D5, NOTE.B4, NOTE.B4,
  NOTE.C5, NOTE.C5, NOTE.E5, NOTE.E5, NOTE.A5, NOTE.A5, NOTE.A5, NOTE.REST,
];

// コロベイニキ ベースライン (16分音符単位)
const KOROBEINIKI_BASS = [
  // パート A
  NOTE.E3, NOTE.REST, NOTE.GS3, NOTE.REST, NOTE.E3, NOTE.REST, NOTE.GS3, NOTE.REST,
  NOTE.A2, NOTE.REST, NOTE.C3, NOTE.REST, NOTE.A2, NOTE.REST, NOTE.C3, NOTE.REST,
  NOTE.GS3, NOTE.REST, NOTE.B3, NOTE.REST, NOTE.GS3, NOTE.REST, NOTE.B3, NOTE.REST,
  NOTE.A2, NOTE.REST, NOTE.C3, NOTE.REST, NOTE.A2, NOTE.REST, NOTE.E3, NOTE.REST,

  NOTE.D3, NOTE.REST, NOTE.F3, NOTE.REST, NOTE.D3, NOTE.REST, NOTE.F3, NOTE.REST,
  NOTE.C3, NOTE.REST, NOTE.E3, NOTE.REST, NOTE.C3, NOTE.REST, NOTE.E3, NOTE.REST,
  NOTE.GS3, NOTE.REST, NOTE.B3, NOTE.REST, NOTE.GS3, NOTE.REST, NOTE.B3, NOTE.REST,
  NOTE.A2, NOTE.REST, NOTE.C3, NOTE.REST, NOTE.A2, NOTE.REST, NOTE.E3, NOTE.REST,

  // パート B
  NOTE.A2, NOTE.REST, NOTE.E3, NOTE.REST, NOTE.GS3, NOTE.REST, NOTE.E3, NOTE.REST,
  NOTE.A2, NOTE.REST, NOTE.E3, NOTE.REST, NOTE.GS3, NOTE.REST, NOTE.E3, NOTE.REST,
  NOTE.A2, NOTE.REST, NOTE.E3, NOTE.REST, NOTE.GS3, NOTE.REST, NOTE.E3, NOTE.REST,
  NOTE.A2, NOTE.REST, NOTE.E3, NOTE.REST, NOTE.A2, NOTE.REST, NOTE.REST, NOTE.REST,

  NOTE.A2, NOTE.REST, NOTE.E3, NOTE.REST, NOTE.GS3, NOTE.REST, NOTE.E3, NOTE.REST,
  NOTE.A2, NOTE.REST, NOTE.E3, NOTE.REST, NOTE.GS3, NOTE.REST, NOTE.E3, NOTE.REST,
  NOTE.A2, NOTE.REST, NOTE.E3, NOTE.REST, NOTE.GS3, NOTE.REST, NOTE.E3, NOTE.REST,
  NOTE.A2, NOTE.REST, NOTE.E3, NOTE.REST, NOTE.A2, NOTE.REST, NOTE.REST, NOTE.REST,
];

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  // テトリス BGM シーケンサー状態
  private isTetrisBgmRunning: boolean = false;
  private tetrisBgmTimer: number | null = null;
  private bgmStep: number = 0;
  private readonly tempo: number = 145; // BPM

  constructor() {}

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted && this.isTetrisBgmRunning) {
      // ミュート時は無音化
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  // --- テトリス BGM (コロベイニキ) シーケンサー ---
  public startTetrisBgm() {
    this.initCtx();
    this.isTetrisBgmRunning = true;
    this.bgmStep = 0;

    if (this.tetrisBgmTimer) {
      clearInterval(this.tetrisBgmTimer);
    }

    const stepTimeMs = (60 / this.tempo / 4) * 1000;
    this.tetrisBgmTimer = window.setInterval(() => {
      this.tickTetrisBgm(stepTimeMs / 1000);
    }, stepTimeMs);
  }

  public stopTetrisBgm() {
    this.isTetrisBgmRunning = false;
    if (this.tetrisBgmTimer) {
      clearInterval(this.tetrisBgmTimer);
      this.tetrisBgmTimer = null;
    }
    this.bgmStep = 0;
  }

  public pauseTetrisBgm() {
    this.isTetrisBgmRunning = false;
    if (this.tetrisBgmTimer) {
      clearInterval(this.tetrisBgmTimer);
      this.tetrisBgmTimer = null;
    }
  }

  public resumeTetrisBgm() {
    if (this.isTetrisBgmRunning) return;
    this.initCtx();
    this.isTetrisBgmRunning = true;

    if (this.tetrisBgmTimer) {
      clearInterval(this.tetrisBgmTimer);
    }

    const stepTimeMs = (60 / this.tempo / 4) * 1000;
    this.tetrisBgmTimer = window.setInterval(() => {
      this.tickTetrisBgm(stepTimeMs / 1000);
    }, stepTimeMs);
  }

  private tickTetrisBgm(duration: number) {
    if (!this.isTetrisBgmRunning || this.isMuted || !this.ctx) {
      this.bgmStep++;
      return;
    }

    const leadFreq = KOROBEINIKI_LEAD[this.bgmStep % KOROBEINIKI_LEAD.length];
    const bassFreq = KOROBEINIKI_BASS[this.bgmStep % KOROBEINIKI_BASS.length];

    const now = this.ctx.currentTime;

    // 1. メロディ (主旋律: 矩形波/三角波で温かみのあるチップチューン)
    if (leadFreq > 0) {
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(leadFreq, now);

        gain.gain.setValueAtTime(0.045, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.88);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + duration * 0.88);
      } catch {}
    }

    // 2. ベース (伴奏: 三角波で太く弾むベース)
    if (bassFreq > 0) {
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(bassFreq, now);

        gain.gain.setValueAtTime(0.065, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.9);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + duration * 0.9);
      } catch {}
    }

    // 3. ドラム/パーカッション (1拍ごとに軽快なハイハット風ノイズ)
    if (this.bgmStep % 4 === 0) {
      this.playNoiseSnippet(0.025, 0.015);
    } else if (this.bgmStep % 8 === 4) {
      this.playNoiseSnippet(0.035, 0.022);
    }

    this.bgmStep++;
  }

  private playNoiseSnippet(duration: number, vol = 0.02) {
    if (!this.ctx || this.isMuted) return;
    try {
      const bufferSize = this.ctx.sampleRate * duration;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const gain = this.ctx.createGain();
      const start = this.ctx.currentTime;
      gain.gain.setValueAtTime(vol, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      noise.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start(start);
    } catch {}
  }

  // --- テトリス用効果音 ---
  public playMove() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(160, this.ctx.currentTime + 0.04);

    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.04);
  }

  public playRotate() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(450, this.ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }

  public playHardDrop() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(140, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  public playHold() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(350, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  public playClear(lines: number) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    if (lines === 4) {
      const freqs = [523.25, 659.25, 783.99, 1046.5];
      freqs.forEach((f, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, now + idx * 0.06);

        gain.gain.setValueAtTime(0.15, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.2);
      });
    } else {
      const freqs =
        lines === 1 ? [440, 554] : lines === 2 ? [440, 554, 659] : [440, 554, 659, 880];
      freqs.forEach((f, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + idx * 0.05);

        gain.gain.setValueAtTime(0.12, now + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.15);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.05);
        osc.stop(now + idx * 0.05 + 0.15);
      });
    }
  }

  public playGameOver() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const notes = [300, 260, 220, 180];
    notes.forEach((f, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, now + idx * 0.12);

      gain.gain.setValueAtTime(0.12, now + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.18);
    });
  }

  // --- マインスイーパー用効果音 ---
  public playCellClick() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.03);

    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.03);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.03);
  }

  public playFlag() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.setValueAtTime(1200, this.ctx.currentTime + 0.03);

    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.06);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.06);
  }

  public playCascade() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    [400, 600, 800].forEach((f, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + idx * 0.03);

      gain.gain.setValueAtTime(0.06, now + idx * 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.03 + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + idx * 0.03);
      osc.stop(now + idx * 0.03 + 0.05);
    });
  }

  public playExplosion() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.35);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(now + 0.35);
  }

  public playWin() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const melody = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    melody.forEach((f, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now + idx * 0.08);

      gain.gain.setValueAtTime(0.15, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.25);
    });
  }
}

export const sound = new SoundEngine();
