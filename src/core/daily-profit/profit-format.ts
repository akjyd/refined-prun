import { fixed1 } from '@src/utils/format';

const GOOD = 150_000;
const BAD = 100_000;

// Daily profit in units of 10,000 ("w").
export function formatProfit(value: number | undefined) {
  return value === undefined ? '--' : fixed1(value / 10_000) + 'w';
}

// Above 15w green, below 10w red.
export function profitClass(value: number | undefined) {
  if (value === undefined) {
    return undefined;
  }
  if (value > GOOD) {
    return C.ColoredValue.positive;
  }
  return value < BAD ? C.ColoredValue.negative : undefined;
}

export interface PricedProfit {
  id: string;
  price: number;
  profit?: number;
}

// The orders of one exchange where the profit crosses the limits: the cheapest order still above
// 15w gets green, the dearest order below 10w gets red. The other orders keep the normal color.
export function profitMarks(orders: PricedProfit[]) {
  const sorted = [...orders].sort((a, b) => b.price - a.price);
  const marks = new Map<string, string>();
  const good = sorted.findLast(x => x.profit !== undefined && x.profit > GOOD);
  const bad = sorted.find(x => x.profit !== undefined && x.profit < BAD);
  if (good) {
    marks.set(good.id, C.ColoredValue.positive);
  }
  if (bad) {
    marks.set(bad.id, C.ColoredValue.negative);
  }
  return marks;
}
