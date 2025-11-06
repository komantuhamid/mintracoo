'use client';
import { useEffect, useState } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

export function useMiniEnv() {
  const [isMini, setIsMini] = useState(false);
  const [ctx, setCtx] = useState<any>(null);

  useEffect(() => {
    let cleanup: undefined | (() => void);
    const handler = (next: any) => setCtx(next);

    (async () => {
      try {
        const inside = await sdk.isInMiniApp();
        setIsMini(inside);
        if (!inside) return;

        // ready/context (optional chaining in case method missing on some versions)
        await (sdk.actions as any)?.ready?.();
        const c = await (sdk as any).context;
        setCtx(c);

        // Subscribe to context changes with safe fallback
        const anySdk: any = sdk as any;
        const maybeUnsub = anySdk.on?.('contextChanged', handler);

        if (typeof maybeUnsub === 'function') {
          // Some SDKs return an unsubscribe function from .on()
          cleanup = maybeUnsub as () => void;
        } else if (typeof anySdk.off === 'function') {
          // Otherwise, keep a cleanup that calls .off(event, handler)
          cleanup = () => anySdk.off('contextChanged', handler);
        } else {
          // No off available — no-op cleanup
          cleanup = undefined;
        }
      } catch (e) {
        console.error('MiniApp init failed', e);
      }
    })();

    return () => {
      try {
        if (cleanup) cleanup();
      } catch {
        /* ignore */
      }
    };
  }, []);

  return { isMini, ctx };
}
