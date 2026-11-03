<script setup lang="ts">
import type { Battery } from '@src/features/XIT/GOVBURN/summary';

// One cell is one consumption tick; lit cells are the ticks left.
const { battery, wide } = defineProps<{ battery?: Battery; wide?: boolean }>();

const $style = useCssModule();

// A one-cell battery (CoGC) is green when full. Otherwise 3 or more cells are green,
// 2 cells yellow and 1 cell red.
const color = computed(() => {
  const filled = battery?.filled ?? 0;
  if (battery?.cells === 1 || filled >= 3) {
    return $style.full;
  }
  return filled === 2 ? $style.low : $style.empty;
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
