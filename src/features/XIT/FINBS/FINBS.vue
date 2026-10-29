<script setup lang="ts">
import { t } from '@src/i18n';
import BalanceSheetSection from '@src/features/XIT/FINBS/BalanceSheetSection.vue';
import * as summary from '@src/core/balance/balance-sheet-summary';
import { SectionData } from '@src/features/XIT/FINBS/balance-section';
import { liveBalanceSheet } from '@src/core/balance/balance-sheet-live';
import { ddmmyyyy } from '@src/utils/format';
import { lastBalance, previousBalance } from '@src/store/user-data-balance';
import { userData } from '@src/store/user-data';

const currentAssets = computed<SectionData>(() => ({
  name: t('fin.term.Current_Assets'),
  chartId: 'CURRENT ASSETS',
  value: summary.calcTotalCurrentAssets,
  children: [
    {
      name: t('fin.term.Cash_and_Cash_Equivalents'),
      chartId: 'CA CASH EQUIVALENTS',
      value: summary.calcTotalCashAndCashEquivalents,
      children: [
        {
          name: t('fin.term.Cash'),
          chartId: 'CA CASH',
          value: x => x.assets?.current?.cashAndCashEquivalents?.cash,
        },
        {
          name: t('fin.term.Deposits'),
          chartId: 'CA DEPOSITS',
          value: summary.calcTotalDeposits,
          children: [
            {
              name: t('fin.term.CX'),
              chartId: 'CA DEPOSITS CX',
              value: x => x.assets?.current?.cashAndCashEquivalents?.deposits?.cx,
            },
            {
              name: t('fin.term.FX'),
              chartId: 'CA DEPOSITS FX',
              value: x => x.assets?.current?.cashAndCashEquivalents?.deposits?.fx,
            },
          ],
        },
        {
          name: t('fin.term.MM_Materials'),
          chartId: 'CA MM MATERIALS',
          tooltip: t('finbs.mmTip'),
          value: x => x.assets?.current?.cashAndCashEquivalents?.mmMaterials,
        },
      ],
    },
    {
      name: t('fin.term.Accounts_Receivable'),
      chartId: 'CA ACCOUNTS RECEIVABLE',
      value: x => x.assets?.current?.accountsReceivable,
    },
    {
      name: t('fin.term.Loans_Receivable'),
      chartId: 'CA LOANS RECEIVABLE',
      value: summary.calcTotalLoansReceivable,
      children: [
        {
          name: t('fin.term.Principal'),
          chartId: 'CA LOANS PRINCIPAL',
          value: x => x.assets?.current?.loansReceivable?.principal,
        },
        {
          name: t('fin.term.Interest'),
          chartId: 'CA LOANS INTEREST',
          value: x => x.assets?.current?.loansReceivable?.interest,
        },
      ],
    },
    {
      name: t('fin.term.Inventory'),
      chartId: 'CA INVENTORY',
      value: summary.calcTotalInventory,
      children: [
        {
          name: t('fin.term.CX_Listed_Materials'),
          chartId: 'CA CX LISTED MATERIALS',
          value: x => x.assets?.current?.inventory?.cxListedMaterials,
        },
        {
          name: t('fin.term.CX_Inventory'),
          chartId: 'CA CX INVENTORY',
          value: x => x.assets?.current?.inventory?.cxInventory,
        },
        {
          name: t('fin.term.Materials_in_Transit'),
          chartId: 'CA MATERIALS IN TRANSIT',
          value: x => x.assets?.current?.inventory?.materialsInTransit,
        },
        {
          name: t('fin.term.Base_Inventory'),
          chartId: 'CA BASE INVENTORY',
          value: summary.calcTotalBaseInventory,
          children: [
            {
              name: t('fin.term.Finished_Goods'),
              chartId: 'CA FINISHED GOODS',
              value: x => x.assets?.current?.inventory?.baseInventory?.finishedGoods,
            },
            {
              name: t('fin.term.Work_in_Progress_WIP'),
              chartId: 'CA WORK IN PROGRESS',
              value: x => x.assets?.current?.inventory?.baseInventory?.workInProgress,
            },
            {
              name: t('fin.term.Raw_Materials'),
              chartId: 'CA RAW MATERIALS',
              value: x => x.assets?.current?.inventory?.baseInventory?.rawMaterials,
            },
            {
              name: t('fin.term.Workforce_Consumables'),
              chartId: 'CA WORKFORCE CONSUMABLES',
              value: x => x.assets?.current?.inventory?.baseInventory?.workforceConsumables,
            },
            {
              name: t('fin.term.Other_Items'),
              chartId: 'CA OTHER ITEMS',
              value: x => x.assets?.current?.inventory?.baseInventory?.otherItems,
            },
          ],
        },
        {
          name: t('fin.term.Fuel_Tanks'),
          chartId: 'CA FUEL TANKS',
          value: x => x.assets?.current?.inventory?.fuelTanks,
        },
        {
          name: t('fin.term.Materials_Receivable'),
          chartId: 'CA MATERIALS RECEIVABLE',
          value: x => x.assets?.current?.inventory?.materialsReceivable,
        },
      ],
    },
  ],
}));

const nonCurrentAssets = computed<SectionData>(() => ({
  name: t('fin.term.Non_Current_Assets'),
  chartId: 'NON CURRENT ASSETS',
  value: summary.calcTotalNonCurrentAssets,
  children: [
    {
      name: t('fin.term.Buildings_net'),
      chartId: 'NCA BUILDINGS',
      value: summary.calcTotalBuildings,
      children: [
        {
          name: t('fin.term.Market_Value'),
          chartId: 'NCA BUILDINGS VALUE',
          value: summary.calcTotalBuildingsMarketValue,
          children: [
            {
              name: t('fin.term.Infrastructure'),
              chartId: 'NCA BUILDINGS INFRASTRUCTURE',
              value: x => x.assets?.nonCurrent?.buildings?.marketValue?.infrastructure,
            },
            {
              name: t('fin.term.Resource_Extraction'),
              chartId: 'NCA BUILDINGS RESOURCE EXTRACTION',
              value: x => x.assets?.nonCurrent?.buildings?.marketValue?.resourceExtraction,
            },
            {
              name: t('fin.term.Production'),
              chartId: 'NCA BUILDINGS PRODUCTION',
              value: x => x.assets?.nonCurrent?.buildings?.marketValue?.production,
            },
          ],
        },
        {
          name: t('fin.term.Acc_Depreciation'),
          chartId: 'NCA BUILDINGS DEPRECIATION',
          less: true,
          value: x => x.assets?.nonCurrent?.buildings?.accumulatedDepreciation,
        },
      ],
    },
    {
      name: t('fin.term.Ships_net'),
      chartId: 'NCA SHIPS',
      value: summary.calcTotalShips,
      excluded: !userData.fullEquityMode,
      children: [
        {
          name: t('fin.term.Market_Value'),
          chartId: 'NCA SHIPS VALUE',
          value: x => x.assets?.nonCurrent?.ships?.marketValue,
        },
        {
          name: t('fin.term.Acc_Depreciation'),
          chartId: 'NCA SHIPS DEPRECIATION',
          less: true,
          value: x => x.assets?.nonCurrent?.ships?.accumulatedDepreciation,
        },
      ],
    },
    {
      name: t('fin.term.Long_Term_Receivables'),
      chartId: 'NCA LONG TERM RECEIVABLES',
      value: summary.calcTotalLongTermReceivables,
      children: [
        {
          name: t('fin.term.Accounts_Receivable'),
          chartId: 'NCA ACCOUNTS RECEIVABLE',
          value: x => x.assets?.nonCurrent?.longTermReceivables?.accountsReceivable,
        },
        {
          name: t('fin.term.Materials_in_Transit'),
          chartId: 'NCA MATERIALS IN TRANSIT',
          value: x => x.assets?.nonCurrent?.longTermReceivables?.materialsInTransit,
        },
        {
          name: t('fin.term.Materials_Receivable'),
          chartId: 'NCA MATERIALS RECEIVABLE',
          value: x => x.assets?.nonCurrent?.longTermReceivables?.materialsReceivable,
        },
        {
          name: t('fin.term.Loans_Principal'),
          chartId: 'NCA LOANS PRINCIPAL',
          value: x => x.assets?.nonCurrent?.longTermReceivables?.loansPrincipal,
        },
      ],
    },
    {
      name: t('fin.term.Intangible_Assets'),
      chartId: 'NCA INTANGIBLE ASSETS',
      value: summary.calcTotalIntangibleAssets,
      excluded: !userData.fullEquityMode,
      children: [
        {
          name: t('fin.term.HQ_Upgrades'),
          chartId: 'NCA HQ UPGRADES',
          value: x => x.assets?.nonCurrent?.intangibleAssets?.hqUpgrades,
        },
        {
          name: t('fin.term.APEX_Representation_Center'),
          chartId: 'NCA ARC',
          value: x => x.assets?.nonCurrent?.intangibleAssets?.arc,
        },
      ],
    },
  ],
}));

const currentLiabilities = computed<SectionData>(() => ({
  name: t('fin.term.Current_Liabilities'),
  chartId: 'CURRENT LIABILITIES',
  value: summary.calcTotalCurrentLiabilities,
  children: [
    {
      name: t('fin.term.Accounts_Payable'),
      chartId: 'CL ACCOUNTS PAYABLE',
      value: x => x.liabilities?.current?.accountsPayable,
    },
    {
      name: t('fin.term.Materials_Payable'),
      chartId: 'CL MATERIALS PAYABLE',
      value: x => x.liabilities?.current?.materialsPayable,
    },
    {
      name: t('fin.term.Loans_Payable'),
      chartId: 'CL LOANS PAYABLE',
      value: summary.calcTotalLoansPayable,
      children: [
        {
          name: t('fin.term.Principal'),
          chartId: 'CL LOANS PRINCIPAL',
          value: x => x.liabilities?.current?.loansPayable?.principal,
        },
        {
          name: t('fin.term.Interest'),
          chartId: 'CL LOANS INTEREST',
          value: x => x.liabilities?.current?.loansPayable?.interest,
        },
      ],
    },
  ],
}));

const nonCurrentLiabilities = computed<SectionData>(() => ({
  name: t('fin.term.Non_Current_Liabilities'),
  chartId: 'NON CURRENT LIABILITIES',
  value: summary.calcTotalNonCurrentLiabilities,
  children: [
    {
      name: t('fin.term.Long_Term_Payables'),
      chartId: 'NCL LONG TERM PAYABLES',
      value: summary.calcTotalLongTermPayables,
      children: [
        {
          name: t('fin.term.Accounts_Payable'),
          chartId: 'NCL ACCOUNTS PAYABLE',
          value: x => x.liabilities?.nonCurrent?.longTermPayables?.accountsPayable,
        },
        {
          name: t('fin.term.Materials_Payable'),
          chartId: 'NCL MATERIALS PAYABLE',
          value: x => x.liabilities?.nonCurrent?.longTermPayables?.materialsPayable,
        },
        {
          name: t('fin.term.Loans_Principal'),
          chartId: 'NCL LOANS PRINCIPAL',
          value: x => x.liabilities?.nonCurrent?.longTermPayables?.loansPrincipal,
        },
      ],
    },
  ],
}));

const equity = computed<SectionData>(() => ({
  name: t('fin.term.Equity'),
  chartId: 'EQUITY',
  coloredChange: true,
  value: summary.calcEquity,
  children: [
    {
      name: t('fin.term.Total_Assets'),
      chartId: 'TOTAL ASSETS',
      value: summary.calcTotalAssets,
    },
    {
      name: t('fin.term.Total_Liabilities'),
      chartId: 'TOTAL LIABILITIES',
      less: true,
      value: summary.calcTotalLiabilities,
    },
  ],
}));

const sections = [
  currentAssets,
  nonCurrentAssets,
  currentLiabilities,
  nonCurrentLiabilities,
  equity,
];
</script>

<template>
  <table>
    <thead>
      <tr>
        <th>&nbsp;</th>
        <th>{{ t('finbs.current') }}</th>
        <th>
          <template v-if="lastBalance">{{ ddmmyyyy(lastBalance.timestamp) }}</template>
          <template v-else>{{ t('finbs.last') }}</template>
        </th>
        <th>
          <template v-if="previousBalance">{{ ddmmyyyy(previousBalance.timestamp) }}</template>
          <template v-else>{{ t('finbs.previous') }}</template>
        </th>
        <th>{{ t('finbs.change') }}</th>
        <th />
      </tr>
    </thead>
    <BalanceSheetSection
      v-for="section in sections"
      :key="section.value.name"
      :current="liveBalanceSheet"
      :last="lastBalance"
      :previous="previousBalance"
      :section="section.value" />
  </table>
</template>

<style scoped>
table tr > :not(:first-child) {
  text-align: right;
}
</style>
