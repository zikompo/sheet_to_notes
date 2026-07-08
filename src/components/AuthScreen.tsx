import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { parseSongFile } from '../parser/mxl';
import { demoSong } from '../lib/demoSong';
import type { ParsedSong } from '../types';

interface Props {
  /** Open a song without an account (demo / local file) — nothing is saved. */
  onLocalSong: (song: ParsedSong) => void;
}

export function AuthScreen({ onLocalSong }: Props) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw new Error(error.message);
        // useAuth's onAuthStateChange takes over from here.
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw new Error(error.message);
        if (!data.session) {
          setNotice('Account created — check your email to confirm, then sign in.');
          setMode('signin');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  const signInWithGoogle = async () => {
    setError(null);
    setNotice(null);
    // Redirects to Google, then back to the app; useAuth picks up the session
    // on return (supabase-js exchanges the ?code in the URL automatically).
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) setError(error.message);
  };

  const openFile = async (file: File) => {
    setError(null);
    try {
      onLocalSong(await parseSongFile(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not parse that file.');
    }
  };

  return (
    <div className="flex h-full items-center justify-center overflow-y-auto p-6">
      <div className="w-full max-w-sm">
        <h1 className="text-center text-3xl font-bold tracking-tight text-neutral-100">
          Sheet to Notes
        </h1>
        <p className="mt-2 text-center text-sm text-neutral-400">
          Sign in to save songs and checkpoints.
        </p>

        <button
          onClick={() => void signInWithGoogle()}
          className="mt-8 flex w-full items-center justify-center gap-3 rounded-xl border border-neutral-700 bg-neutral-900 py-3 text-sm font-medium text-neutral-100 transition hover:border-neutral-500 hover:bg-neutral-800 active:scale-[0.99]"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
            <path fill="#4285F4" d="M23.52 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.87z" />
            <path fill="#34A853" d="M12 24c3.24 0 5.96-1.08 7.95-2.91l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A12 12 0 0 0 12 24z" />
            <path fill="#FBBC05" d="M5.27 14.28a7.2 7.2 0 0 1 0-4.56v-3.1H1.29a12 12 0 0 0 0 10.76l3.98-3.1z" />
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44A11.98 11.98 0 0 0 12 0 12 12 0 0 0 1.29 6.62l3.98 3.1C6.22 6.86 8.87 4.75 12 4.75z" />
          </svg>
          Continue with Google
        </button>

        <div className="mt-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-neutral-800" />
          <span className="text-xs text-neutral-600">or with email</span>
          <span className="h-px flex-1 bg-neutral-800" />
        </div>

        <form onSubmit={submit} className="mt-6 space-y-3">
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-emerald-500 focus:outline-none"
          />
          <input
            type="password"
            required
            minLength={6}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-emerald-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-emerald-400 active:scale-[0.99] disabled:opacity-60"
          >
            {busy ? 'One moment…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <button
          onClick={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin');
            setError(null);
            setNotice(null);
          }}
          className="mt-3 w-full text-center text-xs text-neutral-500 transition hover:text-neutral-300"
        >
          {mode === 'signin' ? 'No account? Create one' : 'Have an account? Sign in'}
        </button>

        {notice && (
          <p className="mt-4 rounded-lg bg-emerald-950/60 px-4 py-2 text-sm text-emerald-300">
            {notice}
          </p>
        )}
        {error && (
          <p className="mt-4 rounded-lg bg-red-950/60 px-4 py-2 text-sm text-red-300">{error}</p>
        )}

        <div className="mt-8 flex items-center gap-3">
          <span className="h-px flex-1 bg-neutral-800" />
          <span className="text-xs text-neutral-600">or without an account</span>
          <span className="h-px flex-1 bg-neutral-800" />
        </div>

        <div className="mt-4 flex gap-3">
          <button
            onClick={() => onLocalSong(demoSong())}
            className="flex-1 rounded-xl bg-neutral-800 py-3 text-sm font-medium text-neutral-200 transition hover:bg-neutral-700 active:scale-[0.99]"
          >
            Try the demo
          </button>
          <label className="flex-1">
            <span className="flex w-full cursor-pointer items-center justify-center rounded-xl bg-neutral-800 py-3 text-sm font-medium text-neutral-200 transition hover:bg-neutral-700 active:scale-[0.99]">
              Open a file
            </span>
            <input
              type="file"
              accept=".mxl,.musicxml,.xml"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void openFile(file);
                e.target.value = '';
              }}
            />
          </label>
        </div>
        <p className="mt-2 text-center text-xs text-neutral-600">
          Songs opened without an account aren’t saved.
        </p>
      </div>
    </div>
  );
}
