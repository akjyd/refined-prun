<script setup lang="ts">
import { cxLabel } from '@src/core/exchange-label';
import dayjs from 'dayjs';
import MaterialIcon from '@src/components/MaterialIcon.vue';
import ChipGroup from '@src/components/ChipGroup.vue';
import { WatchRecord } from '@src/core/arb-watch';
import { dueAt, runChecks, watchRecords } from '@src/features/XIT/ARBLOG/arb-watch-store';
import { formatProfit } from '@src/core/daily-profit/profit-format';
import { timestampEachMinute } from '@src/utils/dayjs';
import { fixed0, percent0 } from '@src/utils/format';
import { t } from '@src/i18n';

// Watched chances: recorded without buying, checked later. "By trade" sums the checked records
// of each material, route and mode, to see which trades really make money.
const $style = useCssModule();

type View = 'groups' | 'records';
const view = ref<View>('groups');
const viewChips = computed(() => [
  { value: 'groups' as const, label: t('arblog.byTrade') },
  { value: 'records' as const, label: t('arblog.records') },
]);

const checked = computed(() => watchRecords.value.filter(x => x.check !== undefined));

const summary = computed(() => {
  const list = checked.value;
  const hits = list.filter(x => (x.check?.profit ?? 0) > 0);
  return {
    total: watchRecords.value.length,
    checked: list.length,
    hits: hits.length,
    plan: sumBy(list, x => x.profit),
    estimate: sumBy(list, x => x.check?.profit ?? 0),
  };
});

const groups = computed(() => {
  const map = new Map<string, WatchRecord[]>();
  for (const record of checked.value) {
    const key = `${record.mode}:${record.ticker}.${record.from}>${record.to}`;
    map.set(key, [...(map.get(key) ?? []), record]);
  }
  return [...map.entries()]
    .map(([key, list]) => ({
      key,
      first: list[0],
      count: list.length,
      hits: list.filter(x => (x.check?.profit ?? 0) > 0).length,
      plan: sumBy(list, x => x.profit),
      estimate: sumBy(list, x => x.check?.profit ?? 0),
    }))
    .sort((a, b) => b.estimate - a.estimate);
});

const records = computed(() => [...watchRecords.value].sort((a, b) => b.at - a.at).slice(0, 300));

function stateOf(record: WatchRecord) {
  if (record.check) {
    return t('arblog.watchChecked');
  }
  const left = dueAt(record) - timestampEachMinute.value;
  if (left <= 0) {
    return t('arblog.watchDue');
  }
  return t('arblog.watchWait', fixed0(Math.ceil(left / 3_600_000)));
}

function noteOf(record: WatchRecord) {
  if (record.check?.note === 'stale') {
    return t('arblog.watchStale');
  }
  if (record.check?.note === 'noData') {
    return t('arblog.watchNoData');
  }
  return '';
}

function modeLabel(mode: WatchRecord['mode']) {
  return mode === 'now' ? t('arb.fill') : t('arb.list');
}

function time(ms: number) {
  return dayjs(ms).format('MM-DD HH:mm');
}

function profitClass(value: number | undefined) {
  if (value === undefined) {
    return $style.muted;
  }
  return value > 0 ? C.ColoredValue.positive : C.ColoredValue.negative;
}
</script>

<template>
  <div>
    <div :class="$style.bar">
      <ChipGroup v-model="view" :options="viewChips" />
      <span :class="$style.muted">
        {{ t('arblog.watchSummary', summary.total, summary.checked, summary.hits) }}
        {{ t('arblog.plan') }} {{ formatProfit(summary.plan) }} · {{ t('arblog.estimate') }}
      </span>
      <span :class="profitClass(summary.estimate)">{{ formatProfit(summary.estimate) }}</span>
      <span :class="$style.spacer" />
      <button :class="$style.secondary" @click="runChecks()">{{ t('arblog.checkNow') }}</button>
    </div>
    <template v-if="view === 'groups'">
      <p v-if="groups.length === 0" :class="$style.muted">{{ t('arblog.watchNone') }}</p>
      <div v-else :class="[$style.group, $style.head]">
        <span>{{ t('arb.material') }}</span>
        <span>{{ t('arb.route') }}</span>
        <span>{{ t('arb.mode') }}</span>
        <span :class="$style.num">{{ t('arblog.hitRate') }}</span>
        <span :class="$style.num">{{ t('arblog.planProfit') }}</span>
        <span :class="$style.num">{{ t('arblog.estimateProfit') }}</span>
      </div>
      <div v-for="g in groups" :key="g.key" :class="$style.group">
        <span :class="$style.icon"
          ><MaterialIcon size="inline-table" :ticker="g.first.ticker"
        /></span>
        <span
          >{{ cxLabel(g.first.from) }} <span :class="$style.muted">→</span>
          {{ cxLabel(g.first.to) }}</span
        >
        <span :class="$style.muted">{{ modeLabel(g.first.mode) }}</span>
        <span :class="$style.num"
          >{{ g.hits }}/{{ g.count }}
          <span :class="$style.muted">{{ percent0(g.hits / g.count) }}</span></span
        >
        <span :class="$style.num">{{ formatProfit(g.plan) }}</span>
        <span :class="[$style.num, profitClass(g.estimate)]">{{ formatProfit(g.estimate) }}</span>
      </div>
    </template>
    <template v-else>
      <div :class="[$style.record, $style.head]">
        <span>{{ t('arblog.recordedAt') }}</span>
        <span>{{ t('arb.material') }}</span>
        <span>{{ t('arb.route') }}</span>
        <span>{{ t('arb.mode') }}</span>
        <span :class="$style.num">{{ t('arb.units') }}</span>
        <span :class="$style.num">{{ t('arblog.planProfit') }}</span>
        <span>{{ t('arblog.status') }}</span>
        <span :class="$style.num">{{ t('arblog.sellable') }}</span>
        <span :class="$style.num">{{ t('arblog.estimateProfit') }}</span>
        <span />
      </div>
      <div v-for="r in records" :key="r.id" :class="$style.record">
        <span :class="$style.muted">{{ time(r.at) }}</span>
        <span :class="$style.icon"><MaterialIcon size="inline-table" :ticker="r.ticker" /></span>
        <span>{{ cxLabel(r.from) }} <span :class="$style.muted">→</span> {{ cxLabel(r.to) }}</span>
        <span :class="$style.muted">{{ modeLabel(r.mode) }}</span>
        <span :class="$style.num">{{ fixed0(r.units) }}</span>
        <span :class="$style.num">{{ formatProfit(r.profit) }}</span>
        <span :class="r.check ? undefined : $style.muted">{{ stateOf(r) }}</span>
        <span :class="$style.num">{{ r.check ? fixed0(r.check.sellable) : '--' }}</span>
        <span :class="[$style.num, profitClass(r.check?.profit)]">{{
          r.check ? formatProfit(r.check.profit) : '--'
        }}</span>
        <span :class="$style.muted">{{ noteOf(r) }}</span>
      </div>
    </template>
  </div>
</template>

<style module>
.bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--rpz-space-2) var(--rpz-space-3);
  margin-bottom: var(--rpz-space-2);
}

.spacer {
  flex: 1;
}

.group,
.record {
  display: grid;
  gap: 0 var(--rpz-space-3);
  align-items: center;
  padding: var(--rpz-space-1) var(--rpz-space-2);
  border-top: 1px solid var(--rpz-stroke-weak);
}

.group {
  grid-template-columns: 56px 110px 50px 100px 100px 100px;
}

.record {
  grid-template-columns: 90px 56px 110px 50px 70px 90px 90px 70px 90px minmax(0, 1fr);
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
