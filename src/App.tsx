import { useState } from 'react';
import type { ParsedSong } from './types';
import { player } from './player/engine';
import { usePlayer } from './player/usePlayer';
import { useAuth } from './lib/useAuth';
import { useWakeLock } from './lib/useWakeLock';
import { AuthScreen } from './components/AuthScreen';
import { Library } from './components/Library';
import { PianoRoll } from './components/PianoRoll';
import { Transport } from './components/Transport';
import { CheckpointBar } from './components/CheckpointBar';
import { DebugPanel } from './components/DebugPanel';

interface OpenSong {
  song: ParsedSong;
  /** Set for library songs — enables persisted checkpoints. */
  songId?: string;
}

export default function App() {
  const { session, loading } = useAuth();
  const { playing } = usePlayer();
  const [open, setOpen] = useState<OpenSong | null>(null);
  const [showDebug, setShowDebug] = useState(false);

  useWakeLock(playing);

  const openSong = (song: ParsedSong, songId?: string) => {
    player.load(song);
    setOpen({ song, songId });
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-neutral-500">Loading…</p>
      </div>
    );
  }

  if (!open) {
    return session ? (
      <Library session={session} onOpen={openSong} />
    ) : (
      <AuthScreen onLocalSong={openSong} />
    );
  }

  const { song, songId } = open;
  return (
    <div className="relative flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-neutral-800 bg-neutral-900 px-4 py-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <button
          onClick={() => {
            player.pause();
            setOpen(null);
            setShowDebug(false);
          }}
          className="rounded-full px-3 py-1.5 text-sm text-neutral-400 transition hover:bg-neutral-800 hover:text-neutral-200"
        >
          ‹ {session ? 'Library' : 'Back'}
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
      {songId && <CheckpointBar songId={songId} />}
      <Transport />

      {showDebug && <DebugPanel song={song} onClose={() => setShowDebug(false)} />}
    </div>
  );
}
