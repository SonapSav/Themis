/**
 * The one guarded way in to browser storage.
 *
 * Storage can be unavailable — a private window, site data blocked, a quota
 * already full — and merely *reading* `window.localStorage` throws when it is,
 * before any key is touched. Every caller degrades to an in-memory session
 * rather than an error.
 */
export function storage(): Storage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}
