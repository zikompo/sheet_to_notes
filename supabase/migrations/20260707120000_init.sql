-- Sheet to Notes — Phase 3 schema
-- Run in the Supabase SQL Editor (or `supabase db push` if you use the CLI).

-- ── Tables ────────────────────────────────────────────────────────────────

create table public.songs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  composer text,
  duration_seconds real not null,
  parsed jsonb not null,             -- ParsedSong (notes, tempo map, measures)
  file_path text,                    -- Storage path of the original .mxl/.musicxml
  created_at timestamptz not null default now()
);

create index songs_user_id_idx on public.songs (user_id, created_at desc);

create table public.checkpoints (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references public.songs (id) on delete cascade,
  name text not null,
  position_seconds real not null,
  created_at timestamptz not null default now()
);

create index checkpoints_song_id_idx on public.checkpoints (song_id, position_seconds);

-- ── Grants ────────────────────────────────────────────────────────────────
-- RLS restricts which *rows* a user sees; the authenticated role still needs
-- table-level privileges to touch the tables at all. Supabase does not always
-- grant these automatically, so do it explicitly.

grant select, insert, update, delete on public.songs to authenticated;
grant select, insert, delete on public.checkpoints to authenticated;

-- ── Row Level Security ────────────────────────────────────────────────────

alter table public.songs enable row level security;
alter table public.checkpoints enable row level security;

create policy "songs: owner select" on public.songs
  for select to authenticated using (user_id = (select auth.uid()));
create policy "songs: owner insert" on public.songs
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "songs: owner update" on public.songs
  for update to authenticated using (user_id = (select auth.uid()));
create policy "songs: owner delete" on public.songs
  for delete to authenticated using (user_id = (select auth.uid()));

-- Checkpoints are owned through their song.
create policy "checkpoints: owner select" on public.checkpoints
  for select to authenticated using (
    exists (select 1 from public.songs s where s.id = song_id and s.user_id = (select auth.uid()))
  );
create policy "checkpoints: owner insert" on public.checkpoints
  for insert to authenticated with check (
    exists (select 1 from public.songs s where s.id = song_id and s.user_id = (select auth.uid()))
  );
create policy "checkpoints: owner delete" on public.checkpoints
  for delete to authenticated using (
    exists (select 1 from public.songs s where s.id = song_id and s.user_id = (select auth.uid()))
  );

-- ── Storage: original score files at scores/{user_id}/{song_id}.<ext> ─────

insert into storage.buckets (id, name, public)
values ('scores', 'scores', false)
on conflict (id) do nothing;

create policy "scores: owner read" on storage.objects
  for select to authenticated using (
    bucket_id = 'scores' and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy "scores: owner write" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'scores' and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy "scores: owner delete" on storage.objects
  for delete to authenticated using (
    bucket_id = 'scores' and (storage.foldername(name))[1] = (select auth.uid())::text
  );
