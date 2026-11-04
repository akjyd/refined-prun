<script setup lang="ts">
import DeleteExchangeOrderButton from '@src/components/DeleteExchangeOrderButton.vue';
import PrunLink from '@src/components/PrunLink.vue';
import MaterialIcon from '@src/components/MaterialIcon.vue';
import { cxobStore } from '@src/infrastructure/prun-api/data/cxob';
import { cxosStore } from '@src/infrastructure/prun-api/data/cxos';
import { companyStore } from '@src/infrastructure/prun-api/data/company';
import {
  chosenRecipe,
  exchangePrice,
  profitOf,
  withPrice,
} from '@src/core/daily-profit/recipe-choice';
import { formatProfit, profitMarks } from '@src/core/daily-profit/profit-format';
import { fixed0, fixed02 } from '@src/utils/format';
import { t } from '@src/i18n';
import link from '@src/infrastructure/prun-ui/css/link.module.css';

// The order book of one material with your orders in it.
const { ticker, exchange } = defineProps<{ ticker: string; exchange: string }>();

const $style = useCssModule();

const book = computed(() => cxobStore.getByTicker(`${ticker}.${exchange}`));
const recipe = computed(() => chosenRecipe(ticker));

interface Row {
  id: string;
  ask: boolean;
  price: number;
  amount: string;
  profit?: number;
  own: boolean;
  mark?: string;
  first: boolean;
}

const rows = computed(() => {
  const b = book.value;
  if (!b) {
    return [];
  }
  const r = recipe.value;
  const price = exchangePrice(exchange);
  const ownId = companyStore.value?.id;
  const toRow = (order: PrunApi.CXBrokerOrder, ask: boolean): Row => {
    const own = order.trader.id === ownId;
    // Your own orders show the amount left / the amount placed.
    const mine = own ? cxosStore.getById(order.id) : undefined;
    const amount = order.amount === null ? '∞' : fixed0(order.amount);
    return {
      id: order.id,
      ask,
      price: order.limit.amount,
      amount: mine ? `${fixed0(mine.amount)}/${fixed0(mine.initialAmount)}` : amount,
      profit: r ? profitOf(r, withPrice(price, ticker, order.limit.amount)) : undefined,
      own,
      first: false,
    };
  };
  const asks = b.sellingOrders.map(x => toRow(x, true)).sort((x, y) => y.price - x.price);
  const bids = b.buyingOrders.map(x => toRow(x, false)).sort((x, y) => y.price - x.price);
  if (bids.length > 0) {
    bids[0].first = true;
  }
  const all = [...asks, ...bids];
  const marks = profitMarks(all);
  for (const row of all) {
    row.mark = marks.get(row.id);
  }
  return all;
});

// Scroll the card to your first order once the book arrives.
const body = ref<HTMLElement>();
let scrolled = false;
watch(
  rows,
  async () => {
    if (scrolled || rows.value.length === 0) {
      return;
    }
    await nextTick();
    const own = body.value?.querySelector<HTMLElement>(`.${$style.own}`);
    if (body.value && own) {
      body.value.scrollTop = own.offsetTop - body.value.clientHeight / 2;
      scrolled = true;
    }
  },
  { immediate: true },
);
</script>

<template>
  <div :class="$style.card">
    <div :class="$style.title">
      <span :class="$style.icon"><MaterialIcon size="inline-table" :ticker="ticker" /></span>
      <span :class="$style.spacer" />
      <PrunLink inline :command="`CXPO ${ticker}.${exchange}`" />
    </div>
    <div :class="$style.columns">
      <span>{{ t('cxob.profitHead') }}</span>
      <span :class="$style.num">{{ t('cx4.amount') }}</span>
      <span :class="$style.num">{{ t('cx4.price') }}</span>
    </div>
    <div ref="body" :class="$style.body">
      <p v-if="!book" :class="$style.muted">{{ t('cx4.loading') }}</p>
      <div
        v-for="r in rows"
        :key="r.id"
        :class="[$style.row, r.own ? $style.own : undefined, r.first ? $style.spread : undefined]">
        <span :class="r.mark">{{ formatProfit(r.profit) }}</span>
        <span :class="[$style.num, $style.amount, r.own ? link.link : undefined]">
          <DeleteExchangeOrderButton v-if="r.own" :order-id="r.id" screen-command="CXOS" />
          {{ r.amount }}
        </span>
        <span :class="[$style.num, r.ask ? C.ColoredValue.negative : C.ColoredValue.positive]">
          {{ fixed02(r.price) }}
        </span>
      </div>
    </div>
  </div>
</template>

<style module>
.card {
  min-width: 0;
  background-color: #232323;
  border: 1px solid #2c2c2c;
  font-variant-numeric: tabular-nums;
}

.title {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  background-color: #2a2a2a;
}

.icon {
  display: inline-flex;
  pointer-events: none;
}

.spacer {
  flex: 1;
}

.columns,
.row {
  display: grid;
  grid-template-columns: minmax(44px, 1fr) 96px 70px;
  gap: 0 6px;
  padding: 1px 8px;
}

.columns {
  color: #8c8c8c;
  font-size: 11px;
}

.body {
  position: relative;
  height: 260px;
  overflow-y: auto;
}

.row {
  border-top: 1px solid #2a2a2a;
  line-height: 17px;
}

.spread {
  border-top: 1px solid #5a5a5a;
}

.own {
  font-weight: bold;
}

.amount {
  position: relative;
  padding-left: 22px;
}

.num {
  text-align: right;
}

.muted {
  padding: 6px 8px;
  color: #8c8c8c;
}
</style>
