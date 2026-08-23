import { describe, expect, it } from 'vitest';
import { validate } from '../validate';
import type { CaseSource, Source, StatutoryInstrumentSource } from '../../model/types';
import { person } from './helpers';

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
