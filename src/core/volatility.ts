import { userData } from '@src/store/user-data';
// Daily volatility: the standard deviation of the day-to-day price changes (as fractions).
export function dailyVolatility(closes: number[]) {
  const changes: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i - 1] > 0) {
      changes.push(closes[i] / closes[i - 1] - 1);
    }
  }
  if (changes.length < 5) {
    return undefined;
  }
  const mean = sumBy(changes, x => x) / changes.length;
  const variance = sumBy(changes, x => (x - mean) ** 2) / (changes.length - 1);
  return Math.sqrt(variance);
}

// Rough flight days between the four main exchanges (player, 2026-11-05): neighbours on the
// ring AI1-IC1-NC1-CI1-AI1 are 1 day, the two diagonals (AI1-NC1, CI1-IC1) 2 days.
const DIAGONALS = new Set(['AI1>NC1', 'NC1>AI1', 'CI1>IC1', 'IC1>CI1']);

export function defaultFlightDays(from: string, to: string) {
  return DIAGONALS.has(`${from}>${to}`) ? 2 : 1;
}

// A flight takes as long each way, so a pair of exchanges holds one value. The key is the two
// codes in alphabetical order (player, 2026-11-07).
export function routeKey(from: string, to: string) {
  return from < to ? `${from}>${to}` : `${to}>${from}`;
}

// What you set in XIT SET wins over the table.
export function flightDays(from: string, to: string) {
  const set = userData.settings.arb.flightDays?.[routeKey(from, to)];
  return set !== undefined && set > 0 ? set : defaultFlightDays(from, to);
}

// Days the goods are on the way and waiting to sell (player, 2026-11-06): flight days, plus for
// a listed sale the units over the daily trade of the end exchange. Undefined when a listed sale
// has no trade to go by. The return trip is not counted.
export function tradeDays(
  from: string,
  to: string,
  listed: boolean,
  units: number,
  dailyTrade: number,
) {
  const flight = flightDays(from, to);
  if (!listed) {
    return flight;
  }
  if (dailyTrade <= 0) {
    return undefined;
  }
  return flight + units / dailyTrade;
}

// Return / (daily volatility × √days): how many usual price moves the margin can take.
export function safetyMultiple(ret: number, volatility: number | undefined, days: number) {
  if (volatility === undefined || volatility <= 0) {
    return undefined;
  }
  return ret / (volatility * Math.sqrt(days));
}

// How much an order must make by itself to be worth taking: one usual price move over the days
// the goods are held, times `multiple` (player, 2026-11-06). Without a volatility (a material
// that hardly trades) a flat rate stands in.
export const NO_VOLATILITY_HURDLE = 0.05;

export function hurdleRate(
  volatility: number | undefined,
  days: number | undefined,
  multiple: number,
) {
  if (multiple <= 0) {
    return 0;
  }
  if (volatility === undefined || volatility <= 0) {
    return NO_VOLATILITY_HURDLE * multiple;
  }
  return volatility * Math.sqrt(Math.max(days ?? 1, 1)) * multiple;
}
