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

// All orders of the four exchanges in one price table: one order per row, the highest price on
// top, each order in the column of its exchange. The height of a row shows its price, so the
// exchanges compare at a glance.
const { ticker, exchanges } = defineProps<{ ticker: string; exchanges: string[] }>();

const $style = useCssModule();

const GOOD = 150_000;
const BAD = 100_000;

interface Row {
  id: string;
  column: number;
  ask: boolean;
  price: number;
  amount: string;
  profit?: number;
  own: boolean;
  line?: string;
}

const books = computed(() => exchanges.map(x => cxobStore.getByTicker(`${ticker}.${x}`)));
const recipe = computed(() => chosenRecipe(ticker));

const rows = computed(() => {
  const r = recipe.value;
  const ownId = companyStore.value?.id;
  const result: Row[] = [];
  for (const [column, book] of books.value.entries()) {
    if (!book) {
      continue;
    }
    const price = exchangePrice(exchanges[column]);
    const add = (order: PrunApi.CXBrokerOrder, ask: boolean) =>
      result.push({
        id: order.id,
        column,
        ask,
        price: order.limit.amount,
        amount: order.amount === null ? '∞' : fixed0(order.amount),
        profit: r ? profitOf(r, withPrice(price, ticker, order.limit.amount)) : undefined,
        own: order.trader.id === ownId,
      });
    for (const order of book.sellingOrders) {
      add(order, true);
    }
    for (const order of book.buyingOrders) {
      add(order, false);
    }
  }
  // Higher price first; at the same price, offers above requests.
  result.sort((a, b) => (b.price !== a.price ? b.price - a.price : Number(b.ask) - Number(a.ask)));
  // Lines where the daily profit falls below 15w (green) and 10w (red).
  let good = false;
  let bad = false;
  for (const row of result) {
    if (row.profit === undefined) {
      continue;
    }
    if (!good && row.profit <= GOOD) {
      good = true;
      row.line = $style.lineGood;
    }
    if (!bad && row.profit < BAD) {
      bad = true;
      row.line = $style.lineBad;
    }
  }
  return result;
});

const loaded = computed(() => books.value.filter(x => x !== undefined).length);
</script>

<template>
  <div :class="$style.ladder">
    <div :class="[$style.row, $style.head]">
      <span v-for="code in exchanges" :key="code" :class="$style.headCell">
        {{ ticker }}.{{ code }}
      </span>
    </div>
    <p v-if="loaded === 0" :class="$style.muted">{{ t('cx4.loading') }}</p>
    <div v-for="r in rows" :key="r.id" :class="[$style.row, r.line]">
      <span
        v-for="(code, i) in exchanges"
        :key="code"
        :class="[
          $style.cell,
          i === r.column ? $style.filled : undefined,
          i === r.column && r.own ? $style.own : undefined,
        ]">
        <template v-if="i === r.column">
          <DeleteExchangeOrderButton v-if="r.own" :order-id="r.id" screen-command="CXOS" />
          <span>{{ formatProfit(r.profit) }}</span>
          <span :class="$style.num">{{ r.amount }}</span>
          <span :class="[$style.num, r.ask ? C.ColoredValue.negative : C.ColoredValue.positive]">
            {{ fixed2(r.price) }}
          </span>
        </template>
      </span>
    </div>
  </div>
</template>

<style module>
.ladder {
  min-width: 0;
}

.row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0 6px;
  border-top: 1px solid #262626;
}

.head {
  position: sticky;
  top: 0;
  z-index: 1;
  background-color: #1e1e1e;
  color: #eee;
  font-weight: bold;
  border-top: none;
}

.headCell {
  padding: 3px 8px;
}

.cell {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 50px 76px;
  gap: 0 6px;
  min-height: 18px;
  padding: 2px 8px;
  font-variant-numeric: tabular-nums;
}

.filled {
  background-color: #252525;
}

/* Room for the del button on your own orders. */
.own {
  padding-left: 40px;
  background-color: rgba(247, 166, 0, 0.22);
}

.num {
  text-align: right;
}

.lineGood {
  border-top: 2px solid #5cb85c;
}

.lineBad {
  border-top: 2px solid #d9534f;
}

.muted {
  color: #8c8c8c;
}
</style>
