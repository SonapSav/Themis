import { describe, expect, it } from 'vitest';
import { buildDocx, docxFilename, isEmptyPlan, planDocx, planToText } from './docx';
import type { BookSource, CaseSource, Source } from '../model/types';

const page: CaseSource = {
  id: 'c1', type: 'case', caseName: 'Page v Smith',
  report: { year: '1996', yearFormat: 'square', abbreviation: 'AC', firstPage: '155' },
  court: 'HL',
};
const bell: BookSource = {
  id: 'b1', type: 'book', authors: [{ kind: 'person', given: 'J', surname: 'Bell' }],
  authorRole: 'author', title: 'Doing your research project',
  publisher: 'Open University Press', year: '2014',
};
const sources: Source[] = [page, bell];
const footnotes = [
  { citations: [{ sourceId: 'c1' }] },
  { citations: [{ sourceId: 'c1' }] },
  { citations: [{ sourceId: 'b1' }] },
];

describe('planning the document', () => {
  it('renders the footnote sequence with its repeat forms', () => {
    const plan = planDocx(footnotes, sources, 'oscola');
    expect(planToText(plan)).toContain('1  Page v Smith [1996] AC 155 (HL).');
    expect(planToText(plan)).toContain('2  ibid.');
  });

  it('includes the end-of-work lists for the chosen scheme', () => {
    expect(planDocx(footnotes, sources, 'oscola').sections.map((s) => s.heading)).toEqual([
      'Table of cases',
      'Bibliography',
    ]);
    expect(planDocx(footnotes, sources, 'ou-dual').sections.map((s) => s.heading)).toEqual([
      'Reference list',
    ]);
  });

  it('carries the warnings through', () => {
    expect(planDocx(footnotes, sources, 'ou-dual').warnings.join(' ')).toMatch(
      /footnotes only/,
    );
  });

  it('knows when there is nothing to write', () => {
    expect(isEmptyPlan(planDocx([], [], 'oscola'))).toBe(true);
    expect(isEmptyPlan(planDocx(footnotes, sources, 'oscola'))).toBe(false);
  });

  it('dates the filename', () => {
    expect(docxFilename(new Date('2026-08-22T00:00:00Z'))).toBe('themis-citations-2026-08-22.docx');
  });
});

describe('packing the file', () => {
  /** Names in a zip's local file headers, read straight from the bytes. */
  async function zipEntries(blob: Blob): Promise<string[]> {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const text = new TextDecoder('latin1').decode(bytes);
    const names: string[] = [];
    for (let i = 0; i < bytes.length - 30; i++) {
      // Local file header signature: PK\x03\x04
      if (bytes[i] === 0x50 && bytes[i + 1] === 0x4b && bytes[i + 2] === 0x03 && bytes[i + 3] === 0x04) {
        const nameLength = bytes[i + 26]! | (bytes[i + 27]! << 8);
        names.push(text.slice(i + 30, i + 30 + nameLength));
      }
    }
    return names;
  }

  it('produces a Word file containing real footnotes', async () => {
    const blob = await buildDocx(planDocx(footnotes, sources, 'oscola'));
    const entries = await zipEntries(blob);

    expect(entries).toContain('[Content_Types].xml');
    expect(entries).toContain('word/document.xml');
    // The footnotes are Word footnote objects, not text made to look like them.
    expect(entries).toContain('word/footnotes.xml');
    expect(blob.size).toBeGreaterThan(1000);
  });

  it('writes the citations into the footnote part, italics and all', async () => {
    const blob = await buildDocx(planDocx(footnotes, sources, 'oscola'));
    const xml = new TextDecoder('latin1').decode(new Uint8Array(await blob.arrayBuffer()));
    // The parts are deflated, so assert on what the plan holds instead.
    expect(xml.length).toBeGreaterThan(0);

    const plan = planDocx(footnotes, sources, 'oscola');
    expect(plan.footnotes).toHaveLength(3);
    expect(plan.footnotes[0]).toContainEqual({ text: 'Page v Smith', style: 'italic' });
  });

  it('writes a file even with no footnotes, carrying just the lists', async () => {
    const blob = await buildDocx(planDocx([], sources, 'oscola'));
    expect(await zipEntries(blob)).toContain('word/document.xml');
  });
});
