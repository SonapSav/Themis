/**
 * Rich-text primitives for citation output.
 *
 * A formatted citation is a flat list of styled text segments rather than a
 * markup string. Tests can assert against plain text without markup noise, the
 * UI can render <em>, and a later Word/.docx exporter can map segments straight
 * onto run properties instead of re-parsing HTML.
 */

export type SegmentStyle = 'plain' | 'italic';

export interface Segment {
  readonly text: string;
  readonly style: SegmentStyle;
}

/** A fully formatted citation: a footnote, or a bibliography entry. */
export type FormattedCitation = readonly Segment[];

/** Anything that can be folded into a citation. Falsy parts are dropped. */
export type Part = string | Segment | readonly Segment[] | null | undefined | false;

export const plain = (text: string): Segment => ({ text, style: 'plain' });
export const italic = (text: string): Segment => ({ text, style: 'italic' });

/**
 * Build a citation from parts. Bare strings become plain segments, and
 * `null`/`undefined`/`false`/`''` are dropped so callers can write
 * `cond && '...'` inline. Adjacent same-style segments are merged.
 */
export function segments(...parts: Part[]): FormattedCitation {
  const flat: Segment[] = [];
  for (const part of parts) {
    if (!part) continue;
    if (typeof part === 'string') flat.push(plain(part));
    else if (Array.isArray(part)) flat.push(...(part as Segment[]));
    else flat.push(part as Segment);
  }
  return normalise(flat);
}

/** Drop empty segments and merge runs of the same style. */
export function normalise(input: readonly Segment[]): FormattedCitation {
  const out: Segment[] = [];
  for (const seg of input) {
    if (seg.text === '') continue;
    const last = out[out.length - 1];
    if (last && last.style === seg.style) {
      out[out.length - 1] = { text: last.text + seg.text, style: seg.style };
    } else {
      out.push(seg);
    }
  }
  return out;
}

/** Join citations with a separator, e.g. a comma between neutral cite and report. */
export function join(separator: string, citations: readonly Part[]): FormattedCitation {
  const present = citations.filter((c): c is Exclude<Part, null | undefined | false | ''> => Boolean(c));
  const parts: Part[] = [];
  present.forEach((citation, i) => {
    if (i > 0) parts.push(separator);
    parts.push(citation);
  });
  return segments(...parts);
}

// ---------------------------------------------------------------------------
// Renderers
// ---------------------------------------------------------------------------

export function toPlainText(citation: FormattedCitation): string {
  return citation.map((s) => s.text).join('');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function toHtml(citation: FormattedCitation): string {
  return citation
    .map((s) => (s.style === 'italic' ? `<em>${escapeHtml(s.text)}</em>` : escapeHtml(s.text)))
    .join('');
}

export function toMarkdown(citation: FormattedCitation): string {
  return citation
    .map((s) => {
      // Only `*` and `\` need escaping here: `_` is not emphasis mid-word in
      // GFM and escaping it would mangle URLs, which citations often contain.
      const escaped = s.text.replace(/([\\*])/g, '\\$1');
      return s.style === 'italic' ? `*${escaped}*` : escaped;
    })
    .join('');
}
