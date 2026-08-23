/**
 * Browser-local persistence for the appearance choice.
 *
 * Kept under its own key, apart from the library: clearing the library is about
 * sources, and should not also throw away the theme someone reads in.
 */
import {
  DEFAULT_APPEARANCE,
  isTheme,
  isTypeface,
  type Appearance,
} from '../appearance';
import { storage } from './storage';

const KEY = 'themis.appearance';
const VERSION = 1;

interface Persisted extends Appearance {
  readonly version: number;
}

export function load(): Appearance | undefined {
  const store = storage();
  if (!store) return undefined;
  try {
    const raw = store.getItem(KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as Partial<Persisted>;
    if (parsed?.version !== VERSION) return undefined;
    // Each half falls back on its own: an unreadable typeface should not also
    // cost the reader their theme.
    return {
      theme: isTheme(parsed.theme) ? parsed.theme : DEFAULT_APPEARANCE.theme,
      typeface: isTypeface(parsed.typeface) ? parsed.typeface : DEFAULT_APPEARANCE.typeface,
    };
  } catch {
    return undefined;
  }
}

export function save(appearance: Appearance): void {
  const store = storage();
  if (!store) return;
  try {
    const payload: Persisted = { version: VERSION, ...appearance };
    store.setItem(KEY, JSON.stringify(payload));
  } catch {
    // A full quota or a blocked write is not worth interrupting anyone for; the
    // session keeps the choice in memory and forgets it on reload.
  }
}
