/**
 * Single source of "now" for timing trials. Keeps components free of direct
 * Date.now() calls (React Compiler purity lint) and lets tests fake time.
 */
export const nowMs = (): number => Date.now();
