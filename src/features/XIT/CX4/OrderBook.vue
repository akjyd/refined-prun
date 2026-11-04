<script setup lang="ts">
import { cxobStore } from '@src/infrastructure/prun-api/data/cxob';
import { companyStore } from '@src/infrastructure/prun-api/data/company';
import {
  chosenRecipe,
  exchangePrice,
  profitOf,
  withPrice,
} from '@src/core/daily-profit/recipe-choice';
import { formatProfit, profitClass } from '@src/core/daily-profit/profit-format';
import { fixed0, fixed2 } from '@src/utils/format';
import { t } from '@src/i18n';

const { ticker, exchange } = defineProps<{ ticker: string; exchange: string }>();

const $style = useCssModule();

const ROWS = 10;

const book = computed(() => cxobStore.getByTicker(`${ticker}.${exchange}`));
const recipe = computed(() => chosenRecipe(ticker));

interface Row {
  id: string;
  price: number;
  amount: string;
  profit?: number;
  own: boolean;
}

function toRow(order: PrunApi.CXBrokerOrder): Row {
  const r = recipe.value;
  const price = order.limit.amount;
  return {
    id: order.id,
    price,
    amount: order.amount === null ? '∞' : fixed0(order.amount),
    profit: r ? profitOf(r, withPrice(exchangePrice(exchange), ticker, price)) : undefined,
    own: order.trader.id === companyStore.value?.id,
  };
}

// Cheapest offers next to the spread, the highest on top.
const offers = computed(() =>
  [...(book.value?.sellingOrders ?? [])]
    .sort((a, b) => a.limit.amount - b.limit.amount)
    .slice(0, ROWS)
    .reverse()
    .map(toRow),
);

const requests = computed(() =>
  [...(book.value?.buyingOrders ?? [])]
    .sort((a, b) => b.limit.amount - a.limit.amount)
    .slice(0, ROWS)
    .map(toRow),
);

const spread = computed(() => {
  const ask = book.value?.ask?.price.amount;
  const bid = book.value?.bid?.price.amount;
  return ask !== undefined && bid !== undefined ? fixed2(ask - bid) : '--';
});
</script>

<template>
  <div :class="$style.book">
    <div :class="$style.title">{{ ticker }}.{{ exchange }}</div>
    <div v-if="!book" :class="$style.muted">{{ t('cx4.loading') }}</div>
    <template v-else>
      <div :class="[$style.row, $style.head]">
        <span>{{ t('cxob.profitHead') }}</span>
        <span :class="$style.num">{{ t('cx4.amount') }}</span>
        <span :class="$style.num">{{ t('cx4.price') }}</span>
      </div>
      <div v-for="r in offers" :key="r.id" :class="[$style.row, r.own ? $style.own : undefined]">
        <span :class="profitClass(r.profit)">{{ formatProfit(r.profit) }}</span>
        <span :class="$style.num">{{ r.amount }}</span>
        <span :class="[$style.num, C.ColoredValue.negative]">{{ fixed2(r.price) }}</span>
      </div>
      <div :class="$style.spread">{{ t('cx4.spread', spread) }}</div>
      <div v-for="r in requests" :key="r.id" :class="[$style.row, r.own ? $style.own : undefined]">
        <span :class="profitClass(r.profit)">{{ formatProfit(r.profit) }}</span>
        <span :class="$style.num">{{ r.amount }}</span>
        <span :class="[$style.num, C.ColoredValue.positive]">{{ fixed2(r.price) }}</span>
      </div>
    </template>
  </div>
</template>

<style module>
.book {
  min-width: 0;
  background-color: #232323;
  border: 1px solid #2c2c2c;
}

.title {
  padding: 4px 8px;
  color: #eee;
  font-weight: bold;
  background-color: #2a2a2a;
}

.row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 56px 76px;
  gap: 0 6px;
  padding: 2px 8px;
  border-top: 1px solid #2a2a2a;
  font-variant-numeric: tabular-nums;
}

.head {
  color: #8c8c8c;
  font-size: 12px;
  border-top: none;
}

.num {
  text-align: right;
}

.own {
  background-color: rgba(247, 166, 0, 0.12);
}

.spread {
  padding: 3px 8px;
  text-align: center;
  color: #8c8c8c;
  font-size: 12px;
}

.muted {
  padding: 6px 8px;
  color: #8c8c8c;
}
</style>
