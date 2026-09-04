// Web Audio API によるエキサイトバイク専用シンセサウンドエンジン

class ExcitebikeAudio {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  // エンジン音用オシレータ & ノード
  private engineOsc: OscillatorNode | null = null;
  private engineSubOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private isEngineRunning: boolean = false;

  private initCtx() {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
    if (muted && this.engineGain && this.ctx) {
      this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  // エンジン音の開始
  public startEngine() {
    if (this.isEngineRunning) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      this.engineOsc = this.ctx.createOscillator();
      this.engineSubOsc = this.ctx.createOscillator();
      this.engineGain = this.ctx.createGain();

      this.engineOsc.type = 'sawtooth';
      this.engineSubOsc.type = 'triangle';

      const now = this.ctx.currentTime;
      this.engineOsc.frequency.setValueAtTime(65, now);
      this.engineSubOsc.frequency.setValueAtTime(32.5, now);
      this.engineGain.gain.setValueAtTime(this.isMuted ? 0 : 0.05, now);

      this.engineOsc.connect(this.engineGain);
      this.engineSubOsc.connect(this.engineGain);
      this.engineGain.connect(this.ctx.destination);

      this.engineOsc.start(now);
      this.engineSubOsc.start(now);
      this.isEngineRunning = true;
    } catch {
      // Audio context might be restricted
    }
  }

  // バイクの速度・ターボ・状態に応じたエンジン音の更新
  public updateEngine(speedRatio: number, isTurbo: boolean, isAccel: boolean, isGrounded: boolean) {
    if (!this.isEngineRunning || !this.ctx || !this.engineOsc || !this.engineSubOsc || !this.engineGain) return;
    if (this.isMuted) {
      this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);
      return;
    }

    const now = this.ctx.currentTime;
    // アイドリング: 65Hz、最高速: 260Hz、ターボ時: 最大 380Hz
    let baseFreq = 65 + speedRatio * 180;
    if (isTurbo) {
      baseFreq += 70;
    }
    if (!isGrounded) {
      // 空中でアクセルを吹かしていると甲高い空転音
      if (isAccel) baseFreq += 50;
    }

    // 周波数をスムーズに変調
    this.engineOsc.frequency.setTargetAtTime(Math.min(baseFreq, 420), now, 0.04);
    this.engineSubOsc.frequency.setTargetAtTime(Math.min(baseFreq * 0.5, 210), now, 0.04);

    let targetVolume = 0.05 + speedRatio * 0.07;
    if (!isAccel && speedRatio < 0.05) {
      targetVolume = 0.025; // アイドリング
    }
    this.engineGain.gain.setTargetAtTime(targetVolume, now, 0.05);
  }

  // エンジン音の停止
  public stopEngine() {
    if (!this.isEngineRunning) return;
    try {
      if (this.engineOsc) {
        this.engineOsc.stop();
        this.engineOsc.disconnect();
      }
      if (this.engineSubOsc) {
        this.engineSubOsc.stop();
        this.engineSubOsc.disconnect();
      }
      if (this.engineGain) {
        this.engineGain.disconnect();
      }
    } catch {}
    this.engineOsc = null;
    this.engineSubOsc = null;
    this.engineGain = null;
    this.isEngineRunning = false;
  }

  // ジャンプ音
  public playJump() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(580, now + 0.18);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.2);
    } catch {}
  }

  // ナイス着地音
  public playNiceLanding() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      // タイヤスキール音 (高い周波数のキュッという音)
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(1400, now + 0.08);

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.12);

      // 低音のサス着地衝撃音
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      subOsc.type = 'triangle';
      subOsc.frequency.setValueAtTime(120, now);
      subOsc.frequency.exponentialRampToValueAtTime(40, now + 0.15);

      subGain.gain.setValueAtTime(0.2, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      subOsc.connect(subGain);
      subGain.connect(this.ctx.destination);

      subOsc.start(now);
      subOsc.stop(now + 0.16);
    } catch {}
  }

  // クールパッド通過音 (アルペジオ)
  public playCooler() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const t = now + idx * 0.055;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.14, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 0.12);
      });
    } catch {}
  }

  // クラッシュ音 (豪快な爆発＆転倒音)
  public playCrash() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;

      // ホワイトノイズ衝撃
      const bufferSize = this.ctx.sampleRate * 0.35;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.28, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      noise.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);
      noise.start(now);

      // 低音ドーン
      const boom = this.ctx.createOscillator();
      const boomGain = this.ctx.createGain();
      boom.type = 'sawtooth';
      boom.frequency.setValueAtTime(140, now);
      boom.frequency.exponentialRampToValueAtTime(25, now + 0.3);

      boomGain.gain.setValueAtTime(0.25, now);
      boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

      boom.connect(boomGain);
      boomGain.connect(this.ctx.destination);
      boom.start(now);
      boom.stop(now + 0.32);
    } catch {}
  }

  // オーバーヒート警報音
  public playOverheat() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      // ピッピッピッ！
      for (let i = 0; i < 3; i++) {
        const t = now + i * 0.12;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(880, t);

        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.08);
      }
    } catch {}
  }

  // ライダーの足音・連打音
  public playStep() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.04);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
    } catch {}
  }

  // スタートカウントダウン (3, 2, 1)
  public playCountBeep(isGo: boolean = false) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      const freq = isGo ? 987.77 : 493.88; // B5 or B4
      const dur = isGo ? 0.45 : 0.15;

      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + dur);
    } catch {}
  }

  // ゴールファンファーレ
  public playGoalFanfare() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      // 勝利メロディ: C5, E5, G5, C6 (タタタ・ターン！)
      const notes = [
        { f: 523.25, d: 0.12, t: 0 },
        { f: 523.25, d: 0.12, t: 0.14 },
        { f: 523.25, d: 0.12, t: 0.28 },
        { f: 659.25, d: 0.35, t: 0.44 },
        { f: 587.33, d: 0.15, t: 0.82 },
        { f: 783.99, d: 0.55, t: 1.0 },
      ];

      notes.forEach((n) => {
        if (!this.ctx) return;
        const t = now + n.t;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(n.f, t);

        gain.gain.setValueAtTime(0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + n.d);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + n.d);
      });
    } catch {}
  }
}

export const exciteAudio = new ExcitebikeAudio();
