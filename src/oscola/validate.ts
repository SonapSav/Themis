import type { NeutralCitation, Source } from '../model/types';
import { COURT_CODES, DIVISIONS_BY_CODE, codeByLooseMatch } from './courts';
import type { RuleSection } from './rules';

export type IssueSeverity = 'error' | 'warning';

export interface ValidationIssue {
  readonly severity: IssueSeverity;
  /** The source field the issue concerns, for highlighting in the form. */
  readonly field: string;
  readonly message: string;
  /**
   * The section of OSCOLA the check comes from, where one governs it. A check
   * that only says a field is missing leaves a reader to take the tool's word
   * for it; naming the rule lets them go and read it.
   *
   * Undefined for the OU's own material, which Cite Them Right governs rather
   * than OSCOLA, and for checks about this app rather than the guide.
   */
  readonly rule?: RuleSection;
}

const error = (field: string, message: string, rule?: RuleSection): ValidationIssue => ({
  severity: 'error',
  field,
  message,
  rule,
});

const warning = (field: string, message: string, rule?: RuleSection): ValidationIssue => ({
  severity: 'warning',
  field,
  message,
  rule,
});

const blank = (value: string | undefined): boolean => !value || value.trim() === '';

/**
 * OSCOLA 4.2.1, in terms: "In OSCOLA, abbreviations do not have full stops."
 *
 * Flagged rather than stripped. `A.C.` is not rewritten to `AC`, because
 * silently editing what a student typed is how a tool stops being checkable —
 * and because the same field legitimately carries `Lloyd's Rep` and
 * `Cr App R (S)`, neither of which anyone should have to trust an autocorrect
 * with.
 */
function fullStopIssues(field: string, value: string | undefined): readonly ValidationIssue[] {
  const trimmed = value?.trim();
  if (!trimmed || !trimmed.includes('.')) return [];
  return [
    warning(
      field,
      `OSCOLA abbreviations take no full stops, so "${trimmed}" would normally be "${trimmed.replace(/\./g, '')}".`,
      '4.2.1',
    ),
  ];
}

/**
 * OSCOLA 4.1 lists every court that issues a neutral citation, and 2.1.3 adds
 * that "neutral citations from the High Court do include the division in
 * brackets after the judgment number".
 *
 * Every issue here is a warning. 4.1 is the 2012 list: courts created since,
 * and the Upper Tribunal chambers added later, are genuinely absent from it, so
 * an unrecognised code means "not in OSCOLA's table", never "wrong".
 */
function courtCodeIssues(field: string, neutral: NeutralCitation | undefined): readonly ValidationIssue[] {
  const code = neutral?.court?.trim();
  if (!neutral || !code) return [];
  const issues: ValidationIssue[] = [];
  const division = neutral.division?.trim();

  if (!COURT_CODES.has(code)) {
    const loose = codeByLooseMatch(code);
    issues.push(
      warning(
        `${field}.court`,
        loose
          ? `Court codes are capitalised as the guide prints them: "${loose}", not "${code}".`
          : `"${code}" is not in OSCOLA's list of neutral citation courts. Check it, or ignore this if the court postdates the 4th edition.`,
        '4.1',
      ),
    );
    return issues;
  }

  const divisions = DIVISIONS_BY_CODE.get(code) ?? [];
  if (divisions.length > 0 && !division) {
    issues.push(
      warning(
        `${field}.division`,
        `${code} citations carry the division in brackets after the judgment number: ${divisions.join(', ')}.`,
        '2.1.3',
      ),
    );
  } else if (divisions.length > 0 && division && !divisions.includes(division)) {
    issues.push(
      warning(
        `${field}.division`,
        `The guide lists ${divisions.join(', ')} for ${code}, not "${division}".`,
        '4.1',
      ),
    );
  } else if (divisions.length === 0 && division) {
    issues.push(
      warning(`${field}.division`, `${code} citations take no division in brackets.`, '4.1'),
    );
  }
  return issues;
}

/**
 * OSCOLA 3.1.4: include "http://" only where the address does not begin with
 * "www". The guide's own examples are <www.nakedlaw.com/2009/05/index.html>
 * and <http://ejlt.org/article/view/17>. The URL is never rewritten silently.
 */
function urlIssues(url: string): readonly ValidationIssue[] {
  const trimmed = url.trim();
  if (/^https?:\/\/www\./i.test(trimmed)) {
    return [warning('url', 'OSCOLA omits "http://" where the address begins with "www".', '3.1.4')];
  }
  if (!/^https?:\/\//i.test(trimmed) && !/^www\./i.test(trimmed)) {
    return [
      warning(
        'url',
        'Addresses that do not begin with "www" are cited with "http://" or "https://".',
        '3.1.4',
      ),
    ];
  }
  return [];
}

/**
 * A law report is a year, a series and a page, whichever citation carries it —
 * the case's own, or the one its later history is reported at. All three are
 * errors: a report missing any of them does not identify a volume a reader can
 * open, which is the whole of what a report citation is for.
 */
function reportIssues(
  prefix: string,
  report: { readonly year?: string; readonly abbreviation?: string; readonly firstPage?: string } | undefined,
  rule: RuleSection,
): readonly ValidationIssue[] {
  if (!report) return [];
  const issues: ValidationIssue[] = [];
  if (blank(report.year)) {
    issues.push(
      error(
        `${prefix}.year`,
        'The law report needs its year. It is what identifies the volume, in square brackets where the year does that job and round brackets where a volume number does.',
        rule,
      ),
    );
  }
  if (blank(report.abbreviation)) {
    issues.push(
      error(
        `${prefix}.abbreviation`,
        'The law report needs its series abbreviation, e.g. "AC". Without it there is nothing to say which series of reports to open.',
        rule,
      ),
    );
  }
  if (blank(report.firstPage)) {
    issues.push(
      error(
        `${prefix}.firstPage`,
        'The law report needs the first page of the report — where the case starts, not the page you are relying on. A page you are relying on is a pinpoint, and has its own field.',
        rule,
      ),
    );
  }
  return issues;
}

/**
 * A neutral citation is a year, a court and a judgment number. Any one of them
 * missing renders a citation with a hole in it — `[2008] UKHL` or `[] UKHL 13`
 * — so each is an error rather than a preference.
 */
function neutralIssues(prefix: string, neutral: NeutralCitation | undefined): readonly ValidationIssue[] {
  if (!neutral) return [];
  const issues: ValidationIssue[] = [];
  if (blank(neutral.year)) {
    issues.push(
      error(
        `${prefix}.year`,
        'A neutral citation needs the year of judgment, in square brackets. Cases are numbered from one again each year, so the number alone does not identify a judgment.',
        '2.1.3',
      ),
    );
  }
  if (blank(neutral.court)) {
    issues.push(
      error(
        `${prefix}.court`,
        'A neutral citation needs the court code, e.g. "UKHL" or "EWCA Civ". It is the part that identifies the court, which is why no court is then given in brackets at the end.',
        '2.1.3',
      ),
    );
  }
  if (blank(neutral.number)) {
    issues.push(
      error(
        `${prefix}.number`,
        'A neutral citation needs the judgment number — the judgment’s place in that court’s run for the year.',
        '2.1.3',
      ),
    );
  }
  return issues;
}

/**
 * Check a source for missing or questionable data.
 *
 * `error` means the citation cannot be correct as it stands; `warning` means it
 * will render but departs from OSCOLA's preference. The point is to surface
 * silent citation errors, which are worse for a student than no tool at all.
 *
 * Every check that a section of the guide governs carries that section, so the
 * panel can say not just what is missing but which rule asks for it.
 */
export function validate(source: Source): readonly ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  switch (source.type) {
    case 'case': {
      if (blank(source.caseName)) {
        issues.push(
          error(
            'caseName',
            'A case needs its name. The citation opens with the parties, in italics, and the name is what a reader recognises the case by.',
            '2.1.1',
          ),
        );
      } else if (!/\bv\b/.test(source.caseName)) {
        issues.push(
          warning(
            'caseName',
            'Case names normally join the parties with an unpunctuated "v" — no full stop after it. Ignore this where the case has no adverse parties, as in "Re Farquar’s Estate".',
            '2.1.2',
          ),
        );
      }
      // OSCOLA 2.1.4: an unreported case with no neutral citation is cited by
      // its court and date of judgment instead of a report.
      const unreported = !source.neutral && !source.report;
      if (unreported) {
        if (blank(source.judgmentDate)) {
          issues.push(
            error(
              'report',
              'A case needs a neutral citation, a law report, or — if it is unreported and has no neutral citation — the court and the date of judgment. A case name on its own is not a citation.',
              '2.1.1',
            ),
          );
        } else if (blank(source.court)) {
          issues.push(
            error(
              'court',
              'An unreported case is cited by the court and the date of judgment in brackets, so the court is needed. There is no need to add the word "unreported".',
              '2.1.4',
            ),
          );
        }
      }
      issues.push(...reportIssues('report', source.report, '2.1.4'));
      issues.push(...neutralIssues('neutral', source.neutral));
      // Neutral citations were introduced in 2001; a later case that has none is
      // usually an omission rather than a genuine absence.
      const year = Number(
        source.neutral?.year ?? source.report?.year ?? source.judgmentDate?.slice(0, 4),
      );
      if (!source.neutral && Number.isFinite(year) && year >= 2001) {
        issues.push(
          warning(
            'neutral',
            'Cases from 2001 onwards normally carry a neutral citation, and it is cited first, before the report.',
            '2.1.3',
          ),
        );
      }
      // OSCOLA 2.1.5: cases decided before 1865, and cases with a neutral
      // citation, do not need the court.
      const reportYear = Number(source.report?.year);
      if (
        !source.neutral &&
        !blank(source.report?.abbreviation) &&
        blank(source.court) &&
        (!Number.isFinite(reportYear) || reportYear >= 1865)
      ) {
        issues.push(
          warning(
            'court',
            'Give the court in brackets after the first page, where it is not already apparent from the report series.',
            '2.1.5',
          ),
        );
      }
      if (source.neutral && !blank(source.court)) {
        issues.push(
          warning(
            'court',
            'The neutral citation already identifies the court, so no court is given in brackets and this has been left out.',
            '2.1.5',
          ),
        );
      }
      for (const further of source.furtherNeutrals ?? []) {
        if (blank(further.number)) {
          issues.push(
            error(
              'neutral2.number',
              'A neutral citation needs the judgment number — the judgment’s place in that court’s run for the year.',
              '2.1.3',
            ),
          );
        }
      }
      // 4.1 and 4.2.1: the court codes and the no-full-stop rule.
      issues.push(...courtCodeIssues('neutral', source.neutral));
      issues.push(...courtCodeIssues('neutral2', source.furtherNeutrals?.[0]));
      issues.push(...courtCodeIssues('history.neutral', source.history?.neutral));
      issues.push(...fullStopIssues('report.abbreviation', source.report?.abbreviation));
      issues.push(...fullStopIssues('court', source.court));
      issues.push(...fullStopIssues('history.report.abbreviation', source.history?.report?.abbreviation));
      issues.push(...fullStopIssues('history.court', source.history?.court));
      // 2.1.2 and 2.1.8: the clause after the primary citation.
      if (source.history) {
        const { disposition, subNom, caseName, neutral, report, court } = source.history;
        if (neutral && blank(neutral.number)) {
          issues.push(
            error(
              'history.neutral.number',
              'A neutral citation needs the judgment number — the judgment’s place in that court’s run for the year.',
              '2.1.3',
            ),
          );
        }
        if ((disposition || subNom) && !neutral && !report) {
          issues.push(
            warning(
              // A real field key, so the message lands on a field and can open
              // the folded group it belongs to, not only in the Checks panel.
              'history.report.abbreviation',
              'Give the citation the later stage is reported at — "affd" and "sub nom" introduce a citation rather than standing alone.',
              '2.1.8',
            ),
          );
        }
        if (subNom && blank(caseName)) {
          issues.push(
            warning(
              'history.caseName',
              '"Sub nom" introduces the name the case is reported under at the later stage, so give that name.',
              '2.1.2',
            ),
          );
        }
        if (neutral && !blank(court)) {
          issues.push(
            warning(
              'history.court',
              'The later neutral citation already identifies the court, so it has been left out.',
              '2.1.5',
            ),
          );
        }
      }
      break;
    }

    case 'act': {
      if (blank(source.shortTitle)) {
        issues.push(
          error(
            'shortTitle',
            'An Act is cited by its short title, in roman with capitals for the major words — "Human Rights Act". Popular titles such as "Lord Campbell’s Act" are not used.',
            '2.4.1',
          ),
        );
      }
      if (blank(source.year)) {
        issues.push(
          error(
            'year',
            'An Act needs its year. The year is part of the Act’s name rather than a date of publication, which is why no comma comes before it.',
            '2.4.1',
          ),
        );
      }
      if (/\b(1\d{3}|2\d{3})\s*$/.test(source.shortTitle)) {
        issues.push(
          warning(
            'shortTitle',
            'Enter the short title without the year — the year has its own field, and is added with no comma before it.',
            '2.4.1',
          ),
        );
      }
      // 2.4.2: "a space but no full stop between the abbreviation and the
      // initial number". The abbreviation itself is what the form adds, so a
      // provision typed as "s. 15" or "section 15" doubles it.
      const provision = source.provision?.trim() ?? '';
      if (/^(s\.|ss\.|sch\.|section\b|sections\b|schedule\b)/i.test(provision)) {
        issues.push(
          warning(
            'provision',
            'Give the number alone — parts of an Act are cited as "s 15", with a space and no full stop, and the abbreviation is added for you.',
            '2.4.2',
          ),
        );
      }
      break;
    }

    case 'journalArticle': {
      if (source.authors.length === 0) {
        issues.push(
          error(
            'authors',
            'A journal article needs its author. The citation opens with the author’s name, and the bibliography is ordered by it.',
            '3.3.1',
          ),
        );
      }
      // 3.3.2: an untitled case note carries the case name in the title's place,
      // so one of the two is required, not both.
      if (blank(source.title) && blank(source.caseName)) {
        issues.push(
          error(
            'title',
            source.isCaseNote
              ? 'A case note needs its own title, or — where it has none — the name of the case it discusses, which stands in the title’s place.'
              : 'A journal article needs its title, in single quotation marks and roman.',
            source.isCaseNote ? '3.3.2' : '3.3.1',
          ),
        );
      }
      if (!blank(source.title) && !blank(source.caseName)) {
        issues.push(
          warning(
            'caseName',
            'A case note with its own title is cited as an ordinary article, so the case name has been left out.',
            '3.3.2',
          ),
        );
      }
      if (blank(source.journal)) {
        issues.push(
          error(
            'journal',
            'A journal article needs the journal name, in full or abbreviated, e.g. "MLR". It is what tells a reader where the article was published.',
            '3.3.1',
          ),
        );
      }
      issues.push(...fullStopIssues('journal', source.journal));
      if (blank(source.year)) {
        issues.push(
          error(
            'year',
            'A journal article needs its year. It goes in square brackets where it identifies the volume, and round brackets where a volume number does.',
            '3.3.1',
          ),
        );
      }
      // 3.3.4: online journals "may lack some of the publication elements (for
      // example, many do not include page numbers)"; 3.3.3 says to omit an
      // unknown page from a forthcoming article. Neither is an error.
      const pageOptional = !blank(source.url) || source.forthcoming === true;
      if (blank(source.firstPage) && !pageOptional) {
        issues.push(
          error(
            'firstPage',
            'A journal article needs its first page — where the article starts in the volume, not the page you are relying on.',
            '3.3.1',
          ),
        );
      }
      if (blank(source.volume) && source.forthcoming !== true) {
        issues.push(
          warning(
            'volume',
            'No volume number, so the year will be cited in square brackets instead. Check the journal really has no volumes.',
            '3.3.1',
          ),
        );
      }
      if (!blank(source.url)) {
        issues.push(...urlIssues(source.url!));
        if (blank(source.accessDate)) {
          issues.push(
            error(
              'accessDate',
              'An online article needs the date you last accessed it, because the page may change or disappear after you cite it.',
              '3.3.4',
            ),
          );
        }
      } else if (!blank(source.accessDate)) {
        issues.push(
          warning(
            'accessDate',
            'The access date is only cited alongside a web address, so it has been left out.',
            '3.1.4',
          ),
        );
      }
      break;
    }

    case 'book': {
      if (source.authors.length === 0) {
        issues.push(
          error(
            'authors',
            'A book needs its author or editor. The citation opens with the name, and an editor is marked "(ed)" or "(eds)".',
            source.authorRole === 'editor' ? '3.2.2' : '3.2.1',
          ),
        );
      }
      if (blank(source.title)) {
        issues.push(error('title', 'A book needs its title, which is given in italics.', '3.2.1'));
      }
      if (blank(source.publisher)) {
        issues.push(
          error(
            'publisher',
            'A book needs its publisher. The edition, publisher and year sit together in one bracket at the end of the citation.',
            '3.2.1',
          ),
        );
      }
      if (blank(source.year)) {
        issues.push(
          error(
            'year',
            'A book needs its year of publication, which closes the publication bracket.',
            '3.2.1',
          ),
        );
      }
      if (!blank(source.place)) {
        issues.push(
          warning(
            'place',
            'The 4th edition dropped the place of publication, so it will not appear in the citation.',
            '3.2.1',
          ),
        );
      }
      // 3.2.1's placing rule only bites where there is a volume to place.
      if (source.volumesVary && blank(source.volume)) {
        issues.push(
          warning(
            'volume',
            'The volume position only applies to a work with a volume number, so give one or leave the position alone.',
            '3.2.1',
          ),
        );
      }
      break;
    }

    case 'statutoryInstrument': {
      // 2.5.2: the CPR, RSC and CCR are cited by name alone, so the year and
      // the number are not merely optional — they are not part of the citation.
      if (source.numbering === 'rulesOfCourt') {
        if (blank(source.name)) {
          issues.push(
            error(
              'name',
              'Give the rules, e.g. "CPR", "RSC", "CCR", or "6A PD" for a practice direction. The rules of court are cited by name and pinpoint alone.',
              '2.5.2',
            ),
          );
        }
        if (!blank(source.year) || !blank(source.siNumber)) {
          issues.push(
            warning(
              'siNumber',
              'The rules of court are cited without their year or SI number, so neither has been included.',
              '2.5.2',
            ),
          );
        }
        // 2.5.3: "in the case of the Civil Procedure Rules, omit the
        // abbreviations 'r' and 'rr'". Stated for the CPR alone — the RSC and
        // CCR examples keep theirs, as in `RSC Ord 24, r 14A`.
        if (/^CPR\b/i.test(source.name.trim()) && /^rr?\b\.?/i.test(source.provision?.trim() ?? '')) {
          issues.push(
            warning(
              'provision',
              'CPR pinpoints omit "r" and "rr": write "5.2(1)(b)", not "r 5.2(1)(b)".',
              '2.5.3',
            ),
          );
        }
        break;
      }

      const label = source.numbering === 'srAndO' ? 'SR & O' : 'SI';
      if (blank(source.name)) {
        issues.push(
          error(
            'name',
            'A statutory instrument is cited by its name, in roman with capitals for the major words.',
            '2.5.1',
          ),
        );
      }
      if (blank(source.year)) {
        issues.push(
          error(
            'year',
            'A statutory instrument needs its year, which follows the name with no comma before it.',
            '2.5.1',
          ),
        );
      }
      if (blank(source.siNumber)) {
        issues.push(
          error(
            'siNumber',
            `A statutory instrument needs its ${label} number, e.g. "2004/3166". Instruments are numbered in one run each year, so the number is what identifies this one.`,
            '2.5.1',
          ),
        );
      } else if (!/^\d{4}\/\d+$/.test(source.siNumber.trim())) {
        issues.push(
          warning(
            'siNumber',
            `${label} numbers take the form year/number, e.g. "2004/3166".`,
            '2.5.1',
          ),
        );
      }
      break;
    }

    case 'euLegislation': {
      if (blank(source.title)) {
        issues.push(
          error(
            'title',
            'EU legislation is cited by its full title, including the legislation number — "Council Regulation (EC) 1984/2003 concerning a system of statistical bottom trawl surveys".',
            '2.6.1',
          ),
        );
      }
      if (blank(source.ojYear)) {
        issues.push(
          error(
            'ojYear',
            'Give the year of the Official Journal citation. The OJ reference is what points a reader at the published text: [year] OJ series issue/first page.',
            '2.6.1',
          ),
        );
      }
      if (blank(source.ojSeries)) {
        issues.push(
          error(
            'ojSeries',
            'Give the OJ series: L for legislation, C for information and notices.',
            '2.6.1',
          ),
        );
      }
      if (blank(source.ojIssue)) {
        issues.push(
          error(
            'ojIssue',
            'Give the OJ issue number, which follows the series letter.',
            '2.6.1',
          ),
        );
      }
      if (blank(source.ojFirstPage)) {
        issues.push(
          error(
            'ojFirstPage',
            'Give the first page of the OJ citation — where the instrument starts in that issue.',
            '2.6.1',
          ),
        );
      }
      break;
    }

    case 'euCase': {
      if (blank(source.caseName)) {
        issues.push(
          error(
            'caseName',
            'An EU case needs its name. It follows the registration number, in italics, with no punctuation between the two.',
            '2.6.2',
          ),
        );
      }
      if (blank(source.caseNumber)) {
        issues.push(
          error(
            'caseNumber',
            'An EU case needs its registration number, e.g. "C-176/03". It comes first, in roman, before the name.',
            '2.6.2',
          ),
        );
      } else if (/^\d+\/\d+/.test(source.caseNumber.trim())) {
        issues.push(
          warning(
            'caseNumber',
            'Cases registered since 1989 carry a prefix: C- for the Court of Justice, T- for the General Court, F- for the Civil Service Tribunal. Only pre-1989 cases take none.',
            '2.6.2',
          ),
        );
      }
      issues.push(...reportIssues('report', source.report, '2.6.2'));
      issues.push(...fullStopIssues('report.abbreviation', source.report?.abbreviation));
      issues.push(...fullStopIssues('court', source.court));
      // 2.6.2: a case not yet reported gives the court and date instead.
      if (!source.report && blank(source.court) && blank(source.judgmentDate)) {
        issues.push(
          warning(
            'report',
            'Cite the official ECR report where there is one — ECJ cases in volume one (ECR I-), General Court cases in volume two (ECR II-); otherwise the CMLR, or, if the case is not yet reported, the court and date of judgment.',
            '2.6.2',
          ),
        );
      }
      break;
    }

    case 'bookChapter': {
      if (source.authors.length === 0) {
        issues.push(
          error(
            'authors',
            'A chapter needs its own author. The citation opens with the chapter’s author, and names the book’s editor after "in".',
            '3.2.3',
          ),
        );
      }
      if (blank(source.chapterTitle)) {
        issues.push(
          error(
            'chapterTitle',
            'A chapter needs its title, in single quotation marks and roman — the book’s title is the italicised one.',
            '3.2.3',
          ),
        );
      }
      if (source.editors.length === 0) {
        issues.push(
          error(
            'editors',
            'A chapter needs the edited book’s editor, cited after "in" and marked "(ed)" or "(eds)".',
            '3.2.3',
          ),
        );
      }
      if (blank(source.bookTitle)) {
        issues.push(
          error(
            'bookTitle',
            'A chapter needs the title of the book it appears in, which is given in italics.',
            '3.2.3',
          ),
        );
      }
      if (blank(source.publisher)) {
        issues.push(
          error(
            'publisher',
            'A chapter needs the publisher of the book it appears in, not of the chapter.',
            '3.2.3',
          ),
        );
      }
      if (blank(source.year)) {
        issues.push(
          error('year', 'A chapter needs the year the book was published.', '3.2.3'),
        );
      }
      break;
    }

    case 'ouModuleMaterial': {
      // Cite Them Right Harvard as the OU teaches it, not OSCOLA, so these
      // checks carry no OSCOLA section.
      if (blank(source.itemTitle)) {
        issues.push(
          error(
            'itemTitle',
            'Give the title of the item as the module website prints it, e.g. "Unit 4: Rules and regulations".',
          ),
        );
      }
      if (blank(source.moduleCode)) {
        issues.push(
          error(
            'moduleCode',
            'Give the module code, e.g. "W111". The code and module title stand in place of a publisher for module material.',
          ),
        );
      }
      if (blank(source.moduleTitle)) {
        issues.push(error('moduleTitle', 'Give the module title, as printed on the module website.'));
      }
      if (blank(source.year)) {
        issues.push(
          error('year', 'Give the year of publication, or leave it blank to cite "no date", which the OU\u2019s guide spells out rather than contracting.'),
        );
      }
      if (blank(source.url)) {
        issues.push(
          error('url', 'Give the address of the item on the module website, so the reference can be traced.'),
        );
      }
      if (blank(source.accessDate)) {
        issues.push(
          error(
            'accessDate',
            'Give the date you accessed the item. Module material changes between presentations, so the date fixes which version you read.',
          ),
        );
      }
      break;
    }

    case 'website': {
      if (blank(source.title)) {
        issues.push(
          error(
            'title',
            'A web page needs its title, in single quotation marks and roman.',
            '3.4.8',
          ),
        );
      }
      if (blank(source.url)) {
        issues.push(
          error(
            'url',
            'A web page needs its address, in angle brackets, since there is no volume or page to find it by.',
            '3.4.8',
          ),
        );
      } else {
        issues.push(...urlIssues(source.url));
      }
      if (blank(source.accessDate)) {
        issues.push(
          error(
            'accessDate',
            'A web page needs the date you accessed it, because the page may change or disappear after you cite it.',
            '3.1.4',
          ),
        );
      }
      if (source.authors.length === 0) {
        issues.push(
          warning(
            'authors',
            'No author, so the citation will begin with the title. Check the page really is unattributed — where no person is named, the organisation behind the site is often the author.',
            '3.4.8',
          ),
        );
      }
      break;
    }
  }

  return issues;
}
