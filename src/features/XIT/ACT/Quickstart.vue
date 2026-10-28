<script setup lang="ts">
import { t } from '@src/i18n';
import PrunButton from '@src/components/PrunButton.vue';
import SectionHeader from '@src/components/SectionHeader.vue';
import SectionDescription from '@src/components/SectionDescription.vue';
import Active from '@src/components/forms/Active.vue';
import TextInput from '@src/components/forms/TextInput.vue';
import Commands from '@src/components/forms/Commands.vue';
import { userData } from '@src/store/user-data';
import { showBuffer } from '@src/infrastructure/prun-ui/buffers';
import NumberInput from '@src/components/forms/NumberInput.vue';
import { sitesStore } from '@src/infrastructure/prun-api/data/sites';
import {
  getEntityNameFromAddress,
  getEntityNaturalIdFromAddress,
  getLocationLineFromAddress,
} from '@src/infrastructure/prun-api/data/addresses';
import { comparePlanets } from '@src/util';
import SelectInput from '@src/components/forms/SelectInput.vue';
import { warehousesStore } from '@src/infrastructure/prun-api/data/warehouses';
import { configurableValue } from '@src/features/XIT/ACT/shared-types';
import { storagesStore } from '@src/infrastructure/prun-api/data/storage';
import { serializeStorage } from '@src/features/XIT/ACT/actions/utils';

const emit = defineEmits<{ (e: 'close'): void }>();

const days = ref(userData.settings.burn.resupply);
const name = ref(`Base Resupply ${days.value}d`);
const planets = computed(() =>
  (sitesStore.all.value ?? [])
    .map(x => getEntityNameFromAddress(x.address))
    .filter(x => x !== undefined)
    .sort(comparePlanets),
);
const planet = ref(planets.value[0]);

const cxes = computed(
  () =>
    warehousesStore.all.value
      ?.filter(x => getLocationLineFromAddress(x.address)?.type === 'STATION')
      .map(x => ({
        label: getEntityNameFromAddress(x.address)!,
        value: getEntityNaturalIdFromAddress(x.address)!,
      }))
      .sort((a, b) => a.label.localeCompare(b.label)) ?? [],
);
const cx = ref(cxes.value[0].value);

function onCreateClick() {
  if (name.value.length === 0) {
    return;
  }
  const warehouse = warehousesStore.getByEntityNaturalId(cx.value);
  const storage = storagesStore.getById(warehouse!.storeId)!;
  const cxTicker = ExchangeTickers[cx.value];
  userData.actionPackages.push({
    global: { name: name.value },
    groups: [
      {
        name: 'Resupply',
        type: 'Resupply',
        planet: planet.value,
        days: days.value,
        useBaseInv: true,
      },
    ],
    actions: [
      {
        name: 'Buy Missing Materials',
        type: 'CX Buy',
        group: 'Resupply',
        exchange: cxTicker,
        useCXInv: true,
      },
      {
        name: 'Select your ship in the "To" field ↓',
        type: 'MTRA',
        group: 'Resupply',
        origin: serializeStorage(storage),
        dest: configurableValue,
      },
    ],
  });
  showBuffer('XIT ACT_' + name.value.split(' ').join('_'));
  emit('close');
}

const ExchangeTickers = {
  ANT: 'AI1',
  BEN: 'CI1',
  MOR: 'NC1',
  HRT: 'IC1',
  HUB: 'NC2',
  ARC: 'CI2',
};
</script>

<template>
  <div :class="C.DraftConditionEditor.form">
    <SectionHeader>{{ t('act.quick.title') }}</SectionHeader>
    <SectionDescription>
      {{ t('act.quick.desc1') }}
      <br />
      {{ t('act.quick.desc2') }}
      <br />
      {{ t('act.quick.desc3') }}
      <br />
      <mark>{{ t('act.quick.note') }}</mark>
    </SectionDescription>
    <form>
      <Active :label="t('act.common.name')">
        <TextInput v-model="name" />
      </Active>
      <Active :label="t('act.quick.cx')">
        <SelectInput v-model="cx" :options="cxes" />
      </Active>
      <Active :label="t('act.quick.planet')">
        <SelectInput v-model="planet" :options="planets" />
      </Active>
      <Active :label="t('act.quick.days')">
        <NumberInput v-model="days" float />
      </Active>
      <Commands>
        <PrunButton primary @click="onCreateClick">{{ t('act.common.create') }}</PrunButton>
      </Commands>
    </form>
  </div>
</template>
