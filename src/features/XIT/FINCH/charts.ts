import { PartialBalanceSheet } from '@src/core/balance/balance-sheet';
import * as summary from '@src/core/balance/balance-sheet-summary';
import { userData } from '@src/store/user-data';
import { calcDailyGrowthRate, ChartSeries } from '@src/features/XIT/FINCH/growth-rate';
import { t } from '@src/i18n';

export type ChartDef = {
  value: string;
  label: string;
  getValue: (x: PartialBalanceSheet) => number | undefined;
  less?: boolean;
  // Rewrites the daily series into a derived one.
  deriveSeries?: (series: ChartSeries) => ChartSeries;
  unit?: 'currency' | 'percent';
};

export const charts = computed<ChartDef[]>(() => {
  return [
    {
      value: 'EQUITY',
      label: userData.fullEquityMode ? t('fin.term.Equity') : t('fin.term.Equity_Partial'),
      getValue: summary.calcEquity,
    },
    {
      value: 'EQUITY GROWTH',
      label: userData.fullEquityMode
        ? t('fin.term.Equity_Growth')
        : t('fin.term.Equity_Growth_Partial'),
      getValue: summary.calcEquity,
      deriveSeries: calcDailyGrowthRate,
      unit: 'percent',
    },

    // =========================
    // Assets
    // =========================
    {
      value: 'TOTAL ASSETS',
      label: t('fin.term.Total_Assets'),
      getValue: summary.calcTotalAssets,
    },

    // =========================
    // Current Assets
    // =========================
    {
      value: 'CURRENT ASSETS',
      label: t('fin.term.Current_Assets'),
      getValue: summary.calcTotalCurrentAssets,
    },
    {
      value: 'CA CASH EQUIVALENTS',
      label: '- ' + t('fin.term.Cash_and_Cash_Equivalents'),
      getValue: summary.calcTotalCashAndCashEquivalents,
    },
    {
      value: 'CA CASH',
      label: '-- ' + t('fin.term.Cash'),
      getValue: x => x.assets?.current?.cashAndCashEquivalents?.cash,
    },
    {
      value: 'CA DEPOSITS',
      label: '-- ' + t('fin.term.Deposits'),
      getValue: summary.calcTotalDeposits,
    },
    {
      value: 'CA DEPOSITS CX',
      label: '--- ' + t('fin.term.Deposits_CX'),
      getValue: x => x.assets?.current?.cashAndCashEquivalents?.deposits?.cx,
    },
    {
      value: 'CA DEPOSITS FX',
      label: '--- ' + t('fin.term.Deposits_FX'),
      getValue: x => x.assets?.current?.cashAndCashEquivalents?.deposits?.fx,
    },
    {
      value: 'CA MM MATERIALS',
      label: '-- ' + t('fin.term.MM_Materials'),
      getValue: x => x.assets?.current?.cashAndCashEquivalents?.mmMaterials,
    },
    {
      value: 'CA ACCOUNTS RECEIVABLE',
      label: '- ' + t('fin.term.Accounts_Receivable'),
      getValue: x => x.assets?.current?.accountsReceivable,
    },
    {
      value: 'CA LOANS RECEIVABLE',
      label: '- ' + t('fin.term.Loans_Receivable'),
      getValue: summary.calcTotalLoansReceivable,
    },
    {
      value: 'CA LOANS PRINCIPAL',
      label: '-- ' + t('fin.term.Loans_Receivable_Principal'),
      getValue: x => x.assets?.current?.loansReceivable?.principal,
    },
    {
      value: 'CA LOANS INTEREST',
      label: '-- ' + t('fin.term.Loans_Receivable_Interest'),
      getValue: x => x.assets?.current?.loansReceivable?.interest,
    },
    {
      value: 'CA INVENTORY',
      label: '- ' + t('fin.term.Inventory'),
      getValue: summary.calcTotalInventory,
    },
    {
      value: 'CA CX LISTED MATERIALS',
      label: '-- ' + t('fin.term.CX_Listed_Materials'),
      getValue: x => x.assets?.current?.inventory?.cxListedMaterials,
    },
    {
      value: 'CA CX INVENTORY',
      label: '-- ' + t('fin.term.CX_Inventory'),
      getValue: x => x.assets?.current?.inventory?.cxInventory,
    },
    {
      value: 'CA MATERIALS IN TRANSIT',
      label: '-- ' + t('fin.term.Materials_in_Transit'),
      getValue: x => x.assets?.current?.inventory?.materialsInTransit,
    },
    {
      value: 'CA BASE INVENTORY',
      label: '-- ' + t('fin.term.Base_Inventory'),
      getValue: summary.calcTotalBaseInventory,
    },
    {
      value: 'CA FINISHED GOODS',
      label: '--- ' + t('fin.term.Finished_Goods'),
      getValue: x => x.assets?.current?.inventory?.baseInventory?.finishedGoods,
    },
    {
      value: 'CA WORK IN PROGRESS',
      label: '--- ' + t('fin.term.Work_in_Progress_WIP'),
      getValue: x => x.assets?.current?.inventory?.baseInventory?.workInProgress,
    },
    {
      value: 'CA RAW MATERIALS',
      label: '--- ' + t('fin.term.Raw_Materials'),
      getValue: x => x.assets?.current?.inventory?.baseInventory?.rawMaterials,
    },
    {
      value: 'CA WORKFORCE CONSUMABLES',
      label: '--- ' + t('fin.term.Workforce_Consumables'),
      getValue: x => x.assets?.current?.inventory?.baseInventory?.workforceConsumables,
    },
    {
      value: 'CA OTHER ITEMS',
      label: '--- ' + t('fin.term.Other_Items'),
      getValue: x => x.assets?.current?.inventory?.baseInventory?.otherItems,
    },
    {
      value: 'CA FUEL TANKS',
      label: '-- ' + t('fin.term.Fuel_Tanks'),
      getValue: x => x.assets?.current?.inventory?.fuelTanks,
    },
    {
      value: 'CA MATERIALS RECEIVABLE',
      label: '-- ' + t('fin.term.Materials_Receivable'),
      getValue: x => x.assets?.current?.inventory?.materialsReceivable,
    },

    // =========================
    // Non-Current Assets
    // =========================
    {
      value: 'NON CURRENT ASSETS',
      label: t('fin.term.Non_Current_Assets'),
      getValue: summary.calcTotalNonCurrentAssets,
    },
    {
      value: 'NCA BUILDINGS',
      label: '- ' + t('fin.term.Buildings_net'),
      getValue: summary.calcTotalBuildings,
    },
    {
      value: 'NCA BUILDINGS VALUE',
      label: '-- ' + t('fin.term.Buildings_Market_Value'),
      getValue: summary.calcTotalBuildingsMarketValue,
    },
    {
      value: 'NCA BUILDINGS INFRASTRUCTURE',
      label: '--- ' + t('fin.term.Buildings_Infrastructure'),
      getValue: x => x.assets?.nonCurrent?.buildings?.marketValue?.infrastructure,
    },
    {
      value: 'NCA BUILDINGS RESOURCE EXTRACTION',
      label: '--- ' + t('fin.term.Buildings_Resource_Extraction'),
      getValue: x => x.assets?.nonCurrent?.buildings?.marketValue?.resourceExtraction,
    },
    {
      value: 'NCA BUILDINGS PRODUCTION',
      label: '--- ' + t('fin.term.Buildings_Production'),
      getValue: x => x.assets?.nonCurrent?.buildings?.marketValue?.production,
    },
    {
      value: 'NCA BUILDINGS DEPRECIATION',
      label: '-- ' + t('fin.term.Buildings_Acc_Depreciation'),
      less: true,
      getValue: x => x.assets?.nonCurrent?.buildings?.accumulatedDepreciation,
    },
    {
      value: 'NCA SHIPS',
      label: '- ' + t('fin.term.Ships_net'),
      getValue: summary.calcTotalShips,
    },
    {
      value: 'NCA SHIPS VALUE',
      label: '-- ' + t('fin.term.Ships_Market_Value'),
      getValue: x => x.assets?.nonCurrent?.ships?.marketValue,
    },
    {
      value: 'NCA SHIPS DEPRECIATION',
      label: '-- ' + t('fin.term.Ships_Acc_Depreciation'),
      less: true,
      getValue: x => x.assets?.nonCurrent?.ships?.accumulatedDepreciation,
    },
    {
      value: 'NCA LONG TERM RECEIVABLES',
      label: '- ' + t('fin.term.Long_Term_Receivables'),
      getValue: summary.calcTotalLongTermReceivables,
    },
    {
      value: 'NCA ACCOUNTS RECEIVABLE',
      label: '-- ' + t('fin.term.LTR_Accounts_Receivable'),
      getValue: x => x.assets?.nonCurrent?.longTermReceivables?.accountsReceivable,
    },
    {
      value: 'NCA MATERIALS IN TRANSIT',
      label: '-- ' + t('fin.term.LTR_Materials_in_Transit'),
      getValue: x => x.assets?.nonCurrent?.longTermReceivables?.materialsInTransit,
    },
    {
      value: 'NCA MATERIALS RECEIVABLE',
      label: '-- ' + t('fin.term.LTR_Materials_Receivable'),
      getValue: x => x.assets?.nonCurrent?.longTermReceivables?.materialsReceivable,
    },
    {
      value: 'NCA LOANS PRINCIPAL',
      label: '-- ' + t('fin.term.LTR_Loans_Principal'),
      getValue: x => x.assets?.nonCurrent?.longTermReceivables?.loansPrincipal,
    },
    {
      value: 'NCA INTANGIBLE ASSETS',
      label: '- ' + t('fin.term.Intangible_Assets'),
      getValue: summary.calcTotalIntangibleAssets,
    },
    {
      value: 'NCA HQ UPGRADES',
      label: '-- ' + t('fin.term.HQ_Upgrades'),
      getValue: x => x.assets?.nonCurrent?.intangibleAssets?.hqUpgrades,
    },
    {
      value: 'NCA ARC',
      label: '-- ' + t('fin.term.APEX_Representation_Center'),
      getValue: x => x.assets?.nonCurrent?.intangibleAssets?.arc,
    },

    // =========================
    // Liabilities
    // =========================
    {
      value: 'TOTAL LIABILITIES',
      label: t('fin.term.Total_Liabilities'),
      getValue: summary.calcTotalLiabilities,
    },

    // =========================
    // Current Liabilities
    // =========================
    {
      value: 'CURRENT LIABILITIES',
      label: t('fin.term.Current_Liabilities'),
      getValue: summary.calcTotalCurrentLiabilities,
    },
    {
      value: 'CL ACCOUNTS PAYABLE',
      label: '- ' + t('fin.term.Accounts_Payable'),
      getValue: x => x.liabilities?.current?.accountsPayable,
    },
    {
      value: 'CL MATERIALS PAYABLE',
      label: '- ' + t('fin.term.Materials_Payable'),
      getValue: x => x.liabilities?.current?.materialsPayable,
    },
    {
      value: 'CL LOANS PAYABLE',
      label: '- ' + t('fin.term.Loans_Payable'),
      getValue: summary.calcTotalLoansPayable,
    },
    {
      value: 'CL LOANS PRINCIPAL',
      label: '-- ' + t('fin.term.Loans_Payable_Principal'),
      getValue: x => x.liabilities?.current?.loansPayable?.principal,
    },
    {
      value: 'CL LOANS INTEREST',
      label: '-- ' + t('fin.term.Loans_Payable_Interest'),
      getValue: x => x.liabilities?.current?.loansPayable?.interest,
    },

    // =========================
    // Non-Current Liabilities
    // =========================
    {
      value: 'NON CURRENT LIABILITIES',
      label: t('fin.term.Non_Current_Liabilities'),
      getValue: summary.calcTotalNonCurrentLiabilities,
    },
    {
      value: 'NCL LONG TERM PAYABLES',
      label: '- ' + t('fin.term.Long_Term_Payables'),
      getValue: summary.calcTotalLongTermPayables,
    },
    {
      value: 'NCL ACCOUNTS PAYABLE',
      label: '-- ' + t('fin.term.Long_Term_Accounts_Payable'),
      getValue: x => x.liabilities?.nonCurrent?.longTermPayables?.accountsPayable,
    },
    {
      value: 'NCL MATERIALS PAYABLE',
      label: '-- ' + t('fin.term.Long_Term_Materials_Payable'),
      getValue: x => x.liabilities?.nonCurrent?.longTermPayables?.materialsPayable,
    },
    {
      value: 'NCL LOANS PRINCIPAL',
      label: '-- ' + t('fin.term.Long_Term_Loans_Principal'),
      getValue: x => x.liabilities?.nonCurrent?.longTermPayables?.loansPrincipal,
    },
  ];
});
