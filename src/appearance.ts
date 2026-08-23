/**
 * How Themis looks: a theme and a typeface, both the reader's choice.
 *
 * Neither touches a citation, and that is the point of keeping them here rather
 * than anywhere near `src/oscola` or `src/harvard`. This module decides *which*
 * palette and *which* typeface; the palettes and the font stacks themselves
 * live in `styles.css`, keyed off two attributes on the root element.
 * `appearance.test.ts` checks that every choice offered here has a rule there,
 * because a choice with no stylesheet behind it fails silently.
 */

export type Theme = 'light' | 'dark' | 'system';

/** What `system` becomes once the browser has been asked. */
export type ResolvedTheme = 'light' | 'dark';

export type Typeface = 'georgia' | 'times' | 'arial' | 'verdana';

export interface Appearance {
  readonly theme: Theme;
  readonly typeface: Typeface;
}

/** Follow the system by default: a reader who wants dark has usually said so once, to their OS. */
export const DEFAULT_APPEARANCE: Appearance = { theme: 'system', typeface: 'georgia' };

export const THEMES: ReadonlyArray<{ readonly value: Theme; readonly label: string }> = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'Match my system' },
];

/**
 * Faces the machine already has — nothing is downloaded, so the choice works
 * offline and costs no request. Georgia is the house face; Times New Roman is
 * what most essays are set in; Arial and Verdana are there because the OU's own
 * accessibility guidance names them, Verdana for its wide letterforms.
 */
export const TYPEFACES: ReadonlyArray<{ readonly value: Typeface; readonly label: string }> = [
  { value: 'georgia', label: 'Georgia' },
  { value: 'times', label: 'Times New Roman' },
  { value: 'arial', label: 'Arial' },
  { value: 'verdana', label: 'Verdana' },
];

export const isTheme = (value: unknown): value is Theme =>
  THEMES.some((theme) => theme.value === value);

export const isTypeface = (value: unknown): value is Typeface =>
  TYPEFACES.some((face) => face.value === value);

const DARK_QUERY = '(prefers-color-scheme: dark)';

/**
 * Browser chrome follows the page, so a phone's address bar does not stay pale
 * above a dark page. These two must match `--bg` in `styles.css`.
 */
const THEME_COLOUR: Record<ResolvedTheme, string> = { light: '#fbfaf8', dark: '#16140f' };

export function resolveTheme(theme: Theme, systemPrefersDark: boolean): ResolvedTheme {
  if (theme === 'system') return systemPrefersDark ? 'dark' : 'light';
  return theme;
}

/**
 * What the browser says about the system theme. An environment that cannot
 * answer — no `window`, or no `matchMedia` — is taken to mean light rather than
 * throwing, so the app still renders.
 */
export function systemPrefersDark(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia(DARK_QUERY).matches;
}

/**
 * Watch for the system theme changing under a reader who chose `system` —
 * sunset on a laptop set to switch automatically. Returns the unsubscribe;
 * where matchMedia is missing it subscribes to nothing and says so by handing
 * back a no-op.
 */
export function watchSystemTheme(onChange: (prefersDark: boolean) => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {};
  const query = window.matchMedia(DARK_QUERY);
  const listener = (event: MediaQueryListEvent) => onChange(event.matches);
  query.addEventListener('change', listener);
  return () => query.removeEventListener('change', listener);
}

/** Write the choice onto the document, where the stylesheet can see it. */
export function applyAppearance(
  appearance: Appearance,
  prefersDark: boolean,
  root: HTMLElement = document.documentElement,
): void {
  const resolved = resolveTheme(appearance.theme, prefersDark);
  root.dataset.theme = resolved;
  root.dataset.typeface = appearance.typeface;
  const meta = root.ownerDocument.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', THEME_COLOUR[resolved]);
}
