import { describe, expect, it } from 'vitest';
import { assemble, tableOfCasesName } from './bibliography';
import { toPlainText } from './model/segments';
import type { BookSource, CitationMode, JournalArticleSource, Source } from './model/types';

const person = (given: string, surname: string) =>
  ({ kind: 'person', given, surname }) as const;

const lines = (sources: readonly Source[], mode: CitationMode, sectionId: string): string[] => {
  const section = assemble(sources, mode).sections.find((s) => s.id === sectionId);
  return (section?.entries ?? []).map((e) => toPlainText(e.citation));
};

const book = (id: string, fields: Partial<BookSource> & Pick<BookSource, 'title' | 'year'>): BookSource => ({
  id, type: 'book', authors: [], authorRole: 'author', publisher: 'OUP', ...fields,
});

const article = (
  id: string,
  fields: Partial<JournalArticleSource> & Pick<JournalArticleSource, 'title' | 'year'>,
): JournalArticleSource => ({
  id, type: 'journalArticle', authors: [], journal: 'LQR', firstPage: '1', ...fields,
});

// ---------------------------------------------------------------------------

describe('table of cases (OSCOLA 1.6.2)', () => {
  it('moves a leading Re or The to the end', () => {
    expect(tableOfCasesName("Re Farquar's Estate")).toBe("Farquar's Estate, Re");
    expect(tableOfCasesName('Re F (mental patient: sterilisation)')).toBe(
      'F (mental patient: sterilisation), Re',
    );
    expect(tableOfCasesName('The Starsin')).toBe('Starsin, The');
    expect(tableOfCasesName('Page v Smith')).toBe('Page v Smith');
  });

  it('orders by first significant word, not by the word Re', () => {
    const mk = (id: string, caseName: string): Source => ({
      id, type: 'case', caseName,
      report: { year: '1990', yearFormat: 'square', abbreviation: 'AC', firstPage: '1' },
      court: 'HL',
    });
    const sources = [mk('a', 'Page v Smith'), mk('b', "Re Farquar's Estate"), mk('c', 'Bunt v Tilley')];

    expect(lines(sources, 'oscola', 'cases').map((l) => l.split(' [')[0])).toEqual([
      'Bunt v Tilley',
      "Re Farquar's Estate",
      'Page v Smith',
    ]);
  });
});

describe('table of legislation (OSCOLA 1.6.3)', () => {
  it('orders alphabetically and puts statutory instruments after the statutes', () => {
    const sources: Source[] = [
      { id: 'si', type: 'statutoryInstrument', name: 'Eggs and Chicks (England) Regulations', year: '2009', siNumber: '2009/2163' },
      { id: 'a2', type: 'act', shortTitle: 'Theft Act', year: '1968' },
      { id: 'a1', type: 'act', shortTitle: 'Human Rights Act', year: '1998' },
    ];

    expect(lines(sources, 'oscola', 'legislation')).toEqual([
      'Human Rights Act 1998',
      'Theft Act 1968',
      'Eggs and Chicks (England) Regulations 2009, SI 2009/2163',
    ]);
  });
});

// The worked example in OSCOLA 1.7, reproduced entry for entry.
describe('bibliography (OSCOLA 1.7)', () => {
  const hart = person('HLA', 'Hart');
  const honore = person('AM', 'Honoré');
  const sources: Source[] = [
    book('b2', { authors: [hart], title: 'Punishment and Responsibility', year: '1968' }),
    book('b3', { authors: [hart, honore], title: 'Causation in the Law', edition: '2', year: '1985' }),
    article('j1', { authors: [hart], title: 'Varieties of Responsibility', year: '1967', volume: '83', firstPage: '346' }),
    book('b1', { authors: [hart], title: 'Law, Liberty and Morality', year: '1963' }),
    article('j2', { authors: [hart, honore], title: 'Causation in the Law', year: '1956', volume: '72', firstPage: '58, 260, 398' }),
  ];

  it('orders sole-authored works chronologically, then co-authored ones', () => {
    expect(lines(sources, 'oscola', 'bibliography')).toEqual([
      'Hart HLA, Law, Liberty and Morality (OUP 1963)',
      "—— 'Varieties of Responsibility' (1967) 83 LQR 346",
      '—— Punishment and Responsibility (OUP 1968)',
      "—— and Honoré AM, 'Causation in the Law' (1956) 72 LQR 58, 260, 398",
      '—— and Honoré AM, Causation in the Law (2nd edn, OUP 1985)',
    ]);
  });

  it('lists unattributed works first, by first major word of the title', () => {
    const withAnonymous: Source[] = [
      ...sources,
      book('x1', { title: 'The Bluebook', year: '2010' }),
      book('x2', { title: 'Analysing Law', year: '2008' }),
    ];
    const out = lines(withAnonymous, 'oscola', 'bibliography');

    // "The Bluebook" files under B, so it follows "Analysing Law".
    expect(out[0]).toBe('—— Analysing Law (OUP 2008)');
    expect(out[1]).toBe('—— The Bluebook (OUP 2010)');
    expect(out[2]).toBe('Hart HLA, Law, Liberty and Morality (OUP 1963)');
  });

  it('sorts authors by surname', () => {
    const withOthers: Source[] = [
      ...sources,
      book('c1', { authors: [person('Robert', 'Stevens')], title: 'Torts and Rights', year: '2007' }),
      book('c2', { authors: [person('Andrew', 'Burrows')], title: 'Remedies', year: '2004' }),
    ];
    const out = lines(withOthers, 'oscola', 'bibliography');

    expect(out[0]).toContain('Burrows A');
    expect(out[1]).toContain('Hart HLA');
    expect(out[out.length - 1]).toContain('Stevens R');
  });
});

describe('OU dual mode', () => {
  const bell = book('b', {
    authors: [person('J', 'Bell')], title: 'Doing your research project',
    publisher: 'Open University Press', year: '2014',
  });
  const page: Source = {
    id: 'c', type: 'case', caseName: 'Page v Smith',
    report: { year: '1996', yearFormat: 'square', abbreviation: 'AC', firstPage: '155' },
    court: 'HL',
  };

  it('produces a Harvard reference list and no OSCOLA tables', () => {
    const { sections } = assemble([bell, page], 'ou-dual');

    expect(sections.map((s) => s.id)).toEqual(['reference-list']);
    expect(lines([bell, page], 'ou-dual', 'reference-list')).toEqual([
      'Bell, J. (2014) Doing your research project. Open University Press.',
    ]);
  });

  it('says how many legal sources are footnote-only', () => {
    const { warnings } = assemble([bell, page], 'ou-dual');
    expect(warnings.join(' ')).toMatch(/1 legal source is cited in footnotes only/);
  });

  it('orders the reference list by author surname', () => {
    const adams = book('a', {
      authors: [person('D', 'Adams')], title: 'The hitchhiker’s guide', publisher: 'Pan', year: '1979',
    });
    expect(lines([bell, adams], 'ou-dual', 'reference-list').map((l) => l.split(',')[0])).toEqual([
      'Adams',
      'Bell',
    ]);
  });

  // Cite Them Right distinguishes these with a letter after the date, but the
  // OU's public guidance does not show that form, so Themis flags rather than guesses.
  it('warns when two sources share an author and year', () => {
    const other = book('b2', {
      authors: [person('J', 'Bell')], title: 'Another book',
      publisher: 'Open University Press', year: '2014',
    });
    const { warnings } = assemble([bell, other], 'ou-dual');
    expect(warnings.join(' ')).toMatch(/share an author and year \(bell, 2014\)/i);
  });
});

describe('empty state', () => {
  it('produces nothing at all for no sources', () => {
    expect(assemble([], 'oscola')).toEqual({ sections: [], warnings: [] });
  });
});
