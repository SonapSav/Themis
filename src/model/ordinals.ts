/**
 * "7" -> "7th", "2" -> "2nd". Input that already carries a suffix, or that is
 * not a bare numeral, is returned unchanged.
 */
export function ordinal(value: string): string {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return trimmed;
  const n = Number(trimmed);
  const lastTwo = n % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

/**
 * OSCOLA cites an edition only where it is not the first, so "1" and an empty
 * value both render nothing.
 */
export function formatEdition(edition: string | undefined): string {
  const trimmed = edition?.trim();
  if (!trimmed || trimmed === '1' || trimmed === '1st') return '';
  return `${ordinal(trimmed)} edn`;
}
