/**
 * The sections of OSCOLA 5th edn that `validate` cites, with the guide's own
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
 *
 * These are 5th edn numbers. The 5th edition renumbered heavily, and the
 * dangerous part is that several 4th-edn numbers still exist while meaning
 * something else entirely: 4.1 was the neutral citation appendix and is now
 * Treaties, 4.2.1 was the law report abbreviations and is now the UN Charter,
 * and 2.5.2 and 2.5.3 swapped places. See *Migrating to the 5th edition* in the
 * README for the whole map.
 */
export const RULES = {
  '1.3.1': 'Punctuation',
  '2.1.1': 'General principles',
  '2.1.2': 'Case names',
  '2.1.3': 'Medium neutral citations',
  '2.1.4': 'Law reports',
  '2.1.5': 'Courts',
  '2.1.6': 'Pinpoints',
  '2.1.8': 'Subsequent history of a case',
  '2.1.9': 'Cases decided before 1865',
  '2.4.1': 'Names of statutes',
  '2.4.2': 'Parts of statutes',
  '2.5.1': 'Statutory instruments',
  '2.5.2': 'Parts of statutory instruments',
  '2.5.3': 'Rules of court',
  '3.1.4': 'Electronic sources',
  '3.2.1': 'Authored books',
  '3.2.3': 'Edited and translated books',
  '3.2.4': 'Contributions to edited books',
  '3.3': 'Articles',
  '3.4': 'Case notes',
  '3.7.1': 'Websites',
  '4.4.1': 'European Union legislation',
  '4.4.2': 'Court of Justice of the European Union and General Court decisions',
  '5.1': 'Guide to medium neutral citations',
  '5.2.1': 'Abbreviations of the names of law reports, journals and treaty series',
} as const;

/** A section number the guide actually has. */
export type RuleSection = keyof typeof RULES;

/** `2.1.3` → `OSCOLA 2.1.3 — Medium neutral citations`, for display beside a check. */
export function ruleLabel(section: RuleSection): string {
  return `OSCOLA ${section} — ${RULES[section]}`;
}
