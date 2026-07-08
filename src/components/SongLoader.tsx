import { useRef, useState } from 'react';
import { parseSongFile } from '../parser/mxl';
import { demoSong } from '../lib/demoSong';
import type { ParsedSong } from '../types';

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

  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-100">Sheet to Notes</h1>
        <p className="mt-2 text-sm text-neutral-400">
          Load a MusicXML score from MuseScore and watch it as falling notes.
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
          className={`mt-8 cursor-pointer rounded-2xl border-2 border-dashed p-10 transition ${
            dragOver
              ? 'border-emerald-400 bg-emerald-400/10'
              : 'border-neutral-700 bg-neutral-900 hover:border-neutral-500'
          }`}
        >
          <svg viewBox="0 0 24 24" className="mx-auto h-10 w-10 fill-none stroke-neutral-500" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0-4 4m4-4 4 4M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
          </svg>
          <p className="mt-3 font-medium text-neutral-200">Tap to choose a file</p>
          <p className="mt-1 text-xs text-neutral-500">.mxl · .musicxml · .xml (uncompressed MusicXML)</p>
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

        {error && (
          <p className="mt-4 rounded-lg bg-red-950/60 px-4 py-2 text-sm text-red-300">{error}</p>
        )}

        <button
          onClick={() => onSong(demoSong())}
          className="mt-6 rounded-full bg-neutral-800 px-5 py-2.5 text-sm font-medium text-neutral-200 transition hover:bg-neutral-700 active:scale-95"
        >
          Try the demo song
        </button>
        <p className="mt-6 text-xs text-neutral-600">
          In MuseScore: File → Export → MusicXML (.mxl)
        </p>
      </div>
    </div>
  );
}
