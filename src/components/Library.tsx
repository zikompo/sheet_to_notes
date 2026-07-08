import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { listSongs, getSong, saveSong, deleteSong, type SongRow } from '../lib/db';
import { parseSongFile } from '../parser/mxl';
import { demoSong } from '../lib/demoSong';
import { UploadZone } from './UploadZone';
import type { ParsedSong } from '../types';

interface Props {
  session: Session;
  onOpen: (song: ParsedSong, songId?: string) => void;
}

function fmtDuration(s: number): string {
  return `${Math.floor(s / 60)}:${Math.floor(s % 60)
    .toString()
    .padStart(2, '0')}`;
}

export function Library({ session, onOpen }: Props) {
  const [songs, setSongs] = useState<SongRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyMsg, setBusyMsg] = useState<string | null>(null);

  useEffect(() => {
    listSongs()
      .then(setSongs)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Could not load songs.'));
  }, []);

  const upload = async (file: File) => {
    setError(null);
    setBusyMsg('Parsing…');
    try {
      const parsed = await parseSongFile(file);
      setBusyMsg('Saving…');
      const row = await saveSong(parsed, file);
      setSongs((prev) => [row, ...(prev ?? [])]);
      onOpen(parsed, row.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setBusyMsg(null);
    }
  };

  const open = async (row: SongRow) => {
    setError(null);
    setBusyMsg('Loading…');
    try {
      const full = await getSong(row.id);
      onOpen(full.parsed, full.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load that song.');
    } finally {
      setBusyMsg(null);
    }
  };

  const remove = async (row: SongRow) => {
    if (!confirm(`Delete “${row.title}”? This also removes its checkpoints.`)) return;
    setError(null);
    try {
      await deleteSong(row);
      setSongs((prev) => (prev ?? []).filter((s) => s.id !== row.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed.');
    }
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-neutral-800 bg-neutral-900 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <h1 className="text-lg font-bold tracking-tight text-neutral-100">Sheet to Notes</h1>
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-neutral-500 sm:block">{session.user.email}</span>
          <button
            onClick={() => void supabase.auth.signOut()}
            className="rounded-full px-3 py-1.5 text-xs text-neutral-400 transition hover:bg-neutral-800 hover:text-neutral-200"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <UploadZone onFile={(f) => void upload(f)} compact>
          <p className="text-center text-sm font-medium text-neutral-200">
            {busyMsg ?? 'Add a song — drop or tap to choose'}
          </p>
          <p className="mt-1 text-center text-xs text-neutral-500">.mxl · .musicxml · .xml</p>
        </UploadZone>

        {error && (
          <p className="mt-3 rounded-lg bg-red-950/60 px-4 py-2 text-sm text-red-300">{error}</p>
        )}

        <div className="mt-6">
          {songs === null && !error && (
            <p className="py-10 text-center text-sm text-neutral-500">Loading your library…</p>
          )}

          {songs?.length === 0 && (
            <div className="rounded-2xl border border-neutral-800 py-12 text-center">
              <p className="text-sm text-neutral-400">No songs yet.</p>
              <p className="mt-1 text-xs text-neutral-600">
                Upload a MusicXML export from MuseScore to get started, or{' '}
                <button
                  onClick={() => onOpen(demoSong())}
                  className="text-emerald-400 underline-offset-2 hover:underline"
                >
                  try the demo
                </button>
                .
              </p>
            </div>
          )}

          <ul className="space-y-2">
            {songs?.map((row) => (
              <li
                key={row.id}
                className="group flex items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 transition hover:border-neutral-600"
              >
                <button onClick={() => void open(row)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-800 text-neutral-400">
                    ♪
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-neutral-100">
                      {row.title}
                    </span>
                    <span className="block text-xs text-neutral-500">
                      {fmtDuration(row.duration_seconds)} ·{' '}
                      {new Date(row.created_at).toLocaleDateString()}
                    </span>
                  </span>
                </button>
                <button
                  onClick={() => void remove(row)}
                  aria-label={`Delete ${row.title}`}
                  className="rounded-full px-2.5 py-1 text-xs text-neutral-600 transition hover:bg-red-950/60 hover:text-red-300"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>

          {songs && songs.length > 0 && (
            <button
              onClick={() => onOpen(demoSong())}
              className="mt-6 w-full text-center text-xs text-neutral-600 transition hover:text-neutral-400"
            >
              Try the demo song
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
