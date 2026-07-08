import { useEffect, useRef, useState } from 'react';
import { player } from '../player/engine';
import {
  listCheckpoints,
  addCheckpoint,
  deleteCheckpoint,
  type CheckpointRow,
} from '../lib/db';

function fmt(t: number): string {
  return `${Math.floor(t / 60)}:${Math.floor(t % 60)
    .toString()
    .padStart(2, '0')}`;
}

/**
 * Named positions inside a piece (a file often holds several pieces).
 * Tap a chip to jump; “+ Checkpoint” marks the current position.
 */
export function CheckpointBar({ songId }: { songId: string }) {
  const [checkpoints, setCheckpoints] = useState<CheckpointRow[]>([]);
  const [adding, setAdding] = useState<{ at: number } | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listCheckpoints(songId)
      .then(setCheckpoints)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Could not load checkpoints.'));
  }, [songId]);

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  const startAdding = () => {
    setAdding({ at: player.time });
    setName(`Part ${checkpoints.length + 1}`);
  };

  const save = async () => {
    if (!adding) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setAdding(null);
      return;
    }
    setError(null);
    try {
      const row = await addCheckpoint(songId, trimmed, adding.at);
      setCheckpoints((prev) =>
        [...prev, row].sort((a, b) => a.position_seconds - b.position_seconds),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save checkpoint.');
    }
    setAdding(null);
  };

  const remove = async (row: CheckpointRow) => {
    setCheckpoints((prev) => prev.filter((c) => c.id !== row.id));
    try {
      await deleteCheckpoint(row.id);
    } catch (e) {
      setCheckpoints((prev) =>
        [...prev, row].sort((a, b) => a.position_seconds - b.position_seconds),
      );
      setError(e instanceof Error ? e.message : 'Could not delete checkpoint.');
    }
  };

  return (
    <div className="border-t border-neutral-800 bg-neutral-900/60 px-3 py-2">
      <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {adding ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
            className="flex shrink-0 items-center gap-1.5"
          >
            <input
              ref={inputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => void save()}
              maxLength={40}
              placeholder="Name this spot"
              className="w-36 rounded-full border border-emerald-500/60 bg-neutral-950 px-3 py-1.5 text-xs text-neutral-100 focus:outline-none"
            />
            <span className="font-mono text-[0.65rem] text-neutral-500">{fmt(adding.at)}</span>
          </form>
        ) : (
          <button
            onClick={startAdding}
            className="shrink-0 rounded-full border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300 transition hover:border-emerald-500/60 hover:text-emerald-300"
          >
            + Checkpoint
          </button>
        )}

        {checkpoints.map((c) => (
          <span
            key={c.id}
            className="group flex shrink-0 items-center overflow-hidden rounded-full bg-neutral-800 transition hover:bg-neutral-700"
          >
            <button
              onClick={() => player.seek(c.position_seconds)}
              className="flex items-center gap-1.5 py-1.5 pl-3 pr-1 text-xs text-neutral-200"
            >
              <span className="max-w-40 truncate">{c.name}</span>
              <span className="font-mono text-[0.65rem] text-neutral-500">
                {fmt(c.position_seconds)}
              </span>
            </button>
            <button
              onClick={() => void remove(c)}
              aria-label={`Delete checkpoint ${c.name}`}
              className="py-1.5 pl-1 pr-2.5 text-neutral-600 transition hover:text-red-300"
            >
              ✕
            </button>
          </span>
        ))}

        {checkpoints.length === 0 && !adding && (
          <span className="shrink-0 text-xs text-neutral-600">
            Mark sections of this file to jump back to them.
          </span>
        )}
        {error && <span className="shrink-0 text-xs text-red-400">{error}</span>}
      </div>
    </div>
  );
}
