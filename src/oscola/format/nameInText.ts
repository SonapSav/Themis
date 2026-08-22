import { segments, type FormattedCitation } from '../../model/segments';
import type {
  ActSource,
  EuLegislationSource,
  Source,
  StatutoryInstrumentSource,
} from '../../model/types';
import { formatCaseFootnoteNamedInText } from './case';

/**
 * What changes when the source is named in the surrounding prose.
 *
 * OSCOLA is a footnote style — 1.1 is explicit that it "does not use endnotes
 * or in-text citations, such as '(Brown, 2007)'". So this is not an inline
 * citation. It is the guide's own guidance on how a footnote shortens, or
 * becomes unnecessary, when the text already names the source.
 */
export interface NameInTextForm {
  /** The footnote to use instead, where it differs from the full one. */
  readonly footnote?: FormattedCitation;
  /** The prose form for the text itself, where OSCOLA gives a distinct one. */
  readonly inText?: FormattedCitation;
  /** Whether a footnote is needed at all. */
  readonly footnoteRequired: boolean;
  /** One sentence explaining the rule, citing its section. */
  readonly note: string;
}

/** OSCOLA 2.4.2 and 2.5.3: full words in the text, abbreviations in footnotes. */
const PROVISION_WORDS: Record<string, string> = {
  pt: 'part', pts: 'parts',
  s: 'section', ss: 'sections',
  'sub-s': 'subsection', 'sub-ss': 'subsections',
  para: 'paragraph', paras: 'paragraphs',
  subpara: 'subparagraph', subparas: 'subparagraphs',
  sch: 'schedule', schs: 'schedules',
  reg: 'regulation', regs: 'regulations',
  r: 'rule', rr: 'rules',
  art: 'article', arts: 'articles',
};

/**
 * `s 5(1)(a)` -> `section 5(1)(a)`. An unrecognised abbreviation is left alone
 * rather than guessed at, so the student sees their own text either way.
 */
function expandProvision(provision: string): string | undefined {
  const match = /^([A-Za-z-]+)\s+(.+)$/.exec(provision.trim());
  if (!match) return undefined;
  const word = PROVISION_WORDS[match[1]!.toLowerCase()];
  return word ? `${word} ${match[2]}` : undefined;
}

type LegislationSource = ActSource | StatutoryInstrumentSource | EuLegislationSource;

function legislationTitle(source: LegislationSource): string {
  if (source.type === 'euLegislation') return source.title.trim();
  const name = source.type === 'act' ? source.shortTitle : source.name;
  return [name.trim(), source.year.trim()].filter(Boolean).join(' ');
}

/** EU legislation calls its pinpoint `pinpoint`; UK legislation, `provision`. */
function provisionOf(source: LegislationSource): string | undefined {
  return source.type === 'euLegislation' ? source.pinpoint : source.provision;
}

function actInText(source: LegislationSource): FormattedCitation | undefined {
  const provision = provisionOf(source)?.trim();
  if (!provision) return undefined;
  const expanded = expandProvision(provision);
  if (!expanded) return undefined;
  return segments(`${expanded} of the ${legislationTitle(source)}`);
}

export function nameInTextForm(source: Source): NameInTextForm {
  switch (source.type) {
    case 'case':
      return {
        footnote: formatCaseFootnoteNamedInText(source),
        footnoteRequired: true,
        note:
          'OSCOLA 1.1.1: where the name of the case is given in the text, it is not repeated in the footnote.',
      };

    case 'act':
    case 'statutoryInstrument':
    case 'euLegislation':
      return {
        inText: actInText(source),
        footnoteRequired: false,
        note:
          'OSCOLA 1.1.2: no footnote is required where the text already gives everything the reader needs — ' +
          'the name of the Act and, if relevant, the section. OSCOLA 2.4.2: use the full word in the text, the abbreviation in footnotes.',
      };

    // 1.1.1 states the rule for case names. It is not extended to EU cases
    // here, because their citation leads with a registration number and the
    // guide gives no shortened example.
    case 'euCase':
      return {
        footnoteRequired: true,
        note:
          'OSCOLA 1.1.1 is stated for case names. Thetis does not extend it to EU cases, whose citation leads with the registration number.',
      };

    case 'ouModuleMaterial':
      return {
        footnoteRequired: false,
        note:
          'OU module material is cited in Harvard, in the text, not in an OSCOLA footnote.',
      };

    case 'journalArticle':
    case 'book':
    case 'bookChapter':
    case 'website':
      return {
        footnoteRequired: true,
        note:
          'OSCOLA 1.1.3: a secondary source is always cited in a footnote, in full, even where the text names the author or work. ' +
          'Shortened repeat citations come later, at the second citation onwards.',
      };
  }
}
