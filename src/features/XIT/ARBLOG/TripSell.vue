<script setup lang="ts">
import MaterialIcon from '@src/components/MaterialIcon.vue';
import { ArbBatch, bought, buyCost, sold } from '@src/core/arb-batches';
import { dropPrice } from '@src/core/price-step';
import { cxobStore } from '@src/infrastructure/prun-api/data/cxob';
import { companyStore } from '@src/infrastructure/prun-api/data/company';
import { exchangesStore } from '@src/infrastructure/prun-api/data/exchanges';
import { warehousesStore } from '@src/infrastructure/prun-api/data/warehouses';
import { storagesStore } from '@src/infrastructure/prun-api/data/storage';
import { placeCxOrder } from '@src/infrastructure/prun-ui/utils/place-cx-order';
import { formatProfit } from '@src/core/daily-profit/profit-format';
import { fixed0, fixed02 } from '@src/utils/format';
import { t } from '@src/i18n';

// Selling a trip at the end exchange, after a list of the orders to confirm (player,
// 2026-11-05):
// - Fill (sell now): sell only to the requests that are as good as planned, that is at or above
//   the lowest request the plan took. If fewer are left, sell what there is and say so; the rest
//   stays in the batch, to be listed.
// - List: one price step under the best offer of the other traders, only while that price still
//   makes money over what the batch really paid. The first column is that profit.
const { batches } = defineProps<{ batches: ArbBatch[] }>();
const emit = defineEmits<{ close: [] }>();

const $style = useCssModule();

function warehouseStock(code: string, ticker: string) {
  const warehouse = warehousesStore.getByEntityNaturalId(exchangesStore.getNaturalIdFromCode(code));
  const store = storagesStore.getById(warehouse?.storeId);
  if (!store) {
    return undefined;
  }
  return sumBy(
    store.items.filter(x => x.quantity?.material.ticker === ticker),
    x => x.quantity?.amount ?? 0,
  );
}

interface Line {
  key: string;
  batch: ArbBatch;
  kind: 'fill' | 'list';
  amount: number;
  price?: number;
  profit?: number;
  note?: string;
  // False when the line cannot be placed (no stock, no book, no profit).
  ok: boolean;
}

function otherOrders(orders: PrunApi.CXBrokerOrder[] | undefined) {
  const ownId = companyStore.value?.id;
  return (orders ?? []).filter(x => x.trader.id !== ownId);
}

function listLine(batch: ArbBatch, amount: number, unitCost: number, note?: string): Line {
  const book = cxobStore.getByTicker(`${batch.ticker}.${batch.to}`);
  const asks = otherOrders(book?.sellingOrders).map(x => x.limit.amount);
  const best = asks.length > 0 ? Math.min(...asks) : undefined;
  const price = best !== undefined ? dropPrice(true, best) : batch.snapshot?.listPrice;
  const profit = price !== undefined ? (price - unitCost) * amount : undefined;
  const ok = book !== undefined && price !== undefined && profit !== undefined && profit > 0;
  return {
    key: `${batch.id}:list`,
    batch,
    kind: 'list',
    amount,
    price,
    profit,
    note: book === undefined ? t('arblog.bookLoading') : ok ? note : t('arblog.noProfit'),
    ok,
  };
}

const lines = computed(() => {
  const result: Line[] = [];
  // Stock is shared by batches of the same material: the older batch goes first.
  const stockLeft = new Map<string, number>();
  for (const batch of [...batches].sort((a, b) => a.createdAt - b.createdAt)) {
    const remaining = bought(batch) - sold(batch);
    if (remaining <= 0) {
      continue;
    }
    const stockKey = `${batch.ticker}.${batch.to}`;
    if (!stockLeft.has(stockKey)) {
      stockLeft.set(stockKey, warehouseStock(batch.to, batch.ticker) ?? 0);
    }
    const stock = stockLeft.get(stockKey)!;
    const units = Math.min(remaining, stock);
    stockLeft.set(stockKey, stock - units);
    const unitCost = buyCost(batch) / bought(batch);
    if (units <= 0) {
      result.push({
        key: `${batch.id}:none`,
        batch,
        kind: batch.mode === 'now' ? 'fill' : 'list',
        amount: 0,
        note: t('arblog.noStock', fixed0(remaining)),
        ok: false,
      });
      continue;
    }
    const stockNote =
      units < remaining ? t('arblog.someStock', fixed0(units), fixed0(remaining)) : undefined;
    if (batch.mode === 'listed') {
      result.push(listLine(batch, units, unitCost, stockNote));
      continue;
    }
    // Fill: requests at or above the lowest planned one, best first.
    const book = cxobStore.getByTicker(`${batch.ticker}.${batch.to}`);
    if (!book) {
      result.push({
        key: `${batch.id}:fill`,
        batch,
        kind: 'fill',
        amount: units,
        note: t('arblog.bookLoading'),
        ok: false,
      });
      continue;
    }
    const planned = batch.snapshot?.sells.filter(x => x.take > 0).map(x => x.price) ?? [];
    const floor = planned.length > 0 ? Math.min(...planned) : batch.plan.sellPrice;
    const bids = otherOrders(book.buyingOrders)
      .filter(x => x.limit.amount >= floor)
      .sort((a, b) => b.limit.amount - a.limit.amount);
    let fill = 0;
    let profit = 0;
    let limit: number | undefined;
    for (const bid of bids) {
      if (fill >= units) {
        break;
      }
      const take = Math.min(bid.amount ?? Infinity, units - fill);
      fill += take;
      profit += take * (bid.limit.amount - unitCost);
      limit = bid.limit.amount;
    }
    if (fill > 0) {
      result.push({
        key: `${batch.id}:fill`,
        batch,
        kind: 'fill',
        amount: fill,
        price: limit,
        profit,
        note: fill < units ? t('arblog.fillShort', fixed0(units), fixed0(fill)) : stockNote,
        ok: true,
      });
    }
    if (fill < units) {
      // The rest stays in the batch; it can be listed here, off by default.
      const rest = listLine(
        batch,
        units - fill,
        unitCost,
        fill > 0 ? t('arblog.rest') : t('arblog.noFill'),
      );
      result.push(rest);
    }
  }
  return result;
});

// Which lines to place. Fill lines start on; list lines start on only for batches you bought
// to list; the rest of a fill starts off, so you decide.
const picked = ref(new Set<string>());
const seen = new Set<string>();
watchEffect(() => {
  for (const line of lines.value) {
    if (seen.has(line.key)) {
      continue;
    }
    seen.add(line.key);
    if (line.ok && (line.kind === 'fill' || line.batch.mode === 'listed')) {
      picked.value.add(line.key);
    }
  }
});

function toggle(line: Line) {
  if (!line.ok) {
    return;
  }
  const next = new Set(picked.value);
  if (next.has(line.key)) {
    next.delete(line.key);
  } else {
    next.add(line.key);
  }
  picked.value = next;
}

const selected = computed(() => lines.value.filter(x => x.ok && picked.value.has(x.key)));

const running = ref(false);
const report = ref<string[]>([]);

async function run() {
  if (running.value) {
    return;
  }
  running.value = true;
  report.value = [];
  try {
    for (const line of selected.value) {
      const error = await placeCxOrder(
        `${line.batch.ticker}.${line.batch.to}`,
        true,
        line.amount,
        line.price!,
      );
      report.value.push(
        error === undefined
          ? t('arblog.placed', line.batch.ticker, fixed0(line.amount), fixed02(line.price!))
          : t('arblog.placeFailed', line.batch.ticker, error),
      );
    }
  } finally {
    running.value = false;
  }
}
</script>

<template>
  <div :class="$style.sell">
    <div :class="[$style.line, $style.head]">
      <span />
      <span>{{ t('arb.material') }}</span>
      <span>{{ t('arb.mode') }}</span>
      <span :class="$style.num">{{ t('arb.units') }}</span>
      <span :class="$style.num">{{ t('cx4.price') }}</span>
      <span :class="$style.num">{{ t('arb.profit') }}</span>
      <span />
    </div>
    <div
      v-for="line in lines"
      :key="line.key"
      :class="['rpz-row', $style.line, line.ok ? $style.pickable : $style.off]"
      @click="toggle(line)">
      <span :class="[$style.box, picked.has(line.key) && line.ok ? $style.on : undefined]" />
      <span :class="$style.icon"
        ><MaterialIcon size="inline-table" :ticker="line.batch.ticker"
      /></span>
      <span :class="$style.muted">{{ line.kind === 'fill' ? t('arb.fill') : t('arb.list') }}</span>
      <span :class="$style.num">{{ fixed0(line.amount) }}</span>
      <span :class="$style.num">{{ line.price !== undefined ? fixed02(line.price) : '--' }}</span>
      <span
        :class="[
          $style.num,
          line.profit === undefined
            ? $style.muted
            : line.profit > 0
              ? C.ColoredValue.positive
              : C.ColoredValue.negative,
        ]"
        >{{ line.profit !== undefined ? formatProfit(line.profit) : '--' }}</span
      >
      <span :class="line.ok ? $style.muted : $style.warn">{{ line.note }}</span>
    </div>
    <div :class="$style.bar">
      <span :class="$style.spacer" />
      <button :class="$style.tertiary" :disabled="running" @click="emit('close')">
        {{ t('arb.cancel') }}
      </button>
      <button :class="$style.primary" :disabled="running || selected.length === 0" @click="run">
        {{ running ? t('arblog.placing') : t('arblog.placeAll', selected.length) }}
      </button>
    </div>
    <div v-for="(r, i) in report" :key="i" :class="$style.muted">{{ r }}</div>
  </div>
</template>

<style module>
.sell {
  display: grid;
  gap: 2px;
  padding: var(--rpz-space-2);
  background-color: var(--rpz-bg-base);
  border: 1px solid var(--rpz-stroke);
}

.line {
  display: grid;
  grid-template-columns: 16px 44px 50px 80px 90px 90px minmax(0, 1fr);
  gap: 0 var(--rpz-space-2);
  align-items: center;
  padding: 3px 4px;
  border-top: 1px solid var(--rpz-stroke-weak);
}

.head {
  color: var(--rpz-text-weak);
  border-top: none;
}

.pickable {
  cursor: pointer;
}

.pickable:hover {
  background-color: var(--rpz-hover);
}

.off {
  opacity: 0.6;
}

.box {
  width: 12px;
  height: 12px;
  border: 1px solid var(--rpz-stroke);
}

.on {
  border-color: var(--rpz-brand);
  background-color: var(--rpz-brand);
}

.icon {
  display: inline-flex;
}

.num {
  text-align: right;
}

.muted {
  color: var(--rpz-text-weak);
}

.warn {
  color: var(--rpz-neg);
}

.bar {
  display: flex;
  align-items: center;
  gap: var(--rpz-space-3);
  padding-top: var(--rpz-space-1);
}

.spacer {
  flex: 1;
}

.primary {
  padding: 3px 12px;
  border: none;
  background-color: var(--rpz-brand);
  color: var(--rpz-on-brand);
  font: inherit;
  cursor: pointer;
}

.primary:disabled {
  opacity: 0.5;
  cursor: default;
}

.tertiary {
  padding: 2px;
  border: none;
  background: none;
  color: var(--rpz-text-weak);
  font: inherit;
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
}

.tertiary:hover {
  color: var(--rpz-text);
}
</style>
