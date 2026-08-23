// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  DEFAULT_APPEARANCE,
  THEMES,
  TYPEFACES,
  applyAppearance,
  isTheme,
  isTypeface,
  resolveTheme,
  systemPrefersDark,
  watchSystemTheme,
} from './appearance';
import { setSystemPrefersDark } from './test/matchMedia';

// Read from disk rather than imported: this asserts what the stylesheet says,
// and under jsdom `import.meta.url` is an http URL that `readFileSync` refuses.
const css = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8');

/** The declarations inside the first block matching a selector. */
function block(selector: string): string {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) return '';
  return css.slice(start, css.indexOf('}', start));
}

/** The custom properties a block sets, and their values. */
function customProperties(selector: string): Record<string, string> {
  const found: Record<string, string> = {};
  for (const [, name, value] of block(selector).matchAll(/(--[\w-]+):\s*([^;]+);/g)) {
    found[name!] = value!.trim();
  }
  return found;
}

describe('resolving a theme', () => {
  it('takes an explicit choice at its word, whatever the system says', () => {
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });

  it('follows the system when asked to', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
  });
});

describe('reading the system preference', () => {
  it('reports what the browser says', () => {
    expect(systemPrefersDark()).toBe(false);
    setSystemPrefersDark(true);
    expect(systemPrefersDark()).toBe(true);
  });

  it('reports light where the browser cannot be asked', () => {
    const original = window.matchMedia;
    // Safari before 14, and jsdom itself: absence must not throw.
    (window as { matchMedia?: unknown }).matchMedia = undefined;
    try {
      expect(systemPrefersDark()).toBe(false);
    } finally {
      window.matchMedia = original;
    }
  });

  it('reports a change, and stops once unsubscribed', () => {
    const seen: boolean[] = [];
    const unsubscribe = watchSystemTheme((prefersDark) => seen.push(prefersDark));
    setSystemPrefersDark(true);
    setSystemPrefersDark(false);
    unsubscribe();
    setSystemPrefersDark(true);
    expect(seen).toEqual([true, false]);
  });

  it('subscribes to nothing where the browser cannot be asked', () => {
    const original = window.matchMedia;
    (window as { matchMedia?: unknown }).matchMedia = undefined;
    try {
      expect(() => watchSystemTheme(() => {})()).not.toThrow();
    } finally {
      window.matchMedia = original;
    }
  });
});

describe('applying an appearance', () => {
  it('writes the resolved theme and the typeface onto the root', () => {
    const root = document.documentElement;
    applyAppearance({ theme: 'system', typeface: 'verdana' }, true, root);
    expect(root.dataset.theme).toBe('dark');
    expect(root.dataset.typeface).toBe('verdana');

    applyAppearance({ theme: 'light', typeface: 'times' }, true, root);
    expect(root.dataset.theme).toBe('light');
    expect(root.dataset.typeface).toBe('times');
  });

  it('moves the browser chrome colour with the page', () => {
    const meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.append(meta);
    try {
      applyAppearance({ theme: 'dark', typeface: 'georgia' }, false, document.documentElement);
      expect(meta.getAttribute('content')).toBe(customProperties(":root[data-theme='dark']")['--bg']);

      applyAppearance({ theme: 'light', typeface: 'georgia' }, false, document.documentElement);
      expect(meta.getAttribute('content')).toBe(customProperties(':root')['--bg']);
    } finally {
      meta.remove();
    }
  });

  it('does not require the chrome colour to be there at all', () => {
    expect(() =>
      applyAppearance(DEFAULT_APPEARANCE, false, document.documentElement),
    ).not.toThrow();
  });
});

describe('the offered choices', () => {
  it('recognises its own values and nothing else', () => {
    expect(THEMES.every((theme) => isTheme(theme.value))).toBe(true);
    expect(TYPEFACES.every((face) => isTypeface(face.value))).toBe(true);
    expect(isTheme('sepia')).toBe(false);
    expect(isTypeface('Comic Sans')).toBe(false);
    expect(isTheme(undefined)).toBe(false);
  });

  it('defaults to a choice it recognises', () => {
    expect(isTheme(DEFAULT_APPEARANCE.theme)).toBe(true);
    expect(isTypeface(DEFAULT_APPEARANCE.typeface)).toBe(true);
  });

  // A typeface with no stylesheet rule behind it changes nothing, silently.
  it('has a font stack in the stylesheet for every typeface offered', () => {
    for (const face of TYPEFACES) {
      expect(customProperties(`:root[data-typeface='${face.value}']`)).toHaveProperty('--font-body');
    }
  });

  // The real drift risk: a colour added to one theme and forgotten in the other.
  // Only colours are checked — --radius is shape, and is deliberately shared.
  it('gives every light colour a dark counterpart', () => {
    const light = customProperties(':root');
    const dark = customProperties(":root[data-theme='dark']");
    const colours = Object.keys(light).filter((name) => light[name]!.startsWith('#'));
    expect(colours.length).toBeGreaterThan(0);
    expect(colours.filter((name) => !(name in dark))).toEqual([]);
  });
});
