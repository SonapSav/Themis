import { italic, segments, type FormattedCitation, type Part } from '../../model/segments';
import { bibliographyAuthorPrefix, footnoteAuthorPrefix } from '../authors';
import { formatDayMonthYear } from '../../model/dates';
import type { WebsiteSource } from '../../model/types';

/**
 * `(Naked Law, 1 May 2009)`, with the site name italicised.
 *
 * OSCOLA 3.4.8 sets the blog name in italics, as 3.4.9 does the newspaper name;
 * only the piece's own title is in roman within quotation marks. Omitted
 * entirely where neither part is known, and 3.4.8: "If there is no date of
 * publication on the website, give only the date of access."
 */
function publicationDetails(source: WebsiteSource): Part[] {
  const site = source.siteName?.trim();
  const date = formatDayMonthYear(source.publicationDate);
  if (!site && !date) return [];
  return ['(', site && italic(site), site && date && ', ', date, ')'];
}

function body(source: WebsiteSource, authorPrefix: string): Part[] {
  const details = publicationDetails(source);
  const accessed = formatDayMonthYear(source.accessDate);
  return [
    // An unattributed page simply begins with its title (3.4.8).
    authorPrefix,
    `'${source.title.trim()}'`,
    details.length > 0 && ' ',
    ...details,
    ` <${source.url.trim()}>`,
    accessed && ` accessed ${accessed}`,
  ];
}

export function formatWebsiteFootnote(source: WebsiteSource): FormattedCitation {
  return segments(...body(source, footnoteAuthorPrefix(source.authors)), '.');
}

export function formatWebsiteBibliography(
  source: WebsiteSource,
  authorPrefix?: string,
): FormattedCitation {
  return segments(...body(source, authorPrefix ?? bibliographyAuthorPrefix(source.authors)));
}
