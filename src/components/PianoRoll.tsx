import { useEffect, useMemo, useRef } from 'react';
import type { NoteEvent, ParsedSong } from '../types';
import { computeRange, keyLayout, noteName, pitchClass, type KeyboardLayout } from '../lib/keyLayout';
import type { LabelMode } from '../lib/useLabelMode';
import { player } from '../player/engine';

const COLORS = {
  laneBg: '#212121',
  grid: 'rgba(255,255,255,0.055)',
  hitLine: '#c62828',
  right: '#9ccc50', // green, like Synthesia's right hand
  rightActive: '#c5e88a',
  left: '#7e9fcc', // blue
  leftActive: '#adc8e8',
  whiteKey: '#f5f3ef',
  whiteKeyEdge: '#2b2b2b',
  blackKey: '#161616',
  label: '#8a8a8a',
  blockLabel: 'rgba(17,17,17,0.85)', // dark ink, reads on light note bodies
};

const VISIBLE_SECONDS = 3.5;

/** Text to draw on a block for the current label mode, or '' for none. */
function blockLabelText(n: NoteEvent, mode: LabelMode): string {
  if (mode === 'names') return n.name ?? pitchClass(n.midi);
  if (mode === 'fingers') return n.finger !== undefined ? String(n.finger) : '';
  return '';
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
}

interface Geometry {
  layout: KeyboardLayout;
  maxDuration: number;
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  song: ParsedSong,
  geo: Geometry,
  cssW: number,
  cssH: number,
  now: number,
  labelMode: LabelMode,
) {
  const { layout, maxDuration } = geo;
  const kbH = Math.min(Math.max(cssH * 0.24, 80), 170);
  const laneH = cssH - kbH;
  const keyW = cssW / layout.whiteCount;
  const pps = laneH / VISIBLE_SECONDS;

  // --- falling-note lane ---
  ctx.fillStyle = COLORS.laneBg;
  ctx.fillRect(0, 0, cssW, laneH);

  // vertical guides at each C
  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 1;
  for (const k of layout.keys) {
    if (!k.black && k.midi % 12 === 0) {
      const x = Math.round(k.x * keyW) + 0.5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, laneH);
      ctx.stroke();
    }
  }
  // horizontal guides at measure starts (scrolling with the music)
  for (const m of song.measures) {
    const y = laneH - (m.startTime - now) * pps;
    if (y < 0 || y > laneH) continue;
    ctx.beginPath();
    ctx.moveTo(0, Math.round(y) + 0.5);
    ctx.lineTo(cssW, Math.round(y) + 0.5);
    ctx.stroke();
  }

  // notes visible in [now, now + VISIBLE_SECONDS]; active midis light up keys
  const active = new Map<number, 'left' | 'right'>();
  const notes = song.notes;
  let i = lowerBound(notes, now - maxDuration);
  const pad = Math.max(1, keyW * 0.06);

  for (; i < notes.length && notes[i].start < now + VISIBLE_SECONDS; i++) {
    const n = notes[i];
    const end = n.start + n.duration;
    if (end < now) continue;
    const k = layout.byMidi.get(n.midi);
    if (!k) continue;

    const isActive = n.start <= now && now < end;
    if (isActive) active.set(n.midi, n.hand);

    const x = k.x * keyW + pad;
    const w = k.w * keyW - pad * 2;
    const yBottom = Math.min(laneH - (n.start - now) * pps, laneH);
    const yTop = Math.max(laneH - (end - now) * pps, -20);
    const h = yBottom - yTop;
    if (h <= 0) continue;

    ctx.fillStyle = isActive
      ? n.hand === 'left' ? COLORS.leftActive : COLORS.rightActive
      : n.hand === 'left' ? COLORS.left : COLORS.right;
    roundRect(ctx, x, yTop, w, h, 6);
    ctx.fill();

    const text = blockLabelText(n, labelMode);
    if (text && h >= 18) {
      // Fit the (1–2 char) label to the block width, but skip if it'd be too tiny.
      let size = Math.min(w * 0.72, 16);
      ctx.font = `600 ${size}px system-ui, sans-serif`;
      const maxTextW = w - 4;
      const measured = ctx.measureText(text).width;
      if (measured > maxTextW) {
        size *= maxTextW / measured;
        ctx.font = `600 ${size}px system-ui, sans-serif`;
      }
      if (size >= 8) {
        ctx.fillStyle = COLORS.blockLabel;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const ty = Math.max(Math.min(yBottom - size * 0.9, laneH - size), yTop + size * 0.9);
        ctx.fillText(text, x + w / 2, ty);
      }
    }

    // glow where an active note crosses the hit line
    if (isActive) {
      const cx = x + w / 2;
      const g = ctx.createRadialGradient(cx, laneH, 0, cx, laneH, keyW * 0.9);
      g.addColorStop(0, 'rgba(255,255,255,0.55)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(cx - keyW, laneH - keyW, keyW * 2, keyW);
    }
  }

  // hit line
  ctx.fillStyle = COLORS.hitLine;
  ctx.fillRect(0, laneH - 1.5, cssW, 3);

  // --- keyboard ---
  ctx.fillStyle = '#000';
  ctx.fillRect(0, laneH, cssW, kbH);

  for (const k of layout.keys) {
    if (k.black) continue;
    const x = k.x * keyW;
    const hand = active.get(k.midi);
    ctx.fillStyle = hand ? (hand === 'left' ? COLORS.left : COLORS.right) : COLORS.whiteKey;
    ctx.fillRect(x + 0.5, laneH + 1.5, keyW - 1, kbH - 2);
    if (k.midi % 12 === 0) {
      ctx.fillStyle = hand ? 'rgba(0,0,0,0.55)' : COLORS.label;
      ctx.font = `500 ${Math.min(keyW * 0.42, 13)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(noteName(k.midi), x + keyW / 2, laneH + kbH - 7);
    }
  }
  const blackH = kbH * 0.62;
  for (const k of layout.keys) {
    if (!k.black) continue;
    const x = k.x * keyW;
    const w = k.w * keyW;
    const hand = active.get(k.midi);
    ctx.fillStyle = hand ? (hand === 'left' ? COLORS.left : COLORS.right) : COLORS.blackKey;
    roundRect(ctx, x, laneH, w, blackH, 3);
    ctx.fill();
  }
}

function lowerBound(notes: NoteEvent[], t: number): number {
  let lo = 0;
  let hi = notes.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (notes[mid].start < t) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export function PianoRoll({ song, labelMode }: { song: ParsedSong; labelMode: LabelMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Read by the rAF loop each frame so toggling the mode doesn't restart it.
  const labelModeRef = useRef(labelMode);
  labelModeRef.current = labelMode;

  const geo = useMemo<Geometry>(() => {
    const { lo, hi } = computeRange(song.notes);
    return {
      layout: keyLayout(lo, hi),
      maxDuration: song.notes.reduce((m, n) => Math.max(m, n.duration), 0),
    };
  }, [song]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const container = containerRef.current!;
    const ctx = canvas.getContext('2d')!;
    let raf = 0;
    let cssW = 0;
    let cssH = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      cssW = container.clientWidth;
      cssH = container.clientHeight;
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();

    const loop = () => {
      if (cssW > 0 && cssH > 0) drawFrame(ctx, song, geo, cssW, cssH, player.time, labelModeRef.current);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [song, geo]);

  return (
    <div ref={containerRef} className="relative min-h-0 flex-1 touch-none select-none">
      <canvas ref={canvasRef} className="absolute inset-0" />
    </div>
  );
}
