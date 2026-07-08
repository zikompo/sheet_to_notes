import { useEffect } from 'react';

/**
 * Hold a screen wake lock while `active` (e.g. during playback) so the iPad
 * doesn't dim/sleep mid-practice. Re-acquires on visibility return, since iOS
 * releases the lock when the tab is backgrounded. No-op where unsupported.
 */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;

    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      try {
        sentinel = await navigator.wakeLock.request('screen');
      } catch {
        // Denied (e.g. low battery) — practice still works, screen may dim.
      }
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible' && !cancelled) void acquire();
    };

    void acquire();
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      void sentinel?.release();
    };
  }, [active]);
}
