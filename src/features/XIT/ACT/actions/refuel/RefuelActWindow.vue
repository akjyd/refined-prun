<script setup lang="ts">
import ExecuteActionPackage from '@src/features/XIT/ACT/ExecuteActionPackage.vue';
import { allExchangesValue, allLocationsValue } from '@src/features/XIT/ACT/actions/refuel/utils';
import { useXitParameters } from '@src/hooks/use-xit-parameters';
import { reportHiddenRun } from '@src/features/XIT/ACT/hidden-act';
import { shipsStore } from '@src/infrastructure/prun-api/data/ships';
import { t } from '@src/i18n';

// XIT REFUELACT AUTO [run id]: refuel every docked ship from the storage at its location.
// XIT REFUELACT SHIP <registration> [run id]: refuel one ship the same way.
// Both modes run all steps without waiting for ACT clicks.
const parameters = useXitParameters();
const mode = parameters[0]?.toUpperCase();
const isShip = mode === 'SHIP';
const isAuto = mode === 'AUTO' || isShip;
const registration = isShip ? parameters[1] : undefined;
const runId = isShip ? parameters[2] : mode === 'AUTO' ? parameters[1] : undefined;
const ship = registration ? shipsStore.getByRegistration(registration) : undefined;

const pkg: UserData.ActionPackageData = {
  global: {
    name: isShip ? `Refuel ${registration}` : isAuto ? 'Refuel All Ships' : 'Refuel All Exchanges',
  },
  groups: [],
  actions: [
    {
      type: 'Refuel',
      name: 'Refuel',
      origin: isAuto ? allLocationsValue : allExchangesValue,
      buyMissingFuel: true,
      shipId: ship?.id,
    },
  ],
};

function onFinish(ok: boolean) {
  reportHiddenRun(runId, ok ? 'ok' : 'problem');
}

if (isShip && !ship) {
  onMounted(() => onFinish(false));
}
</script>

<template>
  <div v-if="isShip && !ship">{{ t('act.refuel.noShip', registration) }}</div>
  <ExecuteActionPackage v-else :pkg="pkg" :auto-act="isAuto" :on-finish="onFinish" />
</template>
