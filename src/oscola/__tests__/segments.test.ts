import { describe, expect, it } from 'vitest';
import { italic, join, plain, segments, toHtml, toMarkdown, toPlainText } from '../../model/segments';

describe('segments', () => {
  it('drops empty and falsy parts so callers can inline conditionals', () => {
    expect(segments('a', false, null, undefined, '', 'b')).toEqual([
      { text: 'ab', style: 'plain' },
    ]);
  });

  it('merges adjacent segments of the same style', () => {
    expect(segments('a', italic('b'), italic('c'), 'd')).toEqual([
      { text: 'a', style: 'plain' },
      { text: 'bc', style: 'italic' },
      { text: 'd', style: 'plain' },
    ]);
  });

  it('joins only the parts that are present', () => {
    expect(toPlainText(join(', ', ['a', undefined, 'b']))).toBe('a, b');
    expect(toPlainText(join(', ', [undefined, 'b']))).toBe('b');
    expect(toPlainText(join(', ', []))).toBe('');
  });
});

describe('renderers', () => {
  const citation = segments('Tom & Jerry <', italic('Leviathan*'), '> 5 > 4');

  it('renders plain text verbatim', () => {
    expect(toPlainText(citation)).toBe('Tom & Jerry <Leviathan*> 5 > 4');
  });

  it('escapes HTML special characters', () => {
    expect(toHtml(citation)).toBe(
      'Tom &amp; Jerry &lt;<em>Leviathan*</em>&gt; 5 &gt; 4',
    );
  });

  it('escapes asterisks in Markdown so titles survive round-tripping', () => {
    expect(toMarkdown(citation)).toBe('Tom & Jerry <*Leviathan\\**> 5 > 4');
  });

  it('leaves underscores alone so URLs are not mangled', () => {
    expect(toMarkdown(segments(plain('http://a.com/b_c_d')))).toBe('http://a.com/b_c_d');
  });
});
