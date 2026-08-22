import { segments, type FormattedCitation } from '../../model/segments';
import type { EuLegislationSource } from '../../model/types';

/**
 * OSCOLA 2.6.1: `legislation title | [year] | OJ series | issue/first page`.
 * The OJ citation runs year, series, number/page — `[2008] OJ C115/13`.
 * Titles are in roman, not italics.
 */
function body(source: EuLegislationSource): string {
  const oj = [
    source.ojYear.trim() && `[${source.ojYear.trim()}]`,
    'OJ',
    `${source.ojSeries.trim()}${source.ojIssue.trim()}/${source.ojFirstPage.trim()}`,
  ]
    .filter(Boolean)
    .join(' ');
  return [source.title.trim(), oj].filter(Boolean).join(' ');
}

export function formatEuLegislationFootnote(
  source: EuLegislationSource,
  options: { announceShortForm?: boolean } = {},
): FormattedCitation {
  // 2.6.1: "Pinpoints indicating articles ... follow the OJ citation and a comma".
  // 1.2.1 announces a short form in brackets at the end of the full citation:
  // `... [1993] OJ L307/18 (Working Time Directive)`.
  const pinpoint = source.pinpoint?.trim();
  const shortForm = options.announceShortForm ? source.shortForm?.trim() : undefined;
  return segments(
    body(source),
    shortForm && ` (${shortForm})`,
    pinpoint && `, ${pinpoint}`,
    '.',
  );
}

export function formatEuLegislationBibliography(
  source: EuLegislationSource,
): FormattedCitation {
  return segments(body(source));
}
