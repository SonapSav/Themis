import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

/**
 * End-to-end tests through the real app: fill the form, read the preview.
 * The formatting rules themselves are covered by the engine tests; these
 * check that the UI is wired to them, and that the mode switch, validation
 * and session list behave.
 */

const setup = () => {
  const user = userEvent.setup();
  const { unmount } = render(<App />);
  return Object.assign(user, { unmount });
};

/** Enter the smallest valid case, so there is something to save. */
async function addPageVSmith(user: ReturnType<typeof setup>) {
  await user.type(screen.getByLabelText('Case name'), 'Page v Smith');
  const report = group(/Law report/);
  await user.type(report.getByLabelText('Year'), '1996');
  await user.type(report.getByLabelText('Report series'), 'AC');
  await user.type(report.getByLabelText('First page'), '155');
  await user.type(group(/Other/).getByLabelText('Court'), 'HL');
  await user.click(screen.getByRole('button', { name: 'Add to sources' }));
}

/** The rendered text of a named preview block, markup flattened. */
function citation(heading: string): string {
  const section = screen.getByRole('heading', { name: heading }).closest('section');
  return section?.querySelector('.rendered')?.textContent ?? '';
}

/** The italic runs of a named preview block, so markup can be asserted. */
function italics(heading: string): string[] {
  const section = screen.getByRole('heading', { name: heading }).closest('section');
  return [...(section?.querySelectorAll('.rendered em') ?? [])].map((e) => e.textContent ?? '');
}

const group = (name: string | RegExp) => within(screen.getByRole('group', { name }));

/** Scoped to the form's own select: the library's type filter lists the same names. */
const chooseType = (user: ReturnType<typeof userEvent.setup>, label: string) => {
  const select = screen.getByLabelText('Source type');
  return user.selectOptions(select, within(select).getByRole('option', { name: label }));
};

// ---------------------------------------------------------------------------

describe('the masthead', () => {
  it('shows the mark without it intruding on the heading name', () => {
    const { container } = render(<App />);
    expect(container.querySelector('h1 svg.mark')).toBeInTheDocument();
    // The mark is decorative, so the heading still reads as just "Thetis".
    expect(screen.getByRole('heading', { level: 1 })).toHaveAccessibleName('Thetis');
  });
});

describe('citing a case', () => {
  it('builds the footnote from the form as you type', async () => {
    const user = setup();

    await user.type(screen.getByLabelText('Case name'), 'Corr v IBC Vehicles Ltd');
    const neutral = group(/Neutral citation/);
    await user.type(neutral.getByLabelText('Year'), '2008');
    await user.type(neutral.getByLabelText('Court'), 'UKHL');
    await user.type(neutral.getByLabelText('Judgment number'), '13');

    const report = group(/Law report/);
    await user.type(report.getByLabelText('Year'), '2008');
    await user.type(report.getByLabelText('Volume'), '1');
    await user.type(report.getByLabelText('Report series'), 'AC');
    await user.type(report.getByLabelText('First page'), '884');

    expect(citation('Footnote')).toBe(
      'Corr v IBC Vehicles Ltd [2008] UKHL 13, [2008] 1 AC 884.',
    );
    expect(italics('Footnote')).toEqual(['Corr v IBC Vehicles Ltd']);
  });

  it('drops a court entered alongside a neutral citation, and says why', async () => {
    const user = setup();

    await user.type(screen.getByLabelText('Case name'), 'Re Guardian News and Media Ltd');
    const neutral = group(/Neutral citation/);
    await user.type(neutral.getByLabelText('Year'), '2010');
    await user.type(neutral.getByLabelText('Court'), 'UKSC');
    await user.type(neutral.getByLabelText('Judgment number'), '1');
    await user.type(group(/Other/).getByLabelText('Court'), 'SC');

    expect(citation('Footnote')).toBe('Re Guardian News and Media Ltd [2010] UKSC 1.');
    expect(
      screen.getAllByText(/neutral citation already identifies the court/i).length,
    ).toBeGreaterThan(0);
  });

  it('shows the table-of-cases entry without italics', async () => {
    const user = setup();

    await user.type(screen.getByLabelText('Case name'), 'Page v Smith');
    const report = group(/Law report/);
    await user.type(report.getByLabelText('Year'), '1996');
    await user.type(report.getByLabelText('Report series'), 'AC');
    await user.type(report.getByLabelText('First page'), '155');
    await user.type(group(/Other/).getByLabelText('Court'), 'HL');

    // Legal sources get no end entry in OU dual mode, so switch to OSCOLA.
    await user.click(screen.getByRole('button', { name: 'OSCOLA' }));

    expect(citation('Bibliography entry')).toBe('Page v Smith [1996] AC 155 (HL)');
    expect(italics('Bibliography entry')).toEqual([]);
  });
});

describe('the mode switch', () => {
  it('offers both schemes, defaulting to the OU one', () => {
    setup();
    expect(screen.getByRole('button', { name: 'OSCOLA' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'OU Dual' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/W1xx–W3xx/)).toBeInTheDocument();
  });

  const fillBook = async (user: ReturnType<typeof userEvent.setup>) => {
    await chooseType(user, 'Book');
    const authors = group('Authors or editors');
    await user.click(authors.getByRole('button', { name: 'Add author' }));
    await user.type(authors.getByLabelText('Given names'), 'J');
    await user.type(authors.getByLabelText('Surname'), 'Bell');
    await user.type(screen.getByLabelText('Title'), 'Doing your research project');
    await user.type(screen.getByLabelText('Publisher'), 'Open University Press');
    await user.type(screen.getByLabelText('Year'), '2014');
  };

  it('cites a book in Harvard under the OU scheme', async () => {
    const user = setup();
    await fillBook(user);

    expect(screen.getByText('Academic source — Harvard')).toBeInTheDocument();
    expect(citation('In-text citation')).toBe('(Bell, 2014)');
    expect(citation('In-text citation, narrative')).toBe('Bell (2014)');
    expect(citation('Reference list entry')).toBe(
      'Bell, J. (2014) Doing your research project. Open University Press.',
    );
  });

  it('re-cites the same book in OSCOLA when the mode changes', async () => {
    const user = setup();
    await fillBook(user);
    await user.click(screen.getByRole('button', { name: 'OSCOLA' }));

    expect(screen.getByText('Legal source — OSCOLA')).toBeInTheDocument();
    expect(citation('Footnote')).toBe(
      'J Bell, Doing your research project (Open University Press 2014).',
    );
    expect(citation('Bibliography entry')).toBe(
      'Bell J, Doing your research project (Open University Press 2014)',
    );
    expect(screen.queryByRole('heading', { name: 'In-text citation' })).toBeNull();
  });

  it('tells the reader legal sources have no end-of-essay entry under the OU scheme', async () => {
    const user = setup();
    await user.type(screen.getByLabelText('Case name'), 'Page v Smith');
    const report = group(/Law report/);
    await user.type(report.getByLabelText('Year'), '1996');
    await user.type(report.getByLabelText('Report series'), 'AC');
    await user.type(report.getByLabelText('First page'), '155');

    expect(screen.getByText(/appear only in footnotes under the OU scheme/i)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Bibliography entry' })).toBeNull();
  });

  it('hides OU module material in OSCOLA mode and leaves the form on a valid type', async () => {
    const user = setup();
    await chooseType(user, 'OU module material');
    expect(screen.getByLabelText('Module code')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'OSCOLA' }));

    expect(screen.queryByRole('option', { name: 'OU module material' })).toBeNull();
    expect(screen.getByLabelText('Case name')).toBeInTheDocument();
  });
});

describe('websites render differently by scheme', () => {
  const fillWebsite = async (user: ReturnType<typeof userEvent.setup>) => {
    await chooseType(user, 'Website');
    const authors = group('Authors');
    await user.click(authors.getByRole('button', { name: 'Add author' }));
    await user.type(authors.getByLabelText('Given names'), 'Sarah');
    await user.type(authors.getByLabelText('Surname'), 'Cole');
    await user.type(screen.getByLabelText('Page title'), 'Virtual Friend Fires Employee');
    await user.type(screen.getByLabelText('Website or publisher'), 'Naked Law');
    await user.type(screen.getByLabelText('URL'), 'www.nakedlaw.com/2009/05/index.html');
    fireEvent.change(screen.getByLabelText('Date published'), { target: { value: '2009-05-01' } });
    fireEvent.change(screen.getByLabelText('Date accessed'), { target: { value: '2009-11-19' } });
  };

  it('italicises the site name in OSCOLA and the page title in Harvard', async () => {
    const user = setup();
    await fillWebsite(user);

    // OU dual mode: a website is an academic source, so Harvard.
    expect(italics('Reference list entry')).toEqual(['Virtual Friend Fires Employee']);

    await user.click(screen.getByRole('button', { name: 'OSCOLA' }));
    expect(italics('Footnote')).toEqual(['Naked Law']);
    expect(citation('Footnote')).toContain("'Virtual Friend Fires Employee'");
  });
});

describe('chapters in edited books', () => {
  it('collects chapter authors and book editors separately', async () => {
    const user = setup();
    await chooseType(user, 'Chapter in an edited book');

    const authors = group('Chapter authors');
    await user.click(authors.getByRole('button', { name: 'Add author' }));
    await user.type(authors.getByLabelText('Given names'), 'Francis');
    await user.type(authors.getByLabelText('Surname'), 'Rose');

    const editors = group('Editors of the book');
    await user.click(editors.getByRole('button', { name: 'Add author' }));
    await user.type(editors.getByLabelText('Given names'), 'Andrew');
    await user.type(editors.getByLabelText('Surname'), 'Burrows');

    await user.type(screen.getByLabelText('Chapter title'), 'The Evolution of the Species');
    await user.type(screen.getByLabelText('Book title'), 'Mapping the Law');
    await user.type(screen.getByLabelText('Publisher'), 'OUP');
    await user.type(screen.getByLabelText('Year'), '2006');

    expect(citation('Reference list entry')).toBe(
      "Rose, F. (2006) 'The Evolution of the Species', in Burrows, A. (ed.) Mapping the Law. OUP.",
    );

    await user.click(screen.getByRole('button', { name: 'OSCOLA' }));
    expect(citation('Footnote')).toBe(
      "Francis Rose, 'The Evolution of the Species' in Andrew Burrows (ed), Mapping the Law (OUP 2006).",
    );
  });
});

describe('author rows', () => {
  it('adds and removes authors', async () => {
    const user = setup();
    await chooseType(user, 'Journal article');
    const authors = () => group('Authors');

    expect(authors().getByText(/No author recorded/)).toBeInTheDocument();

    await user.click(authors().getByRole('button', { name: 'Add author' }));
    await user.click(authors().getByRole('button', { name: 'Add author' }));
    expect(authors().getAllByLabelText('Surname')).toHaveLength(2);

    await user.click(authors().getByRole('button', { name: 'Remove author 1' }));
    expect(authors().getAllByLabelText('Surname')).toHaveLength(1);
  });

  it('takes an organisation as author without inverting it', async () => {
    const user = setup();
    await chooseType(user, 'Website');
    const authors = group('Authors');
    await user.click(authors.getByRole('button', { name: 'Add author' }));
    await user.selectOptions(authors.getByLabelText('Author kind'), 'corporate');
    await user.type(authors.getByLabelText('Organisation name'), 'Law Commission');
    await user.type(screen.getByLabelText('Page title'), 'Reforming Bribery');
    await user.type(screen.getByLabelText('URL'), 'www.example.com');
    fireEvent.change(screen.getByLabelText('Date accessed'), { target: { value: '2020-01-01' } });

    expect(citation('In-text citation')).toContain('(Law Commission,');
  });
});

describe('validation and the session list', () => {
  it('blocks adding a source until the errors are resolved', async () => {
    const user = setup();
    const add = () => screen.getByRole('button', { name: 'Add to sources' });

    await user.type(screen.getByLabelText('Case name'), 'Page v Smith');
    expect(add()).toBeDisabled();
    expect(screen.getAllByText(/needs a neutral citation, a law report/i).length).toBeGreaterThan(0);

    const report = group(/Law report/);
    await user.type(report.getByLabelText('Year'), '1996');
    await user.type(report.getByLabelText('Report series'), 'AC');
    await user.type(report.getByLabelText('First page'), '155');
    await user.type(group(/Other/).getByLabelText('Court'), 'HL');

    expect(add()).toBeEnabled();
  });

  it('marks the offending field invalid', async () => {
    const user = setup();
    await chooseType(user, 'Statutory instrument');
    await user.type(screen.getByLabelText('Name'), 'Eggs and Chicks (England) Regulations');
    await user.type(screen.getByLabelText('SI number'), 'nonsense');

    expect(screen.getByLabelText('Year')).toHaveAttribute('aria-invalid', 'true');
    // The message appears twice: inline on the field, and in the Checks panel.
    expect(screen.getAllByText(/SI numbers take the form year\/number/i)).toHaveLength(2);
  });

  it('adds a valid source to the session list and clears the form', async () => {
    const user = setup();
    await user.type(screen.getByLabelText('Case name'), 'Page v Smith');
    const report = group(/Law report/);
    await user.type(report.getByLabelText('Year'), '1996');
    await user.type(report.getByLabelText('Report series'), 'AC');
    await user.type(report.getByLabelText('First page'), '155');
    await user.type(group(/Other/).getByLabelText('Court'), 'HL');

    await user.click(screen.getByRole('button', { name: 'Add to sources' }));

    expect(screen.getByRole('heading', { name: /Your sources \(1\)/ })).toBeInTheDocument();
    expect(screen.getByText('Page v Smith [1996] AC 155 (HL)')).toBeInTheDocument();
    expect(screen.getByLabelText('Case name')).toHaveValue('');

    await user.click(screen.getByRole('button', { name: 'Remove source' }));
    expect(screen.getByRole('heading', { name: /Your sources \(0\)/ })).toBeInTheDocument();
  });

  it('keeps each type’s draft when you switch between them', async () => {
    const user = setup();
    await user.type(screen.getByLabelText('Case name'), 'Page v Smith');

    await chooseType(user, 'Book');
    await user.type(screen.getByLabelText('Title'), 'Torts and Rights');

    await chooseType(user, 'Case');
    expect(screen.getByLabelText('Case name')).toHaveValue('Page v Smith');

    await chooseType(user, 'Book');
    expect(screen.getByLabelText('Title')).toHaveValue('Torts and Rights');
  });
});


describe('persistence', () => {
  it('keeps saved sources across a reload', async () => {
    const user = setup();
    await addPageVSmith(user);
    expect(screen.getByRole('heading', { name: /Your sources \(1\)/ })).toBeInTheDocument();

    user.unmount();
    render(<App />);

    expect(screen.getByRole('heading', { name: /Your sources \(1\)/ })).toBeInTheDocument();
    expect(screen.getByText('Page v Smith [1996] AC 155 (HL)')).toBeInTheDocument();
  });

  it('keeps the chosen scheme across a reload', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'OSCOLA' }));

    user.unmount();
    render(<App />);

    expect(screen.getByRole('button', { name: 'OSCOLA' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('clears the library on request, and it stays cleared', async () => {
    const user = setup();
    await addPageVSmith(user);
    await user.click(screen.getByRole('button', { name: 'Clear all' }));

    expect(screen.getByRole('heading', { name: /Your sources \(0\)/ })).toBeInTheDocument();

    user.unmount();
    render(<App />);
    expect(screen.getByRole('heading', { name: /Your sources \(0\)/ })).toBeInTheDocument();
  });
});

describe('the assembled lists', () => {
  it('appears only once there is a source', async () => {
    const user = setup();
    expect(screen.queryByRole('heading', { name: 'Your lists' })).toBeNull();

    await addPageVSmith(user);
    expect(screen.getByRole('heading', { name: 'Your lists' })).toBeInTheDocument();
  });

  it('says legal sources are footnote-only under the OU scheme', async () => {
    const user = setup();
    await addPageVSmith(user);

    expect(screen.queryByRole('heading', { name: 'Table of cases' })).toBeNull();
    expect(
      screen.getByText(/1 legal source is cited in footnotes only/),
    ).toBeInTheDocument();
  });

  it('builds an OSCOLA table of cases when the scheme changes', async () => {
    const user = setup();
    await addPageVSmith(user);
    await user.click(screen.getByRole('button', { name: 'OSCOLA' }));

    const table = within(screen.getByRole('heading', { name: 'Table of cases' }).closest('section')!);
    expect(table.getByRole('listitem')).toHaveTextContent('Page v Smith [1996] AC 155 (HL)');
  });

  it('builds a Harvard reference list for an academic source', async () => {
    const user = setup();
    await chooseType(user, 'Book');
    const authors = group('Authors or editors');
    await user.click(authors.getByRole('button', { name: 'Add author' }));
    await user.type(authors.getByLabelText('Given names'), 'J');
    await user.type(authors.getByLabelText('Surname'), 'Bell');
    await user.type(screen.getByLabelText('Title'), 'Doing your research project');
    await user.type(screen.getByLabelText('Publisher'), 'Open University Press');
    await user.type(screen.getByLabelText('Year'), '2014');
    await user.click(screen.getByRole('button', { name: 'Add to sources' }));

    const list = within(screen.getByRole('heading', { name: 'Reference list' }).closest('section')!);
    expect(list.getByRole('listitem')).toHaveTextContent(
      'Bell, J. (2014) Doing your research project. Open University Press.',
    );
  });
});


describe('export and import', () => {
  const exportFile = (sources: unknown[], mode = 'oscola') =>
    new File(
      [JSON.stringify({ format: 'thetis-library', version: 1, mode, sources })],
      'thetis-sources.json',
      { type: 'application/json' },
    );

  const smith = {
    id: 'x1',
    type: 'case',
    caseName: 'Smith v Jones',
    report: { year: '1999', yearFormat: 'square', abbreviation: 'AC', firstPage: '1' },
    court: 'HL',
  };

  const importInput = () => screen.getByLabelText('Import');

  /** Scoped to the library panel: a source also appears in the assembled lists. */
  const sourceList = () =>
    within(screen.getByRole('heading', { name: /Your sources/ }).closest('section')!);

  afterEach(() => vi.restoreAllMocks());

  it('cannot export an empty library', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Export' })).toBeDisabled();
  });

  it('writes out the library as a dated JSON file', async () => {
    // jsdom implements neither object URLs nor anchor-triggered downloads.
    const createObjectURL = vi.fn((_blob: Blob) => 'blob:thetis');
    Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, configurable: true });
    Object.defineProperty(URL, 'revokeObjectURL', { value: vi.fn(), configurable: true });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        expect(this.download).toMatch(/^thetis-sources-\d{4}-\d{2}-\d{2}\.json$/);
      });

    const user = setup();
    await addPageVSmith(user);
    await user.click(screen.getByRole('button', { name: 'Export' }));

    expect(click).toHaveBeenCalledOnce();
    const blob = createObjectURL.mock.calls[0]![0];
    expect(JSON.parse(await blob.text())).toMatchObject({
      format: 'thetis-library',
      sources: [{ caseName: 'Page v Smith' }],
    });
    expect(screen.getByRole('status')).toHaveTextContent('Exported 1 source.');
  });

  it('adds imported sources to the library', async () => {
    const user = setup();
    await user.upload(importInput(), exportFile([smith]));

    expect(await screen.findByRole('status')).toHaveTextContent('Added 1 source.');
    expect(screen.getByRole('heading', { name: /Your sources \(1\)/ })).toBeInTheDocument();
    expect(sourceList().getByText(/Smith v Jones/)).toBeInTheDocument();
  });

  it('merges rather than replacing, and skips what is already held', async () => {
    const user = setup();
    await addPageVSmith(user);
    const existing = {
      id: 'y',
      type: 'case',
      caseName: 'Page v Smith',
      report: { year: '1996', yearFormat: 'square', abbreviation: 'AC', firstPage: '155' },
      court: 'HL',
      pinpoint: undefined,
      neutral: undefined,
    };
    await user.upload(importInput(), exportFile([existing, smith]));

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Added 1 source. 1 was already in your library.',
    );
    expect(screen.getByRole('heading', { name: /Your sources \(2\)/ })).toBeInTheDocument();
  });

  it('reports entries it could not read', async () => {
    const user = setup();
    await user.upload(importInput(), exportFile([smith, { type: 'nonsense' }]));

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Added 1 source. 1 entry could not be read.',
    );
  });

  it('explains a file that is not a Thetis export', async () => {
    const user = setup();
    const wrong = new File(['{"hello":"world"}'], 'other.json', { type: 'application/json' });
    await user.upload(importInput(), wrong);

    expect(await screen.findByRole('status')).toHaveTextContent(
      'That does not look like a Thetis export.',
    );
    expect(screen.getByRole('heading', { name: /Your sources \(0\)/ })).toBeInTheDocument();
  });

  it('explains a file that is not JSON at all', async () => {
    const user = setup();
    await user.upload(importInput(), new File(['not json {'], 'x.json'));

    expect(await screen.findByRole('status')).toHaveTextContent('That file is not valid JSON.');
  });

  it('adopts the scheme of a first import onto an empty library', async () => {
    const user = setup();
    expect(screen.getByRole('button', { name: 'OU Dual' })).toHaveAttribute('aria-pressed', 'true');

    await user.upload(importInput(), exportFile([smith], 'oscola'));

    expect(await screen.findByRole('status')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'OSCOLA' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('leaves the chosen scheme alone when merging into an existing library', async () => {
    const user = setup();
    await addPageVSmith(user);
    await user.upload(importInput(), exportFile([smith], 'oscola'));

    expect(await screen.findByRole('status')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'OU Dual' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('keeps imported sources across a reload', async () => {
    const user = setup();
    await user.upload(importInput(), exportFile([smith]));
    expect(await screen.findByRole('status')).toBeInTheDocument();

    user.unmount();
    render(<App />);

    expect(sourceList().getByText(/Smith v Jones/)).toBeInTheDocument();
  });
});


describe('judge attribution', () => {
  it('adds the judge in brackets after the pinpoint (2.1.7)', async () => {
    const user = setup();
    await user.type(screen.getByLabelText('Case name'), 'Arscott v The Coal Authority');
    const neutral = group(/Neutral citation/);
    await user.type(neutral.getByLabelText('Year'), '2004');
    await user.type(neutral.getByLabelText('Court'), 'EWCA Civ');
    await user.type(neutral.getByLabelText('Judgment number'), '892');
    const report = group(/Law report/);
    await user.type(report.getByLabelText('Year'), '2005');
    await user.type(report.getByLabelText('Report series'), 'Env LR');
    await user.type(report.getByLabelText('First page'), '6');

    const other = group(/Other/);
    await user.type(other.getByLabelText('Pinpoint'), '27');
    await user.type(other.getByLabelText('Judge'), 'Laws LJ');

    expect(citation('Footnote')).toBe(
      'Arscott v The Coal Authority [2004] EWCA Civ 892, [2005] Env LR 6 [27] (Laws LJ).',
    );
  });

  it('names one judge once across several passages', async () => {
    const user = setup();
    await user.type(screen.getByLabelText('Case name'), 'Callery v Gray');
    const neutral = group(/Neutral citation/);
    await user.type(neutral.getByLabelText('Year'), '2001');
    await user.type(neutral.getByLabelText('Court'), 'EWCA Civ');
    await user.type(neutral.getByLabelText('Judgment number'), '1117');

    const other = group(/Other/);
    await user.type(other.getByLabelText('Pinpoint'), '42, 45');
    await user.type(other.getByLabelText('Judge'), 'Lord Woolf CJ');

    expect(citation('Footnote')).toBe(
      'Callery v Gray [2001] EWCA Civ 1117 [42], [45] (Lord Woolf CJ).',
    );
  });
});

describe('the footnote sequence', () => {
  /** Add a second, distinct case so ordering can be exercised. */
  async function addBuntVTilley(user: ReturnType<typeof setup>) {
    await user.type(screen.getByLabelText('Case name'), 'Bunt v Tilley');
    const neutral = group(/Neutral citation/);
    await user.type(neutral.getByLabelText('Year'), '2006');
    await user.type(neutral.getByLabelText('Court'), 'EWHC');
    await user.type(neutral.getByLabelText('Judgment number'), '407');
    await user.click(screen.getByRole('button', { name: 'Add to sources' }));
  }

  const panel = () =>
    within(screen.getByRole('heading', { name: 'Footnote sequence' }).closest('section')!);

  const footnoteTexts = () =>
    panel()
      .getAllByRole('listitem')
      .map((li) => li.querySelector('.footnote-text')?.textContent ?? '');

  it('stays hidden until there is a source to cite', async () => {
    const user = setup();
    expect(screen.queryByRole('heading', { name: 'Footnote sequence' })).toBeNull();
    await addPageVSmith(user);
    expect(screen.getByRole('heading', { name: 'Footnote sequence' })).toBeInTheDocument();
  });

  it('uses ibid for an immediate repeat', async () => {
    const user = setup();
    await addPageVSmith(user);
    const add = panel().getByRole('button', { name: 'Add footnote' });
    await user.click(add);
    await user.click(add);

    expect(footnoteTexts()).toEqual(['Page v Smith [1996] AC 155 (HL).', 'ibid.']);
  });

  it('cross-cites when the repeat is not immediate', async () => {
    const user = setup();
    await addPageVSmith(user);
    await addBuntVTilley(user);

    const select = panel().getByLabelText('Source to cite');
    const add = () => panel().getByRole('button', { name: 'Add footnote' });
    const [page, bunt] = panel().getAllByRole('option').map((o) => (o as HTMLOptionElement).value);

    await user.selectOptions(select, page!);
    await user.click(add());
    await user.selectOptions(select, bunt!);
    await user.click(add());
    await user.selectOptions(select, page!);
    await user.click(add());

    // 2.1.2 shortens to the party standing first, so this is "Page", not "Page v Smith".
    expect(footnoteTexts()[2]).toBe('Page (n 1).');
  });

  it('renumbers the cross-citation when footnotes are reordered', async () => {
    const user = setup();
    await addPageVSmith(user);
    await addBuntVTilley(user);

    const select = panel().getByLabelText('Source to cite');
    const add = () => panel().getByRole('button', { name: 'Add footnote' });
    const [page, bunt] = panel().getAllByRole('option').map((o) => (o as HTMLOptionElement).value);

    // Page, Bunt, Bunt, Page.
    for (const id of [page!, bunt!, bunt!, page!]) {
      await user.selectOptions(select, id);
      await user.click(add());
    }
    expect(footnoteTexts()).toEqual([
      'Page v Smith [1996] AC 155 (HL).',
      'Bunt v Tilley [2006] EWHC 407.',
      'ibid.',
      'Page (n 1).',
    ]);

    // Swap the first two: the full citation of Page moves to footnote 2, and
    // Bunt is no longer immediately repeated.
    await user.click(panel().getByRole('button', { name: 'Move footnote 1 down' }));
    expect(footnoteTexts()).toEqual([
      'Bunt v Tilley [2006] EWHC 407.',
      'Page v Smith [1996] AC 155 (HL).',
      'Bunt (n 1).',
      'Page (n 2).',
    ]);
  });

  it('takes a pinpoint per footnote', async () => {
    const user = setup();
    await addPageVSmith(user);
    const add = panel().getByRole('button', { name: 'Add footnote' });
    await user.click(add);
    await user.click(add);

    await user.type(panel().getByLabelText('Pinpoint for footnote 2'), '165');
    expect(footnoteTexts()[1]).toBe('ibid 165.');
  });

  it('takes a judge per footnote', async () => {
    const user = setup();
    await addPageVSmith(user);
    const add = panel().getByRole('button', { name: 'Add footnote' });
    await user.click(add);

    await user.type(panel().getByLabelText('Pinpoint for footnote 1'), '165');
    await user.type(panel().getByLabelText('Judge for footnote 1'), 'Lord Lloyd');

    // No neutral citation, so the pinpoint is a page rather than a paragraph.
    expect(footnoteTexts()[0]).toBe('Page v Smith [1996] AC 155 (HL) 165 (Lord Lloyd).');
  });

  it('labels which rule produced each footnote', async () => {
    const user = setup();
    await addPageVSmith(user);
    const add = panel().getByRole('button', { name: 'Add footnote' });
    await user.click(add);
    await user.click(add);

    // Scoped to the badges: "ibid" also appears in the panel's own explanation.
    const badges = panel()
      .getAllByText(/^(full citation|ibid|cross-citation)$/, { selector: '.footnote-form' })
      .map((el) => el.textContent);
    expect(badges).toEqual(['full citation', 'ibid']);
  });

  it('keeps the sequence across a reload', async () => {
    const user = setup();
    await addPageVSmith(user);
    await user.click(panel().getByRole('button', { name: 'Add footnote' }));

    user.unmount();
    render(<App />);

    expect(footnoteTexts()).toEqual(['Page v Smith [1996] AC 155 (HL).']);
  });
});


describe('Word export', () => {
  afterEach(() => vi.restoreAllMocks());

  it('writes a dated .docx holding the footnotes and the lists', async () => {
    const createObjectURL = vi.fn((_blob: Blob) => 'blob:thetis');
    Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, configurable: true });
    Object.defineProperty(URL, 'revokeObjectURL', { value: vi.fn(), configurable: true });
    let downloadName = '';
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      downloadName = this.download;
    });

    const user = setup();
    await addPageVSmith(user);
    const lists = within(
      screen.getByRole('heading', { name: 'Your lists' }).closest('section')!,
    );
    await user.click(lists.getByRole('button', { name: 'Export to Word' }));

    // Packing is asynchronous, so wait for the finished message, not the first one.
    expect(await lists.findByText('Exported your lists.')).toBeInTheDocument();
    expect(downloadName).toMatch(/^thetis-citations-\d{4}-\d{2}-\d{2}\.docx$/);

    // A real Word file: a zip whose parts include the footnote store.
    const blob = createObjectURL.mock.calls[0]![0];
    const text = new TextDecoder('latin1').decode(new Uint8Array(await blob.arrayBuffer()));
    expect(text).toContain('word/document.xml');
    expect(text).toContain('word/footnotes.xml');
  });

  it('counts the footnotes it exported', async () => {
    Object.defineProperty(URL, 'createObjectURL', { value: vi.fn(() => 'blob:x'), configurable: true });
    Object.defineProperty(URL, 'revokeObjectURL', { value: vi.fn(), configurable: true });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const user = setup();
    await addPageVSmith(user);
    const footnotePanel = within(
      screen.getByRole('heading', { name: 'Footnote sequence' }).closest('section')!,
    );
    await user.click(footnotePanel.getByRole('button', { name: 'Add footnote' }));

    const lists = within(
      screen.getByRole('heading', { name: 'Your lists' }).closest('section')!,
    );
    await user.click(lists.getByRole('button', { name: 'Export to Word' }));

    expect(await lists.findByText('Exported 1 footnote and your lists.')).toBeInTheDocument();
  });
});


describe('editing a saved source', () => {
  const sourceList = () =>
    within(screen.getByRole('heading', { name: /Your sources/ }).closest('section')!);

  it('loads a saved source back into the form', async () => {
    const user = setup();
    await addPageVSmith(user);
    expect(screen.getByLabelText('Case name')).toHaveValue('');

    await user.click(sourceList().getByRole('button', { name: /^Edit/ }));

    expect(screen.getByLabelText('Case name')).toHaveValue('Page v Smith');
    expect(group(/Law report/).getByLabelText('First page')).toHaveValue('155');
    expect(group(/Other/).getByLabelText('Court')).toHaveValue('HL');
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
  });

  it('replaces the source rather than adding a second one', async () => {
    const user = setup();
    await addPageVSmith(user);
    await user.click(sourceList().getByRole('button', { name: /^Edit/ }));

    await user.clear(group(/Law report/).getByLabelText('First page'));
    await user.type(group(/Law report/).getByLabelText('First page'), '165');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(screen.getByRole('heading', { name: /Your sources \(1\)/ })).toBeInTheDocument();
    expect(sourceList().getByText('Page v Smith [1996] AC 165 (HL)')).toBeInTheDocument();
    // The form is empty again and back to adding.
    expect(screen.getByLabelText('Case name')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Add to sources' })).toBeInTheDocument();
  });

  it('keeps the edited source in its place in the footnote sequence', async () => {
    const user = setup();
    await addPageVSmith(user);
    const panel = within(
      screen.getByRole('heading', { name: 'Footnote sequence' }).closest('section')!,
    );
    await user.click(panel.getByRole('button', { name: 'Add footnote' }));

    await user.click(sourceList().getByRole('button', { name: /^Edit/ }));
    await user.clear(screen.getByLabelText('Case name'));
    await user.type(screen.getByLabelText('Case name'), 'Page v Smith (No 2)');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    // The id is preserved, so the footnote still resolves to the source.
    expect(
      panel.getAllByRole('listitem')[0]?.querySelector('.footnote-text')?.textContent,
    ).toBe('Page v Smith (No 2) [1996] AC 155 (HL).');
  });

  it('abandons the edit on Cancel, leaving the source untouched', async () => {
    const user = setup();
    await addPageVSmith(user);
    await user.click(sourceList().getByRole('button', { name: /^Edit/ }));
    await user.clear(screen.getByLabelText('Case name'));
    await user.type(screen.getByLabelText('Case name'), 'Something else');

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.getByLabelText('Case name')).toHaveValue('');
    expect(sourceList().getByText('Page v Smith [1996] AC 155 (HL)')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save changes' })).toBeNull();
  });

  it('abandons the edit when the source type changes', async () => {
    const user = setup();
    await addPageVSmith(user);
    await user.click(sourceList().getByRole('button', { name: /^Edit/ }));

    await chooseType(user, 'Book');
    await chooseType(user, 'Case');

    expect(screen.getByLabelText('Case name')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Add to sources' })).toBeInTheDocument();
  });

  it('survives removing the source being edited', async () => {
    const user = setup();
    await addPageVSmith(user);
    await user.click(sourceList().getByRole('button', { name: /^Edit/ }));
    await user.click(sourceList().getByRole('button', { name: 'Remove source' }));

    expect(screen.getByRole('heading', { name: /Your sources \(0\)/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add to sources' })).toBeInTheDocument();
  });
});

describe('statutory instruments', () => {
  it('switches the number label to SR & O (2.5.1)', async () => {
    const user = setup();
    await chooseType(user, 'Statutory instrument');
    await user.selectOptions(
      screen.getByLabelText('Numbering'),
      screen.getByRole('option', { name: /^SR & O/ }),
    );
    await user.type(screen.getByLabelText('Name'), 'Hollow-ware and Galvanising Welfare Order');
    await user.type(screen.getByLabelText('Year'), '1921');
    await user.type(screen.getByLabelText('SI number'), '1921/2032');

    expect(citation('Footnote')).toBe(
      'Hollow-ware and Galvanising Welfare Order 1921, SR & O 1921/2032.',
    );
  });

  it('cites the rules of court by name and pinpoint alone (2.5.2)', async () => {
    const user = setup();
    await chooseType(user, 'Statutory instrument');
    await user.selectOptions(
      screen.getByLabelText('Numbering'),
      screen.getByRole('option', { name: /^Rules of court/ }),
    );
    await user.type(screen.getByLabelText('Name'), 'CPR');
    await user.type(screen.getByLabelText('Provision'), '5.2(1)(b)');

    expect(citation('Footnote')).toBe('CPR 5.2(1)(b).');
    expect(screen.getByRole('button', { name: 'Add to sources' })).toBeEnabled();
  });
});

describe('unreported cases', () => {
  it('cites the court and date of judgment in place of a report (2.1.4)', async () => {
    const user = setup();
    await user.type(screen.getByLabelText('Case name'), 'Stubbs v Sayer');
    const other = group(/Other/);
    await user.type(other.getByLabelText('Court'), 'CA');
    fireEvent.change(other.getByLabelText('Date of judgment'), {
      target: { value: '1990-11-08' },
    });

    expect(citation('Footnote')).toBe('Stubbs v Sayer (CA, 8 November 1990).');
    expect(screen.getByRole('button', { name: 'Add to sources' })).toBeEnabled();
  });

  it('asks for the court when only a date is given', async () => {
    const user = setup();
    await user.type(screen.getByLabelText('Case name'), 'Stubbs v Sayer');
    fireEvent.change(group(/Other/).getByLabelText('Date of judgment'), {
      target: { value: '1990-11-08' },
    });

    expect(screen.getAllByText(/unreported case needs the court/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Add to sources' })).toBeDisabled();
  });
});

describe('finding a source in the library', () => {
  /** Two sources of different types, so there is something to narrow. */
  const addTwo = async (user: ReturnType<typeof setup>) => {
    await addPageVSmith(user);
    await chooseType(user, 'Book');
    const authors = group('Authors or editors');
    await user.click(authors.getByRole('button', { name: 'Add author' }));
    await user.type(authors.getByLabelText('Given names'), 'J');
    await user.type(authors.getByLabelText('Surname'), 'Bell');
    await user.type(screen.getByLabelText('Title'), 'Doing your research project');
    await user.type(screen.getByLabelText('Publisher'), 'Open University Press');
    await user.type(screen.getByLabelText('Year'), '2014');
    await user.click(screen.getByRole('button', { name: 'Add to sources' }));
  };

  /** The citation text of each row now listed. */
  const listed = () => {
    const library = screen.getByRole('heading', { name: /Your sources/ }).closest('section');
    return [...(library?.querySelectorAll('li') ?? [])].map(
      (li) => li.querySelectorAll('span')[1]?.textContent ?? '',
    );
  };

  it('offers nothing to search until there is a source', async () => {
    const user = setup();
    expect(screen.queryByLabelText('Search sources')).toBeNull();

    await addPageVSmith(user);
    expect(screen.getByLabelText('Search sources')).toBeInTheDocument();
  });

  it('narrows the list to what is typed, and says how much is hidden', async () => {
    const user = setup();
    await addTwo(user);
    expect(listed()).toHaveLength(2);

    await user.type(screen.getByLabelText('Search sources'), 'smith');
    expect(listed()).toEqual(['Page v Smith [1996] AC 155 (HL)']);
    expect(screen.getByText('Showing 1 of 2.')).toBeInTheDocument();
  });

  it('searches the citation as it is rendered in the current scheme', async () => {
    const user = setup();
    await addTwo(user);
    // The OU scheme renders the book in Harvard: "Bell, J. (2014) …".
    await user.type(screen.getByLabelText('Search sources'), 'bell, j.');
    expect(listed()).toEqual([
      'Bell, J. (2014) Doing your research project. Open University Press.',
    ]);
  });

  it('filters by category', async () => {
    const user = setup();
    await addTwo(user);

    await user.selectOptions(screen.getByLabelText('Filter by category'), 'legal');
    expect(listed()).toEqual(['Page v Smith [1996] AC 155 (HL)']);

    await user.selectOptions(screen.getByLabelText('Filter by category'), 'academic');
    expect(listed()).toHaveLength(1);
    expect(listed()[0]).toMatch(/^Bell, J\./);
  });

  it('offers only the types the library holds', async () => {
    const user = setup();
    await addTwo(user);

    const filter = screen.getByLabelText('Filter by type');
    expect(
      within(filter)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['Any type', 'Case', 'Book']);

    await user.selectOptions(filter, 'case');
    expect(listed()).toEqual(['Page v Smith [1996] AC 155 (HL)']);
  });

  it('says when nothing matches, and offers the way back', async () => {
    const user = setup();
    await addTwo(user);
    await user.type(screen.getByLabelText('Search sources'), 'donoghue');

    expect(listed()).toEqual([]);
    expect(screen.getByText(/No source matches/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(listed()).toHaveLength(2);
    expect(screen.getByLabelText('Search sources')).toHaveValue('');
  });

  it('removes the right source while the list is filtered', async () => {
    const user = setup();
    await addTwo(user);
    await user.type(screen.getByLabelText('Search sources'), 'smith');

    await user.click(screen.getByRole('button', { name: 'Remove source' }));
    expect(screen.getByRole('heading', { name: /Your sources \(1\)/ })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(listed()[0]).toMatch(/^Bell, J\./);
  });
});
