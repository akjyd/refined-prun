<script setup lang="ts">
import { cxLabel } from '@src/core/exchange-label';
import OrderCard from '@src/features/XIT/ORDERS/OrderCard.vue';
import ChipGroup from '@src/components/ChipGroup.vue';
import { cxosStore } from '@src/infrastructure/prun-api/data/cxos';
import { materialsStore } from '@src/infrastructure/prun-api/data/materials';
import { compareMaterials } from '@src/core/sort-materials';
import { HiddenOrderBooks } from '@src/infrastructure/prun-ui/hidden-order-books';
import { userData } from '@src/store/user-data';
import { filledOrders, startOrdersVisit } from '@src/core/order-seen';
import MaterialIcon from '@src/components/MaterialIcon.vue';
import { fixed0 } from '@src/utils/format';
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

// A card stays after its last order is deleted or filled, so a card does not flicker while an
// order is placed again, and you can delete several orders to merge them. REFRESH drops the
// cards without orders.
const kept = ref(new Map<string, Set<string>>());
watchEffect(() => {
  for (const [code, set] of byExchange.value) {
    const old = kept.value.get(code);
    if (!old || [...set].some(x => !old.has(x))) {
      kept.value.set(code, new Set([...(old ?? []), ...set]));
    }
  }
});

// Cards and deleted orders stay until the window closes.
const refreshKey = ref(0);

// One tab per exchange, with the number of materials you have orders for.
const exchangeTabs = computed(() =>
  EXCHANGES.map(code => ({
    value: code,
    label: cxLabel(code),
    alert: filled.value.filter(x => x.exchange === code).length,
    count: byExchange.value.get(code)?.size ?? 0,
  })),
);

// Orders with units filled since the previous visit: a bar on top and a red number on each
// exchange tab, so a fill is not missed (player, 2026-11-06).
const filled = computed(() => filledOrders());

async function showFill(order: { ticker: string; exchange: string }) {
  exchange.value = order.exchange;
  await nextTick();
  document
    .querySelector(`[data-order-card="${order.ticker}.${order.exchange}"]`)
    ?.scrollIntoView({ block: 'nearest' });
}

// A pinned book stays in the list even with no orders at all (player, 2026-11-07).
const pinned = computed(() =>
  userData.pinnedBooks.filter(x => x.endsWith(`.${exchange.value}`)).map(x => x.split('.')[0]),
);

const tickers = computed(() =>
  [...new Set([...(kept.value.get(exchange.value) ?? []), ...pinned.value])].sort((a, b) =>
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
// Save this visit's amounts as soon as the orders are loaded.
const stopVisit = watchEffect(() => {
  if (startOrdersVisit()) {
    queueMicrotask(() => stopVisit());
  }
});
</script>

<template>
  <div :class="$style.root">
    <div v-if="filled.length > 0" :class="$style.fills">
      <span :class="$style.fillsTitle">{{ t('orders.filledSince', filled.length) }}</span>
      <button v-for="f in filled" :key="f.id" :class="$style.fill" @click="showFill(f)">
        <MaterialIcon size="inline-table" :ticker="f.ticker" />
        {{ cxLabel(f.exchange) }}
        <span :class="$style.minus">−{{ fixed0(f.filled) }}</span>
      </button>
    </div>
    <div :class="$style.tabs">
      <ChipGroup v-model="exchange" :options="exchangeTabs" />
    </div>
    <p v-if="tickers.length === 0" :class="$style.muted">{{ t('orders.none') }}</p>
    <div :class="$style.cards">
      <OrderCard
        v-for="ticker in tickers"
        :key="`${ticker}.${exchange}`"
        :data-order-card="`${ticker}.${exchange}`"
        :ticker="ticker"
        :exchange="exchange"
        :refresh-key="refreshKey" />
    </div>
  </div>
</template>

<style module>
.root {
  padding: 6px 8px;
  color: var(--rpz-text);
}

.fills {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--rpz-space-1) var(--rpz-space-2);
  padding: var(--rpz-space-2);
  margin-bottom: var(--rpz-space-2);
  background-color: var(--rpz-bg-raised);
  box-shadow: inset 2px 0 0 var(--rpz-mark);
}

.fillsTitle {
  color: var(--rpz-text-strong);
  font-weight: bold;
}

.fill {
  display: inline-flex;
  align-items: center;
  gap: var(--rpz-space-1);
  padding: 2px 6px;
  border: 1px solid var(--rpz-stroke);
  background: none;
  color: var(--rpz-text);
  font: inherit;
  cursor: pointer;
}

.fill:hover {
  background-color: var(--rpz-hover);
}

/* A fill is something new, not a warning: the gold of the change marks (player, 2026-11-06). */
.minus {
  color: var(--rpz-mark);
  font-weight: bold;
}

.tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 8px;
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 8px;
}

.muted {
  color: var(--rpz-text-weak);
}
</style>
