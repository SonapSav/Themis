/**
 * Search and filter over a saved library.
 *
 * A library outlasts a nine-month module, so finding a source in it matters as
 * much as adding one. Nothing here touches a citation rule: the text searched
 * is the citation as it is already rendered, so a search matches whatever the
 * student can see on screen.
 */
import { formatSource, toPlainText, SOURCE_CATEGORY, SOURCE_TYPE_LABELS } from './citations';
import type { CitationMode, Source, SourceCategory, SourceType } from './citations';

export interface LibraryFilter {
  /** Free text; whitespace-separated terms must all match. Empty matches all. */
  readonly query?: string;
  /** Undefined for every type. */
  readonly type?: SourceType;
  /** Undefined for both categories. */
  readonly category?: SourceCategory;
}

/**
 * Fold away the differences between what a citation prints and what a student
 * types: case, accents, and the typographic characters citations are full of —
 * curly quotes, en and em dashes — none of which are on a keyboard.
 */
export function normalise(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u2018\u2019\u201b\u2032]/g, "'")
    .replace(/[\u201c\u201d\u2033]/g, '"')
    .replace(/[\u2010-\u2015\u2212]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Every rendering of a source in the current mode, concatenated. A footnote and
 * a bibliography entry carry different text — the footnote has the pinpoint,
 * the bibliography inverts the author — and either is a fair thing to search.
 */
export function searchText(source: Source, mode: CitationMode): string {
  const output = formatSource(source, mode);
  const parts =
    output.style === 'harvard'
      ? [output.reference, output.inText]
      : [output.footnote, output.bibliography];
  return normalise(
    [...parts.filter(Boolean).map((c) => toPlainText(c!)), SOURCE_TYPE_LABELS[source.type]].join(' '),
  );
}

/** True when every term in the query appears somewhere in the source's text. */
export function matchesQuery(source: Source, mode: CitationMode, query: string): boolean {
  const terms = normalise(query).split(' ').filter(Boolean);
  if (terms.length === 0) return true;
  const haystack = searchText(source, mode);
  return terms.every((term) => haystack.includes(term));
}

/** Filter without reordering: the library's order is the order it was built in. */
export function filterLibrary(
  sources: readonly Source[],
  mode: CitationMode,
  filter: LibraryFilter,
): readonly Source[] {
  return sources.filter((source) => {
    if (filter.type && source.type !== filter.type) return false;
    if (filter.category && SOURCE_CATEGORY[source.type] !== filter.category) return false;
    return matchesQuery(source, mode, filter.query ?? '');
  });
}

/**
 * The types actually held, in the order the type menu lists them. Offering a
 * filter for a type the library does not hold is a dead end.
 */
export function typesPresent(sources: readonly Source[]): readonly SourceType[] {
  const held = new Set(sources.map((s) => s.type));
  return (Object.keys(SOURCE_TYPE_LABELS) as SourceType[]).filter((t) => held.has(t));
}
