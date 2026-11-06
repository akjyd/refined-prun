import type { BookLevel } from '@src/core/arbitrage';

// Watched arbitrage chances: XIT ARB records the good ones automatically, without buying, and
// later estimates whether the trade would have made money (player, 2026-11-06).

export interface WatchCheck {
  at: number;
  // Units that could have been sold, and the profit on them at the planned unit cost.
  sellable: number;
  profit: number;
  // Time of the data used (FIO book time, or the last day of the candles).
  dataAt?: number;
  note?: 'stale' | 'noData';
}

export interface WatchRecord {
  id: string;
  ticker: string;
  from: string;
  to: string;
  mode: 'now' | 'listed';
  at: number;
  // FIO time of the older of the two books the plan used.
  bookAt?: number;
  units: number;
  cost: number;
  profit: number;
  // "now": the lowest request the plan sold to. "listed": the planned listing price.
  sellPrice: number;
  flightDays: number;
  sellDays: number;
  check?: WatchCheck;
}

// Filling at arrival: sell the units to the requests above the unit cost, best first.
export function checkFill(bids: BookLevel[], units: number, unitCost: number) {
  let sellable = 0;
  let profit = 0;
  for (const bid of [...bids].sort((a, b) => b.price - a.price)) {
    if (sellable >= units || bid.price <= unitCost) {
      break;
    }
    const take = Math.min(bid.amount ?? Infinity, units - sellable);
    sellable += take;
    profit += take * (bid.price - unitCost);
  }
  return { sellable, profit };
}

export interface Candle {
  time: number;
  high: number;
  volume: number;
}

// Listing after arrival: on the days whose high reached the listing price, assume the units
// sold up to that day's volume. An estimate: daily candles do not say how much traded at which
// price, and other sellers share the volume.
export function checkList(
  candles: Candle[],
  start: number,
  end: number,
  price: number,
  units: number,
  unitCost: number,
) {
  let sellable = 0;
  for (const candle of candles) {
    if (candle.time < start || candle.time >= end || candle.high < price) {
      continue;
    }
    sellable += candle.volume;
  }
  sellable = Math.min(units, sellable);
  return { sellable, profit: sellable * (price - unitCost) };
}
