# Sheet to Notes

Synthesia-style falling-notes piano visualizer for MusicXML scores, built for practicing on an iPad. Load a `.mxl` / `.musicxml` export from MuseScore and watch the notes fall onto an on-screen keyboard with hand colors (blue = left, green = right) and fingering numbers, played back with sampled piano.

## Stack

React 19 · TypeScript · Tailwind v4 · Vite · [smplr](https://github.com/danigb/smplr) (sampled piano over Web Audio) · fflate (`.mxl` unzip)

## Develop

```sh
npm install
npm run dev          # dev server; add --host to test on an iPad over LAN
npm test             # parser unit tests (vitest)
npm run build        # typecheck + production build
```

## How it works

- **Parser** (`src/parser/`): deterministic MusicXML (score-partwise) parser — no OMR/LLM. Walks the piano part with a quarter-note cursor (`divisions`, `backup`/`forward`), keeps chords, merges ties, maps staff → hand, reads `<technical><fingering>`, and converts to seconds via the tempo map (`<sound tempo>`).
- **Player** (`src/player/`): plain-TS engine clocked by `AudioContext.currentTime`; a 100ms lookahead scheduler feeds smplr's SplendidGrandPiano. React subscribes via `useSyncExternalStore`; per-frame time is read imperatively.
- **Visuals** (`src/components/PianoRoll.tsx`): one canvas draws the falling-note lane and keyboard from shared key geometry (`src/lib/keyLayout.ts`), scaled by `devicePixelRatio`.

Getting scores: in MuseScore, File → Export → MusicXML (`.mxl`).

## Roadmap

- [x] Phase 1 — MusicXML parser + tests
- [x] Phase 2 — playback, falling notes, transport (play/pause/rewind/scrub)
- [ ] Phase 3 — Supabase: auth, song library, named checkpoints
- [ ] Phase 4 — Vercel deploy, PWA/iPad polish
