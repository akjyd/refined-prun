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
