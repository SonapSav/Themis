import { describe, expect, it } from 'vitest';
import { formatAuthorsBibliography, formatAuthorsFootnote, initials } from '../authors';
import { formatDayMonthYear } from '../../model/dates';
import { formatEdition, ordinal } from '../../model/ordinals';
import { person } from './helpers';

describe('initials', () => {
  it('takes the first letter of each given name', () => {
    expect(initials('Alison L')).toBe('AL');
    expect(initials('Paul')).toBe('P');
  });

  it('keeps hyphenated given names hyphenated', () => {
    expect(initials('Jean-Paul')).toBe('J-P');
  });

  it('ignores full stops already typed by the student', () => {
    expect(initials('A. L.')).toBe('AL');
  });

  // OSCOLA 4th edn gives "HLA Hart" in a footnote and "Hart HLA" in the
  // bibliography, so an initialism must not be reduced any further.
  it('keeps a given name that is already an initialism whole', () => {
    expect(initials('HLA')).toBe('HLA');
    expect(initials('JAG')).toBe('JAG');
  });
});

describe('author lists', () => {
  it('does not invert corporate authors', () => {
    const dwp = [{ kind: 'corporate', name: 'Law Commission' } as const];
    expect(formatAuthorsFootnote(dwp)).toBe('Law Commission');
    expect(formatAuthorsBibliography(dwp)).toBe('Law Commission');
  });

  it('marks a single editor "(ed)" and several "(eds)"', () => {
    expect(formatAuthorsFootnote([person('Peter', 'Cane')], 'editor')).toBe(
      'Peter Cane (ed)',
    );
    expect(
      formatAuthorsFootnote([person('Peter', 'Cane'), person('Joanne', 'Conaghan')], 'editor'),
    ).toBe('Peter Cane and Joanne Conaghan (eds)');
  });

  it('keeps "(eds)" plural when four or more editors collapse to "and others"', () => {
    const four = ['A', 'B', 'C', 'D'].map((s) => person('X', s));
    expect(formatAuthorsFootnote(four, 'editor')).toBe('X A and others (eds)');
  });

  it('returns an empty string for no authors', () => {
    expect(formatAuthorsFootnote([])).toBe('');
  });
});

describe('dates', () => {
  it('renders ISO dates in OSCOLA style with no ordinal suffix', () => {
    expect(formatDayMonthYear('2009-11-19')).toBe('19 November 2009');
    expect(formatDayMonthYear('2009-05-01')).toBe('1 May 2009');
  });

  it('passes non-ISO input through untouched rather than overriding the student', () => {
    expect(formatDayMonthYear('Spring 2009')).toBe('Spring 2009');
    expect(formatDayMonthYear('2009-13-01')).toBe('2009-13-01');
    expect(formatDayMonthYear(undefined)).toBe('');
  });
});

describe('editions', () => {
  it('forms English ordinals', () => {
    expect(['1', '2', '3', '4', '11', '12', '13', '21', '22'].map(ordinal)).toEqual([
      '1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd',
    ]);
  });

  it('omits first editions, which OSCOLA does not cite', () => {
    expect(formatEdition('1')).toBe('');
    expect(formatEdition('1st')).toBe('');
    expect(formatEdition(undefined)).toBe('');
    expect(formatEdition('  ')).toBe('');
  });

  it('appends "edn", not "ed", to later editions', () => {
    expect(formatEdition('7')).toBe('7th edn');
    expect(formatEdition('3rd')).toBe('3rd edn');
  });
});
