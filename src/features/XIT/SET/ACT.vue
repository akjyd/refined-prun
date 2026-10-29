<script setup lang="ts">
import { t } from '@src/i18n';
import { userData } from '@src/store/user-data';
import { materialsStore } from '@src/infrastructure/prun-api/data/materials';
import SectionHeader from '@src/components/SectionHeader.vue';
import Active from '@src/components/forms/Active.vue';
import Passive from '@src/components/forms/Passive.vue';
import TextInput from '@src/components/forms/TextInput.vue';
import Commands from '@src/components/forms/Commands.vue';
import PrunButton from '@src/components/PrunButton.vue';

const input = ref('');
const inputError = ref(false);

function add() {
  const tickers = input.value
    .split(',')
    .map(x => materialsStore.getByTicker(x.trim())?.ticker)
    .filter(x => x !== undefined);

  if (tickers.length === 0) {
    inputError.value = true;
    return;
  }

  inputError.value = false;
  for (const ticker of tickers) {
    if (!userData.settings.noBuy.includes(ticker)) {
      userData.settings.noBuy.push(ticker);
    }
  }
  input.value = '';
}

function remove(ticker: string) {
  const i = userData.settings.noBuy.indexOf(ticker);
  if (i !== -1) {
    userData.settings.noBuy.splice(i, 1);
  }
}

function onInputKeydown(ev: KeyboardEvent) {
  if (ev.key === 'Enter') {
    add();
  }
}
</script>

<template>
  <SectionHeader>{{ t('set.act.exclusions') }}</SectionHeader>
  <Passive v-if="userData.settings.noBuy.length === 0" :label="t('set.act.materials')">
    {{ t('set.act.none') }}
  </Passive>
  <Passive v-for="ticker in userData.settings.noBuy" :key="ticker" :label="ticker">
    <PrunButton danger @click="remove(ticker)">x</PrunButton>
  </Passive>
  <SectionHeader>{{ t('set.act.add') }}</SectionHeader>
  <form @submit.prevent>
    <Active :label="t('set.act.tickers')" :tooltip="t('set.act.tickersTip')" :error="inputError">
      <TextInput v-model="input" @keydown="onInputKeydown" />
    </Active>
    <Commands>
      <PrunButton primary @click="add">{{ t('act.common.add') }}</PrunButton>
    </Commands>
  </form>
</template>
