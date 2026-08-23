import { describe, expect, it } from 'vitest';
import { nameInTextForm } from '../format';
import { toPlainText } from '../../model/segments';
import type { ActSource, CaseSource, Source } from '../../model/types';
import { person } from './helpers';

const text = (citation: readonly { text: string }[] | undefined) =>
  citation ? toPlainText(citation as never) : undefined;

const austin: CaseSource = {
  id: 'c1',
  type: 'case',
  caseName: 'Austin v Commissioner of Police for the Metropolis',
  neutral: { year: '2009', court: 'UKHL', number: '5' },
  report: { year: '2009', yearFormat: 'square', abbreviation: 'AC', firstPage: '564' },
};

// OSCOLA 1.1.1: "If the name of the case is given in the text, it is not
// necessary to repeat it in the footnote." The full stop comes from 1.1,
// "Close footnotes with a full stop".
describe('cases named in the text', () => {
  it('drops the case name from the footnote (1.2, Austin)', () => {
    expect(text(nameInTextForm(austin).footnote)).toBe('[2009] UKHL 5, [2009] AC 564.');
  });

  it('keeps the court where there is no neutral citation (1.1.1, Phipps)', () => {
    const phipps: CaseSource = {
      id: 'c2',
      type: 'case',
      caseName: 'Phipps v Boardman',
      report: {
        year: '1967', yearFormat: 'square', volume: '2', abbreviation: 'AC', firstPage: '46',
      },
      court: 'HL',
    };
    expect(text(nameInTextForm(phipps).footnote)).toBe('[1967] 2 AC 46 (HL).');
  });

  it('keeps the court where there is no neutral citation (1.1.1, Boulting)', () => {
    const boulting: CaseSource = {
      id: 'c3',
      type: 'case',
      caseName: 'Boulting v Association of Cinematograph, Television and Allied Technicians',
      report: {
        year: '1963', yearFormat: 'square', volume: '2', abbreviation: 'QB', firstPage: '606',
      },
      court: 'CA',
    };
    expect(text(nameInTextForm(boulting).footnote)).toBe('[1963] 2 QB 606 (CA).');
  });

  it('keeps a pinpoint, punctuated as it is in the full footnote', () => {
    expect(text(nameInTextForm({ ...austin, pinpoint: { kind: 'paragraph', value: '34' } }).footnote))
      .toBe('[2009] UKHL 5, [2009] AC 564 [34].');
  });

  it('still requires a footnote', () => {
    expect(nameInTextForm(austin).footnoteRequired).toBe(true);
  });
});

// OSCOLA 1.1.2 and 2.4.2.
describe('legislation named in the text', () => {
  const raceRelations: ActSource = {
    id: 'a1', type: 'act', shortTitle: 'Race Relations Act', year: '1976', provision: 's 5(1)(a)',
  };

  it('needs no footnote where the text gives the Act and the section (1.1.2)', () => {
    expect(nameInTextForm(raceRelations).footnoteRequired).toBe(false);
    expect(nameInTextForm(raceRelations).footnote).toBeUndefined();
  });

  it('spells the provision out in full in the text (2.4.2)', () => {
    expect(text(nameInTextForm(raceRelations).inText)).toBe(
      'section 5(1)(a) of the Race Relations Act 1976',
    );
  });

  it('expands the other provision abbreviations (2.4.2, 2.5.3)', () => {
    const forms: Array<[string, string]> = [
      ['ss 1(1) and 4(3)', 'sections 1(1) and 4(3)'],
      ['sub-s (3)', 'subsection (3)'],
      ['sch 1', 'schedule 1'],
      ['para 15', 'paragraph 15'],
      ['reg 4', 'regulation 4'],
      ['art 2', 'article 2'],
    ];
    for (const [provision, expected] of forms) {
      expect(text(nameInTextForm({ ...raceRelations, provision }).inText)).toBe(
        `${expected} of the Race Relations Act 1976`,
      );
    }
  });

  it('leaves an unrecognised abbreviation alone rather than guessing', () => {
    expect(nameInTextForm({ ...raceRelations, provision: 'blah 4' }).inText).toBeUndefined();
  });

  it('offers no distinct prose form where there is no provision', () => {
    expect(nameInTextForm({ ...raceRelations, provision: undefined }).inText).toBeUndefined();
  });
});

// OSCOLA 1.1.3: secondary sources are always footnoted in full.
describe('secondary sources named in the text', () => {
  const book: Source = {
    id: 'b1', type: 'book', authors: [person('Robert', 'Stevens')], authorRole: 'author',
    title: 'Torts and Rights', publisher: 'OUP', year: '2007',
  };

  it('offers no shortened footnote and no prose form', () => {
    const form = nameInTextForm(book);
    expect(form.footnote).toBeUndefined();
    expect(form.inText).toBeUndefined();
    expect(form.footnoteRequired).toBe(true);
  });
});

// OSCOLA 3.3.2 is the one exception among the secondary sources.
describe('case notes named in the text', () => {
  const ashworth: Source = {
    id: 'j1', type: 'journalArticle', authors: [person('Andrew', 'Ashworth')],
    title: '', caseName: 'R (Singh) v Chief Constable of the West Midlands Police',
    isCaseNote: true, year: '2006', journal: 'Crim LR', firstPage: '441',
  };

  it('drops the case name from the footnote', () => {
    const form = nameInTextForm(ashworth);
    expect(form.footnote && toPlainText(form.footnote)).toBe(
      'Andrew Ashworth [2006] Crim LR 441 (note).',
    );
    expect(form.footnoteRequired).toBe(true);
  });

  it('reminds the writer the case still belongs in the table of cases', () => {
    expect(nameInTextForm(ashworth).note).toMatch(/table of cases/i);
  });

  it('leaves an ordinary article alone', () => {
    const article: Source = { ...ashworth, isCaseNote: undefined, caseName: undefined, title: 'Deference' };
    expect(nameInTextForm(article).footnote).toBeUndefined();
  });
});
