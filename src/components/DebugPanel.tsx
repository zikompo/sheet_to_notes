import type { ParsedSong } from '../types';
import { noteName } from '../lib/keyLayout';

/** Dev aid: raw parsed notes, for eyeballing parser output against the score. */
export function DebugPanel({ song, onClose }: { song: ParsedSong; onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-lacquer/95 backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-line px-4 py-2">
        <span className="font-mono text-xs text-muted">
          {song.notes.length} notes · {song.measures.length} measures ·{' '}
          {song.tempoMap.map((t) => `${t.bpm}bpm@${t.time.toFixed(1)}s`).join(', ')}
        </span>
        <button onClick={onClose} className="rounded px-3 py-1 text-sm text-muted hover:bg-raised hover:text-ivory">
          Close
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-4 font-mono text-xs text-ivory/80">
        <table className="w-full text-left">
          <thead className="sticky top-0 bg-lacquer text-faint">
            <tr>
              <th className="pr-4">#</th>
              <th className="pr-4">note</th>
              <th className="pr-4">start</th>
              <th className="pr-4">dur</th>
              <th className="pr-4">hand</th>
              <th className="pr-4">finger</th>
              <th>measure</th>
            </tr>
          </thead>
          <tbody>
            {song.notes.slice(0, 500).map((n, i) => (
              <tr key={i} className="border-t border-line/50">
                <td className="pr-4 text-faint">{i}</td>
                <td className="pr-4">{noteName(n.midi)}</td>
                <td className="pr-4">{n.start.toFixed(3)}</td>
                <td className="pr-4">{n.duration.toFixed(3)}</td>
                <td className={`pr-4 ${n.hand === 'left' ? 'text-hand-left' : 'text-hand-right'}`}>{n.hand}</td>
                <td className="pr-4">{n.finger ?? '·'}</td>
                <td>{n.measure + 1}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
