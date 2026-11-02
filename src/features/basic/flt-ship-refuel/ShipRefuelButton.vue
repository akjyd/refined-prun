<script setup lang="ts">
import PrunButton from '@src/components/PrunButton.vue';
import { shipsStore } from '@src/infrastructure/prun-api/data/ships';
import { isHiddenRunning, runHidden } from '@src/features/XIT/ACT/hidden-act';
import { t } from '@src/i18n';

const { id } = defineProps<{ id?: string | null }>();

const ship = computed(() => shipsStore.getById(id));
const key = computed(() => `refuel ${ship.value?.registration}`);
const running = computed(() => isHiddenRunning(key.value));

function onClick() {
  if (!ship.value || running.value) {
    return;
  }
  void runHidden(key.value, `XIT REFUELACT SHIP ${ship.value.registration}`);
}
</script>

<template>
  <PrunButton v-if="ship" primary inline :disabled="running" @click="onClick">
    {{ running ? t('flt.refueling') : t('flt.refuelShip') }}
  </PrunButton>
</template>
