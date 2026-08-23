import { italic, join, segments, type FormattedCitation, type Part } from '../../model/segments';
import { renderPinpoint } from '../../model/pinpoints';
import { formatDayMonthYear } from '../../model/dates';
import type { CaseHistory, CaseSource, LawReport, NeutralCitation, Pinpoint } from '../../model/types';

/** `[2008] UKHL 13`, or `[2006] EWHC 407 (QB)` where a division is given. */
function formatNeutral(neutral: NeutralCitation): string {
  const base = `[${neutral.year}] ${neutral.court} ${neutral.number}`.replace(/\s+/g, ' ').trim();
  const division = neutral.division?.trim();
  return division ? `${base} (${division})` : base;
}

/** `[2008] 1 AC 884`, `[1996] AC 155`, `(1965) 109 SJ 175`. */
function formatReport(report: LawReport): string {
  const year =
    report.yearFormat === 'round' ? `(${report.year})` : `[${report.year}]`;
  return [year, report.volume?.trim(), report.abbreviation.trim(), report.firstPage.trim()]
    .filter(Boolean)
    .join(' ');
}

/**
 * OSCOLA 2.1.6: a paragraph pinpoint is bracketed and takes no preceding comma
 * (`... [2009] 1 AC 1339 [14]`). A page pinpoint takes a comma, except directly
 * after a court in brackets, where a space is used
 * (`Page v Smith [1996] AC 155 (HL) 165`).
 */
function formatPinpoint(pinpoint: Pinpoint, afterCourt: boolean): string {
  const rendered = renderPinpoint(pinpoint);
  if (!rendered) return '';
  if (pinpoint.kind === 'paragraph') return ` ${rendered}`;
  return afterCourt ? ` ${rendered}` : `, ${rendered}`;
}

/**
 * OSCOLA 2.1.3 and 2.1.5: the court is not given in brackets where there is a
 * neutral citation, because the neutral citation already identifies the court.
 * A court entered alongside one is therefore dropped rather than emitted, and
 * `validate` raises a warning saying so.
 */
function emittedCourt(source: CaseSource): string | undefined {
  if (source.neutral) return undefined;
  const court = source.court?.trim();
  return court ? court : undefined;
}

/**
 * How the case name is rendered: italic in footnotes (2.1.1), roman in a table
 * of cases (1.6.2), or omitted where the name is given in the text (1.1.1).
 */
type NameStyle = 'italic' | 'roman' | 'omitted';

/**
 * The bracket after the citation: normally the court, but for an unreported
 * case with no neutral citation, OSCOLA 2.1.4 gives the court and the date of
 * judgment together — `Stubbs v Sayer (CA, 8 November 1990)` — with no report
 * and no need for the word "unreported".
 */
function courtBracket(source: CaseSource): string {
  const court = emittedCourt(source);
  const unreported = !source.neutral && !source.report;
  const date = unreported ? formatDayMonthYear(source.judgmentDate) : '';
  if (date) return court ? ` (${court}, ${date})` : ` (${date})`;
  return court ? ` (${court})` : '';
}

/**
 * OSCOLA 2.1.3: where one report holds more than one judgment, the neutral
 * citations are listed "in chronological order, starting with the oldest, and
 * separate[d] with a comma". `neutral` is the oldest; the rest follow it.
 */
function allNeutrals(source: CaseSource): readonly NeutralCitation[] {
  return [source.neutral, ...(source.furtherNeutrals ?? [])].filter(
    (neutral): neutral is NeutralCitation => Boolean(neutral),
  );
}

/**
 * What follows the primary citation: `, affd`, `, sub nom …`, or both
 * (2.1.2, 2.1.8). The alternative name is styled like the primary — italic in
 * a footnote, roman in a table of cases — while `sub nom` itself stays roman.
 *
 * As for the primary citation, the court is dropped where a neutral citation
 * already identifies it (2.1.3).
 */
function historyParts(history: CaseHistory | undefined, nameStyle: NameStyle): Part[] {
  if (!history) return [];
  const citations = join(', ', [
    history.neutral && formatNeutral(history.neutral),
    history.report && formatReport(history.report),
  ]);
  const name = history.caseName?.trim();
  const lead = [history.disposition, history.subNom && 'sub nom'].filter(Boolean).join(' ');
  if (!lead && !name && citations.length === 0) return [];

  const court = history.neutral ? undefined : history.court?.trim();
  return [
    ', ',
    lead && `${lead} `,
    // 1.1.1 omits the name the text already gave; the name at another stage is
    // a different name, so it is kept whatever the primary's style.
    name && (nameStyle === 'roman' ? name : italic(name)),
    name && citations.length > 0 && ' ',
    citations,
    court && ` (${court})`,
  ];
}

function body(source: CaseSource, nameStyle: NameStyle): Part[] {
  const citations = join(', ', [
    ...allNeutrals(source).map(formatNeutral),
    source.report && formatReport(source.report),
  ]);
  const name = source.caseName.trim();
  return [
    nameStyle === 'italic' && italic(name),
    nameStyle === 'roman' && name,
    nameStyle !== 'omitted' && citations.length > 0 && ' ',
    citations,
    courtBracket(source),
  ];
}

export function formatCaseFootnote(source: CaseSource): FormattedCitation {
  return segments(
    // Case names are italicised in footnotes (OSCOLA 2.1.1).
    ...body(source, 'italic'),
    // The pinpoint belongs to the primary citation, so it comes before the
    // subsequent history rather than after it. The guide shows no example of
    // the two together; README and VERIFY record the call.
    source.pinpoint && formatPinpoint(source.pinpoint, Boolean(emittedCourt(source))),
    ...historyParts(source.history, 'italic'),
    '.',
  );
}

/**
 * Table of cases entry: the same citation without the pinpoint and with no
 * closing full stop, and — per OSCOLA 1.6.2 — with the case name in roman,
 * because case names are not italicised in a table of cases.
 */
export function formatCaseBibliography(source: CaseSource): FormattedCitation {
  return segments(...body(source, 'roman'), ...historyParts(source.history, 'roman'));
}

/**
 * The footnote to use where the case is named in the surrounding prose.
 *
 * OSCOLA 1.1.1: "If the name of the case is given in the text, it is not
 * necessary to repeat it in the footnote." The guide's worked example at 1.2
 * reduces a first citation of Austin to "[2009] UKHL 5, [2009] AC 564".
 */
export function formatCaseFootnoteNamedInText(source: CaseSource): FormattedCitation {
  return segments(
    ...body(source, 'omitted'),
    source.pinpoint && formatPinpoint(source.pinpoint, Boolean(emittedCourt(source))),
    ...historyParts(source.history, 'italic'),
    '.',
  );
}
