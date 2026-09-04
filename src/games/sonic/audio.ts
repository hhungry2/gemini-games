// Sonic Speed Rush - Web Audio API Sound Engine (FM Synth & 16-Bit MD Style)

class SonicAudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private bgmGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private currentBgm: 'stage' | 'boss' | 'invincible' | 'none' = 'none';
  private ringPanToggle: boolean = false;
  private bgmIntervalId: number | null = null;
  private bgmStep: number = 0;

  constructor() {
    // Lazy initialize AudioContext on user interaction
  }

  private init() {
    if (!this.ctx) {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtxClass();

      this.bgmGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();

      this.bgmGain.gain.setValueAtTime(0.22, this.ctx.currentTime);
      this.sfxGain.gain.setValueAtTime(0.35, this.ctx.currentTime);

      this.bgmGain.connect(this.ctx.destination);
      this.sfxGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.ctx && this.bgmGain && this.sfxGain) {
      const now = this.ctx.currentTime;
      this.bgmGain.gain.setValueAtTime(muted ? 0 : 0.22, now);
      this.sfxGain.gain.setValueAtTime(muted ? 0 : 0.35, now);
    }
  }

  public getMuted() {
    return this.isMuted;
  }

  // --- Sound Effects ---

  public playRing() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;

      osc.type = 'triangle';
      // Stereo alternation (classic MD sound!)
      this.ringPanToggle = !this.ringPanToggle;
      const panVal = this.ringPanToggle ? -0.6 : 0.6;
      if (panner) panner.pan.setValueAtTime(panVal, now);

      // Sonic ring ping frequency curve: 1046Hz (C6) ramping to 1318Hz (E6)
      osc.frequency.setValueAtTime(1046.5, now);
      osc.frequency.exponentialRampToValueAtTime(1318.5, now + 0.08);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      if (panner) {
        osc.connect(panner);
        panner.connect(gain);
      } else {
        osc.connect(gain);
      }
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch {}
  }

  public playJump() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(196, now); // G3
      osc.frequency.exponentialRampToValueAtTime(659, now + 0.22); // E5

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.22);
    } catch {}
  }

  public playSpindashCharge(pitchMultiplier: number = 1.0) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      const baseFreq = 220 * Math.min(2.5, 1 + pitchMultiplier * 0.15);
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 2.2, now + 0.15);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.15);
    } catch {}
  }

  public playSpindashRelease() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    try {
      const now = this.ctx.currentTime;
      // White noise burst + falling sweep
      this.playNoise(0.25, 0.2);

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.25);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch {}
  }

  public playSpring() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(1100, now + 0.18);
      osc.frequency.exponentialRampToValueAtTime(550, now + 0.35);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch {}
  }

  public playDashPad() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.2);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch {}
  }

  public playHomingLock() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.setValueAtTime(1600, now + 0.05);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.12);
    } catch {}
  }

  public playHomingAttack() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(900, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.2);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.2);
    } catch {}
  }

  public playDestroy() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    try {
      const now = this.ctx.currentTime;
      this.playNoise(0.25, 0.3);

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.25);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch {}
  }

  public playAnimal() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, now);
      osc.frequency.exponentialRampToValueAtTime(2200, now + 0.12);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.18);
    } catch {}
  }

  public playSkid() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    this.playNoise(0.12, 0.18);
  }

  public playRingLoss() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    try {
      // Rapid cascade of ring tones
      const freqs = [880, 784, 659, 587, 523, 440];
      freqs.forEach((freq, idx) => {
        const now = (this.ctx?.currentTime || 0) + idx * 0.04;
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.8, now + 0.1);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

        osc.connect(gain);
        gain.connect(this.sfxGain!);

        osc.start(now);
        osc.stop(now + 0.15);
      });
    } catch {}
  }

  public playHurt() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.3);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.3);
    } catch {}
  }

  public playCheckpoint() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    try {
      const tones = [523, 659, 784, 1046];
      tones.forEach((t, i) => {
        const now = (this.ctx?.currentTime || 0) + i * 0.07;
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(t, now);

        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

        osc.connect(gain);
        gain.connect(this.sfxGain!);

        osc.start(now);
        osc.stop(now + 0.1);
      });
    } catch {}
  }

  public playGoalPlate() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    try {
      // Spinning plate sound
      for (let i = 0; i < 8; i++) {
        const now = this.ctx.currentTime + i * 0.06;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600 + i * 80, now);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.05);
      }
    } catch {}
  }

  public playClearJingle() {
    if (this.isMuted) return;
    this.init();
    this.stopBGM();
    if (!this.ctx || !this.sfxGain) return;

    try {
      // Classic victory fanfare: C4, E4, G4, C5, ... G4, C5!
      const notes = [
        { f: 523, d: 0.15 },
        { f: 523, d: 0.15 },
        { f: 523, d: 0.15 },
        { f: 659, d: 0.35 },
        { f: 587, d: 0.15 },
        { f: 659, d: 0.15 },
        { f: 784, d: 0.4 },
        { f: 1046, d: 0.8 },
      ];

      let t = this.ctx.currentTime + 0.1;
      notes.forEach((note) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(note.f, t);

        gain.gain.setValueAtTime(0.28, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + note.d);

        osc.connect(gain);
        gain.connect(this.sfxGain!);

        osc.start(t);
        osc.stop(t + note.d);
        t += note.d * 0.9;
      });
    } catch {}
  }

  public playOneUp() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    try {
      const melody = [659, 784, 987, 1318, 1174, 1318];
      let t = this.ctx.currentTime;
      melody.forEach((freq) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.22, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

        osc.connect(gain);
        gain.connect(this.sfxGain!);

        osc.start(t);
        osc.stop(t + 0.1);
        t += 0.08;
      });
    } catch {}
  }

  public playFlight() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.linearRampToValueAtTime(220, now + 0.08);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.08);
    } catch {}
  }

  public playBossHit() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    try {
      const now = this.ctx.currentTime;
      this.playNoise(0.3, 0.35);

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.3);

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.3);
    } catch {}
  }

  private playNoise(duration: number, volume: number = 0.2) {
    if (!this.ctx || !this.sfxGain) return;
    try {
      const bufferSize = Math.floor(this.ctx.sampleRate * duration);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;

      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

      noise.connect(gain);
      gain.connect(this.sfxGain);

      noise.start(now);
      noise.stop(now + duration);
    } catch {}
  }

  // --- BGM Engine (Procedural MD/Genesis 16-Bit style) ---

  public startStageBGM() {
    if (this.currentBgm === 'stage') return;
    this.stopBGM();
    this.currentBgm = 'stage';
    this.init();

    // 140 BPM Green Hill style melody and funky bass
    // 16-step patterns
    const bassline = [
      130.81, 130.81, 155.56, 174.61, // C3, C3, Eb3, F3
      196.0, 196.0, 174.61, 155.56,  // G3, G3, F3, Eb3
      116.54, 116.54, 130.81, 155.56, // Bb2, Bb2, C3, Eb3
      174.61, 196.0, 233.08, 196.0,  // F3, G3, Bb3, G3
    ];

    const leadMelody = [
      523.25, 0, 523.25, 659.25, 783.99, 0, 659.25, 0, // C5, -, C5, E5, G5, -, E5, -
      880.0, 783.99, 659.25, 523.25, 587.33, 0, 0, 0, // A5, G5, E5, C5, D5, -, -, -
      587.33, 0, 587.33, 659.25, 698.46, 0, 659.25, 587.33, // D5, -, D5, E5, F5, -, E5, D5
      523.25, 0, 392.0, 523.25, 659.25, 783.99, 0, 0, // C5, -, G4, C5, E5, G5, -, -
    ];

    const stepDuration = (60 / 140) / 4; // 16th note in seconds (~0.107s)
    this.bgmStep = 0;

    this.bgmIntervalId = window.setInterval(() => {
      if (this.isMuted || !this.ctx || !this.bgmGain) return;
      try {
        const now = this.ctx.currentTime;
        const step = this.bgmStep;

        // Bass channel (FM punchy pluck)
        const bassFreq = bassline[step % bassline.length];
        if (bassFreq > 0) {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(bassFreq, now);

          gain.gain.setValueAtTime(0.18, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + stepDuration * 1.5);

          osc.connect(gain);
          gain.connect(this.bgmGain);

          osc.start(now);
          osc.stop(now + stepDuration * 1.5);
        }

        // Lead synth channel
        const leadFreq = leadMelody[step % leadMelody.length];
        if (leadFreq > 0) {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(leadFreq, now);

          gain.gain.setValueAtTime(0.16, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + stepDuration * 2.2);

          osc.connect(gain);
          gain.connect(this.bgmGain);

          osc.start(now);
          osc.stop(now + stepDuration * 2.2);
        }

        // Drum / Hat beat
        if (step % 2 === 0) {
          // Hi-hat tick
          this.playBgmHat(step % 4 === 2 ? 0.05 : 0.03);
        }
        if (step % 8 === 4) {
          // Snare on 2 & 4
          this.playBgmSnare();
        }

        this.bgmStep++;
      } catch {}
    }, stepDuration * 1000);
  }

  public startBossBGM() {
    if (this.currentBgm === 'boss') return;
    this.stopBGM();
    this.currentBgm = 'boss';
    this.init();

    // Fast, tense 150 BPM techno
    const stepDuration = (60 / 150) / 4;
    this.bgmStep = 0;

    const bossBass = [
      98, 98, 116.54, 98, 123.47, 98, 116.54, 130.81,
      98, 98, 116.54, 98, 146.83, 138.59, 130.81, 116.54,
    ];

    this.bgmIntervalId = window.setInterval(() => {
      if (this.isMuted || !this.ctx || !this.bgmGain) return;
      try {
        const now = this.ctx.currentTime;
        const step = this.bgmStep;

        const bFreq = bossBass[step % bossBass.length];
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(bFreq, now);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + stepDuration * 1.8);

        osc.connect(gain);
        gain.connect(this.bgmGain);

        osc.start(now);
        osc.stop(now + stepDuration * 1.8);

        if (step % 4 === 0) {
          // Kick
          const kick = this.ctx.createOscillator();
          const kGain = this.ctx.createGain();
          kick.type = 'sine';
          kick.frequency.setValueAtTime(140, now);
          kick.frequency.exponentialRampToValueAtTime(35, now + 0.1);
          kGain.gain.setValueAtTime(0.25, now);
          kGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
          kick.connect(kGain);
          kGain.connect(this.bgmGain);
          kick.start(now);
          kick.stop(now + 0.1);
        }

        if (step % 8 === 4) {
          this.playBgmSnare();
        }

        this.bgmStep++;
      } catch {}
    }, stepDuration * 1000);
  }

  public startInvincibleBGM() {
    if (this.currentBgm === 'invincible') return;
    this.stopBGM();
    this.currentBgm = 'invincible';
    this.init();

    // Fast arpeggio loop (170 BPM)
    const stepDuration = (60 / 170) / 4;
    this.bgmStep = 0;
    const arpNotes = [523, 659, 784, 1046, 784, 659, 587, 740, 880, 1174, 880, 740];

    this.bgmIntervalId = window.setInterval(() => {
      if (this.isMuted || !this.ctx || !this.bgmGain) return;
      try {
        const now = this.ctx.currentTime;
        const note = arpNotes[this.bgmStep % arpNotes.length];
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(note, now);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + stepDuration * 1.5);

        osc.connect(gain);
        gain.connect(this.bgmGain);

        osc.start(now);
        osc.stop(now + stepDuration * 1.5);
        this.bgmStep++;
      } catch {}
    }, stepDuration * 1000);
  }

  private playBgmHat(vol = 0.04) {
    if (!this.ctx || !this.bgmGain) return;
    try {
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.04);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;

      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      noise.connect(gain);
      gain.connect(this.bgmGain);
      noise.start(now);
      noise.stop(now + 0.04);
    } catch {}
  }

  private playBgmSnare() {
    if (!this.ctx || !this.bgmGain) return;
    try {
      const now = this.ctx.currentTime;
      // noise + tone
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.12);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const gain = this.ctx.createGain();

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      noise.connect(gain);
      gain.connect(this.bgmGain);
      noise.start(now);
      noise.stop(now + 0.12);
    } catch {}
  }

  public stopBGM() {
    if (this.bgmIntervalId !== null) {
      clearInterval(this.bgmIntervalId);
      this.bgmIntervalId = null;
    }
    this.currentBgm = 'none';
  }
}

export const sonicAudio = new SonicAudioEngine();
