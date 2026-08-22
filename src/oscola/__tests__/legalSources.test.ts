import { describe, expect, it } from 'vitest';
import { formatBibliography, formatFootnote } from '../format';
import { toPlainText } from '../../model/segments';
import type { EuCaseSource, EuLegislationSource, Source, StatutoryInstrumentSource } from '../../model/types';

const fn = (s: Source) => toPlainText(formatFootnote(s));
const bib = (s: Source) => toPlainText(formatBibliography(s));

// Every string below is verbatim from OSCOLA 4th edn or its quick reference guide.
describe('statutory instruments (2.5)', () => {
  const order: StatutoryInstrumentSource = {
    id: 'si1',
    type: 'statutoryInstrument',
    name: 'Penalties for Disorderly Behaviour (Amendment of Minimum Age) Order',
    year: '2004',
    siNumber: '2004/3166',
  };

  it('gives the name, year and SI number after a comma (2.5.1)', () => {
    expect(fn(order)).toBe(
      'Penalties for Disorderly Behaviour (Amendment of Minimum Age) Order 2004, SI 2004/3166.',
    );
  });

  it('cites a regulation after the SI number (2.5.3)', () => {
    const eggs: StatutoryInstrumentSource = {
      id: 'si2',
      type: 'statutoryInstrument',
      name: 'Eggs and Chicks (England) Regulations',
      year: '2009',
      siNumber: '2009/2163',
      provision: 'reg 7(2)',
    };
    expect(fn(eggs)).toBe('Eggs and Chicks (England) Regulations 2009, SI 2009/2163, reg 7(2).');
  });

  it('drops the provision from the table of legislation', () => {
    expect(bib({ ...order, provision: 'reg 3' })).toBe(
      'Penalties for Disorderly Behaviour (Amendment of Minimum Age) Order 2004, SI 2004/3166',
    );
  });
});

describe('EU legislation (2.6.1)', () => {
  const treaty: EuLegislationSource = {
    id: 'eu1',
    type: 'euLegislation',
    title: 'Consolidated Version of the Treaty on European Union',
    ojYear: '2008',
    ojSeries: 'C',
    ojIssue: '115',
    ojFirstPage: '13',
  };

  it('gives the title then the OJ citation', () => {
    expect(fn(treaty)).toBe(
      'Consolidated Version of the Treaty on European Union [2008] OJ C115/13.',
    );
  });

  it('cites the legislation series', () => {
    const protocol: EuLegislationSource = {
      id: 'eu2',
      type: 'euLegislation',
      title:
        'Protocol to the Agreement on the Member States that do not fully apply the Schengen acquis—Joint Declarations',
      ojYear: '2007',
      ojSeries: 'L',
      ojIssue: '129',
      ojFirstPage: '35',
    };
    expect(fn(protocol)).toBe(
      'Protocol to the Agreement on the Member States that do not fully apply the Schengen ' +
        'acquis—Joint Declarations [2007] OJ L129/35.',
    );
  });

  it('puts an article pinpoint after the OJ citation and a comma', () => {
    const merger: EuLegislationSource = {
      id: 'eu3',
      type: 'euLegislation',
      title:
        'Council Regulation (EC) 139/2004 on the control of concentrations between undertakings (EC Merger Regulation)',
      ojYear: '2004',
      ojSeries: 'L',
      ojIssue: '24',
      ojFirstPage: '1',
      pinpoint: 'art 5',
    };
    expect(fn(merger)).toBe(
      'Council Regulation (EC) 139/2004 on the control of concentrations between undertakings ' +
        '(EC Merger Regulation) [2004] OJ L24/1, art 5.',
    );
  });
});

describe('EU cases (2.6.2)', () => {
  const mathisen: EuCaseSource = {
    id: 'ec1',
    type: 'euCase',
    caseNumber: 'T–344/99',
    caseName: 'Arne Mathisen AS v Council',
    report: { year: '2002', abbreviation: 'ECR', firstPage: 'II–2905' },
  };

  it('gives the registration number then the case name, with no punctuation between', () => {
    expect(fn(mathisen)).toBe('Case T–344/99 Arne Mathisen AS v Council [2002] ECR II–2905.');
  });

  it('pinpoints paragraphs after a comma', () => {
    const commission: EuCaseSource = {
      id: 'ec2',
      type: 'euCase',
      caseNumber: 'C–176/03',
      caseName: 'Commission v Council',
      report: { year: '2005', abbreviation: 'ECR', firstPage: 'I–7879' },
      pinpoint: 'paras 47–48',
    };
    expect(fn(commission)).toBe(
      'Case C–176/03 Commission v Council [2005] ECR I–7879, paras 47–48.',
    );
  });

  it('says "Joined Cases" for joined proceedings', () => {
    const schijndel: EuCaseSource = {
      id: 'ec3',
      type: 'euCase',
      caseNumber: 'C–430 and 431/93',
      joined: true,
      caseName: 'Jereon van Schijndel v Stichting Pensioenfonds voor Fysiotherapeuten',
      report: { year: '1995', abbreviation: 'ECR', firstPage: 'I–4705' },
    };
    expect(fn(schijndel)).toBe(
      'Joined Cases C–430 and 431/93 Jereon van Schijndel v Stichting Pensioenfonds voor ' +
        'Fysiotherapeuten [1995] ECR I–4705.',
    );
  });

  // 2.6.2: "If the case is not yet reported in the OJ, then cite the case
  // number and case name, followed by the court and date of judgment in brackets."
  it('gives the court and date for a case not yet reported', () => {
    const bayer: EuCaseSource = {
      id: 'ec4',
      type: 'euCase',
      caseNumber: 'T–277/08',
      caseName: 'Bayer Healthcare v OHMI—Uriach Aquilea OTC',
      court: 'CFI',
      judgmentDate: '2009-11-11',
    };
    expect(fn(bayer)).toBe(
      'Case T–277/08 Bayer Healthcare v OHMI—Uriach Aquilea OTC (CFI, 11 November 2009).',
    );
  });

  it('italicises only the case name', () => {
    expect(formatFootnote(mathisen)).toEqual([
      { text: 'Case T–344/99 ', style: 'plain' },
      { text: 'Arne Mathisen AS v Council', style: 'italic' },
      { text: ' [2002] ECR II–2905.', style: 'plain' },
    ]);
  });

  // OSCOLA 1.6.2 tables the case under the first party name, with the case
  // number following in brackets, and case names are not italicised there.
  it('tables the case name with the number in brackets (1.6.2)', () => {
    expect(bib(mathisen)).toBe('Arne Mathisen AS v Council (T–344/99)');
    expect(formatBibliography(mathisen).every((s) => s.style === 'plain')).toBe(true);
  });
});

describe('chapters in edited books (3.2.3)', () => {
  const rose: Source = {
    id: 'bc1',
    type: 'bookChapter',
    authors: [{ kind: 'person', given: 'Francis', surname: 'Rose' }],
    chapterTitle: 'The Evolution of the Species',
    editors: [
      { kind: 'person', given: 'Andrew', surname: 'Burrows' },
      { kind: 'person', given: 'Alan', surname: 'Rodger' },
    ],
    bookTitle: 'Mapping the Law: Essays in Memory of Peter Birks',
    publisher: 'OUP',
    year: '2006',
  };

  it('gives author, chapter title, editors then book title', () => {
    expect(fn(rose)).toBe(
      "Francis Rose, 'The Evolution of the Species' in Andrew Burrows and Alan Rodger (eds), " +
        'Mapping the Law: Essays in Memory of Peter Birks (OUP 2006).',
    );
  });

  it('does not give the pages of the contribution', () => {
    expect(fn({ ...rose, pages: '83-95' })).not.toContain('83');
  });

  it('inverts authors and editors in the bibliography (1.7)', () => {
    expect(bib(rose)).toBe(
      "Rose F, 'The Evolution of the Species' in Burrows A and Rodger A (eds), " +
        'Mapping the Law: Essays in Memory of Peter Birks (OUP 2006)',
    );
  });
});
