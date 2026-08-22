const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Render a date OSCOLA-style: "19 November 2009", no ordinal suffix and no
 * comma. ISO `YYYY-MM-DD` input is converted; anything else (a partial date, a
 * "n.d.", a hand-typed date) is passed through untouched so the student is
 * never silently overridden.
 */
export function formatDayMonthYear(value: string | undefined): string {
  if (!value) return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return value.trim();
  const [, year, month, day] = match;
  const monthName = MONTHS[Number(month) - 1];
  if (!monthName) return value.trim();
  return `${Number(day)} ${monthName} ${year}`;
}
