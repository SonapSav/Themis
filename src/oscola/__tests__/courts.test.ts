import { describe, expect, it } from 'vitest';
import {
  COURT_CODES,
  DIVISIONS_BY_CODE,
  NEUTRAL_CITATION_COURTS,
  codeByLooseMatch,
} from '../courts';

/**
 * `courts.ts` is generated from OSCOLA's §5.1 appendix, and the extraction it
 * comes from is the fragile part: the appendix is a two-column table, and a
 * court name that wraps to a second line shifts every pair after it. A first
 * attempt at the neighbouring abbreviations table produced pairs that read
 * perfectly plausibly and were wrong — `Road Traffic Reports` against `RPC`.
 *
 * A wrong row here is worse than a missing one, because this table is used to
 * tell a student their citation is wrong. So every row below is transcribed
 * from the printed guide, and the generated table has to match it exactly.
 *
 * Transcribed from the 5th edition, whose table wraps six names across two
 * lines — "High Court, Technology and | Construction Court" among them — and
 * prints the High Court divisions in the order below, which is not alphabetical:
 * Commercial comes before Chancery.
 */
describe('the §5.1 court table matches the printed guide', () => {
  const expected: ReadonlyArray<[string, string | undefined, string]> = [
    // 5.1.1 United Kingdom
    ['UKSC', undefined, 'Supreme Court'],
    ['UKHL', undefined, 'House of Lords'],
    ['UKPC', undefined, 'Privy Council'],
    // 5.1.2 England and Wales
    ['EWCA Civ', undefined, 'Court of Appeal (Civil Division)'],
    ['EWCA Crim', undefined, 'Court of Appeal (Criminal Division)'],
    ['EWCOP', undefined, 'Court of Protection'],
    ['EWFC', undefined, 'Family Court'],
    ['EWHC', 'Admin', 'High Court, Administrative Court'],
    ['EWHC', 'Admlty', 'High Court, Admiralty Court'],
    ['EWHC', 'Comm', 'High Court, Commercial Court'],
    ['EWHC', 'Ch', 'High Court, Chancery Division'],
    ['EWHC', 'Fam', 'High Court, Family Division'],
    ['EWHC', 'KB', 'High Court, King’s Bench Division'],
    ['EWHC', 'Pat', 'High Court, Patents Court'],
    ['EWHC', 'QB', 'High Court, Queen’s Bench Division'],
    ['EWHC', 'TCC', 'High Court, Technology and Construction Court'],
    // 5.1.3 Scotland
    ['CSIH', undefined, 'Court of Session, Inner House'],
    ['CSOH', undefined, 'Court of Session, Outer House'],
    ['HCJAC', undefined, 'Court of Criminal Appeal'],
    ['HCJT', undefined, 'High Court of Justiciary (sitting as a trial court)'],
    ['SAC Civ', undefined, 'Sheriff Appeal Court (Civil)'],
    ['SAC Crim', undefined, 'Sheriff Appeal Court (Criminal)'],
    // 5.1.4 Northern Ireland
    ['NICA', undefined, 'Court of Appeal'],
    ['NIKB', undefined, 'High Court of Justice, King’s Bench Division'],
    ['NIQB', undefined, 'High Court of Justice, Queen’s Bench Division'],
    ['NIFam', undefined, 'High Court of Justice, Family Division'],
    ['NICh', undefined, 'High Court of Justice, Chancery Division'],
    ['NICC', undefined, 'Crown Court'],
    ['NIMaster', undefined, 'Masters’ Decisions'],
    // 5.1.5 Tribunals
    ['CAT', undefined, 'Competition Appeal Tribunal'],
    ['UKEAT', undefined, 'Employment Appeal Tribunal'],
    ['UKFTT', 'HESC', 'First-tier Tribunal (Health, Education and Social Care Chamber)'],
    ['UKFTT', 'SEC', 'First-tier Tribunal (Social Entitlement Chamber)'],
    ['UKFTT', 'WPAFCC', 'First-tier Tribunal (War Pensions and Armed Forces Compensation Chamber)'],
    ['UKSIAC', undefined, 'Special Immigration Appeals Commission'],
    ['UKUT', 'AAC', 'Upper Tribunal (Administrative Appeals Chamber)'],
    ['UKUT', 'IAC', 'Upper Tribunal (Immigration and Asylum Chamber)'],
    ['UKUT', 'LC', 'Upper Tribunal (Lands Chamber)'],
    ['UKUT', 'TCC', 'Upper Tribunal (Tax and Chancery Chamber)'],
  ];

  it('holds every row, in the guide’s order, with nothing added or dropped', () => {
    expect(
      NEUTRAL_CITATION_COURTS.map((court) => [court.code, court.division, court.name]),
    ).toEqual(expected.map(([code, division, name]) => [code, division, name]));
  });

  /**
   * §5.1.3 gives the Sheriff Court as "[Year] SC, followed by a court identifier
   * and judgment number" — prose, not a fixed code — so it is deliberately not
   * a row, and an SC citation is not recognised.
   */
  it('leaves out the Sheriff Court, which the guide gives in prose', () => {
    expect(COURT_CODES.has('SC')).toBe(false);
  });

  it('groups the divisions under their code', () => {
    // 2.1.3: medium neutral citations from the High Court include the division
    // in brackets after the judgment number.
    expect(DIVISIONS_BY_CODE.get('EWHC')).toEqual([
      'Admin', 'Admlty', 'Comm', 'Ch', 'Fam', 'KB', 'Pat', 'QB', 'TCC',
    ]);
    expect(DIVISIONS_BY_CODE.get('UKFTT')).toEqual(['HESC', 'SEC', 'WPAFCC']);
    expect(DIVISIONS_BY_CODE.get('UKUT')).toEqual(['AAC', 'IAC', 'LC', 'TCC']);
    // A court that takes no division is not the same as an unknown code.
    expect(DIVISIONS_BY_CODE.get('UKSC')).toEqual([]);
    expect(DIVISIONS_BY_CODE.get('EWCR')).toBeUndefined();
  });

  it('collapses the codes without losing any', () => {
    expect(COURT_CODES.size).toBe(26);
    expect(COURT_CODES.has('EWCA Civ')).toBe(true);
    expect(COURT_CODES.has('EWCA')).toBe(false);
  });

  it('recognises a code that differs only in capitalisation', () => {
    expect(codeByLooseMatch('ewhc')).toBe('EWHC');
    expect(codeByLooseMatch('ewca civ')).toBe('EWCA Civ');
    expect(codeByLooseMatch('sac civ')).toBe('SAC Civ');
    expect(codeByLooseMatch('EWCR')).toBeUndefined();
  });

  /**
   * The 5th edition's table is a strict superset of the 4th's. EWFC was the
   * example the old tests used for "a court the guide does not have"; it is in
   * the guide now, which is exactly the kind of thing this migration had to
   * catch.
   */
  it('now recognises the courts the 4th edition had no row for', () => {
    for (const code of ['EWFC', 'EWCOP', 'CAT', 'NIKB', 'SAC Civ', 'NIMaster']) {
      expect(COURT_CODES.has(code)).toBe(true);
    }
    expect(DIVISIONS_BY_CODE.get('EWHC')).toContain('KB');
  });
});
