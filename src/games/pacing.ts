import { useEffect, useRef } from 'react';

export const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Resolves once the speech has finished AND at least `minMs` has passed, so
 * feedback is both heard in full and visible long enough.
 */
export async function afterSpeech(speech: Promise<void>, minMs: number): Promise<void> {
  await Promise.all([speech, wait(minMs)]);
}

/** False after unmount — check before touching state at the end of an async sequence. */
export function useAlive() {
  const alive = useRef(true);
  useEffect(
    () => () => {
      alive.current = false;
    },
    [],
  );
  return alive;
}
