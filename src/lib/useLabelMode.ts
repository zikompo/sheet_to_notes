import { useCallback, useState } from 'react';

export type LabelMode = 'names' | 'fingers' | 'off';

const ORDER: LabelMode[] = ['names', 'fingers', 'off'];
const KEY = 'sheet-to-notes:labelMode';

function initial(): LabelMode {
  const stored = localStorage.getItem(KEY);
  return stored === 'names' || stored === 'fingers' || stored === 'off' ? stored : 'names';
}

/** What to draw on each falling block; cycles Names → Fingers → Off, persisted. */
export function useLabelMode(): { labelMode: LabelMode; cycle: () => void } {
  const [labelMode, setLabelMode] = useState<LabelMode>(initial);

  const cycle = useCallback(() => {
    setLabelMode((m) => {
      const next = ORDER[(ORDER.indexOf(m) + 1) % ORDER.length];
      localStorage.setItem(KEY, next);
      return next;
    });
  }, []);

  return { labelMode, cycle };
}
