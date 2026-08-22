import { italic, type Part } from '../model/segments';
import type { Author, Source } from '../model/types';

/**
 * The short form of a case name for repeat citations (OSCOLA 1.2.1, 2.1.2).
 *
 * "the name chosen must be that which stands first in the full name of the
 * case" — except in judicial review, where 2.1.2 shows the individual's name
 * being used: `R (Roberts) v Parole Board` becomes `Roberts`, and
 * `R v Lord Chancellor, ex p Witham` becomes `Witham`.
 */
export function deriveCaseShortName(caseName: string): string {
  const name = caseName.trim();

  const exParte = /\bex\s+p\s+(.+)$/i.exec(name);
  if (exParte) return exParte[1]!.trim();

  const judicialReview = /^R\s*\(([^)]+)\)\s+v\s+/i.exec(name);
  if (judicialReview) return judicialReview[1]!.trim();

  const parties = name.split(/\s+v\s+/);
  if (parties.length < 2) return name;

  const first = parties[0]!.trim();
  // "R" alone identifies nothing. 2.1.2 accepts either form for criminal cases,
  // so the conservative choice is to keep the full name.
  return /^R$/i.test(first) ? name : first;
}

const surname = (author: Author): string =>
  author.kind === 'corporate' ? author.name.trim() : author.surname.trim();

/** "the author's or authors' surname(s)" (OSCOLA 1.2.1). */
export function authorSurnames(authors: readonly Author[]): string {
  const names = authors.map(surname).filter(Boolean);
  if (names.length === 0) return '';
  if (names.length > 3) return `${names[0]} and others`;
  if (names.length === 1) return names[0]!;
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** Key used to spot several works by one author within a document. */
export function firstAuthorKey(source: Source): string {
  const authors = 'authors' in source ? source.authors : [];
  return authors[0] ? surname(authors[0]).toLowerCase() : '';
}

/**
 * The identifying part of a subsequent citation, before the cross-citation.
 *
 * `includeTitle` is set where several works by the same author are cited, in
 * which case 1.2.1 requires "the surname and the title of the work (or a short
 * form of the title)". Titles keep their usual treatment: italic for a book,
 * roman in quotation marks for an article.
 */
export function shortForm(source: Source, includeTitle: boolean): Part[] {
  switch (source.type) {
    case 'case':
      return [italic(source.shortName?.trim() || deriveCaseShortName(source.caseName))];

    case 'euCase':
      return [italic(source.caseName.trim())];

    case 'act':
      return [source.shortForm?.trim() || `${source.shortTitle.trim()} ${source.year.trim()}`];

    case 'statutoryInstrument':
      return [source.shortForm?.trim() || `${source.name.trim()} ${source.year.trim()}`];

    case 'euLegislation':
      return [source.shortForm?.trim() || source.title.trim()];

    case 'book':
    case 'bookChapter':
    case 'journalArticle':
    case 'website':
    case 'ouModuleMaterial': {
      const names = authorSurnames(source.authors);
      if (!includeTitle) return names ? [names] : [titleSegment(source)];
      return names ? [`${names}, `, titleSegment(source)] : [titleSegment(source)];
    }
  }
}

/** The title in its usual dress: italic for books, quoted roman otherwise. */
function titleSegment(source: Source): Part {
  switch (source.type) {
    case 'book':
      return italic(source.shortTitle?.trim() || source.title.trim());
    case 'bookChapter':
      return `'${source.shortTitle?.trim() || source.chapterTitle.trim()}'`;
    case 'journalArticle':
      return `'${source.shortTitle?.trim() || source.title.trim()}'`;
    case 'website':
      return `'${source.shortTitle?.trim() || source.title.trim()}'`;
    case 'ouModuleMaterial':
      return `'${source.itemTitle.trim()}'`;
    default:
      return '';
  }
}
