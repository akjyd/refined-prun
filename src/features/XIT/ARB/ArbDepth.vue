<script setup lang="ts">
import PriceLadder from '@src/features/XIT/CX4/PriceLadder.vue';
import ProfitChart from '@src/features/XIT/ARB/ProfitChart.vue';
import { historyKey } from '@src/core/arb-history';
import { arbHistory, HISTORY_DAYS, HISTORY_SHIP } from '@src/features/XIT/ARB/arb-history-store';
import { getShipSize } from '@src/core/ship-sizes';
import { t } from '@src/i18n';
import { ArbitrageMode } from '@src/core/arbitrage';
import { tradeOf } from '@src/features/XIT/ARB/arb-books';
import { startArbBatch } from '@src/features/XIT/ARBLOG/arb-batch-store';

// The two live order books of a trade, as in XIT CX4. The orders the trade takes are gold; a
// part-taken order shows taken/amount. For "listed", your offer shows in the offers of the end
// exchange. The whole books show, with the trader names as in the game's CXOB.
const { ticker, from, to, mode, capacity, safety } = defineProps<{
  ticker: string;
  from: string;
  to: string;
  mode: ArbitrageMode;
  capacity: number;
  safety?: number;
}>();

// A buy placed from the CXPO of the start exchange becomes an arbitrage batch (XIT ARBLOG).
function onCxpo(exchange: string) {
  const r = result.value;
  if (exchange !== from || !r) {
    return;
  }
  startArbBatch({
    ticker,
    from,
    to,
    mode,
    plan: {
      units: r.units,
      cost: r.cost,
      sellPrice: r.sell,
      profit: r.profit,
      return: r.cost > 0 ? r.profit / r.cost : 0,
      safety,
    },
  });
}

const $style = useCssModule();

const history = computed(() => arbHistory.value.series[historyKey(mode, ticker, from, to)] ?? []);
const shipLabel = getShipSize(HISTORY_SHIP)?.label ?? HISTORY_SHIP;

// The same trade the list shows, with the same hurdle (arb-books.ts).
const result = computed(() => tradeOf(ticker, from, to, mode, capacity)?.result);

const takes = computed(() => {
  const map = new Map<string, number>();
  const r = result.value;
  for (const fill of [...(r?.fillsA ?? []), ...(mode === 'now' ? (r?.fillsB ?? []) : [])]) {
    if (fill.id !== undefined && fill.take > 0) {
      map.set(fill.id, fill.take);
    }
  }
  return map;
});

const ghost = computed(() => {
  const r = result.value;
  return mode === 'listed' && r ? { exchange: to, price: r.sell, amount: r.units } : undefined;
});
</script>

<template>
  <div :class="$style.depth">
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

.chartTitle {
  color: var(--rpz-text-weak);
  font-size: var(--rpz-fs-label);
}
</style>
