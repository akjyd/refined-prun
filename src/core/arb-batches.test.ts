import { describe, expect, it } from 'vitest';
import {
  ArbBatch,
  bought,
  realizedProfit,
  sold,
  status,
  syncBatches,
  OrderTrades,
} from '@src/core/arb-batches';

function batch(id: string, createdAt: number, buyOrders: string[]): ArbBatch {
  return {
    id,
    ticker: 'RSE',
    from: 'NC1',
    to: 'AI1',
    mode: 'now',
    createdAt,
    plan: { units: 100, cost: 0, sellPrice: 0, profit: 0, return: 0 },
    buyOrders,
    trades: [],
  };
}

describe('syncBatches', () => {
  it('adds buys of own orders and sells after the start, oldest batch first', () => {
    const a = batch('a', 10, ['b1']);
    const b = batch('b', 20, ['b2']);
    const orders: OrderTrades[] = [
      {
        id: 'b1',
        type: 'BUYING',
        ticker: 'RSE',
        exchange: 'NC1',
        trades: [{ id: 't1', amount: 100, price: 10, time: 11 }],
      },
      {
        id: 'b2',
        type: 'BUYING',
        ticker: 'RSE',
        exchange: 'NC1',
        trades: [{ id: 't2', amount: 50, price: 12, time: 21 }],
      },
      // Before batch a started: not counted.
      {
        id: 's0',
        type: 'SELLING',
        ticker: 'RSE',
        exchange: 'AI1',
        trades: [{ id: 't0', amount: 30, price: 20, time: 5 }],
      },
      {
        id: 's1',
        type: 'SELLING',
        ticker: 'RSE',
        exchange: 'AI1',
        trades: [{ id: 't3', amount: 120, price: 20, time: 30 }],
      },
      // Another exchange: not counted.
      {
        id: 's2',
        type: 'SELLING',
        ticker: 'RSE',
        exchange: 'IC1',
        trades: [{ id: 't4', amount: 10, price: 20, time: 31 }],
      },
    ];
    expect(syncBatches([a, b], orders)).toBe(true);
    expect(bought(a)).toBe(100);
    expect(sold(a)).toBe(100);
    expect(sold(b)).toBe(20);
    expect(realizedProfit(a)).toBe(100 * 20 - 100 * 10);
    expect(status(a, 0)).toBe('done');
    expect(status(b, 0)).toBe('selling');
    // A second sync adds nothing.
    expect(syncBatches([a, b], orders)).toBe(false);
    expect(sold(b)).toBe(20);
  });
});
