<script setup lang="ts">
import type { Battery } from '@src/features/XIT/GOVBURN/summary';

// One cell is one consumption tick; lit cells are the ticks left.
const { battery, wide } = defineProps<{ battery?: Battery; wide?: boolean }>();

const $style = useCssModule();

// A one-cell battery (CoGC) is green when full. Otherwise the color comes from the days left:
// 5 days or less red, 10 days or less yellow, more green. Slots have different tick lengths,
// so the cell count alone does not tell how long the store lasts.
const color = computed(() => {
  if (battery?.cells === 1) {
    return $style.full;
  }
  const days = battery?.days;
  if (days === undefined) {
    const filled = battery?.filled ?? 0;
    return filled >= 3 ? $style.full : filled === 2 ? $style.low : $style.empty;
  }
  if (days <= 5) {
    return $style.empty;
  }
  return days <= 10 ? $style.low : $style.full;
});
</script>

<template>
  <span :class="[$style.battery, wide ? $style.wide : undefined]">
    <template v-if="battery">
      <span
        v-for="i in battery.cells"
        :key="i"
        :class="[$style.cell, i <= battery.filled ? color : undefined]" />
    </template>
    <span v-else :class="$style.unknown">--</span>
  </span>
</template>

<style module>
.battery {
  display: flex;
  gap: 2px;
  padding: 2px;
  border: 1px solid #555;
  min-width: 60px;
}

.wide {
  width: 82px;
}

.cell {
  flex: 1;
  height: 8px;
  background: #3a3a3a;
}

.wide .cell {
  height: 12px;
}

.full {
  background: #5cb85c;
}

.low {
  background: #f0ad4e;
}

.empty {
  background: #d9534f;
}

.unknown {
  flex: 1;
  text-align: center;
  font-size: 11px;
  color: #8c8c8c;
}
</style>
