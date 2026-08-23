/**
 * OSCOLA 4th edn §4.1, "Guide to neutral citations" — every court that issues a
 * neutral citation, with the code it uses and, for the High Court and the
 * tribunals, the division in brackets.
 *
 * Generated from the guide's own appendix rather than typed from memory: the
 * PDF text was extracted, and each row anchored on the `[Year] CODE number`
 * pattern rather than on column alignment, because a court name that wraps to a
 * second line shifts every pair after it and does so silently. `courts.test.ts`
 * asserts a sample against the printed guide so a regeneration cannot corrupt
 * the table unnoticed.
 *
 * The list is OSCOLA 4th edn's, published 2012. Courts created since — and the
 * later Upper Tribunal chambers — are not in it, which is why an unrecognised
 * code is a warning and never an error.
 */
export interface NeutralCitationCourt {
  /** The code as it appears in the citation, e.g. `EWCA Civ`, `EWHC`. */
  readonly code: string;
  /** The bracketed division, where the code takes one: `[2006] EWHC 407 (QB)`. */
  readonly division?: string;
  readonly jurisdiction: string;
  readonly name: string;
}

export const NEUTRAL_CITATION_COURTS: readonly NeutralCitationCourt[] = [
  { code: 'UKSC', division: undefined, jurisdiction: 'United Kingdom', name: 'Supreme Court' },
  { code: 'UKHL', division: undefined, jurisdiction: 'United Kingdom', name: 'House of Lords' },
  { code: 'UKPC', division: undefined, jurisdiction: 'United Kingdom', name: 'Privy Council' },
  { code: 'EWCA Civ', division: undefined, jurisdiction: 'England and Wales', name: 'Court of Appeal (Civil Division)' },
  { code: 'EWCA Crim', division: undefined, jurisdiction: 'England and Wales', name: 'Court of Appeal (Criminal Division)' },
  { code: 'EWHC', division: 'Ch', jurisdiction: 'England and Wales', name: 'High Court, Chancery Division' },
  { code: 'EWHC', division: 'Fam', jurisdiction: 'England and Wales', name: 'High Court, Family Division' },
  { code: 'EWHC', division: 'QB', jurisdiction: 'England and Wales', name: 'High Court, Queen’s Bench Division' },
  { code: 'EWHC', division: 'Admin', jurisdiction: 'England and Wales', name: 'High Court, Administrative Court' },
  { code: 'EWHC', division: 'Admlty', jurisdiction: 'England and Wales', name: 'High Court, Admiralty Court' },
  { code: 'EWHC', division: 'Comm', jurisdiction: 'England and Wales', name: 'High Court, Commercial Court' },
  { code: 'EWHC', division: 'Pat', jurisdiction: 'England and Wales', name: 'High Court, Patents Court' },
  { code: 'EWHC', division: 'TCC', jurisdiction: 'England and Wales', name: 'High Court, Technology and Construction Court' },
  { code: 'CSIH', division: undefined, jurisdiction: 'Scotland', name: 'Court of Session, Inner House' },
  { code: 'CSOH', division: undefined, jurisdiction: 'Scotland', name: 'Court of Session, Outer House' },
  { code: 'HCJAC', division: undefined, jurisdiction: 'Scotland', name: 'Court of Criminal Appeal' },
  { code: 'HCJT', division: undefined, jurisdiction: 'Scotland', name: 'High Court of Justiciary (sitting as a trial court)' },
  { code: 'NICA', division: undefined, jurisdiction: 'Northern Ireland', name: 'Court of Appeal in Northern Ireland' },
  { code: 'NIQB', division: undefined, jurisdiction: 'Northern Ireland', name: 'High Court of Justice in Northern Ireland, Queen’s Bench Division' },
  { code: 'NICC', division: undefined, jurisdiction: 'Northern Ireland', name: 'Crown Court for Northern Ireland' },
  { code: 'UKEAT', division: undefined, jurisdiction: 'Tribunals', name: 'Employment Appeal Tribunal' },
  { code: 'UKSIAC', division: undefined, jurisdiction: 'Tribunals', name: 'Special Immigration Appeals Commission' },
  { code: 'UKUT', division: 'AAC', jurisdiction: 'Tribunals', name: 'Upper Tribunal (Administrative Appeals Chamber)' },
  { code: 'UKFTT', division: 'HESC', jurisdiction: 'Tribunals', name: 'First-tier Tribunal (Health, Education and Social Care Chamber)' },
  { code: 'UKFTT', division: 'SEC', jurisdiction: 'Tribunals', name: 'First-tier Tribunal (Social Entitlement Chamber)' },
  { code: 'UKFTT', division: 'WPAFCC', jurisdiction: 'Tribunals', name: 'First-tier Tribunal (War Pensions and Armed Forces Compensation Chamber)' },
];

/** Every court code in §4.1, without divisions. */
export const COURT_CODES: ReadonlySet<string> = new Set(
  NEUTRAL_CITATION_COURTS.map((court) => court.code),
);

/**
 * The divisions §4.1 lists for a code. Empty for a court that takes none, which
 * is different from a code that is not in the table at all.
 */
export const DIVISIONS_BY_CODE: ReadonlyMap<string, readonly string[]> = new Map(
  [...COURT_CODES].map((code) => [
    code,
    NEUTRAL_CITATION_COURTS.filter((c) => c.code === code)
      .map((c) => c.division)
      .filter((division): division is string => Boolean(division)),
  ]),
);

/** A code that differs only in capitalisation, so the message can name it. */
export function codeByLooseMatch(input: string): string | undefined {
  const wanted = input.trim().toLowerCase().replace(/\s+/g, ' ');
  return [...COURT_CODES].find((code) => code.toLowerCase() === wanted);
}
