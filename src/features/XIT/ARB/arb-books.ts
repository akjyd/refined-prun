import { BookLevel } from '@src/core/arbitrage';
import { planTrade } from '@src/core/arb-plan';
import { dailyVolatility, flightDays } from '@src/core/volatility';
import { userData } from '@src/store/user-data';
import { dailyCloses } from '@src/infrastructure/fio/cxpc';
import { cxStore } from '@src/infrastructure/fio/cx';
import { fioBooks, OrderBookData } from '@src/infrastructure/fio/exchange-full';
import { cxobStore } from '@src/infrastructure/prun-api/data/cxob';

// Units of a material you can expect to sell per day on an exchange: the 30-day trade over 30
// days, times the share of it you count on. Not all the trade can be yours: a part of it is
// requests you do not take, and a part goes to the offers of other traders, so you set the
// share in XIT SET (player, 2026-11-07).
export function dailyTrade(ticker: string, code: string) {
  const traded = (cxStore.prices.get(code)?.get(ticker)?.Traded30D ?? 0) / 30;
  return traded * (userData.settings.arb.tradeShare ?? 1);
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
  // Units the requests of the end exchange may take. 0 offers everything instead
  // (player, 2026-11-07).
  maxFillUnits?: number,
) {
  const a = bookData(`${ticker}.${from}`);
  const b = bookData(`${ticker}.${to}`);
  if (!a || !b) {
    return undefined;
  }
  const closes = dailyCloses.get(`${ticker}.${to}`);
  const plan = planTrade({
    asksA: a.book.asks,
    bidsB: b.book.bids,
    asksB: b.book.asks,
    flightDays: flightDays(from, to),
    dailyTrade: dailyTrade(ticker, to),
    volatility: closes ? dailyVolatility(closes) : undefined,
    failurePercent: userData.settings.arb.failurePercent,
    maxUnits,
    maxFillUnits,
    // A player whose data was saved before this setting existed has none yet.
    maxDays: userData.settings.arb.maxDays ?? 7,
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
