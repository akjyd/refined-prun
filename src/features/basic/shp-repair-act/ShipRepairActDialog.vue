<script setup lang="ts">
import { t } from '@src/i18n';
import PrunButton from '@src/components/PrunButton.vue';
import SectionHeader from '@src/components/SectionHeader.vue';
import Active from '@src/components/forms/Active.vue';
import Passive from '@src/components/forms/Passive.vue';
import RadioItem from '@src/components/forms/RadioItem.vue';
import SelectInput from '@src/components/forms/SelectInput.vue';
import Commands from '@src/components/forms/Commands.vue';
import { shipsStore } from '@src/infrastructure/prun-api/data/ships';
import { storagesStore } from '@src/infrastructure/prun-api/data/storage';
import { exchangesStore } from '@src/infrastructure/prun-api/data/exchanges';
import { warehousesStore } from '@src/infrastructure/prun-api/data/warehouses';
import { getLocationLineFromAddress } from '@src/infrastructure/prun-api/data/addresses';
import { atSameLocation, serializeStorage } from '@src/features/XIT/ACT/actions/utils';
import { configurableValue } from '@src/features/XIT/ACT/shared-types';
import { isValidPackageName } from '@src/features/XIT/ACT/utils';
import { showBuffer } from '@src/infrastructure/prun-ui/buffers';
import { userData } from '@src/store/user-data';
import { fixed0 } from '@src/utils/format';

const { registration } = defineProps<{ registration: string }>();

const emit = defineEmits<{ (e: 'close'): void }>();

const ship = computed(() => shipsStore.getByRegistration(registration));
const cargo = computed(() => storagesStore.getById(ship.value?.idShipStore));

interface ExchangeOption {
  code: string;
  warehouse: PrunApi.Store;
}

// A CX Buy needs a warehouse at the exchange, so list only exchanges with one.
const exchangeOptions = computed(() => {
  const result: ExchangeOption[] = [];
  for (const exchange of exchangesStore.all.value ?? []) {
    const naturalId = exchangesStore.getNaturalIdFromCode(exchange.code);
    const warehouse = warehousesStore.getByEntityNaturalId(naturalId);
    const store = storagesStore.getById(warehouse?.storeId);
    if (store) {
      result.push({ code: exchange.code, warehouse: store });
    }
  }
  return result.sort((a, b) => a.code.localeCompare(b.code));
});

// Prefer the exchange where the ship is docked.
function getDefaultExchange() {
  const docked = exchangeOptions.value.find(
    x => cargo.value && ship.value?.flightId === null && atSameLocation(x.warehouse, cargo.value),
  );
  return (docked ?? exchangeOptions.value[0])?.code;
}

const exchange = ref(getDefaultExchange());
const useShipInv = ref(true);

const selected = computed(() => exchangeOptions.value.find(x => x.code === exchange.value));

const materials = computed(() => {
  const result: Record<string, number> = {};
  if (!ship.value) {
    return result;
  }
  for (const { material, amount } of ship.value.repairMaterials) {
    let need = amount;
    if (useShipInv.value) {
      const inCargo = cargo.value?.items.find(x => x.quantity?.material.ticker === material.ticker);
      need -= inCargo?.quantity?.amount ?? 0;
    }
    if (need > 0) {
      result[material.ticker] = (result[material.ticker] ?? 0) + need;
    }
  }
  return result;
});

const materialsText = computed(() => {
  const parts = Object.entries(materials.value).map(([ticker, n]) => `${fixed0(n)} ${ticker}`);
  return parts.length > 0 ? parts.join(', ') : t('shipRepair.nothing');
});

// Transfer straight into this ship when it is docked at the exchange.
const destination = computed(() => {
  const warehouse = selected.value?.warehouse;
  const isDockedHere =
    cargo.value &&
    warehouse &&
    ship.value?.flightId === null &&
    atSameLocation(warehouse, cargo.value);
  return isDockedHere ? serializeStorage(cargo.value!) : configurableValue;
});

const packageName = computed(() => {
  const name = `Repair ${registration}`;
  return isValidPackageName(name) ? name : 'Ship Repair';
});

const canGenerate = computed(
  () => selected.value !== undefined && Object.keys(materials.value).length > 0,
);

function onGenerateClick() {
  if (!canGenerate.value) {
    return;
  }
  const groupName = 'Repair';
  const pkg: UserData.ActionPackageData = {
    global: { name: packageName.value },
    groups: [{ type: 'Manual', name: groupName, materials: { ...materials.value } }],
    actions: [
      {
        type: 'CX Buy',
        name: 'CX Buy',
        group: groupName,
        exchange: selected.value!.code,
        buyPartial: false,
        allowUnfilled: false,
        useCXInv: true,
      },
      {
        type: 'MTRA',
        name: 'Transfer to Ship',
        group: groupName,
        origin: serializeStorage(selected.value!.warehouse),
        dest: destination.value,
      },
    ],
  };
  const index = userData.actionPackages.findIndex(x => x.global.name === pkg.global.name);
  if (index >= 0) {
    userData.actionPackages[index] = pkg;
  } else {
    userData.actionPackages.push(pkg);
  }
  showBuffer(`XIT ACT_${pkg.global.name.split(' ').join('_')}`);
  emit('close');
}

const locationName = computed(() =>
  ship.value?.flightId === null
    ? getLocationLineFromAddress(ship.value.address)?.entity.name
    : undefined,
);
</script>

<template>
  <div :class="C.DraftConditionEditor.form">
    <SectionHeader>{{ t('shipRepair.title') }}</SectionHeader>
    <div v-if="!ship">{{ t('shipRepair.noShip') }}</div>
    <form v-else @submit.prevent>
      <Passive :label="t('shipRepair.ship')">
        <span>{{ ship.name ?? ship.registration }}</span>
      </Passive>
      <Passive v-if="locationName" :label="t('shipRepair.location')">
        <span>{{ locationName }}</span>
      </Passive>
      <Active :label="t('shipRepair.exchange')">
        <SelectInput
          v-if="exchangeOptions.length > 0"
          v-model="exchange"
          :options="exchangeOptions.map(x => x.code)" />
        <span v-else>{{ t('shipRepair.noWarehouse') }}</span>
      </Active>
      <Active :label="t('shipRepair.useShipInv')" :tooltip="t('shipRepair.useShipInvTip')">
        <RadioItem v-model="useShipInv">{{ t('shipRepair.useShipInvToggle') }}</RadioItem>
      </Active>
      <Passive :label="t('shipRepair.materials')">
        <span>{{ materialsText }}</span>
      </Passive>
      <Passive :label="t('shipRepair.transferTo')">
        <span>{{
          destination === configurableValue ? t('shipRepair.chooseShip') : destination
        }}</span>
      </Passive>
      <Commands>
        <PrunButton primary :disabled="!canGenerate" @click="onGenerateClick">
          {{ t('shipRepair.generate') }}
        </PrunButton>
      </Commands>
    </form>
  </div>
</template>
