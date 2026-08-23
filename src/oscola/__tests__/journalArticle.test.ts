import { describe, expect, it } from 'vitest';
import { formatFootnote } from '../format';
import { formatCaseNoteFootnoteNamedInText } from '../format/journalArticle';
import { toPlainText } from '../../model/segments';
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

// Every citation asserted below is verbatim from OSCOLA 4th edn §3.3.2–3.3.4.
describe('case notes (3.3.2)', () => {
  // "Where there is no title, use the name of the case in italics instead, and
  // add (note) at the end of the citation."
  const ashworth = article({
    authors: [person('Andrew', 'Ashworth')],
    title: '',
    caseName: 'R (Singh) v Chief Constable of the West Midlands Police',
    isCaseNote: true,
    year: '2006',
    journal: 'Crim LR',
    firstPage: '441',
  });

  it('puts the case name in the title position and closes with (note)', () => {
    expect(footnote(ashworth)).toBe(
      "Andrew Ashworth, 'R (Singh) v Chief Constable of the West Midlands Police' [2006] Crim LR 441 (note).",
    );
  });

  it('italicises the case name but not the quotation marks', () => {
    expect(
      formatFootnote(ashworth)
        .filter((segment) => segment.style === 'italic')
        .map((segment) => segment.text),
    ).toEqual(['R (Singh) v Chief Constable of the West Midlands Police']);
  });

  // "If the case discussed in the note is identified in the text it is not
  // necessary to put the name of the case in the case-note citation as well."
  it('drops the case name where the text already identifies the case', () => {
    expect(toPlainText(formatCaseNoteFootnoteNamedInText(ashworth))).toBe(
      'Andrew Ashworth [2006] Crim LR 441 (note).',
    );
  });

  it('treats a case note that has its own title as an ordinary article', () => {
    const titled = article({ ...ashworth, caseName: undefined, title: 'Deference and Dignity' });
    expect(footnote(titled)).toBe("Andrew Ashworth, 'Deference and Dignity' [2006] Crim LR 441 (note).");
  });
});

describe('forthcoming articles (3.3.3)', () => {
  // "Cite forthcoming articles in the same way as published articles, following
  // the citation with '(forthcoming)'. If volume and/or page numbers are not
  // yet known, simply omit that information." No worked example is printed, so
  // this exercises the rule against an article of our own.
  it('closes with (forthcoming) and omits an unknown volume and page', () => {
    const source = article({
      authors: [person('Alison L', 'Young')],
      title: 'In Defence of Due Deference',
      year: '2009',
      journal: 'MLR',
      firstPage: '',
      forthcoming: true,
    });
    expect(footnote(source)).toBe("Alison L Young, 'In Defence of Due Deference' [2009] MLR (forthcoming).");
  });

  it('keeps a volume and page that are known', () => {
    const source = article({
      authors: [person('Alison L', 'Young')],
      title: 'In Defence of Due Deference',
      year: '2009',
      volume: '72',
      journal: 'MLR',
      firstPage: '554',
      forthcoming: true,
    });
    expect(footnote(source)).toBe(
      "Alison L Young, 'In Defence of Due Deference' (2009) 72 MLR 554 (forthcoming).",
    );
  });
});

describe('online journals (3.3.4)', () => {
  // "Follow the citation with the web address (in angled brackets) and the date
  // you most recently accessed the article."
  it('appends the address and access date, with no page where there is none', () => {
    const greenleaf = article({
      authors: [person('Graham', 'Greenleaf')],
      title: 'The Global Development of Free Access to Legal Information',
      year: '2010',
      volume: '1',
      issue: '1',
      journal: 'EJLT',
      firstPage: '',
      url: 'http://ejlt.org/article/view/17',
      accessDate: '2010-07-27',
    });
    expect(footnote(greenleaf)).toBe(
      "Graham Greenleaf, 'The Global Development of Free Access to Legal Information' (2010) 1(1) EJLT <http://ejlt.org/article/view/17> accessed 27 July 2010.",
    );
  });

  it('keeps a page where the journal has one', () => {
    const boyle = article({
      authors: [person('James', 'Boyle')],
      title: 'A Manifesto on WIPO and the Future of Intellectual Property',
      year: '2004',
      journal: 'Duke L & Tech Rev',
      firstPage: '0009',
      url: 'www.law.duke.edu/journals/dltr/articles/2004dltr0009.html',
      accessDate: '2009-11-18',
    });
    // The guide prints this example's year bare, as `2004 Duke L & Tech Rev`,
    // following the journal's own citation advice (3.3.4). Thetis does not
    // model a bare year, so the year takes the square brackets 3.3.1 gives a
    // journal with no volume.
    expect(footnote(boyle)).toBe(
      "James Boyle, 'A Manifesto on WIPO and the Future of Intellectual Property' [2004] Duke L & Tech Rev 0009 <www.law.duke.edu/journals/dltr/articles/2004dltr0009.html> accessed 18 November 2009.",
    );
  });

  // "Pinpoints follow the citation and come before the web address."
  it('puts a pinpoint before the web address', () => {
    const source = article({
      authors: [person('Graham', 'Greenleaf')],
      title: 'Free Access',
      year: '2010',
      volume: '1',
      journal: 'EJLT',
      firstPage: '3',
      pinpoint: { kind: 'page', value: '7' },
      url: 'http://ejlt.org/article/view/17',
      accessDate: '2010-07-27',
    });
    expect(footnote(source)).toBe(
      "Graham Greenleaf, 'Free Access' (2010) 1 EJLT 3, 7 <http://ejlt.org/article/view/17> accessed 27 July 2010.",
    );
  });

  it('carries the address into the bibliography but drops the pinpoint', () => {
    const source = article({
      authors: [person('Graham', 'Greenleaf')],
      title: 'Free Access',
      year: '2010',
      volume: '1',
      journal: 'EJLT',
      firstPage: '3',
      pinpoint: { kind: 'page', value: '7' },
      url: 'http://ejlt.org/article/view/17',
      accessDate: '2010-07-27',
    });
    expect(bibliography(source)).toBe(
      "Greenleaf G, 'Free Access' (2010) 1 EJLT 3 <http://ejlt.org/article/view/17> accessed 27 July 2010",
    );
  });
});
