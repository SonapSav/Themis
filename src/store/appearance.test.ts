// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { load, save } from './appearance';
import { DEFAULT_APPEARANCE, type Appearance } from '../appearance';

const chosen: Appearance = { theme: 'dark', typeface: 'verdana' };

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('appearance persistence', () => {
  it('round-trips the choice', () => {
    save(chosen);
    expect(load()).toEqual(chosen);
  });

  it('returns nothing when the browser holds no choice', () => {
    expect(load()).toBeUndefined();
  });

  it('ignores a choice written by a different version', () => {
    localStorage.setItem('thetis.appearance', JSON.stringify({ version: 99, ...chosen }));
    expect(load()).toBeUndefined();
  });

  it('ignores unparseable content rather than throwing', () => {
    localStorage.setItem('thetis.appearance', 'not json {');
    expect(load()).toBeUndefined();
  });

  // Half a stored choice is still half a choice worth keeping.
  it('falls back per half, so a bad typeface does not cost the theme', () => {
    localStorage.setItem(
      'thetis.appearance',
      JSON.stringify({ version: 1, theme: 'dark', typeface: 'Comic Sans' }),
    );
    expect(load()).toEqual({ theme: 'dark', typeface: DEFAULT_APPEARANCE.typeface });
  });

  it('carries on when storage refuses the write', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });
    expect(() => save(chosen)).not.toThrow();
  });

  // Sources and appearance are separate keys on purpose.
  it('keeps the choice under its own key', () => {
    save(chosen);
    expect(localStorage.getItem('thetis.library')).toBeNull();
    expect(localStorage.getItem('thetis.appearance')).not.toBeNull();
  });
});
