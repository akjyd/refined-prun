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
import { repriceOrder } from '@src/features/XIT/ORDERS/reprice';
import { dropPrice } from '@src/core/price-step';
import { showErrorOverlay } from '@src/infrastructure/prun-ui/tile-overlay';

// The order book of one material with your orders in it.
const { ticker, exchange, refreshKey } = defineProps<{
  ticker: string;
  exchange: string;
  // Changes when the player presses REFRESH.
  refreshKey: number;
}>();

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
  // A deleted or filled order of yours, kept until REFRESH.
  gone?: boolean;
}

const liveRows = computed(() => {
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

// Your orders that left the book stay as faded rows until REFRESH, so you can see what you
// deleted (to merge orders) and a placed-again order does not flicker.
const gone = ref(new Map<string, Row>());
watch(liveRows, (now, before) => {
  const ids = new Set(now.map(x => x.id));
  for (const row of before ?? []) {
    if (row.own && !ids.has(row.id) && !gone.value.has(row.id)) {
      gone.value.set(row.id, { ...row, gone: true, mark: undefined, first: false });
    }
  }
});
watch(
  () => refreshKey,
  () => gone.value.clear(),
);

const rows = computed(() => {
  const all = [...liveRows.value, ...gone.value.values()];
  all.sort((a, b) => (b.price !== a.price ? b.price - a.price : Number(b.ask) - Number(a.ask)));
  const firstBid = all.find(x => !x.ask);
  return all.map(x => ({ ...x, first: x === firstBid }));
});

// Drag one of your orders to another place in the book to place it again there.
const dragged = ref<Row>();
// Index of the row the drop line is above; rows.length means below the last row.
const dropAt = ref<number>();
const busy = ref(false);

function onDragStart(e: DragEvent, row: Row) {
  if (!row.own || busy.value) {
    e.preventDefault();
    return;
  }
  dragged.value = row;
  e.dataTransfer?.setData('text/plain', row.id);
}

function onDragOver(e: DragEvent, index: number) {
  if (!dragged.value) {
    return;
  }
  e.preventDefault();
  const el = e.currentTarget as HTMLElement;
  const below = e.offsetY > el.clientHeight / 2;
  dropAt.value = below ? index + 1 : index;
}

function onDragEnd() {
  dragged.value = undefined;
  dropAt.value = undefined;
}

// The new price at the drop line, or undefined when the order would cross the spread.
const newPrice = computed(() => {
  const row = dragged.value;
  const at = dropAt.value;
  if (!row || at === undefined) {
    return undefined;
  }
  const list = rows.value.filter(x => !x.gone);
  const at2 = rows.value.slice(0, at).filter(x => !x.gone).length;
  const above = list
    .slice(0, at2)
    .filter(x => x.id !== row.id)
    .at(-1);
  const below = list.slice(at2).find(x => x.id !== row.id);
  const price = dropPrice(row.ask, above?.price, below?.price);
  if (price === undefined || price === row.price) {
    return undefined;
  }
  const bestBid = list.find(x => !x.ask && x.id !== row.id)?.price;
  const bestAsk = list.filter(x => x.ask && x.id !== row.id).at(-1)?.price;
  if (row.ask && bestBid !== undefined && price <= bestBid) {
    return undefined;
  }
  if (!row.ask && bestAsk !== undefined && price >= bestAsk) {
    return undefined;
  }
  return price;
});

async function onDrop(e: DragEvent) {
  e.preventDefault();
  const row = dragged.value;
  const price = newPrice.value;
  onDragEnd();
  const order = row ? cxosStore.getById(row.id) : undefined;
  const target = e.target as Element;
  if (!row || !order) {
    return;
  }
  if (price === undefined) {
    showErrorOverlay(target, t('orders.badDrop'));
    return;
  }
  busy.value = true;
  try {
    await repriceOrder(target, order, price);
  } finally {
    busy.value = false;
  }
}

// Scroll the card to the spread (between offers and requests) once the book arrives.
const body = ref<HTMLElement>();
let scrolled = false;
watch(
  rows,
  async () => {
    if (scrolled || rows.value.length === 0) {
      return;
    }
    await nextTick();
    const own = body.value?.querySelector<HTMLElement>(`.${$style.spread}`);
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
        v-for="(r, index) in rows"
        :key="r.id"
        :draggable="r.own && !r.gone"
        :data-price="newPrice !== undefined ? fixed02(newPrice) : ''"
        :class="[
          $style.row,
          r.own ? $style.own : undefined,
          r.gone ? $style.gone : undefined,
          r.first ? $style.spread : undefined,
          dropAt === index ? $style.dropAbove : undefined,
          dropAt === rows.length && index === rows.length - 1 ? $style.dropBelow : undefined,
        ]"
        @dragstart="onDragStart($event, r)"
        @dragover="onDragOver($event, index)"
        @dragend="onDragEnd"
        @drop="onDrop">
        <span :class="r.mark">{{ formatProfit(r.profit) }}</span>
        <span :class="[$style.num, $style.amount, r.own ? link.link : undefined]">
          <DeleteExchangeOrderButton
            v-if="r.own && !r.gone"
            :order-id="r.id"
            screen-command="CXOS" />
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
  /* Match the game scrollbar. */
  scrollbar-width: thin;
  scrollbar-color: rgb(51, 51, 51) transparent;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background-color: rgb(51, 51, 51);
    border-radius: 5px;
  }
}

.row {
  border-top: 1px solid #2a2a2a;
}

.spread {
  border-top: 1px solid #5a5a5a;
}

.gone {
  opacity: 0.4;
  text-decoration: line-through;
}

.own {
  font-weight: bold;
  cursor: grab;
}

/* The drop line, with the new price on it. */
.dropAbove,
.dropBelow {
  position: relative;
}

.dropAbove::before,
.dropBelow::after {
  content: attr(data-price);
  position: absolute;
  left: 0;
  right: 0;
  z-index: 1;
  height: 0;
  border-top: 2px solid #f7a600;
  color: #f7a600;
  font-size: 11px;
  font-weight: bold;
  line-height: 0;
  text-align: center;
  pointer-events: none;
}

.dropAbove::before {
  top: -1px;
}

.dropBelow::after {
  bottom: -1px;
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
