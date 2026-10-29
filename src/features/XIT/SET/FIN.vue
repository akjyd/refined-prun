<script setup lang="ts">
import { t } from '@src/i18n';
import SectionHeader from '@src/components/SectionHeader.vue';
import Tooltip from '@src/components/Tooltip.vue';
import Commands from '@src/components/forms/Commands.vue';
import PrunButton from '@src/components/PrunButton.vue';
import { fixed0, hhmm, ddmmyyyy } from '@src/utils/format';
import { clearBalanceHistory, userData } from '@src/store/user-data';
import { calcEquity } from '@src/core/balance/balance-sheet-summary';
import { showConfirmationOverlay } from '@src/infrastructure/prun-ui/tile-overlay';
import {
  balanceHistory,
  canCollectFinDataPoint,
  collectFinDataPoint,
} from '@src/store/user-data-balance';
import Active from '@src/components/forms/Active.vue';
import TextInput from '@src/components/forms/TextInput.vue';
import { objectId } from '@src/utils/object-id';
import RadioItem from '@src/components/forms/RadioItem.vue';
import MergeFinancialBackups from './MergeFinancialBackups.vue';

const sortedData = computed(() => balanceHistory.value.slice().reverse());
const showBackupMerge = ref(false);

function confirmDataPointDelete(ev: Event, index: number) {
  index = balanceHistory.value.length - index - 1;
  showConfirmationOverlay(ev, () => deleteBalanceHistoryDataPoint(index), {
    message: t('set.fin.deletePointConfirm'),
  });
}

function deleteBalanceHistoryDataPoint(index: number) {
  const history = userData.balanceHistory;
  if (index < history.v1.length) {
    history.v1.splice(index, 1);
  } else {
    history.v2.splice(index - history.v1.length, 1);
  }
}

function confirmAllDataDelete(ev: Event) {
  showConfirmationOverlay(ev, clearBalanceHistory, {
    message: t('set.fin.clearConfirm'),
  });
}

function formatValue(number?: number) {
  return number !== undefined ? fixed0(number) : '--';
}

const mmMaterials = ref(userData.settings.financial.mmMaterials);

function onMMMaterialsSubmit() {
  const formatted = (mmMaterials.value ?? '').replaceAll(' ', '').toUpperCase();
  userData.settings.financial.mmMaterials = formatted;
  mmMaterials.value = formatted;
}

const ignoredMaterials = ref(userData.settings.financial.ignoredMaterials);

function onIgnoredMaterialsSubmit() {
  const formatted = (ignoredMaterials.value ?? '').replaceAll(' ', '').toUpperCase();
  userData.settings.financial.ignoredMaterials = formatted;
  ignoredMaterials.value = formatted;
}
</script>

<template>
  <SectionHeader>{{ t('set.fin.equity') }}</SectionHeader>
  <Active :label="t('set.fin.equity')" :tooltip="t('set.fin.equityTip')" tooltip-position="bottom">
    <RadioItem v-model="userData.fullEquityMode">{{ t('set.fin.equityToggle') }}</RadioItem>
  </Active>
  <SectionHeader>{{ t('set.fin.prices') }}</SectionHeader>
  <Active :label="t('set.fin.mm')" :tooltip="t('set.fin.mmTip')">
    <TextInput
      v-model="mmMaterials"
      @keyup.enter="onMMMaterialsSubmit"
      @focusout="onMMMaterialsSubmit" />
  </Active>
  <Active :label="t('set.fin.ignored')" :tooltip="t('set.fin.ignoredTip')">
    <TextInput
      v-model="ignoredMaterials"
      @keyup.enter="onIgnoredMaterialsSubmit"
      @focusout="onIgnoredMaterialsSubmit" />
  </Active>
  <SectionHeader>{{ t('set.fin.points') }}</SectionHeader>
  <form>
    <Commands>
      <PrunButton primary :disabled="!canCollectFinDataPoint()" @click="collectFinDataPoint">
        {{ t('set.fin.collect') }}
      </PrunButton>
      <PrunButton primary @click="showBackupMerge = !showBackupMerge">
        {{ showBackupMerge ? t('set.fin.hideMerge') : t('set.fin.merge') }}
      </PrunButton>
    </Commands>
  </form>
  <div v-show="showBackupMerge">
    <MergeFinancialBackups />
  </div>
  <table>
    <thead>
      <tr>
        <th>{{ t('set.fin.date') }}</th>
        <th>{{ t('set.fin.equityCol') }}</th>
        <th>{{ t('set.fin.command') }}</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="(balance, i) in sortedData" :key="objectId(balance)">
        <td>{{ hhmm(balance.timestamp) }} {{ ddmmyyyy(balance.timestamp) }}</td>
        <td>{{ formatValue(calcEquity(balance)) }}</td>
        <td>
          <PrunButton dark inline @click="confirmDataPointDelete($event, i)">{{
            t('act.common.deleteSmall')
          }}</PrunButton>
        </td>
      </tr>
    </tbody>
  </table>
  <SectionHeader>
    {{ t('set.game.danger') }}
    <Tooltip :class="$style.tooltip" :tooltip="t('set.fin.clearTip')" />
  </SectionHeader>
  <form>
    <Commands>
      <PrunButton danger @click="confirmAllDataDelete">{{ t('set.fin.clear') }}</PrunButton>
    </Commands>
  </form>
</template>

<style module>
.tooltip {
  float: revert;
  font-size: 12px;
  margin-top: -4px;
}
</style>
