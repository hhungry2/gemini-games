export type MicrogameId =
  | 'pluck'
  | 'dodge'
  | 'catch'
  | 'insert'
  | 'press'
  | 'match'
  | 'cut'
  | 'stop'
  | 'boss';

export type MicrogameCategory = 'timing' | 'reflex' | 'action' | 'mash';

export interface MicrogameDef {
  id: MicrogameId;
  name: string;
  nameEn: string;
  instruction: string;
  instructionEn: string;
  icon: string;
  hint: string;
  category: MicrogameCategory;
}

export interface InputState {
  keys: Record<string, boolean>;
  pointer: {
    x: number;
    y: number;
    isDown: boolean;
    justPressed: boolean;
    justReleased: boolean;
  };
}

export type MicrogameResult = 'pending' | 'success' | 'failure';

export interface MicrogameInstance {
  id: MicrogameId;
  level: number; // 1, 2, 3
  init: (level: number, width: number, height: number) => void;
  update: (progress: number, input: InputState, deltaMs: number) => MicrogameResult;
  render: (ctx: CanvasRenderingContext2D, width: number, height: number, progress: number, isDark: boolean) => void;
}

export interface WarioGameProps {
  onBackToHub: () => void;
  isDark: boolean;
  isFullscreen?: boolean;
}
