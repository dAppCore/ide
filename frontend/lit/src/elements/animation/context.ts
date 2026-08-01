// Lit Context definitions for the animation engine.
// Stage provides TimelineContext (the playhead). Sprite consumes it +
// provides SpriteContext (localTime / progress for child renders).

import { createContext } from '@lit/context';

export interface TimelineState {
  time: number;       // current playhead in seconds
  duration: number;   // total stage duration
  playing: boolean;
  // Imperative seeks — only Stage mutates these; sprites read-only.
  setTime?: (t: number) => void;
  setPlaying?: (p: boolean) => void;
}

export interface SpriteState {
  localTime: number;  // seconds since sprite's start
  progress: number;   // 0..1 across the sprite's window (clamped)
  duration: number;   // sprite's window duration (end - start)
  visible: boolean;
}

export const timelineContext = createContext<TimelineState>('lethean-timeline');
export const spriteContext = createContext<SpriteState>('lethean-sprite');
