import { describe, expect, it } from 'vitest';
import { formatFootnote } from '../format';
import { toHtml, toMarkdown } from '../../model/segments';
import type { BookSource } from '../../model/types';
import { bibliography, footnote, person } from './helpers';

const book = (fields: Omit<BookSource, 'id' | 'type'>): BookSource => ({
  id: 'b1',
  type: 'book',
  ...fields,
});

const hobbes = book({
  authors: [person('Thomas', 'Hobbes')],
  authorRole: 'author',
  title: 'Leviathan',
  firstPublished: '1651',
  publisher: 'Penguin',
  year: '1985',
  pinpoint: { kind: 'page', value: '268' },
});

const ashworth = book({
  authors: [person('Andrew', 'Ashworth')],
  authorRole: 'author',
  title: 'Principles of Criminal Law',
  edition: '6',
  publisher: 'OUP',
  year: '2009',
  pinpoint: { kind: 'page', value: '68' },
});

const fisher = book({
  authors: [person('Elizabeth', 'Fisher')],
  authorRole: 'author',
  title: 'Risk Regulation and Administrative Constitutionalism',
  publisher: 'Hart Publishing',
  year: '2007',
});

// Every string asserted below appears verbatim in OSCOLA 4th edn or its quick
// reference guide; the section is named in each test.
describe('books — OSCOLA 4th edn examples', () => {
  it('cites an original publication date before the publisher (quick reference guide)', () => {
    expect(footnote(hobbes)).toBe(
      'Thomas Hobbes, Leviathan (first published 1651, Penguin 1985) 268.',
    );
  });

  it('cites the edition before the publisher, pinpoint after the bracket (1.2.2)', () => {
    expect(footnote(ashworth)).toBe(
      'Andrew Ashworth, Principles of Criminal Law (6th edn, OUP 2009) 68.',
    );
  });

  it('cites a book with no edition (1.2.1)', () => {
    const stevens = book({
      authors: [person('Robert', 'Stevens')],
      authorRole: 'author',
      title: 'Torts and Rights',
      publisher: 'OUP',
      year: '2007',
    });
    expect(footnote(stevens)).toBe('Robert Stevens, Torts and Rights (OUP 2007).');
  });

  it('cites a book with only a publisher and year (3.2.1)', () => {
    const endicott = book({
      authors: [person('Timothy', 'Endicott')],
      authorRole: 'author',
      title: 'Administrative Law',
      publisher: 'OUP',
      year: '2009',
    });
    expect(footnote(endicott)).toBe('Timothy Endicott, Administrative Law (OUP 2009).');
  });

  it('cites an edition with a page pinpoint after the bracket (3.2.1)', () => {
    const burrows = book({
      authors: [person('Andrew', 'Burrows')],
      authorRole: 'author',
      title: 'Remedies for Torts and Breach of Contract',
      edition: '3',
      publisher: 'OUP',
      year: '2004',
      pinpoint: { kind: 'page', value: '317' },
    });
    expect(footnote(burrows)).toBe(
      'Andrew Burrows, Remedies for Torts and Breach of Contract (3rd edn, OUP 2004) 317.',
    );
  });

  // 3.2.1's bracket is "(additional information, edition, publisher year)", so
  // an editor or translator of an authored work precedes the edition.
  it('puts an editor of an authored work before the edition (3.2.2)', () => {
    const hart = book({
      authors: [person('HLA', 'Hart')],
      authorRole: 'author',
      title: 'Punishment and Responsibility: Essays in the Philosophy of Law',
      additionalInfo: 'John Gardner ed',
      edition: '2',
      publisher: 'OUP',
      year: '2008',
    });
    expect(footnote(hart)).toBe(
      'HLA Hart, Punishment and Responsibility: Essays in the Philosophy of Law ' +
        '(John Gardner ed, 2nd edn, OUP 2008).',
    );
  });

  it('puts a translator before the edition (3.2.2)', () => {
    const zweigert = book({
      authors: [person('K', 'Zweigert'), person('H', 'Kötz')],
      authorRole: 'author',
      title: 'An Introduction to Comparative Law',
      additionalInfo: 'Tony Weir tr',
      edition: '3',
      publisher: 'OUP',
      year: '1998',
    });
    expect(footnote(zweigert)).toBe(
      'K Zweigert and H Kötz, An Introduction to Comparative Law (Tony Weir tr, 3rd edn, OUP 1998).',
    );
    expect(bibliography(zweigert)).toBe(
      'Zweigert K and Kötz H, An Introduction to Comparative Law (Tony Weir tr, 3rd edn, OUP 1998)',
    );
  });

  it('marks a lone editor "(ed)" (3.2.2)', () => {
    const horder = book({
      authors: [person('Jeremy', 'Horder')],
      authorRole: 'editor',
      title: 'Oxford Essays in Jurisprudence: Fourth Series',
      publisher: 'OUP',
      year: '2000',
    });
    expect(footnote(horder)).toBe(
      'Jeremy Horder (ed), Oxford Essays in Jurisprudence: Fourth Series (OUP 2000).',
    );
  });

  it('marks two editors "(eds)" (3.2.3)', () => {
    const dutton = book({
      authors: [person('William H', 'Dutton'), person('Paul W', 'Jeffreys')],
      authorRole: 'editor',
      title:
        'World Wide Research: Reshaping the Sciences and Humanities in the Century of Information',
      publisher: 'MIT Press',
      year: '2010',
    });
    expect(footnote(dutton)).toBe(
      'William H Dutton and Paul W Jeffreys (eds), World Wide Research: Reshaping the ' +
        'Sciences and Humanities in the Century of Information (MIT Press 2010).',
    );
  });

  it('omits a first edition, which OSCOLA does not cite', () => {
    expect(footnote({ ...ashworth, edition: '1', pinpoint: undefined })).toBe(
      'Andrew Ashworth, Principles of Criminal Law (OUP 2009).',
    );
  });

  it('omits the place of publication, which OSCOLA 4th edn dropped', () => {
    expect(footnote({ ...fisher, place: 'Oxford' })).toBe(
      'Elizabeth Fisher, Risk Regulation and Administrative Constitutionalism (Hart Publishing 2007).',
    );
  });
});

describe('books — bibliography', () => {
  it('inverts the author and drops the pinpoint and full stop (1.7)', () => {
    expect(bibliography(fisher)).toBe(
      'Fisher E, Risk Regulation and Administrative Constitutionalism (Hart Publishing 2007)',
    );
  });

  // OSCOLA 1.7 lists "—— and Honoré AM, Causation in the Law (2nd edn, OUP 1985)"
  // under "Hart HLA", so the entry reads "Hart HLA and Honoré AM, ...". This is
  // the guide's only worked multi-author bibliography entry, and it settles that
  // EVERY author inverts, not just the first.
  it('inverts every author, not only the first (1.7)', () => {
    const causation = book({
      authors: [person('HLA', 'Hart'), person('AM', 'Honoré')],
      authorRole: 'author',
      title: 'Causation in the Law',
      edition: '2',
      publisher: 'OUP',
      year: '1985',
    });

    expect(footnote(causation)).toBe(
      'HLA Hart and AM Honoré, Causation in the Law (2nd edn, OUP 1985).',
    );
    expect(bibliography(causation)).toBe(
      'Hart HLA and Honoré AM, Causation in the Law (2nd edn, OUP 1985)',
    );
  });

  it('precedes an unattributed work with a double em-dash (1.7)', () => {
    const anonymous = book({
      authors: [],
      authorRole: 'author',
      title: 'The Bluebook: A Uniform System of Citation',
      edition: '19',
      publisher: 'Harvard Law Review Association',
      year: '2010',
    });

    expect(bibliography(anonymous)).toBe(
      '—— The Bluebook: A Uniform System of Citation ' +
        '(19th edn, Harvard Law Review Association 2010)',
    );
    // Footnotes simply begin with the title.
    expect(footnote(anonymous)).toBe(
      'The Bluebook: A Uniform System of Citation (19th edn, Harvard Law Review Association 2010).',
    );
  });
});

describe('books — markup', () => {
  it('italicises only the title', () => {
    expect(formatFootnote(fisher)).toEqual([
      { text: 'Elizabeth Fisher, ', style: 'plain' },
      { text: 'Risk Regulation and Administrative Constitutionalism', style: 'italic' },
      { text: ' (Hart Publishing 2007).', style: 'plain' },
    ]);
  });

  it('renders the title as <em> in HTML', () => {
    expect(toHtml(formatFootnote(fisher))).toBe(
      'Elizabeth Fisher, <em>Risk Regulation and Administrative Constitutionalism</em> ' +
        '(Hart Publishing 2007).',
    );
  });

  it('renders the title as emphasis in Markdown', () => {
    expect(toMarkdown(formatFootnote(hobbes))).toBe(
      'Thomas Hobbes, *Leviathan* (first published 1651, Penguin 1985) 268.',
    );
  });
});
