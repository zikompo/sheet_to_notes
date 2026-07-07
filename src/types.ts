export type Hand = 'left' | 'right';

export interface NoteEvent {
  /** MIDI note number, 21 (A0) – 108 (C8) */
  midi: number;
  /** Onset in seconds from the start of the piece */
  start: number;
  /** Sounding length in seconds (ties merged) */
  duration: number;
  /** staff 1 → right, staff 2+ → left */
  hand: Hand;
  /** Fingering (1–5) when the score provides it */
  finger?: number;
  /** 0-based measure index the note starts in */
  measure: number;
}

export interface TempoEvent {
  time: number;
  bpm: number;
}

export interface MeasureMark {
  index: number;
  startTime: number;
}

export interface ParsedSong {
  title: string;
  notes: NoteEvent[];
  duration: number;
  tempoMap: TempoEvent[];
  measures: MeasureMark[];
}
