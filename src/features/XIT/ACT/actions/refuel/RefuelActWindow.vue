<script setup lang="ts">
import ExecuteActionPackage from '@src/features/XIT/ACT/ExecuteActionPackage.vue';
import { allExchangesValue, allLocationsValue } from '@src/features/XIT/ACT/actions/refuel/utils';
import { useXitParameters } from '@src/hooks/use-xit-parameters';

// XIT REFUELACT AUTO: refuel every docked ship from the storage at its location,
// and run all steps without waiting for ACT clicks.
const isAuto = useXitParameters()[0]?.toUpperCase() === 'AUTO';

const pkg: UserData.ActionPackageData = {
  global: { name: isAuto ? 'Refuel All Ships' : 'Refuel All Exchanges' },
  groups: [],
  actions: [
    {
      type: 'Refuel',
      name: 'Refuel',
      origin: isAuto ? allLocationsValue : allExchangesValue,
      buyMissingFuel: true,
    },
  ],
};
</script>

<template>
  <ExecuteActionPackage :pkg="pkg" :auto-act="isAuto" />
</template>
