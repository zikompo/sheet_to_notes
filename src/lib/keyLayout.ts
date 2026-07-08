import type { NoteEvent } from '../types';

export interface KeyRect {
  midi: number;
  /** Left edge in white-key-width units */
  x: number;
  /** Width in white-key-width units */
  w: number;
  black: boolean;
}

export interface KeyboardLayout {
  keys: KeyRect[];
  whiteCount: number;
  lo: number;
  hi: number;
  byMidi: Map<number, KeyRect>;
}

const BLACK_PCS = new Set([1, 3, 6, 8, 10]);
export const isBlackKey = (midi: number): boolean => BLACK_PCS.has(((midi % 12) + 12) % 12);

const PIANO_LO = 21; // A0
const PIANO_HI = 108; // C8
const BLACK_W = 0.62;

/**
 * Pick a visible key range for a song: pad the used range, snap to octave
 * boundaries (C…B) so the view starts/ends cleanly, minimum 3 octaves.
 */
export function computeRange(notes: NoteEvent[]): { lo: number; hi: number } {
  if (notes.length === 0) return { lo: 48, hi: 84 }; // C3–C6
  let min = Infinity;
  let max = -Infinity;
  for (const n of notes) {
    if (n.midi < min) min = n.midi;
    if (n.midi > max) max = n.midi;
  }
  let lo = Math.floor((min - 1) / 12) * 12; // C at or below min-1
  let hi = Math.ceil((max + 2) / 12) * 12 - 1; // B at or above max+1
  while (hi - lo < 36) {
    if (lo > PIANO_LO + 11) lo -= 12;
    if (hi - lo < 36 && hi < PIANO_HI - 11) hi += 12;
    if (lo <= PIANO_LO + 11 && hi >= PIANO_HI - 11) break;
  }
  return { lo: Math.max(lo, PIANO_LO), hi: Math.min(hi, PIANO_HI) };
}

/** Geometry for keys in [lo, hi], in units of one white key width. */
export function keyLayout(lo: number, hi: number): KeyboardLayout {
  const keys: KeyRect[] = [];
  let x = 0;
  for (let midi = lo; midi <= hi; midi++) {
    if (isBlackKey(midi)) {
      // Centered on the boundary between its neighboring white keys.
      keys.push({ midi, x: x - BLACK_W / 2, w: BLACK_W, black: true });
    } else {
      keys.push({ midi, x, w: 1, black: false });
      x += 1;
    }
  }
  const byMidi = new Map(keys.map((k) => [k.midi, k]));
  return { keys, whiteCount: x, lo, hi, byMidi };
}

/** "C4"-style label; only used for C keys on the keyboard. */
export function noteName(midi: number): string {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  return `${names[midi % 12]}${Math.floor(midi / 12) - 1}`;
}

const PITCH_CLASS_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

/** Pitch class (no octave) from a MIDI number, spelled with flats. Fallback
 *  label for notes parsed before score spelling was preserved. */
export function pitchClass(midi: number): string {
  return PITCH_CLASS_FLAT[((midi % 12) + 12) % 12];
}
