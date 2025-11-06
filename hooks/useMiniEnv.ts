'use client';
import { useEffect, useState } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

export function useMiniEnv() {
  const [isMini, setIsMini] = useState(false);
  const [ctx, setCtx] = useState<any>(null);

  useEffect(() => {
    let cleanup: undefined | (() => void);
    const handler = (next: any) => {
      // نفس تجميع الـ user في كل تحديث
      const user =
        next?.user ||
        next?.frameContext?.user ||
        next?.frameContext?.viewer ||
        next?.viewer ||
        null;
      setCtx({ ...next, user });
    };

    (async () => {
      try {
        const inside = await sdk.isInMiniApp();
        setIsMini(inside);
        if (!inside) return;

        // ensure ready قبل استعمال أي wallet/context
        await (sdk as any).actions?.ready?.();

        const c = await (sdk as any).context;
        const user =
          c?.user ||
          c?.frameContext?.user ||
          c?.frameContext?.viewer ||
          c?.viewer ||
          null;

        setCtx({ ...c, user });

        const anySdk: any = sdk as any;
        const maybeUnsub = anySdk.on?.('contextChanged', handler);

        if (typeof maybeUnsub === 'function') {
          cleanup = maybeUnsub as () => void;
        } else if (typeof anySdk.off === 'function') {
          cleanup = () => anySdk.off('contextChanged', handler);
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
