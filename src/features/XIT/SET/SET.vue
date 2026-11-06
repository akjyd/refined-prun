<script setup lang="ts">
import { t } from '@src/i18n';
import { useXitParameters } from '@src/hooks/use-xit-parameters';
import Tabs, { Tab } from '@src/components/Tabs.vue';
import GAME from '@src/features/XIT/SET/GAME.vue';
import FEAT from '@src/features/XIT/SET/FEAT.vue';
import FIN from '@src/features/XIT/SET/FIN.vue';
import BFR from '@src/features/XIT/SET/BFR.vue';
import ACT from '@src/features/XIT/SET/ACT.vue';

const tabs: Tab[] = [
  {
    id: 'GAME',
    label: t('set.tab.gameplay'),
    component: GAME,
  },
  {
    id: 'FEAT',
    label: t('set.tab.features'),
    component: FEAT,
  },
  {
    id: 'FIN',
    label: t('set.tab.financial'),
    component: FIN,
  },
  {
    id: 'BFR',
    label: t('set.tab.buffers'),
    component: BFR,
  },
  {
    id: 'ACT',
    label: 'ACT',
    component: ACT,
  },
];

const parameters = useXitParameters();
const parameter = parameters[0];

const activeTab = shallowRef(tabs.find(x => x.id === parameter?.toUpperCase()) ?? tabs[0]);
</script>

<template>
  <Tabs v-model="activeTab" :tabs="tabs" />
</template>
