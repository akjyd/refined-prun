<script setup lang="ts">
const {
  max = 100,
  min = 0,
  step = 1,
} = defineProps<{
  max?: number;
  min?: number;
  step?: number;
  onChange?: () => void;
  // The thin orange slider of the zh-cn windows (player, 2026-11-06), instead of the game's.
  ink?: boolean;
}>();

const model = defineModel<number>();
</script>

<template>
  <div>
    <input
      v-model="model"
      :class="[$style.input, ink ? $style.ink : undefined]"
      type="range"
      :min="min"
      :max="max"
      :step="step"
      @change="onChange" />
  </div>
</template>

<style module>
.input {
  appearance: none;
  -webkit-appearance: none;
  padding-top: 2px;
  width: 100%;
  background: transparent;
}

.input:focus {
  outline: none;
}

.input::-webkit-slider-runnable-track {
  width: 100%;
  height: 6px;
  cursor: pointer;
  background-color: #283743;
}

.input::-moz-range-track {
  width: 100%;
  height: 6px;
  cursor: pointer;
  background-color: #283743;
}

.input::-webkit-slider-thumb {
  margin-left: 0;
  margin-top: -4px;
  width: 14px;
  height: 14px;
  cursor: pointer;
  border-radius: 50%;
  border: solid 2px #fbd380;
  background-color: #262626;
  z-index: 2;
  appearance: none;
  -webkit-appearance: none;
}

.input::-moz-range-thumb {
  margin-left: 0;
  margin-top: -4px;
  width: 14px;
  height: 14px;
  cursor: pointer;
  border-radius: 50%;
  border: solid 2px #fbd380;
  background-color: #262626;
  z-index: 2;
  appearance: none;
  -webkit-appearance: none;
}

/* The zh-cn slider: a 3px track, the part you picked in brand color, a small square handle. */
.ink::-webkit-slider-runnable-track {
  height: 3px;
  background-color: #3a3a37;
}

.ink::-moz-range-track {
  height: 3px;
  background-color: #3a3a37;
}

.ink::-webkit-slider-thumb {
  width: 9px;
  height: 11px;
  margin-top: -4px;
  border: none;
  border-radius: 0;
  background-color: var(--rpz-brand);
}

.ink::-moz-range-thumb {
  width: 9px;
  height: 11px;
  margin-top: -4px;
  border: none;
  border-radius: 0;
  background-color: var(--rpz-brand);
}
</style>
