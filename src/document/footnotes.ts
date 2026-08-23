/**
 * Footnote sequencing: OSCOLA 1.2's rules for citing a source again.
 *
 * A source is given in full the first time. After that it is identified
 * briefly with a cross-citation to the footnote holding the full citation —
 * `Stevens (n 1) 110` — or, where the full citation is in the immediately
 * preceding footnote, with `ibid`.
 *
 * These are pure functions over an ordered list of footnotes, so the same
 * engine serves a browser editor, a Word add-in, or a plain preview.
 */
import { renderPinpoint } from '../model/pinpoints';
import { formatFootnote } from '../oscola';
import { segments, type FormattedCitation, type Part } from '../model/segments';
import { SOURCE_CATEGORY, type Pinpoint, type PinpointReference, type Source } from '../model/types';
import { firstAuthorKey, shortForm } from './shortForms';

export interface CitationRef {
  readonly sourceId: string;
  /** Pinpoint for this citation, which overrides anything held on the source. */
  readonly pinpoint?: string;
  readonly pinpointKind?: 'page' | 'paragraph';
  /**
   * Passages attributed to particular judges, where `pinpoint` alone will not
   * do — OSCOLA 2.1.7's `[34] (Lord Hope), [39] (Lord Scott)`. Takes precedence
   * over `pinpoint`.
   */
  readonly references?: readonly PinpointReference[];
}

export interface FootnoteInput {
  /** One footnote may carry several citations, separated by semicolons (1.1). */
  readonly citations: readonly CitationRef[];
}

export interface RenderedFootnote {
  readonly number: number;
  readonly citation: FormattedCitation;
  /** Which rule produced it, for explaining the output to a student. */
  readonly form: 'full' | 'ibid' | 'cross-citation' | 'short-form' | 'unknown-source';
}

export interface SequenceOptions {
  /**
   * OSCOLA 1.2.3 accepts repeating the preceding citation instead of using
   * 'ibid', but warns: "Do not switch back and forth from one to the other."
   */
  readonly repeatStyle?: 'ibid' | 'cross-citation';
}

/** Footnotes close with a full stop (1.1), added once per footnote. */
function stripTerminator(citation: FormattedCitation): FormattedCitation {
  const last = citation[citation.length - 1];
  if (!last || !last.text.endsWith('.')) return citation;
  return [...citation.slice(0, -1), { ...last, text: last.text.slice(0, -1) }];
}

/**
 * OSCOLA 2.1.3: "All cases with medium neutral citations have numbered paragraphs",
 * and 2.1.6 pinpoints those by paragraph. A case without one is pinpointed by
 * page, as is everything else. Overridden by an explicit `pinpointKind`.
 */
const defaultKind = (source: Source | undefined): 'page' | 'paragraph' =>
  source?.type === 'case' && source.neutral ? 'paragraph' : 'page';

/** The pinpoint this citation carries, structured or as typed. */
function pinpointOf(ref: CitationRef, source: Source | undefined): Pinpoint | undefined {
  const kind = ref.pinpointKind ?? defaultKind(source);
  if (ref.references?.length) return { kind, references: ref.references };
  const value = ref.pinpoint?.trim();
  return value ? { kind, value } : undefined;
}

/** Apply this citation's pinpoint to whichever field the source type uses. */
function withPinpoint(source: Source, ref: CitationRef): Source {
  const pinpoint = pinpointOf(ref, source);
  if (!pinpoint) return source;
  switch (source.type) {
    case 'case':
    case 'book':
    case 'journalArticle':
      return { ...source, pinpoint };
    case 'act':
    case 'statutoryInstrument':
      return { ...source, provision: renderPinpoint(pinpoint) };
    case 'euLegislation':
    case 'euCase':
      return { ...source, pinpoint: renderPinpoint(pinpoint) };
    default:
      return source;
  }
}

/** A pinpoint trailing a short form or an 'ibid': a space, then the reference. */
function trailingPinpoint(ref: CitationRef, source: Source | undefined): string {
  const pinpoint = pinpointOf(ref, source);
  if (!pinpoint) return '';
  // 3.2.1 labels a book's paragraph pinpoints — `para 76` — where a case's are
  // bracketed. `ibid` carries the same form as the full citation would.
  const rendered = renderPinpoint(
    pinpoint,
    source?.type === 'book' ? { paragraphStyle: 'labelled' } : {},
  );
  return rendered ? ` ${rendered}` : '';
}

const sameCitations = (a: FootnoteInput, b: FootnoteInput): boolean =>
  a.citations.length === b.citations.length &&
  a.citations.every((c, i) => c.sourceId === b.citations[i]!.sourceId);

/**
 * Legislation takes a short form rather than a cross-citation. OSCOLA 1.2.1:
 * "the short form can be used without a cross-citation ... Where that is not
 * the case, a further full citation should be provided, with the result that
 * cross-citation is never necessary."
 */
const takesCrossCitation = (source: Source): boolean =>
  SOURCE_CATEGORY[source.type] !== 'legal' || source.type === 'case' || source.type === 'euCase';

export function renderFootnotes(
  footnotes: readonly FootnoteInput[],
  sources: readonly Source[],
  options: SequenceOptions = {},
): RenderedFootnote[] {
  const byId = new Map(sources.map((s) => [s.id, s]));
  const firstNote = new Map<string, number>();

  // 1.2.1 needs the surname alone unless several works by one author are cited,
  // so this has to be known across the whole document before rendering starts.
  const worksPerAuthor = new Map<string, Set<string>>();
  for (const footnote of footnotes) {
    for (const { sourceId } of footnote.citations) {
      const source = byId.get(sourceId);
      if (!source || SOURCE_CATEGORY[source.type] === 'legal') continue;
      const key = firstAuthorKey(source);
      if (!key) continue;
      worksPerAuthor.set(key, (worksPerAuthor.get(key) ?? new Set()).add(sourceId));
    }
  }
  const hasSeveralWorks = (source: Source) =>
    (worksPerAuthor.get(firstAuthorKey(source))?.size ?? 0) > 1;

  // A legislation short form is announced in brackets on its first citation,
  // but only where it is actually reused later (1.2.1).
  const timesCited = new Map<string, number>();
  for (const footnote of footnotes) {
    for (const { sourceId } of footnote.citations) {
      timesCited.set(sourceId, (timesCited.get(sourceId) ?? 0) + 1);
    }
  }

  const rendered: RenderedFootnote[] = [];

  footnotes.forEach((footnote, index) => {
    const number = index + 1;
    const previous = footnotes[index - 1];

    // 1.2.3: with several citations in the preceding footnote, 'ibid' is only
    // available when referring again to all of them.
    const everyCitationSeenBefore = footnote.citations.every((c) => firstNote.has(c.sourceId));
    const useIbid =
      options.repeatStyle !== 'cross-citation' &&
      previous !== undefined &&
      everyCitationSeenBefore &&
      sameCitations(previous, footnote);

    if (useIbid) {
      // 'ibid' alone is "in the very same place"; 'ibid 345' the same work at a
      // new pinpoint. Never italicised or capitalised (1.2.3).
      const only = footnote.citations.length === 1 ? footnote.citations[0] : undefined;
      const pinpoint = only ? trailingPinpoint(only, byId.get(only.sourceId)) : '';
      rendered.push({ number, citation: segments('ibid', pinpoint, '.'), form: 'ibid' });
      return;
    }

    const parts: Part[] = [];
    let form: RenderedFootnote['form'] = 'full';

    footnote.citations.forEach((ref, position) => {
      if (position > 0) parts.push('; ');
      const source = byId.get(ref.sourceId);

      if (!source) {
        parts.push(`[unknown source: ${ref.sourceId}]`);
        form = 'unknown-source';
        return;
      }

      const seenAt = firstNote.get(ref.sourceId);
      if (seenAt === undefined) {
        firstNote.set(ref.sourceId, number);
        const announceShortForm =
          'shortForm' in source && Boolean(source.shortForm?.trim()) &&
          (timesCited.get(ref.sourceId) ?? 0) > 1;
        parts.push(
          stripTerminator(formatFootnote(withPinpoint(source, ref), { announceShortForm })),
        );
        return;
      }

      parts.push(...shortForm(source, hasSeveralWorks(source)));
      if (takesCrossCitation(source)) {
        parts.push(` (n ${seenAt})`);
        form = form === 'full' ? 'cross-citation' : form;
      } else {
        // A legislation short form carries its pinpoint after a comma, as the
        // full citation does: "Working Time Directive, art 2".
        const pinpoint = ref.pinpoint?.trim();
        if (pinpoint) parts.push(`, ${pinpoint}`);
        form = form === 'full' ? 'short-form' : form;
        return;
      }
      parts.push(trailingPinpoint(ref, source));
    });

    rendered.push({ number, citation: segments(...parts, '.'), form });
  });

  return rendered;
}
