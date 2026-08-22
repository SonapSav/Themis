import type { FormattedCitation } from '../../model/segments';
import type { Source } from '../../model/types';

/**
 * OSCOLA has no equivalent of an OU module item, so there is no OSCOLA form to
 * fall back on. Callers reach it through the mode-aware dispatcher, which never
 * routes this type here.
 */
const NO_OSCOLA_FORM =
  'OU module material has no OSCOLA form — it is cited in Harvard. Use formatReference or formatInTextCitation.';

import { formatCaseBibliography, formatCaseFootnote } from './case';
import { formatActBibliography, formatActFootnote } from './act';
import {
  formatStatutoryInstrumentBibliography,
  formatStatutoryInstrumentFootnote,
} from './statutoryInstrument';
import {
  formatEuLegislationBibliography,
  formatEuLegislationFootnote,
} from './euLegislation';
import { formatEuCaseBibliography, formatEuCaseFootnote } from './euCase';
import {
  formatJournalArticleBibliography,
  formatJournalArticleFootnote,
} from './journalArticle';
import { formatBookBibliography, formatBookFootnote } from './book';
import { formatBookChapterBibliography, formatBookChapterFootnote } from './bookChapter';
import { formatWebsiteBibliography, formatWebsiteFootnote } from './website';

export interface FootnoteOptions {
  /**
   * Give the source's short form in brackets, so later footnotes can use it.
   * Only legislation has one (OSCOLA 1.2.1).
   */
  readonly announceShortForm?: boolean;
}

/** The full first-instance footnote for a source, closed with a full stop. */
export function formatFootnote(
  source: Source,
  options: FootnoteOptions = {},
): FormattedCitation {
  switch (source.type) {
    case 'case': return formatCaseFootnote(source);
    case 'act': return formatActFootnote(source, options);
    case 'statutoryInstrument': return formatStatutoryInstrumentFootnote(source, options);
    case 'euLegislation': return formatEuLegislationFootnote(source, options);
    case 'euCase': return formatEuCaseFootnote(source);
    case 'journalArticle': return formatJournalArticleFootnote(source);
    case 'book': return formatBookFootnote(source);
    case 'bookChapter': return formatBookChapterFootnote(source);
    case 'website': return formatWebsiteFootnote(source);
    case 'ouModuleMaterial': throw new Error(NO_OSCOLA_FORM);
  }
}

/**
 * The bibliography (or table of cases / legislation) entry: authors inverted,
 * pinpoints dropped, and no closing full stop.
 */
export function formatBibliography(
  source: Source,
  /** Replaces the computed author clause — see OSCOLA 1.7's repeat-author em-dash. */
  authorPrefix?: string,
): FormattedCitation {
  switch (source.type) {
    case 'case': return formatCaseBibliography(source);
    case 'act': return formatActBibliography(source);
    case 'statutoryInstrument': return formatStatutoryInstrumentBibliography(source);
    case 'euLegislation': return formatEuLegislationBibliography(source);
    case 'euCase': return formatEuCaseBibliography(source);
    case 'journalArticle': return formatJournalArticleBibliography(source, authorPrefix);
    case 'book': return formatBookBibliography(source, authorPrefix);
    case 'bookChapter': return formatBookChapterBibliography(source, authorPrefix);
    case 'website': return formatWebsiteBibliography(source, authorPrefix);
    case 'ouModuleMaterial': throw new Error(NO_OSCOLA_FORM);
  }
}

export * from './case';
export * from './nameInText';
export * from './act';
export * from './statutoryInstrument';
export * from './euLegislation';
export * from './euCase';
export * from './journalArticle';
export * from './book';
export * from './bookChapter';
export * from './website';
