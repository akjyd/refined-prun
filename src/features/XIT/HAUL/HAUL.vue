<script setup lang="ts">
import { t } from '@src/i18n';
import LoadingSpinner from '@src/components/LoadingSpinner.vue';
import { contractsStore } from '@src/infrastructure/prun-api/data/contracts';
import { useTileState } from '@src/store/user-data-tiles';
import StatusFilter from '@src/features/XIT/contract-overview/StatusFilter.vue';
import HaulTable from '@src/features/XIT/HAUL/HaulTable.vue';
import { defaultStatuses, sortByDateDesc } from '@src/features/XIT/contract-overview/utils';
import { isCarrier, isTransportContract } from '@src/features/XIT/HAUL/utils';

const statuses = useTileState<PrunApi.ContractStatus[]>('statuses', defaultStatuses);

const contracts = computed(() =>
  (contractsStore.all.value ?? [])
    .filter(x => isTransportContract(x) && statuses.value.includes(x.status))
    .sort(sortByDateDesc),
);

const carrying = computed(() => contracts.value.filter(isCarrier));
const shipping = computed(() => contracts.value.filter(x => !isCarrier(x)));
</script>

<template>
  <LoadingSpinner v-if="!contractsStore.fetched.value" />
  <template v-else>
    <StatusFilter v-model="statuses" />
    <HaulTable :title="t('haul.carrying')" :empty="t('haul.carryingEmpty')" :contracts="carrying" />
    <HaulTable :title="t('haul.shipping')" :empty="t('haul.shippingEmpty')" :contracts="shipping" />
  </template>
</template>
