import { describe, expect, it } from 'vitest';
import type { ActSource } from '../../model/types';
import { bibliography, footnote } from './helpers';

const act = (fields: Omit<ActSource, 'id' | 'type'>): ActSource => ({
  id: 'a1',
  type: 'act',
  ...fields,
});

// Examples taken from the OSCOLA 4th edn quick reference guide.
describe('UK Acts — OSCOLA 4th edn examples', () => {
  it('cites the short title and year with no comma between them', () => {
    expect(footnote(act({ shortTitle: 'Act of Supremacy', year: '1558' }))).toBe(
      'Act of Supremacy 1558.',
    );
  });

  it('cites a provision after a comma', () => {
    const source = act({
      shortTitle: 'Human Rights Act',
      year: '1998',
      provision: 's 15(1)(b)',
    });

    expect(footnote(source)).toBe('Human Rights Act 1998, s 15(1)(b).');
  });

  it('does not italicise the title (2.4.1)', () => {
    const source = act({ shortTitle: 'Human Rights Act', year: '1998' });
    expect(footnote(source)).toBe('Human Rights Act 1998.');
  });

  it('keeps brackets in a short title (2.4.1)', () => {
    const source = act({ shortTitle: 'Shipping and Trading Interests (Protection) Act', year: '1995' });
    expect(footnote(source)).toBe('Shipping and Trading Interests (Protection) Act 1995.');
  });

  it('cites a bare section (2.4.2)', () => {
    const source = act({ shortTitle: 'Consumer Protection Act', year: '1987', provision: 's 2' });
    expect(footnote(source)).toBe('Consumer Protection Act 1987, s 2.');
  });

  it('cites several sections with the plural abbreviation (2.4.2)', () => {
    const source = act({
      shortTitle: 'Criminal Attempts Act', year: '1981', provision: 'ss 1(1) and 4(3)',
    });
    expect(footnote(source)).toBe('Criminal Attempts Act 1981, ss 1(1) and 4(3).');
  });

  it('cites a paragraph of a subsection using only the section abbreviation (2.4.2)', () => {
    const source = act({
      shortTitle: 'Sexual Offences Act', year: '2003', provision: 's 1(1)(c)',
    });
    expect(footnote(source)).toBe('Sexual Offences Act 2003, s 1(1)(c).');
  });
});

describe('UK Acts — table of legislation', () => {
  it('drops the provision and the closing full stop', () => {
    const source = act({
      shortTitle: 'Human Rights Act',
      year: '1998',
      provision: 's 15(1)(b)',
    });

    expect(bibliography(source)).toBe('Human Rights Act 1998');
  });
});
