import { describe, expect, it } from 'vitest';
import { arbitrage, arbitrageAtHurdle, unitsPerShip } from '@src/core/arbitrage';

describe('arbitrage', () => {
  const asksA = [
    { price: 100, amount: 10 },
    { price: 110, amount: 10 },
    { price: 130, amount: 10 },
  ];
  const bidsB = [
    { price: 125, amount: 15 },
    { price: 105, amount: 100 },
  ];
  const asksB = [{ price: 150, amount: 5 }];

  it('sells now while offers are cheaper than requests', () => {
    // 10 at 100 -> 125, 5 at 110 -> 125, then 5 at 110 -> 105 stops.
    const r = arbitrage(asksA, bidsB, asksB, 'now', 1000)!;
    expect(r.units).toBe(15);
    expect(r.profit).toBe(10 * 25 + 5 * 15);
    expect(r.spread).toBeCloseTo(0.25);
    expect(r.fillsA.map(x => x.take)).toEqual([10, 5, 0]);
    expect(r.fillsB.map(x => x.take)).toEqual([15, 0]);
    expect(r.cost).toBe(10 * 100 + 5 * 110);
    expect(r.limit).toBe('price');
  });

  it('stops when the ship is full', () => {
    const r = arbitrage(asksA, bidsB, asksB, 'now', 12)!;
    expect(r.fillsA.map(x => x.take)).toEqual([10, 2, 0]);
    expect(r.limit).toBe('ship');
  });

  it('lists one step under the best offer', () => {
    // Sell at 149; all three offers are cheaper.
    const r = arbitrage(asksA, bidsB, asksB, 'listed', 25)!;
    expect(r.sell).toBe(149);
    expect(r.units).toBe(25);
    expect(r.profit).toBe(10 * 49 + 10 * 39 + 5 * 19);
    expect(r.fillsA.map(x => x.take)).toEqual([10, 10, 5]);
    expect(r.limit).toBe('ship');
  });

  it('fits a ship', () => {
    expect(unitsPerShip(2, 1, { weight: 500, volume: 500 })).toBe(250);
  });
});

describe('the hurdle', () => {
  // The 99 offer makes 1% against the 100 request: not worth a day of price risk.
  const asksA = [
    { price: 90, amount: 10 },
    { price: 99, amount: 10 },
  ];
  const bidsB = [{ price: 100, amount: 100 }];
  const asksB = [{ price: 120, amount: 10 }];

  it('takes every cheaper offer without a hurdle', () => {
    expect(arbitrage(asksA, bidsB, asksB, 'now', 100)?.units).toBe(20);
  });

  it('leaves the offer that makes less than the hurdle', () => {
    const r = arbitrage(asksA, bidsB, asksB, 'now', 100, 0.05);
    expect(r?.units).toBe(10);
    expect(r?.limit).toBe('price');
  });

  it('applies the same rule to a listed sale', () => {
    // Listed at one step under 120.
    const all = arbitrage(asksA, bidsB, asksB, 'listed', 100);
    expect(all?.units).toBe(20);
    expect(arbitrage(asksA, bidsB, asksB, 'listed', 100, 0.25)?.units).toBe(10);
  });

  it('asks the hurdle for the units of the first walk', () => {
    const seen: number[] = [];
    const r = arbitrageAtHurdle(asksA, bidsB, asksB, 'now', 100, units => {
      seen.push(units);
      return 0.05;
    });
    expect(seen).toEqual([20]);
    expect(r?.units).toBe(10);
  });
});
