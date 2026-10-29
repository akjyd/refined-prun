<script setup lang="ts">
import { t } from '@src/i18n';
import PieChart from '@src/features/XIT/FINCH/PieChart.vue';
import { liveBalanceSummary } from '@src/core/balance/balance-sheet-live';
</script>

<template>
  <PieChart
    :label-data="[t('finch.current'), t('finch.nonCurrent')]"
    :numerical-data="[
      liveBalanceSummary.currentAssets ?? 0,
      liveBalanceSummary.nonCurrentAssets ?? 0,
    ]" />
</template>
