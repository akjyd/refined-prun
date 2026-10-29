<script setup lang="ts">
import { t } from '@src/i18n';
import ContractLink from '@src/features/XIT/CONTS/ContractLink.vue';
import PartnerLink from '@src/features/XIT/CONTS/PartnerLink.vue';
import ProgressBar from '@src/components/ProgressBar.vue';
import StatusCell from '@src/features/XIT/contract-overview/StatusCell.vue';
import {
  addMoney,
  conditionProgress,
  formatMoney,
  formatMoneyTotals,
} from '@src/features/XIT/contract-overview/utils';
import { getCargo, getDestination, getOrigin, getPayment } from '@src/features/XIT/HAUL/utils';
import { fixed0, fixed2 } from '@src/utils/format';

const { contracts } = defineProps<{
  title: string;
  empty: string;
  contracts: PrunApi.Contract[];
}>();

const summary = computed(() => {
  const payment = new Map<string, number>();
  let weight = 0;
  let volume = 0;
  for (const contract of contracts) {
    addMoney(payment, getPayment(contract));
    const cargo = getCargo(contract);
    weight += cargo?.weight ?? 0;
    volume += cargo?.volume ?? 0;
  }
  const fulfilled = contracts.filter(x => x.status === 'FULFILLED').length;
  return t(
    'haul.summary',
    fixed0(contracts.length),
    fixed0(fulfilled),
    formatMoneyTotals(payment),
    fixed2(weight),
    fixed2(volume),
  );
});

function cargoText(contract: PrunApi.Contract) {
  const cargo = getCargo(contract);
  return cargo ? `${fixed2(cargo.weight)}t / ${fixed2(cargo.volume)}m³` : '--';
}

function paymentText(contract: PrunApi.Contract) {
  const payment = getPayment(contract);
  return payment ? formatMoney(payment.amount, payment.currency) : '--';
}
</script>

<template>
  <table :class="$style.table">
    <thead>
      <tr>
        <th colspan="8" :class="$style.section">
          {{ title }}
          <span v-if="contracts.length > 0" :class="$style.summary">{{ summary }}</span>
        </th>
      </tr>
      <tr>
        <th>{{ t('contracts.col.contract') }}</th>
        <th>{{ t('contracts.col.partner') }}</th>
        <th>{{ t('haul.col.from') }}</th>
        <th>{{ t('haul.col.to') }}</th>
        <th>{{ t('haul.col.cargo') }}</th>
        <th>{{ t('haul.col.payment') }}</th>
        <th>{{ t('contracts.col.progress') }}</th>
        <th>{{ t('contracts.col.status') }}</th>
      </tr>
    </thead>
    <tbody>
      <tr v-if="contracts.length === 0">
        <td colspan="8" :class="$style.empty">{{ empty }}</td>
      </tr>
      <tr v-for="contract in contracts" v-else :key="contract.id">
        <td><ContractLink :contract="contract" /></td>
        <td><PartnerLink :contract="contract" /></td>
        <td>{{ getOrigin(contract) ?? '--' }}</td>
        <td>{{ getDestination(contract) ?? '--' }}</td>
        <td>{{ cargoText(contract) }}</td>
        <td>{{ paymentText(contract) }}</td>
        <td :class="$style.progress">
          <ProgressBar
            :value="conditionProgress(contract).fulfilled"
            :max="conditionProgress(contract).total" />
          <span>
            {{ conditionProgress(contract).fulfilled }}/{{ conditionProgress(contract).total }}
          </span>
        </td>
        <StatusCell :status="contract.status" />
      </tr>
    </tbody>
  </table>
</template>

<style module>
.table {
  width: 100%;
  margin-bottom: 8px;
}

.section {
  text-align: left;
}

.summary {
  margin-left: 8px;
  font-weight: normal;
  opacity: 0.8;
}

.empty {
  text-align: center;
  opacity: 0.7;
}

.progress {
  white-space: nowrap;

  > progress {
    width: 50px;
    margin-right: 4px;
    vertical-align: middle;
  }
}
</style>
