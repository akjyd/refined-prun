import { arbitrageAtHurdle, unitsPerShip } from '@src/core/arbitrage';
import {
  addPoints,
  emptyHistory,
  historyKey,
  HistoryState,
  markPresent,
} from '@src/core/arb-history';
import { getShipSize } from '@src/core/ship-sizes';
import { dailyVolatility, hurdleRate, tradeDays } from '@src/core/volatility';
import { dailyCloses } from '@src/infrastructure/fio/cxpc';
import { fioBooks } from '@src/infrastructure/fio/exchange-full';
import { materialsStore } from '@src/infrastructure/prun-api/data/materials';
import { dailyTrade } from '@src/features/XIT/ARB/arb-books';

// Profit per day of each chance over time, and new chances (player, 2026-11-06). A point is
// added each time the FIO books load (XIT ARB loads them, and the ARBLOG watch every 3 hours).
// The history uses a 2000 t / 2000 m³ ship and 3 days of trade, whatever ship XIT ARB shows,
// so that the points can be compared. Kept in the page's localStorage, apart from the user
// data.

const KEY = 'refined-prun-arbhistory';
export const HISTORY_SHIP = '2k/2k';
export const HISTORY_DAYS = 3;
// A fixed hurdle, like the fixed ship, so that the points can be compared.
const HISTORY_HURDLE = 1;
// The same limit as the XIT ARB list.
const MIN_PROFIT_PER_DAY = 30_000;
const EXCHANGES = ['AI1', 'CI1', 'IC1', 'NC1'];

function load(): HistoryState {
  try {
    const text = localStorage.getItem(KEY);
    return text !== null
      ? { ...emptyHistory(), ...(JSON.parse(text) as HistoryState) }
      : emptyHistory();
  } catch {
    return emptyHistory();
  }
}

export const arbHistory = shallowRef<HistoryState>(load());

function save(state: HistoryState) {
  arbHistory.value = state;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage full or blocked: the history stays in memory for this session.
  }
}

export function recordHistory() {
  if (fioBooks.books.size === 0) {
    return;
  }
  const now = Date.now();
  const ship = getShipSize(HISTORY_SHIP)!;
  const old = arbHistory.value.series;
  const values = new Map<string, number | null>();
  const present: string[] = [];
  for (const material of materialsStore.all.value ?? []) {
    const ticker = material.ticker;
    const shipUnits = unitsPerShip(material.weight, material.volume, ship);
    for (const from of EXCHANGES) {
      for (const to of EXCHANGES) {
        if (from === to) {
          continue;
        }
        const a = fioBooks.books.get(`${ticker}.${from}`);
        const b = fioBooks.books.get(`${ticker}.${to}`);
        const daily = dailyTrade(ticker, to);
        const cap = Math.min(shipUnits, Math.floor(daily * HISTORY_DAYS));
        if (!a || !b || cap <= 0) {
          continue;
        }
        for (const mode of ['now', 'listed'] as const) {
          const key = historyKey(mode, ticker, from, to);
          const closes = dailyCloses.get(`${ticker}.${to}`);
          const volatility = closes ? dailyVolatility(closes) : undefined;
          const r = arbitrageAtHurdle(a.asks, b.bids, b.asks, mode, cap, units =>
            hurdleRate(
              volatility,
              tradeDays(from, to, mode === 'listed', units, daily),
              HISTORY_HURDLE,
            ),
          );
          const days = r ? tradeDays(from, to, mode === 'listed', r.units, daily) : undefined;
          const perDay = r && r.units > 0 && days !== undefined ? r.profit / days : undefined;
          if (perDay !== undefined && perDay >= MIN_PROFIT_PER_DAY) {
            values.set(key, perDay);
            present.push(key);
          } else if (old[key] !== undefined) {
            values.set(key, perDay ?? null);
          }
        }
      }
    }
  }
  save(markPresent(addPoints(arbHistory.value, values, now), present, now));
}

// The chances XIT ARB lists now.
export function markListed(keys: string[]) {
  save(markPresent(arbHistory.value, keys, Date.now()));
}

export function markRead(key: string) {
  const state = arbHistory.value;
  if (state.unread.includes(key)) {
    save({ ...state, unread: state.unread.filter(x => x !== key) });
  }
}

export function markAllRead() {
  save({ ...arbHistory.value, unread: [] });
}
