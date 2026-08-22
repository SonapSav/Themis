import { useState } from 'react';
import { copyToClipboard } from '../clipboard';

interface Props {
  readonly label: string;
  readonly text: string;
  /** HTML flavour, so italics survive a paste into Word. */
  readonly html?: string;
  readonly className?: string;
}

export function CopyButton({ label, text, html, className = 'secondary small' }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await copyToClipboard(text, html);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can be denied; the text is selectable on the page
      // either way, so there is nothing useful to recover here.
      setCopied(false);
    }
  };

  return (
    <button type="button" className={className} onClick={copy}>
      {copied ? 'Copied' : label}
    </button>
  );
}
