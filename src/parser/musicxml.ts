import type { Hand, MeasureMark, NoteEvent, ParsedSong, TempoEvent } from '../types';

/**
 * Deterministic MusicXML (score-partwise) parser.
 *
 * Strategy: walk the piano part measure by measure, tracking a cursor in
 * quarter-note units (`<divisions>` gives divisions per quarter; `<backup>` /
 * `<forward>` move the cursor between voices/staves). Notes are collected in
 * quarter time, ties are merged, then everything is converted to seconds
 * using the tempo map.
 */

interface RawNote {
  midi: number;
  startQ: number;
  durQ: number;
  staff: number;
  finger?: number;
  measure: number;
  tieStart: boolean;
  tieStop: boolean;
}

const STEP_SEMITONES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const EPS = 1e-6;

function childrenOf(el: Element, tag: string): Element[] {
  return Array.from(el.children).filter((c) => c.localName === tag);
}

function childOf(el: Element, tag: string): Element | null {
  for (const c of Array.from(el.children)) if (c.localName === tag) return c;
  return null;
}

function textOf(el: Element, tag: string): string | null {
  const c = childOf(el, tag);
  return c ? (c.textContent ?? '').trim() : null;
}

function numOf(el: Element, tag: string): number | null {
  const t = textOf(el, tag);
  if (t === null || t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function pitchToMidi(pitch: Element): number {
  const step = textOf(pitch, 'step') ?? 'C';
  const octave = numOf(pitch, 'octave') ?? 4;
  const alter = numOf(pitch, 'alter') ?? 0;
  return (octave + 1) * 12 + (STEP_SEMITONES[step] ?? 0) + alter;
}

function findFingering(note: Element): number | undefined {
  const notations = childOf(note, 'notations');
  if (!notations) return undefined;
  const technical = childOf(notations, 'technical');
  if (!technical) return undefined;
  const fingering = childOf(technical, 'fingering');
  if (!fingering) return undefined;
  const n = parseInt((fingering.textContent ?? '').trim(), 10);
  return Number.isFinite(n) && n >= 1 && n <= 5 ? n : undefined;
}

/** Pick the piano part: first part with >= 2 staves, else the first part. */
function pickPart(parts: Element[]): Element {
  for (const part of parts) {
    for (const measure of childrenOf(part, 'measure')) {
      const attrs = childOf(measure, 'attributes');
      if (attrs && (numOf(attrs, 'staves') ?? 1) >= 2) return part;
    }
  }
  return parts[0];
}

/** Piecewise-linear quarter-note → seconds conversion from the tempo map. */
function buildQuarterToSeconds(tempoQ: { q: number; bpm: number }[]) {
  const sorted = [...tempoQ].sort((a, b) => a.q - b.q);
  if (sorted.length === 0 || sorted[0].q > EPS) {
    sorted.unshift({ q: 0, bpm: 120 });
  }
  // De-duplicate marks at the same position (last one wins).
  const marks: { q: number; bpm: number; sec: number }[] = [];
  for (const m of sorted) {
    const prev = marks[marks.length - 1];
    if (prev && Math.abs(prev.q - m.q) < EPS) {
      prev.bpm = m.bpm;
      continue;
    }
    const sec = prev ? prev.sec + ((m.q - prev.q) * 60) / prev.bpm : 0;
    marks.push({ q: m.q, bpm: m.bpm, sec });
  }
  return (q: number): number => {
    let seg = marks[0];
    for (const m of marks) {
      if (m.q <= q + EPS) seg = m;
      else break;
    }
    return seg.sec + (Math.max(0, q - seg.q) * 60) / seg.bpm;
  };
}

/** Merge tied notes (same pitch + staff, contiguous in time) into one event. */
function mergeTies(raw: RawNote[]): RawNote[] {
  const sorted = [...raw].sort((a, b) => a.startQ - b.startQ || a.midi - b.midi);
  const open = new Map<string, RawNote>();
  const out: RawNote[] = [];
  for (const n of sorted) {
    const key = `${n.staff}:${n.midi}`;
    if (n.tieStop) {
      const prev = open.get(key);
      if (prev && Math.abs(prev.startQ + prev.durQ - n.startQ) < 1e-3) {
        prev.durQ += n.durQ;
        if (!n.tieStart) open.delete(key);
        continue;
      }
    }
    out.push(n);
    if (n.tieStart) open.set(key, n);
  }
  return out;
}

export function parseMusicXML(xml: string, fallbackTitle = 'Untitled'): ParsedSong {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const parseError = doc.getElementsByTagName('parsererror')[0];
  if (parseError) throw new Error(`Invalid MusicXML: ${parseError.textContent}`);

  const root = doc.documentElement;
  if (root.localName === 'score-timewise') {
    throw new Error('score-timewise MusicXML is not supported — re-export as score-partwise (MuseScore default).');
  }
  if (root.localName !== 'score-partwise') {
    throw new Error(`Not a MusicXML score (root element <${root.localName}>).`);
  }

  const work = childOf(root, 'work');
  const title =
    (work && textOf(work, 'work-title')) || textOf(root, 'movement-title') || fallbackTitle;

  const parts = childrenOf(root, 'part');
  if (parts.length === 0) throw new Error('MusicXML file contains no parts.');
  const part = pickPart(parts);

  let divisions = 1; // divisions per quarter note
  let posQ = 0; // cursor, in quarter notes from the start of the piece
  let lastNoteStartQ = 0; // onset shared by subsequent <chord/> notes
  const tempoQ: { q: number; bpm: number }[] = [];
  const measureStartsQ: number[] = [];
  const raw: RawNote[] = [];

  for (const [measureIdx, measure] of childrenOf(part, 'measure').entries()) {
    const measureStartQ = posQ;
    measureStartsQ.push(measureStartQ);
    let maxPosQ = posQ;

    for (const el of Array.from(measure.children)) {
      switch (el.localName) {
        case 'attributes': {
          const d = numOf(el, 'divisions');
          if (d && d > 0) divisions = d;
          break;
        }
        case 'direction': {
          const sound = childOf(el, 'sound');
          const tempo = sound?.getAttribute('tempo');
          if (tempo) tempoQ.push({ q: posQ, bpm: Number(tempo) });
          break;
        }
        case 'sound': {
          const tempo = el.getAttribute('tempo');
          if (tempo) tempoQ.push({ q: posQ, bpm: Number(tempo) });
          break;
        }
        case 'backup': {
          posQ -= (numOf(el, 'duration') ?? 0) / divisions;
          break;
        }
        case 'forward': {
          posQ += (numOf(el, 'duration') ?? 0) / divisions;
          break;
        }
        case 'note': {
          if (childOf(el, 'grace')) break; // grace notes carry no duration; skip
          const durQ = (numOf(el, 'duration') ?? 0) / divisions;
          const isChord = childOf(el, 'chord') !== null;
          const pitch = childOf(el, 'pitch');

          if (pitch) {
            const startQ = isChord ? lastNoteStartQ : posQ;
            const ties = childrenOf(el, 'tie');
            raw.push({
              midi: pitchToMidi(pitch),
              startQ,
              durQ,
              staff: numOf(el, 'staff') ?? 1,
              finger: findFingering(el),
              measure: measureIdx,
              tieStart: ties.some((t) => t.getAttribute('type') === 'start'),
              tieStop: ties.some((t) => t.getAttribute('type') === 'stop'),
            });
          }
          // Rests and pitched notes advance the cursor; chord notes do not.
          if (!isChord) {
            lastNoteStartQ = posQ;
            posQ += durQ;
          }
          break;
        }
      }
      if (posQ > maxPosQ) maxPosQ = posQ;
    }
    // A trailing <backup> can leave the cursor mid-measure; the next measure
    // starts where this one actually ended.
    posQ = maxPosQ;
  }

  const qToSec = buildQuarterToSeconds(tempoQ);
  const merged = mergeTies(raw);

  const notes: NoteEvent[] = merged.map((n) => {
    const start = qToSec(n.startQ);
    const hand: Hand = n.staff >= 2 ? 'left' : 'right';
    return {
      midi: n.midi,
      start,
      duration: qToSec(n.startQ + n.durQ) - start,
      hand,
      ...(n.finger !== undefined ? { finger: n.finger } : {}),
      measure: n.measure,
    };
  });
  notes.sort((a, b) => a.start - b.start || a.midi - b.midi);

  const duration = Math.max(qToSec(posQ), ...notes.map((n) => n.start + n.duration), 0);
  const measures: MeasureMark[] = measureStartsQ.map((q, index) => ({
    index,
    startTime: qToSec(q),
  }));
  const tempoMap: TempoEvent[] = (tempoQ.length ? tempoQ : [{ q: 0, bpm: 120 }]).map((t) => ({
    time: qToSec(t.q),
    bpm: t.bpm,
  }));

  return { title, notes, duration, tempoMap, measures };
}
