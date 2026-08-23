import {
  SOURCE_CATEGORY,
  formatSource,
  nameInTextForm,
  toHtml,
  toMarkdown,
  toPlainText,
  type CitationMode,
  type FormattedCitation,
  type Source,
  type ValidationIssue,
} from '../citations';
import { ruleLabel } from '../oscola/rules';
import { CopyButton } from './CopyButton';

interface Props {
  readonly source: Source;
  readonly mode: CitationMode;
  readonly issues: readonly ValidationIssue[];
  /** Nothing typed yet: the checks still show, the rendered citation does not. */
  readonly empty: boolean;
}

function CitationBlock({
  heading,
  note,
  citation,
}: {
  heading: string;
  note: string;
  citation: FormattedCitation;
}) {
  return (
    <section className="citation">
      <header>
        <h3>{heading}</h3>
        <div className="actions">
          <CopyButton label="Copy" text={toPlainText(citation)} html={toHtml(citation)} />
          <CopyButton label="Copy Markdown" text={toMarkdown(citation)} />
        </div>
      </header>
      {/* Segment text is escaped by toHtml; only <em> tags are introduced. */}
      <p className="rendered" dangerouslySetInnerHTML={{ __html: toHtml(citation) }} />
      <p className="note">{note}</p>
    </section>
  );
}

/**
 * OSCOLA is a footnote style and 1.1 rules out in-text citations such as
 * "(Brown, 2007)". This panel is the guide's own rule about what changes when
 * the prose already names the source, not an inline citation.
 */
function NameInText({ source }: { source: Source }) {
  const form = nameInTextForm(source);
  const hasForms = Boolean(form.footnote || form.inText);

  return (
    <section className="citation named-in-text">
      <h3>If you name it in your text</h3>
      {form.inText && (
        <CitationBlock
          heading="In your text"
          note="Provisions are spelled out in full in prose, abbreviated in footnotes."
          citation={form.inText}
        />
      )}
      {form.footnote && (
        <CitationBlock
          heading="Footnote instead"
          note="The name is not repeated, because your sentence has already given it."
          citation={form.footnote}
        />
      )}
      {hasForms && !form.footnoteRequired && <p className="ok">No footnote needed at all.</p>}
      <p className="note">{form.note}</p>
    </section>
  );
}

/**
 * What the source is missing, and which rule asks for it.
 *
 * Shown from the first render rather than once something has been typed. An
 * empty form is exactly when a reader most wants to know what a citation of
 * this type needs, and the panel reads as a list of what to collect.
 */
function Checks({ issues }: { issues: readonly ValidationIssue[] }) {
  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');
  if (errors.length === 0 && warnings.length === 0) return null;

  return (
    <section className="issues">
      <h3>Checks</h3>
      <ul>
        {[...errors, ...warnings].map((issue, i) => (
          <li key={i} className={issue.severity}>
            <strong>{issue.severity === 'error' ? 'Missing' : 'Check'}</strong>{' '}
            {issue.message}
            {/* The rule is what makes a check checkable: a reader who
                disagrees can go and read the section it came from. */}
            {issue.rule && <span className="rule">{ruleLabel(issue.rule)}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function CitationPreview({ source, mode, issues, empty }: Props) {
  if (empty) {
    return (
      <div className="preview empty-preview">
        <p>Fill in the form to see how this source is cited.</p>
        <Checks issues={issues} />
      </div>
    );
  }

  const output = formatSource(source, mode);
  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');

  return (
    <div className="preview">
      {/*
        * Two independent facts, and reading one off the other was a bug: in
        * OSCOLA-only mode every source is styled 'oscola', so a book announced
        * itself as a legal source. What kind of source it is comes from its
        * type and never changes; which scheme cites it depends on the mode.
        */}
      <p className="style-badge">
        {SOURCE_CATEGORY[source.type] === 'legal' ? 'Legal source' : 'Academic source'}
        {' — '}
        {output.style === 'oscola' ? 'OSCOLA' : 'CTR Harvard'}
      </p>

      {output.style === 'oscola' ? (
        <>
          <CitationBlock
            heading="Footnote"
            note="First citation, in full, closed with a full stop."
            citation={output.footnote}
          />
          {output.bibliography ? (
            <CitationBlock
              heading="Bibliography entry"
              note="Authors inverted, pinpoint dropped, no closing full stop."
              citation={output.bibliography}
            />
          ) : (
            <p className="note end-note">
              Legal sources appear only in footnotes under the OU scheme — there is no
              end-of-essay entry for this source.
            </p>
          )}
          <NameInText source={source} />
        </>
      ) : (
        <>
          <CitationBlock
            heading="In-text citation"
            note="Goes in the body of your sentence — and counts towards your word limit."
            citation={output.inText}
          />
          <CitationBlock
            heading="In-text citation, narrative"
            note="Where the author is the subject of your sentence."
            citation={output.inTextNarrative}
          />
          <CitationBlock
            heading="Reference list entry"
            note="Alphabetical by author at the end of your work. Does not count towards the word limit."
            citation={output.reference}
          />
        </>
      )}

      <Checks issues={issues} />

      {errors.length === 0 && warnings.length === 0 && (
        <p className="ok">No problems found in the fields entered.</p>
      )}
    </div>
  );
}
