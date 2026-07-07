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
      <header className="flex items-center gap-3 border-b border-line bg-surface px-4 py-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <button
          onClick={() => {
            player.pause();
            setSong(null);
            setShowDebug(false);
          }}
          className="rounded-full px-3 py-1.5 text-[0.68rem] font-medium tracking-[0.18em] uppercase text-muted transition hover:bg-raised hover:text-ivory"
        >
          ‹ Songs
        </button>
        <h1 className="min-w-0 flex-1 truncate text-center font-display text-[1.05rem] italic text-ivory">
          {song.title}
        </h1>
        <button
          onClick={() => setShowDebug((v) => !v)}
          aria-label="Show parsed notes"
          className="rounded-full px-3 py-1.5 font-mono text-sm text-faint transition hover:bg-raised hover:text-ivory"
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
