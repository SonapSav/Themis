import { italic, segments, type FormattedCitation, type Part } from '../../model/segments';
import type { EuCaseSource } from '../../model/types';

/**
 * OSCOLA 4.4.2: `case number | case name | European Case Law Identifier`.
 * "Give the case registration number in roman and then the name of the case in
 * italics, with no punctuation between them."
 *
 * The 5th edition replaced the law report reference with the ECLI, so
 * `Case T-344/99 Arne Mathisen AS v Council [2002] ECR II-2905` became
 * `Case T-344/99 Arne Mathisen AS v Council EU:T:2002:174`.
 */
function caseNumber(source: EuCaseSource): string {
  const number = source.caseNumber.trim();
  if (!number) return '';
  return `${source.joined ? 'Joined Cases' : 'Case'} ${number}`;
}

function body(source: EuCaseSource, italicised: boolean): Part[] {
  const number = caseNumber(source);
  const name = source.caseName.trim();
  const ecli = source.ecli?.trim() ?? '';
  return [
    number,
    number && name && ' ',
    italicised ? italic(name) : name,
    ecli && (name || number) && ' ',
    ecli,
  ];
}

export function formatEuCaseFootnote(source: EuCaseSource): FormattedCitation {
  /*
   * A paragraph pinpoint goes in square brackets with no comma before it, as
   * for UK cases under 2.1.6 — the guide's own example is
   * `Case C-403/03 Schempp v Finanzamt EU:C:2005:446 [19]`.
   *
   * A comma is still right for the forms that are words rather than brackets:
   * 4.4.2 pinpoints an Advocate General's opinion as `, point 51`. So the
   * bracket is what decides, and what the student typed is what is read.
   */
  const pinpoint = source.pinpoint?.trim();
  const separator = pinpoint?.startsWith('[') ? ' ' : ', ';
  return segments(...body(source, true), pinpoint && `${separator}${pinpoint}`, '.');
}

/**
 * Table of cases entry. OSCOLA 1.6.2: "List European Union ('EU') court
 * decisions alphabetically by case name and state the case number in round
 * brackets before providing the European Case Law Identifier." Its example is
 *
 *     Schempp v Finanzamt (Case C-403/03) EU:C:2005:446
 *
 * so the brackets keep the word "Case", and the ECLI follows them. The 4th
 * edition tabled the number alone and stopped there. Case names are not
 * italicised in a table of cases.
 */
export function formatEuCaseBibliography(source: EuCaseSource): FormattedCitation {
  const number = caseNumber(source);
  const ecli = source.ecli?.trim() ?? '';
  return segments(source.caseName.trim(), number && ` (${number})`, ecli && ` ${ecli}`);
}
