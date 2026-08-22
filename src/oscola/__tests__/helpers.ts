import { formatBibliography, formatFootnote } from '../format';
import { toPlainText } from '../../model/segments';
import type { Source } from '../../model/types';
import type { PersonAuthor } from '../../model/types';

/** Footnote as plain text, so assertions read like the OSCOLA guide's examples. */
export const footnote = (source: Source): string => toPlainText(formatFootnote(source));

/** Bibliography entry as plain text. */
export const bibliography = (source: Source): string =>
  toPlainText(formatBibliography(source));

export const person = (given: string, surname: string): PersonAuthor => ({
  kind: 'person',
  given,
  surname,
});
