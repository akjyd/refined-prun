<script setup lang="ts">
import {
  chosenPlanet,
  isRaw,
  pickPlanet,
  planetName,
  planetOptions,
} from '@src/core/daily-profit/order-profit';

// Shows and picks the extraction planet behind the daily profit of a raw material on one
// exchange. Shows nothing for made materials or when no planet is watched.
const { ticker, exchange } = defineProps<{ ticker: string; exchange: string }>();

const $style = useCssModule();

const options = computed(() => (isRaw(ticker) ? planetOptions(ticker) : []));
const value = computed(() => chosenPlanet(ticker, exchange));

function onChange(e: Event) {
  pickPlanet(ticker, exchange, (e.target as HTMLSelectElement).value);
}
</script>

<template>
  <select
    v-if="options.length > 0"
    :class="$style.select"
    :value="value ?? ''"
    @click.stop
    @mousedown.stop
    @change="onChange">
    <option value="">--</option>
    <option v-for="id in options" :key="id" :value="id">{{ planetName(id) }}</option>
  </select>
</template>

<style module>
.select {
  max-width: 110px;
  padding: 0 2px;
  border: 1px solid #3a3a3a;
  background-color: #252525;
  color: #f7a600;
  font: inherit;
  font-size: 11px;
}
</style>
