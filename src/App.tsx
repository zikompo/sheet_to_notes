import { useState } from 'react';
import type { ParsedSong } from './types';
import { player } from './player/engine';
import { SongLoader } from './components/SongLoader';
import { PianoRoll } from './components/PianoRoll';
import { Transport } from './components/Transport';
import { DebugPanel } from './components/DebugPanel';

export default function App() {
  const [song, setSong] = useState<ParsedSong | null>(null);
  const [showDebug, setShowDebug] = useState(false);

  const loadSong = (s: ParsedSong) => {
    player.load(s);
    setSong(s);
  };

  if (!song) return <SongLoader onSong={loadSong} />;

  return (
    <div className="relative flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-neutral-800 bg-neutral-900 px-4 py-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <button
          onClick={() => {
            player.pause();
            setSong(null);
            setShowDebug(false);
          }}
          className="rounded-full px-3 py-1.5 text-sm text-neutral-400 transition hover:bg-neutral-800 hover:text-neutral-200"
        >
          ‹ Songs
        </button>
        <h1 className="min-w-0 flex-1 truncate text-center text-sm font-semibold text-neutral-200">
          {song.title}
        </h1>
        <button
          onClick={() => setShowDebug((v) => !v)}
          aria-label="Show parsed notes"
          className="rounded-full px-3 py-1.5 font-mono text-sm text-neutral-500 transition hover:bg-neutral-800 hover:text-neutral-200"
        >
          {'{}'}
        </button>
      </header>

      <PianoRoll song={song} />
      <Transport />

      {showDebug && <DebugPanel song={song} onClose={() => setShowDebug(false)} />}
    </div>
  );
}
