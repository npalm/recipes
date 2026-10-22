'use client';

import { useEffect, useState } from 'react';

export function useCookingWakeLock() {
  const supported = typeof navigator !== 'undefined' && 'wakeLock' in navigator;
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState<'off' | 'requesting' | 'active' | 'paused' | 'error'>('off');

  useEffect(() => {
    if (!enabled || !supported) return;
    let cancelled = false;
    let pending = false;
    let sentinel: WakeLockSentinel | undefined;
    const release = (lock: WakeLockSentinel) => { void lock.release().catch(() => {}); };

    const request = async () => {
      if (cancelled || pending || document.visibilityState !== 'visible' || (sentinel && !sentinel.released)) return;
      pending = true;
      setStatus('requesting');
      try {
        const lock = await navigator.wakeLock.request('screen');
        if (cancelled || document.visibilityState !== 'visible') {
          release(lock);
          if (!cancelled) setStatus('paused');
          return;
        }
        sentinel = lock;
        setStatus('active');
        lock.addEventListener('release', () => { if (!cancelled) setStatus('paused'); });
      } catch {
        if (!cancelled) setStatus('error');
      } finally {
        pending = false;
      }
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void request();
      else if (sentinel && !sentinel.released) release(sentinel);
    };
    void request();
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (sentinel && !sentinel.released) release(sentinel);
    };
  }, [enabled, supported]);

  return {
    supported, enabled, status,
    toggle: () => { setEnabled(value => !value); setStatus('off'); },
  };
}
