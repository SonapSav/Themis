import type {
  Author,
  BookChapterSource,
  BookSource,
  CaseSource,
  EuCaseSource,
  EuLegislationSource,
  JournalArticleSource,
  OuModuleMaterialSource,
  Source,
  SourceType,
  StatutoryInstrumentSource,
  WebsiteSource,
} from './citations';
import { pinpointFrom, pinpointReferences, type Pinpoint } from './citations';

/** A flat, all-string draft. Nested source fields use dotted keys. */
export type Draft = Record<string, string>;

export interface FieldSpec {
  readonly key: string;
  readonly label: string;
  readonly hint?: string;
  readonly placeholder?: string;
  readonly control?: 'text' | 'date' | 'select';
  readonly options?: ReadonlyArray<{ value: string; label: string }>;
  /** Renders as a section heading above this field. */
  readonly group?: string;
}

const PINPOINT_KIND = [
  { value: 'paragraph', label: 'Paragraph' },
  { value: 'page', label: 'Page' },
];

export const FIELDS: Record<SourceType, readonly FieldSpec[]> = {
  case: [
    { key: 'caseName', label: 'Case name', placeholder: 'Corr v IBC Vehicles Ltd', hint: 'Both parties joined by "v", with no full stop. Italicised automatically.' },
    { key: 'neutral.year', label: 'Year', placeholder: '2008', group: 'Neutral citation', hint: 'Required for cases from 2001 onwards. Always cited first.' },
    { key: 'neutral.court', label: 'Court', placeholder: 'UKHL' },
    { key: 'neutral.number', label: 'Judgment number', placeholder: '13' },
    { key: 'neutral.division', label: 'Division', placeholder: 'QB', hint: 'High Court only, e.g. [2006] EWHC 407 (QB).' },
    { key: 'report.year', label: 'Year', placeholder: '2008', group: 'Law report' },
    {
      key: 'report.yearFormat',
      label: 'Year brackets',
      control: 'select',
      options: [
        { value: 'square', label: 'Square — [2008] 1 AC 884' },
        { value: 'round', label: 'Round — (1965) 109 SJ 175' },
      ],
      hint: 'Square where the year identifies the volume; round where the volume is numbered independently of the year.',
    },
    { key: 'report.volume', label: 'Volume', placeholder: '1' },
    { key: 'report.abbreviation', label: 'Report series', placeholder: 'AC' },
    { key: 'report.firstPage', label: 'First page', placeholder: '884' },
    { key: 'court', label: 'Court', placeholder: 'HL', group: 'Other', hint: 'Not cited where there is a neutral citation, nor for cases decided before 1865.' },
    { key: 'judgmentDate', label: 'Date of judgment', control: 'date', hint: 'Only for an unreported case with no neutral citation: the court and this date are cited in place of a report.' },
    { key: 'shortName', label: 'Short name', placeholder: 'Austin', hint: 'Used when the case is cited again. Derived from the first party if left blank.' },
    { key: 'pinpoint.kind', label: 'Pinpoint type', control: 'select', options: PINPOINT_KIND },
    { key: 'pinpoint.value', label: 'Pinpoint', placeholder: '14', hint: 'Paragraph numbers are bracketed automatically. Ranges: 1-37. Lists: 42, 45.' },
    { key: 'pinpoint.judge', label: 'Judge', placeholder: 'Laws LJ', hint: 'Added in brackets after the pinpoint. Surname and judicial office, no honorifics and no "per".' },
  ],
  act: [
    { key: 'shortTitle', label: 'Short title', placeholder: 'Human Rights Act', hint: 'Without the year — it has its own field.' },
    { key: 'year', label: 'Year', placeholder: '1998' },
    { key: 'provision', label: 'Provision', placeholder: 's 15(1)(b)', hint: 'OSCOLA abbreviations: pt/pts, s/ss, sub-s/sub-ss, para/paras, subpara/subparas, sch/schs. A space, no full stop, before the number.' },
    { key: 'shortForm', label: 'Short form', placeholder: 'HRA 1998', hint: 'Abbreviation for repeat citations. Announced in brackets on the first citation, then used alone.' },
  ],
  journalArticle: [
    { key: 'title', label: 'Article title', placeholder: 'In Defence of Due Deference', hint: 'Single quotation marks are added automatically. Leave blank on a case note that has no title of its own.' },
    { key: 'year', label: 'Year', placeholder: '2009' },
    { key: 'volume', label: 'Volume', placeholder: '72', hint: 'Leave blank only if the journal genuinely has no volumes — the year then takes square brackets.' },
    { key: 'issue', label: 'Issue', placeholder: '3', hint: 'Only where pagination restarts each issue.' },
    { key: 'journal', label: 'Journal abbreviation', placeholder: 'MLR' },
    { key: 'firstPage', label: 'First page', placeholder: '554', hint: 'Online journals often have none, and a forthcoming article may not have one yet.' },
    { key: 'pinpoint.value', label: 'Pinpoint page', placeholder: '560' },
    {
      key: 'isCaseNote',
      label: 'Case note',
      control: 'select',
      group: 'Case note, forthcoming, online',
      options: [
        { value: '', label: 'No' },
        { value: 'yes', label: 'Yes — adds (note)' },
      ],
      hint: 'A note on a decided case. One with its own title is cited as an ordinary article.',
    },
    { key: 'caseName', label: 'Case discussed', placeholder: 'R (Singh) v Chief Constable of the West Midlands Police', hint: 'Only for a case note with no title of its own: the case name is italicised and takes the title\u2019s place. Cite the case itself in the table of cases too.' },
    {
      key: 'forthcoming',
      label: 'Forthcoming',
      control: 'select',
      options: [
        { value: '', label: 'No' },
        { value: 'yes', label: 'Yes — adds (forthcoming)' },
      ],
      hint: 'Accepted but not yet published. Leave the volume and first page blank where they are not yet known.',
    },
    { key: 'url', label: 'Web address', placeholder: 'http://ejlt.org/article/view/17', hint: 'Only for an article published electronically. Printed in angled brackets, after any pinpoint.' },
    { key: 'accessDate', label: 'Date accessed', control: 'date', hint: 'The date you last read the article online.' },
    { key: 'shortTitle', label: 'Short title', placeholder: 'Testing Fidelity to Legal Values', hint: 'Used when you cite more than one work by this author.', group: 'Other' },
  ],
  book: [
    {
      key: 'authorRole',
      label: 'Role',
      control: 'select',
      options: [
        { value: 'author', label: 'Author(s)' },
        { value: 'editor', label: 'Editor(s) — adds (ed) / (eds)' },
      ],
    },
    { key: 'title', label: 'Title', placeholder: 'Goff and Jones: The Law of Restitution', hint: 'Italicised automatically.' },
    { key: 'edition', label: 'Edition', placeholder: '7', hint: 'A bare numeral. First editions are not cited, so leave blank or enter 1.' },
    { key: 'firstPublished', label: 'First published', placeholder: '1651', hint: 'Reprints and translations only.' },
    { key: 'additionalInfo', label: 'Additional information', placeholder: 'John Gardner ed', hint: 'Editor or translator of an authored work, series, or other clarifying detail. Sits before the edition.' },
    { key: 'publisher', label: 'Publisher', placeholder: 'Sweet & Maxwell' },
    { key: 'year', label: 'Year', placeholder: '2007' },
    { key: 'place', label: 'Place of publication', placeholder: 'London', hint: 'Recorded but not cited: OSCOLA 4th edn dropped the place of publication.' },
    { key: 'volume', label: 'Volume', placeholder: '2', group: 'Multi-volume works', hint: 'A bare numeral; "vol" is added for you. Only for a work published in more than one volume.' },
    {
      key: 'volumesVary',
      label: 'Volume position',
      control: 'select',
      options: [
        { value: '', label: 'After the publication details — (CH Beck 2000) vol 2' },
        { value: 'vary', label: 'Before them — , vol 2 (CH Beck 2000)' },
      ],
      hint: 'The volume normally follows the publication details. It precedes them, after a comma, where the volumes were published separately so their details differ.',
    },
    { key: 'pinpoint.kind', label: 'Pinpoint type', control: 'select', group: 'Other', options: PINPOINT_KIND },
    { key: 'pinpoint.value', label: 'Pinpoint', placeholder: '317', hint: 'Page numbers stand alone, without "p". Paragraphs are labelled "para" — pinpoint to paragraphs where the work numbers them. Type "paras" yourself for several.' },
    { key: 'shortTitle', label: 'Short title', placeholder: 'Principles', hint: 'Used when you cite more than one work by this author.' },
  ],
  statutoryInstrument: [
    {
      key: 'numbering',
      label: 'Numbering',
      control: 'select',
      options: [
        { value: 'si', label: 'SI — Order 2004, SI 2004/3166' },
        { value: 'srAndO', label: 'SR & O — Order 1921, SR & O 1921/2032' },
        { value: 'rulesOfCourt', label: 'Rules of court — CPR 7' },
      ],
      hint: 'Statutory instruments were called statutory rules and orders before 1948. The CPR, RSC and CCR are cited without a year or number; cite every other court rule in full as a statutory instrument.',
    },
    { key: 'name', label: 'Name', placeholder: 'Eggs and Chicks (England) Regulations', hint: 'Without the year — it has its own field. For rules of court, the abbreviation alone: CPR, RSC, CCR, or "6A PD" for a practice direction.' },
    { key: 'year', label: 'Year', placeholder: '2009', hint: 'Not cited for the rules of court.' },
    { key: 'siNumber', label: 'SI number', placeholder: '2009/2163', hint: 'Year and serial number, printed after "SI" — or after "SR & O". Not cited for the rules of court.' },
    { key: 'provision', label: 'Provision', placeholder: 'reg 7(2)', hint: 'Same abbreviations as for Acts, plus reg/regs, r/rr, art/arts. The rules of court take no comma before the pinpoint, and the CPR omits "r" and "rr": CPR 5.2(1)(b).' },
    { key: 'shortForm', label: 'Short form', placeholder: 'UTCCR 1999', hint: 'Abbreviation for repeat citations.' },
  ],
  euLegislation: [
    { key: 'title', label: 'Title', placeholder: 'Consolidated Version of the Treaty on European Union', hint: 'The full title as published, including the legislation type and number where there is one.' },
    { key: 'ojYear', label: 'OJ year', placeholder: '2008', group: 'Official Journal' },
    {
      key: 'ojSeries', label: 'Series', control: 'select',
      options: [
        { value: 'L', label: 'L — legislation' },
        { value: 'C', label: 'C — information and notices' },
        { value: 'S', label: 'S — invitations to tender' },
      ],
    },
    { key: 'ojIssue', label: 'Issue', placeholder: '115' },
    { key: 'ojFirstPage', label: 'First page', placeholder: '13' },
    { key: 'pinpoint', label: 'Pinpoint', placeholder: 'art 5', group: 'Other' },
    { key: 'shortForm', label: 'Short form', placeholder: 'Working Time Directive', hint: 'Announced in brackets on the first citation, then used alone.' },
  ],
  euCase: [
    {
      key: 'joined', label: 'Proceedings', control: 'select',
      options: [
        { value: '', label: 'Single case' },
        { value: 'joined', label: 'Joined cases' },
      ],
    },
    { key: 'caseNumber', label: 'Registration number', placeholder: 'C–176/03', hint: 'Without the "Case" prefix. C– for the Court of Justice, T– for the General Court, F– for the Civil Service Tribunal.' },
    { key: 'caseName', label: 'Case name', placeholder: 'Commission v Council', hint: 'Italicised automatically. No punctuation between the number and the name.' },
    { key: 'report.year', label: 'Year', placeholder: '2005', group: 'Report' },
    { key: 'report.abbreviation', label: 'Report series', placeholder: 'ECR', hint: 'Prefer the official ECR; otherwise CMLR.' },
    { key: 'report.firstPage', label: 'First page', placeholder: 'I–7879', hint: 'Include the volume prefix: I– for the Court of Justice, II– for the General Court.' },
    { key: 'court', label: 'Court', placeholder: 'CFI', group: 'Other', hint: 'Only where the case is not yet reported.' },
    { key: 'judgmentDate', label: 'Date of judgment', control: 'date', hint: 'Cited with the court where the case is not yet reported.' },
    { key: 'pinpoint', label: 'Pinpoint', placeholder: 'paras 47–48' },
  ],
  bookChapter: [
    { key: 'chapterTitle', label: 'Chapter title', placeholder: 'The Evolution of the Species' },
    { key: 'bookTitle', label: 'Book title', placeholder: 'Mapping the Law: Essays in Memory of Peter Birks', hint: 'Italicised automatically.' },
    { key: 'edition', label: 'Edition', placeholder: '2' },
    { key: 'publisher', label: 'Publisher', placeholder: 'OUP' },
    { key: 'year', label: 'Year', placeholder: '2006' },
    { key: 'pages', label: 'Page range', placeholder: '83-95', hint: 'Used in Harvard. OSCOLA does not give the pages of a contribution.' },
    { key: 'shortTitle', label: 'Short title', hint: 'Used when you cite more than one work by this author.' },
  ],
  ouModuleMaterial: [
    { key: 'year', label: 'Year', placeholder: '2025', hint: 'Leave blank to cite "n.d.".' },
    { key: 'itemTitle', label: 'Item title', placeholder: 'Unit 4: Rules and regulations' },
    { key: 'moduleCode', label: 'Module code', placeholder: 'W111' },
    { key: 'moduleTitle', label: 'Module title', placeholder: 'Criminal law and the courts' },
    { key: 'url', label: 'Address on the module website', placeholder: 'https://learn2.open.ac.uk/mod/oucontent/view.php?id=…' },
    { key: 'accessDate', label: 'Date accessed', control: 'date' },
  ],
  website: [
    { key: 'title', label: 'Page title', placeholder: 'Virtual Friend Fires Employee', hint: 'Single quotation marks are added automatically.' },
    { key: 'siteName', label: 'Website or publisher', placeholder: 'Naked Law' },
    { key: 'publicationDate', label: 'Date published', control: 'date' },
    { key: 'url', label: 'URL', placeholder: 'www.nakedlaw.com/2009/05/index.html', hint: 'OSCOLA includes "http://" only where the address does not begin with "www".' },
    { key: 'accessDate', label: 'Date accessed', control: 'date' },
  ],
};

export interface AuthorListSpec {
  readonly key: 'authors' | 'editors';
  readonly label: string;
}

/** Which author lists each type shows, and what to call them. */
export const AUTHOR_LISTS: Partial<Record<SourceType, readonly AuthorListSpec[]>> = {
  journalArticle: [{ key: 'authors', label: 'Authors' }],
  book: [{ key: 'authors', label: 'Authors or editors' }],
  bookChapter: [
    { key: 'authors', label: 'Chapter authors' },
    { key: 'editors', label: 'Editors of the book' },
  ],
  website: [{ key: 'authors', label: 'Authors' }],
  ouModuleMaterial: [{ key: 'authors', label: 'Authors (leave empty to cite The Open University)' }],
};

export const DEFAULT_DRAFTS: Record<SourceType, Draft> = {
  case: { 'report.yearFormat': 'square', 'pinpoint.kind': 'paragraph' },
  act: {},
  statutoryInstrument: { numbering: 'si' },
  euLegislation: { ojSeries: 'L' },
  euCase: { joined: '' },
  journalArticle: {},
  book: { authorRole: 'author', 'pinpoint.kind': 'page' },
  bookChapter: {},
  website: {},
  ouModuleMaterial: {},
};

const opt = (draft: Draft, key: string): string | undefined => {
  const value = draft[key]?.trim();
  return value ? value : undefined;
};
const req = (draft: Draft, key: string): string => draft[key]?.trim() ?? '';

/**
 * Fold the flat draft back into a typed source. Empty optional fields become
 * `undefined` so the formatters can drop whole clauses — a blank law report
 * must not render as `[] `.
 */
export function buildSource(
  id: string,
  type: SourceType,
  draft: Draft,
  authors: readonly Author[],
  editors: readonly Author[] = [],
): Source {
  switch (type) {
    case 'case': {
      const hasNeutral = Boolean(opt(draft, 'neutral.court') || opt(draft, 'neutral.number'));
      const hasReport = Boolean(opt(draft, 'report.abbreviation') || opt(draft, 'report.firstPage'));
      const source: CaseSource = {
        id,
        type: 'case',
        caseName: req(draft, 'caseName'),
        neutral: hasNeutral
          ? {
              year: req(draft, 'neutral.year'),
              court: req(draft, 'neutral.court'),
              number: req(draft, 'neutral.number'),
              division: opt(draft, 'neutral.division'),
            }
          : undefined,
        report: hasReport
          ? {
              year: req(draft, 'report.year'),
              yearFormat: draft['report.yearFormat'] === 'round' ? 'round' : 'square',
              volume: opt(draft, 'report.volume'),
              abbreviation: req(draft, 'report.abbreviation'),
              firstPage: req(draft, 'report.firstPage'),
            }
          : undefined,
        court: opt(draft, 'court'),
        judgmentDate: opt(draft, 'judgmentDate'),
        shortName: opt(draft, 'shortName'),
        pinpoint: pinpointFrom(
          draft['pinpoint.kind'] === 'page' ? 'page' : 'paragraph',
          opt(draft, 'pinpoint.value'),
          opt(draft, 'pinpoint.judge'),
        ),
      };
      return source;
    }

    case 'act':
      return {
        id,
        type: 'act',
        shortTitle: req(draft, 'shortTitle'),
        year: req(draft, 'year'),
        provision: opt(draft, 'provision'),
        shortForm: opt(draft, 'shortForm'),
      };

    case 'journalArticle': {
      const pinpointValue = opt(draft, 'pinpoint.value');
      const source: JournalArticleSource = {
        id,
        type: 'journalArticle',
        authors,
        title: req(draft, 'title'),
        year: req(draft, 'year'),
        volume: opt(draft, 'volume'),
        issue: opt(draft, 'issue'),
        journal: req(draft, 'journal'),
        firstPage: req(draft, 'firstPage'),
        pinpoint: pinpointValue ? { kind: 'page', value: pinpointValue } : undefined,
        caseName: opt(draft, 'caseName'),
        // Left undefined rather than false, so a library saved before these
        // fields existed round-trips through an edit unchanged.
        isCaseNote: draft['isCaseNote'] ? true : undefined,
        forthcoming: draft['forthcoming'] ? true : undefined,
        url: opt(draft, 'url'),
        accessDate: opt(draft, 'accessDate'),
        shortTitle: opt(draft, 'shortTitle'),
      };
      return source;
    }

    case 'book': {
      const pinpointValue = opt(draft, 'pinpoint.value');
      const source: BookSource = {
        id,
        type: 'book',
        authors,
        authorRole: draft['authorRole'] === 'editor' ? 'editor' : 'author',
        title: req(draft, 'title'),
        edition: opt(draft, 'edition'),
        firstPublished: opt(draft, 'firstPublished'),
        additionalInfo: opt(draft, 'additionalInfo'),
        publisher: req(draft, 'publisher'),
        year: req(draft, 'year'),
        place: opt(draft, 'place'),
        volume: opt(draft, 'volume'),
        // Undefined rather than false, so a library saved before the field
        // existed round-trips through an edit unchanged.
        volumesVary: draft['volumesVary'] ? true : undefined,
        pinpoint: pinpointValue
          ? { kind: draft['pinpoint.kind'] === 'paragraph' ? 'paragraph' : 'page', value: pinpointValue }
          : undefined,
        shortTitle: opt(draft, 'shortTitle'),
      };
      return source;
    }

    case 'statutoryInstrument': {
      const source: StatutoryInstrumentSource = {
        id,
        type: 'statutoryInstrument',
        name: req(draft, 'name'),
        year: req(draft, 'year'),
        siNumber: req(draft, 'siNumber'),
        // An ordinary SI leaves this undefined, so a library saved before the
        // field existed round-trips through an edit unchanged.
        numbering:
          draft['numbering'] === 'srAndO' || draft['numbering'] === 'rulesOfCourt'
            ? draft['numbering']
            : undefined,
        provision: opt(draft, 'provision'),
        shortForm: opt(draft, 'shortForm'),
      };
      return source;
    }

    case 'euLegislation': {
      const source: EuLegislationSource = {
        id,
        type: 'euLegislation',
        title: req(draft, 'title'),
        ojYear: req(draft, 'ojYear'),
        ojSeries: req(draft, 'ojSeries') || 'L',
        ojIssue: req(draft, 'ojIssue'),
        ojFirstPage: req(draft, 'ojFirstPage'),
        pinpoint: opt(draft, 'pinpoint'),
        shortForm: opt(draft, 'shortForm'),
      };
      return source;
    }

    case 'euCase': {
      const hasReport = Boolean(
        opt(draft, 'report.abbreviation') || opt(draft, 'report.firstPage'),
      );
      const source: EuCaseSource = {
        id,
        type: 'euCase',
        caseNumber: req(draft, 'caseNumber'),
        joined: draft['joined'] === 'joined',
        caseName: req(draft, 'caseName'),
        court: opt(draft, 'court'),
        judgmentDate: opt(draft, 'judgmentDate'),
        report: hasReport
          ? {
              year: req(draft, 'report.year'),
              abbreviation: req(draft, 'report.abbreviation'),
              firstPage: req(draft, 'report.firstPage'),
            }
          : undefined,
        pinpoint: opt(draft, 'pinpoint'),
      };
      return source;
    }

    case 'bookChapter': {
      const source: BookChapterSource = {
        id,
        type: 'bookChapter',
        authors,
        chapterTitle: req(draft, 'chapterTitle'),
        editors,
        bookTitle: req(draft, 'bookTitle'),
        edition: opt(draft, 'edition'),
        publisher: req(draft, 'publisher'),
        year: req(draft, 'year'),
        pages: opt(draft, 'pages'),
        shortTitle: opt(draft, 'shortTitle'),
      };
      return source;
    }

    case 'ouModuleMaterial': {
      const source: OuModuleMaterialSource = {
        id,
        type: 'ouModuleMaterial',
        authors,
        year: req(draft, 'year'),
        itemTitle: req(draft, 'itemTitle'),
        moduleCode: req(draft, 'moduleCode'),
        moduleTitle: req(draft, 'moduleTitle'),
        url: req(draft, 'url'),
        accessDate: req(draft, 'accessDate'),
      };
      return source;
    }

    case 'website': {
      const source: WebsiteSource = {
        id,
        type: 'website',
        authors,
        title: req(draft, 'title'),
        siteName: opt(draft, 'siteName'),
        publicationDate: opt(draft, 'publicationDate'),
        url: req(draft, 'url'),
        accessDate: req(draft, 'accessDate'),
        shortTitle: opt(draft, 'shortTitle'),
      };
      return source;
    }
  }
}

/** True where nothing has been entered yet, so the preview can stay quiet. */
export function isDraftEmpty(draft: Draft, authors: readonly Author[]): boolean {
  const typed = Object.entries(draft).some(
    ([key, value]) => value.trim() !== '' && !key.endsWith('yearFormat') && !key.endsWith('.kind') && key !== 'authorRole',
  );
  const named = authors.some((a) =>
    a.kind === 'corporate' ? a.name.trim() !== '' : `${a.given}${a.surname}`.trim() !== '',
  );
  return !typed && !named;
}

// ---------------------------------------------------------------------------
// Loading a saved source back into the form
// ---------------------------------------------------------------------------

export interface DraftState {
  readonly draft: Draft;
  readonly authors: readonly Author[];
  readonly editors: readonly Author[];
}

const set = (draft: Draft, key: string, value: string | undefined): void => {
  if (value) draft[key] = value;
};

/**
 * A pinpoint back into the two fields the form offers.
 *
 * Where different passages carry different judges the form can hold only the
 * last, but the form cannot create that shape either — it comes from the
 * footnote sequence, which keeps its pinpoints on the citation, not the source.
 */
function setPinpoint(draft: Draft, pinpoint: Pinpoint | undefined, withKind: boolean): void {
  if (!pinpoint) return;
  if (withKind) draft['pinpoint.kind'] = pinpoint.kind;
  const references = pinpointReferences(pinpoint);
  set(draft, 'pinpoint.value', references.map((r) => r.locus).join(', '));
  set(draft, 'pinpoint.judge', references[references.length - 1]?.judge);
}

/**
 * The inverse of `buildSource`: unfold a saved source back into the flat draft
 * the form edits. Round-tripping is lossless, which the tests assert per type.
 */
export function toDraft(source: Source): DraftState {
  const draft: Draft = { ...DEFAULT_DRAFTS[source.type] };
  const authors = 'authors' in source ? source.authors : [];
  const editors = source.type === 'bookChapter' ? source.editors : [];

  switch (source.type) {
    case 'case':
      set(draft, 'caseName', source.caseName);
      set(draft, 'court', source.court);
      set(draft, 'judgmentDate', source.judgmentDate);
      set(draft, 'shortName', source.shortName);
      if (source.neutral) {
        set(draft, 'neutral.year', source.neutral.year);
        set(draft, 'neutral.court', source.neutral.court);
        set(draft, 'neutral.number', source.neutral.number);
        set(draft, 'neutral.division', source.neutral.division);
      }
      if (source.report) {
        set(draft, 'report.year', source.report.year);
        draft['report.yearFormat'] = source.report.yearFormat;
        set(draft, 'report.volume', source.report.volume);
        set(draft, 'report.abbreviation', source.report.abbreviation);
        set(draft, 'report.firstPage', source.report.firstPage);
      }
      setPinpoint(draft, source.pinpoint, true);
      break;

    case 'act':
      set(draft, 'shortTitle', source.shortTitle);
      set(draft, 'year', source.year);
      set(draft, 'provision', source.provision);
      set(draft, 'shortForm', source.shortForm);
      break;

    case 'statutoryInstrument':
      draft['numbering'] = source.numbering ?? 'si';
      set(draft, 'name', source.name);
      set(draft, 'year', source.year);
      set(draft, 'siNumber', source.siNumber);
      set(draft, 'provision', source.provision);
      set(draft, 'shortForm', source.shortForm);
      break;

    case 'euLegislation':
      set(draft, 'title', source.title);
      set(draft, 'ojYear', source.ojYear);
      draft['ojSeries'] = source.ojSeries || 'L';
      set(draft, 'ojIssue', source.ojIssue);
      set(draft, 'ojFirstPage', source.ojFirstPage);
      set(draft, 'pinpoint', source.pinpoint);
      set(draft, 'shortForm', source.shortForm);
      break;

    case 'euCase':
      draft['joined'] = source.joined ? 'joined' : '';
      set(draft, 'caseNumber', source.caseNumber);
      set(draft, 'caseName', source.caseName);
      set(draft, 'court', source.court);
      set(draft, 'judgmentDate', source.judgmentDate);
      set(draft, 'pinpoint', source.pinpoint);
      if (source.report) {
        set(draft, 'report.year', source.report.year);
        set(draft, 'report.abbreviation', source.report.abbreviation);
        set(draft, 'report.firstPage', source.report.firstPage);
      }
      break;

    case 'journalArticle':
      draft['isCaseNote'] = source.isCaseNote ? 'yes' : '';
      draft['forthcoming'] = source.forthcoming ? 'yes' : '';
      set(draft, 'caseName', source.caseName);
      set(draft, 'url', source.url);
      set(draft, 'accessDate', source.accessDate);
      set(draft, 'title', source.title);
      set(draft, 'year', source.year);
      set(draft, 'volume', source.volume);
      set(draft, 'issue', source.issue);
      set(draft, 'journal', source.journal);
      set(draft, 'firstPage', source.firstPage);
      set(draft, 'shortTitle', source.shortTitle);
      setPinpoint(draft, source.pinpoint, false);
      break;

    case 'book':
      draft['authorRole'] = source.authorRole;
      set(draft, 'title', source.title);
      set(draft, 'edition', source.edition);
      set(draft, 'firstPublished', source.firstPublished);
      set(draft, 'additionalInfo', source.additionalInfo);
      set(draft, 'publisher', source.publisher);
      set(draft, 'year', source.year);
      set(draft, 'place', source.place);
      set(draft, 'volume', source.volume);
      draft['volumesVary'] = source.volumesVary ? 'vary' : '';
      set(draft, 'shortTitle', source.shortTitle);
      setPinpoint(draft, source.pinpoint, true);
      break;

    case 'bookChapter':
      set(draft, 'chapterTitle', source.chapterTitle);
      set(draft, 'bookTitle', source.bookTitle);
      set(draft, 'edition', source.edition);
      set(draft, 'publisher', source.publisher);
      set(draft, 'year', source.year);
      set(draft, 'pages', source.pages);
      set(draft, 'shortTitle', source.shortTitle);
      break;

    case 'website':
      set(draft, 'title', source.title);
      set(draft, 'siteName', source.siteName);
      set(draft, 'publicationDate', source.publicationDate);
      set(draft, 'url', source.url);
      set(draft, 'accessDate', source.accessDate);
      set(draft, 'shortTitle', source.shortTitle);
      break;

    case 'ouModuleMaterial':
      set(draft, 'year', source.year);
      set(draft, 'itemTitle', source.itemTitle);
      set(draft, 'moduleCode', source.moduleCode);
      set(draft, 'moduleTitle', source.moduleTitle);
      set(draft, 'url', source.url);
      set(draft, 'accessDate', source.accessDate);
      break;
  }

  return { draft, authors, editors };
}
