/**
 * Pure time-mapping between song-time (seconds into the piece) and the
 * AudioContext clock (real seconds), parameterised by playback `rate`.
 *
 * `rate` is song-seconds elapsed per real second: 1 = normal, 0.5 = half speed.
 * These are separated from the engine so the math is unit-testable without an
 * AudioContext. Pitch is unaffected — rate only stretches note spacing/hold.
 */

/** Song position now, given the anchor and how far the real clock has moved. */
export function songTimeAt(
  posAtAnchor: number,
  ctxNow: number,
  ctxAtAnchor: number,
  rate: number,
): number {
  return posAtAnchor + (ctxNow - ctxAtAnchor) * rate;
}

/** AudioContext time at which a note whose song-onset is `noteStart` should fire. */
export function scheduleTime(
  ctxAtAnchor: number,
  noteStart: number,
  posAtAnchor: number,
  rate: number,
): number {
  return ctxAtAnchor + (noteStart - posAtAnchor) / rate;
}

/** Real-time duration for a note that lasts `songDuration` song-seconds. */
export function realDuration(songDuration: number, rate: number): number {
  return songDuration / rate;
}
