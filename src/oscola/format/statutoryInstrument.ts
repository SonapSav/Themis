import { segments, type FormattedCitation } from '../../model/segments';
import type { StatutoryInstrumentSource } from '../../model/types';

/**
 * OSCOLA 2.5.1: "give the name, year and (after a comma) the SI number".
 * `Penalties for Disorderly Behaviour (Amendment of Minimum Age) Order 2004,
 * SI 2004/3166`
 */
function body(source: StatutoryInstrumentSource): string {
  const title = [source.name.trim(), source.year.trim()].filter(Boolean).join(' ');
  const si = source.siNumber.trim();
  return si ? `${title}, SI ${si}` : title;
}

export function formatStatutoryInstrumentFootnote(
  source: StatutoryInstrumentSource,
  options: { announceShortForm?: boolean } = {},
): FormattedCitation {
  // 2.5.3: parts follow the same rules as parts of statutes, including 2.4.1's
  // treatment of an announced short form.
  const provision = source.provision?.trim();
  const shortForm = options.announceShortForm ? source.shortForm?.trim() : undefined;
  return segments(
    body(source),
    shortForm && ` (${shortForm})`,
    provision && (shortForm ? ` ${provision}` : `, ${provision}`),
    '.',
  );
}

/** Table of legislation entry: SIs are listed after the statutes (1.6.3). */
export function formatStatutoryInstrumentBibliography(
  source: StatutoryInstrumentSource,
): FormattedCitation {
  return segments(body(source));
}
