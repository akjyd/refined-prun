// The sequence the game draws an order book in. The list the game gives is not that sequence:
// the game turns it around and then sorts it by price. The sort keeps the sequence of one
// price, so the order that is served first stays nearest the spread. Measured against the book
// of the game, order by order (player, 2026-11-07).
//
// Every book we draw uses this, so the ladder, the order cards and the drag all agree with the
// game and with each other.
export function drawnOrder<T>(orders: readonly T[], price: (order: T) => number): T[] {
  return [...orders].reverse().sort((a, b) => price(b) - price(a));
}
