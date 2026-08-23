import type { NeutralCitation, Source } from '../model/types';
import { COURT_CODES, DIVISIONS_BY_CODE, codeByLooseMatch } from './courts';

export type IssueSeverity = 'error' | 'warning';

export interface ValidationIssue {
  readonly severity: IssueSeverity;
  /** The source field the issue concerns, for highlighting in the form. */
  readonly field: string;
  readonly message: string;
}

const error = (field: string, message: string): ValidationIssue => ({
  severity: 'error',
  field,
  message,
});

const warning = (field: string, message: string): ValidationIssue => ({
  severity: 'warning',
  field,
  message,
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
      `OSCOLA abbreviations take no full stops (4.2.1), so "${trimmed}" would normally be "${trimmed.replace(/\./g, '')}".`,
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
          ? `Court codes are capitalised as in OSCOLA 4.1: "${loose}", not "${code}".`
          : `"${code}" is not in OSCOLA 4.1's list of neutral citation courts. Check it, or ignore this if the court postdates the 4th edition.`,
      ),
    );
    return issues;
  }

  const divisions = DIVISIONS_BY_CODE.get(code) ?? [];
  if (divisions.length > 0 && !division) {
    issues.push(
      warning(
        `${field}.division`,
        `${code} citations carry a division in brackets (2.1.3): ${divisions.join(', ')}.`,
      ),
    );
  } else if (divisions.length > 0 && division && !divisions.includes(division)) {
    issues.push(
      warning(
        `${field}.division`,
        `OSCOLA 4.1 lists ${divisions.join(', ')} for ${code}, not "${division}".`,
      ),
    );
  } else if (divisions.length === 0 && division) {
    issues.push(
      warning(`${field}.division`, `${code} citations take no division in brackets (4.1).`),
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
    return [warning('url', 'OSCOLA omits "http://" where the address begins with "www".')];
  }
  if (!/^https?:\/\//i.test(trimmed) && !/^www\./i.test(trimmed)) {
    return [warning('url', 'Addresses that do not begin with "www" are cited with "http://" or "https://".')];
  }
  return [];
}

/**
 * Check a source for missing or questionable data.
 *
 * `error` means the citation cannot be correct as it stands; `warning` means it
 * will render but departs from OSCOLA's preference. The point is to surface
 * silent citation errors, which are worse for a student than no tool at all.
 */
export function validate(source: Source): readonly ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  switch (source.type) {
    case 'case': {
      if (blank(source.caseName)) issues.push(error('caseName', 'A case needs a case name.'));
      else if (!/\bv\b/.test(source.caseName)) {
        issues.push(
          warning('caseName', 'Case names normally join the parties with "v" and no full stop.'),
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
              'A case needs a neutral citation, a law report, or — if unreported — the court and the date of judgment.',
            ),
          );
        } else if (blank(source.court)) {
          issues.push(error('court', 'An unreported case needs the court that decided it.'));
        }
      }
      if (source.report) {
        if (blank(source.report.abbreviation)) {
          issues.push(error('report.abbreviation', 'The law report needs a series abbreviation, e.g. "AC".'));
        }
        if (blank(source.report.firstPage)) {
          issues.push(error('report.firstPage', 'The law report needs the first page of the report.'));
        }
      }
      if (source.neutral && blank(source.neutral.number)) {
        issues.push(error('neutral.number', 'A neutral citation needs a judgment number.'));
      }
      // Neutral citations were introduced in 2001; a later case that has none is
      // usually an omission rather than a genuine absence.
      const year = Number(
        source.neutral?.year ?? source.report?.year ?? source.judgmentDate?.slice(0, 4),
      );
      if (!source.neutral && Number.isFinite(year) && year >= 2001) {
        issues.push(
          warning('neutral', 'Cases from 2001 onwards normally have a neutral citation; cite it first.'),
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
          warning('court', 'Give the court in brackets where it is not apparent from the report series.'),
        );
      }
      if (source.neutral && !blank(source.court)) {
        issues.push(
          warning(
            'court',
            'The neutral citation already identifies the court, so the court in brackets is not cited and has been left out.',
          ),
        );
      }
      for (const further of source.furtherNeutrals ?? []) {
        if (blank(further.number)) {
          issues.push(error('neutral2.number', 'A neutral citation needs a judgment number.'));
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
          issues.push(error('history.neutral.number', 'A neutral citation needs a judgment number.'));
        }
        if ((disposition || subNom) && !neutral && !report) {
          issues.push(
            warning(
              // A real field key, so the message lands on a field and can open
              // the folded group it belongs to, not only in the Checks panel.
              'history.report.abbreviation',
              'Give the citation the later stage is reported at — "affd" and "sub nom" introduce a citation rather than standing alone.',
            ),
          );
        }
        if (subNom && blank(caseName)) {
          issues.push(
            warning(
              'history.caseName',
              '"Sub nom" introduces the name the case is reported under, so give that name.',
            ),
          );
        }
        if (neutral && !blank(court)) {
          issues.push(
            warning(
              'history.court',
              'The later neutral citation already identifies the court, so it has been left out.',
            ),
          );
        }
      }
      break;
    }

    case 'act': {
      if (blank(source.shortTitle)) issues.push(error('shortTitle', 'An Act needs a short title.'));
      if (blank(source.year)) issues.push(error('year', 'An Act needs its year.'));
      if (/\b(1\d{3}|2\d{3})\s*$/.test(source.shortTitle)) {
        issues.push(
          warning('shortTitle', 'Enter the short title without the year — the year has its own field.'),
        );
      }
      break;
    }

    case 'journalArticle': {
      if (source.authors.length === 0) issues.push(error('authors', 'A journal article needs an author.'));
      // 3.3.2: an untitled case note carries the case name in the title's place,
      // so one of the two is required, not both.
      if (blank(source.title) && blank(source.caseName)) {
        issues.push(
          error(
            'title',
            source.isCaseNote
              ? 'A case note needs its own title, or the name of the case it discusses.'
              : 'A journal article needs a title.',
          ),
        );
      }
      if (!blank(source.title) && !blank(source.caseName)) {
        issues.push(
          warning('caseName', 'A case note with its own title is cited as an ordinary article, so the case name has been left out.'),
        );
      }
      if (blank(source.journal)) issues.push(error('journal', 'A journal article needs the journal abbreviation, e.g. "MLR".'));
      issues.push(...fullStopIssues('journal', source.journal));
      if (blank(source.year)) issues.push(error('year', 'A journal article needs a year.'));
      // 3.3.4: online journals "may lack some of the publication elements (for
      // example, many do not include page numbers)"; 3.3.3 says to omit an
      // unknown page from a forthcoming article. Neither is an error.
      const pageOptional = !blank(source.url) || source.forthcoming === true;
      if (blank(source.firstPage) && !pageOptional) {
        issues.push(error('firstPage', 'A journal article needs its first page.'));
      }
      if (blank(source.volume) && source.forthcoming !== true) {
        issues.push(
          warning('volume', 'No volume number, so the year will be cited in square brackets. Check the journal has no volumes.'),
        );
      }
      if (!blank(source.url)) {
        issues.push(...urlIssues(source.url!));
        if (blank(source.accessDate)) {
          issues.push(error('accessDate', 'An online article needs the date you last accessed it.'));
        }
      } else if (!blank(source.accessDate)) {
        issues.push(
          warning('accessDate', 'The access date is only cited alongside a web address, so it has been left out.'),
        );
      }
      break;
    }

    case 'book': {
      if (source.authors.length === 0) issues.push(error('authors', 'A book needs an author or editor.'));
      if (blank(source.title)) issues.push(error('title', 'A book needs a title.'));
      if (blank(source.publisher)) issues.push(error('publisher', 'A book needs a publisher.'));
      if (blank(source.year)) issues.push(error('year', 'A book needs a year of publication.'));
      if (!blank(source.place)) {
        issues.push(
          warning('place', 'OSCOLA 4th edn omits the place of publication, so it will not appear in the citation.'),
        );
      }
      // 3.2.1's placing rule only bites where there is a volume to place.
      if (source.volumesVary && blank(source.volume)) {
        issues.push(
          warning('volume', 'The volume position only applies to a work with a volume number, so give one or leave the position alone.'),
        );
      }
      break;
    }

    case 'statutoryInstrument': {
      // 2.5.2: the CPR, RSC and CCR are cited by name alone, so the year and
      // the number are not merely optional — they are not part of the citation.
      if (source.numbering === 'rulesOfCourt') {
        if (blank(source.name)) {
          issues.push(error('name', 'Give the rules, e.g. "CPR", "RSC", "CCR", or "6A PD" for a practice direction.'));
        }
        if (!blank(source.year) || !blank(source.siNumber)) {
          issues.push(
            warning(
              'siNumber',
              'The rules of court are cited without their year or SI number, so neither has been included.',
            ),
          );
        }
        // 2.5.3: "in the case of the Civil Procedure Rules, omit the
        // abbreviations 'r' and 'rr'". Stated for the CPR alone — the RSC and
        // CCR examples keep theirs, as in `RSC Ord 24, r 14A`.
        if (/^CPR\b/i.test(source.name.trim()) && /^rr?\b\.?/i.test(source.provision?.trim() ?? '')) {
          issues.push(
            warning('provision', 'CPR pinpoints omit "r" and "rr": write "5.2(1)(b)", not "r 5.2(1)(b)".'),
          );
        }
        break;
      }

      const label = source.numbering === 'srAndO' ? 'SR & O' : 'SI';
      if (blank(source.name)) issues.push(error('name', 'A statutory instrument needs its name.'));
      if (blank(source.year)) issues.push(error('year', 'A statutory instrument needs its year.'));
      if (blank(source.siNumber)) {
        issues.push(error('siNumber', `A statutory instrument needs its ${label} number, e.g. "2004/3166".`));
      } else if (!/^\d{4}\/\d+$/.test(source.siNumber.trim())) {
        issues.push(warning('siNumber', `${label} numbers take the form year/number, e.g. "2004/3166".`));
      }
      break;
    }

    case 'euLegislation': {
      if (blank(source.title)) issues.push(error('title', 'EU legislation needs its full title.'));
      if (blank(source.ojYear)) issues.push(error('ojYear', 'Give the year of the Official Journal citation.'));
      if (blank(source.ojSeries)) {
        issues.push(error('ojSeries', 'Give the OJ series: L for legislation, C for information and notices.'));
      }
      if (blank(source.ojIssue)) issues.push(error('ojIssue', 'Give the OJ issue number.'));
      if (blank(source.ojFirstPage)) issues.push(error('ojFirstPage', 'Give the first page of the OJ citation.'));
      break;
    }

    case 'euCase': {
      if (blank(source.caseName)) issues.push(error('caseName', 'An EU case needs a case name.'));
      if (blank(source.caseNumber)) {
        issues.push(error('caseNumber', 'An EU case needs its registration number, e.g. "C-176/03".'));
      }
      issues.push(...fullStopIssues('report.abbreviation', source.report?.abbreviation));
      issues.push(...fullStopIssues('court', source.court));
      // 2.6.2: a case not yet reported gives the court and date instead.
      if (!source.report && blank(source.court) && blank(source.judgmentDate)) {
        issues.push(
          warning('report', 'Cite the official ECR report where there is one; otherwise the CMLR, or — if not yet reported — the court and date of judgment.'),
        );
      }
      break;
    }

    case 'bookChapter': {
      if (source.authors.length === 0) issues.push(error('authors', 'A chapter needs its own author.'));
      if (blank(source.chapterTitle)) issues.push(error('chapterTitle', 'A chapter needs a title.'));
      if (source.editors.length === 0) issues.push(error('editors', "A chapter needs the edited book's editor."));
      if (blank(source.bookTitle)) issues.push(error('bookTitle', 'A chapter needs the title of the book it is in.'));
      if (blank(source.publisher)) issues.push(error('publisher', 'A chapter needs the publisher of the book.'));
      if (blank(source.year)) issues.push(error('year', 'A chapter needs the year of the book.'));
      break;
    }

    case 'ouModuleMaterial': {
      if (blank(source.itemTitle)) issues.push(error('itemTitle', 'Give the title of the item, e.g. "Unit 4: Rules and regulations".'));
      if (blank(source.moduleCode)) issues.push(error('moduleCode', 'Give the module code, e.g. "W111".'));
      if (blank(source.moduleTitle)) issues.push(error('moduleTitle', 'Give the module title.'));
      if (blank(source.year)) issues.push(error('year', 'Give the year of publication, or leave blank to cite "n.d.".'));
      if (blank(source.url)) issues.push(error('url', 'Give the address of the item on the module website.'));
      if (blank(source.accessDate)) issues.push(error('accessDate', 'Give the date you accessed the item.'));
      break;
    }

    case 'website': {
      if (blank(source.title)) issues.push(error('title', 'A web page needs a title.'));
      if (blank(source.url)) issues.push(error('url', 'A web page needs a URL.'));
      else issues.push(...urlIssues(source.url));
      if (blank(source.accessDate)) issues.push(error('accessDate', 'A web page needs the date you accessed it.'));
      if (source.authors.length === 0) {
        issues.push(
          warning('authors', 'No author, so the citation will begin with the title. Check the page really is unattributed.'),
        );
      }
      break;
    }
  }

  return issues;
}
