<script setup lang="ts">
import PriceLadder from '@src/features/XIT/CX4/PriceLadder.vue';
import ProfitChart from '@src/features/XIT/ARB/ProfitChart.vue';
import { historyKey } from '@src/core/arb-history';
import { arbHistory, HISTORY_DAYS, HISTORY_SHIP } from '@src/features/XIT/ARB/arb-history-store';
import { getShipSize } from '@src/core/ship-sizes';
import { t } from '@src/i18n';
import { ArbPlanResult } from '@src/core/arb-plan';
import { formatProfit } from '@src/core/daily-profit/profit-format';
import { fixed0, percent1 } from '@src/utils/format';
import { startArbBatch } from '@src/features/XIT/ARBLOG/arb-batch-store';

// The two live order books of a trade, as in XIT CX4. The orders the trade takes are gold; a
// part-taken order shows taken/amount. For "listed", your offer shows in the offers of the end
// exchange. The whole books show, with the trader names as in the game's CXOB.
const { ticker, from, to, plan, canFill, listed, daily } = defineProps<{
  ticker: string;
  from: string;
  to: string;
  plan: ArbPlanResult;
  // True when the requests of the end exchange can take a part at once.
  canFill: boolean;
  listed: boolean;
  daily: number;
}>();

const emit = defineEmits<{ mode: [listed: boolean]; pick: [units: number] }>();

// Clicking an offer of the start exchange means "buy up to here".
function onPick(exchange: string, units: number) {
  if (exchange === from) {
    emit('pick', units);
  }
}

// A buy placed from the CXPO of the start exchange becomes an arbitrage batch (XIT ARBLOG).
function onCxpo(exchange: string) {
  if (exchange !== from) {
    return;
  }
  startArbBatch({
    ticker,
    from,
    to,
    mode: plan.listUnits > 0 ? 'listed' : 'now',
    plan: {
      units: plan.units,
      cost: plan.cost,
      sellPrice: plan.listPrice ?? plan.revenue / Math.max(plan.units, 1),
      profit: plan.profit,
      return: plan.margin,
      safety: undefined,
      days: plan.days,
    },
  });
}

const $style = useCssModule();

const history = computed(
  () =>
    arbHistory.value.series[historyKey(plan.listUnits > 0 ? 'listed' : 'now', ticker, from, to)] ??
    [],
);
const shipLabel = getShipSize(HISTORY_SHIP)?.label ?? HISTORY_SHIP;

const takes = computed(() => {
  const map = new Map<string, number>();
  for (const fill of [...plan.fillsA, ...plan.fillsB]) {
    if (fill.id !== undefined && fill.take > 0) {
      map.set(fill.id, fill.take);
    }
  }
  return map;
});

// What you would offer on the end exchange, shown in its book at the price it would sit at.
const ghost = computed(() =>
  plan.listPrice !== undefined && plan.listUnits > 0
    ? { exchange: to, price: plan.listPrice, amount: plan.listUnits }
    : undefined,
);
</script>

<template>
  <div :class="$style.depth">
    <div :class="$style.alt">
      <span :class="$style.modes">
        <button
          v-if="canFill"
          :class="[$style.toggle, listed ? undefined : $style.toggleOn]"
          @click="emit('mode', false)">
          {{ t('arb.modeFill') }}
        </button>
        <button
          :class="[$style.toggle, listed || !canFill ? $style.toggleOn : undefined]"
          @click="emit('mode', true)">
          {{ t('arb.modeList') }}
        </button>
      </span>
      <span :class="$style.sum">
        <span :class="$style.pair"
          ><span :class="$style.muted">{{ t('arb.profit') }}</span>
          <span :class="$style.key">{{ formatProfit(plan.profit) }}</span></span
        >
        <span :class="$style.pair"
          ><span :class="$style.muted">{{ t('arb.return') }}</span>
          <span>{{ percent1(plan.margin) }}</span></span
        >
        <span :class="$style.pair"
          ><span :class="$style.muted">{{ t('arb.daily') }}</span>
          <span>{{ fixed0(daily) }}</span></span
        >
      </span>
    </div>
    <div :class="$style.chartTitle">{{ t('arb.chartTitle', shipLabel, HISTORY_DAYS) }}</div>
    <ProfitChart :points="history" />
    <PriceLadder
      :ticker="ticker"
      :exchanges="[from, to]"
      :takes="takes"
      traders
      :height="300"
      :ghost="ghost"
      @cxpo="onCxpo"
      @pick="onPick" />
  </div>
</template>

<style module>
.depth {
  display: grid;
  gap: var(--rpz-space-2);
  padding: 8px 8px 12px 102px;
  background-color: var(--rpz-bg-raised);
  border-top: 1px solid var(--rpz-stroke-weak);
}

.alt {
  display: flex;
  align-items: center;
  gap: var(--rpz-space-2);
}

.toggle {
  padding: 2px 10px;
  border: 1px solid var(--rpz-stroke);
  background: none;
  color: var(--rpz-text);
  font: inherit;
  cursor: pointer;
}

.toggle:hover:not(:disabled) {
  background-color: var(--rpz-hover);
}

.toggle:disabled {
  color: var(--rpz-text-off);
  cursor: default;
}

.toggleOn {
  border-color: var(--rpz-brand);
  color: var(--rpz-text-strong);
}

.modes {
  display: flex;
  gap: 2px;
}

.sum {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 2px var(--rpz-space-3);
}

/* Label and number stay together; the space between pairs is wider than inside one. */
.pair {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
}

.muted {
  color: var(--rpz-text-weak);
}

.key {
  color: var(--rpz-text-strong);
}

.chartTitle {
  color: var(--rpz-text-weak);
  font-size: var(--rpz-fs-label);
}
</style>
