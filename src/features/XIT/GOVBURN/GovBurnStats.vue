<script setup lang="ts">
import type { PlanetStats } from '@src/features/XIT/GOVBURN/summary';
import { TIERS } from '@src/core/population/engine';
import { fixed0, percent0 } from '@src/utils/format';
import { t } from '@src/i18n';

const { stats } = defineProps<{ stats: PlanetStats }>();

const $style = useCssModule();

type Key = Parameters<typeof t>[0];

interface Cell {
  value: string;
  delta: string;
  valueClass?: string;
  deltaClass?: string;
}

interface Row {
  label: string;
  cells: Cell[];
}

function delta(now: number, next: number, format: (x: number) => string) {
  const d = next - now;
  if (format(Math.abs(d)) === format(0)) {
    return '';
  }
  return (d > 0 ? '+' : '−') + format(Math.abs(d));
}

const percentPoints = (x: number) => fixed0(x * 100) + '%';

function trend(now: number, next: number) {
  if (next > now + 1e-9) {
    return C.ColoredValue.positive;
  }
  return next < now - 1e-9 ? C.ColoredValue.negative : undefined;
}

// Below 70% red, below 100% yellow, otherwise the normal color.
function needClass(value: number) {
  if (value < 0.7) {
    return C.ColoredValue.negative;
  }
  return value < 1 ? $style.warning : undefined;
}

// Tiers that have people in this or next week.
const tiers = computed(() =>
  TIERS.filter(x => stats.population[x].now > 0.5 || stats.population[x].next > 0.5),
);

const tierHead = computed(() => tiers.value.map(x => t(`gov.sum.tier.${x}` as Key)));
const needHead = ['SAFETY', 'HEALTH', 'COMFORT', 'CULTURE', 'EDUCATION'].map(x =>
  t(`gov.sum.need.${x}` as Key),
);

const tierRows = computed((): Row[] => [
  {
    label: t('gov.sum.population'),
    cells: tiers.value.map(x => {
      const p = stats.population[x];
      return {
        value: fixed0(p.now),
        delta: delta(p.now, p.next, fixed0),
        deltaClass: trend(p.now, p.next),
      };
    }),
  },
  {
    label: t('gov.sum.happiness'),
    cells: tiers.value.map(x => {
      const h = stats.happiness[x];
      return {
        value: percent0(h.now),
        delta: delta(h.now, h.next, percentPoints),
        deltaClass: trend(h.now, h.next),
      };
    }),
  },
]);

const needRow = computed(
  (): Row => ({
    label: t('gov.sum.needs'),
    cells: stats.needs.map(n => ({
      value: percent0(n.now),
      valueClass: needClass(n.now),
      delta: delta(n.now, n.next, percentPoints),
      deltaClass: trend(n.now, n.next),
    })),
  }),
);
</script>

<template>
  <div :class="$style.grid">
    <span :class="$style.head">{{ t('gov.sum.nowNext') }}</span>
    <span v-for="name in tierHead" :key="name" :class="[$style.head, $style.colHead]">
      {{ name }}
    </span>
    <span :class="$style.fill" />
    <template v-for="row in tierRows" :key="row.label">
      <span>{{ row.label }}</span>
      <template v-for="(cell, i) in row.cells" :key="i">
        <span :class="[$style.value, cell.valueClass]">{{ cell.value }}</span>
        <span :class="[$style.delta, cell.deltaClass]">{{ cell.delta }}</span>
      </template>
      <span :class="$style.fill" />
    </template>

    <span :class="[$style.head, $style.gap]" />
    <span v-for="name in needHead" :key="name" :class="[$style.head, $style.colHead, $style.gap]">
      {{ name }}
    </span>
    <span :class="$style.fill" />
    <span>{{ needRow.label }}</span>
    <template v-for="(cell, i) in needRow.cells" :key="i">
      <span :class="[$style.value, cell.valueClass]">{{ cell.value }}</span>
      <span :class="[$style.delta, cell.deltaClass]">{{ cell.delta }}</span>
    </template>
    <span :class="$style.fill" />
  </div>
</template>

<style module>
/* A label column, then five columns of value + change, so every number lines up. */
.grid {
  display: grid;
  grid-template-columns: 96px repeat(5, 64px 56px) minmax(0, 1fr);
  row-gap: 4px;
  align-items: baseline;
  font-size: 14px;
  font-variant-numeric: tabular-nums;
}

.head {
  color: #8c8c8c;
  font-size: 13px;
}

/* A column title spans the value and the change. */
.colHead {
  grid-column: span 2;
  text-align: center;
}

.gap {
  padding-top: 8px;
}

.fill {
  grid-column: -2 / -1;
}

.value {
  text-align: right;
}

.delta {
  padding-left: 6px;
  font-size: 13px;
}

.warning {
  color: #f0ad4e;
}
</style>
