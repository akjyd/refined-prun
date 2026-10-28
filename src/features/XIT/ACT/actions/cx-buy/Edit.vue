<script setup lang="ts">
import { t, tOptions } from '@src/i18n';
import Active from '@src/components/forms/Active.vue';
import Commands from '@src/components/forms/Commands.vue';
import PrunButton from '@src/components/PrunButton.vue';
import SelectInput from '@src/components/forms/SelectInput.vue';
import RadioItem from '@src/components/forms/RadioItem.vue';
import { showTileOverlay } from '@src/infrastructure/prun-ui/tile-overlay';
import EditPriceLimits from '@src/features/XIT/ACT/actions/cx-buy/EditPriceLimits.vue';
import { materialsStore } from '@src/infrastructure/prun-api/data/materials';
import { configurableValue } from '@src/features/XIT/ACT/shared-types';

const { action, pkg } = defineProps<{
  action: UserData.ActionData;
  pkg: UserData.ActionPackageData;
}>();

const materialGroups = computed(() => pkg.groups.map(x => x.name!).filter(x => x));
const materialGroup = ref(action.group ?? materialGroups.value[0]);

const exchanges = [configurableValue, 'AI1', 'CI1', 'IC1', 'NC1', 'CI2', 'NC2'];
const exchange = ref(action.exchange ?? exchanges[0]);

const priceLimits = ref(getPriceLimits());

function getPriceLimits() {
  const priceLimits = action.priceLimits ?? {};
  return Object.keys(priceLimits).map(x => [x, priceLimits[x]]) as [string, number][];
}

const buyPartial = ref(action.buyPartial ?? false);

const allowUnfilled = ref(action.allowUnfilled ?? false);
const useCXInv = ref(action.useCXInv ?? true);

function onEditPriceLimitsClick(e: Event) {
  showTileOverlay(e, EditPriceLimits, reactive({ priceLimits }));
}

function validate() {
  return true;
}

function save() {
  action.group = materialGroup.value;
  action.exchange = exchange.value;
  action.priceLimits = {};
  for (let [ticker, price] of priceLimits.value) {
    const material = materialsStore.getByTicker(ticker);
    if (!material || price === 0 || !isFinite(price)) {
      continue;
    }
    action.priceLimits[material.ticker] = price;
  }
  action.buyPartial = buyPartial.value;
  action.allowUnfilled = allowUnfilled.value;
  action.useCXInv = useCXInv.value;
}

defineExpose({ validate, save });
</script>

<template>
  <Active :label="t('act.f.group')">
    <SelectInput v-model="materialGroup" :options="materialGroups" />
  </Active>
  <Active :label="t('act.f.exchange')">
    <SelectInput v-model="exchange" :options="tOptions(exchanges)" />
  </Active>
  <Commands :label="t('act.cxbuy.priceLimits')">
    <PrunButton primary @click="onEditPriceLimitsClick">{{ t('act.f.edit') }}</PrunButton>
  </Commands>
  <Active :label="t('act.cxbuy.buyPartial')" :tooltip="t('act.cxbuy.buyPartialTip')">
    <RadioItem v-model="buyPartial">{{ t('act.cxbuy.buyPartialToggle') }}</RadioItem>
  </Active>
  <Active :label="t('act.cxbuy.allowUnfilled')" :tooltip="t('act.cxbuy.allowUnfilledTip')">
    <RadioItem v-model="allowUnfilled">{{ t('act.cxbuy.allowUnfilledToggle') }}</RadioItem>
  </Active>
  <Active :label="t('act.cxbuy.useCXInv')" :tooltip="t('act.cxbuy.useCXInvTip')">
    <RadioItem v-model="useCXInv">{{ t('act.cxbuy.useCXInvToggle') }}</RadioItem>
  </Active>
</template>
