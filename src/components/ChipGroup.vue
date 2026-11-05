<script setup lang="ts" generic="T extends string">
import RadioGroupContainer from '@src/components/RadioGroupContainer.vue';
import RadioItem from '@src/components/forms/RadioItem.vue';

// A row of the game's radio items. With `multiple`, each item turns on and off by itself.
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
  <div :class="$style.chips">
    <RadioGroupContainer horizontal>
      <RadioItem
        v-for="o in options"
        :key="o.value"
        horizontal
        :model-value="isOn(o.value)"
        @update:model-value="pick(o.value)">
        {{ o.label }}
      </RadioItem>
    </RadioGroupContainer>
  </div>
</template>

<style module>
.chips > div > div {
  cursor: pointer;
}

.chips > div > div:hover {
  background-color: rgba(255, 255, 255, 0.06);
}

.chips > div > div:active {
  background-color: rgba(255, 255, 255, 0.1);
}
</style>
