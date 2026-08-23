import { italic, segments, type FormattedCitation, type Part } from '../model/segments';
import { formatDayMonthYear } from '../model/dates';
import { ordinal } from '../model/ordinals';
import type {
  BookChapterSource,
  BookSource,
  JournalArticleSource,
  OuModuleMaterialSource,
  Source,
  WebsiteSource,
} from '../model/types';
import { editorMarker, formatAuthorsInText, formatAuthorsReference } from './authors';
import { formatPages } from './pages';

/**
 * A source with no publication date is cited "no date", spelled out.
 *
 * Not "n.d.". The OU's own quick guide to Cite Them Right for law modules is
 * express about it — "If the publication date is not given, the phrase 'no
 * date' is used instead of a date in both the in-text citation and the full
 * reference" — and Cite Them Right treats the contracted forms as outside the
 * style rather than as an accepted alternative.
 */
const NO_DATE = 'no date';

/** Types Harvard can format. Legal sources stay in OSCOLA footnotes. */
export type HarvardSource =
  | BookSource
  | BookChapterSource
  | JournalArticleSource
  | WebsiteSource
  | OuModuleMaterialSource;

export function isHarvardSource(source: Source): source is HarvardSource {
  return (
    source.type === 'book' ||
    source.type === 'bookChapter' ||
    source.type === 'journalArticle' ||
    source.type === 'website' ||
    source.type === 'ouModuleMaterial'
  );
}

function authorsOf(source: HarvardSource) {
  return source.type === 'ouModuleMaterial' && source.authors.length === 0
    ? // An unattributed OU item is cited to the university itself.
      [{ kind: 'corporate' as const, name: 'The Open University' }]
    : source.authors;
}

function yearOf(source: HarvardSource): string {
  const year = source.type === 'website' ? source.publicationDate : source.year;
  const trimmed = year?.trim();
  if (!trimmed) return NO_DATE;
  // A website's date may be a full ISO date; the in-text citation wants the year.
  const match = /^(\d{4})/.exec(trimmed);
  return match ? match[1]! : trimmed;
}

/**
 * An untitled case note carries the name of the case where its title would go
 * (OSCOLA 3.3.2). The OU's guide has no case-note template, so rather than
 * invent one this renders the case name as the article title — the same
 * substitution, without claiming a Cite Them Right rule that has not been seen.
 */
function articleTitle(source: JournalArticleSource): string {
  const title = source.title.trim();
  return title || (source.caseName?.trim() ?? '');
}

/**
 * The italicised title used in place of an author where a work is
 * unattributed: "(Information Literacy in Higher Education, 2015)".
 */
function titleFor(source: HarvardSource): string {
  switch (source.type) {
    case 'book': return source.title;
    case 'bookChapter': return source.chapterTitle;
    case 'journalArticle': return articleTitle(source);
    case 'website': return source.title;
    case 'ouModuleMaterial': return source.itemTitle;
  }
}

// ---------------------------------------------------------------------------
// In-text citations
// ---------------------------------------------------------------------------

export interface InTextOptions {
  /** `(Harris, 2015)` versus `Harris (2015)`. */
  readonly form?: 'parenthetical' | 'narrative';
  /** Page or pages, e.g. "5" or "98-99". Prefixed with p./pp. automatically. */
  readonly pages?: string;
}

/**
 * Cite Them Right Harvard in-text citation. Unlike OSCOLA — which forbids
 * in-text citations outright — Harvard puts author and date in the body of the
 * text, and these DO count towards an OU word limit.
 */
export function formatInTextCitation(
  source: HarvardSource,
  options: InTextOptions = {},
): FormattedCitation {
  const authors = authorsOf(source);
  const name: Part[] =
    authors.length > 0 ? formatAuthorsInText(authors) : [italic(titleFor(source).trim())];
  const year = yearOf(source);
  const pages = formatPages(options.pages);
  const suffix = pages ? `, ${pages}` : '';

  if (options.form === 'narrative') {
    return segments(...name, ` (${year}${suffix})`);
  }
  return segments('(', ...name, `, ${year}${suffix})`);
}

// ---------------------------------------------------------------------------
// Reference list entries
// ---------------------------------------------------------------------------

/** `Bell, J. (2014) ` — the opening of every reference entry. */
function opening(source: HarvardSource): Part[] {
  const authors = authorsOf(source);
  const year = yearOf(source);
  if (authors.length === 0) {
    return [italic(titleFor(source).trim()), ` (${year}) `];
  }
  return [...formatAuthorsReference(authors), ` (${year}) `];
}

/** CTR cites an edition only where it is later than the first: `3rd edn.` */
function edition(value: string | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === '1' || trimmed === '1st') return '';
  return `${ordinal(trimmed)} edn. `;
}

function availableAt(url: string, accessed: string | undefined): string {
  const address = url.trim();
  if (!address) return '';
  const date = formatDayMonthYear(accessed);
  return date
    ? `Available at: ${address} (Accessed: ${date}).`
    : `Available at: ${address}.`;
}

function bookReference(source: BookSource): Part[] {
  // Cite Them Right 12th edn omits the place of publication.
  return [
    ...opening(source),
    italic(source.title.trim()),
    '. ',
    edition(source.edition),
    `${source.publisher.trim()}.`,
  ];
}

function bookChapterReference(source: BookChapterSource): Part[] {
  const editors = formatAuthorsReference(source.editors);
  const pages = formatPages(source.pages);
  return [
    ...opening(source),
    `'${source.chapterTitle.trim()}', in `,
    ...editors,
    editors.length > 0 && ` ${editorMarker(source.editors.length)} `,
    italic(source.bookTitle.trim()),
    '. ',
    edition(source.edition),
    `${source.publisher.trim()}`,
    pages ? `, ${pages}.` : '.',
  ];
}

function journalArticleReference(source: JournalArticleSource): Part[] {
  const volume = source.volume?.trim();
  const issue = source.issue?.trim();
  const issueInfo = volume ? (issue ? `${volume}(${issue})` : volume) : '';
  const pages = formatPages(source.firstPage);
  return [
    ...opening(source),
    `'${articleTitle(source)}', `,
    italic(source.journal.trim()),
    issueInfo && `, ${issueInfo}`,
    pages && `, ${pages}`,
    '.',
  ];
}

function websiteReference(source: WebsiteSource): Part[] {
  // Harvard italicises the web page title; OSCOLA quotes it in roman.
  return [
    ...opening(source),
    italic(source.title.trim()),
    '. ',
    availableAt(source.url, source.accessDate),
  ];
}

function ouModuleMaterialReference(source: OuModuleMaterialSource): Part[] {
  return [
    ...opening(source),
    `'${source.itemTitle.trim()}'. `,
    italic([source.moduleCode.trim(), source.moduleTitle.trim()].filter(Boolean).join(': ')),
    '. ',
    availableAt(source.url, source.accessDate),
  ];
}

export function formatReference(source: HarvardSource): FormattedCitation {
  switch (source.type) {
    case 'book': return segments(...bookReference(source));
    case 'bookChapter': return segments(...bookChapterReference(source));
    case 'journalArticle': return segments(...journalArticleReference(source));
    case 'website': return segments(...websiteReference(source));
    case 'ouModuleMaterial': return segments(...ouModuleMaterialReference(source));
  }
}
