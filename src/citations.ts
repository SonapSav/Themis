/**
 * Mode-aware entry point.
 *
 * In `oscola` mode every source is formatted in OSCOLA. In `ou-dual` mode —
 * the Open University's undergraduate law scheme — legal sources stay in
 * OSCOLA footnotes and general academic sources switch to Cite Them Right
 * Harvard, cited in the text with a reference list at the end.
 */
import type { FormattedCitation } from './model/segments';
import {
  SOURCE_CATEGORY,
  styleFor,
  type CitationMode,
  type Source,
} from './model/types';
import { formatBibliography, formatFootnote, nameInTextForm, type NameInTextForm } from './oscola';
import {
  formatInTextCitation,
  formatReference,
  isHarvardSource,
  type InTextOptions,
} from './harvard';

export interface OscolaOutput {
  readonly style: 'oscola';
  readonly footnote: FormattedCitation;
  /**
   * Table of cases / legislation or bibliography entry. Absent for legal
   * sources in OU dual mode: there, legal sources appear only in footnotes and
   * the end-of-essay list is the Harvard reference list alone.
   */
  readonly bibliography?: FormattedCitation;
  readonly nameInText: NameInTextForm;
}

export interface HarvardOutput {
  readonly style: 'harvard';
  /** `(Bell, 2014)` — counts towards an OU word limit. */
  readonly inText: FormattedCitation;
  /** `Bell (2014)` — the narrative alternative. */
  readonly inTextNarrative: FormattedCitation;
  /** The reference list entry, which does not count towards the word limit. */
  readonly reference: FormattedCitation;
}

export type CitationOutput = OscolaOutput | HarvardOutput;

/** A page pinpoint already held on the source, for the in-text citation. */
function pagesFor(source: Source): string | undefined {
  if (source.type === 'book' || source.type === 'journalArticle') {
    return source.pinpoint?.value;
  }
  return undefined;
}

export function formatSource(
  source: Source,
  mode: CitationMode,
  options: InTextOptions = {},
): CitationOutput {
  if (styleFor(source.type, mode) === 'harvard' && isHarvardSource(source)) {
    const pages = options.pages ?? pagesFor(source);
    return {
      style: 'harvard',
      inText: formatInTextCitation(source, { ...options, pages, form: 'parenthetical' }),
      inTextNarrative: formatInTextCitation(source, { ...options, pages, form: 'narrative' }),
      reference: formatReference(source),
    };
  }

  const legalInDualMode = mode === 'ou-dual' && SOURCE_CATEGORY[source.type] === 'legal';
  return {
    style: 'oscola',
    footnote: formatFootnote(source),
    bibliography: legalInDualMode ? undefined : formatBibliography(source),
    nameInText: nameInTextForm(source),
  };
}

export * from './model';
export * from './oscola';
export * from './harvard';
