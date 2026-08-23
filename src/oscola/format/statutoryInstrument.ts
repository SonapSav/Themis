import { segments, type FormattedCitation } from '../../model/segments';
import type { StatutoryInstrumentSource } from '../../model/types';

/**
 * OSCOLA 2.5.1: "give the name, year and (after a comma) the SI number".
 * `Penalties for Disorderly Behaviour (Amendment of Minimum Age) Order 2004,
 * SI 2004/3166`
 *
 * The same section cites the older statutory rules and orders "by their title
 * and SR & O number": `Hollow-ware and Galvanising Welfare Order 1921, SR & O
 * 1921/2032`. Only the label differs.
 *
 * 2.5.2: the CPR, RSC and CCR "may be cited without reference to their SI
 * number or year", so the name stands alone — `CPR 7`.
 */
function body(source: StatutoryInstrumentSource): string {
  const name = source.name.trim();
  if (source.numbering === 'rulesOfCourt') return name;
  const title = [name, source.year.trim()].filter(Boolean).join(' ');
  const si = source.siNumber.trim();
  const label = source.numbering === 'srAndO' ? 'SR & O' : 'SI';
  return si ? `${title}, ${label} ${si}` : title;
}

export function formatStatutoryInstrumentFootnote(
  source: StatutoryInstrumentSource,
  options: { announceShortForm?: boolean } = {},
): FormattedCitation {
  // 2.5.3: parts follow the same rules as parts of statutes, including 2.4.1's
  // treatment of an announced short form. The one departure is the rules of
  // court, which take "no comma before the pinpoint" — `CPR 5.2(1)(b)`.
  const provision = source.provision?.trim();
  const shortForm = options.announceShortForm ? source.shortForm?.trim() : undefined;
  const spaced = Boolean(shortForm) || source.numbering === 'rulesOfCourt';
  return segments(
    body(source),
    shortForm && ` (${shortForm})`,
    provision && (spaced ? ` ${provision}` : `, ${provision}`),
    '.',
  );
}

/** Table of legislation entry: SIs are listed after the statutes (1.6.3). */
export function formatStatutoryInstrumentBibliography(
  source: StatutoryInstrumentSource,
): FormattedCitation {
  return segments(body(source));
}
