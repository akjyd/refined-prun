<script setup lang="ts">
import { cxLabel } from '@src/core/exchange-label';
import MaterialIcon from '@src/components/MaterialIcon.vue';
import ChipGroup from '@src/components/ChipGroup.vue';
import { cxStore } from '@src/infrastructure/fio/cx';
import { dailyCloses, requestCloses } from '@src/infrastructure/fio/cxpc';
import { dailyVolatility } from '@src/core/volatility';
import { fixed0, fixed02, percent1 } from '@src/utils/format';
import { t } from '@src/i18n';

// Price movers: materials whose recent price moved away from the month, from the FIO price
// file (7-day and 30-day averages, best offer and request). Daily prices and volatility come
// from FIO's daily candles for the rows on screen.
const $style = useCssModule();

const EXCHANGES = ['AI1', 'CI1', 'IC1', 'NC1'];
const exchangeChips = EXCHANGES.map(x => ({ value: x, label: cxLabel(x) }));
const exchanges = ref<string[]>([]);

// Rows shown; the daily candles are loaded only for these.
const SHOWN = 60;

interface Row {
  key: string;
  ticker: string;
  code: string;
  vwap7: number;
  // 7-day average vs 30-day average.
  trend: number;
  // Best offer and best request vs the 7-day average.
  askGap?: number;
  bidGap?: number;
  traded7: number;
}

const allRows = computed(() => {
  const rows: Row[] = [];
  if (!cxStore.fetched) {
    return rows;
  }
  for (const code of EXCHANGES) {
    for (const [ticker, info] of cxStore.prices.get(code) ?? []) {
      const vwap7 = info.VWAP7D ?? 0;
      const vwap30 = info.VWAP30D ?? 0;
      const traded7 = info.Traded7D ?? 0;
      if (vwap7 <= 0 || vwap30 <= 0 || traded7 <= 0) {
        continue;
      }
      rows.push({
        key: `${ticker}.${code}`,
        ticker,
        code,
        vwap7,
        trend: vwap7 / vwap30 - 1,
        askGap: (info.Ask ?? 0) > 0 ? info.Ask! / vwap7 - 1 : undefined,
        bidGap: (info.Bid ?? 0) > 0 ? info.Bid! / vwap7 - 1 : undefined,
        traded7,
      });
    }
  }
  return rows;
});

function volatilityOf(row: Row) {
  const closes = dailyCloses.get(row.key);
  return closes ? dailyVolatility(closes) : undefined;
}

type SortKey = 'trend' | 'askGap' | 'bidGap' | 'traded7' | 'volatility';
const sortKey = ref<SortKey>('trend');
const sortDown = ref(true);

function sortBy(key: SortKey) {
  if (sortKey.value === key) {
    sortDown.value = !sortDown.value;
  } else {
    sortKey.value = key;
    sortDown.value = true;
  }
}

function arrow(key: SortKey) {
  return sortKey.value === key ? (sortDown.value ? ' ▾' : ' ▴') : '';
}

// Moves sort by size, up or down alike; volume and volatility by value.
function sortValue(row: Row) {
  switch (sortKey.value) {
    case 'traded7':
      return row.traded7;
    case 'volatility':
      return volatilityOf(row) ?? -Infinity;
    default: {
      const value = row[sortKey.value];
      return value === undefined ? -Infinity : Math.abs(value);
    }
  }
}

const rows = computed(() => {
  const list = allRows.value.filter(
    x => exchanges.value.length === 0 || exchanges.value.includes(x.code),
  );
  const sign = sortDown.value ? -1 : 1;
  return list.sort((a, b) => sign * (sortValue(a) - sortValue(b))).slice(0, SHOWN);
});

watchEffect(() => requestCloses(rows.value.map(x => x.key)));

const open = ref<string>();

function toggle(key: string) {
  open.value = open.value === key ? undefined : key;
}

function signed(value: number | undefined) {
  if (value === undefined) {
    return '--';
  }
  return `${value > 0 ? '+' : ''}${percent1(value)}`;
}

function moveClass(value: number | undefined) {
  if (value === undefined || Math.abs(value) < 0.005) {
    return undefined;
  }
  return value > 0 ? C.ColoredValue.positive : C.ColoredValue.negative;
}

// The last 31 daily closes as a line, scaled to its own range.
function sparkline(key: string) {
  const closes = dailyCloses.get(key);
  if (!closes || closes.length < 2) {
    return undefined;
  }
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max > min ? max - min : 1;
  const w = 300;
  const h = 48;
  const points = closes
    .map((v, i) => `${(i / (closes.length - 1)) * w},${h - 2 - ((v - min) / range) * (h - 4)}`)
    .join(' ');
  return { points, w, h, min, max, last: closes[closes.length - 1] };
}
</script>

<template>
  <div :class="$style.root">
    <div :class="$style.bar">
      <span :class="$style.muted">{{ t('movers.exchange') }}</span>
      <ChipGroup v-model="exchanges" multiple :options="exchangeChips" />
    </div>
    <p v-if="!cxStore.fetched" :class="$style.muted">{{ t('movers.loading') }}</p>
    <div v-else :class="[$style.row, $style.head]">
      <span>{{ t('arb.material') }}</span>
      <span>{{ t('movers.exchange') }}</span>
      <span :class="$style.num">{{ t('movers.vwap7') }}</span>
      <span :class="[$style.num, $style.sort]" @click="sortBy('trend')"
        >{{ t('movers.trend') }}{{ arrow('trend') }}</span
      >
      <span :class="[$style.num, $style.sort]" @click="sortBy('askGap')"
        >{{ t('movers.askGap') }}{{ arrow('askGap') }}</span
      >
      <span :class="[$style.num, $style.sort]" @click="sortBy('bidGap')"
        >{{ t('movers.bidGap') }}{{ arrow('bidGap') }}</span
      >
      <span :class="[$style.num, $style.sort]" @click="sortBy('volatility')"
        >{{ t('movers.volatility') }}{{ arrow('volatility') }}</span
      >
      <span :class="[$style.num, $style.sort]" @click="sortBy('traded7')"
        >{{ t('movers.traded7') }}{{ arrow('traded7') }}</span
      >
    </div>
    <template v-for="r in rows" :key="r.key">
      <div
        :class="[$style.row, $style.data, open === r.key ? $style.opened : undefined]"
        @click="toggle(r.key)">
        <span :class="$style.icon" @click.stop
          ><MaterialIcon size="inline-table" :ticker="r.ticker"
        /></span>
        <span>{{ cxLabel(r.code) }}</span>
        <span :class="$style.num">{{ fixed02(r.vwap7) }}</span>
        <span :class="[$style.num, moveClass(r.trend)]">{{ signed(r.trend) }}</span>
        <span :class="[$style.num, moveClass(r.askGap)]">{{ signed(r.askGap) }}</span>
        <span :class="[$style.num, moveClass(r.bidGap)]">{{ signed(r.bidGap) }}</span>
        <span :class="$style.num">{{
          volatilityOf(r) !== undefined ? percent1(volatilityOf(r)!) : '--'
        }}</span>
        <span :class="$style.num">{{ fixed0(r.traded7) }}</span>
      </div>
      <div v-if="open === r.key" :class="$style.detail">
        <template v-if="sparkline(r.key)">
          <svg
            :width="sparkline(r.key)!.w"
            :height="sparkline(r.key)!.h"
            :class="$style.spark"
            aria-hidden="true">
            <polyline :points="sparkline(r.key)!.points" />
          </svg>
          <span :class="$style.range">
            <span :class="$style.muted">{{ t('movers.high') }}</span>
            {{ fixed02(sparkline(r.key)!.max) }}
            <span :class="$style.muted">{{ t('movers.low') }}</span>
            {{ fixed02(sparkline(r.key)!.min) }}
            <span :class="$style.muted">{{ t('movers.last') }}</span>
            {{ fixed02(sparkline(r.key)!.last) }}
          </span>
        </template>
        <span v-else :class="$style.muted">{{ t('movers.loading') }}</span>
      </div>
    </template>
  </div>
</template>

<style module>
.root {
  min-width: 760px;
  padding: 6px 8px;
  color: var(--rpz-text);
  font-size: var(--rpz-fs-body);
  font-variant-numeric: tabular-nums;
}

.bar {
  display: flex;
  align-items: center;
  gap: var(--rpz-space-2);
  margin-bottom: var(--rpz-space-2);
}

.row {
  display: grid;
  grid-template-columns: 56px 50px 90px 80px 80px 80px 70px minmax(0, 1fr);
  gap: 0 var(--rpz-space-3);
  align-items: center;
  padding: var(--rpz-space-1) var(--rpz-space-2);
  border-top: 1px solid var(--rpz-stroke-weak);
}

.head {
  color: var(--rpz-text-weak);
  border-top: none;
}

.sort {
  cursor: pointer;
}

.sort:hover {
  color: var(--rpz-text);
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

.detail {
  display: flex;
  align-items: center;
  gap: var(--rpz-space-3);
  padding: var(--rpz-space-2) var(--rpz-space-2) var(--rpz-space-2) 74px;
  background-color: var(--rpz-bg-raised);
}

.spark polyline {
  fill: none;
  stroke: var(--rpz-brand);
  stroke-width: 1.5;
}

.range {
  display: flex;
  gap: var(--rpz-space-1) var(--rpz-space-2);
}
</style>
