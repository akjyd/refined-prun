<script setup lang="ts">
import { cxLabel } from '@src/core/exchange-label';
import BookCells from '@src/features/XIT/CX4/BookCells.vue';
import CxpoButton from '@src/components/CxpoButton.vue';
import { getOwnCxOrder, orderChange } from '@src/core/order-seen';
import { cxobStore } from '@src/infrastructure/prun-api/data/cxob';
import { companyStore } from '@src/infrastructure/prun-api/data/company';
import { exchangesStore } from '@src/infrastructure/prun-api/data/exchanges';
import { warehousesStore } from '@src/infrastructure/prun-api/data/warehouses';
import { storagesStore } from '@src/infrastructure/prun-api/data/storage';
import { orderProfit } from '@src/core/daily-profit/order-profit';
import PlanetPicker from '@src/components/PlanetPicker.vue';
import { useOrderDrag } from '@src/hooks/use-order-drag';
import { formatProfit, profitMarks } from '@src/core/daily-profit/profit-format';
import { fixed0, fixed02, percent1 } from '@src/utils/format';
import { t } from '@src/i18n';
import { showBuffer } from '@src/infrastructure/prun-ui/buffers';

// The order books of the four exchanges side by side. Only the best offers and the best
// requests are placed by price: the exchange with the higher best offer has it one row higher,
// and the same for the best requests. The other orders follow without gaps.
const {
  ticker,
  exchanges,
  takes,
  trim,
  ghost,
  traders = false,
  height,
} = defineProps<{
  ticker: string;
  exchanges: string[];
  // XIT ARB: units a trade takes from each order, by order id. Taken orders are gold.
  takes?: Map<string, number>;
  // XIT ARB: per side, keep the taken orders and this many more; hide the rest.
  trim?: number;
  // XIT ARB, ARBLOG: the first column shows the trader, as in the game's CXOB, not the daily
  // profit.
  traders?: boolean;
  // A fixed height in px: the orders scroll inside it and start at the spread, as in XIT ORDERS.
  height?: number;
  // XIT ARB: the offer you will list, shown in the offers of its exchange.
  ghost?: { exchange: string; price: number; amount: number };
}>();

// Fires when the CXPO button of an exchange column is clicked.
const emit = defineEmits<{ cxpo: [exchange: string] }>();

const $style = useCssModule();

interface Cell {
  id: string;
  ask: boolean;
  price: number;
  amount: string;
  // Change of your order since you last left XIT ORDERS.
  change?: string;
  profit?: number;
  own: boolean;
  mark?: string;
  trader?: string;
  traderCode?: string;
  taken?: boolean;
  ghost?: boolean;
}

const books = computed(() => exchanges.map(x => cxobStore.getByTicker(`${ticker}.${x}`)));

// Units of the material in your warehouse at each exchange station.
const stock = computed(() =>
  exchanges.map(code => {
    const warehouse = warehousesStore.getByEntityNaturalId(
      exchangesStore.getNaturalIdFromCode(code),
    );
    const store = storagesStore.getById(warehouse?.storeId);
    if (!store) {
      return undefined;
    }
    return sumBy(
      store.items.filter(x => x.quantity?.material.ticker === ticker),
      x => x.quantity?.amount ?? 0,
    );
  }),
);

// Your own orders show the amount left / the amount placed.
function ownAmount(order: PrunApi.CXBrokerOrder) {
  if (order.trader.id !== companyStore.value?.id) {
    return undefined;
  }
  const mine = getOwnCxOrder(order.id);
  return mine ? `${fixed0(mine.amount)}/${fixed0(mine.initialAmount)}` : undefined;
}

function ownChange(order: PrunApi.CXBrokerOrder) {
  const mine = order.trader.id === companyStore.value?.id ? getOwnCxOrder(order.id) : undefined;
  return mine ? orderChange(mine.id, mine.amount) : undefined;
}

// Rank of each value among the others, the highest first; equal values share a rank.
function ranks(values: (number | undefined)[]) {
  const distinct = [...new Set(values.filter((x): x is number => x !== undefined))].sort(
    (a, b) => b - a,
  );
  return values.map(x => (x === undefined ? 0 : distinct.indexOf(x)));
}

const columns = computed(() => {
  const ownId = companyStore.value?.id;
  return books.value.map((book, i) => {
    if (!book) {
      return { asks: [] as Cell[], bids: [] as Cell[] };
    }
    const profitAt = orderProfit(ticker, exchanges[i]);
    // The plan reads the FIO books, this ladder reads the game books, and the two can hold the
    // orders of one price in a different sequence. At one price it makes no difference which
    // order you take, so we mark them from the top of the price down (player, 2026-11-07).
    const resolved = new Map<string, number>();
    if (takes !== undefined) {
      const byPrice = new Map<number, number>();
      for (const order of [...book.sellingOrders, ...book.buyingOrders]) {
        const take = takes.get(order.id) ?? 0;
        if (take > 0) {
          byPrice.set(order.limit.amount, (byPrice.get(order.limit.amount) ?? 0) + take);
        }
      }
      for (const order of [...book.sellingOrders, ...book.buyingOrders]) {
        const left = byPrice.get(order.limit.amount) ?? 0;
        if (left <= 0) {
          continue;
        }
        const take = Math.min(left, order.amount ?? left);
        resolved.set(order.id, take);
        byPrice.set(order.limit.amount, left - take);
      }
    }
    const toCell = (order: PrunApi.CXBrokerOrder, ask: boolean): Cell => {
      const take = resolved.get(order.id) ?? 0;
      const amount = ownAmount(order) ?? (order.amount === null ? '∞' : fixed0(order.amount));
      // A part-taken order shows taken/amount.
      const partial = take > 0 && order.amount !== null && take < order.amount;
      return {
        id: order.id,
        ask,
        price: order.limit.amount,
        amount: partial ? `${fixed0(take)}/${fixed0(order.amount!)}` : amount,
        profit: profitAt(order.limit.amount),
        own: order.trader.id === ownId,
        trader: order.trader.name,
        traderCode: order.trader.code,
        change: ownChange(order),
        taken: take > 0,
      };
    };
    // The game gives the offers best first. We show them with the best at the bottom, so we
    // sort by price and then turn the list around. At one price this keeps the sequence of the
    // game: the offer that is served first stays nearest the spread (player, 2026-11-07).
    let asks = [...book.sellingOrders]
      .sort((a, b) => a.limit.amount - b.limit.amount)
      .map(x => toCell(x, true))
      .reverse();
    if (ghost && ghost.exchange === exchanges[i]) {
      const cell: Cell = {
        id: 'ghost',
        ask: true,
        price: ghost.price,
        amount: fixed0(ghost.amount),
        profit: profitAt(ghost.price),
        own: false,
        ghost: true,
      };
      // The offers at this price are served before yours, so yours goes over them.
      const at = asks.findIndex(x => x.price <= ghost.price);
      asks.splice(at < 0 ? asks.length : at, 0, cell);
    }
    let bids = [...book.buyingOrders]
      .sort((a, b) => b.limit.amount - a.limit.amount)
      .map(x => toCell(x, false));
    if (trim !== undefined) {
      // Offers: the best are last. Requests: the best are first.
      const keepAsks = asks.filter(x => x.taken === true || x.ghost === true).length + trim;
      const keepBids = bids.filter(x => x.taken === true).length + trim;
      asks = asks.slice(Math.max(0, asks.length - keepAsks));
      bids = bids.slice(0, keepBids);
    }
    const marks = profitMarks([...asks, ...bids]);
    for (const cell of [...asks, ...bids]) {
      cell.mark = marks.get(cell.id);
    }
    return { asks, bids };
  });
});

// One row per line of the table; undefined is an empty place.
const askRows = computed(() => {
  const cols = columns.value;
  const rank = ranks(cols.map(x => x.asks.at(-1)?.price));
  // The best offer of rank k sits k rows above the lowest offer row.
  const depth = Math.max(0, ...cols.map((x, i) => x.asks.length + (maxRank(rank) - rank[i])));
  const rows: (Cell | undefined)[][] = Array.from({ length: depth }, () =>
    cols.map(() => undefined),
  );
  for (const [i, col] of cols.entries()) {
    const bottom = depth - 1 - (maxRank(rank) - rank[i]);
    for (const [j, cell] of col.asks.entries()) {
      rows[bottom - (col.asks.length - 1 - j)][i] = cell;
    }
  }
  return rows;
});

const bidRows = computed(() => {
  const cols = columns.value;
  const rank = ranks(cols.map(x => x.bids[0]?.price));
  const depth = Math.max(0, ...cols.map((x, i) => x.bids.length + rank[i]));
  const rows: (Cell | undefined)[][] = Array.from({ length: depth }, () =>
    cols.map(() => undefined),
  );
  for (const [i, col] of cols.entries()) {
    for (const [j, cell] of col.bids.entries()) {
      rows[rank[i] + j][i] = cell;
    }
  }
  return rows;
});

function maxRank(rank: number[]) {
  return Math.max(0, ...rank);
}

// Drag your orders inside their own exchange column, as in CXOB and XIT ORDERS.
const drag = useOrderDrag();
const columnBooks = computed(() => columns.value.map(x => [...x.asks, ...x.bids]));

function bookOf(cell: Cell) {
  return columnBooks.value.find(x => x.includes(cell)) ?? [];
}

// One column per exchange.
const columnsStyle = computed(() => ({
  gridTemplateColumns: `repeat(${exchanges.length}, minmax(280px, 400px))`,
}));

// Start at the spread, between the offers and the requests. The books can arrive in pieces, so
// this keeps trying until a spread line is on screen (player, 2026-11-06: it no longer started
// in the middle).
const body = ref<HTMLElement>();
let scrolled = false;
watchEffect(async () => {
  // Read what changes, so this runs again when the books do.
  const ready = columns.value.some(x => x.asks.length + x.bids.length > 0);
  if (scrolled || !ready || height === undefined) {
    return;
  }
  await nextTick();
  const element = body.value;
  const spread = element?.querySelector<HTMLElement>(`.${$style.spread}`);
  if (!element || !spread || element.clientHeight <= 0) {
    return;
  }
  element.scrollTop = Math.max(0, spread.offsetTop - element.clientHeight / 2);
  scrolled = true;
});

// The gap between the best offer and the best request of each exchange, shown on the line
// that divides offers (above) from requests (below).
const spreads = computed(() =>
  columns.value.map(col => {
    const ask = col.asks.filter(x => x.ghost !== true).at(-1)?.price;
    const bid = col.bids.at(0)?.price;
    if (ask === undefined || bid === undefined) {
      return '';
    }
    return `${fixed0(ask - bid)} · ${percent1((ask - bid) / ask)}`;
  }),
);

const loaded = computed(() => books.value.some(x => x !== undefined));
</script>

<template>
  <div :class="$style.ladder">
    <div :class="[$style.row, $style.head]" :style="columnsStyle">
      <span v-for="(code, i) in exchanges" :key="code" :class="$style.headCell">
        <span :class="$style.title">
          <span :class="$style.code"
            >{{ cxLabel(code) }} <PlanetPicker v-if="!traders" :ticker="ticker" :exchange="code"
          /></span>
          <span :class="$style.stock">
            {{ t('cx4.stock') }} {{ stock[i] !== undefined ? fixed0(stock[i]) : '--' }}
          </span>
          <span @click.capture="emit('cxpo', code)"
            ><CxpoButton :cx-ticker="`${ticker}.${code}`"
          /></span>
        </span>
        <span :class="[$style.columns, traders ? undefined : $style.numbersOnly]">
          <span :class="traders ? undefined : $style.profitCell">{{
            traders ? t('cx4.trader') : t('cxob.profitHead')
          }}</span>
          <span />
          <span :class="$style.num">{{ t('cx4.amount') }}</span>
          <span :class="$style.num">{{ t('cx4.price') }}</span>
        </span>
      </span>
    </div>
    <p v-if="!loaded" :class="$style.muted">{{ t('cx4.loading') }}</p>
    <div
      ref="body"
      :class="height !== undefined ? $style.body : undefined"
      :style="height !== undefined ? { height: `${height}px` } : undefined">
      <template v-for="(rows, part) in [askRows, bidRows]" :key="part">
        <div v-if="part === 1" :class="[$style.row, $style.spread]" :style="columnsStyle">
          <span v-for="(s, i) in spreads" :key="i" :class="$style.spreadCell">
            <span>▲ {{ t('cx4.asks') }}</span>
            <span>{{ s }}</span>
            <span>{{ t('cx4.bids') }} ▼</span>
          </span>
        </div>
        <div
          v-for="(row, k) in rows"
          :key="k"
          :class="['rpz-row', $style.row]"
          :style="columnsStyle">
          <span
            v-for="(cell, i) in row"
            :key="i"
            :draggable="cell?.own === true"
            :data-price="drag.newPrice.value !== undefined ? fixed02(drag.newPrice.value) : ''"
            :class="
              cell
                ? [
                    $style.cell,
                    traders ? undefined : $style.numbersOnly,
                    cell.own ? $style.own : undefined,
                    cell.taken ? $style.taken : undefined,
                    cell.ghost ? $style.ghost : undefined,
                    cell.change !== undefined ? $style.changed : undefined,
                    drag.lineAbove(cell.id) ? $style.dropAbove : undefined,
                    drag.lineBelow(cell.id) ? $style.dropBelow : undefined,
                  ]
                : $style.empty
            "
            @dragstart="cell && drag.start($event, cell)"
            @dragover="cell && drag.over($event, bookOf(cell), bookOf(cell).indexOf(cell))"
            @dragend="drag.end"
            @drop="drag.drop">
            <template v-if="cell">
              <BookCells
                :lead="
                  traders ? (cell.ghost ? '' : (cell.trader ?? '')) : formatProfit(cell.profit)
                "
                :lead-class="traders ? undefined : cell.mark"
                :lead-is-text="traders"
                :lead-clickable="traders && !cell.ghost && cell.traderCode !== undefined"
                :mark="cell.change"
                :amount="String(cell.amount)"
                :price="cell.price"
                :own="cell.own && !cell.ghost"
                :order-id="cell.ghost ? undefined : cell.id"
                :deletable="cell.own && !cell.ghost"
                @lead-click="
                  !cell.ghost && cell.traderCode && showBuffer(`CO ${cell.traderCode}`)
                " />
            </template>
          </span>
        </div>
      </template>
    </div>
  </div>
</template>

<style module>
.body {
  position: relative;
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

.ladder {
  min-width: 0;
  font-size: var(--rpz-fs-body);
  font-variant-numeric: tabular-nums;
}

.row {
  display: grid;
  grid-template-columns: repeat(4, minmax(280px, 1fr));
  gap: 0 4px;
}

.head {
  padding-bottom: 2px;
}

.headCell {
  display: grid;
  gap: 2px;
  padding: 4px 8px;
  background-color: var(--rpz-bg-raised);
}

.title {
  display: flex;
  justify-content: space-between;
  gap: 6px;
}

.stock {
  color: var(--rpz-text-weak);
}

.code {
  color: var(--rpz-text-strong);
  font-weight: bold;
}

.columns,
.cell {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 58px 78px 72px;
  align-items: baseline;
  gap: 0 6px;
}

.columns {
  color: var(--rpz-text-weak);
  font-size: 11px;
}

/* Without trader names the first column is a number too, so the columns are fixed and the
   space left over is spread between them (player, 2026-11-06). */
.numbersOnly {
  grid-template-columns: 62px 58px 78px 72px;
  justify-content: space-between;
}

.cell {
  padding: 2px 8px;
  border-top: 1px solid var(--rpz-stroke-weak);
}

.empty {
  min-height: 21px;
}

.spread {
  border-top: 1px solid var(--rpz-stroke);
  border-bottom: 1px solid var(--rpz-stroke);
}

.spreadCell {
  display: flex;
  justify-content: space-between;
  padding: 1px 8px;
  color: var(--rpz-text-weak);
  font-size: var(--rpz-fs-label);
}

/* XIT ARB: orders the trade takes, and the offer you will list. */
.taken {
  background-color: var(--rpz-brand-fill);
  box-shadow: inset 3px 0 0 var(--rpz-brand);
}

.ghost {
  outline: 1px dashed var(--rpz-brand);
  outline-offset: -1px;
  color: var(--rpz-brand);
}

/* Your own orders are bold, as in CXOB; the del button sits before the amount. */
.changed {
  background-color: var(--rpz-mark-fill);
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

/* Tone order in a book: your own orders, then prices, then amounts and traders. */
.cell:not(.own) .amount,
.cell:not(.own) .trader {
  color: var(--rpz-text-weak);
}

.num {
  text-align: right;
}

.clickable:hover,
.cell .clickable:hover,
.row .clickable:hover {
  color: var(--rpz-brand);
}
</style>
