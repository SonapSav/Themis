import { useMemo, useState } from 'react';
import {
  SOURCE_TYPE_LABELS,
  styleFor,
  toHtml,
  toPlainText,
  type CitationMode,
  type Source,
} from '../citations';
import { renderFootnotes, type CitationRef, type FootnoteInput } from '../document';
import { CopyButton } from './CopyButton';

interface Props {
  readonly sources: readonly Source[];
  readonly mode: CitationMode;
  readonly footnotes: readonly FootnoteInput[];
  readonly onChange: (footnotes: readonly FootnoteInput[]) => void;
}

/**
 * The panel offers one judge per footnote, attributing the whole pinpoint
 * (OSCOLA 2.1.7). Passages by different judges are supported by the engine
 * through `references`, but are not worth the form clutter here.
 */
function judgeOf(ref: CitationRef): string {
  return ref.references?.[ref.references.length - 1]?.judge ?? '';
}

function withJudge(ref: CitationRef, judge: string): CitationRef {
  if (!judge.trim()) {
    const { references: _references, ...rest } = ref;
    return rest;
  }
  const loci = (ref.pinpoint ?? '').split(/\s*,\s*/).filter(Boolean);
  if (loci.length === 0) return { ...ref, references: undefined };
  return {
    ...ref,
    // Stored as typed: trimming here would swallow the space in "Lord Lloyd"
    // as it is typed. renderPinpoint trims when it renders.
    references: loci.map((locus, i) => (i === loci.length - 1 ? { locus, judge } : { locus })),
  };
}

const FORM_LABELS: Record<string, string> = {
  full: 'full citation',
  ibid: 'ibid',
  'cross-citation': 'cross-citation',
  'short-form': 'short form',
  'unknown-source': 'source missing',
};

/**
 * A scratchpad for the footnote engine: put citations in order and watch the
 * repeat forms follow. The same engine will drive an editor or a Word add-in;
 * this is the smallest host that shows it working.
 */
export function FootnoteSequence({ sources, mode, footnotes, onChange }: Props) {
  // Only OSCOLA-cited sources go in footnotes; Harvard ones are cited in the text.
  const citable = sources.filter((s) => styleFor(s.type, mode) === 'oscola');
  const [selected, setSelected] = useState<string>('');

  const rendered = useMemo(
    () => renderFootnotes(footnotes, sources),
    [footnotes, sources],
  );

  if (citable.length === 0) return null;

  const chosen = selected || citable[0]!.id;

  const add = () =>
    onChange([...footnotes, { citations: [{ sourceId: chosen }] }]);

  const update = (index: number, citations: FootnoteInput['citations']) =>
    onChange(footnotes.map((f, i) => (i === index ? { citations } : f)));

  const move = (index: number, by: number) => {
    const target = index + by;
    if (target < 0 || target >= footnotes.length) return;
    const next = [...footnotes];
    [next[index], next[target]] = [next[target]!, next[index]!];
    onChange(next);
  };

  return (
    <section className="footnote-panel" aria-labelledby="footnotes-heading">
      <header>
        <h2 id="footnotes-heading">Footnote sequence</h2>
        {footnotes.length > 0 && (
          <CopyButton
            label="Copy all"
            text={rendered.map((f) => `${f.number}  ${toPlainText(f.citation)}`).join('\n')}
            html={rendered.map((f) => `<p>${f.number}&nbsp;&nbsp;${toHtml(f.citation)}</p>`).join('\n')}
          />
        )}
      </header>
      <p className="note">
        Cite a source again and the short form follows automatically: <em>ibid</em> straight
        after the full citation, otherwise a cross-citation to the footnote it came from.
        Reorder and the numbering follows.
      </p>

      <div className="footnote-add">
        <label className="sr-only" htmlFor="footnote-source">
          Source to cite
        </label>
        <select id="footnote-source" value={chosen} onChange={(e) => setSelected(e.target.value)}>
          {citable.map((source) => (
            <option key={source.id} value={source.id}>
              {SOURCE_TYPE_LABELS[source.type]} — {toPlainText(renderFootnotes([{ citations: [{ sourceId: source.id }] }], sources)[0]!.citation).slice(0, 60)}
            </option>
          ))}
        </select>
        <button type="button" className="secondary small" onClick={add}>
          Add footnote
        </button>
      </div>

      {footnotes.length > 0 && (
        <ol className="footnote-list">
          {rendered.map((footnote, index) => {
            const ref = footnotes[index]!.citations[0]!;
            return (
              <li key={index}>
                <span className="footnote-number">{footnote.number}</span>
                <span
                  className="footnote-text"
                  /* Segment text is escaped by toHtml; only <em> tags are introduced. */
                  dangerouslySetInnerHTML={{ __html: toHtml(footnote.citation) }}
                />
                <span className={`footnote-form ${footnote.form}`}>
                  {FORM_LABELS[footnote.form]}
                </span>
                <input
                  className="footnote-pinpoint"
                  value={ref.pinpoint ?? ''}
                  placeholder="pinpoint"
                  aria-label={`Pinpoint for footnote ${footnote.number}`}
                  onChange={(e) => update(index, [{ ...ref, pinpoint: e.target.value }])}
                />
                <input
                  className="footnote-pinpoint"
                  value={judgeOf(ref)}
                  placeholder="judge"
                  aria-label={`Judge for footnote ${footnote.number}`}
                  // A judge attributes a passage, so there has to be one (2.1.7).
                  disabled={!ref.pinpoint?.trim()}
                  title={ref.pinpoint?.trim() ? undefined : 'Give a pinpoint first'}
                  onChange={(e) => update(index, [withJudge(ref, e.target.value)])}
                />
                <span className="footnote-buttons">
                  <button
                    type="button" className="icon" aria-label={`Move footnote ${footnote.number} up`}
                    disabled={index === 0} onClick={() => move(index, -1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button" className="icon" aria-label={`Move footnote ${footnote.number} down`}
                    disabled={index === footnotes.length - 1} onClick={() => move(index, 1)}
                  >
                    ↓
                  </button>
                  <button
                    type="button" className="icon" aria-label={`Remove footnote ${footnote.number}`}
                    onClick={() => onChange(footnotes.filter((_, i) => i !== index))}
                  >
                    ×
                  </button>
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
