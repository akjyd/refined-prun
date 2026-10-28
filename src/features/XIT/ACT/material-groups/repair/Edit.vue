<script setup lang="ts">
import { t, tOptions } from '@src/i18n';
import Active from '@src/components/forms/Active.vue';
import { sitesStore } from '@src/infrastructure/prun-api/data/sites';
import { getEntityNameFromAddress } from '@src/infrastructure/prun-api/data/addresses';
import SelectInput from '@src/components/forms/SelectInput.vue';
import NumberInput from '@src/components/forms/NumberInput.vue';
import { comparePlanets } from '@src/util';
import { configurableValue } from '@src/features/XIT/ACT/shared-types';

const { group } = defineProps<{ group: UserData.MaterialGroupData }>();

const planets = computed(() => {
  const planets = (sitesStore.all.value ?? [])
    .map(x => getEntityNameFromAddress(x.address))
    .filter(x => x !== undefined)
    .sort(comparePlanets);
  planets.unshift(configurableValue);
  return planets;
});

const planet = ref(group.planet ?? planets.value[0]);
const planetError = ref(false);

const days = ref(typeof group.days === 'string' ? parseInt(group.days || '0') : group.days);

const advanceDays = ref(
  typeof group.advanceDays === 'string'
    ? parseInt(group.advanceDays || '0')
    : (group.advanceDays ?? 0),
);
const advanceDaysError = ref(false);

function validate() {
  let isValid = true;
  planetError.value = !planet.value;
  isValid &&= !planetError.value;
  advanceDaysError.value = advanceDays.value < 0;
  isValid &&= !advanceDaysError.value;
  return isValid;
}

function save() {
  group.planet = planet.value;
  group.days = days.value;
  group.advanceDays = advanceDays.value;
}

defineExpose({ validate, save });
</script>

<template>
  <Active :label="t('act.f.planet')" :error="planetError">
    <SelectInput v-model="planet" :options="tOptions(planets)" />
  </Active>
  <Active :label="t('act.repair.threshold')" :tooltip="t('act.repair.thresholdTipEdit')">
    <NumberInput v-model="days" optional float />
  </Active>
  <Active
    :label="t('act.repair.offset')"
    :tooltip="t('act.repair.offsetTip')"
    :error="advanceDaysError">
    <NumberInput v-model="advanceDays" float />
  </Active>
</template>
