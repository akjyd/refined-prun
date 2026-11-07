// The smallest price step the exchange allows at a price: three significant digits.
// Below 1,000 the step is 1, from 1,000 it is 10, from 10,000 it is 100 (player, 2026-11-04).
export function priceStep(price: number) {
  if (price <= 0) {
    return 0.01;
  }
  return Math.max(0.01, 10 ** (Math.floor(Math.log10(price)) - 2));
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

// The price for an order dropped between two orders (higher above, lower below).
// An offer goes one step under the order above; a request one step over the order below.
export function dropPrice(ask: boolean, above?: number, below?: number) {
  if (ask) {
    if (above !== undefined) {
      return round(above - priceStep(above - 0.001));
    }
    return below !== undefined ? round(below + priceStep(below)) : undefined;
  }
  if (below !== undefined) {
    return round(below + priceStep(below));
  }
  return above !== undefined ? round(above - priceStep(above - 0.001)) : undefined;
}

export interface BookOrder {
  id: string;
  ask: boolean;
  price: number;
}

// The new price of the order `dragged` dropped above index `at` of `book` (highest price
// first). Undefined when nothing changes or the order would cross the spread.
export function dropTargetPrice(book: BookOrder[], dragged: BookOrder, at: number) {
  const others = book.filter(x => x.id !== dragged.id);
  const before = book.slice(0, at).filter(x => x.id !== dragged.id).length;
  const above = others[before - 1];
  const below = others[before];
  // Two orders of one price have no gap between them. Dropping there means that price
  // (player, 2026-11-07: you want 148 between two orders of 148, not 147).
  const price =
    above !== undefined && below !== undefined && above.price === below.price
      ? above.price
      : dropPrice(dragged.ask, above?.price, below?.price);
  if (price === undefined || price === dragged.price) {
    return undefined;
  }
  const bestBid = others.find(x => !x.ask)?.price;
  const bestAsk = others.filter(x => x.ask).at(-1)?.price;
  if (dragged.ask && bestBid !== undefined && price <= bestBid) {
    return undefined;
  }
  if (!dragged.ask && bestAsk !== undefined && price >= bestAsk) {
    return undefined;
  }
  return price;
}

// A price written with one digit more than the exchange allows. Prices move in steps of
// three significant digits, so more digits than that are noise (player, 2026-11-07).
export function stepPrice(price: number) {
  const step = priceStep(price);
  const digits = Math.max(0, Math.min(6, -Math.floor(Math.log10(step)) + 1));
  return price.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}
