import { describe, expect, it } from 'vitest';
import { formatSource } from './citations';
import { toPlainText } from './model/segments';
import type { BookSource, CaseSource, OuModuleMaterialSource } from './model/types';

const page: CaseSource = {
  id: 'c', type: 'case', caseName: 'Page v Smith',
  report: { year: '1996', yearFormat: 'square', abbreviation: 'AC', firstPage: '155' },
  court: 'HL',
};

const bell: BookSource = {
  id: 'b', type: 'book', authors: [{ kind: 'person', given: 'J', surname: 'Bell' }],
  authorRole: 'author', title: 'Doing your research project',
  publisher: 'Open University Press', year: '2014',
};

describe('OSCOLA mode', () => {
  it('formats every source in OSCOLA', () => {
    const out = formatSource(bell, 'oscola');
    expect(out.style).toBe('oscola');
    if (out.style !== 'oscola') return;
    expect(toPlainText(out.footnote)).toBe(
      'J Bell, Doing your research project (Open University Press 2014).',
    );
  });

  it('gives legal sources a table entry', () => {
    const out = formatSource(page, 'oscola');
    expect(out.style === 'oscola' && out.bibliography).toBeDefined();
  });
});

describe('OU dual mode', () => {
  it('keeps legal sources in OSCOLA', () => {
    const out = formatSource(page, 'ou-dual');
    expect(out.style).toBe('oscola');
    if (out.style !== 'oscola') return;
    expect(toPlainText(out.footnote)).toBe('Page v Smith [1996] AC 155 (HL).');
  });

  // The OU scheme puts legal sources in footnotes only; the end-of-essay list
  // is the Harvard reference list alone.
  it('gives legal sources no end-of-essay entry', () => {
    const out = formatSource(page, 'ou-dual');
    expect(out.style === 'oscola' && out.bibliography).toBeUndefined();
  });

  it('switches academic sources to Harvard', () => {
    const out = formatSource(bell, 'ou-dual');
    expect(out.style).toBe('harvard');
    if (out.style !== 'harvard') return;
    expect(toPlainText(out.inText)).toBe('(Bell, 2014)');
    expect(toPlainText(out.inTextNarrative)).toBe('Bell (2014)');
    expect(toPlainText(out.reference)).toBe(
      'Bell, J. (2014) Doing your research project. Open University Press.',
    );
  });

  it('takes the page pinpoint from the source for the in-text citation', () => {
    const out = formatSource({ ...bell, pinpoint: { kind: 'page', value: '5' } }, 'ou-dual');
    expect(out.style === 'harvard' && toPlainText(out.inText)).toBe('(Bell, 2014, p. 5)');
  });

  it('formats OU module material, which has no OSCOLA form', () => {
    const unit: OuModuleMaterialSource = {
      id: 'ou', type: 'ouModuleMaterial', authors: [], year: '2025',
      itemTitle: 'Unit 4: Rules and regulations', moduleCode: 'W376',
      moduleTitle: 'Law for life', url: 'https://learn2.open.ac.uk/x', accessDate: '2032-03-07',
    };
    const out = formatSource(unit, 'ou-dual');
    expect(out.style === 'harvard' && toPlainText(out.inText)).toBe('(The Open University, 2025)');
  });
});
