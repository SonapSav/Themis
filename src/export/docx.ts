/**
 * Word export.
 *
 * The footnote sequence becomes real Word footnotes, not text that looks like
 * them: selecting a footnote marker in Word and copying it carries the footnote
 * across to another document and renumbers it, so the exported file works as a
 * skeleton to lift citations out of. The end-of-work lists follow as ordinary
 * headed paragraphs with a hanging indent.
 */
import { assemble } from '../bibliography';
import { renderFootnotes, type FootnoteInput } from '../document';
import { toPlainText, type FormattedCitation } from '../model/segments';
import type { CitationMode, Source } from '../model/types';

export interface DocxSection {
  readonly heading: string;
  readonly note: string;
  readonly entries: readonly FormattedCitation[];
}

export interface DocxPlan {
  readonly title: string;
  readonly intro: string;
  /** In order; index 0 is footnote 1. */
  readonly footnotes: readonly FormattedCitation[];
  readonly sections: readonly DocxSection[];
  readonly warnings: readonly string[];
}

/**
 * The whole document as plain data, so what goes into the file can be tested
 * without packing one.
 */
export function planDocx(
  footnotes: readonly FootnoteInput[],
  sources: readonly Source[],
  mode: CitationMode,
): DocxPlan {
  const assembled = assemble(sources, mode);
  return {
    title: 'Thetis citations',
    intro:
      'Each line below carries a real Word footnote. Copy a footnote marker into your own ' +
      'document and Word will bring the footnote with it and renumber it.',
    footnotes: renderFootnotes(footnotes, sources).map((f) => f.citation),
    sections: assembled.sections.map((section) => ({
      heading: section.title,
      note: section.note,
      entries: section.entries.map((e) => e.citation),
    })),
    warnings: assembled.warnings,
  };
}

/** `thetis-citations-2026-08-22.docx`. */
export function docxFilename(now: Date): string {
  return `thetis-citations-${now.toISOString().slice(0, 10)}.docx`;
}

/** True where there is anything worth exporting. */
export const isEmptyPlan = (plan: DocxPlan): boolean =>
  plan.footnotes.length === 0 && plan.sections.length === 0;

/**
 * Pack the plan into a .docx. The `docx` library is loaded on demand: writing
 * the OOXML container by hand would be a lot of fragile code, and this keeps it
 * out of the initial bundle.
 */
export async function buildDocx(plan: DocxPlan): Promise<Blob> {
  const { Document, Packer, Paragraph, TextRun, FootnoteReferenceRun, HeadingLevel } =
    await import('docx');

  const runs = (citation: FormattedCitation) =>
    citation.map((seg) => new TextRun({ text: seg.text, italics: seg.style === 'italic' }));

  const footnotes = Object.fromEntries(
    plan.footnotes.map((citation, i) => [
      i + 1,
      { children: [new Paragraph({ children: runs(citation) })] },
    ]),
  );

  const body: InstanceType<typeof Paragraph>[] = [
    new Paragraph({ text: plan.title, heading: HeadingLevel.HEADING_1 }),
  ];

  if (plan.footnotes.length > 0) {
    body.push(
      new Paragraph({ text: 'Footnotes', heading: HeadingLevel.HEADING_2 }),
      new Paragraph({ children: [new TextRun({ text: plan.intro, italics: true })] }),
      ...plan.footnotes.map(
        (_, i) =>
          new Paragraph({
            children: [new TextRun(`Citation ${i + 1}`), new FootnoteReferenceRun(i + 1)],
          }),
      ),
    );
  }

  for (const section of plan.sections) {
    body.push(
      new Paragraph({ text: section.heading, heading: HeadingLevel.HEADING_2 }),
      ...section.entries.map(
        (citation) =>
          new Paragraph({
            children: runs(citation),
            // Reference lists are conventionally set with a hanging indent.
            indent: { left: 720, hanging: 720 },
            spacing: { after: 120 },
          }),
      ),
    );
  }

  for (const warning of plan.warnings) {
    body.push(new Paragraph({ children: [new TextRun({ text: warning, italics: true })] }));
  }

  const document = new Document({ footnotes, sections: [{ children: body }] });
  return Packer.toBlob(document);
}

/** The plan as plain text, for a quick check of what will be written. */
export const planToText = (plan: DocxPlan): string =>
  [
    plan.title,
    ...plan.footnotes.map((c, i) => `${i + 1}  ${toPlainText(c)}`),
    ...plan.sections.flatMap((s) => [s.heading, ...s.entries.map(toPlainText)]),
  ].join('\n');
