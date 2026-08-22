import type { Author, CitationMode, SourceType, ValidationIssue } from '../citations';
import { SOURCE_TYPE_LABELS, SOURCE_CATEGORY, typesForMode } from '../citations';
import { AUTHOR_LISTS, FIELDS, type Draft, type FieldSpec } from '../fields';
import { AuthorFields } from './AuthorFields';

interface Props {
  readonly type: SourceType;
  readonly mode: CitationMode;
  readonly draft: Draft;
  readonly authors: readonly Author[];
  readonly editors: readonly Author[];
  readonly issues: readonly ValidationIssue[];
  readonly onTypeChange: (type: SourceType) => void;
  readonly onFieldChange: (key: string, value: string) => void;
  readonly onAuthorsChange: (key: 'authors' | 'editors', authors: readonly Author[]) => void;
}

interface Section {
  readonly title?: string;
  readonly fields: readonly FieldSpec[];
}

/**
 * Split the flat field list into the groups the specs declare. Grouped fields
 * become a fieldset with a legend, so that repeated labels — a case has a Year
 * for the neutral citation and another for the law report — stay distinct for
 * anyone navigating by accessible name.
 */
function toSections(fields: readonly FieldSpec[]): Section[] {
  const sections: Section[] = [];
  let current: { title?: string; fields: FieldSpec[] } | undefined;
  for (const field of fields) {
    if (!current || (field.group && field.group !== current.title)) {
      current = { title: field.group, fields: [] };
      sections.push(current as Section);
    }
    (current.fields as FieldSpec[]).push(field);
  }
  return sections;
}

const idFor = (key: string) => `field-${key.replace(/[^a-zA-Z0-9]+/g, '-')}`;

function Field({
  field,
  value,
  issue,
  onChange,
}: {
  field: FieldSpec;
  value: string;
  issue: ValidationIssue | undefined;
  onChange: (value: string) => void;
}) {
  const id = idFor(field.key);
  const hintId = field.hint ? `${id}-hint` : undefined;
  const issueId = issue ? `${id}-issue` : undefined;
  // Hints and validation messages describe the control; they are deliberately
  // not part of its label, which stays the field name alone.
  const describedBy = [hintId, issueId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="field">
      <label className="label" htmlFor={id}>
        {field.label}
      </label>
      {field.control === 'select' ? (
        <select
          id={id}
          value={value || field.options?.[0]?.value || ''}
          aria-describedby={describedBy}
          onChange={(e) => onChange(e.target.value)}
        >
          {field.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          type={field.control === 'date' ? 'date' : 'text'}
          value={value}
          placeholder={field.placeholder}
          aria-invalid={issue?.severity === 'error' || undefined}
          aria-describedby={describedBy}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {field.hint && (
        <span className="hint" id={hintId}>
          {field.hint}
        </span>
      )}
      {issue && (
        <span className={`issue ${issue.severity}`} id={issueId}>
          {issue.message}
        </span>
      )}
    </div>
  );
}

export function SourceForm({
  type,
  mode,
  draft,
  authors,
  editors,
  issues,
  onTypeChange,
  onFieldChange,
  onAuthorsChange,
}: Props) {
  const sections = toSections(FIELDS[type]);
  const issueFor = (key: string) => issues.find((issue) => issue.field === key);
  const typeId = 'field-source-type';

  return (
    <form className="source-form" onSubmit={(e) => e.preventDefault()}>
      <div className="field">
        <label className="label" htmlFor={typeId}>
          Source type
        </label>
        <select
          id={typeId}
          value={type}
          onChange={(e) => onTypeChange(e.target.value as SourceType)}
        >
          <optgroup label="Legal sources">
            {typesForMode(mode)
              .filter((t) => SOURCE_CATEGORY[t] === 'legal')
              .map((t) => (
                <option key={t} value={t}>
                  {SOURCE_TYPE_LABELS[t]}
                </option>
              ))}
          </optgroup>
          <optgroup label="General academic sources">
            {typesForMode(mode)
              .filter((t) => SOURCE_CATEGORY[t] === 'academic')
              .map((t) => (
                <option key={t} value={t}>
                  {SOURCE_TYPE_LABELS[t]}
                </option>
              ))}
          </optgroup>
        </select>
      </div>

      {(AUTHOR_LISTS[type] ?? []).map((list) => (
        <AuthorFields
          key={list.key}
          authors={list.key === 'editors' ? editors : authors}
          label={list.label}
          onChange={(next) => onAuthorsChange(list.key, next)}
        />
      ))}

      {sections.map((section, index) => {
        const fields = section.fields.map((field) => (
          <Field
            key={field.key}
            field={field}
            value={draft[field.key] ?? ''}
            issue={issueFor(field.key)}
            onChange={(value) => onFieldChange(field.key, value)}
          />
        ));

        if (!section.title) return <div key={index}>{fields}</div>;
        return (
          <fieldset className="group" key={section.title}>
            <legend>{section.title}</legend>
            {fields}
          </fieldset>
        );
      })}
    </form>
  );
}
