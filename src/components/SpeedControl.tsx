import { useState } from 'react';
import { player } from '../player/engine';
import { usePlayer } from '../player/usePlayer';

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5];

/** Format a rate as "1×", "0.75×" without trailing zeros. */
function label(rate: number): string {
  return `${rate}×`;
}

export function SpeedControl() {
  const { rate } = usePlayer();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative shrink-0">
      <button
        aria-label={`Playback speed ${label(rate)}`}
        onClick={() => setOpen((v) => !v)}
        className={`flex h-11 min-w-12 items-center justify-center rounded-full px-3 font-mono text-sm tabular-nums transition ${
          rate === 1
            ? 'text-neutral-300 hover:bg-neutral-800'
            : 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
        }`}
      >
        {label(rate)}
      </button>

      {open && (
        <>
          {/* click-away layer */}
          <button
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-10 cursor-default"
          />
          <div
            role="menu"
            className="absolute bottom-full right-0 z-20 mb-2 w-28 overflow-hidden rounded-xl border border-neutral-700 bg-neutral-900 p-1 shadow-xl"
          >
            {SPEEDS.map((s) => (
              <button
                key={s}
                role="menuitemradio"
                aria-checked={s === rate}
                onClick={() => {
                  player.setRate(s);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left font-mono text-sm tabular-nums transition ${
                  s === rate ? 'bg-neutral-800 text-emerald-300' : 'text-neutral-300 hover:bg-neutral-800'
                }`}
              >
                {label(s)}
                {s === 1 && <span className="font-sans text-[0.65rem] text-neutral-500">normal</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
