/**
 * Export and import of the source library as a JSON file.
 *
 * Browser storage is not durable: Safari's tracking prevention deletes
 * script-writable storage after seven days without interaction, and clearing
 * site data or switching browser loses it outright. A file the student holds
 * themselves is the backup, and doubles as a way to move a library between
 * machines without any server being involved.
 */
import type { CitationMode, Source } from '../model/types';
import type { LibraryState } from './library';
import { SOURCE_TYPE_LABELS } from '../model/types';

export const EXPORT_FORMAT = 'thetis-library';
export const EXPORT_VERSION = 1;

export interface ExportFile {
  readonly format: typeof EXPORT_FORMAT;
  readonly version: number;
  readonly exportedAt: string;
  readonly mode: CitationMode;
  readonly sources: readonly Source[];
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export function toExportJson(state: LibraryState, now: Date): string {
  const file: ExportFile = {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: now.toISOString(),
    mode: state.mode,
    sources: state.sources,
  };
  return `${JSON.stringify(file, null, 2)}\n`;
}

/** `thetis-sources-2026-08-22.json` — dated, so successive backups sit together. */
export function exportFilename(now: Date): string {
  return `thetis-sources-${now.toISOString().slice(0, 10)}.json`;
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

export type ImportOutcome =
  | { readonly ok: true; readonly mode: CitationMode; readonly sources: readonly Source[]; readonly dropped: number }
  | { readonly ok: false; readonly error: string };

const isMode = (value: unknown): value is CitationMode =>
  value === 'oscola' || value === 'ou-dual';

function isSource(value: unknown): value is Source {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as { type?: unknown };
  return typeof candidate.type === 'string' && candidate.type in SOURCE_TYPE_LABELS;
}

export function parseImport(text: string): ImportOutcome {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: 'That file is not valid JSON.' };
  }

  const file = parsed as Partial<ExportFile>;
  if (file?.format !== EXPORT_FORMAT) {
    return { ok: false, error: 'That does not look like a Thetis export.' };
  }
  if (file.version !== EXPORT_VERSION) {
    return {
      ok: false,
      error: `That export was written by a different version of Thetis (${String(file.version)}).`,
    };
  }
  if (!Array.isArray(file.sources)) {
    return { ok: false, error: 'That export has no sources in it.' };
  }

  const sources = file.sources.filter(isSource);
  return {
    ok: true,
    mode: isMode(file.mode) ? file.mode : 'ou-dual',
    sources,
    // Individual bad entries are reported rather than failing the whole import.
    dropped: file.sources.length - sources.length,
  };
}

// ---------------------------------------------------------------------------
// Merging
// ---------------------------------------------------------------------------

/** Deep-sorted JSON of a source, ignoring its id, so equal content matches. */
function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, inner]) => [key, stable(inner)]),
    );
  }
  return value;
}

export function fingerprint(source: Source): string {
  const { id: _id, ...rest } = source;
  return JSON.stringify(stable(rest));
}

/**
 * Ids follow the existing `s1`, `s2` sequence, continuing past the highest one
 * in use rather than counting entries — otherwise removing a source and adding
 * another would reissue an id already taken.
 */
export function nextIds(existing: readonly Source[], count: number): string[] {
  const highest = existing.reduce((max, source) => {
    const match = /^s(\d+)$/.exec(source.id);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return Array.from({ length: count }, (_, i) => `s${highest + 1 + i}`);
}

export interface MergeResult {
  readonly sources: readonly Source[];
  readonly added: number;
  readonly duplicates: number;
}

/**
 * Import adds to the library rather than replacing it, so a mistaken import
 * cannot destroy existing work. Sources already held — same content, whatever
 * their id — are skipped.
 */
export function mergeSources(
  existing: readonly Source[],
  incoming: readonly Source[],
): MergeResult {
  const seen = new Set(existing.map(fingerprint));
  const fresh: Source[] = [];
  let duplicates = 0;

  for (const source of incoming) {
    const key = fingerprint(source);
    if (seen.has(key)) {
      duplicates += 1;
      continue;
    }
    seen.add(key);
    fresh.push(source);
  }

  const ids = nextIds(existing, fresh.length);
  return {
    sources: [...existing, ...fresh.map((source, i) => ({ ...source, id: ids[i]! }))],
    added: fresh.length,
    duplicates,
  };
}
