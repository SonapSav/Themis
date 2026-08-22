import { segments, type FormattedCitation, type Part } from '../../model/segments';
import { renderPinpoint } from '../../model/pinpoints';
import { bibliographyAuthorPrefix, footnoteAuthorPrefix } from '../authors';
import type { JournalArticleSource } from '../../model/types';

/**
 * OSCOLA 3.3: where the journal has volume numbers the year takes round
 * brackets; where it does not, the year identifies the volume and takes square
 * brackets. Unlike cases, this is inferable, so it is not a user field.
 */
function volumeAndYear(source: JournalArticleSource): string {
  const volume = source.volume?.trim();
  const issue = source.issue?.trim();
  if (!volume) return `[${source.year.trim()}]`;
  const numbered = issue ? `${volume}(${issue})` : volume;
  return `(${source.year.trim()}) ${numbered}`;
}

function body(source: JournalArticleSource, authorPrefix: string): Part[] {
  return [
    authorPrefix,
    `'${source.title.trim()}' `,
    volumeAndYear(source),
    ` ${source.journal.trim()} ${source.firstPage.trim()}`,
  ];
}

export function formatJournalArticleFootnote(
  source: JournalArticleSource,
): FormattedCitation {
  const pinpoint = source.pinpoint && renderPinpoint(source.pinpoint);
  return segments(
    ...body(source, footnoteAuthorPrefix(source.authors)),
    pinpoint && `, ${pinpoint}`,
    '.',
  );
}

export function formatJournalArticleBibliography(
  source: JournalArticleSource,
  authorPrefix?: string,
): FormattedCitation {
  return segments(...body(source, authorPrefix ?? bibliographyAuthorPrefix(source.authors)));
}
