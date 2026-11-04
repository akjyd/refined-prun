<script setup lang="ts">
import DeleteExchangeOrderButton from '@src/components/DeleteExchangeOrderButton.vue';
import { cxobStore } from '@src/infrastructure/prun-api/data/cxob';
import { companyStore } from '@src/infrastructure/prun-api/data/company';
import {
  chosenRecipe,
  exchangePrice,
  profitOf,
  withPrice,
} from '@src/core/daily-profit/recipe-choice';
import { formatProfit } from '@src/core/daily-profit/profit-format';
import { fixed0, fixed2 } from '@src/utils/format';
import { t } from '@src/i18n';

const { ticker, exchange, bestAsk, bestBid } = defineProps<{
  ticker: string;
  exchange: string;
  // True when this exchange has the lowest offer / the highest request of the four.
  bestAsk: boolean;
  bestBid: boolean;
}>();

const $style = useCssModule();

const ROWS = 10;
const GOOD = 150_000;
const BAD = 100_000;

const book = computed(() => cxobStore.getByTicker(`${ticker}.${exchange}`));
const recipe = computed(() => chosenRecipe(ticker));

interface Row {
  id: string;
  price: number;
  amount: string;
  profit?: number;
  own: boolean;
  // A line above the row where the daily profit drops below 15w or 10w.
  line?: string;
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

// The rows go from the highest price to the lowest, so the profit falls row by row.
function markLines(rows: Row[]) {
  for (let i = 1; i < rows.length; i++) {
    const above = rows[i - 1].profit;
    const here = rows[i].profit;
    if (above === undefined || here === undefined) {
      continue;
    }
    if (above >= BAD && here < BAD) {
      rows[i].line = $style.lineBad;
    } else if (above > GOOD && here <= GOOD) {
      rows[i].line = $style.lineGood;
    }
  }
  return rows;
}

// The orders next to the spread, plus your own orders anywhere in the book.
function pick(orders: PrunApi.CXBrokerOrder[], nearFirst: (a: number, b: number) => number) {
  const sorted = [...orders].sort((a, b) => nearFirst(a.limit.amount, b.limit.amount));
  const ownId = companyStore.value?.id;
  return sorted.filter((x, i) => i < ROWS || x.trader.id === ownId);
}

const offers = computed(() =>
  markLines(
    pick(book.value?.sellingOrders ?? [], (a, b) => a - b)
      .reverse()
      .map(toRow),
  ),
);

const requests = computed(() =>
  markLines(pick(book.value?.buyingOrders ?? [], (a, b) => b - a).map(toRow)),
);

const ask = computed(() => book.value?.ask?.price.amount);
const bid = computed(() => book.value?.bid?.price.amount);
</script>

<template>
  <div :class="$style.book">
    <div :class="$style.title">
      <span>{{ exchange }}</span>
      <span :class="$style.quote">
        <span :class="bestAsk ? $style.best : undefined">
          {{ bestAsk ? '▼' : '' }}{{ ask !== undefined ? fixed2(ask) : '--' }}
        </span>
        <span :class="$style.muted">/</span>
        <span :class="bestBid ? $style.best : undefined">
          {{ bestBid ? '▲' : '' }}{{ bid !== undefined ? fixed2(bid) : '--' }}
        </span>
      </span>
    </div>
    <div v-if="!book" :class="$style.muted">{{ t('cx4.loading') }}</div>
    <template v-else>
      <div :class="[$style.row, $style.head]">
        <span>{{ t('cxob.profitHead') }}</span>
        <span :class="$style.num">{{ t('cx4.amount') }}</span>
        <span :class="$style.num">{{ t('cx4.price') }}</span>
      </div>
      <div
        v-for="r in offers"
        :key="r.id"
        :class="[$style.row, r.own ? $style.own : undefined, r.line]">
        <DeleteExchangeOrderButton v-if="r.own" :order-id="r.id" screen-command="CXOS" />
        <span>{{ formatProfit(r.profit) }}</span>
        <span :class="$style.num">{{ r.amount }}</span>
        <span :class="[$style.num, C.ColoredValue.negative]">{{ fixed2(r.price) }}</span>
      </div>
      <div :class="$style.spread">
        {{ t('cx4.spread', ask !== undefined && bid !== undefined ? fixed2(ask - bid) : '--') }}
      </div>
      <div
        v-for="r in requests"
        :key="r.id"
        :class="[$style.row, r.own ? $style.own : undefined, r.line]">
        <DeleteExchangeOrderButton v-if="r.own" :order-id="r.id" screen-command="CXOS" />
        <span>{{ formatProfit(r.profit) }}</span>
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
  display: flex;
  justify-content: space-between;
  gap: 6px;
  padding: 4px 8px;
  color: #eee;
  font-weight: bold;
  background-color: #2a2a2a;
}

.quote {
  display: flex;
  gap: 4px;
  font-weight: normal;
  font-variant-numeric: tabular-nums;
}

.best {
  color: #f7a600;
}

.row {
  position: relative;
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
  background-color: rgba(247, 166, 0, 0.18);
}

.lineGood {
  border-top: 2px solid #5cb85c;
}

.lineBad {
  border-top: 2px solid #d9534f;
}

.spread {
  padding: 3px 8px;
  text-align: center;
  color: #8c8c8c;
  font-size: 12px;
}

.muted {
  color: #8c8c8c;
}
</style>
