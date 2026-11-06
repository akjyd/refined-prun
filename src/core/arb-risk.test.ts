import { describe, expect, it } from 'vitest';
import { expectedMove, failureRate, hurdleK, requiredMargin } from '@src/core/arb-risk';

describe('hurdleK', () => {
  it('reads the measured table', () => {
    expect(hurdleK(10, 1)).toBeCloseTo(1.121, 3);
    expect(hurdleK(5, 4)).toBeCloseTo(0.975, 3);
  });

  it('asks for less as the failure rate allowed grows', () => {
    expect(hurdleK(5, 3)).toBeGreaterThan(hurdleK(10, 3));
    expect(hurdleK(10, 3)).toBeGreaterThan(hurdleK(20, 3));
  });

  it('goes between whole days', () => {
    const k = hurdleK(10, 2.5);
    expect(k).toBeLessThan(hurdleK(10, 2));
    expect(k).toBeGreaterThan(hurdleK(10, 3));
  });

  it('holds at the ends of the table', () => {
    expect(hurdleK(10, 0.2)).toBe(hurdleK(10, 1));
    expect(hurdleK(10, 40)).toBe(hurdleK(10, 14));
  });
});

describe('requiredMargin', () => {
  it('asks for more as the days grow, although k falls', () => {
    const one = requiredMargin(10, 0.03, 1);
    const four = requiredMargin(10, 0.03, 4);
    expect(hurdleK(10, 4)).toBeLessThan(hurdleK(10, 1));
    expect(four).toBeGreaterThan(one);
    expect(one).toBeCloseTo(0.0336, 4);
  });

  it('stands in for a material with no volatility', () => {
    expect(requiredMargin(10, undefined, 1)).toBeCloseTo(1.121 * 0.05, 4);
  });
});

describe('failureRate', () => {
  it('is the other side of requiredMargin', () => {
    for (const p of [3, 5, 10, 20]) {
      for (const days of [1, 2.5, 6]) {
        const margin = requiredMargin(p, 0.03, days);
        expect(failureRate(margin, 0.03, days)).toBeCloseTo(p, 4);
      }
    }
  });

  it('grows as the margin falls', () => {
    const move = expectedMove(0.03, 3);
    expect(failureRate(move * 2, 0.03, 3)).toBeLessThan(failureRate(move, 0.03, 3));
  });

  it('is about even money with no margin at all', () => {
    // The table stops at 50%: half of the moves go down, so a trade with no margin is a coin
    // toss. It is read as the last measured point, not as 100.
    const none = failureRate(0, 0.03, 3);
    expect(none).toBeGreaterThanOrEqual(40);
    expect(none).toBeLessThanOrEqual(50);
  });

  it('is 100 when the trade already loses money', () => {
    expect(failureRate(-0.01, 0.03, 3)).toBe(100);
  });
});
