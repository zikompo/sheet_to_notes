import { useRef, useState } from 'react';
import { parseSongFile } from '../parser/mxl';
import { demoSong } from '../lib/demoSong';
import type { ParsedSong } from '../types';

/** Two decorative octaves of piano keys; one brass key as a wink. */
function KeysOrnament() {
  const whites = 14;
  const blackAfter = new Set([0, 1, 3, 4, 5, 7, 8, 10, 11, 12]); // C C# D D# E F ...
  return (
    <div className="relative mx-auto h-9 w-52 overflow-hidden rounded-[3px] border border-line">
      <div className="flex h-full">
        {Array.from({ length: whites }, (_, i) => (
          <div
            key={i}
            className={`h-full flex-1 border-r border-lacquer last:border-r-0 ${
              i === 9 ? 'bg-brass' : 'bg-ivory'
            }`}
          />
        ))}
      </div>
      {Array.from({ length: whites - 1 }, (_, i) =>
        blackAfter.has(i) ? (
          <div
            key={i}
            className="absolute top-0 h-[58%] w-[4.6%] rounded-b-[2px] bg-lacquer"
            style={{ left: `${((i + 1) / whites) * 100 - 2.3}%` }}
          />
        ) : null,
      )}
    </div>
  );
}

/** A faint cluster of five staff lines, tilted, for atmosphere. */
function Staff({ className }: { className: string }) {
  return (
    <div aria-hidden className={`pointer-events-none absolute ${className}`}>
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="mb-4 h-px w-full bg-brass/[0.07]" />
      ))}
    </div>
  );
}

export function SongLoader({ onSong }: { onSong: (song: ParsedSong) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = async (file: File) => {
    setError(null);
    try {
      onSong(await parseSongFile(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not parse that file.');
    }
  };

  const delay = (n: number) => ({ animationDelay: `${n * 90}ms` });

  return (
    <div className="relative flex h-full items-center justify-center overflow-hidden p-6">
      <Staff className="-left-24 top-16 w-[34rem] -rotate-6" />
      <Staff className="-right-32 bottom-24 w-[38rem] rotate-3" />

      <div className="w-full max-w-md text-center">
        <div className="rise" style={delay(0)}>
          <KeysOrnament />
        </div>

        <h1
          className="rise mt-7 font-display text-[2.9rem] leading-none font-light tracking-tight text-ivory"
          style={delay(1)}
        >
          Sheet <em className="font-normal italic text-brass">to</em> Notes
        </h1>

        <div className="rise mt-5 flex items-center justify-center gap-3" style={delay(2)}>
          <span className="h-px w-16 bg-line" />
          <span className="text-[0.6rem] text-brass">◆</span>
          <span className="h-px w-16 bg-line" />
        </div>

        <p
          className="rise mt-4 text-[0.7rem] font-medium tracking-[0.28em] uppercase text-muted"
          style={delay(3)}
        >
          MusicXML · Falling Notes · Sampled Grand
        </p>

        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files[0];
            if (file) void handleFile(file);
          }}
          style={delay(4)}
          className={`rise group mt-9 cursor-pointer rounded-lg border p-[5px] transition-colors duration-300 ${
            dragOver ? 'border-brass' : 'border-line hover:border-faint'
          }`}
        >
          <div
            className={`rounded-[5px] border border-dashed px-8 py-10 transition-colors duration-300 ${
              dragOver ? 'border-brass/60 bg-brass/[0.06]' : 'border-line bg-surface group-hover:border-faint'
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              className={`mx-auto h-9 w-9 fill-none transition-colors duration-300 ${
                dragOver ? 'stroke-brass' : 'stroke-faint group-hover:stroke-muted'
              }`}
              strokeWidth="1.2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0-4 4m4-4 4 4M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
            </svg>
            <p className="mt-4 font-display text-lg text-ivory">Bring a score</p>
            <p className="mt-1.5 font-mono text-[0.68rem] tracking-wide text-faint">
              .mxl · .musicxml · .xml
            </p>
            <input
              ref={inputRef}
              type="file"
              accept=".mxl,.musicxml,.xml"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
                e.target.value = '';
              }}
            />
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-md border border-felt/40 bg-felt/10 px-4 py-2 font-mono text-xs text-[#e8a294]">
            {error}
          </p>
        )}

        <button
          onClick={() => onSong(demoSong())}
          style={delay(5)}
          className="rise mt-8 rounded-full border border-brass/50 px-6 py-2.5 text-[0.72rem] font-medium tracking-[0.22em] uppercase text-brass transition-all duration-300 hover:bg-brass hover:text-lacquer active:scale-95"
        >
          Play the demo
        </button>

        <p className="rise mt-8 font-mono text-[0.65rem] text-faint" style={delay(6)}>
          MuseScore → File → Export → MusicXML (.mxl)
        </p>
      </div>
    </div>
  );
}
