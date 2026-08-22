import { italic, type Part } from '../model/segments';
import type { Author } from '../model/types';

/**
 * Cite Them Right Harvard initials: each given name reduced to its first
 * letter, each followed by a full stop and no space — "Alison L" -> "A.L.",
 * matching the guide's "Young, H.D." and "Franklin, A.W.".
 *
 * This differs from OSCOLA, which writes the same author as "Young AL".
 */
export function harvardInitials(given: string): string {
  return given
    .split(/[\s.]+/)
    .filter(Boolean)
    .flatMap((name) => {
      // An initialism is already a run of initials: "HLA" -> H., L., A.
      if (/^[A-Z]+$/.test(name)) return name.split('');
      if (name.includes('-')) {
        return [name.split('-').filter(Boolean).map((p) => p[0]!.toUpperCase()).join('.-')];
      }
      return [name[0]!.toUpperCase()];
    })
    .map((initial) => `${initial}.`)
    .join('');
}

/** Reference-list form: `Bell, J.` Corporate authors are never inverted. */
function referenceName(author: Author): string {
  if (author.kind === 'corporate') return author.name.trim();
  const init = harvardInitials(author.given);
  return init ? `${author.surname.trim()}, ${init}` : author.surname.trim();
}

/** In-text form: surname alone, or the corporate name. */
function inTextName(author: Author): string {
  return author.kind === 'corporate' ? author.name.trim() : author.surname.trim();
}

/**
 * CTR names up to three authors and reduces four or more to the first plus
 * "et al.", which is italicised. OSCOLA, by contrast, uses "and others" and
 * switches at more than three.
 */
function join(names: readonly string[]): Part[] {
  if (names.length === 0) return [];
  if (names.length > 3) return [`${names[0]} `, italic('et al.')];
  if (names.length === 1) return [names[0]!];
  return [`${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`];
}

export function formatAuthorsReference(authors: readonly Author[]): Part[] {
  return join(authors.map(referenceName));
}

export function formatAuthorsInText(authors: readonly Author[]): Part[] {
  return join(authors.map(inTextName));
}

/** CTR uses "(ed.)" for a single editor and "(eds)" for several. */
export function editorMarker(count: number): string {
  return count > 1 ? '(eds)' : '(ed.)';
}
