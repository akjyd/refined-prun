<script setup lang="ts">
import { t, tOptions } from '@src/i18n';
import Active from '@src/components/forms/Active.vue';
import SelectInput from '@src/components/forms/SelectInput.vue';
import NumericInput from '@src/components/forms/NumericInput.vue';
import RadioItem from '@src/components/forms/RadioItem.vue';
import { configurableValue, groupTargetPrefix } from '@src/features/XIT/ACT/shared-types';
import { useContLocations } from '@src/features/XIT/ACT/actions/cont-locations';
import { balancesStore } from '@src/infrastructure/prun-api/data/balances';
import { maxContractDays, minContractDays } from '@src/features/XIT/ACT/actions/cont-limits';

const { action, pkg } = defineProps<{
  action: UserData.ActionData;
  pkg: UserData.ActionPackageData;
}>();

const materialGroups = computed(() => pkg.groups.map(x => x.name!).filter(x => x));
const materialGroup = ref(action.group ?? materialGroups.value[0]);

const staticLocations = useContLocations();

// A group with no planet resolves to nothing at run time, so it is not offered.
const groupTargetOptions = computed(() =>
  pkg.groups
    .filter(x => x.name && x.planet)
    .map(x => ({
      label: t('act.f.groupTarget', x.name!),
      value: `${groupTargetPrefix}${x.name}`,
    })),
);

const locationOptions = computed(() => [
  configurableValue,
  ...groupTargetOptions.value,
  ...staticLocations.value,
]);

const currencies = computed(() => balancesStore.currencies.value ?? []);

const contOrigin = ref(action.contOrigin ?? staticLocations.value[0] ?? '');
const contDest = ref(action.contDest ?? staticLocations.value[0] ?? '');
const currency = ref(action.currency ?? 'AIC');
const paymentPerTon = ref(action.paymentPerTon ?? 0);
const daysToFulfill = ref(action.daysToFulfill ?? 3);
const autoProvision = ref(action.autoProvision ?? false);

function validate() {
  if (!materialGroup.value) {
    return false;
  }
  // A location saved before the player abandoned that base is no longer selectable.
  const locations = locationOptions.value.map(x => (typeof x === 'string' ? x : x.value));
  if (!locations.includes(contOrigin.value) || !locations.includes(contDest.value)) {
    return false;
  }
  const days = Number(daysToFulfill.value);
  if (!Number.isInteger(days) || days < minContractDays || days > maxContractDays) {
    return false;
  }
  const payment = Number(paymentPerTon.value);
  if (String(paymentPerTon.value).trim() === '' || !Number.isFinite(payment) || payment < 0) {
    return false;
  }
  return true;
}

function save() {
  action.group = materialGroup.value;
  action.contOrigin = contOrigin.value;
  action.contDest = contDest.value;
  action.currency = currency.value;
  action.paymentPerTon = Number(paymentPerTon.value);
  action.daysToFulfill = Number(daysToFulfill.value);
  action.autoProvision = autoProvision.value;
  delete action.contractNote;
}

defineExpose({ validate, save });
</script>

<template>
  <Active :label="t('act.f.group')">
    <SelectInput v-model="materialGroup" :options="materialGroups" />
  </Active>

  <Active :label="t('act.f.origin')">
    <SelectInput v-model="contOrigin" :options="tOptions(locationOptions)" />
  </Active>

  <Active :label="t('act.f.destination')">
    <SelectInput v-model="contDest" :options="tOptions(locationOptions)" />
  </Active>

  <Active :label="t('act.f.currency')">
    <SelectInput v-model="currency" :options="currencies" />
  </Active>

  <Active :label="t('act.cship.payPerTon')">
    <NumericInput v-model="paymentPerTon" :min="0" :step="1" placeholder="0" />
  </Active>

  <Active :label="t('act.f.daysToFulfill')">
    <NumericInput v-model="daysToFulfill" :min="minContractDays" :max="maxContractDays" :step="1" />
  </Active>

  <Active :label="t('act.cship.autoProvision')">
    <RadioItem v-model="autoProvision">{{ t('act.cship.autoProvisionToggle') }}</RadioItem>
  </Active>
</template>
