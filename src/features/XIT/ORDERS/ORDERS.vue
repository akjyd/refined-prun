<script setup lang="ts">
import OrderCard from '@src/features/XIT/ORDERS/OrderCard.vue';
import { cxosStore } from '@src/infrastructure/prun-api/data/cxos';
import { materialsStore } from '@src/infrastructure/prun-api/data/materials';
import { compareMaterials } from '@src/core/sort-materials';
import { HiddenOrderBooks } from '@src/infrastructure/prun-ui/hidden-order-books';
import { userData } from '@src/store/user-data';
import { t } from '@src/i18n';

const $style = useCssModule();

const EXCHANGES = ['AI1', 'CI1', 'IC1', 'NC1'];

const exchange = ref(userData.cx4.ordersExchange ?? 'AI1');
watch(exchange, x => (userData.cx4.ordersExchange = x));

// Materials with your active orders, by exchange, in the game's icon order.
const byExchange = computed(() => {
  const result = new Map<string, Set<string>>(EXCHANGES.map(x => [x, new Set<string>()]));
  for (const order of cxosStore.active.value ?? []) {
    result.get(order.exchange.code)?.add(order.material.ticker);
  }
  return result;
});

const tickers = computed(() =>
  [...(byExchange.value.get(exchange.value) ?? [])].sort((a, b) =>
    compareMaterials(materialsStore.getByTicker(a), materialsStore.getByTicker(b)),
  ),
);

const books = new HiddenOrderBooks();
watch(
  () => tickers.value.map(x => `${x}.${exchange.value}`).join(','),
  value => void books.show(value === '' ? [] : value.split(',')),
  { immediate: true },
);
onUnmounted(() => books.close());
</script>

<template>
  <div :class="$style.root">
    <div :class="$style.tabs">
      <span
        v-for="code in EXCHANGES"
        :key="code"
        :class="[$style.tab, code === exchange ? $style.tabOn : undefined]"
        @click="exchange = code">
        {{ code }} <span :class="$style.count">{{ byExchange.get(code)?.size ?? 0 }}</span>
      </span>
    </div>
    <p v-if="tickers.length === 0" :class="$style.muted">{{ t('orders.none') }}</p>
    <div :class="$style.cards">
      <OrderCard
        v-for="ticker in tickers"
        :key="`${ticker}.${exchange}`"
        :ticker="ticker"
        :exchange="exchange" />
    </div>
  </div>
</template>

<style module>
.root {
  padding: 6px 8px;
}

.tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 8px;
}

.tab {
  padding: 4px 10px;
  background-color: #2a2a2a;
  cursor: pointer;
}

.tabOn {
  background-color: #f7a600;
  color: #1e1e1e;
}

.count {
  opacity: 0.7;
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 8px;
}

.muted {
  color: #8c8c8c;
}
</style>
