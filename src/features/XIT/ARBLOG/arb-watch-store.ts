import { unitsPerShip } from '@src/core/arbitrage';
import { planTrade } from '@src/core/arb-plan';
import { dailyVolatility } from '@src/core/volatility';
import { dailyCloses } from '@src/infrastructure/fio/cxpc';
import { userData } from '@src/store/user-data';
import { Candle, checkFill, checkList, WatchRecord } from '@src/core/arb-watch';
import { getShipSize } from '@src/core/ship-sizes';
import { flightDays } from '@src/core/volatility';
import { cxStore } from '@src/infrastructure/fio/cx';
import { fioBooks, loadFioBook } from '@src/infrastructure/fio/exchange-full';
import { materialsStore } from '@src/infrastructure/prun-api/data/materials';
import { createId } from '@src/store/create-id';

// Watched arbitrage chances (player, 2026-11-06): every time FIO books load, record each trade
// that a 2kt / 2km³ ship can carry and that makes more than 10w, without buying. After the
// flight (and, to list, the selling days) estimate whether it would have made money.
// Kept in the page's localStorage, apart from the user data, so the records do not grow the
// user data and its backups.

const KEY = 'refined-prun-arbwatch';
const SHIP = '2k/2k';
const MIN_PROFIT = 100_000;
// The same chance is recorded again only after this long.
const REPEAT_MS = 24 * 3_600_000;
const KEEP_MS = 30 * 86_400_000;
const MAX_RECORDS = 1500;
const DAY = 86_400_000;
const EXCHANGES = ['AI1', 'CI1', 'IC1', 'NC1'];

function load(): WatchRecord[] {
  try {
    const text = localStorage.getItem(KEY);
    return text !== null ? (JSON.parse(text) as WatchRecord[]) : [];
  } catch {
    return [];
  }
}

export const watchRecords = ref<WatchRecord[]>(load());

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(watchRecords.value));
  } catch {
    // Storage full or blocked: the records stay in memory for this session.
  }
}

// The same daily trade the list uses: the 30-day trade over 30 days, times your share.
function dailyTrade(ticker: string, code: string) {
  const traded = (cxStore.prices.get(code)?.get(ticker)?.Traded30D ?? 0) / 30;
  return traded * (userData.settings.arb.tradeShare ?? 1);
}

// Records the chances in the FIO books just loaded.
export function recordChances() {
  if (!cxStore.fetched || fioBooks.books.size === 0) {
    return;
  }
  const now = Date.now();
  const ship = getShipSize(SHIP)!;
  const recent = new Set(
    watchRecords.value
      .filter(x => now - x.at < REPEAT_MS)
      .map(x => `${x.ticker}.${x.from}>${x.to}`),
  );
  const added: WatchRecord[] = [];
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
        if (!a || !b || shipUnits <= 0 || daily <= 0) {
          continue;
        }
        const key = `${ticker}.${from}>${to}`;
        if (recent.has(key)) {
          continue;
        }
        // The same plan the list shows, at your own settings (player, 2026-11-07).
        const closes = dailyCloses.get(`${ticker}.${to}`);
        const flight = flightDays(from, to);
        const r = planTrade({
          asksA: a.asks,
          bidsB: b.bids,
          asksB: b.asks,
          flightDays: flight,
          dailyTrade: daily,
          volatility: closes ? dailyVolatility(closes) : undefined,
          failurePercent: userData.settings.arb.failurePercent,
          maxUnits: shipUnits,
          maxDays: userData.settings.arb.maxDays ?? 7,
        });
        if (!r || r.units <= 0 || r.profit < MIN_PROFIT) {
          continue;
        }
        const taken = r.fillsB.filter(x => x.take > 0).map(x => x.price);
        added.push({
          id: createId(),
          ticker,
          from,
          to,
          mode: r.fillUnits > 0 ? 'now' : 'listed',
          at: now,
          bookAt: Math.min(a.time ?? now, b.time ?? now),
          units: r.units,
          fillUnits: r.fillUnits,
          listUnits: r.listUnits,
          listPrice: r.listPrice,
          failure: r.failure,
          cost: r.cost,
          profit: r.profit,
          sellPrice: taken.length > 0 ? Math.min(...taken) : (r.listPrice ?? 0),
          flightDays: flight,
          sellDays: r.saleDays,
        });
        recent.add(key);
      }
    }
  }
  if (added.length === 0) {
    return;
  }
  watchRecords.value = [...watchRecords.value, ...added]
    .filter(x => now - x.at < KEEP_MS)
    .slice(-MAX_RECORDS);
  save();
}

// When a record can be checked: once the offered part has had its selling days.
export function dueAt(record: WatchRecord) {
  return record.at + (record.flightDays + record.sellDays) * DAY;
}

async function loadCandles(cxTicker: string): Promise<Candle[] | undefined> {
  try {
    const response = await fetch(`https://rest.fnar.net/exchange/cxpc/${cxTicker}`);
    if (response.status !== 200) {
      return undefined;
    }
    const list = (await response.json()) as {
      Interval: string;
      DateEpochMs: number;
      High: number;
      Traded: number;
    }[];
    return list
      .filter(x => x.Interval === 'DAY_ONE')
      .map(x => ({ time: x.DateEpochMs, high: x.High, volume: x.Traded }));
  } catch {
    return undefined;
  }
}

let checking = false;

// Checks the records that are due, a few at a time.
export async function runChecks() {
  if (checking) {
    return;
  }
  checking = true;
  try {
    const now = Date.now();
    const due = watchRecords.value
      .filter(x => x.check === undefined && dueAt(x) <= now)
      .slice(0, 20);
    for (const record of due) {
      const unitCost = record.units > 0 ? record.cost / record.units : 0;
      const arrival = record.at + record.flightDays * DAY;
      // A record has two parts now, so both are checked and the results added up
      // (player, 2026-11-07).
      const fillUnits = record.fillUnits ?? (record.mode === 'now' ? record.units : 0);
      const listUnits = record.listUnits ?? record.units - fillUnits;
      let sellable = 0;
      let profit = 0;
      let dataAt: number | undefined;
      let note: 'stale' | 'noData' | undefined;
      if (fillUnits > 0) {
        const book = await loadFioBook(`${record.ticker}.${record.to}`);
        if (!book) {
          continue;
        }
        // A FIO book older than the arrival says nothing new; wait up to two days for a fresh one.
        const stale = book.time === undefined || book.time < arrival;
        if (stale && now < arrival + 2 * DAY) {
          continue;
        }
        const result = checkFill(book.bids, fillUnits, unitCost);
        sellable += result.sellable;
        profit += result.profit;
        dataAt = book.time;
        note = stale ? 'stale' : undefined;
      }
      if (listUnits > 0) {
        const candles = await loadCandles(`${record.ticker}.${record.to}`);
        if (!candles) {
          continue;
        }
        // Day candles start at midnight UTC: count the day of arrival too.
        const start = Math.floor(arrival / DAY) * DAY;
        const end = arrival + record.sellDays * DAY;
        const price = record.listPrice ?? record.sellPrice;
        const result = checkList(candles, start, end, price, listUnits, unitCost);
        sellable += result.sellable;
        profit += result.profit;
        const last = Math.max(0, ...candles.map(x => x.time));
        dataAt = dataAt === undefined ? last : Math.min(dataAt, last);
        note ??= candles.length === 0 ? 'noData' : undefined;
      }
      record.check = { at: now, sellable, profit, dataAt, note };
    }
    if (due.some(x => x.check !== undefined)) {
      watchRecords.value = [...watchRecords.value];
      save();
    }
  } finally {
    checking = false;
  }
}

export function clearWatch() {
  watchRecords.value = [];
  save();
}
