<script setup lang="ts">
import RadioItem from '@src/components/forms/RadioItem.vue';
import { filterableStatuses, statusLabel } from '@src/features/XIT/contract-overview/utils';

const model = defineModel<PrunApi.ContractStatus[]>({ required: true });

function isActive(status: PrunApi.ContractStatus) {
  return model.value.includes(status);
}

function setActive(status: PrunApi.ContractStatus, active: boolean) {
  const rest = model.value.filter(x => x !== status);
  model.value = active ? [...rest, status] : rest;
}
</script>

<template>
  <div :class="C.ComExOrdersPanel.filter">
    <RadioItem
      v-for="status in filterableStatuses"
      :key="status"
      :model-value="isActive(status)"
      horizontal
      @update:model-value="v => setActive(status, v)">
      {{ statusLabel(status) }}
    </RadioItem>
  </div>
</template>
