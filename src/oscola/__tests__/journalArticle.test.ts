import { describe, expect, it } from 'vitest';
import { formatFootnote } from '../format';
import type { JournalArticleSource } from '../../model/types';
import { bibliography, footnote, person } from './helpers';

const article = (
  fields: Omit<JournalArticleSource, 'id' | 'type'>,
): JournalArticleSource => ({ id: 'j1', type: 'journalArticle', ...fields });

const craig = article({
  authors: [person('Paul', 'Craig')],
  title: 'Theory, "Pure Theory" and Values in Public Law',
  year: '2005',
  journal: 'PL',
  firstPage: '440',
});

const young = article({
  authors: [person('Alison L', 'Young')],
  title: 'In Defence of Due Deference',
  year: '2009',
  volume: '72',
  journal: 'MLR',
  firstPage: '554',
});

// Examples taken from the OSCOLA 4th edn quick reference guide.
describe('journal articles — OSCOLA 4th edn examples', () => {
  it('uses square brackets round the year where the journal has no volume', () => {
    expect(footnote(craig)).toBe(
      "Paul Craig, 'Theory, \"Pure Theory\" and Values in Public Law' [2005] PL 440.",
    );
  });

  it('uses round brackets round the year where there is a volume number', () => {
    expect(footnote(young)).toBe(
      "Alison L Young, 'In Defence of Due Deference' (2009) 72 MLR 554.",
    );
  });

  it('puts a comma between the first page and the page pinpoint (quick reference guide)', () => {
    const griffith = article({
      authors: [person('JAG', 'Griffith')],
      title: 'The Common Law and the Political Constitution',
      year: '2001',
      volume: '117',
      journal: 'LQR',
      firstPage: '42',
      pinpoint: { kind: 'page', value: '64' },
    });

    expect(footnote(griffith)).toBe(
      "JAG Griffith, 'The Common Law and the Political Constitution' (2001) 117 LQR 42, 64.",
    );
    // A given name that is already an initialism must survive inversion intact.
    expect(bibliography(griffith)).toBe(
      "Griffith JAG, 'The Common Law and the Political Constitution' (2001) 117 LQR 42",
    );
  });

  it('cites a pinpoint page after the first page', () => {
    expect(footnote({ ...young, pinpoint: { kind: 'page', value: '560' } })).toBe(
      "Alison L Young, 'In Defence of Due Deference' (2009) 72 MLR 554, 560.",
    );
  });

  it('cites a second pinpointed article (3.3.1)', () => {
    const waldron = article({
      authors: [person('Jeremy', 'Waldron')],
      title: 'The Core of the Case against Judicial Review',
      year: '2006',
      volume: '115',
      journal: 'Yale LJ',
      firstPage: '1346',
      pinpoint: { kind: 'page', value: '1372' },
    });

    expect(footnote(waldron)).toBe(
      "Jeremy Waldron, 'The Core of the Case against Judicial Review' (2006) 115 Yale LJ 1346, 1372.",
    );
  });

  // 3.3.1: the article title is "in roman within single quotation marks" and
  // the journal name is "in roman" too, so nothing in the citation is italic.
  it('italicises nothing', () => {
    expect(formatFootnote(young).every((seg) => seg.style === 'plain')).toBe(true);
  });

  it('brackets an issue number after the volume', () => {
    expect(footnote({ ...young, issue: '3' })).toBe(
      "Alison L Young, 'In Defence of Due Deference' (2009) 72(3) MLR 554.",
    );
  });
});

describe('journal articles — bibliography', () => {
  it('inverts the author and reduces given names to initials', () => {
    expect(bibliography(craig)).toBe(
      "Craig P, 'Theory, \"Pure Theory\" and Values in Public Law' [2005] PL 440",
    );
  });

  it('runs multiple initials together without spaces or full stops', () => {
    expect(bibliography(young)).toBe(
      "Young AL, 'In Defence of Due Deference' (2009) 72 MLR 554",
    );
  });

  it('drops the pinpoint', () => {
    expect(bibliography({ ...young, pinpoint: { kind: 'page', value: '560' } })).toBe(
      "Young AL, 'In Defence of Due Deference' (2009) 72 MLR 554",
    );
  });
});

describe('journal articles — multiple authors', () => {
  const many = (...names: Array<[string, string]>) =>
    article({ ...young, authors: names.map(([g, s]) => person(g, s)) });

  it('joins two authors with "and"', () => {
    expect(footnote(many(['Alison', 'Young'], ['Paul', 'Craig']))).toContain(
      'Alison Young and Paul Craig,',
    );
  });

  it('joins three authors with commas and a final "and"', () => {
    expect(
      footnote(many(['Alison', 'Young'], ['Paul', 'Craig'], ['Sarah', 'Cole'])),
    ).toContain('Alison Young, Paul Craig and Sarah Cole,');
  });

  it('reduces four or more authors to the first plus "and others"', () => {
    expect(
      footnote(
        many(['Alison', 'Young'], ['Paul', 'Craig'], ['Sarah', 'Cole'], ['Gareth', 'Jones']),
      ),
    ).toContain('Alison Young and others,');
  });

  it('inverts only in the bibliography, keeping "and others"', () => {
    expect(
      bibliography(
        many(['Alison L', 'Young'], ['Paul', 'Craig'], ['Sarah', 'Cole'], ['Gareth', 'Jones']),
      ),
    ).toContain('Young AL and others,');
  });
});
