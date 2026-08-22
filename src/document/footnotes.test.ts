import { describe, expect, it } from 'vitest';
import { renderFootnotes, type CitationRef, type FootnoteInput } from './footnotes';
import { deriveCaseShortName } from './shortForms';
import { toPlainText } from '../model/segments';
import type { Source } from '../model/types';

/**
 * Builds a document of `length` footnotes, placing the given citations at the
 * stated (1-based) numbers and filling every other position with a distinct
 * throwaway source, so the guide's actual footnote numbers can be reproduced.
 */
function sequence(placements: Record<number, CitationRef[]>, length: number) {
  const footnotes: FootnoteInput[] = Array.from({ length }, (_, i) => ({
    citations: placements[i + 1] ?? [{ sourceId: `filler-${i + 1}` }],
  }));
  const fillers: Source[] = Array.from({ length }, (_, i) => ({
    id: `filler-${i + 1}`,
    type: 'act',
    shortTitle: `Filler Act (No ${i + 1})`,
    year: '2000',
  }));
  return { footnotes, fillers };
}

const render = (placements: Record<number, CitationRef[]>, length: number, sources: Source[]) => {
  const { footnotes, fillers } = sequence(placements, length);
  const out = renderFootnotes(footnotes, [...sources, ...fillers]);
  return Object.fromEntries(out.map((f) => [f.number, toPlainText(f.citation)]));
};

const person = (given: string, surname: string) => ({ kind: 'person', given, surname }) as const;

// ---------------------------------------------------------------------------
// The worked examples in OSCOLA 1.2
// ---------------------------------------------------------------------------

describe('subsequent citation of a book (1.2.1)', () => {
  const stevens: Source = {
    id: 'stevens', type: 'book', authors: [person('Robert', 'Stevens')],
    authorRole: 'author', title: 'Torts and Rights', publisher: 'OUP', year: '2007',
  };

  it('gives the full citation, then a cross-citation, then ibid', () => {
    const out = render(
      {
        1: [{ sourceId: 'stevens' }],
        26: [{ sourceId: 'stevens', pinpoint: '110', pinpointKind: 'page' }],
        27: [{ sourceId: 'stevens', pinpoint: '271–78', pinpointKind: 'page' }],
      },
      27,
      [stevens],
    );

    expect(out[1]).toBe('Robert Stevens, Torts and Rights (OUP 2007).');
    expect(out[26]).toBe('Stevens (n 1) 110.');
    expect(out[27]).toBe('ibid 271–78.');
  });
});

describe('two works by the same author (1.2.1)', () => {
  const ashworthArticle: Source = {
    id: 'a1', type: 'journalArticle', authors: [person('Andrew', 'Ashworth')],
    title: 'Testing Fidelity to Legal Values: Official Involvement and Criminal Justice',
    shortTitle: 'Testing Fidelity to Legal Values',
    year: '2000', volume: '63', journal: 'MLR', firstPage: '633',
  };
  const ashworthBook: Source = {
    id: 'a2', type: 'book', authors: [person('Andrew', 'Ashworth')], authorRole: 'author',
    title: 'Principles of Criminal Law', edition: '6', publisher: 'OUP', year: '2009',
  };

  it('adds the title to the surname, shortened where a short title is given', () => {
    const out = render(
      {
        27: [{ sourceId: 'a1', pinpoint: '635', pinpointKind: 'page' }],
        28: [{ sourceId: 'a2', pinpoint: '68', pinpointKind: 'page' }],
        35: [{ sourceId: 'a1', pinpoint: '635-37', pinpointKind: 'page' }],
        46: [{ sourceId: 'a2', pinpoint: '73', pinpointKind: 'page' }],
      },
      46,
      [ashworthArticle, ashworthBook],
    );

    expect(out[27]).toBe(
      "Andrew Ashworth, 'Testing Fidelity to Legal Values: Official Involvement and " +
        "Criminal Justice' (2000) 63 MLR 633, 635.",
    );
    expect(out[28]).toBe('Andrew Ashworth, Principles of Criminal Law (6th edn, OUP 2009) 68.');
    expect(out[35]).toBe("Ashworth, 'Testing Fidelity to Legal Values' (n 27) 635-37.");
    expect(out[46]).toBe('Ashworth, Principles of Criminal Law (n 28) 73.');
  });

  it('uses the surname alone where only one work by that author is cited', () => {
    const raz: Source = {
      id: 'raz', type: 'book', authors: [person('Joseph', 'Raz')], authorRole: 'author',
      title: 'The Authority of Law: Essays on Law and Morality',
      edition: '2', publisher: 'OUP', year: '2009',
    };
    const out = render(
      {
        28: [{ sourceId: 'raz' }],
        29: [{ sourceId: 'raz', pinpoint: '6', pinpointKind: 'page' }],
        32: [{ sourceId: 'raz', pinpoint: '233–36', pinpointKind: 'page' }],
      },
      32,
      [raz],
    );

    expect(out[28]).toBe(
      'Joseph Raz, The Authority of Law: Essays on Law and Morality (2nd edn, OUP 2009).',
    );
    expect(out[29]).toBe('ibid 6.');
    expect(out[32]).toBe('Raz (n 28) 233–36.');
  });
});

describe('subsequent citation of a case (1.2.1)', () => {
  const austin: Source = {
    id: 'austin', type: 'case',
    caseName: 'Austin v Commissioner of Police for the Metropolis',
    neutral: { year: '2009', court: 'UKHL', number: '5' },
    report: { year: '2009', yearFormat: 'square', abbreviation: 'AC', firstPage: '564' },
  };

  it('shortens the case name and cross-cites the full citation', () => {
    const out = render({ 1: [{ sourceId: 'austin' }], 7: [{ sourceId: 'austin' }] }, 7, [austin]);

    expect(out[1]).toBe(
      'Austin v Commissioner of Police for the Metropolis [2009] UKHL 5, [2009] AC 564.',
    );
    expect(out[7]).toBe('Austin (n 1).');
  });
});

describe('subsequent citation of legislation (1.2.1)', () => {
  it('announces the short form, then uses it without a cross-citation', () => {
    const directive: Source = {
      id: 'wtd', type: 'euLegislation',
      title:
        'Council Directive (EC) 93/104 concerning certain aspects of the organisation of working time',
      ojYear: '1993', ojSeries: 'L', ojIssue: '307', ojFirstPage: '18',
      shortForm: 'Working Time Directive',
    };
    const out = render(
      { 32: [{ sourceId: 'wtd' }], 40: [{ sourceId: 'wtd', pinpoint: 'art 2' }] },
      40,
      [directive],
    );

    expect(out[32]).toBe(
      'Council Directive (EC) 93/104 concerning certain aspects of the organisation of ' +
        'working time [1993] OJ L307/18 (Working Time Directive).',
    );
    expect(out[40]).toBe('Working Time Directive, art 2.');
  });

  // OSCOLA 2.4.1: the provision follows the announced short form without a comma.
  it('announces an Act’s abbreviation before the provision', () => {
    const nia: Source = {
      id: 'nia', type: 'act', shortTitle: 'Nuclear Installations Act', year: '1965',
      shortForm: 'NIA 1965',
    };
    const out = render(
      {
        12: [{ sourceId: 'nia', pinpoint: 's 7(1)' }],
        15: [{ sourceId: 'nia', pinpoint: 's 12' }],
      },
      15,
      [nia],
    );

    expect(out[12]).toBe('Nuclear Installations Act 1965 (NIA 1965) s 7(1).');
    expect(out[15]).toBe('NIA 1965, s 12.');
  });

  it('does not announce a short form that is never reused', () => {
    const nia: Source = {
      id: 'nia', type: 'act', shortTitle: 'Nuclear Installations Act', year: '1965',
      shortForm: 'NIA 1965',
    };
    const out = render({ 1: [{ sourceId: 'nia', pinpoint: 's 7(1)' }] }, 1, [nia]);
    expect(out[1]).toBe('Nuclear Installations Act 1965, s 7(1).');
  });
});

// OSCOLA 2.1.7: "When pinpointing to a particular passage in a judgment, add
// the judge's name in brackets after the pinpoint. Do not use per."
describe('judge attribution (2.1.7)', () => {
  const crownRiver: Source = {
    id: 'crown', type: 'case',
    caseName: 'Crown River Cruises Ltd v Kimbolton Fireworks Ltd',
    report: { year: '1996', yearFormat: 'square', volume: '2', abbreviation: "Lloyd's Rep", firstPage: '533' },
    court: 'QB',
  };
  const graham: Source = {
    id: 'graham', type: 'case',
    caseName: 'Graham and Graham v ReChem International Ltd',
    report: { year: '1996', yearFormat: 'square', abbreviation: 'Env LR', firstPage: '158' },
    court: 'QB',
  };
  const arscott: Source = {
    id: 'arscott', type: 'case',
    caseName: 'Arscott v The Coal Authority',
    neutral: { year: '2004', court: 'EWCA Civ', number: '892' },
    report: { year: '2005', yearFormat: 'square', abbreviation: 'Env LR', firstPage: '6' },
  };

  it('names the judge after a page pinpoint and after a paragraph pinpoint', () => {
    const out = renderFootnotes(
      [
        {
          citations: [
            { sourceId: 'crown', pinpoint: '547', pinpointKind: 'page', references: [{ locus: '547', judge: 'Potter J' }] },
            { sourceId: 'graham', pinpointKind: 'page', references: [{ locus: '162', judge: 'Forbes J' }] },
            { sourceId: 'arscott', pinpointKind: 'paragraph', references: [{ locus: '27', judge: 'Laws LJ' }] },
          ],
        },
      ],
      [crownRiver, graham, arscott],
    );

    expect(toPlainText(out[0]!.citation)).toBe(
      "Crown River Cruises Ltd v Kimbolton Fireworks Ltd [1996] 2 Lloyd's Rep 533 (QB) 547 (Potter J); " +
        'Graham and Graham v ReChem International Ltd [1996] Env LR 158 (QB) 162 (Forbes J); ' +
        'Arscott v The Coal Authority [2004] EWCA Civ 892, [2005] Env LR 6 [27] (Laws LJ).',
    );
  });

  // OSCOLA 1.2.1's second Austin footnote: several passages, each by a
  // different judge, carried on an ibid.
  it('attributes several passages to different judges after ibid', () => {
    const austin: Source = {
      id: 'austin', type: 'case',
      caseName: 'Austin v Commissioner of Police for the Metropolis',
      neutral: { year: '2009', court: 'UKHL', number: '5' },
      report: { year: '2009', yearFormat: 'square', abbreviation: 'AC', firstPage: '564' },
    };
    const out = renderFootnotes(
      [
        { citations: [{ sourceId: 'austin' }] },
        {
          citations: [
            {
              sourceId: 'austin',
              pinpointKind: 'paragraph',
              references: [
                { locus: '34', judge: 'Lord Hope' },
                { locus: '39', judge: 'Lord Scott' },
                { locus: '43-47', judge: 'Lord Walker' },
                { locus: '58-60', judge: 'Lord Neuberger' },
              ],
            },
          ],
        },
      ],
      [austin],
    );

    expect(toPlainText(out[1]!.citation)).toBe(
      'ibid [34] (Lord Hope), [39] (Lord Scott), [43]–[47] (Lord Walker), [58]–[60] (Lord Neuberger).',
    );
  });

  it('carries the judge into a cross-citation', () => {
    const out = renderFootnotes(
      [
        { citations: [{ sourceId: 'arscott' }] },
        { citations: [{ sourceId: 'crown' }] },
        { citations: [{ sourceId: 'arscott', pinpointKind: 'paragraph', references: [{ locus: '27', judge: 'Laws LJ' }] }] },
      ],
      [arscott, crownRiver],
    );
    expect(toPlainText(out[2]!.citation)).toBe('Arscott (n 1) [27] (Laws LJ).');
  });
});

// ---------------------------------------------------------------------------
// The rules behind the examples
// ---------------------------------------------------------------------------

describe('ibid (1.2.3)', () => {
  const raz: Source = {
    id: 'raz', type: 'book', authors: [person('Joseph', 'Raz')], authorRole: 'author',
    title: 'The Authority of Law', publisher: 'OUP', year: '2009',
  };
  const stevens: Source = {
    id: 'stevens', type: 'book', authors: [person('Robert', 'Stevens')], authorRole: 'author',
    title: 'Torts and Rights', publisher: 'OUP', year: '2007',
  };

  const run = (footnotes: FootnoteInput[], options = {}) =>
    renderFootnotes(footnotes, [raz, stevens], options).map((f) => toPlainText(f.citation));

  it('stands alone where the pinpoint is unchanged', () => {
    expect(run([{ citations: [{ sourceId: 'raz' }] }, { citations: [{ sourceId: 'raz' }] }])[1])
      .toBe('ibid.');
  });

  it('is never capitalised, even opening a footnote', () => {
    const out = run([{ citations: [{ sourceId: 'raz' }] }, { citations: [{ sourceId: 'raz' }] }]);
    expect(out[1]!.startsWith('ibid')).toBe(true);
  });

  it('is not used where the source was cited earlier but not immediately before', () => {
    const out = run([
      { citations: [{ sourceId: 'raz' }] },
      { citations: [{ sourceId: 'stevens' }] },
      { citations: [{ sourceId: 'raz' }] },
    ]);
    expect(out[2]).toBe('Raz (n 1).');
  });

  // 1.2.3: "If there is more than one citation in the preceding footnote, use
  // 'ibid' only if you are referring again to all the citations in that footnote."
  it('is available for a multi-citation footnote only when every citation repeats', () => {
    const both = { citations: [{ sourceId: 'raz' }, { sourceId: 'stevens' }] };
    expect(run([both, both])[1]).toBe('ibid.');
    expect(run([both, { citations: [{ sourceId: 'raz' }] }])[1]).toBe('Raz (n 1).');
  });

  it('gives way to cross-citations throughout when that style is chosen', () => {
    const out = run(
      [{ citations: [{ sourceId: 'raz' }] }, { citations: [{ sourceId: 'raz', pinpoint: '6' }] }],
      { repeatStyle: 'cross-citation' },
    );
    expect(out[1]).toBe('Raz (n 1) 6.');
  });

  it('separates several citations in one footnote with semicolons (1.1)', () => {
    const out = run([{ citations: [{ sourceId: 'raz' }, { sourceId: 'stevens' }] }]);
    expect(out[0]).toBe(
      'Joseph Raz, The Authority of Law (OUP 2009); Robert Stevens, Torts and Rights (OUP 2007).',
    );
  });
});

describe('short case names (2.1.2)', () => {
  it('takes the first party', () => {
    expect(deriveCaseShortName('Austin v Commissioner of Police for the Metropolis')).toBe('Austin');
    expect(deriveCaseShortName('Phelps v Hillingdon LBC')).toBe('Phelps');
  });

  it('takes the individual in a judicial review', () => {
    expect(deriveCaseShortName('R (Roberts) v Parole Board')).toBe('Roberts');
    expect(deriveCaseShortName('R v Lord Chancellor, ex p Witham')).toBe('Witham');
  });

  it('keeps the full name where the first party is the Crown', () => {
    // 2.1.2 accepts either "R v Evans" or "Evans"; the fuller form is safer
    // outside a work on criminal law.
    expect(deriveCaseShortName('R v Evans')).toBe('R v Evans');
  });

  it('leaves a name with no parties alone', () => {
    expect(deriveCaseShortName('Re Guardian News and Media Ltd')).toBe('Re Guardian News and Media Ltd');
  });

  it('is overridden by an explicit short name', () => {
    const ship: Source = {
      id: 's', type: 'case',
      caseName: 'Leigh & Sillivan Ltd v Aliakmon Shipping Co Ltd (The Aliakmon)',
      shortName: 'The Aliakmon',
      report: { year: '1986', yearFormat: 'square', abbreviation: 'AC', firstPage: '785' },
      court: 'HL',
    };
    const out = renderFootnotes(
      [{ citations: [{ sourceId: 's' }] }, { citations: [{ sourceId: 'x' }] }, { citations: [{ sourceId: 's' }] }],
      [ship, { id: 'x', type: 'act', shortTitle: 'Theft Act', year: '1968' }],
    );
    expect(toPlainText(out[2]!.citation)).toBe('The Aliakmon (n 1).');
  });
});

describe('robustness', () => {
  it('marks a citation whose source is missing rather than throwing', () => {
    const out = renderFootnotes([{ citations: [{ sourceId: 'ghost' }] }], []);
    expect(toPlainText(out[0]!.citation)).toBe('[unknown source: ghost].');
    expect(out[0]!.form).toBe('unknown-source');
  });

  it('reports which rule produced each footnote', () => {
    const raz: Source = {
      id: 'raz', type: 'book', authors: [person('Joseph', 'Raz')], authorRole: 'author',
      title: 'The Authority of Law', publisher: 'OUP', year: '2009',
    };
    const out = renderFootnotes(
      [
        { citations: [{ sourceId: 'raz' }] },
        { citations: [{ sourceId: 'raz' }] },
        { citations: [{ sourceId: 'x' }] },
        { citations: [{ sourceId: 'raz' }] },
      ],
      [raz, { id: 'x', type: 'act', shortTitle: 'Theft Act', year: '1968' }],
    );
    expect(out.map((f) => f.form)).toEqual(['full', 'ibid', 'full', 'cross-citation']);
  });

  it('renumbers when a footnote is inserted ahead of the full citation', () => {
    const raz: Source = {
      id: 'raz', type: 'book', authors: [person('Joseph', 'Raz')], authorRole: 'author',
      title: 'The Authority of Law', publisher: 'OUP', year: '2009',
    };
    const theft: Source = { id: 'x', type: 'act', shortTitle: 'Theft Act', year: '1968' };
    const before = renderFootnotes(
      [{ citations: [{ sourceId: 'raz' }] }, { citations: [{ sourceId: 'x' }] }, { citations: [{ sourceId: 'raz' }] }],
      [raz, theft],
    );
    expect(toPlainText(before[2]!.citation)).toBe('Raz (n 1).');

    // Insert a new footnote at the top: the cross-citation follows the source.
    const after = renderFootnotes(
      [
        { citations: [{ sourceId: 'x' }] },
        { citations: [{ sourceId: 'raz' }] },
        { citations: [{ sourceId: 'x' }] },
        { citations: [{ sourceId: 'raz' }] },
      ],
      [raz, theft],
    );
    expect(toPlainText(after[3]!.citation)).toBe('Raz (n 2).');
  });
});
