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

export function flightDays(from: string, to: string) {
  return DIAGONALS.has(`${from}>${to}`) ? 2 : 1;
}

// Return / (daily volatility × √days): how many usual price moves the margin can take.
export function safetyMultiple(ret: number, volatility: number | undefined, days: number) {
  if (volatility === undefined || volatility <= 0) {
    return undefined;
  }
  return ret / (volatility * Math.sqrt(days));
}
