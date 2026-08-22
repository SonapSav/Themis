import { toHtml, toPlainText, type FormattedCitation } from './model/segments';

/**
 * Copy text to the clipboard, offering an HTML flavour where one is given.
 *
 * This matters for correctness, not polish: OSCOLA italicises case names
 * (2.1.1) and book titles (3.1.2), and a plain-text copy silently drops them,
 * so the citation arrives in Word wrong.
 */
export async function copyToClipboard(plain: string, html?: string): Promise<void> {
  const clipboard = navigator.clipboard;
  if (!clipboard) throw new Error('Clipboard unavailable');

  if (html && typeof ClipboardItem !== 'undefined' && typeof clipboard.write === 'function') {
    try {
      await clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([plain], { type: 'text/plain' }),
        }),
      ]);
      return;
    } catch {
      // Some browsers refuse the richer form; the plain text below still works.
    }
  }
  await clipboard.writeText(plain);
}

/** One citation, as an inline fragment to paste into a footnote. */
export const citationHtml = (citation: FormattedCitation): string => toHtml(citation);

/** Several citations, one paragraph each, for pasting a whole list. */
export const listHtml = (citations: readonly FormattedCitation[]): string =>
  citations.map((c) => `<p>${toHtml(c)}</p>`).join('\n');

export const listText = (citations: readonly FormattedCitation[]): string =>
  citations.map(toPlainText).join('\n');
