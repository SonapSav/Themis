import { useEffect, useMemo, useState } from 'react';
import {
  typesForMode,
  validate,
  type Author,
  type CitationMode,
  type Source,
  type SourceType,
} from './citations';
import { DEFAULT_DRAFTS, buildSource, isDraftEmpty, toDraft, type Draft } from './fields';
import {
  DEFAULT_APPEARANCE,
  applyAppearance,
  systemPrefersDark,
  watchSystemTheme,
  type Appearance,
} from './appearance';
import { AppearanceControls } from './components/AppearanceControls';
import { SourceForm } from './components/SourceForm';
import { CitationPreview } from './components/CitationPreview';
import { ScalesIcon } from './components/ScalesIcon';
import { AssembledLists } from './components/AssembledLists';
import { SourceLibrary } from './components/SourceLibrary';
import { FootnoteSequence } from './components/FootnoteSequence';
import type { FootnoteInput } from './document';
import { clear as clearLibrary, load, save } from './store/library';
import { load as loadAppearance, save as saveAppearance } from './store/appearance';
import {
  exportFilename,
  mergeSources,
  nextIds,
  parseImport,
  toExportJson,
} from './store/transfer';

const MODES: ReadonlyArray<{ value: CitationMode; label: string; hint: string }> = [
  {
    value: 'oscola',
    label: 'OSCOLA',
    hint: 'Every source in OSCOLA footnotes, as Oxford’s guide sets out.',
  },
  {
    value: 'ou-dual',
    label: 'OU Dual',
    hint: 'Open University law modules: legal sources in OSCOLA footnotes; academic sources in Cite Them Right Harvard, cited in the text.',
  },
];

const emptyAuthorMap = () =>
  Object.fromEntries(
    (Object.keys(DEFAULT_DRAFTS) as SourceType[]).map((t) => [t, [] as readonly Author[]]),
  ) as Record<SourceType, readonly Author[]>;

export default function App() {
  // Restored from browser-local storage; nothing leaves this machine.
  const restored = useMemo(() => load(), []);
  const [mode, setMode] = useState<CitationMode>(restored?.mode ?? 'ou-dual');
  const [type, setType] = useState<SourceType>('case');
  // Drafts are kept per type so switching type to compare formats does not
  // discard what has already been typed.
  const [drafts, setDrafts] = useState<Record<SourceType, Draft>>(() => ({ ...DEFAULT_DRAFTS }));
  const [authorsByType, setAuthorsByType] = useState(emptyAuthorMap);
  const [editorsByType, setEditorsByType] = useState(emptyAuthorMap);
  const [saved, setSaved] = useState<readonly Source[]>(restored?.sources ?? []);
  const [transferMessage, setTransferMessage] = useState<string>();
  const [footnotes, setFootnotes] = useState<readonly FootnoteInput[]>(restored?.footnotes ?? []);
  /** Set while the form holds a saved source rather than a new one. */
  const [editingId, setEditingId] = useState<string>();

  // Appearance is stored apart from the library, so clearing sources keeps it.
  const [appearance, setAppearance] = useState<Appearance>(
    () => loadAppearance() ?? DEFAULT_APPEARANCE,
  );
  const [prefersDark, setPrefersDark] = useState(systemPrefersDark);

  // A reader on 'Match my system' should follow a laptop that switches at dusk
  // without reloading, so the query is watched rather than read once.
  useEffect(() => watchSystemTheme(setPrefersDark), []);

  useEffect(() => {
    applyAppearance(appearance, prefersDark);
    saveAppearance(appearance);
  }, [appearance, prefersDark]);

  useEffect(() => {
    save({ mode, sources: saved, footnotes });
  }, [mode, saved, footnotes]);

  const draft = drafts[type] ?? {};
  const authors = authorsByType[type] ?? [];
  const editors = editorsByType[type] ?? [];
  const empty = isDraftEmpty(draft, [...authors, ...editors]);

  const source = useMemo(
    () => (empty ? undefined : buildSource('draft', type, draft, authors, editors)),
    [empty, type, draft, authors, editors],
  );
  const issues = useMemo(() => (source ? validate(source) : []), [source]);

  /** Empty the form for a type, abandoning any edit in progress. */
  const resetForm = (forType: SourceType) => {
    setDrafts((current) => ({ ...current, [forType]: { ...DEFAULT_DRAFTS[forType] } }));
    setAuthorsByType((current) => ({ ...current, [forType]: [] }));
    setEditorsByType((current) => ({ ...current, [forType]: [] }));
    setEditingId(undefined);
  };

  const changeMode = (next: CitationMode) => {
    setMode(next);
    // OU module material does not exist in OSCOLA mode.
    if (!typesForMode(next).includes(type)) {
      if (editingId) resetForm(type);
      setType('case');
    }
  };

  const changeType = (next: SourceType) => {
    // An edit belongs to one source, so changing type abandons it.
    if (editingId && next !== type) resetForm(type);
    setType(next);
  };

  /** Load a saved source back into the form for correction. */
  const startEditing = (item: Source) => {
    const loaded = toDraft(item);
    setType(item.type);
    setDrafts((current) => ({ ...current, [item.type]: { ...loaded.draft } }));
    setAuthorsByType((current) => ({ ...current, [item.type]: loaded.authors }));
    setEditorsByType((current) => ({ ...current, [item.type]: loaded.editors }));
    setEditingId(item.id);
  };

  const setField = (key: string, value: string) =>
    setDrafts((current) => ({ ...current, [type]: { ...current[type], [key]: value } }));

  const setAuthors = (key: 'authors' | 'editors', next: readonly Author[]) => {
    const update = (current: Record<SourceType, readonly Author[]>) => ({ ...current, [type]: next });
    if (key === 'editors') setEditorsByType(update);
    else setAuthorsByType(update);
  };

  const saveSource = () => {
    if (!source) return;
    if (editingId) {
      setSaved((current) =>
        current.map((item) => (item.id === editingId ? { ...source, id: editingId } : item)),
      );
    } else {
      // Ids continue past the highest in use, so removing then adding cannot
      // reissue an id that is already taken.
      setSaved((current) => [...current, { ...source, id: nextIds(current, 1)[0]! }]);
    }
    resetForm(type);
  };

  const exportLibrary = () => {
    const now = new Date();
    const blob = new Blob([toExportJson({ mode, sources: saved, footnotes }, now)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = exportFilename(now);
    link.click();
    URL.revokeObjectURL(url);
    setTransferMessage(`Exported ${saved.length} source${saved.length === 1 ? '' : 's'}.`);
  };

  const importLibrary = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset the input so the same file can be chosen again after a failure.
    event.target.value = '';
    if (!file) return;

    const outcome = parseImport(await file.text());
    if (!outcome.ok) {
      setTransferMessage(outcome.error);
      return;
    }

    const merged = mergeSources(saved, outcome.sources);
    // A first import onto an empty library adopts its scheme; merging into an
    // existing one leaves the student's current choice alone.
    if (saved.length === 0) setMode(outcome.mode);
    setSaved(merged.sources);
    setTransferMessage(
      [
        `Added ${merged.added} source${merged.added === 1 ? '' : 's'}.`,
        merged.duplicates > 0 &&
          `${merged.duplicates} ${merged.duplicates === 1 ? 'was' : 'were'} already in your library.`,
        outcome.dropped > 0 &&
          `${outcome.dropped} ${outcome.dropped === 1 ? 'entry' : 'entries'} could not be read.`,
      ]
        .filter(Boolean)
        .join(' '),
    );
  };

  const hasErrors = issues.some((issue) => issue.severity === 'error');
  const activeMode = MODES.find((m) => m.value === mode)!;

  return (
    <div className="app">
      <header className="masthead">
        <div>
          <h1>
            <ScalesIcon className="mark" />
            Thetis
          </h1>
          <p>OSCOLA (4th edn) and Cite Them Right Harvard citations.</p>
        </div>
        <AppearanceControls appearance={appearance} onChange={setAppearance} />
      </header>

      <div className="mode-bar" role="group" aria-label="Referencing scheme">
        {MODES.map((m) => (
          <button
            key={m.value}
            type="button"
            className={m.value === mode ? 'mode active' : 'mode'}
            aria-pressed={m.value === mode}
            onClick={() => changeMode(m.value)}
          >
            {m.label}
          </button>
        ))}
        <span className="note">{activeMode.hint}</span>
      </div>

      <main className="columns">
        <div className="column">
          <SourceForm
            type={type}
            mode={mode}
            draft={draft}
            authors={authors}
            editors={editors}
            issues={issues}
            onTypeChange={changeType}
            onFieldChange={setField}
            onAuthorsChange={setAuthors}
          />
        </div>

        <div className="column">
          <CitationPreview source={source} mode={mode} issues={issues} />

          <div className="save">
            <button type="button" onClick={saveSource} disabled={!source || hasErrors}>
              {editingId ? 'Save changes' : 'Add to sources'}
            </button>
            {editingId && (
              <button type="button" className="secondary" onClick={() => resetForm(type)}>
                Cancel
              </button>
            )}
            {hasErrors && <span className="note">Resolve the missing fields first.</span>}
          </div>

          <SourceLibrary
            sources={saved}
            mode={mode}
            editingId={editingId}
            transferMessage={transferMessage}
            onEdit={startEditing}
            onRemove={(item) => {
              if (editingId === item.id) resetForm(item.type);
              setSaved((c) => c.filter((s) => s.id !== item.id));
            }}
            onExport={exportLibrary}
            onImport={importLibrary}
            onClear={() => {
              setSaved([]);
              setFootnotes([]);
              clearLibrary();
              setTransferMessage(undefined);
            }}
          />
        </div>
      </main>

      <FootnoteSequence
        sources={saved}
        mode={mode}
        footnotes={footnotes}
        onChange={setFootnotes}
      />

      <AssembledLists sources={saved} mode={mode} footnotes={footnotes} />

      <footer className="foot">
        <p>
          {mode === 'ou-dual'
            ? 'Under the OU scheme, footnotes and the reference list fall outside your word limit; in-text Harvard citations count towards it.'
            : 'OSCOLA is a footnote style: every citation goes in a footnote, never in the text.'}
        </p>
      </footer>
    </div>
  );
}
