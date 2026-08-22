import { useState } from 'react';
import {
  SOURCE_CATEGORY,
  SOURCE_TYPE_LABELS,
  formatBibliography,
  formatReference,
  isHarvardSource,
  styleFor,
  toPlainText,
  type CitationMode,
  type Source,
  type SourceCategory,
  type SourceType,
} from '../citations';
import { filterLibrary, typesPresent } from '../search';

interface Props {
  readonly sources: readonly Source[];
  readonly mode: CitationMode;
  /** Set while one of these sources is loaded in the form. */
  readonly editingId?: string;
  readonly transferMessage?: string;
  readonly onEdit: (source: Source) => void;
  readonly onRemove: (source: Source) => void;
  readonly onExport: () => void;
  readonly onImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
  readonly onClear: () => void;
}

const CATEGORIES: ReadonlyArray<{ value: SourceCategory; label: string }> = [
  { value: 'legal', label: 'Legal sources' },
  { value: 'academic', label: 'General academic sources' },
];

/** How a saved source is summarised in the list. */
function summarise(source: Source, mode: CitationMode): string {
  if (styleFor(source.type, mode) === 'harvard' && isHarvardSource(source)) {
    return toPlainText(formatReference(source));
  }
  return toPlainText(formatBibliography(source));
}

/** Which end-of-work list the source will appear in. */
function destination(source: Source, mode: CitationMode): string {
  if (styleFor(source.type, mode) === 'harvard') return 'reference list';
  return SOURCE_CATEGORY[source.type] === 'legal' ? 'footnote' : 'bibliography';
}

/**
 * The saved sources, with export, import and a way to find one again. A library
 * is kept for a whole module, so by the end of it scrolling is not a search.
 */
export function SourceLibrary({
  sources,
  mode,
  editingId,
  transferMessage,
  onEdit,
  onRemove,
  onExport,
  onImport,
  onClear,
}: Props) {
  const [query, setQuery] = useState('');
  const [type, setType] = useState<SourceType | ''>('');
  const [category, setCategory] = useState<SourceCategory | ''>('');

  const types = typesPresent(sources);
  // Removing the last book leaves a filter on books selected but meaningless.
  const activeType = type && types.includes(type) ? type : '';
  const filtering = query.trim() !== '' || activeType !== '' || category !== '';
  const shown = filterLibrary(sources, mode, {
    query,
    type: activeType || undefined,
    category: category || undefined,
  });

  const clearFilters = () => {
    setQuery('');
    setType('');
    setCategory('');
  };

  return (
    <section className="library">
      <h3>Your sources ({sources.length})</h3>
      <p className="note">
        Saved in this browser alone, and browsers do discard local data. Export a copy you keep
        yourself.
      </p>
      <div className="library-actions">
        <button
          type="button"
          className="secondary small"
          onClick={onExport}
          disabled={sources.length === 0}
        >
          Export
        </button>
        <label className="secondary small file-button" htmlFor="import-file">
          Import
        </label>
        <input
          id="import-file"
          type="file"
          accept=".json,application/json"
          className="sr-only"
          onChange={onImport}
        />
        <button
          type="button"
          className="linklike"
          disabled={sources.length === 0}
          onClick={onClear}
        >
          Clear all
        </button>
      </div>
      {transferMessage && (
        <p className="note transfer-message" role="status">
          {transferMessage}
        </p>
      )}

      {sources.length > 0 && (
        <>
          <div className="library-filters">
            <div className="field">
              <label className="label" htmlFor="library-search">
                Search sources
              </label>
              <input
                id="library-search"
                type="search"
                value={query}
                placeholder="Author, title, case name…"
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="library-type">
                Filter by type
              </label>
              <select
                id="library-type"
                value={activeType}
                onChange={(e) => setType(e.target.value as SourceType | '')}
              >
                <option value="">Any type</option>
                {types.map((t) => (
                  <option key={t} value={t}>
                    {SOURCE_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="label" htmlFor="library-category">
                Filter by category
              </label>
              <select
                id="library-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as SourceCategory | '')}
              >
                <option value="">Any category</option>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {filtering && (
            <p className="note" role="status">
              {shown.length === 0
                ? 'No source matches.'
                : `Showing ${shown.length} of ${sources.length}.`}{' '}
              <button type="button" className="linklike" onClick={clearFilters}>
                Clear filters
              </button>
            </p>
          )}

          {shown.length > 0 && (
            <ul>
              {shown.map((item) => (
                <li key={item.id} className={item.id === editingId ? 'editing' : undefined}>
                  <span className="tag">{destination(item, mode)}</span>
                  <span>{summarise(item, mode)}</span>
                  <span className="library-buttons">
                    <button
                      type="button"
                      className="linklike"
                      aria-label={`Edit ${toPlainText(formatBibliography(item))}`}
                      onClick={() => onEdit(item)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="icon"
                      aria-label="Remove source"
                      onClick={() => onRemove(item)}
                    >
                      ×
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
