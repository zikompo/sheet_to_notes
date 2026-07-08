# Sheet to Notes

Synthesia-style falling-notes piano visualizer for MusicXML scores, built for practicing on an iPad. Load a `.mxl` / `.musicxml` export from MuseScore and watch the notes fall onto an on-screen keyboard with hand colors (blue = left, green = right) and fingering numbers, played back with sampled piano.

## Stack

React 19 · TypeScript · Tailwind v4 · Vite · [smplr](https://github.com/danigb/smplr) (sampled piano over Web Audio) · fflate (`.mxl` unzip) · Supabase (auth, Postgres, storage)

## Develop

```sh
npm install
cp .env.example .env  # fill in your Supabase URL + publishable key
npm run dev           # dev server on :5173 (add --host to test on an iPad over LAN)
npm test              # unit tests (parser + playback timing)
npm run build         # typecheck + production build
```

### Supabase setup

1. Create a project at [supabase.com](https://supabase.com); copy the URL and publishable key into `.env` (`VITE_`-prefixed — Vite only exposes those to the client).
2. In the dashboard **SQL Editor**, run `supabase/migrations/20260707120000_init.sql` — it creates the `songs`/`checkpoints` tables, their owner-only RLS policies and grants, and the private `scores` storage bucket.
3. (Optional) **Authentication → Providers → Google** to enable Google sign-in; add the Supabase callback URL to your Google OAuth client and your app origins to **URL Configuration**.

## Deploy (Vercel)

Import the repo in Vercel (framework preset: **Vite**). Add the two env vars from `.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`) in Project Settings. After the first deploy, add the deployment origin to Supabase **Authentication → URL Configuration** (Site URL + Redirect URLs) so OAuth returns to it. `vercel.json` handles SPA rewrites and the manifest content type.

Installs as a PWA: on iPad Safari, **Share → Add to Home Screen** for a full-screen, landscape app icon.

## How it works

- **Parser** (`src/parser/`): deterministic MusicXML (score-partwise) parser — no OMR/LLM. Walks the piano part with a quarter-note cursor (`divisions`, `backup`/`forward`), keeps chords, merges ties, maps staff → hand, reads `<technical><fingering>`, and converts to seconds via the tempo map (`<sound tempo>`).
- **Player** (`src/player/`): plain-TS engine clocked by `AudioContext.currentTime`; a 100ms lookahead scheduler feeds smplr's SplendidGrandPiano. React subscribes via `useSyncExternalStore`; per-frame time is read imperatively. Playback speed (`0.5×`–`1.5×`) is pitch-preserving — `player/timing.ts` maps song-time to the clock by the rate; unit-tested.
- **Visuals** (`src/components/PianoRoll.tsx`): one canvas draws the falling-note lane and keyboard from shared key geometry (`src/lib/keyLayout.ts`), scaled by `devicePixelRatio`.

Getting scores: in MuseScore, File → Export → MusicXML (`.mxl`).

## Roadmap

- [x] Phase 1 — MusicXML parser + tests
- [x] Phase 2 — playback, falling notes, transport (play/pause/rewind/scrub)
- [x] Phase 3 — Supabase: auth (email + Google), song library, named checkpoints
- [x] Phase 4 — playback speed, Vercel deploy, PWA/iPad polish (wake lock, manifest, icons)
