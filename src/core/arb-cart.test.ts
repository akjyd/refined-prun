import { describe, expect, it } from 'vitest';
import { fitCart } from '@src/core/arb-cart';

describe('fitCart', () => {
  it('fills in order and caps each good by what is left', () => {
    const ship = { weight: 500, volume: 500 };
    const r = fitCart(
      [
        { wanted: 150, market: 209, weight: 1.89, volume: 1 },
        { wanted: 1000, market: 2000, weight: 1, volume: 0.1 },
      ],
      ship,
    );
    expect(r[0].units).toBe(150);
    // 500 - 283.5 = 216.5 t left.
    expect(r[1].units).toBe(216);
    expect(r[1].max).toBe(216);
    // The first good may grow only into what the second leaves free.
    expect(r[0].max).toBe(150);
  });
});
