/**
 * Structured source data for OSCOLA (4th edn) citation.
 *
 * Field names follow OSCOLA's own vocabulary rather than a generic
 * bibliographic schema, because the formatting rules are type-specific and
 * conditional (neutral citation vs law report, volume vs no volume, and so on).
 */

// ---------------------------------------------------------------------------
// Shared
// ---------------------------------------------------------------------------

/**
 * A personal author. Given names and surname are stored separately because the
 * bibliography inverts the name and reduces given names to initials, and no
 * reliable parse of "Ludwig van Beethoven" or "Mary Ann O'Brien" exists.
 */
export interface PersonAuthor {
  readonly kind: 'person';
  /** All given names, space separated, e.g. "Alison L". */
  readonly given: string;
  readonly surname: string;
}

/** A body corporate — a department, court, NGO. Never inverted or initialised. */
export interface CorporateAuthor {
  readonly kind: 'corporate';
  readonly name: string;
}

export type Author = PersonAuthor | CorporateAuthor;

export type AuthorRole = 'author' | 'editor';

/** One page or paragraph reference, optionally attributed to a judge. */
export interface PinpointReference {
  /** Verbatim: "165", "27", "43-47". */
  readonly locus: string;
  /**
   * The judge whose passage is cited, e.g. "Laws LJ" or "Lord Hope". OSCOLA
   * 2.1.7 adds it in brackets after the pinpoint, and forbids "per".
   */
  readonly judge?: string;
}

/**
 * A pinpoint reference. Pages and paragraphs are punctuated differently, so the
 * distinction has to survive into the formatter.
 *
 * `value` is the form a student types — one reference, or several separated by
 * commas. `references` is the structured form, needed only when passages are
 * attributed to different judges, and takes precedence when both are present.
 */
export interface Pinpoint {
  readonly kind: 'page' | 'paragraph';
  /** Verbatim, so ranges and lists work: "165", "14", "20-22", "720, 723". */
  readonly value?: string;
  /** Individually attributed references (OSCOLA 2.1.7). */
  readonly references?: readonly PinpointReference[];
}

/**
 * A date. ISO `YYYY-MM-DD` is rendered in OSCOLA style ("19 November 2009");
 * anything else is passed through verbatim so partial dates still work.
 */
export type OscolaDate = string;

// ---------------------------------------------------------------------------
// Source types
// ---------------------------------------------------------------------------

export type SourceType =
  | 'case'
  | 'act'
  | 'statutoryInstrument'
  | 'euLegislation'
  | 'euCase'
  | 'journalArticle'
  | 'book'
  | 'bookChapter'
  | 'website'
  | 'ouModuleMaterial';

/**
 * Which referencing style a source takes.
 *
 * The Open University's undergraduate law modules split sources in two: legal
 * sources take CTR OSCOLA in footnotes, general academic sources take CTR
 * Harvard in-text with a reference list at the end. The category is a property
 * of the source type, not of the mode.
 */
export type SourceCategory = 'legal' | 'academic';

/**
 * 'oscola' formats every source in OSCOLA. 'ou-dual' keeps legal sources in
 * OSCOLA and switches academic sources to Harvard.
 */
export type CitationMode = 'oscola' | 'ou-dual';

interface SourceBase {
  readonly id: string;
  readonly type: SourceType;
}

/**
 * A neutral citation, e.g. `[2008] UKHL 13` or `[2006] EWHC 407 (QB)`.
 * The year always takes square brackets, and may differ from the report year.
 */
export interface NeutralCitation {
  readonly year: string;
  /** Court abbreviation, e.g. "UKHL", "EWCA Civ", "EWHC". */
  readonly court: string;
  /** Judgment number within the court and year, e.g. "13". */
  readonly number: string;
  /** High Court division, rendered in brackets after the number, e.g. "QB". */
  readonly division?: string;
}

/** A citation to a law report series, e.g. `[2008] 1 AC 884`. */
export interface LawReport {
  readonly year: string;
  /**
   * Square brackets when the year identifies the volume (`[1996] AC 155`);
   * round when the volume is independently numbered (`(1965) 109 SJ 175`).
   * Not inferable from the other fields, so the student sets it.
   */
  readonly yearFormat: 'square' | 'round';
  readonly volume?: string;
  /** Report series abbreviation, e.g. "AC", "WLR", "All ER". */
  readonly abbreviation: string;
  readonly firstPage: string;
}

export interface CaseSource extends SourceBase {
  readonly type: 'case';
  /** Full case name including the parties and "v", e.g. "Corr v IBC Vehicles Ltd". */
  readonly caseName: string;
  readonly neutral?: NeutralCitation;
  readonly report?: LawReport;
  /**
   * Court abbreviation in round brackets, e.g. "HL". Given only where the court
   * is not already apparent from the neutral citation or the report series.
   */
  readonly court?: string;
  readonly pinpoint?: Pinpoint;
  /**
   * Date of judgment, for a case that is unreported and has no neutral
   * citation. OSCOLA 2.1.4 then gives the court and this date in brackets in
   * place of a report, with no need for the word "unreported".
   */
  readonly judgmentDate?: OscolaDate;
  /**
   * Short form for repeat citations, e.g. `Austin`. Derived from the case name
   * when absent — OSCOLA 2.1.2 requires the name that stands first, except in
   * judicial review, where the individual's name is used.
   */
  readonly shortName?: string;
}

export interface ActSource extends SourceBase {
  readonly type: 'act';
  /** Short title without the year, e.g. "Human Rights Act". */
  readonly shortTitle: string;
  readonly year: string;
  /** Provision, verbatim in OSCOLA form, e.g. "s 15(1)(b)", "sch 1, para 3". */
  readonly provision?: string;
  /**
   * Abbreviation for repeat citations, e.g. `HRA 1998` or `Working Time
   * Directive`. OSCOLA 1.2.1 gives legislation a short form rather than a
   * cross-citation, so without one the full citation is repeated.
   */
  readonly shortForm?: string;
}

export interface JournalArticleSource extends SourceBase {
  readonly type: 'journalArticle';
  readonly authors: readonly Author[];
  readonly title: string;
  readonly year: string;
  /**
   * Volume number. Its presence decides the year brackets: OSCOLA uses round
   * brackets where a volume exists and square where it does not.
   */
  readonly volume?: string;
  /** Given only where pagination restarts each issue. */
  readonly issue?: string;
  /** Journal abbreviation, e.g. "MLR", "PL". */
  readonly journal: string;
  readonly firstPage: string;
  readonly pinpoint?: Pinpoint;
  /**
   * Short form of the title for repeat citations, used where several works
   * by the same author are cited (OSCOLA 1.2.1).
   */
  readonly shortTitle?: string;
}

export interface BookSource extends SourceBase {
  readonly type: 'book';
  readonly authors: readonly Author[];
  readonly authorRole: AuthorRole;
  readonly title: string;
  /** Edition number as a bare numeral, e.g. "7". First editions are not cited. */
  readonly edition?: string;
  /** Year of original publication, for reprints and translations. */
  readonly firstPublished?: string;
  /**
   * OSCOLA 3.2.1's "additional information" slot, which precedes the edition:
   * an editor or translator of an authored work ("John Gardner ed", "Tony Weir
   * tr"), a series, or other clarifying detail. Emitted verbatim.
   */
  readonly additionalInfo?: string;
  readonly publisher: string;
  readonly year: string;
  /**
   * Place of publication. OSCOLA 4th edn omits it; retained on the type so the
   * field survives round-tripping, but the formatter does not emit it.
   */
  readonly place?: string;
  readonly pinpoint?: Pinpoint;
  /**
   * Short form of the title for repeat citations, used where several works
   * by the same author are cited (OSCOLA 1.2.1).
   */
  readonly shortTitle?: string;
}

export interface WebsiteSource extends SourceBase {
  readonly type: 'website';
  /** May be empty: an unattributed page starts with its title. */
  readonly authors: readonly Author[];
  readonly title: string;
  /** Site or publisher name, e.g. "Naked Law". */
  readonly siteName?: string;
  readonly publicationDate?: OscolaDate;
  readonly url: string;
  readonly accessDate: OscolaDate;
  /**
   * Short form of the title for repeat citations, used where several works
   * by the same author are cited (OSCOLA 1.2.1).
   */
  readonly shortTitle?: string;
}

/**
 * How the instrument is numbered.
 *
 * OSCOLA 2.5.1 gives modern statutory instruments an SI number, and their
 * predecessors — statutory rules and orders — an SR & O number in the same
 * form. 2.5.2 lets the Civil Procedure Rules and their predecessors be cited
 * "without reference to their SI number or year" at all.
 *
 * `undefined` means an ordinary SI. The default is left implicit so that a
 * library exported before this field existed still round-trips unchanged.
 */
export type SiNumbering = 'srAndO' | 'rulesOfCourt';

export interface StatutoryInstrumentSource extends SourceBase {
  readonly type: 'statutoryInstrument';
  /** Name and year, e.g. "Eggs and Chicks (England) Regulations 2009". */
  readonly name: string;
  readonly year: string;
  /** The SI number after the year, e.g. "2009/2163". */
  readonly siNumber: string;
  /** Omitted for an ordinary SI; see {@link SiNumbering}. */
  readonly numbering?: SiNumbering;
  /** Provision, e.g. "reg 7(2)". */
  readonly provision?: string;
  /**
   * Abbreviation for repeat citations, e.g. `HRA 1998` or `Working Time
   * Directive`. OSCOLA 1.2.1 gives legislation a short form rather than a
   * cross-citation, so without one the full citation is repeated.
   */
  readonly shortForm?: string;
}

export interface EuLegislationSource extends SourceBase {
  readonly type: 'euLegislation';
  /**
   * The full title as published, including the legislation type and number
   * where there is one, e.g. "Council Regulation (EC) 139/2004 on the control
   * of concentrations between undertakings (EC Merger Regulation)".
   */
  readonly title: string;
  /** Year of the Official Journal citation. */
  readonly ojYear: string;
  /** OJ series letter: L for legislation, C for information and notices. */
  readonly ojSeries: string;
  readonly ojIssue: string;
  readonly ojFirstPage: string;
  /** Pinpoint, e.g. "art 5" or "arts 2-4". */
  readonly pinpoint?: string;
  /**
   * Abbreviation for repeat citations, e.g. `HRA 1998` or `Working Time
   * Directive`. OSCOLA 1.2.1 gives legislation a short form rather than a
   * cross-citation, so without one the full citation is repeated.
   */
  readonly shortForm?: string;
}

export interface EuCaseSource extends SourceBase {
  readonly type: 'euCase';
  /** Registration number without the "Case" prefix, e.g. "C-176/03". */
  readonly caseNumber: string;
  /** Renders "Joined Cases" instead of "Case". */
  readonly joined?: boolean;
  readonly caseName: string;
  readonly report?: {
    readonly year: string;
    /** Report abbreviation, usually "ECR"; "CMLR" where no ECR exists. */
    readonly abbreviation: string;
    /** First page including the volume prefix, e.g. "I-7879". */
    readonly firstPage: string;
  };
  /** Pinpoint, e.g. "paras 47-48". */
  readonly pinpoint?: string;
  /**
   * Court, for a case not yet reported in the OJ, e.g. "CFI". OSCOLA 2.6.2
   * then gives the court and the date of judgment in brackets.
   */
  readonly court?: string;
  readonly judgmentDate?: OscolaDate;
}

export interface BookChapterSource extends SourceBase {
  readonly type: 'bookChapter';
  readonly authors: readonly Author[];
  readonly chapterTitle: string;
  readonly editors: readonly Author[];
  readonly bookTitle: string;
  readonly edition?: string;
  readonly publisher: string;
  readonly year: string;
  /** Page range of the chapter, e.g. "83-95". */
  readonly pages?: string;
  /**
   * Short form of the title for repeat citations, used where several works
   * by the same author are cited (OSCOLA 1.2.1).
   */
  readonly shortTitle?: string;
}

/**
 * An Open University module item: a study unit, a week, a reading. Harvard only
 * — there is no OSCOLA form, because OSCOLA has no equivalent source type.
 */
export interface OuModuleMaterialSource extends SourceBase {
  readonly type: 'ouModuleMaterial';
  /** Empty where the item is unattributed, which is the common case. */
  readonly authors: readonly Author[];
  readonly year: string;
  /** Title of the item itself, e.g. "Unit 4: Rules and regulations". */
  readonly itemTitle: string;
  /** Module code, e.g. "W111". */
  readonly moduleCode: string;
  readonly moduleTitle: string;
  /** VLE address. */
  readonly url: string;
  readonly accessDate: OscolaDate;
}

export type Source =
  | CaseSource
  | ActSource
  | StatutoryInstrumentSource
  | EuLegislationSource
  | EuCaseSource
  | JournalArticleSource
  | BookSource
  | BookChapterSource
  | WebsiteSource
  | OuModuleMaterialSource;

// ---------------------------------------------------------------------------
// Categories and labels
// ---------------------------------------------------------------------------

export const SOURCE_CATEGORY: Record<SourceType, SourceCategory> = {
  case: 'legal',
  act: 'legal',
  statutoryInstrument: 'legal',
  euLegislation: 'legal',
  euCase: 'legal',
  journalArticle: 'academic',
  book: 'academic',
  bookChapter: 'academic',
  website: 'academic',
  ouModuleMaterial: 'academic',
};

/**
 * OSCOLA bibliographies are split into separate tables. Recorded here so the
 * Phase 2 bibliography builder has the grouping already decided per type.
 */
export type BibliographySection = 'cases' | 'legislation' | 'secondary';

export const BIBLIOGRAPHY_SECTION: Record<SourceType, BibliographySection> = {
  case: 'cases',
  euCase: 'cases',
  act: 'legislation',
  statutoryInstrument: 'legislation',
  euLegislation: 'legislation',
  journalArticle: 'secondary',
  book: 'secondary',
  bookChapter: 'secondary',
  website: 'secondary',
  ouModuleMaterial: 'secondary',
};

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  case: 'Case',
  act: 'UK Act of Parliament',
  statutoryInstrument: 'Statutory instrument',
  euLegislation: 'EU legislation',
  euCase: 'EU case',
  journalArticle: 'Journal article',
  book: 'Book',
  bookChapter: 'Chapter in an edited book',
  website: 'Website',
  ouModuleMaterial: 'OU module material',
};

/** OU module material exists only in Harvard, so it is hidden in OSCOLA mode. */
export const HARVARD_ONLY_TYPES: readonly SourceType[] = ['ouModuleMaterial'];

export function typesForMode(mode: CitationMode): readonly SourceType[] {
  const all = Object.keys(SOURCE_TYPE_LABELS) as SourceType[];
  return mode === 'ou-dual' ? all : all.filter((t) => !HARVARD_ONLY_TYPES.includes(t));
}

/** Which style a source takes in a given mode. */
export function styleFor(type: SourceType, mode: CitationMode): 'oscola' | 'harvard' {
  if (mode === 'oscola') return 'oscola';
  return SOURCE_CATEGORY[type] === 'legal' ? 'oscola' : 'harvard';
}
