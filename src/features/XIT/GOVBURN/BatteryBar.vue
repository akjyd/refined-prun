<script setup lang="ts">
import type { Battery } from '@src/features/XIT/GOVBURN/summary';

// One cell is one consumption tick; lit cells are the ticks left.
const { battery, wide } = defineProps<{ battery?: Battery; wide?: boolean }>();

const $style = useCssModule();

const color = computed(() => {
  const filled = battery?.filled ?? 0;
  if (filled <= 0) {
    return $style.empty;
  }
  return filled <= 1 ? $style.low : $style.full;
});
</script>

<template>
  <span
    :class="[
      $style.battery,
      wide ? $style.wide : undefined,
      battery && battery.filled <= 0 ? $style.emptyBox : undefined,
    ]">
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

.emptyBox {
  border-color: #d9534f;
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
