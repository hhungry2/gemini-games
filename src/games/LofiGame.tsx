import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  Disc3,
  Sparkles,
  ArrowLeft,
  Clock
} from 'lucide-react';

export const LOFI_LISTEN_TIME_KEY = 'lofi_listen_total_seconds_v1';
export const LOFI_FAV_SONG_KEY = 'lofi_fav_song_v1';

interface LofiGameProps {
  onBackToHub: () => void;
  isDark: boolean;
  isFullscreen: boolean;
}

// MIDI frequency conversion
function midiToFreq(m: number): number {
  return 440 * Math.pow(2, (m - 69) / 12);
}

interface SongChord {
  step: number;
  name: string;
  root: number;
  notes: number[];
}

interface SongMelodyNote {
  step: number;
  note: number;
  name: string;
  dur: number;
}

interface SongData {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  totalSteps: number;
  chords: SongChord[];
  melody: SongMelodyNote[];
}

const SONGS: Record<string, SongData> = {
  marunouchi: {
    id: 'marunouchi',
    title: '丸の内サディスティック / Just the Two of Us',
    artist: '椎名林檎 / Grover Washington Jr.',
    bpm: 78,
    totalSteps: 32,
    chords: [
      { step: 0,  name: 'Fmaj7',  root: 41, notes: [53, 57, 60, 64] },
      { step: 8,  name: 'E7(#9)', root: 40, notes: [52, 56, 59, 63] },
      { step: 16, name: 'Am7',    root: 45, notes: [45, 57, 60, 64] },
      { step: 24, name: 'Gm7-C7', root: 43, notes: [46, 55, 58, 62] }
    ],
    melody: [
      { step: 0,  note: 72, name: 'C5', dur: 0.28 },
      { step: 2,  note: 71, name: 'B4', dur: 0.20 },
      { step: 4,  note: 69, name: 'A4', dur: 0.28 },
      { step: 6,  note: 67, name: 'G4', dur: 0.28 },
      { step: 8,  note: 64, name: 'E4', dur: 0.28 },
      { step: 10, note: 67, name: 'G4', dur: 0.28 },
      { step: 13, note: 68, name: 'G#4', dur: 0.18 },
      { step: 14, note: 69, name: 'A4', dur: 0.35 },
      { step: 16, note: 69, name: 'A4', dur: 0.35 },
      { step: 20, note: 67, name: 'G4', dur: 0.28 },
      { step: 22, note: 64, name: 'E4', dur: 0.28 },
      { step: 24, note: 62, name: 'D4', dur: 0.20 },
      { step: 26, note: 64, name: 'E4', dur: 0.28 },
      { step: 28, note: 60, name: 'C4', dur: 0.55 }
    ]
  },
  yoru: {
    id: 'yoru',
    title: '夜に駆ける (Racing into the Night)',
    artist: 'YOASOBI風 Lo-fi Chill',
    bpm: 80,
    totalSteps: 32,
    chords: [
      { step: 0,  name: 'Fmaj7', root: 41, notes: [53, 57, 60, 64] },
      { step: 8,  name: 'G7',    root: 43, notes: [55, 59, 62, 65] },
      { step: 16, name: 'Em7',   root: 40, notes: [52, 55, 59, 62] },
      { step: 24, name: 'Am7',   root: 45, notes: [45, 57, 60, 64] }
    ],
    melody: [
      { step: 0,  note: 69, name: 'A4', dur: 0.30 },
      { step: 2,  note: 72, name: 'C5', dur: 0.30 },
      { step: 4,  note: 74, name: 'D5', dur: 0.40 },
      { step: 8,  note: 72, name: 'C5', dur: 0.35 },
      { step: 10, note: 71, name: 'B4', dur: 0.30 },
      { step: 12, note: 69, name: 'A4', dur: 0.40 },
      { step: 16, note: 67, name: 'G4', dur: 0.35 },
      { step: 18, note: 69, name: 'A4', dur: 0.30 },
      { step: 20, note: 72, name: 'C5', dur: 0.40 },
      { step: 24, note: 69, name: 'A4', dur: 0.60 }
    ]
  },
  flyme: {
    id: 'flyme',
    title: 'Fly Me to the Moon',
    artist: 'Jazz Standard / 新世紀エヴァンゲリオン',
    bpm: 76,
    totalSteps: 64,
    chords: [
      { step: 0,  name: 'Am7',   root: 45, notes: [57, 60, 64, 67] },
      { step: 16, name: 'Dm7',   root: 38, notes: [50, 53, 57, 60] },
      { step: 32, name: 'G7',    root: 43, notes: [53, 55, 59, 62] },
      { step: 48, name: 'Cmaj7', root: 36, notes: [48, 52, 55, 59] }
    ],
    melody: [
      { step: 0,  note: 72, name: 'C5', dur: 0.38 },
      { step: 4,  note: 71, name: 'B4', dur: 0.38 },
      { step: 8,  note: 69, name: 'A4', dur: 0.38 },
      { step: 12, note: 67, name: 'G4', dur: 0.38 },
      { step: 16, note: 65, name: 'F4', dur: 0.55 },
      { step: 22, note: 67, name: 'G4', dur: 0.25 },
      { step: 24, note: 69, name: 'A4', dur: 0.45 },
      { step: 28, note: 72, name: 'C5', dur: 0.55 },
      { step: 32, note: 71, name: 'B4', dur: 0.38 },
      { step: 36, note: 69, name: 'A4', dur: 0.38 },
      { step: 40, note: 67, name: 'G4', dur: 0.38 },
      { step: 44, note: 65, name: 'F4', dur: 0.38 },
      { step: 48, note: 64, name: 'E4', dur: 0.75 },
      { step: 56, note: 65, name: 'F4', dur: 0.25 },
      { step: 60, note: 67, name: 'G4', dur: 0.38 }
    ]
  },
  summer: {
    id: 'summer',
    title: 'あの夏へ (One Summer\'s Day)',
    artist: 'スタジオジブリ『千と千尋の神隠し』/ 久石譲',
    bpm: 72,
    totalSteps: 64,
    chords: [
      { step: 0,  name: 'Fmaj7', root: 41, notes: [53, 57, 60, 64] },
      { step: 16, name: 'Em7',   root: 40, notes: [52, 55, 59, 62] },
      { step: 32, name: 'Dm7',   root: 38, notes: [50, 53, 57, 60] },
      { step: 48, name: 'Cmaj7', root: 36, notes: [48, 52, 55, 59] }
    ],
    melody: [
      { step: 0,  note: 76, name: 'E5', dur: 0.45 },
      { step: 4,  note: 74, name: 'D5', dur: 0.35 },
      { step: 8,  note: 72, name: 'C5', dur: 0.45 },
      { step: 12, note: 69, name: 'A4', dur: 0.35 },
      { step: 16, note: 67, name: 'G4', dur: 0.55 },
      { step: 24, note: 69, name: 'A4', dur: 0.25 },
      { step: 28, note: 72, name: 'C5', dur: 0.45 },
      { step: 32, note: 74, name: 'D5', dur: 0.45 },
      { step: 40, note: 72, name: 'C5', dur: 0.25 },
      { step: 44, note: 71, name: 'B4', dur: 0.35 },
      { step: 48, note: 72, name: 'C5', dur: 0.95 }
    ]
  },
  chillhop: {
    id: 'chillhop',
    title: 'Rainy Tokyo Midnight',
    artist: 'Original Lo-fi Chillhop Session',
    bpm: 78,
    totalSteps: 64,
    chords: [
      { step: 0,  name: 'Abmaj7', root: 44, notes: [56, 60, 63, 67] },
      { step: 16, name: 'Gm7',    root: 43, notes: [55, 58, 62, 65] },
      { step: 32, name: 'Fm9',    root: 41, notes: [53, 56, 60, 63, 67] },
      { step: 48, name: 'Ebmaj7', root: 39, notes: [51, 55, 58, 62] }
    ],
    melody: [
      { step: 0,  note: 67, name: 'G4', dur: 0.4 },
      { step: 6,  note: 70, name: 'Bb4', dur: 0.3 },
      { step: 12, note: 72, name: 'C5', dur: 0.4 },
      { step: 20, note: 70, name: 'Bb4', dur: 0.3 },
      { step: 26, note: 67, name: 'G4', dur: 0.4 },
      { step: 34, note: 65, name: 'F4', dur: 0.4 },
      { step: 42, note: 63, name: 'Eb4', dur: 0.5 },
      { step: 52, note: 65, name: 'F4', dur: 0.3 },
      { step: 56, note: 67, name: 'G4', dur: 0.6 }
    ]
  }
};

export const LofiGame: React.FC<LofiGameProps> = ({
  onBackToHub,
  isDark,
  isFullscreen,
}) => {
  const [selectedSongKey, setSelectedSongKey] = useState<string>('marunouchi');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [bpm, setBpm] = useState<number>(78);
  const [tapeWobble, setTapeWobble] = useState<number>(40);
  const [filterCutoff, setFilterCutoff] = useState<number>(3200);
  const [masterVolume, setMasterVolume] = useState<number>(80);
  const [vinylVolume, setVinylVolume] = useState<number>(45);
  const [rainVolume, setRainVolume] = useState<number>(40);

  const [tracks, setTracks] = useState({
    melody: true,
    keys: true,
    bass: true,
    drums: true,
    vinyl: true,
    rain: true
  });

  const [currentChordName, setCurrentChordName] = useState<string>('Fmaj7');
  const [currentNoteName, setCurrentNoteName] = useState<string>('-');
  const [totalListeningSeconds, setTotalListeningSeconds] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'tracks' | 'fx' | 'songs'>('tracks');

  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const toneFilterRef = useRef<BiquadFilterNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const vinylGainRef = useRef<GainNode | null>(null);
  const rainGainRef = useRef<GainNode | null>(null);
  const timerIdRef = useRef<NodeJS.Timeout | null>(null);
  const stepRef = useRef<number>(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const isPlayingRef = useRef<boolean>(false);
  const bpmRef = useRef<number>(bpm);
  const tracksRef = useRef(tracks);
  const selectedSongKeyRef = useRef<string>(selectedSongKey);
  const tapeWobbleRef = useRef<number>(tapeWobble);

  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { bpmRef.current = bpm; }, [bpm]);
  useEffect(() => { tracksRef.current = tracks; }, [tracks]);
  useEffect(() => { selectedSongKeyRef.current = selectedSongKey; }, [selectedSongKey]);
  useEffect(() => { tapeWobbleRef.current = tapeWobble; }, [tapeWobble]);

  useEffect(() => {
    const savedTime = localStorage.getItem(LOFI_LISTEN_TIME_KEY);
    if (savedTime) {
      setTotalListeningSeconds(parseInt(savedTime, 10) || 0);
    }
    const savedSong = localStorage.getItem(LOFI_FAV_SONG_KEY);
    if (savedSong && SONGS[savedSong]) {
      setSelectedSongKey(savedSong);
      setBpm(SONGS[savedSong].bpm);
      setCurrentChordName(SONGS[savedSong].chords[0].name);
    }
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setTotalListeningSeconds((prev) => {
          const next = prev + 1;
          localStorage.setItem(LOFI_LISTEN_TIME_KEY, next.toString());
          return next;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        setTracks(prev => ({ ...prev, melody: !prev.melody }));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const initAudio = () => {
    if (audioCtxRef.current) return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    audioCtxRef.current = ctx;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 64;
    analyser.smoothingTimeConstant = 0.8;
    analyserRef.current = analyser;

    const toneFilter = ctx.createBiquadFilter();
    toneFilter.type = 'lowpass';
    toneFilter.frequency.value = filterCutoff;
    toneFilterRef.current = toneFilter;

    const masterGain = ctx.createGain();
    masterGain.gain.value = masterVolume / 100;
    masterGainRef.current = masterGain;

    toneFilter.connect(masterGain);
    masterGain.connect(analyser);
    analyser.connect(ctx.destination);

    // Vinyl Noise
    const vinylBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const vData = vinylBuf.getChannelData(0);
    for (let i = 0; i < vinylBuf.length; i++) {
      let val = (Math.random() * 2 - 1) * 0.015;
      if (Math.random() < 0.0009) {
        val += (Math.random() > 0.5 ? 1 : -1) * (0.08 + Math.random() * 0.16);
      }
      vData[i] = val;
    }
    const vSrc = ctx.createBufferSource();
    vSrc.buffer = vinylBuf;
    vSrc.loop = true;
    const vFilter = ctx.createBiquadFilter();
    vFilter.type = 'bandpass';
    vFilter.frequency.value = 1600;
    vFilter.Q.value = 0.9;
    const vGain = ctx.createGain();
    vGain.gain.value = tracks.vinyl ? (vinylVolume / 100) * 0.7 : 0;
    vinylGainRef.current = vGain;
    vSrc.connect(vFilter);
    vFilter.connect(vGain);
    vGain.connect(masterGain);
    vSrc.start();

    // Rain Noise
    const rainBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const rData = rainBuf.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < rainBuf.length; i++) {
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + 0.025 * white) / 1.025;
      rData[i] = lastOut * 0.45;
    }
    const rSrc = ctx.createBufferSource();
    rSrc.buffer = rainBuf;
    rSrc.loop = true;
    const rFilter = ctx.createBiquadFilter();
    rFilter.type = 'lowpass';
    rFilter.frequency.value = 750;
    const rGain = ctx.createGain();
    rGain.gain.value = tracks.rain ? (rainVolume / 100) * 0.7 : 0;
    rainGainRef.current = rGain;
    rSrc.connect(rFilter);
    rFilter.connect(rGain);
    rGain.connect(masterGain);
    rSrc.start();

    startCanvasVisualizer();
  };

  const playRhodesChord = (notes: number[], time: number, duration: number = 1.6) => {
    const ctx = audioCtxRef.current;
    if (!ctx || !toneFilterRef.current || !tracksRef.current.keys) return;

    notes.forEach((midi, index) => {
      const freq = midiToFreq(midi);
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      const wobbleDepth = tapeWobbleRef.current / 100;
      if (wobbleDepth > 0) {
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.frequency.value = 1.3 + Math.random() * 0.5;
        lfoGain.gain.value = freq * 0.012 * wobbleDepth;
        lfo.connect(osc1.frequency);
        lfo.connect(osc2.frequency);
        lfo.start(time);
        lfo.stop(time + duration);
      }

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(freq, time);

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(freq * 1.002, time);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200 + index * 80, time);
      filter.frequency.exponentialRampToValueAtTime(450, time + duration);

      const strum = index * 0.022;
      const noteStart = time + strum;
      gain.gain.setValueAtTime(0.0001, noteStart);
      gain.gain.linearRampToValueAtTime(0.09, noteStart + 0.035);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + duration);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(toneFilterRef.current!);

      osc1.start(noteStart);
      osc2.start(noteStart);
      osc1.stop(noteStart + duration);
      osc2.stop(noteStart + duration);
    });
  };

  const playMelodyNote = (midi: number, time: number, duration: number = 0.35) => {
    const ctx = audioCtxRef.current;
    if (!ctx || !toneFilterRef.current || !tracksRef.current.melody) return;

    const freq = midiToFreq(midi);
    const osc = ctx.createOscillator();
    const oscSub = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);

    oscSub.type = 'triangle';
    oscSub.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2600, time);
    filter.frequency.exponentialRampToValueAtTime(950, time + duration);

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(0.18, time + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc.connect(filter);
    oscSub.connect(filter);
    filter.connect(gain);
    gain.connect(toneFilterRef.current);

    osc.start(time);
    oscSub.start(time);
    osc.stop(time + duration);
    oscSub.stop(time + duration);
  };

  const playBass = (midi: number, time: number, duration: number = 0.7) => {
    const ctx = audioCtxRef.current;
    if (!ctx || !toneFilterRef.current || !tracksRef.current.bass) return;

    const freq = midiToFreq(midi);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(0.24, time + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc.connect(gain);
    gain.connect(toneFilterRef.current);

    osc.start(time);
    osc.stop(time + duration);
  };

  const playKick = (time: number) => {
    const ctx = audioCtxRef.current;
    if (!ctx || !toneFilterRef.current || !tracksRef.current.drums) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(115, time);
    osc.frequency.exponentialRampToValueAtTime(42, time + 0.12);
    gain.gain.setValueAtTime(0.38, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.28);
    osc.connect(gain);
    gain.connect(toneFilterRef.current);
    osc.start(time);
    osc.stop(time + 0.28);
  };

  const playSnare = (time: number) => {
    const ctx = audioCtxRef.current;
    if (!ctx || !toneFilterRef.current || !tracksRef.current.drums) return;

    const bufferSize = ctx.sampleRate * 0.14;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.032));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1350;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.18, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.13);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(toneFilterRef.current);
    noise.start(time);
  };

  const playHiHat = (time: number, accent: boolean = false) => {
    const ctx = audioCtxRef.current;
    if (!ctx || !toneFilterRef.current || !tracksRef.current.drums) return;

    const bufferSize = ctx.sampleRate * 0.05;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.015));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 6200;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(accent ? 0.11 : 0.05, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.045);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(toneFilterRef.current);
    noise.start(time);
  };

  const stepTick = () => {
    if (!isPlayingRef.current || !audioCtxRef.current) return;

    const song = SONGS[selectedSongKeyRef.current];
    const currentBpm = bpmRef.current;
    const stepTime = (60 / currentBpm) / 4;
    const now = audioCtxRef.current.currentTime;
    const isSwing = (stepRef.current % 2 !== 0);
    const triggerTime = now + (isSwing ? 0.036 : 0);

    const barStep = stepRef.current % 16;

    if (barStep === 0 || barStep === 6 || barStep === 10) playKick(triggerTime);
    if (barStep === 4 || barStep === 12) playSnare(triggerTime);
    if (barStep % 2 === 0 || barStep === 11) playHiHat(triggerTime, barStep === 4 || barStep === 12);

    song.chords.forEach(ch => {
      if (stepRef.current === ch.step) {
        playRhodesChord(ch.notes, triggerTime, stepTime * 8);
        playBass(ch.root, triggerTime, stepTime * 6);
        setCurrentChordName(ch.name);
      }
    });

    let foundMelody = false;
    song.melody.forEach(m => {
      if (stepRef.current === m.step) {
        playMelodyNote(m.note, triggerTime, m.dur);
        setCurrentNoteName(m.name);
        foundMelody = true;
      }
    });
    if (!foundMelody && barStep === 0) {
      setCurrentNoteName('-');
    }

    stepRef.current = (stepRef.current + 1) % song.totalSteps;
    timerIdRef.current = setTimeout(stepTick, stepTime * 1000);
  };

  const startCanvasVisualizer = () => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      if (!isPlayingRef.current) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }

      analyser.getByteFrequencyData(dataArray);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const count = Math.floor(bufferLength * 0.7);
      const barWidth = (canvas.width / count) * 1.4;
      let x = 0;

      for (let i = 0; i < count; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height * 0.85;
        const alpha = 0.4 + (dataArray[i] / 255) * 0.6;
        ctx.fillStyle = 'rgba(245, 158, 11, ' + alpha + ')';
        ctx.beginPath();
        ctx.rect(x, canvas.height - barHeight, barWidth - 1.5, barHeight);
        ctx.fill();
        x += barWidth;
      }
    };
    draw();
  };

  const togglePlay = () => {
    initAudio();
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }

    if (!isPlaying) {
      setIsPlaying(true);
      isPlayingRef.current = true;
      stepTick();
    } else {
      setIsPlaying(false);
      isPlayingRef.current = false;
      if (timerIdRef.current) clearTimeout(timerIdRef.current);
    }
  };

  const selectSong = (key: string) => {
    setSelectedSongKey(key);
    localStorage.setItem(LOFI_FAV_SONG_KEY, key);
    stepRef.current = 0;
    const s = SONGS[key];
    setBpm(s.bpm);
    setCurrentChordName(s.chords[0].name);
    setCurrentNoteName('-');
  };

  const handleWobble = (val: number) => {
    setTapeWobble(val);
  };

  const handleFilter = (val: number) => {
    setFilterCutoff(val);
    if (toneFilterRef.current) {
      toneFilterRef.current.frequency.value = val;
    }
  };

  const handleMasterVol = (val: number) => {
    setMasterVolume(val);
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = val / 100;
    }
  };

  const handleVinylVol = (val: number) => {
    setVinylVolume(val);
    if (vinylGainRef.current && tracks.vinyl) {
      vinylGainRef.current.gain.value = (val / 100) * 0.7;
    }
  };

  const handleRainVol = (val: number) => {
    setRainVolume(val);
    if (rainGainRef.current && tracks.rain) {
      rainGainRef.current.gain.value = (val / 100) * 0.7;
    }
  };

  const toggleTrack = (key: keyof typeof tracks) => {
    setTracks(prev => {
      const next = { ...prev, [key]: !prev[key] };
      if (key === 'vinyl' && vinylGainRef.current) {
        vinylGainRef.current.gain.value = next.vinyl ? (vinylVolume / 100) * 0.7 : 0;
      }
      if (key === 'rain' && rainGainRef.current) {
        rainGainRef.current.gain.value = next.rain ? (rainVolume / 100) * 0.7 : 0;
      }
      return next;
    });
  };

  useEffect(() => {
    return () => {
      if (timerIdRef.current) clearTimeout(timerIdRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  const song = SONGS[selectedSongKey];
  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}分${secs.toString().padStart(2, '0')}秒`;
  };

  return (
    <div
      className={`w-full transition-all duration-300 flex flex-col items-center ${
        isFullscreen
          ? 'h-full max-w-5xl justify-between p-4 sm:p-6'
          : 'max-w-2xl p-4'
      }`}
    >
      <div className="w-full flex items-center justify-between mb-4 gap-2">
        <button
          onClick={onBackToHub}
          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1.5 text-xs font-semibold cursor-pointer shadow-sm active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Games Hubへ戻る</span>
        </button>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20 font-mono">
            <Clock className="w-3.5 h-3.5" />
            <span>リスニング: {formatTime(totalListeningSeconds)}</span>
          </div>
        </div>
      </div>

      <div
        className={`w-full rounded-3xl border transition-all duration-300 shadow-2xl flex flex-col justify-between overflow-hidden ${
          isDark
            ? 'bg-slate-900/90 border-slate-800 text-slate-100 backdrop-blur-md'
            : 'bg-white/95 border-slate-200 text-slate-800 shadow-xl'
        } ${isFullscreen ? 'p-6 flex-1' : 'p-5'}`}
      >
        <div className="relative w-full rounded-2xl bg-slate-950 border border-slate-800 p-4 shadow-inner overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Disc3 className={`w-5 h-5 text-amber-500 ${isPlaying ? 'animate-spin' : ''}`} />
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white tracking-wide leading-tight truncate">
                  {song.title}
                </h3>
                <p className="text-xs text-slate-400 truncate">{song.artist}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                {currentChordName}
              </span>
              <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">
                ♪ {currentNoteName}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-around py-3">
            <div className="relative flex items-center justify-center">
              <div
                className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full border-4 border-dashed border-amber-500/80 flex items-center justify-center transition-all ${
                  isPlaying ? 'animate-[spin_3s_linear_infinite]' : 'opacity-60'
                }`}
              >
                <div className="w-5 h-5 rounded-full bg-slate-700"></div>
              </div>
            </div>

            <div className="flex-1 mx-4 h-14 sm:h-16 bg-slate-900 border border-slate-800 rounded-xl flex flex-col items-center justify-center p-1 overflow-hidden shadow-inner">
              <canvas
                ref={canvasRef}
                width={isFullscreen ? 500 : 280}
                height={56}
                className="w-full h-full rounded"
              />
            </div>

            <div className="relative flex items-center justify-center">
              <div
                className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full border-4 border-dashed border-amber-500/80 flex items-center justify-center transition-all ${
                  isPlaying ? 'animate-[spin_3s_linear_infinite]' : 'opacity-60'
                }`}
              >
                <div className="w-5 h-5 rounded-full bg-slate-700"></div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono mt-1 pt-2 border-t border-slate-800/80">
            <span>BPM: {bpm}</span>
            <span className="hidden sm:inline text-amber-500/90">SPACE: 再生/停止 • M: メロディ切替</span>
            <span>Tape Wobble: {tapeWobble}%</span>
          </div>
        </div>

        <div className="flex items-center gap-3 my-4">
          <button
            onClick={togglePlay}
            className={`flex-1 py-3 px-6 rounded-2xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg transition active:scale-[0.98] cursor-pointer ${
              isPlaying
                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                : 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-black'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-5 h-5 fill-current" />
                <span>一時停止 (Pause)</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" />
                <span>再生する (Play Lo-fi)</span>
              </>
            )}
          </button>

          <button
            onClick={() => toggleTrack('melody')}
            title="主旋律メロディのON/OFF"
            className={`py-3 px-4 rounded-2xl border text-xs sm:text-sm font-bold flex items-center gap-1.5 transition cursor-pointer active:scale-95 ${
              tracks.melody
                ? 'border-amber-500/50 bg-amber-500/15 text-amber-400'
                : 'border-slate-700 bg-slate-800 text-slate-500'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>メロディ: {tracks.melody ? 'ON' : 'OFF'}</span>
          </button>
        </div>

        <div className="flex border-b border-slate-800 mb-4 text-xs sm:text-sm font-bold">
          <button
            onClick={() => setActiveTab('tracks')}
            className={`pb-2.5 px-4 border-b-2 transition cursor-pointer ${
              activeTab === 'tracks'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            🎛️ トラックミキサー
          </button>
          <button
            onClick={() => setActiveTab('songs')}
            className={`pb-2.5 px-4 border-b-2 transition cursor-pointer ${
              activeTab === 'songs'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            🎵 カバー曲セレクター
          </button>
          <button
            onClick={() => setActiveTab('fx')}
            className={`pb-2.5 px-4 border-b-2 transition cursor-pointer ${
              activeTab === 'fx'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            📼 Lo-Fi エフェクト
          </button>
        </div>

        {activeTab === 'tracks' && (
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 mb-2">
            <button
              onClick={() => toggleTrack('melody')}
              className={`p-3 rounded-2xl border text-xs font-semibold flex flex-col items-center gap-1 transition cursor-pointer ${
                tracks.melody
                  ? 'border-amber-500/50 bg-amber-500/10 text-amber-400'
                  : 'border-slate-800 bg-slate-900/40 text-slate-500 opacity-50'
              }`}
            >
              <span className="text-lg">✨</span>
              <span>主旋律</span>
              <span className="text-[10px] font-bold">{tracks.melody ? 'ON' : 'MUTE'}</span>
            </button>

            <button
              onClick={() => toggleTrack('keys')}
              className={`p-3 rounded-2xl border text-xs font-semibold flex flex-col items-center gap-1 transition cursor-pointer ${
                tracks.keys
                  ? 'border-amber-500/50 bg-amber-500/10 text-amber-400'
                  : 'border-slate-800 bg-slate-900/40 text-slate-500 opacity-50'
              }`}
            >
              <span className="text-lg">🎹</span>
              <span>エレピ</span>
              <span className="text-[10px] font-bold">{tracks.keys ? 'ON' : 'MUTE'}</span>
            </button>

            <button
              onClick={() => toggleTrack('bass')}
              className={`p-3 rounded-2xl border text-xs font-semibold flex flex-col items-center gap-1 transition cursor-pointer ${
                tracks.bass
                  ? 'border-amber-500/50 bg-amber-500/10 text-amber-400'
                  : 'border-slate-800 bg-slate-900/40 text-slate-500 opacity-50'
              }`}
            >
              <span className="text-lg">🎸</span>
              <span>ベース</span>
              <span className="text-[10px] font-bold">{tracks.bass ? 'ON' : 'MUTE'}</span>
            </button>

            <button
              onClick={() => toggleTrack('drums')}
              className={`p-3 rounded-2xl border text-xs font-semibold flex flex-col items-center gap-1 transition cursor-pointer ${
                tracks.drums
                  ? 'border-amber-500/50 bg-amber-500/10 text-amber-400'
                  : 'border-slate-800 bg-slate-900/40 text-slate-500 opacity-50'
              }`}
            >
              <span className="text-lg">🥁</span>
              <span>ドラム</span>
              <span className="text-[10px] font-bold">{tracks.drums ? 'ON' : 'MUTE'}</span>
            </button>

            <button
              onClick={() => toggleTrack('vinyl')}
              className={`p-3 rounded-2xl border text-xs font-semibold flex flex-col items-center gap-1 transition cursor-pointer ${
                tracks.vinyl
                  ? 'border-amber-500/50 bg-amber-500/10 text-amber-400'
                  : 'border-slate-800 bg-slate-900/40 text-slate-500 opacity-50'
              }`}
            >
              <span className="text-lg">📻</span>
              <span>レコード</span>
              <span className="text-[10px] font-bold">{tracks.vinyl ? 'ON' : 'MUTE'}</span>
            </button>

            <button
              onClick={() => toggleTrack('rain')}
              className={`p-3 rounded-2xl border text-xs font-semibold flex flex-col items-center gap-1 transition cursor-pointer ${
                tracks.rain
                  ? 'border-amber-500/50 bg-amber-500/10 text-amber-400'
                  : 'border-slate-800 bg-slate-900/40 text-slate-500 opacity-50'
              }`}
            >
              <span className="text-lg">🌧️</span>
              <span>雨の音</span>
              <span className="text-[10px] font-bold">{tracks.rain ? 'ON' : 'MUTE'}</span>
            </button>
          </div>
        )}

        {activeTab === 'songs' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-2">
            {Object.values(SONGS).map((s) => {
              const isSelected = selectedSongKey === s.id;
              return (
                <div
                  key={s.id}
                  onClick={() => selectSong(s.id)}
                  className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-2 ${
                    isSelected
                      ? 'border-amber-500 bg-amber-500/15 text-white'
                      : 'border-slate-800 bg-slate-800/40 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="truncate">
                    <p className="text-xs font-bold truncate">{s.title}</p>
                    <p className="text-[11px] text-slate-400 truncate">{s.artist}</p>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-1 rounded-md font-mono font-bold whitespace-nowrap ${
                      isSelected ? 'bg-amber-500 text-slate-950' : 'bg-slate-700 text-slate-400'
                    }`}
                  >
                    BPM {s.bpm}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'fx' && (
          <div className="space-y-3 mb-2 text-xs">
            <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-700/80 space-y-1.5">
              <div className="flex justify-between items-center text-slate-300">
                <span>📼 テープピッチ揺らぎ (Wow/Flutter)</span>
                <span className="font-mono text-amber-400">{tapeWobble}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={tapeWobble}
                onChange={(e) => handleWobble(parseInt(e.target.value, 10))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-700/80 space-y-1.5">
              <div className="flex justify-between items-center text-slate-300">
                <span>📻 レトロローパスフィルター (Tone Cutoff)</span>
                <span className="font-mono text-amber-400">{filterCutoff} Hz</span>
              </div>
              <input
                type="range"
                min={600}
                max={8000}
                value={filterCutoff}
                onChange={(e) => handleFilter(parseInt(e.target.value, 10))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="bg-slate-800/50 p-2.5 rounded-2xl border border-slate-700/80 space-y-1">
                <div className="flex justify-between text-[11px] text-slate-300">
                  <span>🔊 マスター</span>
                  <span className="text-amber-400 font-mono">{masterVolume}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={masterVolume}
                  onChange={(e) => handleMasterVol(parseInt(e.target.value, 10))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div className="bg-slate-800/50 p-2.5 rounded-2xl border border-slate-700/80 space-y-1">
                <div className="flex justify-between text-[11px] text-slate-300">
                  <span>📻 レコード音</span>
                  <span className="text-amber-400 font-mono">{vinylVolume}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={vinylVolume}
                  onChange={(e) => handleVinylVol(parseInt(e.target.value, 10))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div className="bg-slate-800/50 p-2.5 rounded-2xl border border-slate-700/80 space-y-1">
                <div className="flex justify-between text-[11px] text-slate-300">
                  <span>🌧️ 雨音量</span>
                  <span className="text-amber-400 font-mono">{rainVolume}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={rainVolume}
                  onChange={(e) => handleRainVol(parseInt(e.target.value, 10))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
