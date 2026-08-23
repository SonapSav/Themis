import { describe, expect, it } from 'vitest';
import {
  exportFilename,
  fingerprint,
  mergeSources,
  nextIds,
  parseImport,
  toExportJson,
} from './transfer';
import type { Source } from '../model/types';

const page: Source = {
  id: 's1',
  type: 'case',
  caseName: 'Page v Smith',
  report: { year: '1996', yearFormat: 'square', abbreviation: 'AC', firstPage: '155' },
  court: 'HL',
};
const bunt: Source = {
  id: 's2',
  type: 'case',
  caseName: 'Bunt v Tilley',
  neutral: { year: '2006', court: 'EWHC', number: '407', division: 'QB' },
};

const NOW = new Date('2026-08-22T14:30:00.000Z');

describe('export', () => {
  it('writes a self-describing file', () => {
    const parsed = JSON.parse(toExportJson({ mode: 'oscola', sources: [page] }, NOW));
    expect(parsed).toMatchObject({
      format: 'themis-library',
      version: 1,
      exportedAt: '2026-08-22T14:30:00.000Z',
      mode: 'oscola',
      sources: [page],
    });
  });

  it('dates the filename so successive backups sort together', () => {
    expect(exportFilename(NOW)).toBe('themis-sources-2026-08-22.json');
  });
});

describe('import', () => {
  const valid = toExportJson({ mode: 'oscola', sources: [page, bunt] }, NOW);

  it('reads back what export wrote', () => {
    expect(parseImport(valid)).toEqual({
      ok: true, mode: 'oscola', sources: [page, bunt], dropped: 0,
    });
  });

  it('rejects content that is not JSON', () => {
    expect(parseImport('nonsense {')).toEqual({
      ok: false, error: 'That file is not valid JSON.',
    });
  });

  it('rejects JSON that is not a Themis export', () => {
    expect(parseImport('{"some":"object"}')).toMatchObject({ ok: false });
    expect(parseImport('{"some":"object"}')).toHaveProperty(
      'error', 'That does not look like a Themis export.',
    );
  });

  it('rejects an export from another version', () => {
    const other = JSON.stringify({ format: 'themis-library', version: 99, sources: [] });
    expect(parseImport(other)).toMatchObject({ ok: false });
  });

  it('reports entries it had to drop rather than failing the whole import', () => {
    const mixed = JSON.stringify({
      format: 'themis-library', version: 1, mode: 'oscola',
      sources: [page, null, { type: 'notAType' }, 'nope'],
    });
    expect(parseImport(mixed)).toEqual({ ok: true, mode: 'oscola', sources: [page], dropped: 3 });
  });
});

describe('identity and ids', () => {
  it('treats two sources with the same content as one, whatever their ids', () => {
    expect(fingerprint(page)).toBe(fingerprint({ ...page, id: 'different' }));
    expect(fingerprint(page)).not.toBe(fingerprint({ ...page, court: 'CA' }));
  });

  it('is not confused by key order', () => {
    const reordered = { court: 'HL', report: page.report, caseName: 'Page v Smith', type: 'case', id: 'z' } as Source;
    expect(fingerprint(reordered)).toBe(fingerprint(page));
  });

  it('continues ids past the highest in use, not the count', () => {
    // s2 removed: counting entries would reissue s2 and collide.
    expect(nextIds([page, { ...bunt, id: 's5' }], 2)).toEqual(['s6', 's7']);
    expect(nextIds([], 1)).toEqual(['s1']);
  });
});

describe('merging', () => {
  it('adds to the library rather than replacing it', () => {
    const result = mergeSources([page], [bunt]);
    expect(result.sources.map((s) => (s.type === 'case' ? s.caseName : ''))).toEqual([
      'Page v Smith',
      'Bunt v Tilley',
    ]);
    expect(result).toMatchObject({ added: 1, duplicates: 0 });
  });

  it('skips sources already held, even under a different id', () => {
    const result = mergeSources([page], [{ ...page, id: 'elsewhere' }, bunt]);
    expect(result).toMatchObject({ added: 1, duplicates: 1 });
    expect(result.sources).toHaveLength(2);
  });

  it('re-keys incoming sources so ids cannot collide', () => {
    const result = mergeSources([page], [{ ...bunt, id: 's1' }]);
    expect(result.sources.map((s) => s.id)).toEqual(['s1', 's2']);
  });

  it('drops duplicates within the incoming file too', () => {
    const result = mergeSources([], [bunt, { ...bunt, id: 'other' }]);
    expect(result).toMatchObject({ added: 1, duplicates: 1 });
  });
});
