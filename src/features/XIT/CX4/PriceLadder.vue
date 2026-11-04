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
import { fixed0, fixed02 } from '@src/utils/format';
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
  // The cheapest order of its exchange above 15w, or the dearest one below 10w.
  mark?: string;
  // The lowest offer or the highest request of its exchange (the spread edge).
  edge?: string;
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
    const orders: Row[] = [];
    const add = (order: PrunApi.CXBrokerOrder, ask: boolean) => {
      const row: Row = {
        id: order.id,
        column,
        ask,
        price: order.limit.amount,
        amount: order.amount === null ? '∞' : fixed0(order.amount),
        profit: r ? profitOf(r, withPrice(price, ticker, order.limit.amount)) : undefined,
        own: order.trader.id === ownId,
      };
      orders.push(row);
      result.push(row);
    };
    for (const order of book.sellingOrders) {
      add(order, true);
    }
    for (const order of book.buyingOrders) {
      add(order, false);
    }
    markColumn(orders);
  }
  // Higher price first; at the same price, offers above requests.
  result.sort((a, b) => (b.price !== a.price ? b.price - a.price : Number(b.ask) - Number(a.ask)));
  return result;
});

// The profit at an order of one exchange falls with its price, so on the way down the first
// order at or below 15w and the first below 10w are where the profit crosses the limits.
function markColumn(column: Row[]) {
  column.sort((a, b) => b.price - a.price);
  const good = column.findLast(x => x.profit !== undefined && x.profit > GOOD);
  const bad = column.find(x => x.profit !== undefined && x.profit < BAD);
  if (good) {
    good.mark = C.ColoredValue.positive;
  }
  if (bad) {
    bad.mark = C.ColoredValue.negative;
  }
  const lowestAsk = column.findLast(x => x.ask);
  const highestBid = column.find(x => !x.ask);
  if (lowestAsk) {
    lowestAsk.edge = $style.askEdge;
  }
  if (highestBid) {
    highestBid.edge = $style.bidEdge;
  }
}

const loaded = computed(() => books.value.filter(x => x !== undefined).length);
</script>

<template>
  <div :class="$style.ladder">
    <div :class="[$style.row, $style.head]">
      <span v-for="code in exchanges" :key="code" :class="$style.headCell">
        <span :class="$style.code">{{ code }}</span>
        <span :class="$style.columns">
          <span>{{ t('cxob.profitHead') }}</span>
          <span :class="$style.num">{{ t('cx4.amount') }}</span>
          <span :class="$style.num">{{ t('cx4.price') }}</span>
        </span>
      </span>
    </div>
    <p v-if="loaded === 0" :class="$style.muted">{{ t('cx4.loading') }}</p>
    <div v-for="r in rows" :key="r.id" :class="$style.row">
      <span
        v-for="(code, i) in exchanges"
        :key="code"
        :class="
          i === r.column
            ? [$style.cell, r.ask ? $style.ask : $style.bid, r.edge, r.own ? $style.own : undefined]
            : $style.empty
        ">
        <template v-if="i === r.column">
          <DeleteExchangeOrderButton v-if="r.own" :order-id="r.id" screen-command="CXOS" />
          <span :class="r.mark">{{ formatProfit(r.profit) }}</span>
          <span :class="$style.num">{{ r.amount }}</span>
          <span :class="[$style.num, $style.price]">{{ fixed02(r.price) }}</span>
        </template>
      </span>
    </div>
  </div>
</template>

<style module>
.ladder {
  min-width: 0;
  font-variant-numeric: tabular-nums;
}

.row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0 4px;
}

.head {
  position: sticky;
  top: 0;
  z-index: 1;
  padding-bottom: 2px;
  background-color: #1e1e1e;
}

.headCell {
  display: grid;
  gap: 2px;
  padding: 4px 8px;
  background-color: #2a2a2a;
}

.code {
  color: #eee;
  font-weight: bold;
}

.columns,
.cell {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 52px 70px;
  gap: 0 6px;
}

.columns {
  color: #8c8c8c;
  font-size: 11px;
}

.cell {
  position: relative;
  padding: 2px 8px;
  line-height: 16px;
}

.empty {
  min-height: 20px;
}

/* Offers on a dark red ground, requests on a dark green ground. */
.ask {
  background-color: rgba(217, 83, 79, 0.1);
}

.ask .price {
  color: #d9534f;
}

.bid {
  background-color: rgba(92, 184, 92, 0.1);
}

.bid .price {
  color: #5cb85c;
}

/* The spread of the exchange: below its lowest offer, above its highest request. */
.askEdge {
  box-shadow: inset 0 -1px 0 #d9534f;
}

.bidEdge {
  box-shadow: inset 0 1px 0 #5cb85c;
}

/* Room for the del button on your own orders. */
.own {
  padding-left: 40px;
  outline: 1px solid #f7a600;
  outline-offset: -1px;
}

.num {
  text-align: right;
}

.muted {
  color: #8c8c8c;
}
</style>
