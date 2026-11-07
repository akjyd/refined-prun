import { BookLevel } from '@src/core/arbitrage';
import { planTrade } from '@src/core/arb-plan';
import { dailyVolatility, flightDays } from '@src/core/volatility';
import { userData } from '@src/store/user-data';
import { dailyCloses } from '@src/infrastructure/fio/cxpc';
import { cxStore } from '@src/infrastructure/fio/cx';
import { fioBooks, OrderBookData } from '@src/infrastructure/fio/exchange-full';
import { cxobStore } from '@src/infrastructure/prun-api/data/cxob';

// Average units traded per day on an exchange (7-day trade / 7).
export function dailyTrade(ticker: string, code: string) {
  return (cxStore.prices.get(code)?.get(ticker)?.Traded7D ?? 0) / 7;
}

// The most units a trade is computed for when nothing else limits it (orders without a limit).
export const NO_LIMIT = 100_000;

function levels(orders: PrunApi.CXBrokerOrder[]): BookLevel[] {
  return orders.map(x => ({ price: x.limit.amount, amount: x.amount ?? undefined, id: x.id }));
}

// The game's live book when a window for it is open, else the FIO copy.
export function bookData(cxTicker: string): { book: OrderBookData; live: boolean } | undefined {
  const live = cxobStore.getByTicker(cxTicker);
  if (live) {
    return {
      book: { asks: levels(live.sellingOrders), bids: levels(live.buyingOrders) },
      live: true,
    };
  }
  const fio = fioBooks.books.get(cxTicker);
  return fio ? { book: fio, live: false } : undefined;
}

// The trade this material and route allows at the failure rate you set, as two parts.
export function planOf(
  ticker: string,
  from: string,
  to: string,
  maxUnits: number,
  // Leaves out the requests of the end exchange, to show what the same goods would make if you
  // offered all of them instead (player, 2026-11-07).
  listOnly = false,
) {
  const a = bookData(`${ticker}.${from}`);
  const b = bookData(`${ticker}.${to}`);
  if (!a || !b) {
    return undefined;
  }
  const closes = dailyCloses.get(`${ticker}.${to}`);
  const plan = planTrade({
    asksA: a.book.asks,
    bidsB: listOnly ? [] : b.book.bids,
    asksB: b.book.asks,
    flightDays: flightDays(from, to),
    dailyTrade: dailyTrade(ticker, to),
    volatility: closes ? dailyVolatility(closes) : undefined,
    failurePercent: userData.settings.arb.failurePercent,
    maxUnits,
    // A player whose data was saved before this setting existed has none yet.
    maxDays: userData.settings.arb.maxDays ?? 7,
    sellCap: cxStore.prices.get(to)?.get(ticker)?.VWAP7D ?? undefined,
  });
  if (!plan) {
    return undefined;
  }
  // The older of the two FIO copies, when either is not live.
  const times = [a, b].filter(x => !x.live).map(x => x.book.time ?? 0);
  return {
    plan,
    live: a.live && b.live,
    time: times.length > 0 ? Math.min(...times) : undefined,
  };
}
