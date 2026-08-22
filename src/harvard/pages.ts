/**
 * Cite Them Right page references: "p." for a single page, "pp." for a range
 * or a list — `(Harris, 2015, p. 5)`, `(Clarke, 2001, pp. 98-99)`.
 *
 * Ranges are set with an en dash, as the guide prints them.
 */
export function formatPages(value: string | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) return '';
  const normalised = trimmed.replace(/\s*-\s*/g, '–');
  const multiple = /[–,]/.test(normalised);
  // Respect a prefix the student has already typed.
  if (/^pp?\./i.test(normalised)) return normalised;
  return `${multiple ? 'pp.' : 'p.'} ${normalised}`;
}
