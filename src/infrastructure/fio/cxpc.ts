// Daily closing prices from FIO /exchange/cxpc/{TICKER.CX}, the last 31 days, loaded on demand
// and kept for this session.

interface Candle {
  Interval: string;
  DateEpochMs: number;
  Close: number;
}

export const dailyCloses = shallowReactive(new Map<string, number[] | null>());

const queue: string[] = [];
const asked = new Set<string>();
let running = 0;
const LIMIT = 3;

async function load(cxTicker: string) {
  try {
    const response = await fetch(`https://rest.fnar.net/exchange/cxpc/${cxTicker}`);
    if (!response.ok) {
      dailyCloses.set(cxTicker, null);
      return;
    }
    const candles = (await response.json()) as Candle[];
    const closes = candles
      .filter(x => x.Interval === 'DAY_ONE')
      .sort((a, b) => a.DateEpochMs - b.DateEpochMs)
      .slice(-31)
      .map(x => x.Close);
    dailyCloses.set(cxTicker, closes);
  } catch {
    dailyCloses.set(cxTicker, null);
  }
}

function next() {
  while (running < LIMIT && queue.length > 0) {
    const cxTicker = queue.shift()!;
    running++;
    void load(cxTicker).finally(() => {
      running--;
      next();
    });
  }
}

// Asks for the closes of each ticker not loaded or asked yet.
export function requestCloses(cxTickers: string[]) {
  for (const cxTicker of cxTickers) {
    if (!asked.has(cxTicker)) {
      asked.add(cxTicker);
      queue.push(cxTicker);
    }
  }
  next();
}
