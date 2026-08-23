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

  it('cites the older statutory rules and orders by their SR & O number (2.5.1)', () => {
    const hollowWare: StatutoryInstrumentSource = {
      id: 'si3',
      type: 'statutoryInstrument',
      name: 'Hollow-ware and Galvanising Welfare Order',
      year: '1921',
      siNumber: '1921/2032',
      numbering: 'srAndO',
    };
    expect(fn(hollowWare)).toBe('Hollow-ware and Galvanising Welfare Order 1921, SR & O 1921/2032.');
    expect(bib(hollowWare)).toBe('Hollow-ware and Galvanising Welfare Order 1921, SR & O 1921/2032');
  });
});

describe('rules of court (2.5.2)', () => {
  const rules = (name: string, provision?: string): StatutoryInstrumentSource => ({
    id: 'roc',
    type: 'statutoryInstrument',
    name,
    year: '',
    siNumber: '',
    numbering: 'rulesOfCourt',
    provision,
  });

  // 2.5.2: the CPR, RSC and CCR "may be cited without reference to their SI
  // number or year". These four are the section's own examples.
  it('cites the CPR without a year or SI number', () => {
    expect(fn(rules('CPR', '7'))).toBe('CPR 7.');
  });

  it('keeps the RSC and CCR order and rule as typed', () => {
    expect(fn(rules('RSC', 'Ord 24, r 14A'))).toBe('RSC Ord 24, r 14A.');
    expect(fn(rules('CCR', 'Ord 17, r 11'))).toBe('CCR Ord 17, r 11.');
  });

  it('numbers a practice direction by the part it supplements', () => {
    expect(fn(rules('6A PD', '4.1'))).toBe('6A PD 4.1.');
    expect(fn(rules('7A PD', '8.2'))).toBe('7A PD 8.2.');
  });

  // 2.5.3: "do not insert a comma before the pinpoint".
  it('takes no comma before a pinpoint', () => {
    expect(fn(rules('CPR', '5.2(1)(b)'))).toBe('CPR 5.2(1)(b).');
  });

  it('lists the rules alone in the table of legislation', () => {
    expect(bib(rules('CPR', '5.2(1)(b)'))).toBe('CPR');
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

describe('EU cases (4.4.2)', () => {
  // The 5th edition's own worked examples. It replaced the ECR reference with
  // the European Case Law Identifier: the very citation the 4th edition gave as
  // `[2002] ECR II-2905` is now `EU:T:2002:174`. Note the plain hyphen in the
  // case number — the 4th edition printed an en dash.
  const mathisen: EuCaseSource = {
    id: 'ec1',
    type: 'euCase',
    caseNumber: 'T-344/99',
    caseName: 'Arne Mathisen AS v Council',
    ecli: 'EU:T:2002:174',
  };

  it('gives the number, then the name, then the ECLI', () => {
    expect(fn(mathisen)).toBe('Case T-344/99 Arne Mathisen AS v Council EU:T:2002:174.');
  });

  // Verbatim from the guide's own exemplar citation in 4.4.2.
  it('matches the guide’s worked example, pinpoint and all', () => {
    const schempp: EuCaseSource = {
      id: 'ec2',
      type: 'euCase',
      caseNumber: 'C-403/03',
      caseName: 'Schempp v Finanzamt',
      ecli: 'EU:C:2005:446',
      pinpoint: '[19]',
    };
    expect(fn(schempp)).toBe('Case C-403/03 Schempp v Finanzamt EU:C:2005:446 [19].');
  });

  it('says "Joined Cases" for joined proceedings', () => {
    const schijndel: EuCaseSource = {
      id: 'ec3',
      type: 'euCase',
      caseNumber: 'C-430 and 431/93',
      joined: true,
      caseName: 'Jereon van Schijndel v Stichting Pensioenfonds voor Fysiotherapeuten',
      ecli: 'EU:C:1995:441',
    };
    expect(fn(schijndel)).toBe(
      'Joined Cases C-430 and 431/93 Jereon van Schijndel v Stichting Pensioenfonds voor ' +
        'Fysiotherapeuten EU:C:1995:441.',
    );
  });

  // 2.1.6: a paragraph pinpoint is bracketed and takes no comma before it.
  // 4.4.2 pinpoints an Advocate General's opinion as ", point 51" instead, so
  // the bracket is what decides which separator is right.
  it('drops the comma before a bracketed pinpoint but keeps it before a worded one', () => {
    const withPin = (pinpoint: string): EuCaseSource => ({ ...mathisen, pinpoint });
    expect(fn(withPin('[19]'))).toBe(
      'Case T-344/99 Arne Mathisen AS v Council EU:T:2002:174 [19].',
    );
    expect(fn(withPin('point 51'))).toBe(
      'Case T-344/99 Arne Mathisen AS v Council EU:T:2002:174, point 51.',
    );
  });

  it('italicises only the case name', () => {
    expect(formatFootnote(mathisen)).toEqual([
      { text: 'Case T-344/99 ', style: 'plain' },
      { text: 'Arne Mathisen AS v Council', style: 'italic' },
      { text: ' EU:T:2002:174.', style: 'plain' },
    ]);
  });

  // OSCOLA 1.6.2: "List European Union ('EU') court decisions alphabetically by
  // case name and state the case number in round brackets before providing the
  // European Case Law Identifier." Verbatim from the guide's own example.
  it('tables the name, the bracketed number and the ECLI (1.6.2)', () => {
    const schempp: EuCaseSource = {
      id: 'ec4', type: 'euCase', caseNumber: 'C-403/03',
      caseName: 'Schempp v Finanzamt', ecli: 'EU:C:2005:446',
    };
    expect(bib(schempp)).toBe('Schempp v Finanzamt (Case C-403/03) EU:C:2005:446');
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
