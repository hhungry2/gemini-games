// Web Audio API によるオセロニア音響エンジン

class OthelloniaAudio {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private bgmOscillators: OscillatorNode[] = [];
  private bgmIntervalId: number | null = null;
  private currentBgmType: 'normal' | 'pinch' | 'none' = 'none';

  private initCtx() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioContextClass();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
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

  // 駒配置音 (爽快な打音)
  public playPlaceSound() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.08);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  // 石反転音 (連鎖ごとにピッチアップ)
  public playFlipSound(flipIndex: number = 0) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    // flipIndexに応じて音階を上げる (ドレミファソラシド...)
    const baseFreq = 523.25; // C5
    const freq = baseFreq * Math.pow(1.06, Math.min(12, flipIndex * 1.5));

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.2, now + 0.06);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.06);
  }

  // スキル発動カットイン音 (鋭いエネルギー上昇)
  public playSkillCutinSound() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.25);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.3);
  }

  // 特殊ダメージ / 貫通の重撃音
  public playSpecialDamageSound() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = 'square';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.22);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.22);
  }

  // コンボ連鎖発動音
  public playComboSound(comboCount: number = 1) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const notes = [587.33, 739.99, 880, 1174.66]; // D, F#, A, D
    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const timeOffset = now + idx * 0.04;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq * (1 + comboCount * 0.1), timeOffset);

      gain.gain.setValueAtTime(0.2, timeOffset);
      gain.gain.exponentialRampToValueAtTime(0.01, timeOffset + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(timeOffset);
      osc.stop(timeOffset + 0.15);
    });
  }

  // 回復音 (キラキラ)
  public playHealSound() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const arpeggio = [523.25, 659.25, 783.99, 1046.5]; // C, E, G, C
    arpeggio.forEach((f, i) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = now + i * 0.05;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t);

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.18);
    });
  }

  // 毒ダメージ音 (ジュワッ)
  public playPoisonSound() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.linearRampToValueAtTime(140, now + 0.18);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.18);
  }

  // 罠発動音 (パリン！)
  public playTrapSound() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const freqs = [800, 1200, 1600];
    freqs.forEach((f, i) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = now + i * 0.03;

      osc.type = 'square';
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.exponentialRampToValueAtTime(300, t + 0.15);

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.15);
    });
  }

  // 勝利ファンファーレ
  public playVictoryFanfare() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const melody = [
      { f: 523.25, d: 0.12 }, // C
      { f: 659.25, d: 0.12 }, // E
      { f: 783.99, d: 0.12 }, // G
      { f: 1046.5, d: 0.35 }, // High C
    ];

    let currentT = now;
    melody.forEach((note) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.f, currentT);

      gain.gain.setValueAtTime(0.35, currentT);
      gain.gain.exponentialRampToValueAtTime(0.01, currentT + note.d);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(currentT);
      osc.stop(currentT + note.d);

      currentT += note.d * 0.9;
    });
  }

  // 敗北ジングル
  public playDefeatSound() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const melody = [440, 415.3, 392, 349.23];
    let currentT = now;
    melody.forEach((f) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, currentT);

      gain.gain.setValueAtTime(0.2, currentT);
      gain.gain.exponentialRampToValueAtTime(0.01, currentT + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(currentT);
      osc.stop(currentT + 0.25);

      currentT += 0.22;
    });
  }

  // バトルBGMの制御
  public startBattleBgm(isPinch: boolean = false) {
    if (this.isMuted) return;
    const targetType = isPinch ? 'pinch' : 'normal';
    if (this.currentBgmType === targetType) return;

    this.stopBgm();
    this.initCtx();
    if (!this.ctx) return;

    this.currentBgmType = targetType;
    const bpm = isPinch ? 140 : 116;
    const beatSec = 60 / bpm;

    // ベースラインコード進行
    const normalChords = [
      [220, 261.63, 329.63], // Am
      [174.61, 220, 261.63], // F
      [196, 246.94, 293.66], // G
      [164.81, 196, 246.94], // Em
    ];
    const pinchChords = [
      [220, 277.18, 329.63], // A
      [185, 233.08, 277.18], // F#
      [207.65, 261.63, 311.13], // G#
      [246.94, 311.13, 369.99], // B
    ];

    const chords = isPinch ? pinchChords : normalChords;
    let step = 0;

    const playStep = () => {
      if (this.isMuted || !this.ctx || this.currentBgmType === 'none') return;
      const now = this.ctx.currentTime;
      const chordIdx = Math.floor(step / 4) % chords.length;
      const chord = chords[chordIdx];
      const bassNote = chord[0] / 2;

      // ベース音
      const bOsc = this.ctx.createOscillator();
      const bGain = this.ctx.createGain();
      bOsc.type = isPinch ? 'sawtooth' : 'triangle';
      bOsc.frequency.setValueAtTime(bassNote, now);
      bGain.gain.setValueAtTime(0.08, now);
      bGain.gain.exponentialRampToValueAtTime(0.01, now + beatSec * 0.9);
      bOsc.connect(bGain);
      bGain.connect(this.ctx.destination);
      bOsc.start(now);
      bOsc.stop(now + beatSec * 0.9);

      // アルペジオ
      const aNote = chord[step % 3];
      const aOsc = this.ctx.createOscillator();
      const aGain = this.ctx.createGain();
      aOsc.type = 'sine';
      aOsc.frequency.setValueAtTime(aNote, now);
      aGain.gain.setValueAtTime(0.05, now);
      aGain.gain.exponentialRampToValueAtTime(0.005, now + beatSec * 0.4);
      aOsc.connect(aGain);
      aGain.connect(this.ctx.destination);
      aOsc.start(now);
      aOsc.stop(now + beatSec * 0.4);

      step++;
    };

    playStep();
    this.bgmIntervalId = window.setInterval(playStep, beatSec * 1000);
  }

  public stopBgm() {
    if (this.bgmIntervalId !== null) {
      clearInterval(this.bgmIntervalId);
      this.bgmIntervalId = null;
    }
    this.bgmOscillators.forEach((osc) => {
      try {
        osc.stop();
        osc.disconnect();
      } catch {}
    });
    this.bgmOscillators = [];
    this.currentBgmType = 'none';
  }
}

export const othelloniaAudio = new OthelloniaAudio();
