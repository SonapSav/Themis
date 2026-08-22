import { describe, expect, it } from 'vitest';
import { formatBibliography, formatFootnote } from '../format';
import { toHtml } from '../../model/segments';
import type { CaseSource } from '../../model/types';
import { bibliography, footnote } from './helpers';

const caseSource = (fields: Omit<CaseSource, 'id' | 'type'>): CaseSource => ({
  id: 'c1',
  type: 'case',
  ...fields,
});

// Examples taken from the OSCOLA 4th edn quick reference guide.
describe('cases — OSCOLA 4th edn examples', () => {
  it('cites the neutral citation before the best report', () => {
    const source = caseSource({
      caseName: 'Corr v IBC Vehicles Ltd',
      neutral: { year: '2008', court: 'UKHL', number: '13' },
      report: {
        year: '2008',
        yearFormat: 'square',
        volume: '1',
        abbreviation: 'AC',
        firstPage: '884',
      },
    });

    expect(footnote(source)).toBe('Corr v IBC Vehicles Ltd [2008] UKHL 13, [2008] 1 AC 884.');
  });

  it('gives the court in brackets where there is no neutral citation', () => {
    const source = caseSource({
      caseName: 'Page v Smith',
      report: { year: '1996', yearFormat: 'square', abbreviation: 'AC', firstPage: '155' },
      court: 'HL',
    });

    expect(footnote(source)).toBe('Page v Smith [1996] AC 155 (HL).');
  });

  it('handles a report year that differs from the neutral citation year', () => {
    const source = caseSource({
      caseName: 'R (Roberts) v Parole Board',
      neutral: { year: '2004', court: 'EWCA Civ', number: '1031' },
      report: { year: '2005', yearFormat: 'square', abbreviation: 'QB', firstPage: '410' },
    });

    expect(footnote(source)).toBe(
      'R (Roberts) v Parole Board [2004] EWCA Civ 1031, [2005] QB 410.',
    );
  });

  it('places the High Court division inside the neutral citation', () => {
    const source = caseSource({
      caseName: 'Bunt v Tilley',
      neutral: { year: '2006', court: 'EWHC', number: '407', division: 'QB' },
      report: {
        year: '2006',
        yearFormat: 'square',
        volume: '3',
        abbreviation: 'All ER',
        firstPage: '336',
      },
    });

    expect(footnote(source)).toBe(
      'Bunt v Tilley [2006] EWHC 407 (QB), [2006] 3 All ER 336.',
    );
  });


  it('gives the volume before the abbreviation in square-bracket years (2.1.1)', () => {
    const source = caseSource({
      caseName: 'Barrett v Enfield LBC',
      report: {
        year: '2001', yearFormat: 'square', volume: '2', abbreviation: 'AC', firstPage: '550',
      },
      court: 'HL',
    });

    expect(footnote(source)).toBe('Barrett v Enfield LBC [2001] 2 AC 550 (HL).');
  });

  it('uses round brackets where the volumes are independently numbered (2.1.1)', () => {
    const source = caseSource({
      caseName: 'Barrett v Enfield LBC',
      report: {
        year: '1999', yearFormat: 'round', volume: '49', abbreviation: 'BMLR', firstPage: '1',
      },
      court: 'HL',
    });

    expect(footnote(source)).toBe('Barrett v Enfield LBC (1999) 49 BMLR 1 (HL).');
  });

  it('combines a neutral citation with a round-bracket report year (2.1.3)', () => {
    const source = caseSource({
      caseName: 'Farraj v Kings NHS Healthcare Trust',
      neutral: { year: '2009', court: 'EWCA Civ', number: '1203' },
      report: {
        year: '2010', yearFormat: 'round', volume: '11', abbreviation: 'BMLR', firstPage: '131',
      },
    });

    expect(footnote(source)).toBe(
      'Farraj v Kings NHS Healthcare Trust [2009] EWCA Civ 1203, (2010) 11 BMLR 131.',
    );
  });

  it('cites an unreported judgment by its neutral citation alone (2.1.3)', () => {
    const source = caseSource({
      caseName: 'Re Guardian News and Media Ltd',
      neutral: { year: '2010', court: 'UKSC', number: '1' },
    });

    expect(footnote(source)).toBe('Re Guardian News and Media Ltd [2010] UKSC 1.');
  });

  it('omits the court where there is a neutral citation (2.1.3, 2.1.5)', () => {
    const source = caseSource({
      caseName: 'Re Guardian News and Media Ltd',
      neutral: { year: '2010', court: 'UKSC', number: '1' },
      court: 'SC',
    });

    expect(footnote(source)).toBe('Re Guardian News and Media Ltd [2010] UKSC 1.');
  });
});

describe('cases — pinpoints', () => {
  it('brackets a paragraph pinpoint and takes no preceding comma', () => {
    const source = caseSource({
      caseName: 'Gray v Thames Trains Ltd',
      neutral: { year: '2009', court: 'UKHL', number: '33' },
      report: {
        year: '2009',
        yearFormat: 'square',
        volume: '1',
        abbreviation: 'AC',
        firstPage: '1339',
      },
      pinpoint: { kind: 'paragraph', value: '14' },
    });

    expect(footnote(source)).toBe(
      'Gray v Thames Trains Ltd [2009] UKHL 33, [2009] 1 AC 1339 [14].',
    );
  });

  it('brackets each end of a paragraph range (quick reference guide)', () => {
    const source = caseSource({
      caseName: 'Bunt v Tilley',
      neutral: { year: '2006', court: 'EWHC', number: '407', division: 'QB' },
      report: {
        year: '2006', yearFormat: 'square', volume: '3', abbreviation: 'All ER', firstPage: '336',
      },
      pinpoint: { kind: 'paragraph', value: '1-37' },
    });

    expect(footnote(source)).toBe(
      'Bunt v Tilley [2006] EWHC 407 (QB), [2006] 3 All ER 336 [1]–[37].',
    );
  });

  it('brackets each paragraph in a list (quick reference guide)', () => {
    const source = caseSource({
      caseName: 'Callery v Gray',
      neutral: { year: '2001', court: 'EWCA Civ', number: '1117' },
      report: {
        year: '2001', yearFormat: 'square', volume: '1', abbreviation: 'WLR', firstPage: '2112',
      },
      pinpoint: { kind: 'paragraph', value: '42, 45' },
    });

    expect(footnote(source)).toBe(
      'Callery v Gray [2001] EWCA Civ 1117, [2001] 1 WLR 2112 [42], [45].',
    );
  });

  it('separates a page pinpoint from a bracketed court with a space (quick reference guide)', () => {
    const source = caseSource({
      caseName: 'R v Leeds County Court, ex p Morris',
      report: { year: '1990', yearFormat: 'square', abbreviation: 'QB', firstPage: '523' },
      court: 'QB',
      pinpoint: { kind: 'page', value: '530–31' },
    });

    expect(footnote(source)).toBe(
      'R v Leeds County Court, ex p Morris [1990] QB 523 (QB) 530–31.',
    );
  });

  it('separates a page pinpoint from a report with a comma', () => {
    const source = caseSource({
      caseName: 'Page v Smith',
      report: { year: '1996', yearFormat: 'square', abbreviation: 'AC', firstPage: '155' },
      pinpoint: { kind: 'page', value: '165' },
    });

    expect(footnote(source)).toBe('Page v Smith [1996] AC 155, 165.');
  });
});

// OSCOLA 2.1.4: "If an unreported case does not have a neutral citation ...
// give the court and the date of the judgment in brackets after the name of the
// case. There is no need to add the word 'unreported'."
describe('cases — unreported (2.1.4)', () => {
  it('gives the court and date of judgment in place of a report', () => {
    const source = caseSource({
      caseName: 'Stubbs v Sayer',
      court: 'CA',
      judgmentDate: '1990-11-08',
    });

    expect(footnote(source)).toBe('Stubbs v Sayer (CA, 8 November 1990).');
  });

  it('gives the neutral citation alone where the unreported case has one', () => {
    const source = caseSource({
      caseName: 'Calvert v Gardiner',
      neutral: { year: '2002', court: 'EWHC', number: '1394', division: 'QB' },
      judgmentDate: '2002-06-27',
    });

    // 2.1.4: "If a case is unreported but has a neutral citation, give that."
    expect(footnote(source)).toBe('Calvert v Gardiner [2002] EWHC 1394 (QB).');
  });

  it('drops the date once the case is reported', () => {
    const source = caseSource({
      caseName: 'Stubbs v Sayer',
      court: 'CA',
      judgmentDate: '1990-11-08',
      report: { year: '1990', yearFormat: 'square', abbreviation: 'AC', firstPage: '1' },
    });

    expect(footnote(source)).toBe('Stubbs v Sayer [1990] AC 1 (CA).');
  });

  it('tables the case with its court and date', () => {
    const source = caseSource({
      caseName: 'Stubbs v Sayer',
      court: 'CA',
      judgmentDate: '1990-11-08',
    });

    expect(bibliography(source)).toBe('Stubbs v Sayer (CA, 8 November 1990)');
  });
});

describe('cases — table of cases', () => {
  const source = caseSource({
    caseName: 'Page v Smith',
    report: { year: '1996', yearFormat: 'square', abbreviation: 'AC', firstPage: '155' },
    court: 'HL',
    pinpoint: { kind: 'page', value: '165' },
  });

  it('drops the pinpoint and the closing full stop', () => {
    expect(bibliography(source)).toBe('Page v Smith [1996] AC 155 (HL)');
  });

  // OSCOLA 1.6.2: "In a table of cases, case names are not italicised."
  it('does not italicise the case name, unlike the footnote', () => {
    expect(formatBibliography(source)).toEqual([
      { text: 'Page v Smith [1996] AC 155 (HL)', style: 'plain' },
    ]);
  });
});

describe('cases — markup', () => {
  it('separates multiple page pinpoints with commas and escapes HTML (2.1.6)', () => {
    const source = caseSource({
      caseName: 'Beattie v E & F Beattie Ltd',
      report: { year: '1938', yearFormat: 'square', abbreviation: 'Ch', firstPage: '708' },
      court: 'CA',
      pinpoint: { kind: 'page', value: '720, 723' },
    });

    expect(footnote(source)).toBe('Beattie v E & F Beattie Ltd [1938] Ch 708 (CA) 720, 723.');
    expect(toHtml(formatFootnote(source))).toBe(
      '<em>Beattie v E &amp; F Beattie Ltd</em> [1938] Ch 708 (CA) 720, 723.',
    );
  });

  it('italicises the case name and nothing else', () => {
    const source = caseSource({
      caseName: 'Page v Smith',
      report: { year: '1996', yearFormat: 'square', abbreviation: 'AC', firstPage: '155' },
      court: 'HL',
    });

    expect(formatFootnote(source)).toEqual([
      { text: 'Page v Smith', style: 'italic' },
      { text: ' [1996] AC 155 (HL).', style: 'plain' },
    ]);
  });
});
