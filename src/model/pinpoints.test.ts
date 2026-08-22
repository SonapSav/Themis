import { describe, expect, it } from 'vitest';
import { pinpointFrom, pinpointReferences, renderPinpoint } from './pinpoints';

describe('pinpoint references', () => {
  it('splits the typed form on commas', () => {
    expect(pinpointReferences({ kind: 'page', value: '720, 723' })).toEqual([
      { locus: '720' },
      { locus: '723' },
    ]);
  });

  it('prefers structured references where both are given', () => {
    expect(
      pinpointReferences({ kind: 'page', value: 'ignored', references: [{ locus: '5' }] }),
    ).toEqual([{ locus: '5' }]);
  });
});

describe('rendering', () => {
  it('leaves page numbers bare and brackets paragraphs', () => {
    expect(renderPinpoint({ kind: 'page', value: '165' })).toBe('165');
    expect(renderPinpoint({ kind: 'paragraph', value: '14' })).toBe('[14]');
    expect(renderPinpoint({ kind: 'paragraph', value: '1-37' })).toBe('[1]–[37]');
    expect(renderPinpoint({ kind: 'paragraph', value: '42, 45' })).toBe('[42], [45]');
  });

  // OSCOLA 2.1.7: the judge's name goes in brackets after the pinpoint.
  it('adds the judge in brackets', () => {
    expect(renderPinpoint({ kind: 'page', references: [{ locus: '547', judge: 'Potter J' }] })).toBe(
      '547 (Potter J)',
    );
    expect(
      renderPinpoint({ kind: 'paragraph', references: [{ locus: '27', judge: 'Laws LJ' }] }),
    ).toBe('[27] (Laws LJ)');
  });

  it('attributes each passage separately', () => {
    expect(
      renderPinpoint({
        kind: 'paragraph',
        references: [
          { locus: '34', judge: 'Lord Hope' },
          { locus: '43-47', judge: 'Lord Walker' },
        ],
      }),
    ).toBe('[34] (Lord Hope), [43]–[47] (Lord Walker)');
  });
});

describe('building a pinpoint from the typed form', () => {
  it('keeps the plain form where no judge is named', () => {
    expect(pinpointFrom('page', '165')).toEqual({ kind: 'page', value: '165' });
    expect(pinpointFrom('page', '  ')).toBeUndefined();
  });

  // One judge attributes the whole pinpoint, so the name is given once.
  it('attaches a single judge to the last reference', () => {
    expect(renderPinpoint(pinpointFrom('paragraph', '34, 39', 'Laws LJ')!)).toBe(
      '[34], [39] (Laws LJ)',
    );
    expect(renderPinpoint(pinpointFrom('page', '547', 'Potter J')!)).toBe('547 (Potter J)');
  });
});
