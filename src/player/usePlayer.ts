import { useSyncExternalStore } from 'react';
import { player, type PlayerSnapshot } from './engine';

export function usePlayer(): PlayerSnapshot {
  return useSyncExternalStore(player.subscribe, player.getSnapshot);
}
