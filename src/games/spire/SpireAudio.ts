// Web Audio API によるスパイア・オブ・フェイト専用シンセサウンドエンジン

class SpireSoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private bgmTimer: number | null = null;
  private isBgmPlaying: boolean = false;
  private bgmStep: number = 0;

  private initCtx(): AudioContext | null {
    if (this.isMuted) return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.stopBgm();
      if (this.ctx && this.ctx.state === 'running') {
        this.ctx.suspend().catch(() => {});
      }
    } else {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  // --- 効果音群 ---

  // カードホバー
  public playCardHover() {
    const ctx = this.initCtx();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(480, ctx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch (_) {}
  }

  // カードドロー (シュッという紙の擦れる音)
  public playCardDraw() {
    const ctx = this.initCtx();
    if (!ctx) return;
    try {
      const bufferSize = ctx.sampleRate * 0.06;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.06);
      filter.Q.setValueAtTime(3, ctx.currentTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start();
    } catch (_) {}
  }

  // カード発動
  public playCardPlay() {
    const ctx = this.initCtx();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(260, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(640, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.13);
    } catch (_) {}
  }

  // 斬撃・アタック
  public playSlash() {
    const ctx = this.initCtx();
    if (!ctx) return;
    try {
      // ホワイトノイズ + 急降下ピッチ
      const bufferSize = ctx.sampleRate * 0.15;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(3500, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.15);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(450, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.12);
      oscGain.gain.setValueAtTime(0.2, ctx.currentTime);
      oscGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.connect(oscGain);
      oscGain.connect(ctx.destination);

      noise.start();
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (_) {}
  }

  // 強打・大斬撃
  public playHeavySlash() {
    this.playSlash();
    const ctx = this.initCtx();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.26);
    } catch (_) {}
  }

  // シールド・防御
  public playShield() {
    const ctx = this.initCtx();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(480, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.21);
    } catch (_) {}
  }

  // 雷光・電撃 (Zap / Lightning)
  public playLightning() {
    const ctx = this.initCtx();
    if (!ctx) return;
    try {
      const bufferSize = ctx.sampleRate * 0.18;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.sin(i * 0.1);
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(800, ctx.currentTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start();
    } catch (_) {}
  }

  // 毒発動
  public playPoison() {
    const ctx = this.initCtx();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(440, ctx.currentTime + 0.08);
      osc.frequency.linearRampToValueAtTime(180, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.21);
    } catch (_) {}
  }

  // バフ・パワー発動
  public playBuff() {
    const ctx = this.initCtx();
    if (!ctx) return;
    try {
      const notes = [330, 440, 554, 659];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.04);
        gain.gain.setValueAtTime(0, ctx.currentTime + idx * 0.04);
        gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + idx * 0.04 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.04 + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.04);
        osc.stop(ctx.currentTime + idx * 0.04 + 0.16);
      });
    } catch (_) {}
  }

  // デバフ付与
  public playDebuff() {
    const ctx = this.initCtx();
    if (!ctx) return;
    try {
      const notes = [440, 392, 349, 311];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.05);
        gain.gain.setValueAtTime(0.12, ctx.currentTime + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.05 + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.05);
        osc.stop(ctx.currentTime + idx * 0.05 + 0.11);
      });
    } catch (_) {}
  }

  // ターン終了ベル音
  public playEndTurn() {
    const ctx = this.initCtx();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.36);
    } catch (_) {}
  }

  // ポーション使用
  public playPotion() {
    const ctx = this.initCtx();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.08);
      osc.frequency.exponentialRampToValueAtTime(450, ctx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.21);
    } catch (_) {}
  }

  // ゴールド獲得
  public playGold() {
    const ctx = this.initCtx();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(987.77, ctx.currentTime); // B5
      osc.frequency.setValueAtTime(1318.51, ctx.currentTime + 0.06); // E6
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.23);
    } catch (_) {}
  }

  // 勝利ファンファーレ
  public playVictory() {
    const ctx = this.initCtx();
    if (!ctx) return;
    try {
      const melody = [
        { f: 523.25, t: 0.1 },
        { f: 659.25, t: 0.1 },
        { f: 783.99, t: 0.12 },
        { f: 1046.5, t: 0.35 },
      ];
      let time = ctx.currentTime;
      melody.forEach((m) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(m.f, time);
        gain.gain.setValueAtTime(0.2, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + m.t);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(time);
        osc.stop(time + m.t + 0.05);
        time += m.t * 0.9;
      });
    } catch (_) {}
  }

  // 敗北ジングル
  public playDefeat() {
    const ctx = this.initCtx();
    if (!ctx) return;
    try {
      const melody = [
        { f: 392.0, t: 0.2 },
        { f: 369.99, t: 0.2 },
        { f: 349.23, t: 0.2 },
        { f: 311.13, t: 0.4 },
      ];
      let time = ctx.currentTime;
      melody.forEach((m) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(m.f, time);
        gain.gain.setValueAtTime(0.16, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + m.t);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(time);
        osc.stop(time + m.t + 0.05);
        time += m.t * 0.95;
      });
    } catch (_) {}
  }

  // --- BGM シーケンサー (ダークファンタジー・ダンジョン風) ---
  public startBattleBgm() {
    if (this.isBgmPlaying || this.isMuted) return;
    this.isBgmPlaying = true;
    this.bgmStep = 0;

    const baseBass = [110, 110, 130.81, 110, 98, 110, 123.47, 98]; // A2, C3, G2, B2
    const leadNotes = [220, 261.63, 329.63, 293.66, 261.63, 246.94, 220, 196];

    const tick = () => {
      if (!this.isBgmPlaying || this.isMuted) return;
      const ctx = this.initCtx();
      if (ctx) {
        try {
          const now = ctx.currentTime;
          const bassFreq = baseBass[this.bgmStep % baseBass.length];
          const leadFreq = leadNotes[(Math.floor(this.bgmStep / 2)) % leadNotes.length];

          // ベース音 (低音パルス)
          const bOsc = ctx.createOscillator();
          const bGain = ctx.createGain();
          bOsc.type = 'triangle';
          bOsc.frequency.setValueAtTime(bassFreq, now);
          bGain.gain.setValueAtTime(0.06, now);
          bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
          bOsc.connect(bGain);
          bGain.connect(ctx.destination);
          bOsc.start(now);
          bOsc.stop(now + 0.24);

          // メロディ音 (シンセリード)
          if (this.bgmStep % 2 === 0) {
            const lOsc = ctx.createOscillator();
            const lGain = ctx.createGain();
            lOsc.type = 'sine';
            lOsc.frequency.setValueAtTime(leadFreq, now);
            lGain.gain.setValueAtTime(0.035, now);
            lGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            lOsc.connect(lGain);
            lGain.connect(ctx.destination);
            lOsc.start(now);
            lOsc.stop(now + 0.32);
          }
        } catch (_) {}
      }

      this.bgmStep++;
      this.bgmTimer = window.setTimeout(tick, 220); // 約136 BPM
    };

    tick();
  }

  public stopBgm() {
    this.isBgmPlaying = false;
    if (this.bgmTimer !== null) {
      clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
  }
}

export const spireAudio = new SpireSoundEngine();
