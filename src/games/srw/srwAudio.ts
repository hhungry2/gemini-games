// Web Audio API によるスーパーロボット大戦 ネオ・ジェネシス専用音響エンジン

export type BgmTrack = 'map' | 'enemy' | 'battle' | 'boss_battle' | 'intermission' | 'none';

class SrwAudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private currentTrack: BgmTrack = 'none';
  private lastPlayedTrack: BgmTrack = 'none';
  private bgmTimer: number | null = null;
  private bgmStep: number = 0;

  private initCtx(): AudioContext | null {
    if (this.isMuted) return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
      if (this.currentTrack !== 'none') {
        this.lastPlayedTrack = this.currentTrack;
      }
      this.stopBgm();
      if (this.ctx && this.ctx.state === 'running') {
        this.ctx.suspend().catch(() => {});
      }
    } else {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      if (this.lastPlayedTrack !== 'none') {
        const trackToResume = this.lastPlayedTrack;
        this.lastPlayedTrack = 'none';
        this.playBgm(trackToResume);
      }
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  // --- 効果音群 (Sound Effects) ---

  // カーソル移動音
  public playCursor() {
    const ctx = this.initCtx();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.setValueAtTime(800, ctx.currentTime + 0.02);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch {}
  }

  // 決定音
  public playSelect() {
    const ctx = this.initCtx();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.05); // G5
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {}
  }

  // キャンセル音
  public playCancel() {
    const ctx = this.initCtx();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.setValueAtTime(200, ctx.currentTime + 0.06);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {}
  }

  // 精神コマンド発動音（熱い輝き上昇音）
  public playSpirit() {
    const ctx = this.initCtx();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1400, ctx.currentTime + 0.35);
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(3000, ctx.currentTime + 0.35);

      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch {}
  }

  // バルカン / 機関砲
  public playVulcan() {
    const ctx = this.initCtx();
    if (!ctx) return;
    try {
      for (let i = 0; i < 4; i++) {
        const time = ctx.currentTime + i * 0.05;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(240, time);
        osc.frequency.exponentialRampToValueAtTime(80, time + 0.03);
        gain.gain.setValueAtTime(0.07, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.035);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(time);
        osc.stop(time + 0.035);
      }
    } catch {}
  }

  // ビーム発射音
  public playBeam() {
    const ctx = this.initCtx();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {}
  }

  // 近接斬撃音
  public playSlash() {
    const ctx = this.initCtx();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch {}
  }

  // 打撃・ロケットパンチ
  public playPunch() {
    const ctx = this.initCtx();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch {}
  }

  // 超必殺技ノヴァチャージ音
  public playNova() {
    const ctx = this.initCtx();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(100, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.6);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.7);
    } catch {}
  }

  // 被弾音
  public playHit() {
    const ctx = this.initCtx();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {}
  }

  // 撃破大爆発音
  public playBigExplosion() {
    this.playExplosion(true);
  }

  public playExplosion(isBig: boolean = false) {
    const ctx = this.initCtx();
    if (!ctx) return;
    try {
      const duration = isBig ? 0.8 : 0.4;
      const bufferSize = ctx.sampleRate * duration;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(isBig ? 450 : 600, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + duration);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(isBig ? 0.25 : 0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      whiteNoise.start();
    } catch {}
  }

  // --- BGM シーケンサー ---

  public playBgm(track: BgmTrack) {
    if (this.currentTrack === track) return;
    this.stopBgm();
    this.currentTrack = track;
    if (this.isMuted || track === 'none') return;

    this.bgmStep = 0;
    // テンポ設定 (160ms/step)
    const intervalMs = track === 'battle' || track === 'boss_battle' ? 140 : 180;
    this.bgmTimer = window.setInterval(() => {
      this.tickBgm(track);
    }, intervalMs);
  }

  public stopBgm() {
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
    this.currentTrack = 'none';
  }

  private tickBgm(track: BgmTrack) {
    const ctx = this.initCtx();
    if (!ctx || this.isMuted) return;

    const step = this.bgmStep;
    this.bgmStep = (this.bgmStep + 1) % 32;

    try {
      if (track === 'map') {
        // 勇敢な進撃マップBGM（Cマイナーベースのロボットアニメ調）
        const bassNotes = [130.81, 130.81, 155.56, 174.61, 196.0, 174.61, 155.56, 146.83]; // C3, Eb3, F3, G3...
        const melodyNotes = [
          523.25, 0, 587.33, 622.25, 698.46, 0, 622.25, 587.33,
          523.25, 622.25, 783.99, 0, 698.46, 622.25, 587.33, 0,
        ];
        
        // ベース
        if (step % 2 === 0) {
          const bFreq = bassNotes[(step / 2) % bassNotes.length];
          this.playBgmSynth(ctx, bFreq, 'sawtooth', 0.04, 0.12);
        }
        // メロディ
        const mFreq = melodyNotes[step % melodyNotes.length];
        if (mFreq > 0) {
          this.playBgmSynth(ctx, mFreq, 'square', 0.05, 0.16);
        }
      } else if (track === 'enemy') {
        // 緊迫のダークエネミーBGM
        const bassNotes = [98.0, 98.0, 103.83, 110.0, 92.5, 92.5, 98.0, 103.83];
        if (step % 2 === 0) {
          const bFreq = bassNotes[(step / 2) % bassNotes.length];
          this.playBgmSynth(ctx, bFreq, 'sawtooth', 0.05, 0.14);
        }
        if (step % 4 === 0) {
          this.playBgmSynth(ctx, 392.0, 'triangle', 0.04, 0.25);
        }
      } else if (track === 'battle' || track === 'boss_battle') {
        // 超熱血戦闘BGM（スパロボ主題歌風！アップテンポ）
        const chordRoots = [146.83, 146.83, 174.61, 196.0, 220.0, 196.0, 174.61, 164.81]; // Dマイナー
        const leadScale = [
          587.33, 659.25, 698.46, 783.99, 880.0, 0, 880.0, 783.99,
          698.46, 783.99, 880.0, 1046.5, 987.77, 880.0, 783.99, 698.46,
        ];
        // 疾走ドラム調ハイハット
        if (step % 2 === 0) {
          this.playBgmNoise(ctx, 0.02, 0.03);
        }
        // 高速ベース
        const bFreq = chordRoots[(step / 2) % chordRoots.length];
        this.playBgmSynth(ctx, bFreq, 'sawtooth', 0.06, 0.09);
        // 主旋律
        const lFreq = leadScale[step % leadScale.length];
        if (lFreq > 0) {
          this.playBgmSynth(ctx, lFreq, 'square', 0.06, 0.12);
        }
      } else if (track === 'intermission') {
        // 落ち着いた基地・格納庫整備BGM
        const chillNotes = [261.63, 329.63, 392.0, 493.88, 523.25, 392.0, 329.63, 261.63];
        if (step % 4 === 0) {
          const cFreq = chillNotes[(step / 4) % chillNotes.length];
          this.playBgmSynth(ctx, cFreq, 'sine', 0.05, 0.35);
        }
      }
    } catch {}
  }

  private playBgmSynth(ctx: AudioContext, freq: number, type: OscillatorType, volume: number, dur: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  }

  private playBgmNoise(ctx: AudioContext, volume: number, dur: number) {
    const bufferSize = ctx.sampleRate * dur;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 5000;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start();
  }
}

export const srwAudio = new SrwAudioEngine();
