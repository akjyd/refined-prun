import { priceStep } from '@src/core/price-step';

// Buy on exchange A, carry, sell on exchange B. Currencies count 1:1. Fuel and ship wear are
// not counted (player, 2026-11-05).

export interface BookLevel {
  price: number;
  // Undefined for an order without a limit (market maker).
  amount?: number;
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
}

// "now": sell to the requests on B. "listed": place an offer on B one price step under its best
// offer and buy on A everything cheaper than that.
export type ArbitrageMode = 'now' | 'listed';

export function arbitrage(
  asksA: BookLevel[],
  bidsB: BookLevel[],
  asksB: BookLevel[],
  mode: ArbitrageMode,
  maxUnits: number,
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
    for (const ask of asks) {
      if (ask.price >= sell || units >= maxUnits) {
        break;
      }
      const take = Math.min(ask.amount ?? Infinity, maxUnits - units);
      units += take;
      profit += take * (sell - ask.price);
    }
    return { buy, sell, spread: (sell - buy) / buy, units, profit };
  }
  const bids = [...bidsB].sort((a, b) => b.price - a.price);
  if (bids.length === 0) {
    return undefined;
  }
  const sell = bids[0].price;
  // Walk both books while the next offer on A is cheaper than the next request on B.
  let units = 0;
  let profit = 0;
  let i = 0;
  let j = 0;
  let leftA = asks[0].amount ?? Infinity;
  let leftB = bids[0].amount ?? Infinity;
  while (i < asks.length && j < bids.length && units < maxUnits) {
    if (asks[i].price >= bids[j].price) {
      break;
    }
    const take = Math.min(leftA, leftB, maxUnits - units);
    units += take;
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
  return { buy, sell, spread: (sell - buy) / buy, units, profit };
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
