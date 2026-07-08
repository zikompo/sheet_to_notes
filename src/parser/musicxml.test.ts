import { describe, it, expect } from 'vitest';
import { zipSync, strToU8 } from 'fflate';
import { parseMusicXML } from './musicxml';
import { extractMusicXML } from './mxl';
import twoHandsXml from './fixtures/two-hands.musicxml?raw';
import tempoChangeXml from './fixtures/tempo-change.musicxml?raw';

const fixtures: Record<string, string> = {
  'two-hands.musicxml': twoHandsXml,
  'tempo-change.musicxml': tempoChangeXml,
};
const fixture = (name: string) => fixtures[name];

describe('parseMusicXML — two-hand piano score', () => {
  const song = parseMusicXML(fixture('two-hands.musicxml'));

  it('reads the title', () => {
    expect(song.title).toBe('Two Hands Test');
  });

  it('parses the right number of notes (chords kept, ties merged)', () => {
    // RH: 4 quarters + 2-note chord + tied G4 (merged) = 7; LH: 3
    expect(song.notes).toHaveLength(10);
  });

  it('assigns hands from staves', () => {
    const right = song.notes.filter((n) => n.hand === 'right');
    const left = song.notes.filter((n) => n.hand === 'left');
    expect(right).toHaveLength(7);
    expect(left.map((n) => n.midi)).toEqual([48, 43, 48]); // C3, G2, C3
  });

  it('computes onsets in seconds at 120 bpm (quarter = 0.5s)', () => {
    const rh = song.notes.filter((n) => n.hand === 'right');
    expect(rh.map((n) => n.start)).toEqual([0, 0.5, 1.0, 1.5, 2.0, 2.0, 3.0]);
    expect(rh.map((n) => n.midi)).toEqual([60, 62, 64, 65, 60, 64, 67]);
  });

  it('gives chord notes the same onset', () => {
    const chord = song.notes.filter((n) => n.start === 2.0 && n.hand === 'right');
    expect(chord.map((n) => n.midi).sort()).toEqual([60, 64]);
    expect(chord.every((n) => n.duration === 1.0)).toBe(true);
  });

  it('merges the tied G4 across the barline (half + whole = 3s)', () => {
    const g4 = song.notes.filter((n) => n.midi === 67);
    expect(g4).toHaveLength(1);
    expect(g4[0].start).toBe(3.0);
    expect(g4[0].duration).toBe(3.0);
  });

  it('extracts fingering when present', () => {
    const fingered = song.notes.filter((n) => n.finger !== undefined);
    expect(fingered.map((n) => [n.midi, n.finger])).toEqual([
      [60, 1],
      [62, 2],
      [64, 3],
      [65, 4],
    ]);
  });

  it('computes total duration and measure start times', () => {
    expect(song.duration).toBe(6.0);
    expect(song.measures.map((m) => m.startTime)).toEqual([0, 2.0, 4.0]);
  });

  it('spells natural pitch names (no octave)', () => {
    const rh = song.notes.filter((n) => n.hand === 'right');
    expect(rh.map((n) => n.name)).toEqual(['C', 'D', 'E', 'F', 'C', 'E', 'G']);
    // left hand: C3, G2, C3
    expect(song.notes.filter((n) => n.hand === 'left').map((n) => n.name)).toEqual(['C', 'G', 'C']);
  });
});

describe('parseMusicXML — tempo changes', () => {
  const song = parseMusicXML(fixture('tempo-change.musicxml'));

  it('builds the tempo map', () => {
    expect(song.tempoMap).toEqual([
      { time: 0, bpm: 60 },
      { time: 4.0, bpm: 120 },
    ]);
  });

  it('converts note times across the tempo change', () => {
    // Measure 1 at 60 bpm: quarters at 0,1,2,3s. Measure 2 at 120 bpm: 4,4.5,5,5.5s.
    expect(song.notes.map((n) => n.start)).toEqual([0, 1, 2, 3, 4, 4.5, 5, 5.5]);
    expect(song.notes[7].midi).toBe(73); // C#5 via <alter>
    expect(song.duration).toBe(6.0);
  });

  it('spells the altered note from the score (# for alter=1)', () => {
    expect(song.notes[7].name).toBe('C#');
  });

  it('defaults to the right hand for single-staff scores', () => {
    expect(song.notes.every((n) => n.hand === 'right')).toBe(true);
  });
});

describe('extractMusicXML — .mxl archives', () => {
  it('extracts the score named by META-INF/container.xml', () => {
    const xml = fixture('tempo-change.musicxml');
    const container = `<?xml version="1.0" encoding="UTF-8"?>
<container>
  <rootfiles>
    <rootfile full-path="score.musicxml" media-type="application/vnd.recordare.musicxml+xml"/>
  </rootfiles>
</container>`;
    const mxl = zipSync({
      'META-INF/container.xml': strToU8(container),
      'score.musicxml': strToU8(xml),
    });
    const song = parseMusicXML(extractMusicXML(mxl));
    expect(song.title).toBe('Tempo Change Test');
    expect(song.notes).toHaveLength(8);
  });

  it('falls back to the first xml entry without a container', () => {
    const mxl = zipSync({ 'anything.xml': strToU8(fixture('two-hands.musicxml')) });
    expect(parseMusicXML(extractMusicXML(mxl)).title).toBe('Two Hands Test');
  });
});
