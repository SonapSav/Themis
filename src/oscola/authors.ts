import type { Author, AuthorRole, PersonAuthor } from '../model/types';

/**
 * "Alison L" -> "AL". Initials carry no full stops or spaces in OSCOLA.
 *
 * A given name that is already an initialism is kept whole: OSCOLA 4th edn
 * gives "HLA Hart" in a footnote and "Hart HLA" in the bibliography, so
 * reducing "HLA" to "H" would be wrong.
 */
export function initials(given: string): string {
  return given
    .split(/[\s.]+/)
    .filter(Boolean)
    .map((name) => {
      if (/^[A-Z]+$/.test(name)) return name;
      // Keep hyphenated given names whole: "Jean-Paul" -> "J-P".
      if (name.includes('-')) {
        return name
          .split('-')
          .filter(Boolean)
          .map((part) => part[0]!.toUpperCase())
          .join('-');
      }
      return name[0]!.toUpperCase();
    })
    .join('');
}

/** Footnote form: given names then surname. */
function footnoteName(author: Author): string {
  if (author.kind === 'corporate') return author.name;
  return [author.given, author.surname].filter(Boolean).join(' ').trim();
}

/**
 * Bibliography form: surname then initials, no comma between them.
 * Corporate authors are never inverted.
 */
export function bibliographyName(author: Author): string {
  if (author.kind === 'corporate') return author.name;
  const person = author as PersonAuthor;
  const init = initials(person.given);
  return init ? `${person.surname} ${init}` : person.surname;
}

/**
 * Join names OSCOLA-style: "A", "A and B", "A, B and C". Four or more authors
 * are reduced to the first followed by "and others" (OSCOLA 1.4.1).
 */
function joinNames(names: readonly string[]): string {
  if (names.length === 0) return '';
  if (names.length > 3) return `${names[0]} and others`;
  if (names.length === 1) return names[0]!;
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

function roleSuffix(role: AuthorRole, count: number): string {
  if (role !== 'editor') return '';
  // "and others" collapses to a single visible name but the work still has many
  // editors, so the plural is driven by the real count, not the rendered names.
  return count > 1 ? ' (eds)' : ' (ed)';
}

export function formatAuthorsFootnote(
  authors: readonly Author[],
  role: AuthorRole = 'author',
): string {
  if (authors.length === 0) return '';
  return joinNames(authors.map(footnoteName)) + roleSuffix(role, authors.length);
}

export function formatAuthorsBibliography(
  authors: readonly Author[],
  role: AuthorRole = 'author',
): string {
  if (authors.length === 0) return '';
  return joinNames(authors.map(bibliographyName)) + roleSuffix(role, authors.length);
}

/**
 * OSCOLA 1.7: in a bibliography, the titles of unattributed works are preceded
 * by a double em-dash. Footnotes simply begin with the title.
 */
export const UNATTRIBUTED_PREFIX = '\u2014\u2014 ';

/** The author clause of a footnote, including its trailing comma. */
export function footnoteAuthorPrefix(
  authors: readonly Author[],
  role: AuthorRole = 'author',
): string {
  const names = formatAuthorsFootnote(authors, role);
  return names ? `${names}, ` : '';
}

/** The author clause of a bibliography entry, or the unattributed em-dash. */
export function bibliographyAuthorPrefix(
  authors: readonly Author[],
  role: AuthorRole = 'author',
): string {
  const names = formatAuthorsBibliography(authors, role);
  return names ? `${names}, ` : UNATTRIBUTED_PREFIX;
}

/**
 * Sort key for a bibliography entry: the first author's surname, or the
 * corporate name, lowercased for a stable case-insensitive ordering.
 */
export function authorSortKey(authors: readonly Author[]): string {
  const first = authors[0];
  if (!first) return '';
  return (first.kind === 'corporate' ? first.name : first.surname).toLowerCase();
}
