import { describe, it, expect } from 'vitest';
import { songTimeAt, scheduleTime, realDuration } from './timing';

describe('songTimeAt', () => {
  it('advances 1:1 with the clock at normal rate', () => {
    expect(songTimeAt(0, 5, 0, 1)).toBe(5);
    expect(songTimeAt(10, 12, 10, 1)).toBe(12); // anchored mid-song
  });

  it('advances at half song-speed when rate is 0.5', () => {
    // 4 real seconds after the anchor → 2 song-seconds.
    expect(songTimeAt(0, 4, 0, 0.5)).toBe(2);
  });

  it('advances faster than realtime when rate > 1', () => {
    expect(songTimeAt(0, 4, 0, 1.5)).toBe(6);
  });
});

describe('scheduleTime', () => {
  it('is the inverse of songTimeAt at any rate', () => {
    for (const rate of [0.25, 0.5, 1, 1.25, 2]) {
      const posAtAnchor = 3;
      const ctxAtAnchor = 100;
      const noteStart = 7.5;
      const when = scheduleTime(ctxAtAnchor, noteStart, posAtAnchor, rate);
      // At real time `when`, the song position must equal the note's onset.
      expect(songTimeAt(posAtAnchor, when, ctxAtAnchor, rate)).toBeCloseTo(noteStart, 10);
    }
  });

  it('spaces notes twice as far apart in real time at half speed', () => {
    const a = scheduleTime(0, 1, 0, 0.5);
    const b = scheduleTime(0, 2, 0, 0.5);
    expect(b - a).toBe(2); // 1 song-second → 2 real seconds
  });
});

describe('realDuration', () => {
  it('stretches hold time as speed slows', () => {
    expect(realDuration(1, 1)).toBe(1);
    expect(realDuration(1, 0.5)).toBe(2);
    expect(realDuration(1, 2)).toBe(0.5);
  });
});
