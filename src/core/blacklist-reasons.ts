import { t } from '@src/i18n';

// Reasons to pick when putting a material on a blacklist. The first one is "no reason"; it is
// also what older entries without a reason show.
export function arbReasons() {
  return [
    { id: 'none', label: t('bl.none') },
    { id: 'price', label: t('bl.price') },
    { id: 'volume', label: t('bl.volume') },
    { id: 'cargo', label: t('bl.cargo') },
    { id: 'risk', label: t('bl.risk') },
  ];
}

export function extractReasons() {
  return [
    { id: 'none', label: t('bl.none') },
    { id: 'notMine', label: t('bl.notMine') },
    { id: 'lowProfit', label: t('bl.lowProfit') },
    { id: 'far', label: t('bl.far') },
    { id: 'market', label: t('bl.market') },
  ];
}
