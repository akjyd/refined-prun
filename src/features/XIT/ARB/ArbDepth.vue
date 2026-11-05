<script setup lang="ts">
import PriceLadder from '@src/features/XIT/CX4/PriceLadder.vue';
import { arbitrage, ArbitrageMode, BookLevel } from '@src/core/arbitrage';
import { cxobStore } from '@src/infrastructure/prun-api/data/cxob';

// The two live order books of a trade, as in XIT CX4. The orders the trade takes are gold; a
// part-taken order shows taken/amount. For "listed", your offer shows in the offers of the end
// exchange. Each side keeps two more orders.
const { ticker, from, to, mode, capacity } = defineProps<{
  ticker: string;
  from: string;
  to: string;
  mode: ArbitrageMode;
  capacity: number;
}>();

const $style = useCssModule();

function levels(orders: PrunApi.CXBrokerOrder[]): BookLevel[] {
  return orders.map(x => ({ price: x.limit.amount, amount: x.amount ?? undefined, id: x.id }));
}

const result = computed(() => {
  const a = cxobStore.getByTicker(`${ticker}.${from}`);
  const b = cxobStore.getByTicker(`${ticker}.${to}`);
  if (!a || !b) {
    return undefined;
  }
  return arbitrage(
    levels(a.sellingOrders),
    levels(b.buyingOrders),
    levels(b.sellingOrders),
    mode,
    capacity,
  );
});

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
    <PriceLadder :ticker="ticker" :exchanges="[from, to]" :takes="takes" :trim="2" :ghost="ghost" />
  </div>
</template>

<style module>
.depth {
  padding: 8px 8px 12px 64px;
  background-color: #252525;
  border-top: 1px solid #2c2c2c;
}
</style>
