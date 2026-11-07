<script setup lang="ts">
import ExecuteActionPackage from '@src/features/XIT/ACT/ExecuteActionPackage.vue';
import { useXitParameters } from '@src/hooks/use-xit-parameters';
import { useMinBufferHeight } from '@src/hooks/use-min-buffer-height';
import { planResupply, ResupplyMaterial, Space } from '@src/core/ship-resupply';
import { getPlanetBurn } from '@src/core/burn';
import { getBaseStore } from '@src/core/store-id';
import { shipsStore } from '@src/infrastructure/prun-api/data/ships';
import { storagesStore } from '@src/infrastructure/prun-api/data/storage';
import { warehousesStore } from '@src/infrastructure/prun-api/data/warehouses';
import { sitesStore } from '@src/infrastructure/prun-api/data/sites';
import { getLocationLineFromAddress } from '@src/infrastructure/prun-api/data/addresses';
import { materialsStore } from '@src/infrastructure/prun-api/data/materials';
import { userData } from '@src/store/user-data';
import { fixed0 } from '@src/utils/format';
import { t } from '@src/i18n';

// One click on a docked ship: the supplies it carries go down to the base, the goods the base
// has made come up (player, 2026-11-07). The window shows what it would move, then runs it as
// an action package, because every transfer in the game asks for a confirmation.

const parameters = useXitParameters();
const registration = parameters.join(' ');

useMinBufferHeight();

const ship = computed(() => shipsStore.getByRegistration(registration));

const place = computed(() =>
  ship.value && ship.value.flightId === null
    ? getLocationLineFromAddress(ship.value.address)?.entity.naturalId
    : undefined,
);

const site = computed(() => sitesStore.getByPlanetNaturalIdOrName(place.value));
const baseStore = computed(() => getBaseStore(place.value));
const warehouseStore = computed(() =>
  storagesStore.getById(warehousesStore.getByEntityNaturalId(place.value)?.storeId),
);
const shipStore = computed(() =>
  storagesStore.getByAddressableId(ship.value?.id)?.find(x => x.type === 'SHIP_STORE'),
);

function space(store?: PrunApi.Store): Space | undefined {
  return store
    ? {
        weight: store.weightCapacity - store.weightLoad,
        volume: store.volumeCapacity - store.volumeLoad,
      }
    : undefined;
}

function held(store?: PrunApi.Store) {
  const result: Record<string, number> = {};
  for (const item of store?.items ?? []) {
    const quantity = item.quantity;
    if (quantity) {
      result[quantity.material.ticker] = (result[quantity.material.ticker] ?? 0) + quantity.amount;
    }
  }
  return result;
}

const plan = computed(() => {
  const burn = getPlanetBurn(site.value)?.burn;
  const shipSpace = space(shipStore.value);
  const baseSpace = space(baseStore.value);
  if (!burn || !shipSpace || !baseSpace) {
    return undefined;
  }
  const sizes: Record<string, ResupplyMaterial> = {};
  for (const material of materialsStore.all.value ?? []) {
    sizes[material.ticker] = {
      ticker: material.ticker,
      weight: material.weight,
      volume: material.volume,
    };
  }
  const days = userData.settings.burn.shipSupplyDays?.[place.value ?? ''];
  return planResupply({
    burn,
    onShip: held(shipStore.value),
    sizes,
    // Null is the default: everything the ship carries goes down.
    supplyDays: days ?? undefined,
    intermediateDays: userData.settings.burn.intermediateDays ?? 5,
    baseSpace,
    warehouseSpace: space(warehouseStore.value),
    shipSpace,
  });
});

interface Move {
  name: string;
  bill: Record<string, number>;
  origin?: string;
  dest?: string;
}

const moves = computed<Move[]>(() => {
  const p = plan.value;
  const shipId = shipStore.value?.id;
  const baseId = baseStore.value?.id;
  if (!p || !shipId || !baseId) {
    return [];
  }
  const list: Move[] = [
    { name: t('resup.toBase'), bill: p.toBase, origin: shipId, dest: baseId },
    {
      name: t('resup.toWarehouse'),
      bill: p.toWarehouse,
      origin: shipId,
      dest: warehouseStore.value?.id,
    },
    { name: t('resup.toShip'), bill: p.toShip, origin: baseId, dest: shipId },
  ];
  return list.filter(x => Object.keys(x.bill).length > 0 && x.dest !== undefined);
});

const pkg = computed(
  () =>
    ({
      global: { name: 'Resupply' },
      groups: moves.value.map(move => ({
        type: 'Manual',
        name: move.name,
        materials: move.bill,
      })),
      actions: moves.value.map(move => ({
        type: 'MTRA' as UserData.ActionType,
        name: move.name,
        group: move.name,
        origin: move.origin,
        dest: move.dest,
      })),
    }) as UserData.ActionPackageData,
);

function line(bill: Record<string, number>) {
  return Object.entries(bill)
    .map(([ticker, amount]) => `${ticker} ${fixed0(amount)}`)
    .join('  ');
}
</script>

<template>
  <div v-if="!ship">{{ t('resup.noShip', registration) }}</div>
  <div v-else-if="!place || !baseStore">{{ t('resup.noBase') }}</div>
  <div v-else>
    <div :class="$style.list">
      <div v-for="move in moves" :key="move.name" :class="$style.move">
        <span :class="$style.label">{{ move.name }}</span>
        <span>{{ line(move.bill) }}</span>
      </div>
      <p v-if="moves.length === 0" :class="$style.label">{{ t('resup.nothing') }}</p>
      <p v-if="plan?.baseFull" :class="$style.warn">{{ t('resup.baseFull') }}</p>
      <p v-if="plan?.shipFull" :class="$style.warn">{{ t('resup.shipFull') }}</p>
    </div>
    <ExecuteActionPackage v-if="moves.length > 0" :pkg="pkg" />
  </div>
</template>

<style module>
.list {
  display: grid;
  gap: var(--rpz-space-1);
  padding: var(--rpz-space-2);
  font-size: var(--rpz-fs-body);
}

.move {
  display: grid;
  grid-template-columns: 90px minmax(0, 1fr);
  gap: var(--rpz-space-2);
  color: var(--rpz-text);
}

.label {
  color: var(--rpz-text-weak);
}

.warn {
  margin: 0;
  color: var(--rpz-neg);
}
</style>
