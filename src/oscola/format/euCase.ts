import { italic, segments, type FormattedCitation, type Part } from '../../model/segments';
import type { EuCaseSource } from '../../model/types';
import { formatDayMonthYear } from '../../model/dates';

/**
 * OSCOLA 2.6.2: `case number | case name | [year] | report abbreviation |
 * first page`. "Give the case registration number in roman and then the name
 * of the case in italics, with no punctuation between them."
 */
function caseNumber(source: EuCaseSource): string {
  const number = source.caseNumber.trim();
  if (!number) return '';
  return `${source.joined ? 'Joined Cases' : 'Case'} ${number}`;
}

function report(source: EuCaseSource): string {
  if (!source.report) return '';
  const { year, abbreviation, firstPage } = source.report;
  return [year.trim() && `[${year.trim()}]`, abbreviation.trim(), firstPage.trim()]
    .filter(Boolean)
    .join(' ');
}

/**
 * OSCOLA 2.6.2: where a case is not yet reported in the OJ, the case number and
 * name are followed by the court and the date of judgment in brackets.
 */
function unreportedBracket(source: EuCaseSource): string {
  if (source.report) return '';
  const court = source.court?.trim();
  const date = formatDayMonthYear(source.judgmentDate);
  const parts = [court, date].filter(Boolean);
  return parts.length > 0 ? ` (${parts.join(', ')})` : '';
}

function body(source: EuCaseSource, italicised: boolean): Part[] {
  const number = caseNumber(source);
  const name = source.caseName.trim();
  const reported = report(source);
  return [
    number,
    number && name && ' ',
    italicised ? italic(name) : name,
    reported && ' ',
    reported,
    unreportedBracket(source),
  ];
}

export function formatEuCaseFootnote(source: EuCaseSource): FormattedCitation {
  // 2.6.2: "When pinpointing, use 'para' or 'paras' after a comma."
  const pinpoint = source.pinpoint?.trim();
  return segments(...body(source, true), pinpoint && `, ${pinpoint}`, '.');
}

/**
 * Table of cases entry. OSCOLA 1.6.2 files EU cases alphabetically by first
 * party name "with the case number following the name of the case in
 * brackets", so `Case T-344/99 Arne Mathisen AS v Council [2002] ECR II-2905`
 * is tabled as `Arne Mathisen AS v Council (T-344/99)`. Case names are not
 * italicised in a table of cases.
 */
export function formatEuCaseBibliography(source: EuCaseSource): FormattedCitation {
  const number = source.caseNumber.trim();
  return segments(source.caseName.trim(), number && ` (${number})`);
}
