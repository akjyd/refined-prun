<script setup lang="ts">
import ExecuteActionPackage from '@src/features/XIT/ACT/ExecuteActionPackage.vue';
import { reportHiddenRun } from '@src/features/XIT/ACT/hidden-act';
import { useXitParameters } from '@src/hooks/use-xit-parameters';
import { userData } from '@src/store/user-data';
import { comparePlanets } from '@src/util';

// XIT GOVBURNMAINT <planet | ALL> [run id]: maintain from the planet warehouses,
// pressing ACT for every step.
const parameters = useXitParameters();
const target = parameters[0] ?? 'ALL';
const runId = parameters[1];

const planets =
  target.toUpperCase() === 'ALL'
    ? Object.keys(userData.govburn.config.planets).sort(comparePlanets)
    : [target];

const pkg: UserData.ActionPackageData = {
  global: { name: `GovBurn Maintain ${target}` },
  groups: [],
  actions: planets.map(naturalId => ({
    type: 'GovBurn Maintain',
    name: `Maintain ${naturalId}`,
    planet: naturalId,
  })),
};

function onFinish(ok: boolean) {
  reportHiddenRun(runId, ok ? 'ok' : 'problem');
}
</script>

<template>
  <ExecuteActionPackage :pkg="pkg" auto-act :on-finish="onFinish" />
</template>
