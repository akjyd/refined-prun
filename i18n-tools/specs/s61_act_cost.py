from tr import S, E, R
REG = 'src/features/XIT/ACT/act-registry.ts'
CX = 'src/features/XIT/ACT/action-steps/CXPO_BUY.ts'
AR = 'src/features/XIT/ACT/runner/action-runner.ts'

S('新功能 —— ACT 预览总花费')
E('act.run.totalCost', ', Total Cost ', '，总花费 ')
E('act.run.missingPrices', ' ({0} without price data)', '（{0} 项暂无价格）')
E('act.run.loadingPrices', 'Loading prices...', '正在加载价格……')

R(REG, '  totalMaterials?: (data: T) => Record<string, number>;\n', '''  totalMaterials?: (data: T) => Record<string, number>;
  // Money spent by this step, in the currency of `data.exchange`. Undefined if no price data yet.
  cost?: (data: T) => number | undefined;
''')

R(CX, '  execute: async ctx => {\n', '''  cost: data => {
    const filled = fillAmount(`${data.ticker}.${data.exchange}`, data.amount, data.priceLimit);
    if (!filled) {
      return undefined;
    }
    // An unfilled bid with a price limit reserves the full amount at that limit.
    if (filled.amount < data.amount && data.allowUnfilled && isFinite(data.priceLimit)) {
      return data.amount * data.priceLimit;
    }
    return filled.cost;
  },
  execute: async ctx => {
''')

R(AR, "import { LogPart } from '@src/features/XIT/ACT/runner/logger';\n", """import { LogPart } from '@src/features/XIT/ACT/runner/logger';
import { cxobStore } from '@src/infrastructure/prun-api/data/cxob';
import { exchangesStore } from '@src/infrastructure/prun-api/data/exchanges';
import { showBuffer } from '@src/infrastructure/prun-ui/buffers';
import { watchUntil } from '@src/utils/watch';
import { fixed0 } from '@src/utils/format';
""")
R(AR, '''    if (steps.length === 0) {
      return;
    }
    this.log.info(formatTotals(steps));
    if (fail) {''', '''    if (steps.length === 0) {
      return;
    }
    this.options.onStatusChanged(t('act.run.loadingPrices'));
    await preloadOrderBooks(steps);
    this.log.info(formatTotals(steps));
    if (fail) {''')
R(AR, '''  return [
    { text: t('act.run.totalWeight') },
    { text: `${fixed02(totalWeight)}t`, yellow: true },
    { text: t('act.run.totalVolume') },
    { text: `${fixed02(totalVolume)}m³`, yellow: true },
  ];
}''', '''  const parts: LogPart[] = [
    { text: t('act.run.totalWeight') },
    { text: `${fixed02(totalWeight)}t`, yellow: true },
    { text: t('act.run.totalVolume') },
    { text: `${fixed02(totalVolume)}m³`, yellow: true },
  ];

  const costs = new Map<string, number>();
  let missingPrices = 0;
  for (const step of steps) {
    const info = act.getActionStepInfo(step.type);
    if (!info.cost) {
      continue;
    }
    const cost = info.cost(step);
    if (cost === undefined) {
      missingPrices++;
      continue;
    }
    const exchange = (step as { exchange?: string }).exchange;
    const currency = exchangesStore.getByCode(exchange)?.currency.code ?? '?';
    costs.set(currency, (costs.get(currency) ?? 0) + cost);
  }
  if (costs.size > 0 || missingPrices > 0) {
    const text = [...costs.entries()].map(([currency, x]) => `${fixed0(x)} ${currency}`);
    parts.push({ text: t('act.run.totalCost') });
    parts.push({ text: text.length > 0 ? text.join(' + ') : '--', yellow: true });
    if (missingPrices > 0) {
      parts.push({ text: t('act.run.missingPrices', missingPrices) });
    }
  }
  return parts;
}

const orderBookTimeoutMs = 5000;

// Prices come from order books, which load only when a CXPO window is open.
// Open the missing ones hidden, and close each one when its data arrives (or on timeout).
async function preloadOrderBooks(steps: ActionStep[]) {
  const missing = new Set<string>();
  for (const step of steps) {
    if (step.type !== 'CXPO_BUY') {
      continue;
    }
    const data = step as unknown as { ticker: string; exchange: string };
    const cxTicker = `${data.ticker}.${data.exchange}`;
    if (!cxobStore.getByTicker(cxTicker)) {
      missing.add(cxTicker);
    }
  }
  if (missing.size === 0) {
    return;
  }
  const timedOut = ref(false);
  const tickers = [...missing];
  const isLoaded = (cxTicker: string) => cxobStore.getByTicker(cxTicker) !== undefined;
  for (const cxTicker of tickers) {
    const closeWhen = computed(() => timedOut.value || isLoaded(cxTicker));
    await showBuffer(`CXPO ${cxTicker}`, { autoClose: true, closeWhen });
  }
  // Start the timeout after all windows are open, so slow opening doesn't eat into it.
  const timer = setTimeout(() => (timedOut.value = true), orderBookTimeoutMs);
  try {
    await watchUntil(() => timedOut.value || tickers.every(isLoaded));
  } finally {
    clearTimeout(timer);
    timedOut.value = true;
  }
}''')
