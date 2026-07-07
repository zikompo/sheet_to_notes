import { SplendidGrandPiano } from 'smplr';
import type { ParsedSong } from '../types';

export interface PlayerSnapshot {
  playing: boolean;
  /** True while the piano samples are downloading (first play). */
  loadingPiano: boolean;
  songTitle: string | null;
  duration: number;
}

const LOOKAHEAD_S = 0.3; // schedule notes this far ahead of the clock
const TICK_MS = 100;

/**
 * Playback engine, deliberately outside React. Time is derived from
 * AudioContext.currentTime (never Date.now()) so audio and visuals share one
 * clock. UI reads `player.time` inside its own rAF loop; React state only
 * changes on play/pause/load via useSyncExternalStore.
 */
class PlayerEngine {
  private ctx: AudioContext | null = null;
  private piano: SplendidGrandPiano | null = null;
  private pianoReady = false;

  private song: ParsedSong | null = null;
  private playing = false;
  private loadingPiano = false;

  /** Song position (s) when playback last started, or current position while paused. */
  private posAtAnchor = 0;
  /** AudioContext time corresponding to posAtAnchor. */
  private ctxAtAnchor = 0;
  private nextIdx = 0;
  private timer: ReturnType<typeof setInterval> | null = null;

  private subs = new Set<() => void>();
  private snapshot: PlayerSnapshot = {
    playing: false,
    loadingPiano: false,
    songTitle: null,
    duration: 0,
  };

  subscribe = (fn: () => void): (() => void) => {
    this.subs.add(fn);
    return () => this.subs.delete(fn);
  };

  getSnapshot = (): PlayerSnapshot => this.snapshot;

  private emit() {
    this.snapshot = {
      playing: this.playing,
      loadingPiano: this.loadingPiano,
      songTitle: this.song?.title ?? null,
      duration: this.song?.duration ?? 0,
    };
    for (const fn of this.subs) fn();
  }

  get currentSong(): ParsedSong | null {
    return this.song;
  }

  /** Current song position in seconds. Safe to call every frame. */
  get time(): number {
    if (!this.playing || !this.ctx) return this.posAtAnchor;
    const t = this.posAtAnchor + (this.ctx.currentTime - this.ctxAtAnchor);
    return Math.min(Math.max(t, 0), this.song?.duration ?? 0);
  }

  load(song: ParsedSong) {
    this.pause();
    this.song = song;
    this.posAtAnchor = 0;
    this.nextIdx = 0;
    this.emit();
  }

  async play() {
    if (!this.song || this.playing || this.loadingPiano) return;

    // Created lazily inside a user gesture — required by iOS Safari.
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.piano = new SplendidGrandPiano(this.ctx);
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    if (!this.pianoReady) {
      this.loadingPiano = true;
      this.emit();
      await this.piano!.load;
      this.pianoReady = true;
      this.loadingPiano = false;
    }

    if (this.posAtAnchor >= this.song.duration - 1e-3) this.posAtAnchor = 0; // replay
    this.ctxAtAnchor = this.ctx.currentTime;
    this.nextIdx = this.firstNoteAt(this.posAtAnchor);
    this.playing = true;
    this.emit();
    this.timer = setInterval(() => this.tick(), TICK_MS);
    this.tick();
  }

  pause() {
    if (!this.playing) return;
    this.posAtAnchor = this.time;
    this.playing = false;
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
    this.piano?.stop();
    this.emit();
  }

  seek(t: number) {
    if (!this.song) return;
    const clamped = Math.min(Math.max(t, 0), this.song.duration);
    if (this.playing && this.ctx) {
      this.piano?.stop();
      this.posAtAnchor = clamped;
      this.ctxAtAnchor = this.ctx.currentTime;
      this.nextIdx = this.firstNoteAt(clamped);
    } else {
      this.posAtAnchor = clamped;
    }
    this.emit();
  }

  togglePlay() {
    if (this.playing) this.pause();
    else void this.play();
  }

  /** Index of the first note with start >= t (notes are sorted by start). */
  private firstNoteAt(t: number): number {
    const notes = this.song!.notes;
    let lo = 0;
    let hi = notes.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (notes[mid].start < t) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  private tick() {
    if (!this.playing || !this.song || !this.ctx || !this.piano) return;
    const notes = this.song.notes;
    const horizon = this.time + LOOKAHEAD_S;

    while (this.nextIdx < notes.length && notes[this.nextIdx].start < horizon) {
      const n = notes[this.nextIdx++];
      const when = this.ctxAtAnchor + (n.start - this.posAtAnchor);
      if (when >= this.ctx.currentTime - 0.05) {
        this.piano.start({
          note: n.midi,
          time: when,
          duration: n.duration,
          velocity: 90,
        });
      }
    }

    // Let the final notes ring out briefly, then stop at the end.
    if (this.time >= this.song.duration) {
      this.pause();
      this.posAtAnchor = this.song.duration;
      this.emit();
    }
  }
}

export const player = new PlayerEngine();
