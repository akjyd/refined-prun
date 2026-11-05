<script setup lang="ts">
import dayjs from 'dayjs';
import MaterialIcon from '@src/components/MaterialIcon.vue';
import ChipGroup from '@src/components/ChipGroup.vue';
import PriceLadder from '@src/features/XIT/CX4/PriceLadder.vue';
import BatchOrders from '@src/features/XIT/ARBLOG/BatchOrders.vue';
import {
  ArbBatch,
  bought,
  buyCost,
  realizedProfit,
  revenue,
  sold,
  status,
} from '@src/core/arb-batches';
import { cxosStore } from '@src/infrastructure/prun-api/data/cxos';
import { cxobStore } from '@src/infrastructure/prun-api/data/cxob';
import { companyStore } from '@src/infrastructure/prun-api/data/company';
import { HiddenOrderBooks } from '@src/infrastructure/prun-ui/hidden-order-books';
import { userData } from '@src/store/user-data';
import { formatProfit } from '@src/core/daily-profit/profit-format';
import { fixed0, fixed01, fixed02, percent1 } from '@src/utils/format';
import { timestampEachMinute } from '@src/utils/dayjs';
import { t } from '@src/i18n';

const $style = useCssModule();

type Filter = 'all' | 'open' | 'done';
const filter = ref<Filter>('all');
const filterChips = computed(() => [
  { value: 'all' as const, label: t('arblog.all') },
  { value: 'open' as const, label: t('arblog.open') },
  { value: 'done' as const, label: t('arblog.done') },
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
        days: Math.max(0, Math.floor((end - batch.createdAt) / 86_400_000)),
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

const summary = computed(() => {
  const done = userData.arbBatches.filter(x => status(x, 0) === 'done' && bought(x) > 0);
  return {
    count: done.length,
    plan: sumBy(done, x => x.plan.profit),
    actual: sumBy(done, x => realizedProfit(x) ?? 0),
  };
});

function stateLabel(state: string) {
  return t(`arblog.state.${state}` as 'arblog.state.done');
}

// Click a row to see the plan, the trades, the open orders and the live book.
const opened = ref<string>();
const books = new HiddenOrderBooks();
watch(opened, id => {
  const batch = userData.arbBatches.find(x => x.id === id);
  void books.show(batch ? [`${batch.ticker}.${batch.from}`, `${batch.ticker}.${batch.to}`] : []);
});
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

function time(ms: number) {
  return dayjs(ms).format('MM-DD HH:mm');
}
</script>

<template>
  <div :class="$style.root">
    <div :class="$style.bar">
      <ChipGroup v-model="filter" :options="filterChips" />
      <span :class="$style.spacer" />
      <span :class="$style.muted">
        {{ t('arblog.summary', summary.count) }}
        {{ formatProfit(summary.plan) }} ·
        {{ t('arblog.actual') }}
        <span :class="summary.actual >= 0 ? C.ColoredValue.positive : C.ColoredValue.negative">{{
          formatProfit(summary.actual)
        }}</span>
      </span>
    </div>
    <p v-if="rows.length === 0" :class="$style.muted">{{ t('arblog.none') }}</p>
    <div v-else :class="[$style.row, $style.head]">
      <span>{{ t('arb.material') }}</span>
      <span>{{ t('arb.route') }}</span>
      <span>{{ t('arblog.status') }}</span>
      <span>{{ t('arblog.progress') }}</span>
      <span :class="$style.num">{{ t('arblog.planProfit') }}</span>
      <span :class="$style.num">{{ t('arblog.actualProfit') }}</span>
      <span :class="$style.num">{{ t('arb.return') }}</span>
      <span :class="$style.num">{{ t('arblog.days') }}</span>
      <span :class="$style.num">{{ t('arblog.boughtAt') }}</span>
    </div>
    <template v-for="r in rows" :key="r.batch.id">
      <div
        :class="[$style.row, $style.data, opened === r.batch.id ? $style.opened : undefined]"
        @click="toggle(r.batch.id)">
        <span :class="$style.icon" @click.stop
          ><MaterialIcon size="inline-table" :ticker="r.batch.ticker"
        /></span>
        <span>{{ r.batch.from }} <span :class="$style.muted">→</span> {{ r.batch.to }}</span>
        <span :class="r.state === 'done' ? $style.muted : undefined">
          {{ stateLabel(r.state) }}
          <span v-if="r.state !== 'done' && beaten(r.batch)" :class="$style.dot" />
        </span>
        <span>
          <span :class="$style.progressText"
            >{{ fixed0(r.soldUnits) }} / {{ fixed0(r.units) }}</span
          >
          <span :class="$style.progress"
            ><i :style="{ width: `${r.units > 0 ? (r.soldUnits / r.units) * 100 : 0}%` }"
          /></span>
        </span>
        <span :class="$style.num">{{ formatProfit(r.batch.plan.profit) }}</span>
        <span
          :class="[
            $style.num,
            r.profit === undefined
              ? $style.muted
              : r.profit >= 0
                ? C.ColoredValue.positive
                : C.ColoredValue.negative,
          ]"
          >{{ r.profit !== undefined ? formatProfit(r.profit) : '--' }}</span
        >
        <span :class="$style.num">{{ r.ret !== undefined ? percent1(r.ret) : '--' }}</span>
        <span :class="$style.num">{{ t('arblog.dayCount', r.days) }}</span>
        <span :class="[$style.num, $style.muted]">{{ time(r.batch.createdAt) }}</span>
      </div>
      <div v-if="opened === r.batch.id" :class="$style.detail">
        <div :class="$style.columns">
          <div>
            <div :class="$style.title">{{ t('arblog.planVsActual') }}</div>
            <div :class="$style.compare">
              <span />
              <span :class="$style.muted">{{ t('arblog.plan') }}</span>
              <span :class="$style.muted">{{ t('arblog.actual') }}</span>
              <span :class="$style.muted">{{ t('arblog.units') }}</span>
              <span>{{ fixed0(r.batch.plan.units) }}</span>
              <span>{{ fixed0(r.units) }}</span>
              <span :class="$style.muted">{{ t('arblog.avgBuy') }}</span>
              <span>{{ avg(r.batch.plan.cost, r.batch.plan.units) }}</span>
              <span>{{ avg(buyCost(r.batch), r.units) }}</span>
              <span :class="$style.muted">{{ t('arblog.avgSell') }}</span>
              <span>{{ fixed02(r.batch.plan.sellPrice) }}</span>
              <span>{{ avg(revenue(r.batch), r.soldUnits) }}</span>
              <span :class="$style.muted">{{ t('arb.return') }}</span>
              <span>{{ percent1(r.batch.plan.return) }}</span>
              <span>{{ r.ret !== undefined ? percent1(r.ret) : '--' }}</span>
              <span :class="$style.muted">{{ t('arb.safety') }}</span>
              <span>{{
                r.batch.plan.safety !== undefined ? fixed01(r.batch.plan.safety) : '--'
              }}</span>
              <span />
            </div>
          </div>
          <div>
            <div :class="$style.title">{{ t('arblog.trades') }}</div>
            <div v-for="(x, i) in r.batch.trades" :key="i" :class="$style.trade">
              <span :class="$style.muted">{{ time(x.time) }}</span>
              <span
                >{{ x.side === 'buy' ? r.batch.from : r.batch.to }}
                {{ x.side === 'buy' ? t('arblog.buy') : t('arblog.sell') }}</span
              >
              <span :class="$style.num">{{ fixed0(x.amount) }}</span>
              <span :class="$style.num">{{ fixed02(x.price) }}</span>
            </div>
          </div>
        </div>
        <template v-if="r.open.length > 0">
          <div :class="$style.title">{{ t('arblog.orders') }}</div>
          <BatchOrders :batch="r.batch" :orders="r.open" />
          <PriceLadder
            :class="$style.ladder"
            :ticker="r.batch.ticker"
            traders
            :exchanges="
              r.open.some(x => x.type === 'BUYING') ? [r.batch.from, r.batch.to] : [r.batch.to]
            " />
        </template>
        <div :class="$style.footer">
          <button :class="$style.tertiary" @click="remove(r.batch.id)">
            {{ t('arblog.remove') }}
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<style module>
.root {
  min-width: 900px;
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
  grid-template-columns: 56px 90px 80px 110px 90px 90px 70px 50px minmax(0, 1fr);
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
