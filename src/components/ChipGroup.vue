<script setup lang="ts" generic="T extends string">
// A row of chips in the style of the game's radio items: a bar on top that lights up when the
// chip is on. With `multiple`, each chip turns on and off by itself.
const { options, multiple = false } = defineProps<{
  options: { value: T; label: string }[];
  multiple?: boolean;
}>();

const model = defineModel<T | T[]>({ required: true });

const $style = useCssModule();

function isOn(value: T) {
  return Array.isArray(model.value) ? model.value.includes(value) : model.value === value;
}

function pick(value: T) {
  if (!multiple) {
    model.value = value;
    return;
  }
  const list = Array.isArray(model.value) ? model.value : [];
  model.value = list.includes(value) ? list.filter(x => x !== value) : [...list, value];
}
</script>

<template>
  <span :class="$style.chips">
    <span
      v-for="o in options"
      :key="o.value"
      :class="[$style.chip, isOn(o.value) ? $style.on : undefined]"
      @click="pick(o.value)">
      {{ o.label }}
    </span>
  </span>
</template>

<style module>
.chips {
  display: inline-flex;
  gap: 2px;
}

.chip {
  position: relative;
  min-width: 36px;
  padding: 6px 7px 3px;
  background-color: #252525;
  color: #8c8c8c;
  text-align: center;
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
}

.chip::before {
  content: '';
  position: absolute;
  top: 2px;
  right: 3px;
  left: 3px;
  height: 2px;
  background-color: #444;
}

.chip:hover {
  background-color: #2e2e2e;
  color: #eee;
}

.chip:active {
  background-color: #343434;
}

.on {
  color: #eee;
}

.on::before {
  background-color: #f7a600;
  box-shadow: 0 0 4px #f7a600;
}
</style>
