import { describe, expect, it } from 'vitest';
import { buildSource, toDraft } from './fields';
import type { Source } from './model/types';

const person = (given: string, surname: string) =>
  ({ kind: 'person', given, surname }) as const;

/**
 * Editing a saved source loads it back into the form, so the round trip has to
 * be lossless: every field the form can hold must survive it.
 */
const roundTrip = (source: Source) => {
  const { draft, authors, editors } = toDraft(source);
  return buildSource(source.id, source.type, draft, authors, editors);
};

const sources: Record<string, Source> = {
  'a fully specified case': {
    id: 's1', type: 'case', caseName: 'Bunt v Tilley',
    neutral: { year: '2006', court: 'EWHC', number: '407', division: 'QB' },
    report: { year: '2006', yearFormat: 'square', volume: '3', abbreviation: 'All ER', firstPage: '336' },
    pinpoint: { kind: 'paragraph', references: [{ locus: '1-37', judge: 'Eady J' }] },
    shortName: 'Bunt',
  },
  'a round-bracket case with a court': {
    id: 's2', type: 'case', caseName: 'Barrett v Enfield LBC',
    report: { year: '1999', yearFormat: 'round', volume: '49', abbreviation: 'BMLR', firstPage: '1' },
    court: 'HL',
  },
  'an unreported case': {
    id: 's3', type: 'case', caseName: 'Stubbs v Sayer',
    court: 'CA', judgmentDate: '1990-11-08',
  },
  'an Act with a short form': {
    id: 's4', type: 'act', shortTitle: 'Nuclear Installations Act', year: '1965',
    provision: 's 7(1)', shortForm: 'NIA 1965',
  },
  'a statutory instrument': {
    id: 's5', type: 'statutoryInstrument', name: 'Eggs and Chicks (England) Regulations',
    year: '2009', siNumber: '2009/2163', provision: 'reg 7(2)', shortForm: 'Eggs Regs',
  },
  'a statutory rule and order': {
    id: 's5a', type: 'statutoryInstrument', name: 'Hollow-ware and Galvanising Welfare Order',
    year: '1921', siNumber: '1921/2032', numbering: 'srAndO',
  },
  'rules of court': {
    id: 's5b', type: 'statutoryInstrument', name: 'CPR',
    year: '', siNumber: '', numbering: 'rulesOfCourt', provision: '5.2(1)(b)',
  },
  'EU legislation': {
    id: 's6', type: 'euLegislation', title: 'Consolidated Version of the Treaty on European Union',
    ojYear: '2008', ojSeries: 'C', ojIssue: '115', ojFirstPage: '13',
    pinpoint: 'art 50', shortForm: 'TEU',
  },
  'a joined EU case': {
    id: 's7', type: 'euCase', caseNumber: 'C–430 and 431/93', joined: true,
    caseName: 'Jereon van Schijndel v Stichting Pensioenfonds',
    report: { year: '1995', abbreviation: 'ECR', firstPage: 'I–4705' },
    pinpoint: 'paras 47–48',
  },
  'an unreported EU case': {
    id: 's8', type: 'euCase', caseNumber: 'T–277/08', joined: false,
    caseName: 'Bayer Healthcare v OHMI', court: 'CFI', judgmentDate: '2009-11-11',
  },
  'an untitled case note': {
    id: 's9a', type: 'journalArticle', authors: [person('Andrew', 'Ashworth')],
    title: '', caseName: 'R (Singh) v Chief Constable of the West Midlands Police',
    isCaseNote: true, year: '2006', journal: 'Crim LR', firstPage: '441',
  },
  'a forthcoming online article': {
    id: 's9b', type: 'journalArticle', authors: [person('Graham', 'Greenleaf')],
    title: 'Free Access', year: '2010', volume: '1', issue: '1', journal: 'EJLT',
    firstPage: '', forthcoming: true,
    url: 'http://ejlt.org/article/view/17', accessDate: '2010-07-27',
  },
  'a journal article': {
    id: 's9', type: 'journalArticle', authors: [person('Alison L', 'Young')],
    title: 'In Defence of Due Deference', year: '2009', volume: '72', issue: '3',
    journal: 'MLR', firstPage: '554', shortTitle: 'Due Deference',
    pinpoint: { kind: 'page', value: '560' },
  },
  'a book with everything': {
    id: 's10', type: 'book', authors: [person('HLA', 'Hart')], authorRole: 'editor',
    title: 'Punishment and Responsibility', edition: '2', firstPublished: '1968',
    additionalInfo: 'John Gardner ed', publisher: 'OUP', year: '2008', place: 'Oxford',
    shortTitle: 'Punishment', pinpoint: { kind: 'page', value: '68' },
  },
  'a chapter': {
    id: 's11', type: 'bookChapter', authors: [person('Francis', 'Rose')],
    chapterTitle: 'The Evolution of the Species',
    editors: [person('Andrew', 'Burrows'), person('Alan', 'Rodger')],
    bookTitle: 'Mapping the Law', edition: '2', publisher: 'OUP', year: '2006',
    pages: '83-95', shortTitle: 'Evolution',
  },
  'a website': {
    id: 's12', type: 'website', authors: [{ kind: 'corporate', name: 'Law Commission' }],
    title: 'Reforming Bribery', siteName: 'Law Com', publicationDate: '2008-11-19',
    url: 'www.example.com/x', accessDate: '2009-11-19', shortTitle: 'Bribery',
  },
  'OU module material': {
    id: 's13', type: 'ouModuleMaterial', authors: [], year: '2025',
    itemTitle: 'Unit 4: Rules and regulations', moduleCode: 'W111',
    moduleTitle: 'Criminal law', url: 'https://learn2.open.ac.uk/x', accessDate: '2026-03-07',
  },
};

describe('loading a source back into the form', () => {
  for (const [name, source] of Object.entries(sources)) {
    it(`round-trips ${name} without losing a field`, () => {
      expect(roundTrip(source)).toEqual(source);
    });
  }

  it('keeps a judge attached to the pinpoint', () => {
    const source = sources['a fully specified case']!;
    expect(toDraft(source).draft['pinpoint.judge']).toBe('Eady J');
    expect(toDraft(source).draft['pinpoint.value']).toBe('1-37');
  });

  it('carries authors and editors separately', () => {
    const { authors, editors } = toDraft(sources['a chapter']!);
    expect(authors).toHaveLength(1);
    expect(editors).toHaveLength(2);
  });

  it('restores the select defaults a blank form would use', () => {
    const { draft } = toDraft(sources['a round-bracket case with a court']!);
    expect(draft['report.yearFormat']).toBe('round');
  });
});
