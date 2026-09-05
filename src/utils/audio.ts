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

  // ボンバーマン BGM シーケンサー状態
  private isBombermanBgmRunning: boolean = false;
  private bombermanBgmTimer: number | null = null;
  private bombermanBgmStep: number = 0;

  // ちいかわ BGM シーケンサー状態
  private isChiikawaBgmRunning: boolean = false;
  private chiikawaBgmTimer: number | null = null;
  private chiikawaBgmStep: number = 0;
  private chiikawaBgmTheme: 'chill' | 'battle' = 'chill';

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

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
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

  // --- ブロック崩し用効果音 ---
  public playPaddleHit() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(480, this.ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }

  public playBrickHit() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(550, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(350, this.ctx.currentTime + 0.04);

    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.04);
  }

  public playBrickBreak(pitchMultiplier = 1) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const baseFreq = 440 * pitchMultiplier;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, this.ctx.currentTime + 0.06);

    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.06);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.06);
  }

  public playPowerup() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.04);

      gain.gain.setValueAtTime(0.12, now + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + idx * 0.04);
      osc.stop(now + idx * 0.04 + 0.08);
    });
  }

  public playLaserShot() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(900, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.07);

    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.07);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.07);
  }

  // --- 2048用効果音 ---
  public playTileMove() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(280, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(380, this.ctx.currentTime + 0.035);

    gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.035);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.035);
  }

  public playTileMerge(value: number) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const baseFreq = 300 + Math.min(Math.log2(value) * 60, 600);
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.33, this.ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  // --- ドットイーター用効果音 ---
  public playDotEat(alt = false) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    const freq = alt ? 460 : 380;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.8, this.ctx.currentTime + 0.03);

    gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.03);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.03);
  }

  public playPowerPellet() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(900, this.ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.14, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.12);
  }

  public playEatGhost() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    [400, 600, 800, 1100].forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);

      gain.gain.setValueAtTime(0.14, now + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.09);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.09);
    });
  }

  public playFruitEat() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    [523.25, 783.99, 1046.5].forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);

      gain.gain.setValueAtTime(0.15, now + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.1);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.1);
    });
  }

  public playPacDeath() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const notes = [600, 560, 520, 480, 440, 400, 360, 320, 240, 160];
    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);

      gain.gain.setValueAtTime(0.12, now + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.07);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.07);
    });
  }

  public playStageClear() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const melody = [523.25, 659.25, 783.99, 1046.5, 880, 1046.5];
    melody.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0.14, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.15);
    });
  }

  public playPacStart() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // クラシックな開始ジングル
    const notes = [493.88, 987.77, 739.99, 622.25, 987.77, 739.99, 622.25];
    const times = [0, 0.12, 0.24, 0.36, 0.48, 0.60, 0.72];
    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + times[idx]);
      gain.gain.setValueAtTime(0.12, now + times[idx]);
      gain.gain.exponentialRampToValueAtTime(0.001, now + times[idx] + 0.1);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + times[idx]);
      osc.stop(now + times[idx] + 0.1);
    });
  }

  // --- ポン用効果音 ---
  public playPongPaddle() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(480, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(320, this.ctx.currentTime + 0.04);

    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.04);
  }

  public playPongWall() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(360, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(240, this.ctx.currentTime + 0.03);

    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.03);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.03);
  }

  public playPongScore() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    [261.63, 329.63, 392.0, 523.25].forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);

      gain.gain.setValueAtTime(0.12, now + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.15);
    });
  }

  // --- Paper.io 用効果音 ---
  public playPaperCapture(tileCount: number = 10) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // タイル数に応じて音の段数・音階をリッチに変化
    const baseFreq = 440;
    const steps = Math.min(5, Math.max(2, Math.floor(tileCount / 15) + 2));
    const chord = [0, 4, 7, 11, 14]; // メジャーセブンスコードアルペジオ

    for (let i = 0; i < steps; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const semitone = chord[i % chord.length] + Math.floor(i / chord.length) * 12;
      const freq = baseFreq * Math.pow(2, semitone / 12);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.035);
      gain.gain.setValueAtTime(0.09, now + i * 0.035);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.035 + 0.1);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + i * 0.035);
      osc.stop(now + i * 0.035 + 0.1);
    }
  }

  public playPaperKill() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // 重厚なインパクト音 + 上昇ファンファーレ
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(now + 0.25);

    // キラキラ高音
    [659.25, 880, 1174.66, 1760].forEach((freq, idx) => {
      if (!this.ctx) return;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(freq, now + 0.08 + idx * 0.04);
      g.gain.setValueAtTime(0.1, now + 0.08 + idx * 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.08 + idx * 0.04 + 0.12);
      o.connect(g);
      g.connect(this.ctx.destination);
      o.start(now + 0.08 + idx * 0.04);
      o.stop(now + 0.08 + idx * 0.04 + 0.12);
    });
  }

  public playPaperDie() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.35);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(now + 0.35);
  }

  public playPaperItem() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    [587.33, 880, 1174.66].forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);
      gain.gain.setValueAtTime(0.12, now + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.1);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.1);
    });
  }

  public playPaperAlert() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(880, now);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(now + 0.08);
  }

  public playPaperDash() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(750, now + 0.08);
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(now + 0.08);
  }

  public playPaperFreeze() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    [1046.5, 1318.5, 1567.98, 2093.0].forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.04);
      gain.gain.setValueAtTime(0.1, now + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.15);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + idx * 0.04);
      osc.stop(now + idx * 0.04 + 0.15);
    });
  }

  public playPaperGhost() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.linearRampToValueAtTime(900, now + 0.12);
    osc.frequency.linearRampToValueAtTime(700, now + 0.25);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(now + 0.25);
  }

  public playPaperStreak(level: number) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const notes = level >= 3 ? [523.25, 659.25, 783.99, 1046.5, 1318.5] : [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);
      gain.gain.setValueAtTime(0.14, now + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.15);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.15);
    });
  }

  public playPaperBounty() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    [440, 554.37, 659.25, 880, 1108.73, 1318.5, 1760].forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + idx * 0.04);
      gain.gain.setValueAtTime(0.15, now + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.2);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + idx * 0.04);
      osc.stop(now + idx * 0.04 + 0.2);
    });
  }

  // --- Paper.io BGM シーケンサー ---
  private isPaperBgmRunning: boolean = false;
  private paperBgmTimer: number | null = null;
  private paperBgmStep: number = 0;

  public startPaperBgm() {
    this.initCtx();
    if (!this.ctx || this.isPaperBgmRunning) return;
    this.isPaperBgmRunning = true;
    this.paperBgmStep = 0;

    if (this.paperBgmTimer) {
      clearInterval(this.paperBgmTimer);
    }

    const stepMs = 120; // 16分音符
    this.paperBgmTimer = window.setInterval(() => {
      if (this.isMuted || !this.ctx) return;

      const leadNotes = [
        329.63, 0, 392.0, 0, 440.0, 0, 493.88, 523.25,
        0, 493.88, 0, 440.0, 392.0, 0, 329.63, 0,
        293.66, 0, 329.63, 0, 392.0, 0, 440.0, 0,
        392.0, 0, 329.63, 0, 293.66, 0, 261.63, 0
      ];

      const bassNotes = [
        110.0, 0, 110.0, 0, 130.81, 0, 130.81, 0,
        146.83, 0, 146.83, 0, 164.81, 0, 164.81, 0
      ];

      const now = this.ctx.currentTime;
      const leadFreq = leadNotes[this.paperBgmStep % leadNotes.length];
      const bassFreq = bassNotes[this.paperBgmStep % bassNotes.length];

      if (leadFreq > 0) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(leadFreq, now);
        gain.gain.setValueAtTime(0.045, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.1);
      }

      if (bassFreq > 0 && this.paperBgmStep % 2 === 0) {
        const bOsc = this.ctx.createOscillator();
        const bGain = this.ctx.createGain();
        bOsc.type = 'sine';
        bOsc.frequency.setValueAtTime(bassFreq, now);
        bGain.gain.setValueAtTime(0.06, now);
        bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        bOsc.connect(bGain);
        bGain.connect(this.ctx.destination);
        bOsc.start(now);
        bOsc.stop(now + 0.18);
      }

      this.paperBgmStep++;
    }, stepMs);
  }

  public stopPaperBgm() {
    this.isPaperBgmRunning = false;
    if (this.paperBgmTimer) {
      clearInterval(this.paperBgmTimer);
      this.paperBgmTimer = null;
    }
  }

  public playPaperRespawn() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.3);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(now + 0.35);
  }

  public playPaperShockwave() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.4);
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(now + 0.4);
  }

  public playPaperVictory() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const melody = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.5];
    melody.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      gain.gain.setValueAtTime(0.15, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.25);
    });
  }

  public playPaperTick() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800 + Math.random() * 200, now);
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(now + 0.03);
  }

  public playPaperRankStamp() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.3);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(now + 0.35);
  }

  public playPaperBadge() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    [880, 1174.66, 1760].forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);
      gain.gain.setValueAtTime(0.12, now + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.15);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.15);
    });
  }

  // --- アングリーバード用効果音 ---
  public playSlingshotPull() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(220, this.ctx.currentTime + 0.06);

    gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.06);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.06);
  }

  public playSlingshotRelease() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.12);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  public playBirdFly() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.linearRampToValueAtTime(650, now + 0.15);
    osc.frequency.linearRampToValueAtTime(500, now + 0.3);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  public playBirdSkill(type: string) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    if (type === 'chuck') {
      // ロケット急加速音
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(950, now + 0.2);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === 'blues') {
      // 3分裂音 (高音三連ピピピ)
      [800, 1000, 1200].forEach((f, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + idx * 0.04);
        gain.gain.setValueAtTime(0.12, now + idx * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.06);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.04);
        osc.stop(now + idx * 0.04 + 0.06);
      });
    } else if (type === 'red') {
      // 衝撃波・気合い
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(250, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.15);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    }
  }

  public playImpactWood() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(240, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(90, this.ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  public playImpactIce() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.06);

    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.06);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.06);
  }

  public playImpactStone() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  public playTntExplode() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // 重低音インパルス
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(25, now + 0.4);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);

    // 爆発ノイズ
    this.playNoiseSnippet(0.35, 0.25);
  }

  public playPigSqueal() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(480, now);
    osc.frequency.linearRampToValueAtTime(720, now + 0.08);
    osc.frequency.linearRampToValueAtTime(400, now + 0.16);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  public playPigDefeated() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(500, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.12);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  public playThreeStars() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98];
    notes.forEach((f, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now + idx * 0.09);

      gain.gain.setValueAtTime(0.15, now + idx * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + idx * 0.09);
      osc.stop(now + idx * 0.09 + 0.25);
    });
  }

  // --- ボンバーマン用効果音 ＆ BGM ---
  public playBombDrop() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(460, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.09);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  public playBombExplode() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // 重低音サブベース
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(22, now + 0.45);
    gain.gain.setValueAtTime(0.38, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.45);

    // 爆発ノイズバースト
    this.playNoiseSnippet(0.45, 0.32);
  }

  public playBlockDestroy() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.16);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.16);
    this.playNoiseSnippet(0.16, 0.18);
  }

  public playPowerUp() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);
      gain.gain.setValueAtTime(0.16, now + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.14);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.14);
    });
  }

  public playKick() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.12);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  public playSuddenDeath() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.linearRampToValueAtTime(440, now + 0.25);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  public playBlockFall() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.22);
    gain.gain.setValueAtTime(0.32, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.22);
    this.playNoiseSnippet(0.22, 0.22);
  }

  public playPlayerDie() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(620, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.45);
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.45);
  }

  public playBombermanVictory() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const melody = [523.25, 523.25, 523.25, 659.25, 783.99, 1046.5];
    const timings = [0, 0.11, 0.22, 0.33, 0.45, 0.62];
    const lens = [0.09, 0.09, 0.09, 0.09, 0.15, 0.45];
    melody.forEach((f, idx) => {
      if (!this.ctx) return;
      const t = now + timings[idx];
      const dur = lens[idx];
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(f, t);
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + dur);
    });
  }

  public startBombermanBgm() {
    if (this.isBombermanBgmRunning) return;
    this.initCtx();
    this.isBombermanBgmRunning = true;
    this.bombermanBgmStep = 0;

    const stepDuration = 60 / 145 / 2; // 145 BPM 8分音符

    const leadNotes = [
      523.25, 587.33, 659.25, 523.25, 783.99, 659.25, 587.33, 523.25,
      659.25, 698.46, 783.99, 659.25, 880.00, 783.99, 698.46, 659.25,
      587.33, 659.25, 698.46, 587.33, 783.99, 698.46, 659.25, 587.33,
      523.25, 659.25, 783.99, 1046.5, 783.99, 659.25, 523.25, 0,
    ];

    const bassNotes = [
      130.81, 0, 130.81, 0, 196.0, 0, 196.0, 0,
      174.61, 0, 174.61, 0, 220.0, 0, 220.0, 0,
      146.83, 0, 146.83, 0, 196.0, 0, 196.0, 0,
      130.81, 0, 164.81, 0, 196.0, 0, 130.81, 0,
    ];

    const tick = () => {
      if (!this.isBombermanBgmRunning || !this.ctx) return;
      if (!this.isMuted) {
        const now = this.ctx.currentTime;
        const step = this.bombermanBgmStep % leadNotes.length;
        const lead = leadNotes[step];
        const bass = bassNotes[step];

        if (lead > 0) {
          try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(lead, now);
            gain.gain.setValueAtTime(0.04, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + stepDuration * 0.85);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + stepDuration * 0.85);
          } catch {}
        }

        if (bass > 0) {
          try {
            const bOsc = this.ctx.createOscillator();
            const bGain = this.ctx.createGain();
            bOsc.type = 'triangle';
            bOsc.frequency.setValueAtTime(bass, now);
            bGain.gain.setValueAtTime(0.055, now);
            bGain.gain.exponentialRampToValueAtTime(0.001, now + stepDuration * 0.9);
            bOsc.connect(bGain);
            bGain.connect(this.ctx.destination);
            bOsc.start(now);
            bOsc.stop(now + stepDuration * 0.9);
          } catch {}
        }

        if (this.bombermanBgmStep % 2 === 0) {
          this.playNoiseSnippet(0.02, 0.015);
        }
      }

      this.bombermanBgmStep++;
      this.bombermanBgmTimer = window.setTimeout(tick, stepDuration * 1000);
    };

    tick();
  }

  public stopBombermanBgm() {
    this.isBombermanBgmRunning = false;
    if (this.bombermanBgmTimer !== null) {
      clearTimeout(this.bombermanBgmTimer);
      this.bombermanBgmTimer = null;
    }
  }

  // --- Hole.io 用効果音 ---
  public playHoleSwallow(sizeTier: number = 1) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // 小型オブジェクト: 軽快な「ポコッ」
    if (sizeTier <= 2) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      const startF = 380 + Math.random() * 80;
      osc.frequency.setValueAtTime(startF, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.08);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (sizeTier <= 4) {
      // 中型（車・街灯・家）: 「ボフッ＋ゴクン」
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(70, now + 0.16);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.16);
    } else {
      // 大型（大型ビル・高層タワー）: 「ズドドォン（地響き＋深淵）」
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 0.3);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);

      // ホワイトノイズによる崩落音
      this.playNoiseSnippet(0.25, 0.04);
    }
  }

  public playHoleCombo(combo: number) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const baseFreq = 440 * Math.pow(1.06, Math.min(combo, 16));
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.25, now + 0.07);

    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  public playHoleLevelUp() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const freqs = [349.23, 440.0, 523.25, 698.46, 880.0, 1046.5];
    freqs.forEach((f, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      const t = now + idx * 0.05;
      osc.frequency.setValueAtTime(f, t);
      gain.gain.setValueAtTime(0.14, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.18);
    });
  }

  public playHoleKill() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    // 重低音インパクト
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.35);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);

    // 歓声風のファンファーレ
    [659.25, 880.0, 1174.66].forEach((f, idx) => {
      if (!this.ctx) return;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'triangle';
      const t = now + 0.08 + idx * 0.06;
      o.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0.15, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      o.connect(g);
      g.connect(this.ctx.destination);
      o.start(t);
      o.stop(t + 0.22);
    });
  }

  public playHoleDeath() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.45);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.45);
  }

  public playHoleItemGet() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    [587.33, 880.0, 1174.66].forEach((f, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      const t = now + idx * 0.04;
      osc.frequency.setValueAtTime(f, t);
      gain.gain.setValueAtTime(0.13, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.12);
    });
  }

  public playHoleBoost() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(260, now + 0.1);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  // --- ジュエルパズル (Jewel Quest) 効果音群 ---
  public playJewelSelect() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(659.25, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.05);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  public playJewelSwap() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.09);
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  public playJewelInvalid() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.setValueAtTime(180, now + 0.06);
    gain.gain.setValueAtTime(0.07, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  public playJewelMatch(combo: number = 1) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const scale = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.5, 1567.98, 1760.0];
    const baseIndex = Math.min(combo - 1, scale.length - 2);
    const f1 = scale[baseIndex];
    const f2 = scale[Math.min(baseIndex + 2, scale.length - 1)];

    [f1, f2].forEach((f, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      const t = now + idx * 0.04;
      osc.frequency.setValueAtTime(f, t);
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.22);
    });
  }

  public playJewelSpecialCreate() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      const t = now + idx * 0.05;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.2);
    });
  }

  public playJewelLaser() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.25);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  public playJewelBomb() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.35);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  }

  public playJewelRainbow() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880, 1108.73, 1318.51];
    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      const t = now + idx * 0.04;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.09, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  }

  public playJewelShuffle() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    for (let i = 0; i < 4; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      const t = now + i * 0.05;
      osc.frequency.setValueAtTime(300 + Math.random() * 300, t);
      gain.gain.setValueAtTime(0.06, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.08);
    }
  }

  public playJewelClear() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const fanfare = [523.25, 659.25, 783.99, 1046.5];
    fanfare.forEach((f, i) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      const t = now + i * 0.1;
      const dur = i === fanfare.length - 1 ? 0.6 : 0.15;
      osc.frequency.setValueAtTime(f, t);
      gain.gain.setValueAtTime(0.14, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + dur);
    });
  }

  public playJewelGameOver() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const notes = [440, 415.3, 392, 349.23];
    notes.forEach((f, i) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      const t = now + i * 0.12;
      osc.frequency.setValueAtTime(f, t);
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.2);
    });
  }

  // ==========================================
  // ちいかわ (Chiikawa) サウンドエンジン
  // ==========================================

  public startChiikawaBgm(theme: 'chill' | 'battle' = 'chill') {
    this.initCtx();
    this.stopChiikawaBgm();
    this.isChiikawaBgmRunning = true;
    this.chiikawaBgmStep = 0;
    this.chiikawaBgmTheme = theme;

    const tempo = theme === 'chill' ? 120 : 155;
    const stepTimeMs = (60 / tempo / 4) * 1000;

    this.chiikawaBgmTimer = window.setInterval(() => {
      this.tickChiikawaBgm(stepTimeMs / 1000);
    }, stepTimeMs);
  }

  public stopChiikawaBgm() {
    this.isChiikawaBgmRunning = false;
    if (this.chiikawaBgmTimer) {
      clearInterval(this.chiikawaBgmTimer);
      this.chiikawaBgmTimer = null;
    }
    this.chiikawaBgmStep = 0;
  }

  private tickChiikawaBgm(duration: number) {
    if (!this.isChiikawaBgmRunning || this.isMuted || !this.ctx) return;

    // ほのぼのメロディ (ひとりごつ風の優しい音色)
    const CHILL_LEAD = [
      523.25, 0, 587.33, 0, 659.25, 0, 783.99, 0,
      880.0, 0, 783.99, 0, 659.25, 0, 587.33, 0,
      523.25, 523.25, 587.33, 0, 659.25, 0, 523.25, 0,
      440.0, 0, 392.0, 0, 523.25, 0, 0, 0,
      659.25, 0, 698.46, 0, 783.99, 0, 880.0, 0,
      1046.5, 0, 880.0, 0, 783.99, 0, 659.25, 0,
      587.33, 0, 659.25, 0, 783.99, 0, 587.33, 0,
      523.25, 0, 0, 0, 523.25, 0, 0, 0,
    ];

    // 討伐バトル用アップテンポメロディ (なんとかなれ！勇気ある行進曲)
    const BATTLE_LEAD = [
      587.33, 587.33, 587.33, 0, 659.25, 0, 783.99, 0,
      880.0, 0, 880.0, 880.0, 1046.5, 0, 880.0, 0,
      783.99, 0, 659.25, 0, 783.99, 0, 880.0, 0,
      587.33, 0, 0, 0, 659.25, 0, 783.99, 0,
      880.0, 880.0, 987.77, 0, 1046.5, 0, 1174.66, 0,
      1046.5, 0, 987.77, 0, 880.0, 0, 783.99, 0,
      659.25, 0, 783.99, 0, 880.0, 0, 987.77, 0,
      1046.5, 0, 1046.5, 0, 1046.5, 0, 0, 0,
    ];

    const BASS_NOTES = [
      261.63, 0, 329.63, 0, 392.0, 0, 329.63, 0,
      220.0, 0, 261.63, 0, 329.63, 0, 261.63, 0,
      174.61, 0, 220.0, 0, 261.63, 0, 220.0, 0,
      196.0, 0, 246.94, 0, 293.66, 0, 196.0, 0,
    ];

    const leadSeq = this.chiikawaBgmTheme === 'chill' ? CHILL_LEAD : BATTLE_LEAD;
    const leadNote = leadSeq[this.chiikawaBgmStep % leadSeq.length];
    const bassNote = BASS_NOTES[(this.chiikawaBgmStep / 2 | 0) % BASS_NOTES.length];

    const now = this.ctx.currentTime;

    if (leadNote > 0) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = this.chiikawaBgmTheme === 'chill' ? 'triangle' : 'square';
      osc.frequency.setValueAtTime(leadNote, now);
      const vol = this.chiikawaBgmTheme === 'chill' ? 0.05 : 0.035;
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration * 1.6);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + duration * 1.6);
    }

    if (this.chiikawaBgmStep % 2 === 0 && bassNote > 0) {
      const bOsc = this.ctx.createOscillator();
      const bGain = this.ctx.createGain();
      bOsc.type = 'sine';
      bOsc.frequency.setValueAtTime(bassNote, now);
      bGain.gain.setValueAtTime(0.06, now);
      bGain.gain.exponentialRampToValueAtTime(0.001, now + duration * 1.8);
      bOsc.connect(bGain);
      bGain.connect(this.ctx.destination);
      bOsc.start(now);
      bOsc.stop(now + duration * 1.8);
    }

    this.chiikawaBgmStep++;
  }

  // さすまた攻撃音
  public playChiikawaAttack() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  // 敵へのヒット音
  public playChiikawaHit() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.08);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  // 敵討伐完了音
  public playChiikawaDefeat() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const freqs = [523.25, 659.25, 783.99, 1046.5];
    freqs.forEach((f, i) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      const t = now + i * 0.04;
      osc.frequency.setValueAtTime(f, t);
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.12);
    });
  }

  // 草むしり音
  public playChiikawaWeed(combo: number = 0) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const baseFreq = 440 * Math.pow(1.05, Math.min(combo, 16));

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq * 0.8, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.08);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  // 危険草のペナルティ音
  public playChiikawaDanger() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.linearRampToValueAtTime(80, now + 0.25);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  // おやつ・アイテム拾い音
  public playChiikawaEat() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const tones = [659.25, 880.0];
    tones.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      const t = now + idx * 0.06;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.1);
    });
  }

  // 各キャラの必殺スキル音
  public playChiikawaSpecial(character: string) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    if (character === 'chiikawa') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(700, now + 0.15);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.4);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.45);
    } else if (character === 'hachiware') {
      const notes = [440, 554.37, 659.25, 880, 1108.73];
      notes.forEach((f, i) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        const t = now + i * 0.06;
        osc.frequency.setValueAtTime(f, t);
        gain.gain.setValueAtTime(0.14, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.2);
      });
    } else if (character === 'usagi') {
      for (let i = 0; i < 6; i++) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        const t = now + i * 0.04;
        osc.frequency.setValueAtTime(800 + (i % 2) * 300, t);
        gain.gain.setValueAtTime(0.08, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.05);
      }
    } else if (character === 'kurimanju') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.linearRampToValueAtTime(60, now + 0.5);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.5);
    } else {
      const arpeggio = [523.25, 659.25, 783.99, 1046.5, 1318.5];
      arpeggio.forEach((f, i) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        const t = now + i * 0.05;
        osc.frequency.setValueAtTime(f, t);
        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.25);
      });
    }
  }

  // レベルアップ音
  public playChiikawaLevelUp() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const chord = [523.25, 659.25, 783.99, 1046.5];
    chord.forEach((f, i) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      const t = now + i * 0.08;
      osc.frequency.setValueAtTime(f, t);
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.4);
    });
  }

  // 討伐成功 / 合格ファンファーレ
  public playChiikawaVictory() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const fanfare = [
      { f: 523.25, dur: 0.15, d: 0 },
      { f: 659.25, dur: 0.15, d: 0.15 },
      { f: 783.99, dur: 0.15, d: 0.3 },
      { f: 1046.5, dur: 0.4, d: 0.45 },
      { f: 880.0, dur: 0.2, d: 0.9 },
      { f: 1046.5, dur: 0.6, d: 1.1 },
    ];
    fanfare.forEach((n) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      const t = now + n.d;
      osc.frequency.setValueAtTime(n.f, t);
      gain.gain.setValueAtTime(0.16, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + n.dur);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + n.dur);
    });
  }

  // しょんぼりゲームオーバー
  public playChiikawaGameOver() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const notes = [440, 415.3, 392, 349.23, 329.63];
    notes.forEach((f, i) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      const t = now + i * 0.14;
      osc.frequency.setValueAtTime(f, t);
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.25);
    });
  }

  // ===== クッキークリッカー用サウンド =====

  // クッキークリック音（心地よいサクサク・タップ音、音程ランダム微変化）
  public playCookieClick() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // ランダム微ピッチ（0.92 〜 1.08倍）
    const pitchMod = 0.92 + Math.random() * 0.16;
    const baseFreq = 520 * pitchMod;

    // クリック・トーン（木魚/パーカッシブな短音）
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.4, now + 0.045);

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);

    // かすかなクリスピー・ノイズ
    const noiseBuffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.02), this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (data.length * 0.3));
    }
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.08, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
    noiseSource.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);
    noiseSource.start(now);
  }

  // 施設購入音（チャリン！とレジ音）
  public playCookieBuy() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const freqs = [987.77, 1318.51]; // B5 -> E6
    freqs.forEach((f, i) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      const t = now + i * 0.06;
      osc.frequency.setValueAtTime(f, t);
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.18);
    });
  }

  // アップグレード購入音（華やかな上昇和音）
  public playCookieUpgrade() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const chords = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    chords.forEach((f, i) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      const t = now + i * 0.05;
      osc.frequency.setValueAtTime(f, t);
      gain.gain.setValueAtTime(0.16, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.28);
    });
  }

  // ゴールデンクッキー出現音（神秘的なキラリンチャイム）
  public playGoldenCookieSpawn() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const bellNotes = [1046.5, 1318.5, 1567.98, 2093.0];
    bellNotes.forEach((f, i) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      const t = now + i * 0.08;
      osc.frequency.setValueAtTime(f, t);
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.5);
    });
  }

  // ゴールデンクッキークリック音（大当たり大歓喜ハープ）
  public playGoldenCookieClick() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const arpeggio = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98, 2093.0];
    arpeggio.forEach((f, i) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      const t = now + i * 0.04;
      osc.frequency.setValueAtTime(f, t);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.4);
    });
  }

  // 実績解除ファンファーレ
  public playCookieAchievement() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const notes = [
      { f: 587.33, d: 0, dur: 0.1 },
      { f: 783.99, d: 0.1, dur: 0.1 },
      { f: 880.0, d: 0.2, dur: 0.12 },
      { f: 1174.66, d: 0.32, dur: 0.4 },
    ];
    notes.forEach((n) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      const t = now + n.d;
      osc.frequency.setValueAtTime(n.f, t);
      gain.gain.setValueAtTime(0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + n.dur);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + n.dur);
    });
  }

  // 転生・昇天（天界の神秘的ワープ音）
  public playCookieAscend() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // 低音〜中音の神秘的な上昇スウィープ
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 1.2);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.6);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 1.4);

    // 星の煌めき
    for (let i = 0; i < 6; i++) {
      const f = 1200 + Math.random() * 1200;
      const t = now + 0.3 + i * 0.15;
      const starOsc = this.ctx.createOscillator();
      const starGain = this.ctx.createGain();
      starOsc.type = 'triangle';
      starOsc.frequency.setValueAtTime(f, t);
      starGain.gain.setValueAtTime(0.12, t);
      starGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      starOsc.connect(starGain);
      starGain.connect(this.ctx.destination);
      starOsc.start(t);
      starOsc.stop(t + 0.3);
    }
  }

  // ==========================================
  // シューティング技能検定 (Shooting Skill Test) サウンド
  // ==========================================
  private isCertBgmRunning: boolean = false;
  private certBgmTimer: number | null = null;
  private certBgmStep: number = 0;

  // 疾走感あふれるサイバーアーケードBGM (BPM 150)
  public startShootingCertBgm() {
    if (this.isCertBgmRunning || this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    this.isCertBgmRunning = true;
    this.certBgmStep = 0;

    const bassNotes = [
      110, 110, 130.81, 110, 146.83, 110, 164.81, 146.83,
      110, 110, 130.81, 110, 98.0, 98.0, 123.47, 98.0,
      110, 110, 130.81, 110, 146.83, 110, 164.81, 146.83,
      174.61, 174.61, 164.81, 164.81, 146.83, 130.81, 123.47, 110,
    ];

    const leadNotes = [
      440, 0, 523.25, 0, 587.33, 0, 659.25, 587.33,
      0, 523.25, 0, 440, 392, 0, 493.88, 0,
      440, 0, 523.25, 0, 587.33, 0, 659.25, 783.99,
      880, 0, 783.99, 0, 659.25, 587.33, 523.25, 493.88,
    ];

    const stepInterval = (60 / 150) / 4 * 1000; // 16分音符 (100ms)

    const schedule = () => {
      if (!this.isCertBgmRunning || !this.ctx) return;
      const now = this.ctx.currentTime;
      const bNote = bassNotes[this.certBgmStep % bassNotes.length];
      const lNote = leadNotes[this.certBgmStep % leadNotes.length];

      // ベース
      if (bNote > 0) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(bNote, now);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(450, now);
        filter.frequency.exponentialRampToValueAtTime(150, now + 0.08);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.09);
      }

      // ドラム (キック & スネア & ハイハット)
      if (this.certBgmStep % 4 === 0) {
        // キック
        const kOsc = this.ctx.createOscillator();
        const kGain = this.ctx.createGain();
        kOsc.type = 'sine';
        kOsc.frequency.setValueAtTime(150, now);
        kOsc.frequency.exponentialRampToValueAtTime(40, now + 0.08);
        kGain.gain.setValueAtTime(0.25, now);
        kGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        kOsc.connect(kGain);
        kGain.connect(this.ctx.destination);
        kOsc.start(now);
        kOsc.stop(now + 0.08);
      } else if (this.certBgmStep % 4 === 2) {
        // スネアノイズ
        const buf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.05), this.ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        const nGain = this.ctx.createGain();
        nGain.gain.setValueAtTime(0.09, now);
        nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        src.connect(nGain);
        nGain.connect(this.ctx.destination);
        src.start(now);
      }

      // リードメロディ
      if (lNote > 0 && Math.random() > 0.1) {
        const lOsc = this.ctx.createOscillator();
        const lGain = this.ctx.createGain();
        lOsc.type = 'square';
        lOsc.frequency.setValueAtTime(lNote, now);
        lGain.gain.setValueAtTime(0.08, now);
        lGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        lOsc.connect(lGain);
        lGain.connect(this.ctx.destination);
        lOsc.start(now);
        lOsc.stop(now + 0.12);
      }

      this.certBgmStep++;
      this.certBgmTimer = window.setTimeout(schedule, stepInterval);
    };

    schedule();
  }

  public stopShootingCertBgm() {
    this.isCertBgmRunning = false;
    if (this.certBgmTimer !== null) {
      clearTimeout(this.certBgmTimer);
      this.certBgmTimer = null;
    }
  }

  // 検定スタート / Ready GO! 音
  public playCertStart() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // 上昇アルペジオ + ピッピッピッポーン
    const notes = [
      { f: 523.25, t: 0, dur: 0.08 },
      { f: 659.25, t: 0.09, dur: 0.08 },
      { f: 783.99, t: 0.18, dur: 0.08 },
      { f: 1046.5, t: 0.28, dur: 0.35 },
    ];
    notes.forEach((n) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      const st = now + n.t;
      osc.frequency.setValueAtTime(n.f, st);
      gain.gain.setValueAtTime(0.2, st);
      gain.gain.exponentialRampToValueAtTime(0.001, st + n.dur);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(st);
      osc.stop(st + n.dur);
    });
  }

  // プレイヤー連射ショット音
  public playCertShot() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880 + Math.random() * 60, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.05);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  // 命中ヒット音 (カキーン)
  public playCertHit() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(700, now + 0.04);

    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.04);
  }

  // 爆発音 (ズドーン)
  public playCertExplode(isBig: boolean = false) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const dur = isBig ? 0.45 : 0.22;

    const buf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * dur), this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (data.length * 0.4));
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, now);
    filter.frequency.exponentialRampToValueAtTime(100, now + dur);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(isBig ? 0.35 : 0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    src.start(now);

    // 重低音インパクト
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(isBig ? 120 : 90, now);
    sub.frequency.exponentialRampToValueAtTime(30, now + dur);
    subGain.gain.setValueAtTime(isBig ? 0.3 : 0.15, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    sub.connect(subGain);
    subGain.connect(this.ctx.destination);
    sub.start(now);
    sub.stop(now + dur);
  }

  // 寸止めブレーキ音 (キキーッ)
  public playCertBrake() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1600, now);
    osc.frequency.linearRampToValueAtTime(800, now + 0.15);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  // 警告アラート音 (ピピッ！ピピッ！)
  public playCertWarning() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    [0, 0.08, 0.16].forEach((offset) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(880, now + offset);
      gain.gain.setValueAtTime(0.18, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.05);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.05);
    });
  }

  // グレイズ（弾かすり）音
  public playCertGraze() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200 + Math.random() * 300, now);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  // 種目クリア・判定合格ジングル
  public playCertSuccess() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const chord = [523.25, 659.25, 783.99, 1046.5];
    chord.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      const st = now + idx * 0.06;
      osc.frequency.setValueAtTime(freq, st);
      gain.gain.setValueAtTime(0.2, st);
      gain.gain.exponentialRampToValueAtTime(0.001, st + 0.3);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(st);
      osc.stop(st + 0.3);
    });
  }

  // 失敗・クラッシュ・減点音
  public playCertFail() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.linearRampToValueAtTime(90, now + 0.25);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  // 総合発表前ドラムロール
  public playCertDrumRoll() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    for (let i = 0; i < 20; i++) {
      const t = now + i * 0.06;
      const buf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.03), this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let j = 0; j < data.length; j++) data[j] = Math.random() * 2 - 1;
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.08 + (i / 20) * 0.12, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
      src.connect(g);
      g.connect(this.ctx.destination);
      src.start(t);
    }
  }

  // シューター年齢決定グランドファンファーレ
  public playCertGrandFanfare() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const melody = [
      { f: 523.25, d: 0, l: 0.1 },
      { f: 523.25, d: 0.1, l: 0.1 },
      { f: 523.25, d: 0.2, l: 0.1 },
      { f: 659.25, d: 0.3, l: 0.25 },
      { f: 587.33, d: 0.55, l: 0.1 },
      { f: 659.25, d: 0.65, l: 0.1 },
      { f: 783.99, d: 0.75, l: 0.6 },
    ];

    melody.forEach((m) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      const t = now + m.d;
      osc.frequency.setValueAtTime(m.f, t);
      gain.gain.setValueAtTime(0.24, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + m.l);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + m.l);
    });
  }
}

export const sound = new SoundEngine();
