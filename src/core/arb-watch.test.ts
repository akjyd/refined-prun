import { describe, expect, it } from 'vitest';
import { checkFill, checkList } from '@src/core/arb-watch';

describe('arb watch checks', () => {
  it('fills the best requests above the unit cost', () => {
    const bids = [
      { price: 90, amount: 50 },
      { price: 120, amount: 30 },
      { price: 110, amount: 100 },
    ];
    expect(checkFill(bids, 100, 100)).toEqual({ sellable: 100, profit: 30 * 20 + 70 * 10 });
    expect(checkFill(bids, 100, 115)).toEqual({ sellable: 30, profit: 30 * 5 });
  });

  it('counts the volume of days that reached the price', () => {
    const day = 86_400_000;
    const candles = [
      { time: 0, high: 130, volume: 40 },
      { time: day, high: 110, volume: 500 },
      { time: 2 * day, high: 125, volume: 30 },
      { time: 5 * day, high: 200, volume: 999 },
    ];
    expect(checkList(candles, 0, 3 * day, 120, 100, 100)).toEqual({ sellable: 70, profit: 1400 });
  });
});
