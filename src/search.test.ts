import { describe, expect, it } from 'vitest';
import { filterLibrary, matchesQuery, normalise, searchText, typesPresent } from './search';
import type { Source } from './citations';

/**
 * Search is a UI convenience, not a citation rule: it matches against the
 * citations the formatters already produce. The fixtures below are the same
 * worked examples the engine tests use, so what is searched here is the text
 * OSCOLA and Cite Them Right actually print.
 */

// OSCOLA 1.2.2.
const ashworth: Source = {
  id: 'b1',
  type: 'book',
  authors: [{ kind: 'person', given: 'Andrew', surname: 'Ashworth' }],
  authorRole: 'author',
  title: 'Principles of Criminal Law',
  edition: '6',
  publisher: 'OUP',
  year: '2009',
  pinpoint: { kind: 'page', value: '68' },
};

// Quick reference guide.
const hobbes: Source = {
  id: 'b2',
  type: 'book',
  authors: [{ kind: 'person', given: 'Thomas', surname: 'Hobbes' }],
  authorRole: 'author',
  title: 'Leviathan',
  firstPublished: '1651',
  publisher: 'Penguin',
  year: '1985',
};

const pageVSmith: Source = {
  id: 'c1',
  type: 'case',
  caseName: 'Page v Smith',
  report: { year: '1996', yearFormat: 'square', abbreviation: 'AC', firstPage: '155' },
  court: 'HL',
};

// OSCOLA 2.2.1.
const hra: Source = {
  id: 'a1',
  type: 'act',
  shortTitle: 'Human Rights Act',
  year: '1998',
  provision: 's 15(1)(b)',
};

// Synthetic: the guide's own article examples carry no apostrophe inside the
// title, and the quotation marks around it are what this exercises.
const goodbye: Source = {
  id: 'j1',
  type: 'journalArticle',
  authors: [{ kind: 'person', given: 'Alison', surname: 'Dunn' }],
  title: 'The Long Goodbye',
  year: '2008',
  volume: '71',
  journal: 'MLR',
  firstPage: '523',
};

const library: readonly Source[] = [pageVSmith, ashworth, hra, goodbye, hobbes];

const ids = (found: readonly Source[]) => found.map((s) => s.id);
const search = (query: string, mode: 'oscola' | 'ou-dual' = 'oscola') =>
  ids(filterLibrary(library, mode, { query }));

describe('normalising what is typed against what is printed', () => {
  it('folds case, accents and surrounding space', () => {
    expect(normalise('  Bénédicte  SAGE-Fuller ')).toBe('benedicte sage-fuller');
  });

  it('folds the typographic characters citations print but keyboards lack', () => {
    // ‘…’ around an article title (3.3.1), and an en dash in a page range.
    expect(normalise('‘The Long Goodbye’ 523–45')).toBe("'the long goodbye' 523-45");
  });
});

describe('what is searched', () => {
  it('searches the footnote and the bibliography entry together', () => {
    // The footnote prints the author as written, the bibliography inverts it
    // (1.7). Either is a fair thing to type.
    expect(matchesQuery(ashworth, 'oscola', 'Andrew Ashworth')).toBe(true);
    expect(matchesQuery(ashworth, 'oscola', 'Ashworth A,')).toBe(true);
  });

  it('searches the text of the current scheme, not of the other one', () => {
    // Under the OU scheme the same book is Harvard: `Ashworth, A. (2009)`.
    expect(matchesQuery(ashworth, 'ou-dual', 'Ashworth, A.')).toBe(true);
    expect(matchesQuery(ashworth, 'oscola', 'Ashworth, A.')).toBe(false);
  });

  it('searches the in-text citation as well as the reference (Harvard)', () => {
    expect(matchesQuery(ashworth, 'ou-dual', 'p. 68')).toBe(true);
  });

  it('searches the type as named in the form', () => {
    expect(searchText(hra, 'oscola')).toContain('uk act of parliament');
  });
});

describe('matching', () => {
  it('ignores case and typographic quotation marks', () => {
    expect(search("'the long goodbye'")).toEqual(['j1']);
  });

  it('requires every term, in any order', () => {
    expect(search('ashworth criminal')).toEqual(['b1']);
    expect(search('criminal ashworth')).toEqual(['b1']);
    expect(search('ashworth leviathan')).toEqual([]);
  });

  it('matches part of a word, so a half-remembered name still finds it', () => {
    expect(search('levia')).toEqual(['b2']);
  });

  it('returns the whole library, in order, for an empty query', () => {
    expect(search('   ')).toEqual(['c1', 'b1', 'a1', 'j1', 'b2']);
  });

  it('finds nothing rather than everything when nothing matches', () => {
    expect(search('donoghue')).toEqual([]);
  });
});

describe('filtering', () => {
  it('filters by type', () => {
    expect(ids(filterLibrary(library, 'oscola', { type: 'book' }))).toEqual(['b1', 'b2']);
  });

  it('filters by category, so the legal sources can be seen alone', () => {
    expect(ids(filterLibrary(library, 'oscola', { category: 'legal' }))).toEqual(['c1', 'a1']);
    expect(ids(filterLibrary(library, 'oscola', { category: 'academic' }))).toEqual([
      'b1',
      'j1',
      'b2',
    ]);
  });

  it('narrows by every criterion given at once', () => {
    expect(
      ids(filterLibrary(library, 'oscola', { query: '2009', category: 'academic', type: 'book' })),
    ).toEqual(['b1']);
    // The same query with a type that excludes it.
    expect(
      ids(filterLibrary(library, 'oscola', { query: '2009', type: 'journalArticle' })),
    ).toEqual([]);
  });

  it('offers only the types the library holds, in the order the form lists them', () => {
    expect(typesPresent(library)).toEqual(['case', 'act', 'journalArticle', 'book']);
    expect(typesPresent([])).toEqual([]);
  });
});
