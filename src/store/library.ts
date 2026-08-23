/**
 * Browser-local persistence for the source library.
 *
 * Everything stays on the student's own machine: there is no backend, and
 * nothing here leaves the browser. Reaching storage at all is guarded in
 * `storage.ts`, and failure degrades to an in-memory session rather than an
 * error.
 */
import { SOURCE_TYPE_LABELS, type CitationMode, type Source } from '../model/types';
import type { FootnoteInput } from '../document';
import { storage } from './storage';

const KEY = 'themis.library';
const VERSION = 1;

export interface LibraryState {
  readonly mode: CitationMode;
  readonly sources: readonly Source[];
  /** The footnote scratchpad. Absent in libraries written before it existed. */
  readonly footnotes?: readonly FootnoteInput[];
}

interface Persisted extends LibraryState {
  readonly version: number;
}

const isMode = (value: unknown): value is CitationMode =>
  value === 'oscola' || value === 'ou-dual';

/**
 * Structural check only: enough to keep a corrupted or hand-edited entry from
 * reaching the formatters, which would otherwise throw on a missing field.
 */
function isSource(value: unknown): value is Source {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as { id?: unknown; type?: unknown };
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.type === 'string' &&
    candidate.type in SOURCE_TYPE_LABELS
  );
}

export function load(): LibraryState | undefined {
  const store = storage();
  if (!store) return undefined;
  try {
    const raw = store.getItem(KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as Partial<Persisted>;
    if (parsed?.version !== VERSION) return undefined;
    return {
      mode: isMode(parsed.mode) ? parsed.mode : 'ou-dual',
      // Individual bad entries are dropped rather than losing the whole library.
      sources: Array.isArray(parsed.sources) ? parsed.sources.filter(isSource) : [],
      footnotes: Array.isArray(parsed.footnotes)
        ? parsed.footnotes.filter(
            (f): f is FootnoteInput =>
              typeof f === 'object' && f !== null && Array.isArray((f as FootnoteInput).citations),
          )
        : [],
    };
  } catch {
    return undefined;
  }
}

export function save(state: LibraryState): void {
  const store = storage();
  if (!store) return;
  try {
    const payload: Persisted = { version: VERSION, ...state };
    store.setItem(KEY, JSON.stringify(payload));
  } catch {
    // A full quota or a blocked write is not worth interrupting the student for;
    // the session carries on in memory.
  }
}

export function clear(): void {
  try {
    storage()?.removeItem(KEY);
  } catch {
    // Nothing to recover: the entry is either already gone or unreachable.
  }
}
