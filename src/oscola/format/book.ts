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

function body(source: BookSource, authorPrefix: string): Part[] {
  const details = publicationDetails(source);
  return [
    authorPrefix,
    italic(source.title.trim()),
    details && ` ${details}`,
  ];
}

export function formatBookFootnote(source: BookSource): FormattedCitation {
  // A page pinpoint follows the closing bracket with a space, not a comma.
  const pinpoint = source.pinpoint && renderPinpoint(source.pinpoint);
  return segments(
    ...body(source, footnoteAuthorPrefix(source.authors, source.authorRole)),
    pinpoint && ` ${pinpoint}`,
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
