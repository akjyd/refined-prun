<script setup lang="ts">
import DeleteExchangeOrderButton from '@src/components/DeleteExchangeOrderButton.vue';
import PrunLink from '@src/components/PrunLink.vue';
import { cxobStore } from '@src/infrastructure/prun-api/data/cxob';
import { companyStore } from '@src/infrastructure/prun-api/data/company';
import { cxosStore } from '@src/infrastructure/prun-api/data/cxos';
import { orderProfit } from '@src/core/daily-profit/order-profit';
import PlanetPicker from '@src/components/PlanetPicker.vue';
import { formatProfit, profitMarks } from '@src/core/daily-profit/profit-format';
import { fixed0, fixed02 } from '@src/utils/format';
import { t } from '@src/i18n';
import link from '@src/infrastructure/prun-ui/css/link.module.css';

// The order books of the four exchanges side by side. Only the best offers and the best
// requests are placed by price: the exchange with the higher best offer has it one row higher,
// and the same for the best requests. The other orders follow without gaps.
const { ticker, exchanges } = defineProps<{ ticker: string; exchanges: string[] }>();

const $style = useCssModule();

interface Cell {
  id: string;
  ask: boolean;
  price: number;
  amount: string;
  profit?: number;
  own: boolean;
  mark?: string;
}

const books = computed(() => exchanges.map(x => cxobStore.getByTicker(`${ticker}.${x}`)));

// Your own orders show the amount left / the amount placed.
function ownAmount(order: PrunApi.CXBrokerOrder) {
  if (order.trader.id !== companyStore.value?.id) {
    return undefined;
  }
  const mine = cxosStore.getById(order.id);
  return mine ? `${fixed0(mine.amount)}/${fixed0(mine.initialAmount)}` : undefined;
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
    const toCell = (order: PrunApi.CXBrokerOrder, ask: boolean): Cell => ({
      id: order.id,
      ask,
      price: order.limit.amount,
      amount: ownAmount(order) ?? (order.amount === null ? '∞' : fixed0(order.amount)),
      profit: profitAt(order.limit.amount),
      own: order.trader.id === ownId,
    });
    const asks = book.sellingOrders.map(x => toCell(x, true)).sort((a, b) => b.price - a.price);
    const bids = book.buyingOrders.map(x => toCell(x, false)).sort((a, b) => b.price - a.price);
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

const loaded = computed(() => books.value.some(x => x !== undefined));
</script>

<template>
  <div :class="$style.ladder">
    <div :class="[$style.row, $style.head]">
      <span v-for="code in exchanges" :key="code" :class="$style.headCell">
        <span :class="$style.title">
          <span :class="$style.code"
            >{{ code }} <PlanetPicker :ticker="ticker" :exchange="code"
          /></span>
          <PrunLink inline :command="`CXPO ${ticker}.${code}`" />
        </span>
        <span :class="$style.columns">
          <span>{{ t('cxob.profitHead') }}</span>
          <span :class="$style.num">{{ t('cx4.amount') }}</span>
          <span :class="$style.num">{{ t('cx4.price') }}</span>
        </span>
      </span>
    </div>
    <p v-if="!loaded" :class="$style.muted">{{ t('cx4.loading') }}</p>
    <template v-for="(rows, part) in [askRows, bidRows]" :key="part">
      <div v-if="part === 1" :class="$style.spread" />
      <div v-for="(row, k) in rows" :key="k" :class="$style.row">
        <span
          v-for="(cell, i) in row"
          :key="i"
          :class="cell ? [$style.cell, cell.own ? $style.own : undefined] : $style.empty">
          <template v-if="cell">
            <span :class="cell.mark">{{ formatProfit(cell.profit) }}</span>
            <span :class="[$style.num, $style.amount, cell.own ? link.link : undefined]">
              <DeleteExchangeOrderButton
                v-if="cell.own"
                :order-id="cell.id"
                screen-command="CXOS" />
              {{ cell.amount }}
            </span>
            <span
              :class="[$style.num, cell.ask ? C.ColoredValue.negative : C.ColoredValue.positive]">
              {{ fixed02(cell.price) }}
            </span>
          </template>
        </span>
      </div>
    </template>
  </div>
</template>

<style module>
.ladder {
  min-width: 0;
  font-variant-numeric: tabular-nums;
}

.row {
  display: grid;
  grid-template-columns: repeat(4, minmax(210px, 1fr));
  gap: 0 4px;
}

.head {
  padding-bottom: 2px;
}

.headCell {
  display: grid;
  gap: 2px;
  padding: 4px 8px;
  background-color: #2a2a2a;
}

.title {
  display: flex;
  justify-content: space-between;
  gap: 6px;
}

.code {
  color: #eee;
  font-weight: bold;
}

.columns,
.cell {
  display: grid;
  grid-template-columns: minmax(44px, 1fr) 96px 70px;
  gap: 0 6px;
}

.columns {
  color: #8c8c8c;
  font-size: 11px;
}

.cell {
  padding: 2px 8px;
  border-top: 1px solid #262626;
}

.empty {
  min-height: 21px;
}

.spread {
  height: 6px;
  border-top: 1px solid #3a3a3a;
}

/* Your own orders are bold, as in CXOB; the del button sits before the amount. */
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
  color: #8c8c8c;
}
</style>
