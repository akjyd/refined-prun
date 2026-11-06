import type { BookLevel } from '@src/core/arbitrage';

// All order books from FIO /exchange/full. FIO gets a book when a player with the FIO
// extension opens it, so each book has its own time (Timestamp).

interface FioOrder {
  ItemCount: number | null;
  ItemCost: number;
}

interface FioBook {
  MaterialTicker: string;
  ExchangeCode: string;
  BuyingOrders?: FioOrder[] | null;
  SellingOrders?: FioOrder[] | null;
  Timestamp?: string | null;
}

export interface OrderBookData {
  asks: BookLevel[];
  bids: BookLevel[];
  // When FIO last got this book (ms).
  time?: number;
}

export const fioBooks = shallowReactive({
  books: new Map<string, OrderBookData>(),
  loadedAt: 0,
  loading: false,
  error: undefined as string | undefined,
});

function levels(orders: FioOrder[] | null | undefined): BookLevel[] {
  return (orders ?? []).map(x => ({ price: x.ItemCost, amount: x.ItemCount ?? undefined }));
}

function toBook(x: FioBook): OrderBookData {
  const time = x.Timestamp ? Date.parse(x.Timestamp) : NaN;
  return {
    asks: levels(x.SellingOrders),
    bids: levels(x.BuyingOrders),
    time: Number.isFinite(time) ? time : undefined,
  };
}

// One book from FIO /exchange/{TICKER.CX}, fresh (not the cached full list).
export async function loadFioBook(cxTicker: string): Promise<OrderBookData | undefined> {
  try {
    const response = await fetch(`https://rest.fnar.net/exchange/${cxTicker}`);
    if (response.status !== 200) {
      return undefined;
    }
    return toBook((await response.json()) as FioBook);
  } catch {
    return undefined;
  }
}

export async function loadFioBooks() {
  if (fioBooks.loading) {
    return;
  }
  fioBooks.loading = true;
  fioBooks.error = undefined;
  try {
    const response = await fetch('https://rest.fnar.net/exchange/full');
    if (!response.ok) {
      throw new Error(`FIO ${response.status}`);
    }
    const list = (await response.json()) as FioBook[];
    const books = new Map<string, OrderBookData>();
    for (const x of list) {
      books.set(`${x.MaterialTicker}.${x.ExchangeCode}`, toBook(x));
    }
    fioBooks.books = books;
    fioBooks.loadedAt = Date.now();
  } catch (e) {
    fioBooks.error = e instanceof Error ? e.message : String(e);
  } finally {
    fioBooks.loading = false;
  }
}
