import { segments, type FormattedCitation } from '../../model/segments';
import type { ActSource } from '../../model/types';

/** `Human Rights Act 1998` — no italics, no comma before the year. */
function title(source: ActSource): string {
  return [source.shortTitle.trim(), source.year.trim()].filter(Boolean).join(' ');
}

/**
 * `Human Rights Act 1998, s 15(1)(b)`.
 *
 * With `announceShortForm`, the abbreviation to be used later is given in
 * brackets, and the provision then follows without a comma — OSCOLA 2.4.1:
 * `Nuclear Installations Act 1965 (NIA 1965) s 7(1)`.
 */
export function formatActFootnote(
  source: ActSource,
  options: { announceShortForm?: boolean } = {},
): FormattedCitation {
  const provision = source.provision?.trim();
  const shortForm = options.announceShortForm ? source.shortForm?.trim() : undefined;
  return segments(
    title(source),
    shortForm && ` (${shortForm})`,
    provision && (shortForm ? ` ${provision}` : `, ${provision}`),
    '.',
  );
}

/**
 * Table of legislation entry: the Act alone. A provision is a pinpoint for one
 * particular footnote, not part of the Act's identity, so it is dropped here.
 */
export function formatActBibliography(source: ActSource): FormattedCitation {
  return segments(title(source));
}
