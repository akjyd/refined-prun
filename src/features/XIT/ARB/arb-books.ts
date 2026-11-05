import { arbitrage, ArbitrageMode, BookLevel } from '@src/core/arbitrage';
import { fioBooks, OrderBookData } from '@src/infrastructure/fio/exchange-full';
import { cxobStore } from '@src/infrastructure/prun-api/data/cxob';

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
  const result = arbitrage(a.book.asks, b.book.bids, b.book.asks, mode, maxUnits);
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
