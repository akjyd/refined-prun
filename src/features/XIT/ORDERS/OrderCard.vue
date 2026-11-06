<script setup lang="ts">
import DeleteExchangeOrderButton from '@src/components/DeleteExchangeOrderButton.vue';
import CxpoButton from '@src/components/CxpoButton.vue';
import { getOwnCxOrder, orderChange } from '@src/core/order-seen';
import MaterialIcon from '@src/components/MaterialIcon.vue';
import { cxobStore } from '@src/infrastructure/prun-api/data/cxob';
import { exchangesStore } from '@src/infrastructure/prun-api/data/exchanges';
import { warehousesStore } from '@src/infrastructure/prun-api/data/warehouses';
import { storagesStore } from '@src/infrastructure/prun-api/data/storage';
import { companyStore } from '@src/infrastructure/prun-api/data/company';
import { orderProfit } from '@src/core/daily-profit/order-profit';
import PlanetPicker from '@src/components/PlanetPicker.vue';
import { formatProfit, profitMarks } from '@src/core/daily-profit/profit-format';
import { fixed0, fixed02, percent1 } from '@src/utils/format';
import { t } from '@src/i18n';
import { showBuffer } from '@src/infrastructure/prun-ui/buffers';
import { useOrderDrag } from '@src/hooks/use-order-drag';

// The order book of one material with your orders in it.
const { ticker, exchange, refreshKey } = defineProps<{
  ticker: string;
  exchange: string;
  // Changes when the player presses REFRESH.
  refreshKey: number;
}>();

const $style = useCssModule();

const book = computed(() => cxobStore.getByTicker(`${ticker}.${exchange}`));

interface Row {
  id: string;
  ask: boolean;
  price: number;
  amount: string;
  // Change of your order since you last left XIT ORDERS.
  change?: string;
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
  const profitAt = orderProfit(ticker, exchange);
  const ownId = companyStore.value?.id;
  const toRow = (order: PrunApi.CXBrokerOrder, ask: boolean): Row => {
    const own = order.trader.id === ownId;
    // Your own orders show the amount left / the amount placed.
    const mine = own ? getOwnCxOrder(order.id) : undefined;
    const amount = order.amount === null ? '∞' : fixed0(order.amount);
    return {
      id: order.id,
      ask,
      price: order.limit.amount,
      amount: mine ? `${fixed0(mine.amount)}/${fixed0(mine.initialAmount)}` : amount,
      profit: profitAt(order.limit.amount),
      own,
      first: false,
      change: mine ? orderChange(mine.id, mine.amount) : undefined,
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

// Best offer − best request, on the line between them.
const spread = computed(() => {
  const live = liveRows.value;
  const ask = live.filter(x => x.ask).at(-1)?.price;
  const bid = live.find(x => !x.ask)?.price;
  if (ask === undefined || bid === undefined) {
    return '';
  }
  return `${fixed0(ask - bid)} · ${percent1((ask - bid) / ask)}`;
});

// Units of the material in your warehouse at this exchange station.
const stock = computed(() => {
  const warehouse = warehousesStore.getByEntityNaturalId(
    exchangesStore.getNaturalIdFromCode(exchange),
  );
  const store = storagesStore.getById(warehouse?.storeId);
  return store
    ? sumBy(
        store.items.filter(x => x.quantity?.material.ticker === ticker),
        x => x.quantity?.amount ?? 0,
      )
    : undefined;
});

// Drag one of your orders to another place in the book to place it again there.
const drag = useOrderDrag();
const live = computed(() => rows.value.filter(x => !x.gone));

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
      <PlanetPicker :ticker="ticker" :exchange="exchange" />
      <span :class="$style.spacer" />
      <span :class="$style.muted"
        >{{ t('cx4.stock') }} {{ stock !== undefined ? fixed0(stock) : '--' }}</span
      >
      <CxpoButton :cx-ticker="`${ticker}.${exchange}`" />
    </div>
    <div :class="$style.columns">
      <span :class="$style.profitCell">{{ t('cxob.profitHead') }}</span>
      <span />
      <span :class="$style.num">{{ t('cx4.amount') }}</span>
      <span :class="$style.num">{{ t('cx4.price') }}</span>
    </div>
    <div ref="body" :class="$style.body">
      <p v-if="!book" :class="$style.muted">{{ t('cx4.loading') }}</p>
      <template v-for="r in rows" :key="r.id">
        <div v-if="r.first" :class="$style.spread">
          <span>▲ {{ t('cx4.asks') }}</span>
          <span>{{ spread }}</span>
          <span>{{ t('cx4.bids') }} ▼</span>
        </div>
        <div
          :draggable="r.own && !r.gone"
          :data-price="drag.newPrice.value !== undefined ? fixed02(drag.newPrice.value) : ''"
          :class="[
            'rpz-row',
            $style.row,
            r.own ? $style.own : undefined,
            !r.gone && r.change !== undefined ? $style.changed : undefined,
            r.gone ? $style.gone : undefined,
            !r.gone && drag.lineAbove(r.id) ? $style.dropAbove : undefined,
            !r.gone && drag.lineBelow(r.id) ? $style.dropBelow : undefined,
          ]"
          @dragstart="drag.start($event, r)"
          @dragover="!r.gone && drag.over($event, live, live.indexOf(r))"
          @dragend="drag.end"
          @drop="drag.drop">
          <span :class="[$style.profitCell, r.mark]">{{ formatProfit(r.profit) }}</span>
          <span :class="$style.markCell">
            <span v-if="r.own && !r.gone" :class="$style.delSlot"
              ><DeleteExchangeOrderButton :order-id="r.id" screen-command="CXOS"
            /></span>
            <span class="rpz-mark">{{ r.change && !r.gone ? r.change : '' }}</span>
          </span>
          <span :class="[$style.num, $style.amount]">
            <span
              :class="r.own && !r.gone ? $style.clickable : undefined"
              @click.stop="r.own && !r.gone && showBuffer(`CXO ${r.id.substring(0, 8)}`)"
              >{{ r.amount }}</span
            >
          </span>
          <span :class="$style.num">
            {{ fixed02(r.price) }}
          </span>
        </div>
      </template>
    </div>
  </div>
</template>

<style module>
.card {
  min-width: 0;
  background-color: var(--rpz-bg-raised);
  border: 1px solid var(--rpz-stroke-weak);
  font-variant-numeric: tabular-nums;
}

.title {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  background-color: var(--rpz-bg-raised);
}

.icon {
  display: inline-flex;
}

.spacer {
  flex: 1;
}

.columns,
.row {
  display: grid;
  /* All four columns are numbers of a known width, so they are fixed: that keeps them aligned
     from row to row. Space left over in a wide card is spread between the columns instead of
     piling up in front of the first one (player, 2026-11-06). */
  grid-template-columns: 62px 58px 78px 72px;
  justify-content: space-between;
  align-items: baseline;
  gap: 0 6px;
  padding: 1px 8px;
}

.columns {
  color: var(--rpz-text-weak);
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
  border-top: 1px solid var(--rpz-bg-raised);
}

.spread {
  display: flex;
  justify-content: space-between;
  padding: 1px 8px;
  border-top: 1px solid var(--rpz-stroke);
  border-bottom: 1px solid var(--rpz-stroke);
  color: var(--rpz-text-weak);
  font-size: var(--rpz-fs-label);
}

.changed {
  background-color: var(--rpz-mark-fill);
}

.gone {
  opacity: 0.4;
  text-decoration: line-through;
}

.own {
  color: var(--rpz-text-strong);
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
  border-top: 2px solid var(--rpz-brand);
  color: var(--rpz-brand);
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
}

/* The daily profit is a number, so it is right-aligned like the others; a trader name is not
   (docs/ui-rules.md 4.4). */
.profitCell {
  text-align: right;
}

.markCell {
  display: flex;
  align-items: center;
  gap: 2px;
  justify-content: flex-end;
  /* The row lines up on the text baseline, so this cell says where its middle is. */
  align-self: center;
}

/* The del button places itself at the left of a box, so it gets a box of its own. */
.delSlot {
  position: relative;
  flex: 0 0 auto;
  width: 22px;
  height: 14px;
}

/* Tone order in a book: your own orders, then prices, then amounts. */
.row:not(.own) .amount {
  color: var(--rpz-text-weak);
}

.num {
  text-align: right;
}

.stock {
  color: var(--rpz-text-weak);
}

.muted {
  padding: 6px 8px;
  color: var(--rpz-text-weak);
}
/* Clickable text keeps its ink tone; the brand color shows on hover (player, 2026-11-06: no
   blue link color). Your amount opens the order (CXO), a trader name the company (CO). */
.clickable {
  cursor: pointer;
}

.clickable:hover,
.cell .clickable:hover,
.row .clickable:hover {
  color: var(--rpz-brand);
}
</style>
