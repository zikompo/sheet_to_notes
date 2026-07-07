import { unzipSync, strFromU8 } from 'fflate';
import { parseMusicXML } from './musicxml';
import type { ParsedSong } from '../types';

/** Extract the score XML from a compressed .mxl archive (a zip file). */
export function extractMusicXML(data: Uint8Array): string {
  const files = unzipSync(data);

  // META-INF/container.xml names the root score file.
  const container = files['META-INF/container.xml'];
  if (container) {
    const doc = new DOMParser().parseFromString(strFromU8(container), 'application/xml');
    const rootfile = doc.getElementsByTagName('rootfile')[0];
    const path = rootfile?.getAttribute('full-path');
    if (path && files[path]) return strFromU8(files[path]);
  }

  for (const name of Object.keys(files)) {
    if (name.startsWith('META-INF/')) continue;
    if (/\.(musicxml|xml)$/i.test(name)) return strFromU8(files[name]);
  }
  throw new Error('No MusicXML document found inside the .mxl archive.');
}

const ZIP_MAGIC = [0x50, 0x4b]; // "PK"

/** Parse an uploaded .mxl / .musicxml / .xml file into a ParsedSong. */
export async function parseSongFile(file: File): Promise<ParsedSong> {
  const buf = new Uint8Array(await file.arrayBuffer());
  const isZip = buf[0] === ZIP_MAGIC[0] && buf[1] === ZIP_MAGIC[1];
  const xml = isZip ? extractMusicXML(buf) : new TextDecoder().decode(buf);
  const fallbackTitle = file.name.replace(/\.(mxl|musicxml|xml)$/i, '');
  return parseMusicXML(xml, fallbackTitle);
}
