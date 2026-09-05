// Count Masters 専用 Web Audio サウンドエンジン

class CountMastersAudio {
  private ctx: AudioContext | null = null;
  public isMuted: boolean = false;
  private bgmTimer: number | null = null;
  private bgmStep: number = 0;
  private isBgmPlaying: boolean = false;

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
    }
    return this.isMuted;
  }

  // スティックマン増殖音 (連続で鳴らしても心地よい軽快なポップ音)
  public playPop(pitchMultiplier: number = 1.0) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';

    const baseFreq = 480 * Math.min(2.5, Math.max(0.6, pitchMultiplier));
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.8, now + 0.08);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  // 人数減少音
  public playDecrease() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';

    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.12);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.12);
  }

  // ゲート通過音（青ゲート：きらびやかな上昇アルペジオ）
  public playGatePositive() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';

      const t = now + idx * 0.04;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.15);
    });
  }

  // ゲート通過音（赤ゲート：警告的な鈍いコード）
  public playGateNegative() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    [260, 240, 200].forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';

      const t = now + idx * 0.05;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.2);
    });
  }

  // コイン獲得音
  public playCoin() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';

    osc.frequency.setValueAtTime(987.77, now); // B5
    osc.frequency.setValueAtTime(1318.51, now + 0.06); // E6

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.22);
  }

  // 敵軍団との激突相打ち音
  public playMobClash() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // ノイズ打撃
    const buf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.04), this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(now);
  }

  // 障害物トラップ激突音
  public playTrapHit() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';

    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.15);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  // ボス咆哮・登場
  public playBossRoar() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';

    osc.frequency.setValueAtTime(90, now);
    osc.frequency.linearRampToValueAtTime(130, now + 0.4);
    osc.frequency.linearRampToValueAtTime(70, now + 0.9);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.35, now + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.9);
  }

  // ボス撃破大爆発
  public playBossExplosion() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // ノイズ爆発
    const buf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.5), this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, now);
    filter.frequency.exponentialRampToValueAtTime(100, now + 0.5);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    src.start(now);
  }

  // 階段タワー登攀ステップ音（段数に応じてピッチ上昇）
  public playStairStep(stepIndex: number) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';

    // ペンタトニックスケール風
    const scaleFreqs = [440, 493.88, 554.37, 659.25, 739.99, 880, 987.77, 1108.73, 1318.51, 1479.98, 1760];
    const freq = scaleFreqs[stepIndex % scaleFreqs.length];

    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.12);
  }

  // ステージクリア大ファンファーレ
  public playVictoryFanfare() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const fanfare = [
      { f: 523.25, d: 0.0, l: 0.12 }, // C5
      { f: 523.25, d: 0.12, l: 0.12 }, // C5
      { f: 523.25, d: 0.24, l: 0.12 }, // C5
      { f: 659.25, d: 0.36, l: 0.35 }, // E5
      { f: 587.33, d: 0.72, l: 0.12 }, // D5
      { f: 659.25, d: 0.84, l: 0.12 }, // E5
      { f: 783.99, d: 0.96, l: 0.6 },  // G5
    ];

    fanfare.forEach((n) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';

      const st = now + n.d;
      osc.frequency.setValueAtTime(n.f, st);
      gain.gain.setValueAtTime(0.25, st);
      gain.gain.exponentialRampToValueAtTime(0.001, st + n.l);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(st);
      osc.stop(st + n.l);
    });
  }

  // ゲームオーバー音
  public playGameOver() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const melody = [
      { f: 440, d: 0.0, l: 0.2 },
      { f: 415.3, d: 0.2, l: 0.2 },
      { f: 392.0, d: 0.4, l: 0.2 },
      { f: 369.99, d: 0.6, l: 0.5 },
    ];

    melody.forEach((n) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';

      const st = now + n.d;
      osc.frequency.setValueAtTime(n.f, st);
      gain.gain.setValueAtTime(0.2, st);
      gain.gain.exponentialRampToValueAtTime(0.001, st + n.l);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(st);
      osc.stop(st + n.l);
    });
  }

  // 軽快なランナーBGMループ
  public startBgm() {
    if (this.isMuted || this.isBgmPlaying) return;
    this.initCtx();
    this.isBgmPlaying = true;
    this.bgmStep = 0;

    // 120 BPM (1拍 = 0.5秒, 16分音符 = 0.125秒)
    const stepInterval = 125;

    // 16ステップベースライン & コード進行 (C - Am - F - G)
    const bassNotes = [
      130.81, 0, 130.81, 0, 110.0, 0, 110.0, 0,
      87.31, 0, 87.31, 0, 98.0, 0, 98.0, 0,
    ];

    const leadNotes = [
      261.63, 329.63, 392.0, 523.25, 220.0, 261.63, 329.63, 440.0,
      174.61, 220.0, 261.63, 349.23, 196.0, 246.94, 293.66, 392.0,
    ];

    const playStep = () => {
      if (!this.isBgmPlaying || this.isMuted || !this.ctx) return;
      const now = this.ctx.currentTime;

      const bassFreq = bassNotes[this.bgmStep % bassNotes.length];
      if (bassFreq > 0) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(bassFreq, now);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.18);
      }

      // ドラムビート (Kick on 0, 8; Snare on 4, 12; Hat on even)
      const s = this.bgmStep % 16;
      if (s === 0 || s === 8) {
        // Kick
        const kickOsc = this.ctx.createOscillator();
        const kickGain = this.ctx.createGain();
        kickOsc.frequency.setValueAtTime(130, now);
        kickOsc.frequency.exponentialRampToValueAtTime(35, now + 0.1);
        kickGain.gain.setValueAtTime(0.2, now);
        kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        kickOsc.connect(kickGain);
        kickGain.connect(this.ctx.destination);
        kickOsc.start(now);
        kickOsc.stop(now + 0.1);
      } else if (s === 4 || s === 12) {
        // Snare
        const buf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.08), this.ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        const snare = this.ctx.createBufferSource();
        snare.buffer = buf;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.12, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        snare.connect(g);
        g.connect(this.ctx.destination);
        snare.start(now);
      }

      // 軽快なハイハット
      if (s % 2 === 0) {
        const hatBuf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.02), this.ctx.sampleRate);
        const hatData = hatBuf.getChannelData(0);
        for (let i = 0; i < hatData.length; i++) hatData[i] = Math.random() * 2 - 1;
        const hat = this.ctx.createBufferSource();
        hat.buffer = hatBuf;
        const hg = this.ctx.createGain();
        hg.gain.setValueAtTime(0.04, now);
        hg.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
        hat.connect(hg);
        hg.connect(this.ctx.destination);
        hat.start(now);
      }

      // メロディアクセント (4ステップに1回)
      if (s % 4 === 0) {
        const lFreq = leadNotes[s % leadNotes.length];
        const lOsc = this.ctx.createOscillator();
        const lGain = this.ctx.createGain();
        lOsc.type = 'sine';
        lOsc.frequency.setValueAtTime(lFreq, now);
        lGain.gain.setValueAtTime(0.08, now);
        lGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        lOsc.connect(lGain);
        lGain.connect(this.ctx.destination);
        lOsc.start(now);
        lOsc.stop(now + 0.25);
      }

      this.bgmStep++;
    };

    this.bgmTimer = window.setInterval(playStep, stepInterval);
  }

  public stopBgm() {
    this.isBgmPlaying = false;
    if (this.bgmTimer !== null) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }
}

export const countAudio = new CountMastersAudio();
