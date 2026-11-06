// Profit history of arbitrage chances, and which chances are new (player, 2026-11-06).
// A key names one chance: `${mode}:${ticker}.${from}>${to}`.

// Time, and profit per day (null when there was no trade).
export type HistoryPoint = [number, number | null];

export interface HistoryState {
  series: Record<string, HistoryPoint[]>;
  // When each chance was last in the list.
  seen: Record<string, number>;
  // Chances that are new and not read yet.
  unread: string[];
  // False until the first list is seen: that list is all read.
  started: boolean;
}

export const HOUR = 3_600_000;
export const DAY = 24 * HOUR;
// A chance is new when it was not in the list for this long.
export const NEW_AFTER = DAY;
export const KEEP = 7 * DAY;

export function emptyHistory(): HistoryState {
  return { series: {}, seen: {}, unread: [], started: false };
}

export function historyKey(mode: string, ticker: string, from: string, to: string) {
  return `${mode}:${ticker}.${from}>${to}`;
}

// Adds a point to each given series. Series that are not given and have points get a null
// point, so that the chart shows a gap. Points older than KEEP go.
export function addPoints(
  state: HistoryState,
  values: Map<string, number | null>,
  now: number,
): HistoryState {
  const series: Record<string, HistoryPoint[]> = {};
  for (const [key, points] of Object.entries(state.series)) {
    const kept = points.filter(x => now - x[0] < KEEP);
    if (kept.length > 0) {
      series[key] = kept;
    }
  }
  for (const [key, value] of values) {
    if (value === null && series[key] === undefined) {
      continue;
    }
    series[key] = [...(series[key] ?? []), [now, value]];
  }
  for (const [key, points] of Object.entries(series)) {
    if (!values.has(key) && points.at(-1)?.[1] !== null) {
      points.push([now, null]);
    }
    if (points.every(x => x[1] === null)) {
      delete series[key];
    }
  }
  return { ...state, series };
}

// The chances in the list now. A chance not seen for NEW_AFTER becomes unread. The first list
// is all read.
export function markPresent(state: HistoryState, keys: string[], now: number): HistoryState {
  const seen: Record<string, number> = {};
  for (const [key, at] of Object.entries(state.seen)) {
    if (now - at < KEEP) {
      seen[key] = at;
    }
  }
  const unread = new Set(state.unread);
  for (const key of keys) {
    const last = seen[key];
    if (state.started && (last === undefined || now - last >= NEW_AFTER)) {
      unread.add(key);
    }
    seen[key] = now;
  }
  return { ...state, seen, unread: [...unread], started: true };
}
