<script setup lang="ts">
import PriceLadder from '@src/features/XIT/CX4/PriceLadder.vue';
import ProfitChart from '@src/features/XIT/ARB/ProfitChart.vue';
import { historyKey } from '@src/core/arb-history';
import { arbHistory, HISTORY_DAYS, HISTORY_SHIP } from '@src/features/XIT/ARB/arb-history-store';
import { getShipSize } from '@src/core/ship-sizes';
import { t } from '@src/i18n';
import { ArbPlanResult } from '@src/core/arb-plan';
import { isListOnly, toggleListOnly } from '@src/features/XIT/ARB/cart';
import { startArbBatch } from '@src/features/XIT/ARBLOG/arb-batch-store';

// The two live order books of a trade, as in XIT CX4. The orders the trade takes are gold; a
// part-taken order shows taken/amount. For "listed", your offer shows in the offers of the end
// exchange. The whole books show, with the trader names as in the game's CXOB.
const { ticker, from, to, plan } = defineProps<{
  ticker: string;
  from: string;
  to: string;
  plan: ArbPlanResult;
}>();

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

const listed = computed(() => isListOnly(ticker, from, to));

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
      <button
        :class="[$style.toggle, listed ? undefined : $style.toggleOn]"
        @click="listed && toggleListOnly(ticker, from, to)">
        {{ t('arb.modeFill') }}
      </button>
      <button
        :class="[$style.toggle, listed ? $style.toggleOn : undefined]"
        @click="!listed && toggleListOnly(ticker, from, to)">
        {{ t('arb.modeList') }}
      </button>
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
      @cxpo="onCxpo" />
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

.toggle:hover {
  background-color: var(--rpz-hover);
}

.toggleOn {
  border-color: var(--rpz-brand);
  color: var(--rpz-text-strong);
}

.chartTitle {
  color: var(--rpz-text-weak);
  font-size: var(--rpz-fs-label);
}
</style>
