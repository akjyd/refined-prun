<script setup lang="ts" generic="T extends string">
// A row of chips in the style of the game's radio items: a bar on top that lights up when the
// chip is on. With `multiple`, each chip turns on and off by itself.
const { options, multiple = false } = defineProps<{
  // `count` shows after the label, weak (tabs with a number of items).
  options: { value: T; label: string; count?: number; alert?: number }[];
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
      {{ o.label }}<span v-if="o.count !== undefined" :class="$style.count">{{ o.count }}</span
      ><span v-if="(o.alert ?? 0) > 0" :class="$style.alert">{{ o.alert }}</span>
    </span>
  </span>
</template>

<style module>
.chips {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 2px;
}

.alert {
  margin-left: var(--rpz-space-1);
  padding: 0 4px;
  background-color: var(--rpz-neg);
  color: var(--rpz-text);
  font-size: var(--rpz-fs-label);
  font-weight: bold;
}

.count {
  margin-left: var(--rpz-space-1);
  color: var(--rpz-text-weak);
}

.chip {
  position: relative;
  min-width: 36px;
  padding: 6px 7px 3px;
  background-color: var(--rpz-bg-raised);
  color: var(--rpz-text-weak);
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
  background-color: var(--rpz-bg-overlay);
  color: var(--rpz-text);
}

.chip:active {
  background-color: #343434;
}

.on {
  color: var(--rpz-text);
}

.on::before {
  background-color: var(--rpz-brand);
  box-shadow: 0 0 4px var(--rpz-brand);
}
</style>
