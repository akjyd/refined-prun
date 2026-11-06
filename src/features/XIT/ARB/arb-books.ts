import { arbitrageAtHurdle, ArbitrageMode, BookLevel } from '@src/core/arbitrage';
import { dailyVolatility, hurdleRate, tradeDays } from '@src/core/volatility';
import { dailyCloses } from '@src/infrastructure/fio/cxpc';
import { cxStore } from '@src/infrastructure/fio/cx';
import { fioBooks, OrderBookData } from '@src/infrastructure/fio/exchange-full';
import { cxobStore } from '@src/infrastructure/prun-api/data/cxob';

// How much each order taken must make by itself, as a multiple of one usual price move over
// the days held (player, 2026-11-06: try it). 0 takes every order that makes anything.
export const arbHurdle = ref<'0' | '0.5' | '1' | '2'>('1');

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

export function tradeOf(
  ticker: string,
  from: string,
  to: string,
  mode: ArbitrageMode,
  maxUnits: number,
) {
  const a = bookData(`${ticker}.${from}`);
  const b = bookData(`${ticker}.${to}`);
  if (!a || !b) {
    return undefined;
  }
  const closes = dailyCloses.get(`${ticker}.${to}`);
  const volatility = closes ? dailyVolatility(closes) : undefined;
  const daily = dailyTrade(ticker, to);
  const multiple = Number(arbHurdle.value);
  const result = arbitrageAtHurdle(a.book.asks, b.book.bids, b.book.asks, mode, maxUnits, units =>
    hurdleRate(volatility, tradeDays(from, to, mode === 'listed', units, daily), multiple),
  );
  if (!result) {
    return undefined;
  }
  // The older of the two FIO copies, when either is not live.
  const times = [a, b].filter(x => !x.live).map(x => x.book.time ?? 0);
  return {
    result,
    live: a.live && b.live,
    time: times.length > 0 ? Math.min(...times) : undefined,
  };
}
