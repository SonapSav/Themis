import { describe, expect, it } from 'vitest';
import { toPlainText } from '../model/segments';
import type {
  BookChapterSource,
  BookSource,
  JournalArticleSource,
  OuModuleMaterialSource,
  WebsiteSource,
} from '../model/types';
import { formatInTextCitation, formatReference, type HarvardSource } from './format';
import { harvardInitials } from './authors';

const ref = (s: HarvardSource) => toPlainText(formatReference(s));
const cite = (s: HarvardSource, o = {}) => toPlainText(formatInTextCitation(s, o));
const person = (given: string, surname: string) =>
  ({ kind: 'person', given, surname }) as const;

const book = (fields: Omit<BookSource, 'id' | 'type'>): BookSource => ({
  id: 'b', type: 'book', ...fields,
});

const bell = book({
  authors: [person('J', 'Bell')],
  authorRole: 'author',
  title: 'Doing your research project',
  publisher: 'Open University Press',
  year: '2014',
});

// Examples are verbatim from the Open University's own referencing guides:
// the law-modules quick guide (Cite Them Right 12th edn) and the Harvard
// quick guide. Section references are to Cite Them Right via those guides.
describe('Harvard reference list — Cite Them Right', () => {
  it('formats a book without a place of publication (CTR 12th edn)', () => {
    expect(ref(bell)).toBe('Bell, J. (2014) Doing your research project. Open University Press.');
  });

  it('formats a journal article with issue information and page range', () => {
    const foran: JournalArticleSource = {
      id: 'j', type: 'journalArticle',
      authors: [person('M', 'Foran')],
      title: 'The cornerstone of our law: equality, consistency and judicial review',
      year: '2022',
      volume: '81',
      issue: '2',
      journal: 'Cambridge Law Journal',
      firstPage: '249-272',
    };
    expect(ref(foran)).toBe(
      "Foran, M. (2022) 'The cornerstone of our law: equality, consistency and judicial review', " +
        'Cambridge Law Journal, 81(2), pp. 249–272.',
    );
  });

  it('formats a chapter in an edited book', () => {
    const franklin: BookChapterSource = {
      id: 'bc', type: 'bookChapter',
      authors: [person('A.W.', 'Franklin')],
      chapterTitle: 'Management of the problem',
      editors: [person('S.M.', 'Smith')],
      bookTitle: 'The maltreatment of children',
      publisher: 'MTP',
      year: '2012',
      pages: '83-95',
    };
    expect(ref(franklin)).toBe(
      "Franklin, A.W. (2012) 'Management of the problem', in Smith, S.M. (ed.) " +
        'The maltreatment of children. MTP, pp. 83–95.',
    );
  });

  it('italicises a web page title rather than quoting it', () => {
    const burton: WebsiteSource = {
      id: 'w', type: 'website',
      authors: [person('P.A.', 'Burton')],
      title: 'Castles of Spain',
      publicationDate: '2012',
      url: 'http://www.castlesofspain.co.uk/',
      accessDate: '2015-10-14',
    };
    expect(ref(burton)).toBe(
      'Burton, P.A. (2012) Castles of Spain. Available at: http://www.castlesofspain.co.uk/ ' +
        '(Accessed: 14 October 2015).',
    );
    expect(formatReference(burton).some((s) => s.style === 'italic')).toBe(true);
  });

  it('formats OU online module material', () => {
    const unit: OuModuleMaterialSource = {
      id: 'ou', type: 'ouModuleMaterial',
      authors: [],
      year: '2025',
      itemTitle: 'Unit 4: Rules and regulations',
      moduleCode: 'W376',
      moduleTitle: 'Law for life',
      url: 'https://learn2.open.ac.uk/mod/oucontent/view.php?id=XXXXXXXX',
      accessDate: '2032-03-07',
    };
    expect(ref(unit)).toBe(
      "The Open University (2025) 'Unit 4: Rules and regulations'. W376: Law for life. " +
        'Available at: https://learn2.open.ac.uk/mod/oucontent/view.php?id=XXXXXXXX ' +
        '(Accessed: 7 March 2032).',
    );
  });

  it('cites an edition later than the first', () => {
    expect(ref({ ...bell, edition: '3' })).toBe(
      'Bell, J. (2014) Doing your research project. 3rd edn. Open University Press.',
    );
    expect(ref({ ...bell, edition: '1' })).toBe(
      'Bell, J. (2014) Doing your research project. Open University Press.',
    );
  });

  it('spells out "no date" rather than contracting it to n.d.', () => {
    expect(ref({ ...bell, year: '' })).toContain('(no date)');
    expect(ref({ ...bell, year: '' })).not.toContain('n.d.');
  });
});

describe('Harvard in-text citations', () => {
  const withAuthors = (...names: Array<[string, string]>) =>
    book({ ...bell, year: '2015', authors: names.map(([g, s]) => person(g, s)) });

  it('gives author and date, parenthetically or narratively', () => {
    const harris = withAuthors(['A', 'Harris']);
    expect(cite(harris)).toBe('(Harris, 2015)');
    expect(cite(harris, { form: 'narrative' })).toBe('Harris (2015)');
  });

  it('names two authors', () => {
    expect(cite(withAuthors(['A', 'Shah'], ['B', 'Papadopoulos']))).toBe(
      '(Shah and Papadopoulos, 2015)',
    );
  });

  it('names three authors', () => {
    expect(cite(withAuthors(['A', 'Wong'], ['B', 'Smith'], ['C', 'Adebole']))).toBe(
      '(Wong, Smith and Adebole, 2015)',
    );
  });

  it('reduces four or more authors to the first plus italic "et al."', () => {
    const four = withAuthors(['A', 'Wong'], ['B', 'Smith'], ['C', 'Adebole'], ['D', 'Young']);
    expect(cite(four)).toBe('(Wong et al., 2015)');
    expect(formatInTextCitation(four)).toContainEqual({ text: 'et al.', style: 'italic' });
  });

  it('adds a page for a single page and pages for a range', () => {
    expect(cite(withAuthors(['A', 'Harris']), { pages: '5' })).toBe('(Harris, 2015, p. 5)');
    expect(cite(withAuthors(['A', 'Clarke']), { pages: '98-99' })).toBe(
      '(Clarke, 2015, pp. 98–99)',
    );
  });

  it('does not invert a corporate author', () => {
    const ou = book({ ...bell, year: '2015', authors: [{ kind: 'corporate', name: 'The Open University' }] });
    expect(cite(ou)).toBe('(The Open University, 2015)');
    expect(ref(ou)).toContain('The Open University (2015)');
  });

  it('falls back to the italicised title where there is no author', () => {
    const anonymous = book({
      ...bell, year: '2015', authors: [], title: 'Information Literacy in Higher Education',
    });
    expect(cite(anonymous)).toBe('(Information Literacy in Higher Education, 2015)');
    expect(formatInTextCitation(anonymous)).toContainEqual({
      text: 'Information Literacy in Higher Education', style: 'italic',
    });
  });
});

describe('Harvard initials', () => {
  it('punctuates each initial with a full stop and no space', () => {
    expect(harvardInitials('Alison L')).toBe('A.L.');
    expect(harvardInitials('HLA')).toBe('H.L.A.');
    expect(harvardInitials('A.W.')).toBe('A.W.');
    expect(harvardInitials('Paul')).toBe('P.');
  });
});
