import { describe, expect, it } from 'vitest';
import { formatBibliography, formatFootnote } from '../format';
import type { WebsiteSource } from '../../model/types';
import { bibliography, footnote, person } from './helpers';

const website = (fields: Omit<WebsiteSource, 'id' | 'type'>): WebsiteSource => ({
  id: 'w1',
  type: 'website',
  ...fields,
});

const nakedLaw = website({
  authors: [person('Sarah', 'Cole')],
  title: 'Virtual Friend Fires Employee',
  siteName: 'Naked Law',
  publicationDate: '2009-05-01',
  url: 'www.nakedlaw.com/2009/05/index.html',
  accessDate: '2009-11-19',
});

// Example taken from the OSCOLA 4th edn quick reference guide.
describe('websites — OSCOLA 4th edn examples', () => {
  it('cites author, title, site, date, URL and access date', () => {
    expect(footnote(nakedLaw)).toBe(
      "Sarah Cole, 'Virtual Friend Fires Employee' (Naked Law, 1 May 2009) " +
        '<www.nakedlaw.com/2009/05/index.html> accessed 19 November 2009.',
    );
  });

  it('begins with the title where the page is unattributed', () => {
    expect(footnote({ ...nakedLaw, authors: [] })).toBe(
      "'Virtual Friend Fires Employee' (Naked Law, 1 May 2009) " +
        '<www.nakedlaw.com/2009/05/index.html> accessed 19 November 2009.',
    );
  });

  it('precedes an unattributed bibliography entry with a double em-dash (1.7)', () => {
    expect(bibliography({ ...nakedLaw, authors: [] })).toBe(
      "\u2014\u2014 'Virtual Friend Fires Employee' (Naked Law, 1 May 2009) " +
        '<www.nakedlaw.com/2009/05/index.html> accessed 19 November 2009',
    );
  });

  it('does not invert a corporate author', () => {
    const source = website({
      ...nakedLaw,
      authors: [{ kind: 'corporate', name: 'Department for Work and Pensions' }],
    });

    expect(footnote(source)).toContain('Department for Work and Pensions,');
    expect(bibliography(source)).toContain('Department for Work and Pensions,');
  });

  it('omits the bracket entirely where neither site nor date is known', () => {
    const source = website({ ...nakedLaw, siteName: undefined, publicationDate: undefined });

    expect(footnote(source)).toBe(
      "Sarah Cole, 'Virtual Friend Fires Employee' " +
        '<www.nakedlaw.com/2009/05/index.html> accessed 19 November 2009.',
    );
  });
});

describe('websites — markup', () => {
  // OSCOLA 3.4.8 sets the blog name in italics, as 3.4.9 does the newspaper
  // name; the piece's own title stays in roman inside quotation marks.
  it('italicises the site name and nothing else', () => {
    expect(formatFootnote(nakedLaw)).toEqual([
      { text: "Sarah Cole, 'Virtual Friend Fires Employee' (", style: 'plain' },
      { text: 'Naked Law', style: 'italic' },
      {
        text:
          ', 1 May 2009) <www.nakedlaw.com/2009/05/index.html> accessed 19 November 2009.',
        style: 'plain',
      },
    ]);
  });

  it('italicises the site name in the bibliography too', () => {
    expect(formatBibliography(nakedLaw).filter((seg) => seg.style === 'italic')).toEqual([
      { text: 'Naked Law', style: 'italic' },
    ]);
  });

  it('gives only the access date where there is no publication date (3.4.8)', () => {
    const source = { ...nakedLaw, publicationDate: undefined };
    expect(footnote(source)).toBe(
      "Sarah Cole, 'Virtual Friend Fires Employee' (Naked Law) " +
        '<www.nakedlaw.com/2009/05/index.html> accessed 19 November 2009.',
    );
  });
});

describe('websites — bibliography', () => {
  it('inverts the author and drops the closing full stop', () => {
    expect(bibliography(nakedLaw)).toBe(
      "Cole S, 'Virtual Friend Fires Employee' (Naked Law, 1 May 2009) " +
        '<www.nakedlaw.com/2009/05/index.html> accessed 19 November 2009',
    );
  });
});
