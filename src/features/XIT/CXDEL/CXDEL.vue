<script setup lang="ts">
import dayjs from 'dayjs';
import MaterialIcon from '@src/components/MaterialIcon.vue';
import { cxLabel } from '@src/core/exchange-label';
import { cxDeletions, CxDeletion } from '@src/features/XIT/CXDEL/cx-delete-store';
import { formatProfit } from '@src/core/daily-profit/profit-format';
import { timestampEachMinute } from '@src/utils/dayjs';
import { fixed0, fixed02 } from '@src/utils/format';
import { t } from '@src/i18n';

// Deletions of open CX orders: the last 24 hours by material, each day, and every deletion.
const $style = useCssModule();

const DAY = 86_400_000;

function byTicker(list: CxDeletion[]) {
  const map = new Map<string, number>();
  for (const x of list) {
    map.set(x.ticker, (map.get(x.ticker) ?? 0) + 1);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

const last24 = computed(() =>
  cxDeletions.value.filter(x => timestampEachMinute.value - x.at < DAY),
);
const last24ByTicker = computed(() => byTicker(last24.value));

const days = computed(() => {
  const map = new Map<string, CxDeletion[]>();
  for (const x of cxDeletions.value) {
    const day = dayjs(x.at).format('MM-DD');
    map.set(day, [...(map.get(day) ?? []), x]);
  }
  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([day, list]) => {
      const top = byTicker(list)[0];
      return {
        day,
        count: list.length,
        materials: new Set(list.map(x => x.ticker)).size,
        top,
        value: sumBy(list, x => x.amount * x.price),
      };
    });
});

const records = computed(() => [...cxDeletions.value].reverse().slice(0, 200));
</script>

<template>
  <div :class="$style.root">
    <div :class="$style.summary">
      <span :class="$style.big">{{ t('cxdel.last24', last24.length) }}</span>
      <span v-for="[ticker, n] in last24ByTicker" :key="ticker" :class="$style.chip">
        <MaterialIcon size="inline-table" :ticker="ticker" /> {{ n }}
      </span>
    </div>
    <p v-if="cxDeletions.length === 0" :class="$style.muted">{{ t('cxdel.none') }}</p>
    <template v-else>
      <div :class="$style.title">{{ t('cxdel.byDay') }}</div>
      <div :class="[$style.day, $style.head]">
        <span>{{ t('cxdel.date') }}</span>
        <span :class="$style.num">{{ t('cxdel.count') }}</span>
        <span :class="$style.num">{{ t('cxdel.materials') }}</span>
        <span>{{ t('cxdel.most') }}</span>
        <span :class="$style.num">{{ t('cxdel.value') }}</span>
      </div>
      <div v-for="d in days" :key="d.day" :class="$style.day">
        <span>{{ d.day }}</span>
        <span :class="$style.num">{{ d.count }}</span>
        <span :class="$style.num">{{ d.materials }}</span>
        <span
          ><MaterialIcon size="inline-table" :ticker="d.top[0]" />
          <span :class="$style.muted">× {{ d.top[1] }}</span></span
        >
        <span :class="$style.num">{{ formatProfit(d.value) }}</span>
      </div>
      <div :class="$style.title">{{ t('cxdel.records') }}</div>
      <div :class="[$style.record, $style.head]">
        <span>{{ t('cxdel.time') }}</span>
        <span>{{ t('arb.material') }}</span>
        <span>{{ t('movers.exchange') }}</span>
        <span>{{ t('cxdel.side') }}</span>
        <span :class="$style.num">{{ t('cxdel.left') }}</span>
        <span :class="$style.num">{{ t('cx4.price') }}</span>
        <span />
      </div>
      <div v-for="r in records" :key="`${r.orderId}${r.at}`" :class="$style.record">
        <span :class="$style.muted">{{ dayjs(r.at).format('MM-DD HH:mm') }}</span>
        <span :class="$style.icon"><MaterialIcon size="inline-table" :ticker="r.ticker" /></span>
        <span>{{ cxLabel(r.exchange) }}</span>
        <span :class="$style.muted">{{ r.side === 'buy' ? t('cx4.bids') : t('cx4.asks') }}</span>
        <span :class="$style.num">{{ fixed0(r.amount) }}</span>
        <span :class="$style.num">{{ fixed02(r.price) }}</span>
        <span :class="$style.muted">{{ r.partly ? t('cxdel.partly') : '' }}</span>
      </div>
    </template>
  </div>
</template>

<style module>
.root {
  min-width: 560px;
  padding: 6px 8px;
  color: var(--rpz-text);
  font-size: var(--rpz-fs-body);
  font-variant-numeric: tabular-nums;
}

.summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--rpz-space-1) var(--rpz-space-3);
  padding: var(--rpz-space-2);
  margin-bottom: var(--rpz-space-2);
  background-color: var(--rpz-bg-raised);
}

.big {
  font-size: var(--rpz-fs-title);
  font-weight: bold;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: var(--rpz-space-1);
}

.title {
  margin: var(--rpz-space-3) 0 var(--rpz-space-1);
  color: var(--rpz-text-weak);
}

.day,
.record {
  display: grid;
  gap: 0 var(--rpz-space-3);
  align-items: center;
  padding: var(--rpz-space-1) var(--rpz-space-2);
  border-top: 1px solid var(--rpz-stroke-weak);
}

.day {
  grid-template-columns: 60px 60px 60px 100px 100px;
}

.record {
  grid-template-columns: 90px 50px 50px 40px 80px 80px minmax(0, 1fr);
}

.head {
  color: var(--rpz-text-weak);
  border-top: none;
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
</style>
