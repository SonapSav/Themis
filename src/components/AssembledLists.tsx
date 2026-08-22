import { useState } from 'react';
import { assemble, assembledToText } from '../bibliography';
import { toHtml, type CitationMode, type Source } from '../citations';
import { listHtml, listText } from '../clipboard';
import type { FootnoteInput } from '../document';
import { buildDocx, docxFilename, planDocx } from '../export/docx';
import { CopyButton } from './CopyButton';

interface Props {
  readonly sources: readonly Source[];
  readonly mode: CitationMode;
  readonly footnotes: readonly FootnoteInput[];
}

/**
 * The lists that go at the end of the work: OSCOLA's tables and bibliography,
 * or the Harvard reference list, each ordered by its own rule.
 */
export function AssembledLists({ sources, mode, footnotes }: Props) {
  const assembled = assemble(sources, mode);
  const [status, setStatus] = useState<string>();

  if (assembled.sections.length === 0 && assembled.warnings.length === 0) return null;

  const exportWord = async () => {
    setStatus('Building…');
    try {
      const now = new Date();
      const blob = await buildDocx(planDocx(footnotes, sources, mode));
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = docxFilename(now);
      link.click();
      URL.revokeObjectURL(url);
      setStatus(
        footnotes.length > 0
          ? `Exported ${footnotes.length} footnote${footnotes.length === 1 ? '' : 's'} and your lists.`
          : 'Exported your lists.',
      );
    } catch {
      setStatus('Could not build the Word file.');
    }
  };

  return (
    <section className="assembled" aria-labelledby="assembled-heading">
      <header>
        <h2 id="assembled-heading">Your lists</h2>
        <div className="actions">
          <button type="button" className="secondary small" onClick={exportWord}>
            Export to Word
          </button>
          {assembled.sections.length > 0 && (
          <CopyButton
            label="Copy all"
            text={assembledToText(assembled)}
            html={assembled.sections
              .map((s) => `<h3>${s.title}</h3>\n${listHtml(s.entries.map((e) => e.citation))}`)
              .join('\n')}
          />
          )}
        </div>
      </header>
      <p className="note">
        The Word file carries your footnote sequence as real Word footnotes, followed by the
        lists below. Copy a footnote marker into your own document and Word brings the
        footnote with it.
      </p>
      {status && (
        <p className="note transfer-message" role="status">
          {status}
        </p>
      )}

      {assembled.sections.map((section) => (
        <section className="assembled-section" key={section.id} aria-labelledby={`h-${section.id}`}>
          <header>
            <h3 id={`h-${section.id}`}>{section.title}</h3>
            <CopyButton
              label="Copy"
              text={listText(section.entries.map((e) => e.citation))}
              html={listHtml(section.entries.map((e) => e.citation))}
            />
          </header>
          <ol>
            {section.entries.map((entry) => (
              <li
                key={entry.id}
                /* Segment text is escaped by toHtml; only <em> tags are introduced. */
                dangerouslySetInnerHTML={{ __html: toHtml(entry.citation) }}
              />
            ))}
          </ol>
          <p className="note">{section.note}</p>
        </section>
      ))}

      {assembled.warnings.length > 0 && (
        <ul className="assembled-warnings">
          {assembled.warnings.map((warning, i) => (
            <li key={i}>{warning}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
