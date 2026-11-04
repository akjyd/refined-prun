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
