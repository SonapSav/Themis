/**
 * Assembles the end-of-work lists from a collection of sources.
 *
 * OSCOLA splits these into a table of cases, a table of legislation and a
 * bibliography of secondary sources (1.6, 1.7), each with its own ordering.
 * Cite Them Right Harvard uses a single reference list, alphabetical by author.
 */
import { formatBibliography, formatAuthorsBibliography, bibliographyName } from './oscola';
import { formatReference, isHarvardSource } from './harvard';
import { toPlainText, type FormattedCitation } from './model/segments';
import {
  SOURCE_CATEGORY,
  styleFor,
  type Author,
  type CitationMode,
  type Source,
} from './model/types';

export interface AssembledEntry {
  readonly id: string;
  readonly citation: FormattedCitation;
}

export interface AssembledSection {
  readonly id: string;
  readonly title: string;
  /** One line on the ordering rule, citing its section. */
  readonly note: string;
  readonly entries: readonly AssembledEntry[];
}

export interface Assembled {
  readonly sections: readonly AssembledSection[];
  readonly warnings: readonly string[];
}

// ---------------------------------------------------------------------------
// Sort keys
// ---------------------------------------------------------------------------

const LEADING_ARTICLE = /^(the|a|an)\s+/i;

/** OSCOLA orders several lists by "first major word", which skips an article. */
function firstMajorWord(title: string): string {
  return title.trim().replace(LEADING_ARTICLE, '').toLowerCase();
}

/**
 * OSCOLA 1.6.2: a table of cases is ordered by first significant word, so
 * `Re Farquar's Estate` is tabled as `Farquar's Estate, Re` and `The Starsin`
 * as `Starsin, The`.
 */
export function tableOfCasesName(caseName: string): string {
  const trimmed = caseName.trim();
  const match = /^(Re|The)\s+(.*)$/i.exec(trimmed);
  return match ? `${match[2]}, ${match[1]}` : trimmed;
}

function titleOf(source: Source): string {
  switch (source.type) {
    case 'book': return source.title;
    case 'bookChapter': return source.chapterTitle;
    case 'journalArticle': return source.title;
    case 'website': return source.title;
    case 'ouModuleMaterial': return source.itemTitle;
    case 'euLegislation': return source.title;
    case 'act': return source.shortTitle;
    case 'statutoryInstrument': return source.name;
    case 'case': return source.caseName;
    case 'euCase': return source.caseName;
  }
}

function yearOf(source: Source): number {
  const raw =
    source.type === 'website'
      ? source.publicationDate
      : 'year' in source
        ? source.year
        : undefined;
  const match = /(\d{4})/.exec(raw ?? '');
  return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
}

function authorsOf(source: Source): readonly Author[] {
  return 'authors' in source ? source.authors : [];
}

const surnameKey = (author: Author | undefined): string =>
  !author ? '' : (author.kind === 'corporate' ? author.name : author.surname).toLowerCase();

const byString = (a: string, b: string) => a.localeCompare(b, 'en');

// ---------------------------------------------------------------------------
// OSCOLA 1.7 bibliography ordering
// ---------------------------------------------------------------------------

/**
 * The author clause with the first author replaced by a double em-dash, per
 * 1.7: `Hart HLA and Honoré AM,` becomes `—— and Honoré AM,`. Any co-authors
 * are repeated in full each time.
 */
function repeatAuthorPrefix(source: Source): string {
  const authors = authorsOf(source);
  const role = source.type === 'book' ? source.authorRole : 'author';
  const full = formatAuthorsBibliography(authors, role);
  const first = authors[0] ? bibliographyName(authors[0]) : '';
  const remainder = full.startsWith(first) ? full.slice(first.length) : '';
  // Where the work is sole-authored the dash stands in for the name and its
  // comma both — 1.7 prints "—— Punishment and Responsibility (OUP 1968)".
  // Where there are co-authors it replaces only the name, and the clause keeps
  // its comma: "—— and Honoré AM, Causation in the Law (2nd edn, OUP 1985)".
  return remainder ? `——${remainder}, ` : '—— ';
}

/**
 * Order one author's works: sole-authored first in chronological order, then
 * co-authored works grouped by co-author and ordered by co-author surname,
 * chronologically within each pairing (OSCOLA 1.7).
 */
function orderOneAuthorsWorks(works: readonly Source[]): Source[] {
  const chronological = (a: Source, b: Source) =>
    yearOf(a) - yearOf(b) || byString(firstMajorWord(titleOf(a)), firstMajorWord(titleOf(b)));

  const sole = works.filter((w) => authorsOf(w).length <= 1).sort(chronological);

  const coAuthored = works.filter((w) => authorsOf(w).length > 1);
  const byCoAuthors = new Map<string, Source[]>();
  for (const work of coAuthored) {
    const key = authorsOf(work).slice(1).map(surnameKey).join('|');
    byCoAuthors.set(key, [...(byCoAuthors.get(key) ?? []), work]);
  }
  const co = [...byCoAuthors.entries()]
    .sort(([a], [b]) => byString(a, b))
    .flatMap(([, group]) => group.sort(chronological));

  return [...sole, ...co];
}

/** OSCOLA 1.7: unattributed works first, then alphabetical by author surname. */
function assembleOscolaBibliography(sources: readonly Source[]): AssembledEntry[] {
  const unattributed = sources
    .filter((s) => authorsOf(s).length === 0)
    .sort((a, b) => byString(firstMajorWord(titleOf(a)), firstMajorWord(titleOf(b))));

  const grouped = new Map<string, Source[]>();
  for (const source of sources.filter((s) => authorsOf(s).length > 0)) {
    const key = surnameKey(authorsOf(source)[0]);
    grouped.set(key, [...(grouped.get(key) ?? []), source]);
  }

  const attributed = [...grouped.entries()]
    .sort(([a], [b]) => byString(a, b))
    .flatMap(([, works]) =>
      orderOneAuthorsWorks(works).map((source, index) => ({
        id: source.id,
        // Only the first entry under an author spells the name out.
        citation: formatBibliography(source, index === 0 ? undefined : repeatAuthorPrefix(source)),
      })),
    );

  return [
    ...unattributed.map((s) => ({ id: s.id, citation: formatBibliography(s) })),
    ...attributed,
  ];
}

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------

function section(
  id: string,
  title: string,
  note: string,
  entries: readonly AssembledEntry[],
): AssembledSection[] {
  return entries.length > 0 ? [{ id, title, note, entries }] : [];
}

function sortedEntries(sources: readonly Source[], key: (s: Source) => string): AssembledEntry[] {
  return [...sources]
    .sort((a, b) => byString(key(a).toLowerCase(), key(b).toLowerCase()))
    .map((s) => ({ id: s.id, citation: formatBibliography(s) }));
}

/**
 * Cite Them Right distinguishes several works by one author in the same year
 * with a letter after the date. The Open University's public guidance does not
 * show that form, so Thetis flags the clash rather than guessing at it.
 */
function harvardWarnings(sources: readonly Source[]): string[] {
  const seen = new Map<string, number>();
  for (const source of sources) {
    const key = `${surnameKey(authorsOf(source)[0])}|${yearOf(source)}`;
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  return [...seen.entries()]
    .filter(([, count]) => count > 1)
    .map(
      ([key]) =>
        `Two or more sources share an author and year (${key.split('|')[0] || 'no author'}, ${key.split('|')[1]}). ` +
        'Cite Them Right distinguishes these with a letter after the date; check the form with your module guidance.',
    );
}

export function assemble(sources: readonly Source[], mode: CitationMode): Assembled {
  const legal = sources.filter((s) => SOURCE_CATEGORY[s.type] === 'legal');
  const academic = sources.filter((s) => SOURCE_CATEGORY[s.type] === 'academic');
  const harvard = academic.filter((s) => styleFor(s.type, mode) === 'harvard');

  const sections: AssembledSection[] = [];
  const warnings: string[] = [];

  if (mode === 'ou-dual') {
    // Legal sources live only in footnotes under the OU scheme.
    if (legal.length > 0) {
      warnings.push(
        legal.length === 1
          ? '1 legal source is cited in footnotes only and does not appear in the reference list.'
          : `${legal.length} legal sources are cited in footnotes only and do not appear in the reference list.`,
      );
    }
  } else {
    sections.push(
      ...section(
        'cases',
        'Table of cases',
        'Alphabetical by first significant word; case names in roman (OSCOLA 1.6.2).',
        sortedEntries(
          legal.filter((s) => s.type === 'case' || s.type === 'euCase'),
          (s) => (s.type === 'case' ? tableOfCasesName(s.caseName) : titleOf(s)),
        ),
      ),
      ...section(
        'legislation',
        'Table of legislation',
        'Alphabetical by first significant word, not chronological; statutory instruments listed after the statutes (OSCOLA 1.6.3).',
        [
          ...sortedEntries(legal.filter((s) => s.type === 'act'), (s) => firstMajorWord(titleOf(s))),
          ...sortedEntries(
            legal.filter((s) => s.type === 'statutoryInstrument'),
            (s) => firstMajorWord(titleOf(s)),
          ),
        ],
      ),
      ...section(
        'eu-legislation',
        'Table of EU legislation',
        'Listed separately from UK legislation (OSCOLA 1.6.3).',
        sortedEntries(legal.filter((s) => s.type === 'euLegislation'), (s) => firstMajorWord(titleOf(s))),
      ),
      ...section(
        'bibliography',
        'Bibliography',
        'Unattributed works first, then by author surname; one author’s works chronologically, with the name replaced by a double em-dash after the first (OSCOLA 1.7).',
        assembleOscolaBibliography(academic),
      ),
    );
  }

  if (harvard.length > 0) {
    const entries = [...harvard]
      .sort((a, b) =>
        byString(
          surnameKey(authorsOf(a)[0]) || firstMajorWord(titleOf(a)),
          surnameKey(authorsOf(b)[0]) || firstMajorWord(titleOf(b)),
        ),
      )
      .filter(isHarvardSource)
      .map((s) => ({ id: s.id, citation: formatReference(s) }));
    sections.push(
      ...section(
        'reference-list',
        'Reference list',
        'Alphabetical by author surname. Does not count towards your word limit.',
        entries,
      ),
    );
    warnings.push(...harvardWarnings(harvard));
  }

  return { sections, warnings };
}

/** The whole assembled output as plain text, for copying out. */
export function assembledToText(assembled: Assembled): string {
  return assembled.sections
    .map((s) => [s.title, ...s.entries.map((e) => toPlainText(e.citation))].join('\n'))
    .join('\n\n');
}
