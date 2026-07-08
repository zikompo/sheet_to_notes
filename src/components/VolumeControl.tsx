import { useState } from 'react';
import { player } from '../player/engine';
import { usePlayer } from '../player/usePlayer';

/** Speaker glyph whose waves reflect the current level (none / one / two). */
function SpeakerIcon({ volume }: { volume: number }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
      <path d="M4 9v6h4l5 4V5L8 9H4z" />
      {volume === 0 ? (
        <path d="M16 9l5 5m0-5l-5 5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      ) : (
        <>
          <path d="M15.5 8.5a4 4 0 0 1 0 7" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          {volume > 0.5 && (
            <path d="M18 6a7 7 0 0 1 0 12" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          )}
        </>
      )}
    </svg>
  );
}

export function VolumeControl() {
  const { volume } = usePlayer();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative shrink-0">
      <button
        aria-label={`Volume ${Math.round(volume * 100)}%`}
        onClick={() => setOpen((v) => !v)}
        className={`flex h-11 w-11 items-center justify-center rounded-full transition ${
          open ? 'bg-neutral-800 text-neutral-100' : 'text-neutral-300 hover:bg-neutral-800'
        }`}
      >
        <SpeakerIcon volume={volume} />
      </button>

      {open && (
        <>
          <button
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-10 cursor-default"
          />
          <div
            role="dialog"
            aria-label="Volume"
            className="absolute bottom-full right-0 z-20 mb-2 flex w-48 items-center gap-3 rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 shadow-xl"
          >
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              aria-label="Volume"
              autoFocus
              onChange={(e) => player.setVolume(Number(e.target.value))}
              className="h-6 min-w-0 flex-1 cursor-pointer accent-emerald-500"
            />
            <span className="w-9 shrink-0 text-right font-mono text-xs tabular-nums text-neutral-400">
              {Math.round(volume * 100)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
