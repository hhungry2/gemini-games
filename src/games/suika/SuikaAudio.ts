// スイカゲーム専用 Web Audio API サウンド＆BGMエンジン

class SuikaAudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private bgmTimer: number | null = null;
  private isBgmPlaying: boolean = false;
  private bgmStep: number = 0;

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stopBgm();
    } else {
      this.startBgm();
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.isMuted) {
      this.stopBgm();
    }
  }

  // フルーツ投下音
  public playDrop() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.exponentialRampToValueAtTime(220, t + 0.12);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.12);
  }

  // フルーツ同士の接触・衝突音
  public playImpact(level: number) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    // フルーツが大きいほど低い「ポフッ」、小さいほど高い「コトッ」
    const baseFreq = Math.max(120, 480 - level * 30);
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.7, t + 0.08);

    const vol = Math.min(0.2, 0.05 + level * 0.015);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.08);
  }

  // フルーツ合体・進化音（コンボでピッチ上昇）
  public playMerge(level: number, combo: number = 0) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // ペンタトニックスケール + レベル + コンボ
    const notes = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
    const baseNote = notes[Math.min(level, notes.length - 1)];
    const pitchMultiplier = Math.pow(2, (combo % 8) / 12); // 半音ずつアップ
    const freq1 = baseNote * pitchMultiplier;
    const freq2 = freq1 * 1.5; // 完全5度上の和音

    // 主音（マリンバ調のコロンとした音）
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq1, t);
    osc1.frequency.exponentialRampToValueAtTime(freq1 * 1.2, t + 0.06);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq2, t);
    osc2.frequency.exponentialRampToValueAtTime(freq2 * 1.05, t + 0.15);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.28);
    osc2.stop(t + 0.28);
  }

  // スイカ完成時のファンファーレ！
  public playWatermelonFanfare() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const chords = [
      { notes: [523.25, 659.25, 783.99], time: 0, dur: 0.18 }, // C5
      { notes: [587.33, 739.99, 880.0], time: 0.18, dur: 0.18 }, // D5
      { notes: [659.25, 830.61, 987.77], time: 0.36, dur: 0.18 }, // E5
      { notes: [1046.5, 1318.51, 1567.98], time: 0.54, dur: 0.7 }, // C6
    ];

    chords.forEach(({ notes, time, dur }) => {
      const t = this.ctx!.currentTime + time;
      notes.forEach((freq) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(t);
        osc.stop(t + dur);
      });
    });
  }

  // スイカ同士合体（大爆発消滅＋メガボーナス）
  public playDoubleWatermelon() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    // アルペジオ＋歓喜のファンファーレ
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98, 2093.0];
    notes.forEach((freq, idx) => {
      const t = this.ctx!.currentTime + idx * 0.08;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(t);
      osc.stop(t + 0.6);
    });
  }

  // 危険ライン警告音
  public playDanger() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.setValueAtTime(660, t + 0.08);

    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.16);
  }

  // シェイク音（地響き）
  public playShake() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(90, t);
    osc.frequency.linearRampToValueAtTime(50, t + 0.35);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.35);
  }

  // ゲームオーバー音
  public playGameOver() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const notes = [440, 415, 392, 370, 349];
    notes.forEach((freq, idx) => {
      const t = this.ctx!.currentTime + idx * 0.14;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(t);
      osc.stop(t + 0.25);
    });
  }

  // のんびり可愛いスイカゲームBGM（マリンバ調ループ）
  public startBgm() {
    if (this.isBgmPlaying || this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    this.isBgmPlaying = true;
    this.bgmStep = 0;

    // 16ステップの親しみやすいトイ・マリンバメロディ
    const melody = [
      523.25, 0, 659.25, 0, 783.99, 659.25, 0, 523.25,
      587.33, 0, 659.25, 0, 523.25, 0, 0, 0,
      440.0, 0, 523.25, 0, 659.25, 523.25, 0, 440.0,
      493.88, 0, 587.33, 0, 523.25, 0, 0, 0,
    ];

    const bass = [
      261.63, 0, 261.63, 0, 329.63, 0, 392.0, 0,
      293.66, 0, 293.66, 0, 392.0, 0, 261.63, 0,
      220.0, 0, 220.0, 0, 261.63, 0, 329.63, 0,
      246.94, 0, 246.94, 0, 261.63, 0, 0, 0,
    ];

    const stepDuration = 180; // ms (約166 BPMの8分音符)

    const tick = () => {
      if (!this.isBgmPlaying || this.isMuted || !this.ctx) return;

      const curStep = this.bgmStep % melody.length;
      const mFreq = melody[curStep];
      const bFreq = bass[curStep];
      const t = this.ctx.currentTime;

      if (mFreq > 0) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(mFreq, t);

        gain.gain.setValueAtTime(0.06, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.16);
      }

      if (bFreq > 0) {
        const bOsc = this.ctx.createOscillator();
        const bGain = this.ctx.createGain();
        bOsc.type = 'triangle';
        bOsc.frequency.setValueAtTime(bFreq, t);

        bGain.gain.setValueAtTime(0.05, t);
        bGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

        bOsc.connect(bGain);
        bGain.connect(this.ctx.destination);
        bOsc.start(t);
        bOsc.stop(t + 0.18);
      }

      this.bgmStep++;
      this.bgmTimer = window.setTimeout(tick, stepDuration);
    };

    this.bgmTimer = window.setTimeout(tick, stepDuration);
  }

  public stopBgm() {
    this.isBgmPlaying = false;
    if (this.bgmTimer !== null) {
      clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
  }
}

export const suikaAudio = new SuikaAudioEngine();
