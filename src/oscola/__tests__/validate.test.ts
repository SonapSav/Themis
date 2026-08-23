import { describe, expect, it } from 'vitest';
import { validate } from '../validate';
import type { CaseSource, JournalArticleSource, Source, StatutoryInstrumentSource } from '../../model/types';
import { person } from './helpers';

const messages = (source: Source) => validate(source).map((issue) => issue.message);

const fields = (source: Source, severity?: 'error' | 'warning') =>
  validate(source)
    .filter((issue) => !severity || issue.severity === severity)
    .map((issue) => issue.field);

const modernCase: CaseSource = {
  id: 'c1',
  type: 'case',
  caseName: 'Corr v IBC Vehicles Ltd',
  neutral: { year: '2008', court: 'UKHL', number: '13' },
};

describe('validation — cases', () => {
  it('accepts a case with a neutral citation alone', () => {
    expect(validate(modernCase)).toEqual([]);
  });

  it('rejects a case with neither a neutral citation nor a report', () => {
    const { neutral: _neutral, ...rest } = modernCase;
    expect(fields(rest as CaseSource, 'error')).toContain('report');
  });

  it('warns when a post-2001 case has no neutral citation', () => {
    const source: CaseSource = {
      id: 'c2',
      type: 'case',
      caseName: 'Gray v Thames Trains Ltd',
      report: {
        year: '2009', yearFormat: 'square', volume: '1', abbreviation: 'AC', firstPage: '1339',
      },
      court: 'HL',
    };
    expect(fields(source, 'warning')).toContain('neutral');
  });

  it('does not ask an older case for a neutral citation', () => {
    const source: CaseSource = {
      id: 'c3',
      type: 'case',
      caseName: 'Page v Smith',
      report: { year: '1996', yearFormat: 'square', abbreviation: 'AC', firstPage: '155' },
      court: 'HL',
    };
    expect(fields(source)).toEqual([]);
  });

  it('accepts an unreported case cited by court and date (2.1.4)', () => {
    const source: CaseSource = {
      id: 'c6', type: 'case', caseName: 'Stubbs v Sayer',
      court: 'CA', judgmentDate: '1990-11-08',
    };
    expect(fields(source)).toEqual([]);
  });

  it('asks an unreported case for the court that decided it', () => {
    const source: CaseSource = {
      id: 'c7', type: 'case', caseName: 'Stubbs v Sayer', judgmentDate: '1990-11-08',
    };
    expect(fields(source, 'error')).toContain('court');
  });

  it('still asks a post-2001 unreported case for a neutral citation', () => {
    const source: CaseSource = {
      id: 'c8', type: 'case', caseName: 'Smith v Jones',
      court: 'CA', judgmentDate: '2010-05-04',
    };
    expect(fields(source, 'warning')).toContain('neutral');
  });

  it('warns when a report-only citation gives no court', () => {
    const source: CaseSource = {
      id: 'c4',
      type: 'case',
      caseName: 'Page v Smith',
      report: { year: '1996', yearFormat: 'square', abbreviation: 'AC', firstPage: '155' },
    };
    expect(fields(source, 'warning')).toContain('court');
  });

  it('warns that a court entered with a neutral citation will not be cited (2.1.5)', () => {
    expect(fields({ ...modernCase, court: 'HL' }, 'warning')).toContain('court');
  });

  it('does not ask a pre-1865 case for a court (2.1.5)', () => {
    const source: CaseSource = {
      id: 'c5',
      type: 'case',
      caseName: 'Hadley v Baxendale',
      report: { year: '1854', yearFormat: 'round', volume: '9', abbreviation: 'Ex', firstPage: '341' },
    };
    expect(fields(source)).toEqual([]);
  });

  it('warns when the case name has no "v"', () => {
    expect(fields({ ...modernCase, caseName: 'Corr and IBC Vehicles Ltd' }, 'warning'))
      .toContain('caseName');
  });
});

describe('validation — other types', () => {
  it('requires a volume-less journal article to be deliberate', () => {
    const source: Source = {
      id: 'j1',
      type: 'journalArticle',
      authors: [person('Paul', 'Craig')],
      title: 'Theory',
      year: '2005',
      journal: 'PL',
      firstPage: '440',
    };
    expect(fields(source, 'warning')).toContain('volume');
    expect(fields(source, 'error')).toEqual([]);
  });

  it('warns that a book place of publication will not be used', () => {
    const source: Source = {
      id: 'b1',
      type: 'book',
      authors: [person('Gareth', 'Jones')],
      authorRole: 'author',
      title: 'Goff and Jones',
      publisher: 'Sweet & Maxwell',
      year: '2007',
      place: 'London',
    };
    expect(fields(source, 'warning')).toContain('place');
  });

  it('warns when an Act short title repeats the year', () => {
    const source: Source = {
      id: 'a1', type: 'act', shortTitle: 'Human Rights Act 1998', year: '1998',
    };
    expect(fields(source, 'warning')).toContain('shortTitle');
  });

  it('requires a URL and an access date for a web page', () => {
    const source: Source = {
      id: 'w1', type: 'website', authors: [], title: 'Something', url: '', accessDate: '',
    };
    expect(fields(source, 'error')).toEqual(
      expect.arrayContaining(['url', 'accessDate']),
    );
  });

  // OSCOLA 3.1.4: include "http://" only where the address does not begin
  // with "www". The guide's own example is <www.nakedlaw.com/...>.
  const page = (url: string): Source => ({
    id: 'w2',
    type: 'website',
    authors: [person('Sarah', 'Cole')],
    title: 'Something',
    url,
    accessDate: '2009-11-19',
  });

  it('accepts a "www" address with no scheme', () => {
    expect(fields(page('www.example.com'))).toEqual([]);
  });

  it('warns that "http://" is redundant before "www"', () => {
    expect(fields(page('http://www.example.com'), 'warning')).toContain('url');
  });

  it('accepts a non-"www" address that carries a scheme', () => {
    expect(fields(page('http://ejlt.org/article/view/17'))).toEqual([]);
  });

  it('warns when a non-"www" address has no scheme', () => {
    expect(fields(page('ejlt.org/article/view/17'), 'warning')).toContain('url');
  });
});

describe('validation — statutory instruments (2.5)', () => {
  const rules = (over: Partial<StatutoryInstrumentSource> = {}): StatutoryInstrumentSource => ({
    id: 'si1',
    type: 'statutoryInstrument',
    name: 'CPR',
    year: '',
    siNumber: '',
    numbering: 'rulesOfCourt',
    ...over,
  });

  it('does not ask the rules of court for a year or an SI number (2.5.2)', () => {
    expect(validate(rules())).toEqual([]);
  });

  it('says so when a year or SI number given for the rules of court is left out', () => {
    expect(fields(rules({ year: '1998' }), 'warning')).toContain('siNumber');
    expect(fields(rules({ siNumber: '1998/3132' }), 'warning')).toContain('siNumber');
  });

  it('warns that a CPR pinpoint omits "r" and "rr" (2.5.3)', () => {
    expect(fields(rules({ provision: 'r 5.2(1)(b)' }), 'warning')).toContain('provision');
    expect(fields(rules({ provision: '5.2(1)(b)' }), 'warning')).not.toContain('provision');
  });

  it('leaves the RSC and CCR their rule abbreviation', () => {
    expect(validate(rules({ name: 'RSC', provision: 'Ord 24, r 14A' }))).toEqual([]);
    expect(validate(rules({ name: 'CCR', provision: 'Ord 17, r 11' }))).toEqual([]);
  });

  it('names the SR & O number when one is missing', () => {
    const source = rules({
      name: 'Hollow-ware and Galvanising Welfare Order',
      year: '1921',
      numbering: 'srAndO',
    });
    expect(validate(source).map((issue) => issue.message)).toEqual([
      'A statutory instrument needs its SR & O number, e.g. "2004/3166".',
    ]);
  });
});

describe('validation — journal articles (3.3.2–3.3.4)', () => {
  const base: JournalArticleSource = {
    id: 'j1',
    type: 'journalArticle',
    authors: [person('Andrew', 'Ashworth')],
    title: 'Deference and Dignity',
    year: '2006',
    volume: '72',
    journal: 'Crim LR',
    firstPage: '441',
  };

  it('accepts a case name in place of a title (3.3.2)', () => {
    const source: Source = {
      ...base,
      title: '',
      caseName: 'R (Singh) v Chief Constable of the West Midlands Police',
      isCaseNote: true,
    };
    expect(validate(source)).toEqual([]);
  });

  it('asks a case note for one of the two, not neither', () => {
    expect(fields({ ...base, title: '', isCaseNote: true }, 'error')).toContain('title');
  });

  it('says a titled case note is cited as an ordinary article, so the case name is dropped', () => {
    const source: Source = { ...base, caseName: 'R (Singh) v Chief Constable', isCaseNote: true };
    expect(fields(source, 'warning')).toContain('caseName');
    expect(fields(source, 'error')).toEqual([]);
  });

  // 3.3.3: "If volume and/or page numbers are not yet known, simply omit that
  // information" — so neither absence is a fault on a forthcoming article.
  it('does not require a page or warn about a volume on a forthcoming article', () => {
    expect(validate({ ...base, volume: undefined, firstPage: '', forthcoming: true })).toEqual([]);
  });

  // 3.3.4: online journals "may lack some of the publication elements (for
  // example, many do not include page numbers)".
  it('does not require a page on an online article', () => {
    const source: Source = {
      ...base,
      firstPage: '',
      url: 'http://ejlt.org/article/view/17',
      accessDate: '2010-07-27',
    };
    expect(validate(source)).toEqual([]);
  });

  it('still requires a page on an ordinary printed article', () => {
    expect(fields({ ...base, firstPage: '' }, 'error')).toContain('firstPage');
  });

  it('requires an access date alongside a web address', () => {
    expect(fields({ ...base, url: 'http://ejlt.org/article/view/17' }, 'error')).toContain('accessDate');
  });

  it('says an access date with no web address is left out', () => {
    expect(fields({ ...base, accessDate: '2010-07-27' }, 'warning')).toContain('accessDate');
  });

  // 3.1.4 governs every URL, not just a web page's.
  it('applies the 3.1.4 http:// rule to an article address', () => {
    const source: Source = { ...base, url: 'http://www.example.com/x', accessDate: '2010-07-27' };
    expect(fields(source, 'warning')).toContain('url');
  });
});

describe('validation — book volumes (3.2.1)', () => {
  const base: Source = {
    id: 'b1', type: 'book', authors: [person('Christian', 'von Bar')], authorRole: 'author',
    title: 'The Common European Law of Torts', publisher: 'CH Beck', year: '2000',
  };

  it('accepts a volume with either placing', () => {
    expect(validate({ ...base, volume: '2' })).toEqual([]);
    expect(validate({ ...base, volume: '2', volumesVary: true })).toEqual([]);
  });

  it('says the placing means nothing without a volume number', () => {
    expect(fields({ ...base, volumesVary: true }, 'warning')).toContain('volume');
    expect(fields({ ...base, volumesVary: true }, 'error')).toEqual([]);
  });
});

describe('validation — later history (2.1.2, 2.1.8)', () => {
  const base: CaseSource = {
    id: 'c1', type: 'case', caseName: 'Roberts v Gable',
    neutral: { year: '2006', court: 'EWHC', number: '1025', division: 'QB' },
  };

  it('accepts a disposition with a citation to point at', () => {
    expect(
      validate({
        ...base,
        history: {
          disposition: 'affd',
          neutral: { year: '2007', court: 'EWCA Civ', number: '721' },
        },
      }),
    ).toEqual([]);
  });

  it('says "affd" alone points at nothing', () => {
    expect(fields({ ...base, history: { disposition: 'affd' } }, 'warning')).toContain('history.report');
  });

  it('asks for the name that "sub nom" introduces', () => {
    const source: Source = {
      ...base,
      history: {
        subNom: true,
        report: { year: '1993', yearFormat: 'square', volume: '2', abbreviation: 'WLR', firstPage: '507' },
      },
    };
    expect(fields(source, 'warning')).toContain('history.caseName');
  });

  it('drops a later court that its neutral citation already identifies', () => {
    const source: Source = {
      ...base,
      history: { disposition: 'affd', neutral: { year: '2007', court: 'EWCA Civ', number: '721' }, court: 'CA' },
    };
    expect(fields(source, 'warning')).toContain('history.court');
  });

  it('requires a judgment number on a further neutral citation (2.1.3)', () => {
    const source: Source = {
      ...base,
      furtherNeutrals: [{ year: '2003', court: 'EWCA Civ', number: '' }],
    };
    expect(fields(source, 'error')).toContain('neutral2.number');
  });
});

describe('abbreviations take no full stops (4.2.1)', () => {
  it('flags a report series written with stops, and says what it would be', () => {
    const source: Source = { ...modernCase, neutral: undefined,
      report: { year: '1996', yearFormat: 'square', abbreviation: 'A.C.', firstPage: '155' }, court: 'HL' };
    expect(messages(source)).toContain(
      'OSCOLA abbreviations take no full stops (4.2.1), so "A.C." would normally be "AC".',
    );
    // Flagged, never rewritten: the citation still renders what was typed.
    expect(fields(source, 'error')).toEqual([]);
  });

  it('flags a journal abbreviation the same way', () => {
    const source: Source = {
      id: 'j1', type: 'journalArticle', authors: [person('Paul', 'Craig')],
      title: 'Theory', year: '2005', volume: '72', journal: 'M.L.R.', firstPage: '440',
    };
    expect(fields(source, 'warning')).toContain('journal');
  });

  it('leaves an abbreviation that is already right alone', () => {
    const source: Source = { ...modernCase, neutral: undefined,
      report: { year: '1996', yearFormat: 'square', abbreviation: 'Cr App R (S)', firstPage: '155' }, court: 'HL' };
    expect(fields(source, 'warning')).not.toContain('report.abbreviation');
  });
});

describe('neutral citation court codes (4.1)', () => {
  const withNeutral = (court: string, division?: string): Source => ({
    ...modernCase,
    neutral: { year: '2008', court, number: '13', division },
  });

  it('accepts every code the guide lists', () => {
    expect(validate(withNeutral('UKSC'))).toEqual([]);
    expect(validate(withNeutral('EWCA Civ'))).toEqual([]);
    expect(validate(withNeutral('EWHC', 'QB'))).toEqual([]);
    expect(validate(withNeutral('UKFTT', 'SEC'))).toEqual([]);
  });

  it('names the right capitalisation rather than just rejecting', () => {
    expect(messages(withNeutral('ewhc', 'QB'))).toContain(
      'Court codes are capitalised as in OSCOLA 4.1: "EWHC", not "ewhc".',
    );
  });

  // 4.1 is the 2012 list, so "unknown" cannot mean "wrong".
  it('warns softly about a code the 4th edition does not have', () => {
    expect(fields(withNeutral('EWFC'), 'warning')).toContain('neutral.court');
    expect(fields(withNeutral('EWFC'), 'error')).toEqual([]);
    expect(messages(withNeutral('EWFC')).join(' ')).toMatch(/postdates the 4th edition/);
  });

  // 2.1.3: High Court neutral citations carry the division in brackets.
  it('asks for a division where the court takes one', () => {
    expect(fields(withNeutral('EWHC'), 'warning')).toContain('neutral.division');
    expect(messages(withNeutral('EWHC')).join(' ')).toMatch(/Ch, Fam, QB, Admin/);
  });

  it('rejects a division that is not listed for that court', () => {
    expect(messages(withNeutral('EWHC', 'Costs'))).toContain(
      'OSCOLA 4.1 lists Ch, Fam, QB, Admin, Admlty, Comm, Pat, TCC for EWHC, not "Costs".',
    );
  });

  it('says so when a division is given to a court that takes none', () => {
    expect(messages(withNeutral('UKSC', 'QB'))).toContain(
      'UKSC citations take no division in brackets (4.1).',
    );
  });

  it('checks a further neutral citation and a later one too', () => {
    expect(
      fields({ ...modernCase, furtherNeutrals: [{ year: '2003', court: 'ewca civ', number: '70' }] }, 'warning'),
    ).toContain('neutral2.court');
    expect(
      fields({ ...modernCase, history: { disposition: 'affd', neutral: { year: '2007', court: 'EWHC', number: '721' } } }, 'warning'),
    ).toContain('history.neutral.division');
  });
});
