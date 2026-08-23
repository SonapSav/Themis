import { italic, segments, type FormattedCitation, type Part } from '../../model/segments';
import { renderPinpoint } from '../../model/pinpoints';
import { formatDayMonthYear } from '../../model/dates';
import { bibliographyAuthorPrefix, footnoteAuthorPrefix, formatAuthorsFootnote } from '../authors';
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

/**
 * 3.3.2: "Where there is no title, use the name of the case in italics
 * instead". A case note that has its own title is treated as an ordinary
 * article, so it falls through to `title`.
 */
function titleParts(source: JournalArticleSource): Part[] {
  const caseName = source.caseName?.trim();
  if (caseName) return ["'", italic(caseName), "'"];
  return [`'${source.title.trim()}'`];
}

/**
 * Year, volume, journal and first page. The page can be absent: 3.3.4 says
 * online journals often have none — its own EJLT example is
 * `(2010) 1(1) EJLT` — and 3.3.3 says to omit an unknown page.
 */
function publication(source: JournalArticleSource): Part[] {
  const firstPage = source.firstPage.trim();
  return [volumeAndYear(source), ` ${source.journal.trim()}`, firstPage && ` ${firstPage}`];
}

/**
 * 3.3.2's `(note)` closes "the citation", and 3.3.3's `(forthcoming)` follows
 * it. The guide gives no example of either alongside a web address; they are
 * placed before it here, because 3.3.4 describes the address as following the
 * citation, so the citation is taken to end first.
 */
function statusParts(source: JournalArticleSource): Part[] {
  return [source.isCaseNote && ' (note)', source.forthcoming && ' (forthcoming)'];
}

/**
 * 3.3.4: "Follow the citation with the web address (in angled brackets) and the
 * date you most recently accessed the article."
 */
function onlineParts(source: JournalArticleSource): Part[] {
  const url = source.url?.trim();
  if (!url) return [];
  const accessed = formatDayMonthYear(source.accessDate);
  return [` <${url}>`, accessed && ` accessed ${accessed}`];
}

function body(source: JournalArticleSource, authorPrefix: string): Part[] {
  return [authorPrefix, ...titleParts(source), ' ', ...publication(source)];
}

export function formatJournalArticleFootnote(
  source: JournalArticleSource,
): FormattedCitation {
  const pinpoint = source.pinpoint && renderPinpoint(source.pinpoint);
  return segments(
    ...body(source, footnoteAuthorPrefix(source.authors)),
    // 3.3.1: "Put a comma after the first page of the article if there is a
    // pinpoint." 3.3.4: pinpoints come before the web address.
    pinpoint && `, ${pinpoint}`,
    ...statusParts(source),
    ...onlineParts(source),
    '.',
  );
}

/**
 * OSCOLA 3.3.2: "If the case discussed in the note is identified in the text it
 * is not necessary to put the name of the case in the case-note citation as
 * well" — `Andrew Ashworth [2006] Crim LR 441 (note)`. The author's name is
 * followed by a space rather than the usual comma, as the guide prints it.
 */
export function formatCaseNoteFootnoteNamedInText(
  source: JournalArticleSource,
): FormattedCitation {
  const names = formatAuthorsFootnote(source.authors);
  const pinpoint = source.pinpoint && renderPinpoint(source.pinpoint);
  return segments(
    names && `${names} `,
    ...publication(source),
    pinpoint && `, ${pinpoint}`,
    ...statusParts(source),
    ...onlineParts(source),
    '.',
  );
}

export function formatJournalArticleBibliography(
  source: JournalArticleSource,
  authorPrefix?: string,
): FormattedCitation {
  return segments(
    ...body(source, authorPrefix ?? bibliographyAuthorPrefix(source.authors)),
    ...statusParts(source),
    ...onlineParts(source),
  );
}
