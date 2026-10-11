// All sounds are synthesized locally; no audio files or network requests.
export class KartAudio {
  private context: AudioContext | null = null;
  private engine: OscillatorNode | null = null;
  private volume: GainNode | null = null;
  private engineGain: GainNode | null = null;
  private beat = -1;
  muted = false;
  unlock() {
    try {
      this.context ??= new AudioContext();
      if (!this.volume) {
        this.volume = this.context.createGain();
        this.volume.gain.value = this.muted ? 0 : 0.2;
        this.volume.connect(this.context.destination);
      }
      void this.context.resume().catch(() => {});
    } catch {
      /* Gameplay remains available without Web Audio. */
    }
  }
  setMuted(value: boolean) {
    this.muted = value;
    if (this.context && this.volume)
      this.volume.gain.setTargetAtTime(
        value ? 0 : 0.2,
        this.context.currentTime,
        0.02,
      );
  }
  private tone(
    frequency: number,
    length = 0.1,
    delay = 0,
    type: OscillatorType = 'square',
    gain = 0.15,
  ) {
    const ctx = this.context;
    if (!ctx || !this.volume || this.muted) return;
    const o = ctx.createOscillator(),
      v = ctx.createGain(),
      t = ctx.currentTime + delay;
    o.type = type;
    o.frequency.value = frequency;
    v.gain.setValueAtTime(gain, t);
    v.gain.exponentialRampToValueAtTime(0.001, t + length);
    o.connect(v);
    v.connect(this.volume);
    o.start(t);
    o.stop(t + length + 0.03);
    o.onended = () => {
      o.disconnect();
      v.disconnect();
    };
  }
  event(name: string) {
    if (name === 'coin') {
      this.tone(1250, 0.05);
      this.tone(1660, 0.12, 0.055);
    } else if (name === 'count') this.tone(440, 0.13);
    else if (name === 'go' || name === 'lap') {
      this.tone(880, 0.25);
      this.tone(1320, 0.25, 0.12);
    } else if (name === 'hit') {
      this.tone(105, 0.35, 0, 'sawtooth', 0.22);
      this.tone(75, 0.2, 0.1, 'triangle');
    } else if (name === 'finish') {
      [523, 659, 784, 1047, 784, 1047].forEach((f, i) =>
        this.tone(f, 0.24, i * 0.14),
      );
    } else {
      [330, 495, 660].forEach((f, i) =>
        this.tone(f, 0.12, i * 0.05, 'triangle', 0.3),
      );
    }
  }
  update(speed: number, time: number, active: boolean, theme: number) {
    const ctx = this.context;
    if (!ctx || !this.volume) return;
    if (active && !this.engine) {
      this.engine = ctx.createOscillator();
      this.engine.type = 'sawtooth';
      this.engineGain = ctx.createGain();
      this.engineGain.gain.value = 0.075;
      this.engine.connect(this.engineGain);
      this.engineGain.connect(this.volume);
      this.engine.start();
    }
    if (!active) {
      this.stop();
      return;
    }
    this.engine?.frequency.setTargetAtTime(
      42 + speed * 0.63,
      ctx.currentTime,
      0.1,
    );
    const beat = Math.floor(time * 6);
    if (beat !== this.beat) {
      this.beat = beat;
      // Original two-bar racing loop, intentionally independent of the source game's music.
      const melody = [0, 7, 12, 7, 4, 7, 11, 7, 2, 9, 14, 9, 5, 9, 12, 7];
      const note =
        melody[beat % melody.length] + (theme === 2 ? -3 : theme === 3 ? 5 : 0);
      if (beat % 2 === 0)
        this.tone(261.63 * 2 ** (note / 12), 0.13, 0, 'triangle', 0.15);
      if (beat % 4 === 0)
        this.tone(
          130.81 * 2 ** ((beat % 16 < 8 ? 0 : 5) / 12),
          0.16,
          0,
          'triangle',
          0.22,
        );
    }
  }
  stop() {
    if (this.engine) {
      try {
        this.engine.stop();
      } catch {
        /* Already stopped. */
      }
      this.engine.disconnect();
      this.engine = null;
      this.engineGain?.disconnect();
      this.engineGain = null;
    }
    this.beat = -1;
  }
  dispose() {
    this.stop();
    const ctx = this.context;
    this.context = null;
    this.volume = null;
    if (ctx) void ctx.close().catch(() => {});
  }
}
