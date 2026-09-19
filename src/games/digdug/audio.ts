// Web Audio API によるディグダグ専用サウンドエンジン
// 歩行連動BGM、ポンプ注入音、破裂音、落石音、火炎放射音、ファンファーレ

// 音階周波数 (Hz)
const N = {
  REST: 0,
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  F4: 349.23,
  FS4: 369.99,
  G4: 392.0,
  GS4: 415.3,
  A4: 440.0,
  B4: 493.88,
  C5: 523.25,
  CS5: 554.37,
  D5: 587.33,
  E5: 659.25,
  F5: 698.46,
  G5: 783.99,
  A5: 880.0,
  B5: 987.77,
  C6: 1046.5,
};

// ディグダグ風の軽快なメインテーマ（歩行中だけ鳴るメロディパターン）
// 1音ずつのノートと音長（秒）のペア
const WALK_MELODY: { note: number; dur: number }[] = [
  { note: N.C5, dur: 0.12 },
  { note: N.E5, dur: 0.12 },
  { note: N.G5, dur: 0.12 },
  { note: N.E5, dur: 0.12 },
  { note: N.C5, dur: 0.12 },
  { note: N.E5, dur: 0.12 },
  { note: N.G5, dur: 0.18 },

  { note: N.F5, dur: 0.12 },
  { note: N.D5, dur: 0.12 },
  { note: N.B4, dur: 0.12 },
  { note: N.D5, dur: 0.12 },
  { note: N.F5, dur: 0.12 },
  { note: N.D5, dur: 0.12 },
  { note: N.G4, dur: 0.18 },

  { note: N.C5, dur: 0.12 },
  { note: N.E5, dur: 0.12 },
  { note: N.G5, dur: 0.12 },
  { note: N.E5, dur: 0.12 },
  { note: N.A5, dur: 0.14 },
  { note: N.G5, dur: 0.14 },
  { note: N.F5, dur: 0.14 },
  { note: N.E5, dur: 0.14 },

  { note: N.D5, dur: 0.12 },
  { note: N.G4, dur: 0.12 },
  { note: N.B4, dur: 0.12 },
  { note: N.D5, dur: 0.12 },
  { note: N.C5, dur: 0.25 },
];

export class DigDugAudio {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  // 歩行BGM状態
  private melodyIndex: number = 0;
  private lastStepTime: number = 0;
  private isWalking: boolean = false;
  private isSpeedUp: boolean = false;

  constructor() {
    // ユーザーインタラクション時に初期化
  }

  private init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setSpeedUp(speedUp: boolean) {
    this.isSpeedUp = speedUp;
  }

  // 歩行フレーム更新（歩いている時のみ音をステップ進行させる）
  public updateWalking(moving: boolean) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    this.isWalking = moving;
    if (!this.isWalking) return;

    const now = this.ctx.currentTime;
    const currentItem = WALK_MELODY[this.melodyIndex];
    const speedMult = this.isSpeedUp ? 0.65 : 1.0;
    const itemDuration = currentItem.dur * speedMult;

    if (now - this.lastStepTime >= itemDuration) {
      this.playWalkNote(currentItem.note, itemDuration * 0.85);
      this.melodyIndex = (this.melodyIndex + 1) % WALK_MELODY.length;
      this.lastStepTime = now;
    }
  }

  private playWalkNote(freq: number, dur: number) {
    if (!this.ctx || freq <= 0) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + dur);
    } catch {
      // AudioContext エラー防止
    }
  }

  // モリ発射音
  public playHarpoonShoot() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(400, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(850, this.ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.08);
    } catch {}
  }

  // ポンプ注入音（段階によって高くなる）
  public playPump(stage: number) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const baseFreq = 280 + stage * 70;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, this.ctx.currentTime + 0.07);

      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.07);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.07);
    } catch {}
  }

  // 敵破裂音（風船がパンッと弾ける豪快な音）
  public playPop() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      // ノイズ生成
      const bufferSize = this.ctx.sampleRate * 0.2;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.04));
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2000, now);
      filter.frequency.exponentialRampToValueAtTime(200, now + 0.2);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.2);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(now);

      // 高音ピュン音を追加してポップ感を強調
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.15);

      oscGain.gain.setValueAtTime(0.2, now);
      oscGain.gain.linearRampToValueAtTime(0.01, now + 0.15);

      osc.connect(oscGain);
      oscGain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    } catch {}
  }

  // 岩グラグラ音
  public playRockWobble() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(180, this.ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    } catch {}
  }

  // 岩落下・激突粉砕音
  public playRockCrash() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 0.35);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } catch {}
  }

  // ファイガー火炎放射チャージ警告音
  public playFygarCharge() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(600, this.ctx.currentTime);
      osc.frequency.setValueAtTime(750, this.ctx.currentTime + 0.06);

      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.12);
    } catch {}
  }

  // ファイガー火炎放射音（ゴォォォ！）
  public playFygarFire() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const bufferSize = this.ctx.sampleRate * 0.4;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI);
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(450, now);
      filter.Q.setValueAtTime(2.0, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.4);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(now);
    } catch {}
  }

  // 野菜フルーツ取得音
  public playBonusItem() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.06);

        gain.gain.setValueAtTime(0.15, this.ctx.currentTime + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + idx * 0.06 + 0.1);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(this.ctx.currentTime + idx * 0.06);
        osc.stop(this.ctx.currentTime + idx * 0.06 + 0.1);
      });
    } catch {}
  }

  // プレイヤーミス・死亡音
  public playPlayerDeath() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const pitches = [587.33, 554.37, 523.25, 493.88, 466.16, 440.0, 392.0];
      pitches.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, now + idx * 0.09);

        gain.gain.setValueAtTime(0.12, now + idx * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.09 + 0.08);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.09);
        osc.stop(now + idx * 0.09 + 0.08);
      });
    } catch {}
  }

  // ラウンドクリアファンファーレ
  public playRoundClear() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const notes = [
        { f: 523.25, d: 0.1 },
        { f: 523.25, d: 0.1 },
        { f: 523.25, d: 0.1 },
        { f: 659.25, d: 0.14 },
        { f: 783.99, d: 0.14 },
        { f: 1046.5, d: 0.35 },
      ];
      let offset = 0;
      notes.forEach((item) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(item.f, now + offset);

        gain.gain.setValueAtTime(0.15, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.01, now + offset + item.d);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + item.d);
        offset += item.d;
      });
    } catch {}
  }
}

export const digDugAudio = new DigDugAudio();
