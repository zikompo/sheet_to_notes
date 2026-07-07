import type { NoteEvent, ParsedSong } from '../types';

const BPM = 100;
const Q = 60 / BPM; // seconds per quarter note

// [midi, startBeat, durBeats, finger?]
type Row = [number, number, number, number?];

// Ode to Joy — right-hand melody (first two phrases).
const RIGHT: Row[] = [
  [64, 0, 1, 3], [64, 1, 1, 3], [65, 2, 1, 4], [67, 3, 1, 5],
  [67, 4, 1, 5], [65, 5, 1, 4], [64, 6, 1, 3], [62, 7, 1, 2],
  [60, 8, 1, 1], [60, 9, 1, 1], [62, 10, 1, 2], [64, 11, 1, 3],
  [64, 12, 1.5, 3], [62, 13.5, 0.5, 2], [62, 14, 2, 2],
  [64, 16, 1, 3], [64, 17, 1, 3], [65, 18, 1, 4], [67, 19, 1, 5],
  [67, 20, 1, 5], [65, 21, 1, 4], [64, 22, 1, 3], [62, 23, 1, 2],
  [60, 24, 1, 1], [60, 25, 1, 1], [62, 26, 1, 2], [64, 27, 1, 3],
  [62, 28, 1.5, 2], [60, 29.5, 0.5, 1], [60, 30, 2, 1],
];

// Simple left-hand accompaniment: alternating root/fifth.
const LEFT: Row[] = [
  [48, 0, 2, 5], [43, 2, 2, 1], [48, 4, 2, 5], [43, 6, 2, 1],
  [45, 8, 2, 4], [43, 10, 2, 1], [48, 12, 2, 5], [43, 14, 2, 1],
  [48, 16, 2, 5], [43, 18, 2, 1], [48, 20, 2, 5], [43, 22, 2, 1],
  [45, 24, 2, 4], [43, 26, 2, 1], [43, 28, 2, 1], [48, 30, 2, 5],
];

function toNotes(rows: Row[], hand: 'left' | 'right'): NoteEvent[] {
  return rows.map(([midi, startBeat, durBeats, finger]) => ({
    midi,
    start: startBeat * Q,
    duration: durBeats * Q * 0.95,
    hand,
    ...(finger !== undefined ? { finger } : {}),
    measure: Math.floor(startBeat / 4),
  }));
}

export function demoSong(): ParsedSong {
  const notes = [...toNotes(RIGHT, 'right'), ...toNotes(LEFT, 'left')].sort(
    (a, b) => a.start - b.start || a.midi - b.midi,
  );
  const beats = 32;
  return {
    title: 'Ode to Joy (demo)',
    notes,
    duration: beats * Q,
    tempoMap: [{ time: 0, bpm: BPM }],
    measures: Array.from({ length: beats / 4 }, (_, i) => ({
      index: i,
      startTime: i * 4 * Q,
    })),
  };
}
