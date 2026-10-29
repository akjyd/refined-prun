<script setup lang="ts">
import { t } from '@src/i18n';
import { calculateLocationAssets } from '@src/core/financials';
import KeyFigures from '@src/features/XIT/FIN/KeyFigures.vue';
import FinHeader from '@src/features/XIT/FIN/FinHeader.vue';
import {
  fixed0,
  fixed1,
  fixed2,
  formatCurrency,
  percent0,
  percent1,
  percent2,
} from '@src/utils/format';
import { liveBalanceSummary } from '@src/core/balance/balance-sheet-live';
import { userData } from '@src/store/user-data';

const locations = computed(() => calculateLocationAssets());

function formatRatio(ratio: number | undefined) {
  if (ratio === undefined) {
    return '--';
  }
  if (!isFinite(ratio)) {
    return 'N/A';
  }
  const absRatio = Math.abs(ratio);
  if (absRatio > 1000) {
    return ratio > 0 ? '> 1,000' : '< -1,000';
  }
  if (absRatio > 100) {
    return fixed0(ratio);
  }
  if (absRatio > 10) {
    return fixed1(ratio);
  }
  return fixed2(ratio);
}

function formatPercentage(ratio: number | undefined) {
  if (ratio === undefined) {
    return '--';
  }
  if (!isFinite(ratio)) {
    return 'N/A';
  }
  const absRatio = Math.abs(ratio);
  if (absRatio > 10) {
    return ratio > 0 ? '> 1,000%' : '< -1,000%';
  }
  if (absRatio > 1) {
    return percent0(ratio);
  }
  if (absRatio > 0.1) {
    return percent1(ratio);
  }
  return percent2(ratio);
}

const figures = computed(() => {
  return [
    {
      name: t('fin.fig.quickAssets'),
      value: formatCurrency(liveBalanceSummary.quickAssets),
      tooltip: t('fin.tip.quickAssets'),
    },
    {
      name: t('fin.fig.currentAssets'),
      value: formatCurrency(liveBalanceSummary.currentAssets),
    },
    { name: t('fin.fig.totalAssets'), value: formatCurrency(liveBalanceSummary.assets) },
    { name: t('fin.fig.equity'), value: formatCurrency(liveBalanceSummary.equity) },
    {
      name: t('fin.fig.quickLiabilities'),
      value: formatCurrency(liveBalanceSummary.quickLiabilities),
      tooltip: t('fin.tip.quickLiabilities'),
    },
    {
      name: t('fin.fig.currentLiabilities'),
      value: formatCurrency(liveBalanceSummary.currentLiabilities),
    },
    {
      name: t('fin.fig.totalLiabilities'),
      value: formatCurrency(liveBalanceSummary.liabilities),
    },
    {
      name: t('fin.fig.liquidation'),
      hidden: !userData.fullEquityMode,
      value: formatCurrency(liveBalanceSummary.liquidationValue),
      tooltip: t('fin.tip.liquidation'),
    },
    {
      name: t('fin.fig.quickRatio'),
      value: formatRatio(liveBalanceSummary.acidTestRatio),
      tooltip: t('fin.tip.quickRatio'),
    },
    {
      name: t('fin.fig.debtRatio'),
      value: formatPercentage(liveBalanceSummary.debtRatio),
      tooltip: t('fin.tip.debtRatio'),
    },
  ];
});
</script>

<template>
  <FinHeader>{{ t('fin.keyFigures') }}</FinHeader>
  <KeyFigures :figures="figures" />
  <FinHeader>{{ t('fin.locations') }}</FinHeader>
  <table>
    <thead>
      <tr>
        <th>{{ t('fin.col.name') }}</th>
        <th>{{ t('fin.col.nonCurrent') }}</th>
        <th>{{ t('fin.col.current') }}</th>
        <th>{{ t('fin.col.total') }}</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="location in locations" :key="location.name">
        <td>{{ location.name }}</td>
        <td>{{ fixed0(location.nonCurrent) }}</td>
        <td>{{ fixed0(location.current) }}</td>
        <td>{{ fixed0(location.total) }}</td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped>
table tr > :not(:first-child) {
  text-align: right;
}
</style>
