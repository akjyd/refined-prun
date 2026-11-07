import { BookLevel, Fill } from '@src/core/arbitrage';
import { dropPrice } from '@src/core/price-step';
import { failureRate, requiredMargin } from '@src/core/arb-risk';

// One trade planned as two parts (player, 2026-11-06):
//   part 1, "fill": what the requests on the end exchange take as soon as the ship lands;
//   part 2, "list": the rest, offered one price step under the best offer there.
// Every order bought must earn enough by itself for the days that part is held: the flight for
// part 1, the flight plus the wait for part 2. Buying more means waiting longer, which asks for
// more margin while the offers get dearer, so the two meet at one point and that point is the
// size of the trade. Nothing else caps it but the ship.

export interface ArbPlanInput {
  asksA: BookLevel[];
  bidsB: BookLevel[];
  asksB: BookLevel[];
  flightDays: number;
  // Units the end exchange trades per day; 0 means an offer there would never sell.
  dailyTrade: number;
  volatility?: number;
  failurePercent: number;
  maxUnits: number;
  // Units the requests may take at most. Undefined lets the requests take all they can.
  // The cart sets it when you move the split yourself (player, 2026-11-07).
  maxFillUnits?: number;
  // Days you are willing to tie the money up, flight and sale together
  // (player, 2026-11-07).
  maxDays: number;
}

export interface ArbPlanResult {
  fillUnits: number;
  listUnits: number;
  units: number;
  cost: number;
  revenue: number;
  profit: number;
  // Daily trade of the end exchange in units; 0 means an offer there would never sell.
  margin: number;
  // Days the money is tied up, weighted by how much of it each part holds.
  days: number;
  listDays: number;
  // Days the offered part needs to sell, flight not counted.
  saleDays: number;
  failure: number;
  listPrice?: number;
  fillsA: Fill[];
  fillsB: Fill[];
  limit: 'ship' | 'risk' | 'book' | 'days';
}

export function planTrade(input: ArbPlanInput): ArbPlanResult | undefined {
  const { flightDays, dailyTrade, volatility, failurePercent, maxUnits, maxDays } = input;
  const asks = [...input.asksA].sort((a, b) => a.price - b.price);
  if (asks.length === 0 || maxUnits <= 0) {
    return undefined;
  }
  const bids = [...input.bidsB].sort((a, b) => b.price - a.price);
  const fillsA: Fill[] = asks.map(x => ({ ...x, take: 0 }));
  const fillsB: Fill[] = bids.map(x => ({ ...x, take: 0 }));

  let units = 0;
  let cost = 0;
  let revenue = 0;
  let fillUnits = 0;
  let fillCost = 0;
  let limit: ArbPlanResult['limit'] = 'book';
  // Where the walk is in the offers of the start exchange.
  let i = 0;
  let leftA = asks[0]?.amount ?? Infinity;

  // Part 1: what the requests take at once. Held for the flight only.
  const fillNeed = requiredMargin(failurePercent, volatility, flightDays);
  let j = 0;
  let leftB = bids[0]?.amount ?? Infinity;
  const fillCap = Math.min(maxUnits, input.maxFillUnits ?? maxUnits);
  while (i < asks.length && j < bids.length) {
    if (units >= maxUnits) {
      limit = 'ship';
      break;
    }
    if (fillUnits >= fillCap) {
      break;
    }
    const ask = asks[i].price;
    const bid = bids[j].price;
    if (ask <= 0 || (bid - ask) / ask < fillNeed) {
      limit = 'risk';
      break;
    }
    const take = Math.min(leftA, leftB, maxUnits - units, fillCap - fillUnits);
    units += take;
    fillUnits += take;
    cost += take * ask;
    fillCost += take * ask;
    revenue += take * bid;
    fillsA[i].take += take;
    fillsB[j].take += take;
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

  // Part 2: the rest, offered under the best offer of the end exchange.
  const bestAskB = Math.min(...input.asksB.map(x => x.price));
  const underBest = Number.isFinite(bestAskB) ? dropPrice(true, bestAskB) : undefined;
  // Just under the best offer of the end exchange. No other cap: the book is the price
  // (player, 2026-11-07).
  const listPrice = underBest;
  let listUnits = 0;
  let listCost = 0;
  // The most units that can be offered without waiting longer than you want.
  const listRoom = Math.max(0, Math.floor((maxDays - flightDays) * dailyTrade));
  if (listPrice !== undefined && dailyTrade > 0 && listRoom > 0) {
    const daysAt = (extra: number) => flightDays + (listUnits + extra) / dailyTrade;
    const fits = (ask: number, extra: number) =>
      ask > 0 &&
      (listPrice - ask) / ask >= requiredMargin(failurePercent, volatility, daysAt(extra));
    while (i < asks.length) {
      if (units >= maxUnits) {
        limit = 'ship';
        break;
      }
      const ask = asks[i].price;
      const room = Math.min(leftA, maxUnits - units, listRoom - listUnits);
      if (room <= 0 && listUnits >= listRoom) {
        limit = 'days';
        break;
      }
      if (!Number.isFinite(room) || room <= 0) {
        break;
      }
      if (!fits(ask, 1)) {
        limit = 'risk';
        break;
      }
      // The wait grows with every unit, so this offer is taken only as far as it still earns
      // enough: the largest number of units that still fits.
      let take = room;
      if (!fits(ask, room)) {
        let lo = 1;
        let hi = room;
        while (lo < hi) {
          const mid = Math.ceil((lo + hi) / 2);
          if (fits(ask, mid)) {
            lo = mid;
          } else {
            hi = mid - 1;
          }
        }
        take = lo;
        limit = 'risk';
      }
      units += take;
      listUnits += take;
      cost += take * ask;
      listCost += take * ask;
      revenue += take * listPrice;
      fillsA[i].take += take;
      leftA -= take;
      if (listUnits >= listRoom) {
        limit = 'days';
        break;
      }
      if (take < room) {
        break;
      }
      i++;
      leftA = asks[i]?.amount ?? Infinity;
    }
  }

  if (units <= 0 || cost <= 0) {
    return undefined;
  }
  const saleDays = dailyTrade > 0 ? listUnits / dailyTrade : 0;
  const listDays = flightDays + saleDays;
  const days = (fillCost * flightDays + listCost * listDays) / cost;
  const profit = revenue - cost;
  const margin = profit / cost;
  return {
    fillUnits,
    listUnits,
    units,
    cost,
    revenue,
    profit,
    margin,
    days,
    listDays,
    saleDays,
    failure: failureRate(margin, volatility, days),
    listPrice: listUnits > 0 ? listPrice : undefined,
    fillsA,
    fillsB,
    limit,
  };
}
