import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { player } from '../player/engine';
import { usePlayer } from '../player/usePlayer';

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

  const pct = duration > 0 ? Math.min(pos / duration, 1) * 100 : 0;

  return (
    <div className="flex items-center gap-3 border-t border-line bg-surface px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <button
        aria-label="Rewind to start"
        onClick={() => {
          player.seek(0);
          setPos(0);
        }}
        className="flex h-11 w-11 items-center justify-center rounded-full text-muted transition hover:bg-raised hover:text-ivory active:scale-95"
      >
        <svg viewBox="0 0 24 24" className="h-5.5 w-5.5 fill-current">
          <path d="M6 6h2v12H6zM20 6v12L9.5 12z" />
        </svg>
      </button>

      <button
        aria-label={playing ? 'Pause' : 'Play'}
        disabled={loadingPiano}
        onClick={() => player.togglePlay()}
        className="flex h-13 w-13 items-center justify-center rounded-full bg-radial-[at_35%_30%] from-brass-2 to-brass to-70% text-lacquer shadow-[0_2px_14px_rgba(201,164,92,0.35)] transition hover:brightness-110 active:scale-95 disabled:opacity-60"
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
          <svg viewBox="0 0 24 24" className="ml-0.5 h-6 w-6 fill-current">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      <span className="w-26 shrink-0 text-center font-mono text-[0.8rem] tabular-nums text-muted">
        {fmt(pos)} <span className="text-faint">/</span> {fmt(duration)}
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
        style={{ '--pct': `${pct}%` } as CSSProperties}
        className="scrub h-11 min-w-0 flex-1 cursor-pointer"
      />
    </div>
  );
}
