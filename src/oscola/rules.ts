/**
 * The sections of OSCOLA 4th edn that `validate` cites, with the guide's own
 * headings.
 *
 * A check that says a field is missing is only worth reading if it also says
 * which rule asks for it. Grounding that in a table has two effects: the
 * section numbers are typed once rather than scattered through prose, and
 * `RuleSection` makes an invented number a compile error rather than something
 * a student has to catch.
 *
 * Titles are the guide's contents pages verbatim — see *Where the data comes
 * from* in the README. Sections are added here as checks come to need them;
 * this is not meant to be the whole table of contents.
 */
export const RULES = {
  '1.3.1': 'Punctuation',
  '2.1.1': 'General principles',
  '2.1.2': 'Case names',
  '2.1.3': 'Neutral citations',
  '2.1.4': 'Law reports',
  '2.1.5': 'Courts',
  '2.1.6': 'Pinpoints',
  '2.1.8': 'Subsequent history of a case',
  '2.1.9': 'Cases before 1865',
  '2.4.1': 'Names of statutes',
  '2.4.2': 'Parts of statutes',
  '2.5.1': 'Statutory instruments',
  '2.5.2': 'Rules of court',
  '2.5.3': 'Parts of statutory instruments',
  '2.6.1': 'EU legislation',
  '2.6.2': 'Judgments of the European Court of Justice and General Court',
  '3.1.4': 'Electronic sources',
  '3.2.1': 'Authored books',
  '3.2.2': 'Edited and translated books',
  '3.2.3': 'Contributions to edited books',
  '3.3.1': 'Hard copy journals',
  '3.3.2': 'Case notes',
  '3.3.3': 'Forthcoming articles',
  '3.3.4': 'Online journals',
  '3.4.8': 'Websites and blogs',
  '4.1': 'Guide to neutral citations',
  '4.2.1': 'Abbreviations of the names of law reports and journals',
} as const;

/** A section number the guide actually has. */
export type RuleSection = keyof typeof RULES;

/** `2.1.3` → `OSCOLA 2.1.3 — Neutral citations`, for display beside a check. */
export function ruleLabel(section: RuleSection): string {
  return `OSCOLA ${section} — ${RULES[section]}`;
}
