/**
 * jsdom implements no `matchMedia` at all, so without this the system-theme
 * branch would go untested rather than merely unexercised — and a stub that
 * always answers "light" would be worse, because it would look tested.
 *
 * This is the smallest double that can be driven: one query, a settable answer,
 * and real change events, so a test can play the laptop that switches at dusk.
 */
type ChangeListener = (event: MediaQueryListEvent) => void;

const DARK_QUERY = '(prefers-color-scheme: dark)';

let prefersDark = false;
const listeners = new Set<ChangeListener>();

/** Feature-detected, exactly like the Blob polyfills: a no-op in a real browser. */
export function installMatchMedia(): void {
  if (typeof window === 'undefined' || typeof window.matchMedia === 'function') return;
  window.matchMedia = ((query: string) =>
    ({
      media: query,
      // Read on access, so a preference set after the query still shows.
      get matches() {
        return query === DARK_QUERY && prefersDark;
      },
      addEventListener: (_type: 'change', listener: ChangeListener) => {
        listeners.add(listener);
      },
      removeEventListener: (_type: 'change', listener: ChangeListener) => {
        listeners.delete(listener);
      },
      addListener: (listener: ChangeListener) => {
        listeners.add(listener);
      },
      removeListener: (listener: ChangeListener) => {
        listeners.delete(listener);
      },
      dispatchEvent: () => true,
      onchange: null,
    }) as unknown as MediaQueryList) as typeof window.matchMedia;
}

/** Change the system preference and tell everyone watching, as a browser would. */
export function setSystemPrefersDark(next: boolean): void {
  prefersDark = next;
  const event = { matches: next, media: DARK_QUERY } as MediaQueryListEvent;
  for (const listener of [...listeners]) listener(event);
}

export function resetMatchMedia(): void {
  prefersDark = false;
  listeners.clear();
}
