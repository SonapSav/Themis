import { italic, segments, type FormattedCitation, type Part } from '../../model/segments';
import {
  bibliographyAuthorPrefix,
  footnoteAuthorPrefix,
  formatAuthorsBibliography,
  formatAuthorsFootnote,
} from '../authors';
import { formatEdition } from '../../model/ordinals';
import type { BookChapterSource } from '../../model/types';

/**
 * OSCOLA 3.2.3: `author, | 'title' | in editor (ed), | book title |
 * (additional information, publisher year)`. There is no comma before "in",
 * and "It is not necessary to give the pages of the contribution", so the
 * chapter's page range is not emitted.
 */
function publicationDetails(source: BookChapterSource): string {
  const parts = [
    formatEdition(source.edition),
    [source.publisher.trim(), source.year.trim()].filter(Boolean).join(' '),
  ].filter(Boolean);
  return parts.length > 0 ? `(${parts.join(', ')})` : '';
}

function body(source: BookChapterSource, authorPrefix: string, editors: string): Part[] {
  const details = publicationDetails(source);
  const editorClause = editors
    ? `${editors} (${source.editors.length > 1 ? 'eds' : 'ed'}), `
    : '';
  return [
    authorPrefix,
    `'${source.chapterTitle.trim()}'`,
    editorClause && ` in ${editorClause}`,
    !editorClause && ' ',
    italic(source.bookTitle.trim()),
    details && ` ${details}`,
  ];
}

export function formatBookChapterFootnote(source: BookChapterSource): FormattedCitation {
  return segments(
    ...body(
      source,
      footnoteAuthorPrefix(source.authors),
      formatAuthorsFootnote(source.editors),
    ),
    '.',
  );
}

export function formatBookChapterBibliography(
  source: BookChapterSource,
  authorPrefix?: string,
): FormattedCitation {
  return segments(
    ...body(
      source,
      authorPrefix ?? bibliographyAuthorPrefix(source.authors),
      formatAuthorsBibliography(source.editors),
    ),
  );
}
