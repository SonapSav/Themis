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

// Every citation asserted below is verbatim from OSCOLA 4th edn.
describe('more than one neutral citation (2.1.3)', () => {
  // "If a single report includes more than one judgment and therefore more than
  // one neutral citation, list the neutral citations in chronological order,
  // starting with the oldest, and separate them with a comma."
  const mastermanLister: CaseSource = {
    id: 'c1',
    type: 'case',
    caseName: 'Masterman-Lister v Brutton & Co (Nos 1 and 2)',
    neutral: { year: '2002', court: 'EWCA Civ', number: '1889' },
    furtherNeutrals: [{ year: '2003', court: 'EWCA Civ', number: '70' }],
    report: { year: '2003', yearFormat: 'square', volume: '1', abbreviation: 'WLR', firstPage: '1511' },
  };

  it('lists them oldest first, separated by commas, before the report', () => {
    expect(footnote(mastermanLister)).toBe(
      'Masterman-Lister v Brutton & Co (Nos 1 and 2) [2002] EWCA Civ 1889, [2003] EWCA Civ 70, [2003] 1 WLR 1511.',
    );
  });

  it('italicises only the case name', () => {
    expect(
      formatFootnote(mastermanLister)
        .filter((segment) => segment.style === 'italic')
        .map((segment) => segment.text),
    ).toEqual(['Masterman-Lister v Brutton & Co (Nos 1 and 2)']);
  });
});

describe('variations in the name of a case (2.1.2)', () => {
  // "the report or reports using the alternative name of the case should be
  // introduced by the phrase 'sub nom' in roman".
  it('introduces an alternative name with sub nom', () => {
    const gibbons: CaseSource = {
      id: 'c2',
      type: 'case',
      caseName: 'Gibbons v South West Water Services Ltd',
      report: { year: '1993', yearFormat: 'square', abbreviation: 'QB', firstPage: '507' },
      history: {
        subNom: true,
        caseName: 'AB v South West Water Services Ltd',
        report: { year: '1993', yearFormat: 'square', volume: '2', abbreviation: 'WLR', firstPage: '507' },
        court: 'CA',
      },
    };
    expect(footnote(gibbons)).toBe(
      'Gibbons v South West Water Services Ltd [1993] QB 507, sub nom AB v South West Water Services Ltd [1993] 2 WLR 507 (CA).',
    );
    // "sub nom" is roman; both case names are italic.
    expect(
      formatFootnote(gibbons)
        .filter((segment) => segment.style === 'italic')
        .map((segment) => segment.text),
    ).toEqual(['Gibbons v South West Water Services Ltd', 'AB v South West Water Services Ltd']);
  });

  // "where a case appears under a different name at different stages in its
  // history … the name of the case at the second stage cited should be
  // introduced by 'sub nom'".
  it('combines a disposition with sub nom', () => {
    const southYorkshire: CaseSource = {
      id: 'c3',
      type: 'case',
      caseName: 'R v Monopolies and Mergers Commission, ex p South Yorkshire Transport Ltd',
      report: { year: '1992', yearFormat: 'square', volume: '1', abbreviation: 'WLR', firstPage: '291' },
      court: 'CA',
      history: {
        disposition: 'affd',
        subNom: true,
        caseName: 'South Yorkshire Transport Ltd v Monopolies and Mergers Commission',
        report: { year: '1993', yearFormat: 'square', volume: '1', abbreviation: 'WLR', firstPage: '23' },
        court: 'HL',
      },
    };
    expect(footnote(southYorkshire)).toBe(
      'R v Monopolies and Mergers Commission, ex p South Yorkshire Transport Ltd [1992] 1 WLR 291 (CA), ' +
        'affd sub nom South Yorkshire Transport Ltd v Monopolies and Mergers Commission [1993] 1 WLR 23 (HL).',
    );
  });
});

describe('subsequent history of a case (2.1.8)', () => {
  // "The subsequent history of a case may be indicated after the primary
  // citation by abbreviating 'affirmed' to 'affd' and 'reversed' to 'revd'."
  const roberts: CaseSource = {
    id: 'c4',
    type: 'case',
    caseName: 'Roberts v Gable',
    neutral: { year: '2006', court: 'EWHC', number: '1025', division: 'QB' },
    report: { year: '2006', yearFormat: 'square', abbreviation: 'EMLR', firstPage: '23' },
    history: {
      disposition: 'affd',
      neutral: { year: '2007', court: 'EWCA Civ', number: '721' },
      report: { year: '2008', yearFormat: 'square', abbreviation: 'QB', firstPage: '502' },
    },
  };

  it('follows the primary citation with affd and the later citation', () => {
    expect(footnote(roberts)).toBe(
      'Roberts v Gable [2006] EWHC 1025 (QB), [2006] EMLR 23, affd [2007] EWCA Civ 721, [2008] QB 502.',
    );
  });

  it('abbreviates a reversal to revd', () => {
    expect(footnote({ ...roberts, history: { ...roberts.history, disposition: 'revd' } })).toBe(
      'Roberts v Gable [2006] EWHC 1025 (QB), [2006] EMLR 23, revd [2007] EWCA Civ 721, [2008] QB 502.',
    );
  });

  it('drops the later court where its neutral citation identifies it (2.1.3)', () => {
    const withCourt = { ...roberts, history: { ...roberts.history, court: 'CA' } };
    expect(footnote(withCourt)).toBe(footnote(roberts));
  });

  it('carries the history into the table of cases, with names in roman (1.6.2)', () => {
    expect(bibliography(roberts)).toBe(
      'Roberts v Gable [2006] EWHC 1025 (QB), [2006] EMLR 23, affd [2007] EWCA Civ 721, [2008] QB 502',
    );
    expect(formatBibliography(roberts).every((segment) => segment.style === 'plain')).toBe(true);
  });
});
