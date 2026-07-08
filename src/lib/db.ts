import { supabase } from './supabase';
import type { ParsedSong } from '../types';

export interface SongRow {
  id: string;
  title: string;
  composer: string | null;
  duration_seconds: number;
  created_at: string;
}

export interface SongWithParsed extends SongRow {
  parsed: ParsedSong;
}

export interface CheckpointRow {
  id: string;
  song_id: string;
  name: string;
  position_seconds: number;
}

/** Library listing — skips the heavy `parsed` column. */
export async function listSongs(): Promise<SongRow[]> {
  const { data, error } = await supabase
    .from('songs')
    .select('id, title, composer, duration_seconds, created_at')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

export async function getSong(id: string): Promise<SongWithParsed> {
  const { data, error } = await supabase
    .from('songs')
    .select('id, title, composer, duration_seconds, created_at, parsed')
    .eq('id', id)
    .single();
  if (error) throw new Error(error.message);
  return data as SongWithParsed;
}

/**
 * Save a parsed song: original file goes to Storage at {user_id}/{song_id}.<ext>,
 * parsed JSON into the songs row. File upload happens first so a failed upload
 * never leaves a row without its source file.
 */
export async function saveSong(parsed: ParsedSong, file: File): Promise<SongRow> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('Not signed in.');

  const songId = crypto.randomUUID();
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'mxl';
  const filePath = `${userData.user.id}/${songId}.${ext}`;

  const { error: uploadError } = await supabase.storage.from('scores').upload(filePath, file);
  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  const { data, error } = await supabase
    .from('songs')
    .insert({
      id: songId,
      user_id: userData.user.id,
      title: parsed.title,
      duration_seconds: parsed.duration,
      parsed,
      file_path: filePath,
    })
    .select('id, title, composer, duration_seconds, created_at')
    .single();
  if (error) {
    await supabase.storage.from('scores').remove([filePath]);
    throw new Error(error.message);
  }
  return data;
}

export async function deleteSong(song: SongRow): Promise<void> {
  const { data, error } = await supabase
    .from('songs')
    .delete()
    .eq('id', song.id)
    .select('file_path')
    .single();
  if (error) throw new Error(error.message);
  if (data?.file_path) await supabase.storage.from('scores').remove([data.file_path]);
}

export async function listCheckpoints(songId: string): Promise<CheckpointRow[]> {
  const { data, error } = await supabase
    .from('checkpoints')
    .select('id, song_id, name, position_seconds')
    .eq('song_id', songId)
    .order('position_seconds');
  if (error) throw new Error(error.message);
  return data;
}

export async function addCheckpoint(
  songId: string,
  name: string,
  positionSeconds: number,
): Promise<CheckpointRow> {
  const { data, error } = await supabase
    .from('checkpoints')
    .insert({ song_id: songId, name, position_seconds: positionSeconds })
    .select('id, song_id, name, position_seconds')
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteCheckpoint(id: string): Promise<void> {
  const { error } = await supabase.from('checkpoints').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
