import {
  THEMES,
  TYPEFACES,
  type Appearance,
  type Theme,
  type Typeface,
} from '../appearance';

interface Props {
  readonly appearance: Appearance;
  readonly onChange: (next: Appearance) => void;
}

/**
 * The two things a reader can change about how Themis looks. They sit in the
 * masthead rather than behind a settings page: there are two of them, and a
 * page of its own for two selects is a page nobody finds.
 */
export function AppearanceControls({ appearance, onChange }: Props) {
  return (
    <div className="appearance" role="group" aria-label="Appearance">
      <div className="field">
        <label className="label" htmlFor="appearance-theme">
          Theme
        </label>
        <select
          id="appearance-theme"
          value={appearance.theme}
          onChange={(e) => onChange({ ...appearance, theme: e.target.value as Theme })}
        >
          {THEMES.map((theme) => (
            <option key={theme.value} value={theme.value}>
              {theme.label}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label className="label" htmlFor="appearance-typeface">
          Typeface
        </label>
        <select
          id="appearance-typeface"
          value={appearance.typeface}
          onChange={(e) => onChange({ ...appearance, typeface: e.target.value as Typeface })}
        >
          {TYPEFACES.map((face) => (
            <option key={face.value} value={face.value}>
              {face.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
