// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { clear, load, save } from './library';
import type { Source } from '../model/types';

const page: Source = {
  id: 'c1',
  type: 'case',
  caseName: 'Page v Smith',
  report: { year: '1996', yearFormat: 'square', abbreviation: 'AC', firstPage: '155' },
  court: 'HL',
};

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('library persistence', () => {
  it('round-trips the mode and the sources', () => {
    save({ mode: 'oscola', sources: [page] });
    expect(load()).toEqual({ mode: 'oscola', sources: [page], footnotes: [] });
  });

  it('returns nothing when the browser holds no library', () => {
    expect(load()).toBeUndefined();
  });

  it('clears the stored library', () => {
    save({ mode: 'oscola', sources: [page] });
    clear();
    expect(load()).toBeUndefined();
  });

  it('ignores a library written by a different version', () => {
    localStorage.setItem('themis.library', JSON.stringify({ version: 99, mode: 'oscola', sources: [page] }));
    expect(load()).toBeUndefined();
  });

  it('ignores unparseable content rather than throwing', () => {
    localStorage.setItem('themis.library', 'not json {');
    expect(load()).toBeUndefined();
  });

  // A corrupt entry should cost the student that one source, not the library.
  it('drops malformed sources and keeps the sound ones', () => {
    localStorage.setItem(
      'themis.library',
      JSON.stringify({
        version: 1,
        mode: 'ou-dual',
        sources: [page, { id: 'x' }, null, 'nonsense', { id: 'y', type: 'notAType' }],
      }),
    );
    expect(load()).toEqual({ mode: 'ou-dual', sources: [page], footnotes: [] });
  });

  it('round-trips the footnote sequence', () => {
    const footnotes = [{ citations: [{ sourceId: 'c1', pinpoint: '110' }] }];
    save({ mode: 'oscola', sources: [page], footnotes });
    expect(load()?.footnotes).toEqual(footnotes);
  });

  it('reads a library written before footnotes were stored', () => {
    localStorage.setItem(
      'themis.library',
      JSON.stringify({ version: 1, mode: 'oscola', sources: [page] }),
    );
    expect(load()).toEqual({ mode: 'oscola', sources: [page], footnotes: [] });
  });

  it('falls back to the OU scheme when the stored mode is unrecognised', () => {
    localStorage.setItem('themis.library', JSON.stringify({ version: 1, mode: 'harvard', sources: [] }));
    expect(load()?.mode).toBe('ou-dual');
  });

  it('carries on when storage refuses a write', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });
    expect(() => save({ mode: 'oscola', sources: [page] })).not.toThrow();
  });

  it('carries on when storage refuses a read', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('SecurityError');
    });
    expect(load()).toBeUndefined();
  });
});
