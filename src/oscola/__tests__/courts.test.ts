import { describe, expect, it } from 'vitest';
import {
  COURT_CODES,
  DIVISIONS_BY_CODE,
  NEUTRAL_CITATION_COURTS,
  codeByLooseMatch,
} from '../courts';

/**
 * `courts.ts` is generated from OSCOLA's §4.1 appendix, and the extraction it
 * comes from is the fragile part: the appendix is a two-column table, and a
 * court name that wraps to a second line shifts every pair after it. A first
 * attempt at the neighbouring §4.2.1 produced pairs that read perfectly
 * plausibly and were wrong — `Road Traffic Reports` against `RPC`.
 *
 * A wrong row here is worse than a missing one, because this table is used to
 * tell a student their citation is wrong. So every row below is transcribed
 * from the printed guide, and the generated table has to match it exactly.
 */
describe('the §4.1 court table matches the printed guide', () => {
  const expected: ReadonlyArray<[string, string | undefined, string]> = [
    ['UKSC', undefined, 'Supreme Court'],
    ['UKHL', undefined, 'House of Lords'],
    ['UKPC', undefined, 'Privy Council'],
    ['EWCA Civ', undefined, 'Court of Appeal (Civil Division)'],
    ['EWCA Crim', undefined, 'Court of Appeal (Criminal Division)'],
    ['EWHC', 'Ch', 'High Court, Chancery Division'],
    ['EWHC', 'Fam', 'High Court, Family Division'],
    ['EWHC', 'QB', 'High Court, Queen’s Bench Division'],
    ['EWHC', 'Admin', 'High Court, Administrative Court'],
    ['EWHC', 'Admlty', 'High Court, Admiralty Court'],
    ['EWHC', 'Comm', 'High Court, Commercial Court'],
    ['EWHC', 'Pat', 'High Court, Patents Court'],
    ['EWHC', 'TCC', 'High Court, Technology and Construction Court'],
    ['CSIH', undefined, 'Court of Session, Inner House'],
    ['CSOH', undefined, 'Court of Session, Outer House'],
    ['HCJAC', undefined, 'Court of Criminal Appeal'],
    ['HCJT', undefined, 'High Court of Justiciary (sitting as a trial court)'],
    ['NICA', undefined, 'Court of Appeal in Northern Ireland'],
    ['NIQB', undefined, 'High Court of Justice in Northern Ireland, Queen’s Bench Division'],
    ['NICC', undefined, 'Crown Court for Northern Ireland'],
    ['UKEAT', undefined, 'Employment Appeal Tribunal'],
    ['UKSIAC', undefined, 'Special Immigration Appeals Commission'],
    ['UKUT', 'AAC', 'Upper Tribunal (Administrative Appeals Chamber)'],
    ['UKFTT', 'HESC', 'First-tier Tribunal (Health, Education and Social Care Chamber)'],
    ['UKFTT', 'SEC', 'First-tier Tribunal (Social Entitlement Chamber)'],
    ['UKFTT', 'WPAFCC', 'First-tier Tribunal (War Pensions and Armed Forces Compensation Chamber)'],
  ];

  it('holds every row, in the guide’s order, with nothing added or dropped', () => {
    expect(
      NEUTRAL_CITATION_COURTS.map((court) => [court.code, court.division, court.name]),
    ).toEqual(expected.map(([code, division, name]) => [code, division, name]));
  });

  it('groups the divisions under their code', () => {
    // 2.1.3: "neutral citations from the High Court do include the division in
    // brackets after the judgment number".
    expect(DIVISIONS_BY_CODE.get('EWHC')).toEqual([
      'Ch', 'Fam', 'QB', 'Admin', 'Admlty', 'Comm', 'Pat', 'TCC',
    ]);
    expect(DIVISIONS_BY_CODE.get('UKFTT')).toEqual(['HESC', 'SEC', 'WPAFCC']);
    // A court that takes no division is not the same as an unknown code.
    expect(DIVISIONS_BY_CODE.get('UKSC')).toEqual([]);
    expect(DIVISIONS_BY_CODE.get('EWFC')).toBeUndefined();
  });

  it('collapses the codes without losing any', () => {
    expect(COURT_CODES.size).toBe(17);
    expect(COURT_CODES.has('EWCA Civ')).toBe(true);
    expect(COURT_CODES.has('EWCA')).toBe(false);
  });

  it('recognises a code that differs only in capitalisation', () => {
    expect(codeByLooseMatch('ewhc')).toBe('EWHC');
    expect(codeByLooseMatch('ewca civ')).toBe('EWCA Civ');
    expect(codeByLooseMatch('EWFC')).toBeUndefined();
  });
});
