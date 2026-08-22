import type { Pinpoint, PinpointReference } from './types';

/**
 * The references a pinpoint holds, whether given structurally or as the
 * comma-separated string a student types.
 */
export function pinpointReferences(pinpoint: Pinpoint): readonly PinpointReference[] {
  if (pinpoint.references?.length) return pinpoint.references;
  return (pinpoint.value ?? '')
    .split(/\s*,\s*/)
    .map((locus) => locus.trim())
    .filter(Boolean)
    .map((locus) => ({ locus }));
}

/**
 * A single paragraph reference, bracketed. Both ends of a range are bracketed
 * individually and joined with an en dash: "1-37" gives "[1]–[37]" (OSCOLA 2.1.6).
 */
function bracketParagraph(locus: string): string {
  return locus
    .split(/\s*[-–]\s*/)
    .filter(Boolean)
    .map((part) => (part.startsWith('[') ? part : `[${part}]`))
    .join('–');
}

/** Every paragraph number bracketed, whether alone, in a range or in a list. */
export function bracketParagraphs(value: string): string {
  return value
    .split(/\s*,\s*/)
    .filter(Boolean)
    .map(bracketParagraph)
    .join(', ');
}

/**
 * The rendered pinpoint: paragraph numbers bracketed, each reference followed
 * by its judge in brackets where one is given, several separated by commas —
 * `[34] (Lord Hope), [39] (Lord Scott)` (OSCOLA 2.1.6, 2.1.7).
 */
export function renderPinpoint(pinpoint: Pinpoint): string {
  return pinpointReferences(pinpoint)
    .map(({ locus, judge }) => {
      const rendered = pinpoint.kind === 'paragraph' ? bracketParagraph(locus) : locus;
      const attributed = judge?.trim();
      return attributed ? `${rendered} (${attributed})` : rendered;
    })
    .filter(Boolean)
    .join(', ');
}

/**
 * Build a pinpoint from the form a student types, plus an optional judge.
 *
 * A single judge is taken to attribute the whole pinpoint, so it attaches to
 * the last reference: "34, 39" with "Laws LJ" gives `[34], [39] (Laws LJ)`
 * rather than repeating the name. Passages by different judges need
 * `references` directly.
 */
export function pinpointFrom(
  kind: Pinpoint['kind'],
  value: string | undefined,
  judge?: string,
): Pinpoint | undefined {
  const text = value?.trim();
  if (!text) return undefined;
  const attributed = judge?.trim();
  if (!attributed) return { kind, value: text };

  const loci = text.split(/\s*,\s*/).filter(Boolean);
  return {
    kind,
    references: loci.map((locus, i) =>
      i === loci.length - 1 ? { locus, judge: attributed } : { locus },
    ),
  };
}
