import type { Author } from '../citations';

interface Props {
  readonly authors: readonly Author[];
  readonly label: string;
  readonly onChange: (authors: readonly Author[]) => void;
}

const emptyPerson: Author = { kind: 'person', given: '', surname: '' };

/**
 * Given names and surname are captured separately because the bibliography
 * inverts the name and reduces given names to initials, and no reliable parse
 * of a free-text name exists.
 */
export function AuthorFields({ authors, label, onChange }: Props) {
  const update = (index: number, author: Author) =>
    onChange(authors.map((a, i) => (i === index ? author : a)));

  return (
    <fieldset className="authors">
      <legend>{label}</legend>

      {authors.length === 0 && (
        <p className="empty">No author recorded — the citation will begin with the title.</p>
      )}

      {authors.map((author, index) => (
        <div className="author-row" key={index}>
          <select
            aria-label="Author kind"
            value={author.kind}
            onChange={(e) =>
              update(
                index,
                e.target.value === 'corporate'
                  ? { kind: 'corporate', name: '' }
                  : { kind: 'person', given: '', surname: '' },
              )
            }
          >
            <option value="person">Person</option>
            <option value="corporate">Organisation</option>
          </select>

          {author.kind === 'person' ? (
            <>
              <input
                aria-label="Given names"
                placeholder="Given names"
                value={author.given}
                onChange={(e) => update(index, { ...author, given: e.target.value })}
              />
              <input
                aria-label="Surname"
                placeholder="Surname"
                value={author.surname}
                onChange={(e) => update(index, { ...author, surname: e.target.value })}
              />
            </>
          ) : (
            <input
              aria-label="Organisation name"
              className="wide"
              placeholder="Law Commission"
              value={author.name}
              onChange={(e) => update(index, { ...author, name: e.target.value })}
            />
          )}

          <button
            type="button"
            className="icon"
            aria-label={`Remove author ${index + 1}`}
            onClick={() => onChange(authors.filter((_, i) => i !== index))}
          >
            ×
          </button>
        </div>
      ))}

      <button type="button" className="secondary" onClick={() => onChange([...authors, emptyPerson])}>
        Add author
      </button>
      {authors.length >= 4 && (
        <p className="note">
          OSCOLA cites the first of four or more authors followed by “and others”.
        </p>
      )}
    </fieldset>
  );
}
