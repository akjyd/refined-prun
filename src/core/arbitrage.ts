import { priceStep } from '@src/core/price-step';

// Buy on exchange A, carry, sell on exchange B. Currencies count 1:1. Fuel and ship wear are
// not counted (player, 2026-11-05).

export interface BookLevel {
  price: number;
  // Undefined for an order without a limit (market maker).
  amount?: number;
  // The order id, for live books.
  id?: string;
}

export interface ArbitrageResult {
  // Best offer on A and the sell price on B.
  buy: number;
  sell: number;
  // (sell - buy) / buy at the best prices.
  spread: number;
  // Units that can be done while the trade still makes money, at most `maxUnits`.
  units: number;
  profit: number;
  // What you pay on A; profit / cost is the return.
  cost: number;
  // The levels of A (offers, cheapest first) and of B (requests, best first; for "listed", the
  // offers of B, cheapest first), each with the units you take from it.
  fillsA: Fill[];
  fillsB: Fill[];
  // Why the walk stopped: the ship is full, the next order makes no money, or no orders left.
  limit: 'ship' | 'price' | 'book';
}

export interface Fill extends BookLevel {
  take: number;
}

// "now": sell to the requests on B. "listed": place an offer on B one price step under its best
// offer and buy on A everything cheaper than that.
export type ArbitrageMode = 'now' | 'listed';

// Each order taken must make at least `minMargin` by itself: (sell - price) / price. Without
// it, an offer one price step under the sell price is bought too, although it makes almost
// nothing while taking the same days of price risk (player, 2026-11-06). The margin a level
// must make is the hurdle rate; see hurdleRate in volatility.ts.
export function arbitrage(
  asksA: BookLevel[],
  bidsB: BookLevel[],
  asksB: BookLevel[],
  mode: ArbitrageMode,
  maxUnits: number,
  minMargin = 0,
): ArbitrageResult | undefined {
  const asks = [...asksA].sort((a, b) => a.price - b.price);
  if (asks.length === 0) {
    return undefined;
  }
  const buy = asks[0].price;
  if (mode === 'listed') {
    const bestAskB = Math.min(...asksB.map(x => x.price));
    if (!Number.isFinite(bestAskB)) {
      return undefined;
    }
    const sell = Math.round((bestAskB - priceStep(bestAskB - 0.001)) * 100) / 100;
    let units = 0;
    let profit = 0;
    let cost = 0;
    let limit: ArbitrageResult['limit'] = 'book';
    const fillsA: Fill[] = asks.map(x => ({ ...x, take: 0 }));
    for (const fill of fillsA) {
      if (units >= maxUnits) {
        limit = 'ship';
        break;
      }
      if (fill.price <= 0 || (sell - fill.price) / fill.price < minMargin) {
        limit = 'price';
        break;
      }
      const take = Math.min(fill.amount ?? Infinity, maxUnits - units);
      fill.take = take;
      units += take;
      cost += take * fill.price;
      profit += take * (sell - fill.price);
    }
    if (limit === 'book' && units >= maxUnits) {
      limit = 'ship';
    }
    const fillsB: Fill[] = [...asksB]
      .sort((a, b) => a.price - b.price)
      .map(x => ({ ...x, take: 0 }));
    return { buy, sell, spread: (sell - buy) / buy, units, profit, cost, fillsA, fillsB, limit };
  }
  const bids = [...bidsB].sort((a, b) => b.price - a.price);
  if (bids.length === 0) {
    return undefined;
  }
  const sell = bids[0].price;
  // Walk both books while the next offer on A is cheaper than the next request on B.
  let units = 0;
  let profit = 0;
  let cost = 0;
  let limit: ArbitrageResult['limit'] = 'book';
  const fillsA: Fill[] = asks.map(x => ({ ...x, take: 0 }));
  const fillsB: Fill[] = bids.map(x => ({ ...x, take: 0 }));
  let i = 0;
  let j = 0;
  let leftA = asks[0].amount ?? Infinity;
  let leftB = bids[0].amount ?? Infinity;
  while (i < asks.length && j < bids.length) {
    if (units >= maxUnits) {
      limit = 'ship';
      break;
    }
    if (asks[i].price <= 0 || (bids[j].price - asks[i].price) / asks[i].price < minMargin) {
      limit = 'price';
      break;
    }
    const take = Math.min(leftA, leftB, maxUnits - units);
    units += take;
    cost += take * asks[i].price;
    fillsA[i].take += take;
    fillsB[j].take += take;
    profit += take * (bids[j].price - asks[i].price);
    leftA -= take;
    leftB -= take;
    if (leftA <= 0) {
      i++;
      leftA = asks[i]?.amount ?? Infinity;
    }
    if (leftB <= 0) {
      j++;
      leftB = bids[j]?.amount ?? Infinity;
    }
  }
  if (limit === 'book' && units >= maxUnits) {
    limit = 'ship';
  }
  return { buy, sell, spread: (sell - buy) / buy, units, profit, cost, fillsA, fillsB, limit };
}

// The hurdle depends on the days, and the days on the units, so the walk runs twice: once
// without a hurdle to get the units, then with the hurdle those units give.
export function arbitrageAtHurdle(
  asksA: BookLevel[],
  bidsB: BookLevel[],
  asksB: BookLevel[],
  mode: ArbitrageMode,
  maxUnits: number,
  hurdleAt: (units: number) => number,
): ArbitrageResult | undefined {
  const first = arbitrage(asksA, bidsB, asksB, mode, maxUnits);
  if (!first) {
    return undefined;
  }
  const minMargin = hurdleAt(first.units);
  if (minMargin <= 0) {
    return first;
  }
  return arbitrage(asksA, bidsB, asksB, mode, maxUnits, minMargin);
}

// Units of a material that fit a cargo hold.
export function unitsPerShip(
  weight: number,
  volume: number,
  ship: { weight: number; volume: number },
) {
  const byWeight = weight > 0 ? ship.weight / weight : Infinity;
  const byVolume = volume > 0 ? ship.volume / volume : Infinity;
  return Math.floor(Math.min(byWeight, byVolume));
}
