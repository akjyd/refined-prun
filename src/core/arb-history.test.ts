import { describe, expect, it } from 'vitest';
import { addPoints, DAY, emptyHistory, HOUR, markPresent } from '@src/core/arb-history';

describe('markPresent', () => {
  it('reads the first list', () => {
    const s = markPresent(emptyHistory(), ['a', 'b'], 0);
    expect(s.unread).toEqual([]);
    expect(s.started).toBe(true);
  });

  it('marks a chance new after a day away', () => {
    let s = markPresent(emptyHistory(), ['a'], 0);
    s = markPresent(s, ['a', 'b'], HOUR);
    expect(s.unread).toEqual(['b']);
    s = markPresent(s, ['a'], 2 * HOUR + DAY);
    expect(s.unread).toEqual(['b', 'a']);
  });

  it('does not mark a chance that stays', () => {
    let s = markPresent(emptyHistory(), ['a'], 0);
    s = markPresent(s, ['a'], 20 * HOUR);
    s = markPresent(s, ['a'], 40 * HOUR);
    expect(s.unread).toEqual([]);
  });
});

describe('addPoints', () => {
  it('adds points and a gap for a missing chance', () => {
    let s = addPoints(emptyHistory(), new Map([['a', 5]]), 0);
    s = addPoints(s, new Map([['b', 3]]), HOUR);
    expect(s.series.a).toEqual([
      [0, 5],
      [HOUR, null],
    ]);
    expect(s.series.b).toEqual([[HOUR, 3]]);
  });

  it('drops old points', () => {
    let s = addPoints(emptyHistory(), new Map([['a', 5]]), 0);
    s = addPoints(s, new Map([['a', 6]]), 8 * DAY);
    expect(s.series.a).toEqual([[8 * DAY, 6]]);
  });
});
