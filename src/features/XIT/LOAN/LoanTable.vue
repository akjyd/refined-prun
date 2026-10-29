<script setup lang="ts">
import { t } from '@src/i18n';
import ContractLink from '@src/features/XIT/CONTS/ContractLink.vue';
import PartnerLink from '@src/features/XIT/CONTS/PartnerLink.vue';
import ProgressBar from '@src/components/ProgressBar.vue';
import StatusCell from '@src/features/XIT/contract-overview/StatusCell.vue';
import { formatMoney, formatMoneyTotals } from '@src/features/XIT/contract-overview/utils';
import {
  getInstallments,
  getNextInstallment,
  getOutstanding,
  getPayout,
} from '@src/features/XIT/LOAN/utils';
import { fixed0, formatDenseEta } from '@src/utils/format';
import { timestampEachMinute } from '@src/utils/dayjs';

const { contracts, borrowing } = defineProps<{
  title: string;
  empty: string;
  borrowing: boolean;
  contracts: PrunApi.Contract[];
}>();

const summary = computed(() => {
  const principal = new Map<string, number>();
  const interest = new Map<string, number>();
  let installmentsLeft = 0;
  for (const contract of contracts) {
    const outstanding = getOutstanding(contract);
    if (outstanding.currency) {
      const c = outstanding.currency;
      principal.set(c, (principal.get(c) ?? 0) + outstanding.principal);
      interest.set(c, (interest.get(c) ?? 0) + outstanding.interest);
    }
    installmentsLeft += getInstallments(contract).filter(x => x.status !== 'FULFILLED').length;
  }
  return t(
    borrowing ? 'loan.summaryBorrowed' : 'loan.summaryLent',
    formatMoneyTotals(principal),
    formatMoneyTotals(interest),
    fixed0(installmentsLeft),
  );
});

function money(value?: PrunApi.CurrencyAmount) {
  return value ? formatMoney(value.amount, value.currency) : '--';
}

function installmentsProgress(contract: PrunApi.Contract) {
  const installments = getInstallments(contract);
  return {
    fulfilled: installments.filter(x => x.status === 'FULFILLED').length,
    total: installments.length,
  };
}

function nextDue(contract: PrunApi.Contract) {
  const next = getNextInstallment(contract);
  const deadline = next?.deadline?.timestamp;
  if (deadline === undefined) {
    return '--';
  }
  if (deadline <= timestampEachMinute.value) {
    return t('loan.overdue');
  }
  return formatDenseEta(timestampEachMinute.value, deadline);
}

function nextAmount(contract: PrunApi.Contract) {
  const next = getNextInstallment(contract);
  if (!next?.repayment) {
    return '--';
  }
  const total = next.repayment.amount + (next.interest?.amount ?? 0);
  return formatMoney(total, next.repayment.currency);
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
        <th>{{ t('loan.col.principal') }}</th>
        <th>{{ t('loan.col.interest') }}</th>
        <th>{{ borrowing ? t('loan.col.repaid') : t('loan.col.collected') }}</th>
        <th>{{ borrowing ? t('loan.col.nextRepay') : t('loan.col.nextCollect') }}</th>
        <th>{{ t('loan.col.amount') }}</th>
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
        <td>{{ money(getPayout(contract)) }}</td>
        <td>{{ money(getInstallments(contract)[0]?.interest) }}</td>
        <td :class="$style.progress">
          <ProgressBar
            :value="installmentsProgress(contract).fulfilled"
            :max="installmentsProgress(contract).total" />
          <span>
            {{ installmentsProgress(contract).fulfilled }}/{{
              installmentsProgress(contract).total
            }}
          </span>
        </td>
        <td>{{ nextDue(contract) }}</td>
        <td>{{ nextAmount(contract) }}</td>
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
