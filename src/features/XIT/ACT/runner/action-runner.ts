import { act } from '@src/features/XIT/ACT/act-registry';
import { deepToRaw } from '@src/utils/deep-to-raw';
import { Logger } from '@src/features/XIT/ACT/runner/logger';
import { TileAllocator } from '@src/features/XIT/ACT/runner/tile-allocator';
import { StepMachine } from '@src/features/XIT/ACT/runner/step-machine';
import { StepGenerator } from '@src/features/XIT/ACT/runner/step-generator';
import { ActionPackageConfig, ActionStep } from '@src/features/XIT/ACT/shared-types';
import { materialsStore } from '@src/infrastructure/prun-api/data/materials';
import { fixed02 } from '@src/utils/format';
import { LogPart } from '@src/features/XIT/ACT/runner/logger';
import { cxobStore } from '@src/infrastructure/prun-api/data/cxob';
import { exchangesStore } from '@src/infrastructure/prun-api/data/exchanges';
import { showBuffer } from '@src/infrastructure/prun-ui/buffers';
import { watchUntil } from '@src/utils/watch';
import { fixed0 } from '@src/utils/format';
import { t } from '@src/i18n';

interface ActionRunnerOptions {
  tile: PrunTile;
  log: Logger;
  onBufferSplit: () => void;
  onStart: () => void;
  onEnd: () => void;
  onStatusChanged: (status: string, keepReady?: boolean) => void;
  onActReady: () => void;
  onSkipReady: () => void;
}

export class ActionRunner {
  private readonly tileAllocator: TileAllocator;
  private readonly stepGenerator: StepGenerator;
  private stepMachine?: StepMachine;

  constructor(private options: ActionRunnerOptions) {
    this.tileAllocator = new TileAllocator(options);
    this.stepGenerator = new StepGenerator(options);
  }

  get log() {
    return this.options.log;
  }

  get isRunning() {
    return this.stepMachine?.isRunning ?? false;
  }

  async preview(
    pkg: UserData.ActionPackageData,
    config: ActionPackageConfig,
    extraSteps?: ActionStep[],
  ) {
    if (this.isRunning) {
      this.log.error(t('act.run.alreadyRunning'));
      return;
    }
    // Create a copy to prevent changes during execution.
    const copy = structuredClone(deepToRaw(pkg));
    const { steps, fail } = await this.stepGenerator.generateSteps(copy, config, true);
    if (!fail && extraSteps && extraSteps.length > 0) {
      steps.push(...extraSteps);
    }
    if (steps.length === 0) {
      return;
    }
    this.options.onStatusChanged(t('act.run.loadingPrices'));
    await preloadOrderBooks(steps);
    this.log.info(formatTotals(steps));
    if (fail) {
      this.log.info(t('act.run.generated'));
    }
    for (const step of steps) {
      const stepInfo = act.getActionStepInfo(step.type);
      this.log.action(stepInfo.description(step));
    }
  }

  async execute(
    pkg: UserData.ActionPackageData,
    config: ActionPackageConfig,
    extraSteps?: ActionStep[],
  ) {
    if (this.isRunning) {
      this.log.error(t('act.run.alreadyRunning'));
      return;
    }
    // Create a copy to prevent changes during execution.
    const copy = structuredClone(deepToRaw(pkg));
    const { steps, fail } = await this.stepGenerator.generateSteps(copy, config, false);
    if (fail) {
      this.log.error(t('act.run.failed'));
      return;
    }
    if (extraSteps && extraSteps.length > 0) {
      steps.push(...extraSteps);
    }
    this.log.info(t('act.run.started'));
    this.log.info(formatTotals(steps));
    this.stepMachine = new StepMachine(steps, {
      ...this.options,
      tileAllocator: this.tileAllocator,
    });
    this.stepMachine.start();
  }

  act() {
    this.stepMachine?.act();
    if (!this.stepMachine?.isRunning) {
      this.stepMachine = undefined;
    }
  }

  skip() {
    this.stepMachine?.skip();
    if (!this.stepMachine?.isRunning) {
      this.stepMachine = undefined;
    }
  }

  cancel() {
    this.stepMachine?.cancel();
    this.stepMachine = undefined;
  }
}

function formatTotals(steps: ActionStep[]): LogPart[] {
  const aggregated: Record<string, number> = {};
  for (const step of steps) {
    const info = act.getActionStepInfo(step.type);
    const mats = info.totalMaterials?.(step);
    if (mats) {
      for (const [ticker, amount] of Object.entries(mats)) {
        aggregated[ticker] = (aggregated[ticker] ?? 0) + amount;
      }
    }
  }
  let totalWeight = 0;
  let totalVolume = 0;
  for (const [ticker, amount] of Object.entries(aggregated)) {
    const mat = materialsStore.getByTicker(ticker);
    if (mat) {
      totalWeight += mat.weight * amount;
      totalVolume += mat.volume * amount;
    }
  }
  const parts: LogPart[] = [
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
}
