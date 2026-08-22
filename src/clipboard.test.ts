// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { citationHtml, copyToClipboard, listHtml, listText } from './clipboard';
import { italic, segments } from './model/segments';

const citation = segments(italic('Page v Smith'), ' [1996] AC 155 (HL).');

describe('rich text helpers', () => {
  it('renders one citation as an inline fragment', () => {
    expect(citationHtml(citation)).toBe('<em>Page v Smith</em> [1996] AC 155 (HL).');
  });

  it('renders a list as one paragraph per entry', () => {
    expect(listHtml([citation, segments('Human Rights Act 1998')])).toBe(
      '<p><em>Page v Smith</em> [1996] AC 155 (HL).</p>\n<p>Human Rights Act 1998</p>',
    );
    expect(listText([citation, segments('Human Rights Act 1998')])).toBe(
      'Page v Smith [1996] AC 155 (HL).\nHuman Rights Act 1998',
    );
  });
});

describe('copying', () => {
  const write = vi.fn().mockResolvedValue(undefined);
  const writeText = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    write.mockClear();
    writeText.mockClear();
    class FakeClipboardItem {
      constructor(public readonly items: Record<string, Blob>) {}
    }
    vi.stubGlobal('ClipboardItem', FakeClipboardItem);
    Object.defineProperty(navigator, 'clipboard', {
      value: { write, writeText },
      configurable: true,
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  // OSCOLA italicises case names and book titles, so a plain-text-only copy
  // silently drops part of the citation on the way into Word.
  it('offers an HTML flavour alongside the plain text', async () => {
    await copyToClipboard('Page v Smith [1996] AC 155 (HL).', citationHtml(citation));

    expect(write).toHaveBeenCalledOnce();
    const item = write.mock.calls[0]![0][0] as { items: Record<string, Blob> };
    expect(await item.items['text/html']!.text()).toBe(
      '<em>Page v Smith</em> [1996] AC 155 (HL).',
    );
    expect(await item.items['text/plain']!.text()).toBe('Page v Smith [1996] AC 155 (HL).');
    expect(writeText).not.toHaveBeenCalled();
  });

  it('writes plain text where no HTML flavour is given', async () => {
    await copyToClipboard('plain only');
    expect(write).not.toHaveBeenCalled();
    expect(writeText).toHaveBeenCalledWith('plain only');
  });

  it('falls back to plain text where the browser refuses the richer form', async () => {
    write.mockRejectedValueOnce(new Error('not allowed'));
    await copyToClipboard('Page v Smith.', '<em>Page v Smith</em>.');
    expect(writeText).toHaveBeenCalledWith('Page v Smith.');
  });

  it('falls back where the browser has no ClipboardItem at all', async () => {
    vi.stubGlobal('ClipboardItem', undefined);
    await copyToClipboard('Page v Smith.', '<em>Page v Smith</em>.');
    expect(writeText).toHaveBeenCalledWith('Page v Smith.');
  });
});
