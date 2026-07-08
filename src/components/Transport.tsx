import { useEffect, useRef, useState } from 'react';
import { player } from '../player/engine';
import { usePlayer } from '../player/usePlayer';
import { SpeedControl } from './SpeedControl';

function fmt(t: number): string {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function Transport() {
  const { playing, loadingPiano, duration } = usePlayer();
  const [pos, setPos] = useState(0);
  const dragging = useRef(false);

  // Follow the engine clock while not scrubbing (~10 fps is plenty for a slider).
  useEffect(() => {
    const id = setInterval(() => {
      if (!dragging.current) setPos(player.time);
    }, 100);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-center gap-3 border-t border-neutral-800 bg-neutral-900 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <button
        aria-label="Rewind to start"
        onClick={() => {
          player.seek(0);
          setPos(0);
        }}
        className="flex h-11 w-11 items-center justify-center rounded-full text-neutral-300 transition hover:bg-neutral-800 active:scale-95"
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current">
          <path d="M6 6h2v12H6zM20 6v12L9.5 12z" />
        </svg>
      </button>

      <button
        aria-label={playing ? 'Pause' : 'Play'}
        disabled={loadingPiano}
        onClick={() => player.togglePlay()}
        className="flex h-13 w-13 items-center justify-center rounded-full bg-emerald-500 text-neutral-950 shadow-lg transition hover:bg-emerald-400 active:scale-95 disabled:opacity-60"
      >
        {loadingPiano ? (
          <svg viewBox="0 0 24 24" className="h-6 w-6 animate-spin">
            <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="42 18" />
          </svg>
        ) : playing ? (
          <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current">
            <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      <span className="w-24 shrink-0 text-center font-mono text-sm text-neutral-400">
        {fmt(pos)} / {fmt(duration)}
      </span>

      <input
        type="range"
        min={0}
        max={Math.max(duration, 0.001)}
        step={0.01}
        value={Math.min(pos, duration)}
        aria-label="Seek"
        onPointerDown={() => (dragging.current = true)}
        onPointerUp={() => (dragging.current = false)}
        onChange={(e) => {
          const t = Number(e.target.value);
          setPos(t);
          player.seek(t);
        }}
        className="h-11 min-w-0 flex-1 cursor-pointer accent-emerald-500"
      />

      <SpeedControl />
    </div>
  );
}
