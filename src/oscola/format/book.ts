import { italic, segments, type FormattedCitation, type Part } from '../../model/segments';
import { bibliographyAuthorPrefix, footnoteAuthorPrefix } from '../authors';
import { formatEdition } from '../../model/ordinals';
import { renderPinpoint } from '../../model/pinpoints';
import type { BookSource } from '../../model/types';

/**
 * The publication bracket: `(7th edn, Sweet & Maxwell 2007)`, or with an
 * original date, `(first published 1651, Penguin 1985)`.
 *
 * OSCOLA 4th edn does not include the place of publication, so `source.place`
 * is deliberately not read here.
 */
function publicationDetails(source: BookSource): string {
  const firstPublished = source.firstPublished?.trim();
  const parts = [
    firstPublished && `first published ${firstPublished}`,
    source.additionalInfo?.trim(),
    formatEdition(source.edition),
    // Publisher and year: "a space but no punctuation between them" (3.2.1).
    [source.publisher.trim(), source.year.trim()].filter(Boolean).join(' '),
  ].filter(Boolean);
  return parts.length > 0 ? `(${parts.join(', ')})` : '';
}

/**
 * `vol 2`. A `vol` the student has already typed is respected rather than
 * doubled, as with an edition or a Harvard page reference.
 */
function volumeLabel(source: BookSource): string {
  const volume = source.volume?.trim();
  if (!volume) return '';
  return /^vols?\b/i.test(volume) ? volume : `vol ${volume}`;
}

/**
 * 3.2.1: "the volume number follows the publication details, unless the
 * publication details of the volumes vary, in which case it precedes them, and
 * is separated from the title by a comma".
 *
 *   Christian von Bar, The Common European Law of Torts, vol 2 (CH Beck 2000)
 *   Halsbury's Laws (5th edn, 2010) vol 57                            [3.2.5]
 */
const volumeLeads = (source: BookSource): boolean => source.volumesVary === true;

function body(source: BookSource, authorPrefix: string): Part[] {
  const details = publicationDetails(source);
  const volume = volumeLabel(source);
  return [
    authorPrefix,
    italic(source.title.trim()),
    volume && volumeLeads(source) && `, ${volume}`,
    details && ` ${details}`,
    volume && !volumeLeads(source) && ` ${volume}`,
  ];
}

export function formatBookFootnote(source: BookSource): FormattedCitation {
  // 3.2.1 pinpoints a book by paragraph where the paragraphs are numbered,
  // labelled rather than bracketed: `para 76`.
  const pinpoint =
    source.pinpoint && renderPinpoint(source.pinpoint, { paragraphStyle: 'labelled' });
  // A pinpoint follows the closing bracket with a space, not a comma — but a
  // trailing volume comes between them and takes one: `vol 57, para 53`.
  const afterVolume = Boolean(volumeLabel(source)) && !volumeLeads(source);
  return segments(
    ...body(source, footnoteAuthorPrefix(source.authors, source.authorRole)),
    pinpoint && (afterVolume ? `, ${pinpoint}` : ` ${pinpoint}`),
    '.',
  );
}

export function formatBookBibliography(
  source: BookSource,
  authorPrefix?: string,
): FormattedCitation {
  return segments(
    ...body(source, authorPrefix ?? bibliographyAuthorPrefix(source.authors, source.authorRole)),
  );
}
