import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CitationPreview } from './CitationPreview';
import type { ActSource, BookSource, CaseSource, CitationMode, Source } from '../citations';

const renderPreview = (source: Source | undefined, mode: CitationMode = 'oscola') =>
  render(<CitationPreview source={source} mode={mode} issues={[]} />);

const austin: CaseSource = {
  id: 'c1',
  type: 'case',
  caseName: 'Austin v Commissioner of Police for the Metropolis',
  neutral: { year: '2009', court: 'UKHL', number: '5' },
  report: { year: '2009', yearFormat: 'square', abbreviation: 'AC', firstPage: '564' },
};

const bell: BookSource = {
  id: 'b1',
  type: 'book',
  authors: [{ kind: 'person', given: 'J', surname: 'Bell' }],
  authorRole: 'author',
  title: 'Doing your research project',
  publisher: 'Open University Press',
  year: '2014',
};

const block = (heading: string) =>
  screen.getByRole('heading', { name: heading }).closest('section') as HTMLElement;

describe('CitationPreview', () => {
  it('prompts for input when there is no source yet', () => {
    renderPreview(undefined);
    expect(screen.getByText(/Fill in the form/)).toBeInTheDocument();
  });

  it('shows footnote, bibliography entry and named-in-text form for a case', () => {
    renderPreview(austin);

    expect(screen.getByText('Legal source — OSCOLA')).toBeInTheDocument();
    expect(block('Footnote')).toHaveTextContent(
      'Austin v Commissioner of Police for the Metropolis [2009] UKHL 5, [2009] AC 564.',
    );
    expect(screen.getByRole('heading', { name: 'Bibliography entry' })).toBeInTheDocument();
    expect(block('Footnote instead')).toHaveTextContent('[2009] UKHL 5, [2009] AC 564.');
  });

  it('tells the reader no footnote is needed for an Act named in full in the text', () => {
    const act: ActSource = {
      id: 'a1', type: 'act', shortTitle: 'Race Relations Act', year: '1976', provision: 's 5(1)(a)',
    };
    renderPreview(act);

    expect(block('In your text')).toHaveTextContent(
      'section 5(1)(a) of the Race Relations Act 1976',
    );
    expect(screen.getByText('No footnote needed at all.')).toBeInTheDocument();
  });

  it('says a secondary source is always footnoted in full', () => {
    renderPreview(bell);
    expect(screen.getByText(/OSCOLA 1.1.3/)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Footnote instead' })).toBeNull();
  });

  it('switches to Harvard panels for an academic source in OU dual mode', () => {
    renderPreview(bell, 'ou-dual');

    expect(screen.getByText('Academic source — Harvard')).toBeInTheDocument();
    expect(block('In-text citation')).toHaveTextContent('(Bell, 2014)');
    expect(block('Reference list entry')).toHaveTextContent(
      'Bell, J. (2014) Doing your research project. Open University Press.',
    );
    expect(screen.queryByRole('heading', { name: 'Footnote' })).toBeNull();
  });
});

describe('copying', () => {
  it('copies the plain text of a citation, without markup', async () => {
    const user = userEvent.setup();
    renderPreview(austin);

    await user.click(within(block('Footnote')).getByRole('button', { name: 'Copy' }));

    expect(await navigator.clipboard.readText()).toBe(
      'Austin v Commissioner of Police for the Metropolis [2009] UKHL 5, [2009] AC 564.',
    );
  });

  it('copies Markdown with the case name emphasised', async () => {
    const user = userEvent.setup();
    renderPreview(austin);

    await user.click(within(block('Footnote')).getByRole('button', { name: 'Copy Markdown' }));

    expect(await navigator.clipboard.readText()).toBe(
      '*Austin v Commissioner of Police for the Metropolis* [2009] UKHL 5, [2009] AC 564.',
    );
  });

  it('confirms the copy to the reader', async () => {
    const user = userEvent.setup();
    renderPreview(austin);

    const button = within(block('Footnote')).getByRole('button', { name: 'Copy' });
    await user.click(button);

    expect(within(block('Footnote')).getByRole('button', { name: 'Copied' })).toBeInTheDocument();
  });
});
