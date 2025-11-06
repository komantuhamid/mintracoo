'use client';
import { useEffect, useState } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

export function useMiniEnv() {
  const [isMini, setIsMini] = useState(false);
  const [ctx, setCtx] = useState<any>(null);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    (async () => {
      try {
        const inside = await sdk.isInMiniApp();
        setIsMini(inside);
        if (inside) {
          await sdk.actions.ready();
          const c = await sdk.context;
          setCtx(c);
          unsub = sdk.on('contextChanged', (next) => setCtx(next));
        }
      } catch (e) {
        console.error('MiniApp init failed', e);
      }
    })();
    return () => { if (unsub) unsub(); };
  }, []);

  return { isMini, ctx };
}
