<script setup lang="ts">
import { cxLabel } from '@src/core/exchange-label';
import dayjs from 'dayjs';
import MaterialIcon from '@src/components/MaterialIcon.vue';
import ChipGroup from '@src/components/ChipGroup.vue';
import PriceLadder from '@src/features/XIT/CX4/PriceLadder.vue';
import BatchOrders from '@src/features/XIT/ARBLOG/BatchOrders.vue';
import TripSell from '@src/features/XIT/ARBLOG/TripSell.vue';
import WatchList from '@src/features/XIT/ARBLOG/WatchList.vue';
import {
  ArbBatch,
  bought,
  buyCost,
  realizedProfit,
  revenue,
  sold,
  status,
  plannedDays,
} from '@src/core/arb-batches';
import { cxosStore } from '@src/infrastructure/prun-api/data/cxos';
import { shipsStore } from '@src/infrastructure/prun-api/data/ships';
import { storagesStore } from '@src/infrastructure/prun-api/data/storage';
import { warehousesStore } from '@src/infrastructure/prun-api/data/warehouses';
import { exchangesStore } from '@src/infrastructure/prun-api/data/exchanges';
import { cxobStore } from '@src/infrastructure/prun-api/data/cxob';
import { companyStore } from '@src/infrastructure/prun-api/data/company';
import { HiddenOrderBooks } from '@src/infrastructure/prun-ui/hidden-order-books';
import { userData } from '@src/store/user-data';
import { formatProfit } from '@src/core/daily-profit/profit-format';
import { fixed0, fixed01, fixed02, percent1 } from '@src/utils/format';
import { timestampEachMinute } from '@src/utils/dayjs';
import { t } from '@src/i18n';

const $style = useCssModule();

type Filter = 'all' | 'open' | 'done' | 'watch';
const filter = ref<Filter>('all');
const filterChips = computed(() => [
  { value: 'all' as const, label: t('arblog.all') },
  { value: 'open' as const, label: t('arblog.open') },
  { value: 'done' as const, label: t('arblog.done') },
  { value: 'watch' as const, label: t('arblog.watch') },
]);

// Open orders of a batch: its buy orders not filled yet, and (method A) every open sell order of
// the material on the end exchange.
function openOrders(batch: ArbBatch) {
  return (cxosStore.active.value ?? []).filter(
    x =>
      x.material.ticker === batch.ticker &&
      ((x.type === 'BUYING' && batch.buyOrders.includes(x.id)) ||
        (x.type === 'SELLING' && x.exchange.code === batch.to)),
  );
}

// True when another trader has a better or equal price than one of your open orders.
function beaten(batch: ArbBatch) {
  const ownId = companyStore.value?.id;
  return openOrders(batch).some(order => {
    const book = cxobStore.getByTicker(`${order.material.ticker}.${order.exchange.code}`);
    const ask = order.type === 'SELLING';
    const others = (ask ? book?.sellingOrders : book?.buyingOrders)?.filter(
      x => x.trader.id !== ownId,
    );
    return (others ?? []).some(x =>
      ask ? x.limit.amount <= order.limit.amount : x.limit.amount >= order.limit.amount,
    );
  });
}

// Profit over days, for the actual run (realized profit over days so far) and the plan.
function perDayText(profit: number | undefined, days: number | undefined) {
  if (profit === undefined || days === undefined || days < 0.05) {
    return '--';
  }
  return formatProfit(profit / days);
}

const rows = computed(() =>
  [...userData.arbBatches]
    .sort((a, b) => b.createdAt - a.createdAt)
    .map(batch => {
      const open = openOrders(batch);
      const state = status(batch, open.filter(x => x.type === 'BUYING').length);
      const units = bought(batch);
      const soldUnits = sold(batch);
      const profit = realizedProfit(batch);
      const cost = units > 0 ? (buyCost(batch) / units) * soldUnits : 0;
      const lastSell = Math.max(0, ...batch.trades.filter(x => x.side === 'sell').map(x => x.time));
      const end = state === 'done' ? lastSell : timestampEachMinute.value;
      return {
        batch,
        state,
        open,
        units,
        soldUnits,
        profit,
        ret: profit !== undefined && cost > 0 ? profit / cost : undefined,
        days: Math.max(0, (end - batch.createdAt) / 86_400_000),
        plannedDays: plannedDays(batch),
      };
    })
    .filter(x =>
      filter.value === 'all'
        ? true
        : filter.value === 'done'
          ? x.state === 'done'
          : x.state !== 'done',
    ),
);

// Batches bought together (one cart) form a trip; a batch bought alone is its own trip.
const trips = computed(() => {
  const map = new Map<string, (typeof rows.value)[number][]>();
  for (const row of rows.value) {
    const id = row.batch.tripId ?? row.batch.id;
    map.set(id, [...(map.get(id) ?? []), row]);
  }
  return [...map.entries()].map(([id, list]) => ({
    id,
    rows: list,
    first: list[list.length - 1].batch,
    plan: sumBy(list, x => x.batch.plan.profit),
    actual: sumBy(list, x => x.profit ?? 0),
    open: list.some(x => x.state !== 'done'),
    sellable: list.some(x => x.units - x.soldUnits > 0),
  }));
});

// The trip whose sale list is open; its end-exchange books load in the background.
const selling = ref<string>();

const summary = computed(() => {
  const done = userData.arbBatches.filter(x => status(x, 0) === 'done' && bought(x) > 0);
  return {
    count: done.length,
    plan: sumBy(done, x => x.plan.profit),
    actual: sumBy(done, x => realizedProfit(x) ?? 0),
  };
});

function storeHas(store: PrunApi.Store | undefined, ticker: string) {
  return (store?.items ?? []).some(
    x => x.quantity?.material.ticker === ticker && x.quantity.amount > 0,
  );
}

function warehouseOf(code: string) {
  const warehouse = warehousesStore.getByEntityNaturalId(exchangesStore.getNaturalIdFromCode(code));
  return storagesStore.getById(warehouse?.storeId);
}

// Where the goods of a bought batch are, from where the material is now: in the end warehouse
// (arrived), on a flying ship (in transit), on a docked ship (loaded), in the start warehouse.
// The material is not marked unit by unit, so this is a best guess.
function locationLabel(batch: ArbBatch) {
  if (storeHas(warehouseOf(batch.to), batch.ticker)) {
    return t('arblog.loc.arrived');
  }
  const ships = (shipsStore.all.value ?? []).filter(x =>
    storeHas(storagesStore.getById(x.idShipStore), batch.ticker),
  );
  if (ships.some(x => x.flightId !== null)) {
    return t('arblog.loc.flying');
  }
  if (ships.length > 0) {
    return t('arblog.loc.loaded');
  }
  if (storeHas(warehouseOf(batch.from), batch.ticker)) {
    return t('arblog.loc.atStart');
  }
  return t('arblog.state.holding');
}

function stateLabel(state: string) {
  return t(`arblog.state.${state}` as 'arblog.state.done');
}

// Click a row to see the plan, the trades, the open orders and the live book.
const opened = ref<string>();
const books = new HiddenOrderBooks();
watch(
  () => {
    const keys: string[] = [];
    const batch = userData.arbBatches.find(x => x.id === opened.value);
    if (batch) {
      keys.push(`${batch.ticker}.${batch.from}`, `${batch.ticker}.${batch.to}`);
    }
    const trip = trips.value.find(x => x.id === selling.value);
    for (const row of trip?.rows ?? []) {
      keys.push(`${row.batch.ticker}.${row.batch.to}`);
    }
    return [...new Set(keys)].sort().join(',');
  },
  value => void books.show(value === '' ? [] : value.split(',')),
);
onUnmounted(() => books.close());

function toggle(id: string) {
  opened.value = opened.value === id ? undefined : id;
}

function remove(id: string) {
  userData.arbBatches = userData.arbBatches.filter(x => x.id !== id);
  opened.value = undefined;
}

function avg(total: number, units: number) {
  return units > 0 ? fixed02(total / units) : '--';
}

function date(ms: number) {
  return dayjs(ms).format('MM-DD');
}
</script>

<template>
  <div :class="$style.root">
    <div :class="$style.bar">
      <ChipGroup v-model="filter" :options="filterChips" />
      <span :class="$style.spacer" />
      <span v-if="filter !== 'watch'" :class="$style.muted">
        {{ t('arblog.summary', summary.count) }}
        {{ formatProfit(summary.plan) }} ·
        {{ t('arblog.actual') }}
        <span :class="summary.actual >= 0 ? C.ColoredValue.positive : C.ColoredValue.negative">{{
          formatProfit(summary.actual)
        }}</span>
      </span>
    </div>
    <WatchList v-if="filter === 'watch'" />
    <template v-else>
      <p v-if="rows.length === 0" :class="$style.muted">{{ t('arblog.none') }}</p>
      <div v-else :class="[$style.row, $style.head]">
        <span>{{ t('arb.material') }}</span>
        <span>{{ t('arb.route') }}</span>
        <span>{{ t('arb.mode') }}</span>
        <span>{{ t('arblog.status') }}</span>
        <span>{{ t('arblog.progress') }}</span>
        <span :class="$style.num">{{ t('arblog.planProfit') }}</span>
        <span :class="$style.num">{{ t('arblog.actualProfit') }}</span>
        <span :class="$style.num">{{ t('arb.return') }}</span>
        <span :class="$style.num">{{ t('arblog.perDay') }}</span>
        <span :class="$style.num">{{ t('arblog.daysVsPlan') }}</span>
      </div>
      <template v-for="trip in trips" :key="trip.id">
        <div :class="$style.trip">
          <span
            ><b>{{ t('arblog.trip') }}</b> {{ date(trip.first.createdAt) }} ·
            {{ cxLabel(trip.first.from) }} → {{ cxLabel(trip.first.to) }}</span
          >
          <span :class="$style.spacer" />
          <span :class="$style.muted"
            >{{ t('arblog.plan') }} {{ formatProfit(trip.plan) }} · {{ t('arblog.actual') }}</span
          >
          <span :class="trip.actual >= 0 ? C.ColoredValue.positive : C.ColoredValue.negative">{{
            formatProfit(trip.actual)
          }}</span>
          <button
            v-if="trip.sellable && selling !== trip.id"
            :class="$style.secondary"
            @click="selling = trip.id">
            {{ t('arblog.sellTrip') }}
          </button>
        </div>
        <TripSell
          v-if="selling === trip.id"
          :batches="trip.rows.map(x => x.batch)"
          @close="selling = undefined" />
        <template v-for="r in trip.rows" :key="r.batch.id">
          <div
            :class="[
              'rpz-row',
              $style.row,
              $style.data,
              opened === r.batch.id ? $style.opened : undefined,
            ]"
            @click="toggle(r.batch.id)">
            <span :class="$style.icon" @click.stop
              ><MaterialIcon size="inline-table" :ticker="r.batch.ticker"
            /></span>
            <span
              >{{ cxLabel(r.batch.from) }} <span :class="$style.muted">→</span>
              {{ cxLabel(r.batch.to) }}</span
            >
            <span :class="$style.muted">{{
              r.batch.mode === 'now' ? t('arb.fill') : t('arb.list')
            }}</span>
            <span :class="r.state === 'done' ? $style.muted : undefined">
              {{ r.state === 'holding' ? locationLabel(r.batch) : stateLabel(r.state) }}
              <span v-if="r.state !== 'done' && beaten(r.batch)" :class="$style.dot" />
            </span>
            <span>
              <span :class="$style.progressText"
                >{{ fixed0(r.soldUnits) }}
                <span :class="$style.muted">/ {{ fixed0(r.units) }}</span></span
              >
              <span :class="$style.progress"
                ><i :style="{ width: `${r.units > 0 ? (r.soldUnits / r.units) * 100 : 0}%` }"
              /></span>
            </span>
            <span :class="[$style.num, $style.muted]">{{ formatProfit(r.batch.plan.profit) }}</span>
            <span
              :class="[
                $style.num,
                $style.key,
                r.profit === undefined
                  ? $style.muted
                  : r.profit >= 0
                    ? C.ColoredValue.positive
                    : C.ColoredValue.negative,
              ]"
              >{{ r.profit !== undefined ? formatProfit(r.profit) : '--' }}</span
            >
            <span :class="$style.num">{{ r.ret !== undefined ? percent1(r.ret) : '--' }}</span>
            <span :class="$style.num"
              >{{ perDayText(r.profit, r.days) }}
              <span :class="$style.muted"
                >/ {{ perDayText(r.batch.plan.profit, r.plannedDays) }}</span
              ></span
            >
            <span
              :class="[
                $style.num,
                r.plannedDays !== undefined && r.days > r.plannedDays ? $style.warn : undefined,
              ]"
              >{{ fixed01(r.days) }}
              <span :class="$style.muted"
                >/
                {{
                  r.plannedDays !== undefined ? t('arblog.dayCount', fixed01(r.plannedDays)) : '--'
                }}</span
              ></span
            >
          </div>
          <div v-if="opened === r.batch.id" :class="$style.detail">
            <!-- Four figures, plan against actual where both exist. -->
            <div :class="$style.stats">
              <span :class="$style.stat">
                <span :class="$style.label">{{ t('arblog.buy') }}</span>
                <span>{{ fixed0(r.units) }} × {{ avg(buyCost(r.batch), r.units) }}</span>
              </span>
              <span :class="$style.stat">
                <span :class="$style.label">{{ t('arblog.sell') }}</span>
                <span
                  >{{ fixed0(r.soldUnits) }} × {{ avg(revenue(r.batch), r.soldUnits) }}
                  <span :class="$style.muted"
                    >/ {{ t('arblog.plan') }} {{ fixed02(r.batch.plan.sellPrice) }}</span
                  ></span
                >
              </span>
              <span :class="$style.stat">
                <span :class="$style.label">{{ t('arb.return') }}</span>
                <span
                  >{{ r.ret !== undefined ? percent1(r.ret) : '--' }}
                  <span :class="$style.muted"
                    >/ {{ t('arblog.plan') }} {{ percent1(r.batch.plan.return) }}</span
                  ></span
                >
              </span>
              <span :class="$style.stat">
                <span :class="$style.label">{{ t('arb.safety') }}</span>
                <span>{{
                  r.batch.plan.safety !== undefined ? fixed01(r.batch.plan.safety) : '--'
                }}</span>
              </span>
            </div>
            <template v-if="r.open.length > 0">
              <div :class="$style.title">{{ t('arblog.orders') }}</div>
              <BatchOrders :batch="r.batch" :orders="r.open" />
            </template>
            <!-- The live book of the end exchange, to watch the market you sell in. -->
            <div :class="$style.title">{{ t('arblog.destBook', cxLabel(r.batch.to)) }}</div>
            <PriceLadder
              :class="$style.ladder"
              :ticker="r.batch.ticker"
              traders
              :height="300"
              :exchanges="[r.batch.to]" />
            <div :class="$style.footer">
              <button :class="$style.tertiary" @click="remove(r.batch.id)">
                {{ t('arblog.remove') }}
              </button>
            </div>
          </div>
        </template>
      </template>
    </template>
  </div>
</template>

<style module>
.trip {
  display: flex;
  align-items: center;
  gap: var(--rpz-space-2);
  margin-top: var(--rpz-space-2);
  padding: var(--rpz-space-1) var(--rpz-space-2);
  background-color: var(--rpz-bg-raised);
}

.secondary {
  padding: 2px 10px;
  border: 1px solid var(--rpz-stroke);
  background: none;
  color: var(--rpz-text);
  font: inherit;
  cursor: pointer;
}

.secondary:hover {
  background-color: var(--rpz-hover);
}

.secondary:active {
  background-color: var(--rpz-press);
}

.root {
  min-width: 1040px;
  padding: 6px 8px;
  color: var(--rpz-text);
  font-size: var(--rpz-fs-body);
  font-variant-numeric: tabular-nums;
}

.bar {
  display: flex;
  align-items: center;
  gap: var(--rpz-space-2) var(--rpz-space-3);
  margin-bottom: var(--rpz-space-2);
}

.spacer {
  flex: 1;
}

.row {
  display: grid;
  grid-template-columns: 56px 90px 44px 80px 110px 80px 90px 70px 130px minmax(90px, 1fr);
  gap: 0 10px;
  align-items: center;
  padding: var(--rpz-space-1) var(--rpz-space-2);
  border-top: 1px solid var(--rpz-stroke-weak);
}

.head {
  color: var(--rpz-text-weak);
  border-top: none;
}

.data {
  cursor: pointer;
}

.data:hover {
  background-color: var(--rpz-hover);
}

.data:active {
  background-color: var(--rpz-press);
}

.opened {
  background-color: var(--rpz-bg-raised);
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

/* Over the expected days. A warning is red (player, 2026-11-05). */
.warn,
.warn .muted {
  color: var(--rpz-neg);
}

/* The one value of a row that the decision is made on (docs/ui-rules.md 3.5). */
.key {
  font-weight: 600;
}

.dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  margin-left: var(--rpz-space-1);
  border-radius: 50%;
  background-color: var(--rpz-brand);
  vertical-align: middle;
}

.progressText {
  display: block;
  text-align: right;
}

.progress {
  position: relative;
  display: block;
  height: 4px;
  margin-top: 2px;
  background-color: #333;
}

.progress i {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  background-color: var(--rpz-brand);
}

.detail {
  display: grid;
  gap: var(--rpz-space-2);
  padding: var(--rpz-space-2) var(--rpz-space-2) var(--rpz-space-3) 74px;
  background-color: var(--rpz-bg-raised);
  border-top: 1px solid var(--rpz-stroke-weak);
}

.stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--rpz-space-3);
}

.stat {
  display: grid;
  gap: 2px;
}

.label {
  color: var(--rpz-text-weak);
  font-size: var(--rpz-fs-label);
}

.columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--rpz-space-3);
}

.title {
  margin-bottom: var(--rpz-space-1);
  color: var(--rpz-text-weak);
}

.compare {
  display: grid;
  grid-template-columns: 90px 1fr 1fr;
  gap: 2px var(--rpz-space-2);
}

.trade {
  display: grid;
  grid-template-columns: 90px 1fr 70px 80px;
  gap: 0 var(--rpz-space-2);
  padding: 2px 0;
  border-top: 1px solid var(--rpz-stroke-weak);
}

.ladder {
  margin-top: var(--rpz-space-2);
}

.footer {
  display: flex;
  justify-content: flex-end;
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
