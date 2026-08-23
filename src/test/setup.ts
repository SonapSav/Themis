import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { installMatchMedia, resetMatchMedia } from './matchMedia';

// jsdom implements neither Blob.text() nor Blob.arrayBuffer(), both of which
// browsers have had since 2019 and both of which the app uses — to read an
// imported file, and to check a generated .docx. Feature-detected, so these are
// no-ops anywhere the environment already provides them.
if (typeof Blob !== 'undefined' && typeof Blob.prototype.text !== 'function') {
  Blob.prototype.text = function text(this: Blob) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(this);
    });
  };
}

if (typeof Blob !== 'undefined' && typeof Blob.prototype.arrayBuffer !== 'function') {
  Blob.prototype.arrayBuffer = function arrayBuffer(this: Blob) {
    return new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(this);
    });
  };
}

// jsdom has no matchMedia either. Unlike the Blob polyfills this one is
// driveable, so the system-theme branch can be tested rather than assumed.
installMatchMedia();

// Vitest is not configured with globals-aware auto-cleanup, so unmount between
// tests to keep queries scoped to the component under test.
afterEach(() => {
  cleanup();
  resetMatchMedia();
  // App persists to localStorage, so one test's library must not leak into the next.
  try {
    localStorage.clear();
  } catch {
    // No storage in the plain Node environment used by the engine tests.
  }
});
