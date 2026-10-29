<script setup lang="ts">
import { t } from '@src/i18n';
import LoadingSpinner from '@src/components/LoadingSpinner.vue';
import { contractsStore } from '@src/infrastructure/prun-api/data/contracts';
import { useTileState } from '@src/store/user-data-tiles';
import StatusFilter from '@src/features/XIT/contract-overview/StatusFilter.vue';
import LoanTable from '@src/features/XIT/LOAN/LoanTable.vue';
import { defaultStatuses, sortByDateDesc } from '@src/features/XIT/contract-overview/utils';
import { isBorrowing, isLoanContract } from '@src/features/XIT/LOAN/utils';

const statuses = useTileState<PrunApi.ContractStatus[]>('statuses', defaultStatuses);

const contracts = computed(() =>
  (contractsStore.all.value ?? [])
    .filter(x => isLoanContract(x) && statuses.value.includes(x.status))
    .sort(sortByDateDesc),
);

const borrowed = computed(() => contracts.value.filter(isBorrowing));
const lent = computed(() => contracts.value.filter(x => !isBorrowing(x)));
</script>

<template>
  <LoadingSpinner v-if="!contractsStore.fetched.value" />
  <template v-else>
    <StatusFilter v-model="statuses" />
    <LoanTable
      :title="t('loan.borrowed')"
      :empty="t('loan.borrowedEmpty')"
      borrowing
      :contracts="borrowed" />
    <LoanTable
      :title="t('loan.lent')"
      :empty="t('loan.lentEmpty')"
      :borrowing="false"
      :contracts="lent" />
  </template>
</template>
