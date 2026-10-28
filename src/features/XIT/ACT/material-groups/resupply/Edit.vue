<script setup lang="ts">
import { t, tOptions } from '@src/i18n';
import Active from '@src/components/forms/Active.vue';
import { sitesStore } from '@src/infrastructure/prun-api/data/sites';
import { getEntityNameFromAddress } from '@src/infrastructure/prun-api/data/addresses';
import SelectInput from '@src/components/forms/SelectInput.vue';
import NumberInput from '@src/components/forms/NumberInput.vue';
import { comparePlanets } from '@src/util';
import TextInput from '@src/components/forms/TextInput.vue';
import RadioItem from '@src/components/forms/RadioItem.vue';
import { materialsStore } from '@src/infrastructure/prun-api/data/materials';
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

const configureDaysOnExecution = ref(group.days === configurableValue);
const days = ref(
  typeof group.days === 'string' && group.days !== configurableValue
    ? parseInt(group.days || '10')
    : typeof group.days === 'number'
      ? group.days
      : 10,
);
const daysError = ref(false);

const exclusions = ref(group.exclusions?.join(', ') ?? '');

const useBaseInventory = ref(group.useBaseInv ?? true);

const workforceOnly = ref(group.consumablesOnly ?? false);

function validate() {
  let isValid = true;
  planetError.value = !planet.value;
  isValid &&= !planetError.value;
  daysError.value = !configureDaysOnExecution.value && days.value <= 0;
  isValid &&= !daysError.value;
  return isValid;
}

function save() {
  group.planet = planet.value;
  group.days = configureDaysOnExecution.value ? configurableValue : days.value;
  group.exclusions = exclusions.value
    .split(',')
    .map(x => materialsStore.getByTicker(x.trim())?.ticker)
    .filter(x => x !== undefined);
  group.useBaseInv = useBaseInventory.value;
  group.consumablesOnly = workforceOnly.value;
}

defineExpose({ validate, save });
</script>

<template>
  <Active :label="t('act.f.planet')" :error="planetError">
    <SelectInput v-model="planet" :options="tOptions(planets)" />
  </Active>
  <Active :label="t('act.resupply.days')" :tooltip="t('act.resupply.daysTip')" :error="daysError">
    <NumberInput v-if="!configureDaysOnExecution" v-model="days" float />
    <RadioItem v-model="configureDaysOnExecution">{{
      t('act.resupply.configureOnExec')
    }}</RadioItem>
  </Active>
  <Active :label="t('act.resupply.exclusions')" :tooltip="t('act.resupply.exclusionsTip')">
    <TextInput v-model="exclusions" />
  </Active>
  <Active :label="t('act.resupply.useBaseInv')" :tooltip="t('act.resupply.useBaseInvTip')">
    <RadioItem v-model="useBaseInventory">{{ t('act.resupply.useBaseInvToggle') }}</RadioItem>
  </Active>
  <Active :label="t('act.resupply.wfOnly')" :tooltip="t('act.resupply.wfOnlyTip')">
    <RadioItem v-model="workforceOnly">{{ t('act.resupply.wfOnlyToggle') }}</RadioItem>
  </Active>
</template>
