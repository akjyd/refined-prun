import { act } from '@src/features/XIT/ACT/act-registry';
import {
  clickContribute,
  fillContribution,
  findContributionTable,
} from '@src/features/XIT/ACT/action-steps/contribute-utils';
import { fixed0 } from '@src/utils/format';
import { t } from '@src/i18n';

interface Data {
  planet: string;
  // Building ticker for POPID; undefined for the CoGC (COGCU).
  building?: string;
  materials: Record<string, number>;
}

function materialsText(materials: Record<string, number>) {
  return Object.entries(materials)
    .map(([ticker, amount]) => `${fixed0(amount)} ${ticker}`)
    .join(', ');
}

// Contributes materials from the base on the planet to a population building or the CoGC.
export const CONTRIBUTE = act.addActionStep<Data>({
  type: 'CONTRIBUTE',
  description: data =>
    t('act.contribute.desc', materialsText(data.materials), data.building ?? 'COGC', data.planet),
  execute: async ctx => {
    const { data, log, requestTile, setStatus, waitAct, waitActionFeedback, complete, skip } = ctx;
    const command =
      data.building !== undefined
        ? `POPID P-${data.planet} T-${data.building}`
        : `COGCU ${data.planet}`;
    const tile = await requestTile(command);
    if (!tile) {
      return;
    }
    setStatus(t('act.contribute.setup'));
    const { contribute, table } = await findContributionTable(tile.anchor);
    if (!table) {
      log.warning(t('act.contribute.noTable', command));
      skip();
      return;
    }
    const set = await fillContribution(table, data.materials);
    let total = 0;
    for (const [ticker, amount] of Object.entries(data.materials)) {
      const value = set[ticker];
      if (value === undefined) {
        log.warning(t('act.contribute.noRow', ticker, command));
        continue;
      }
      if (value < amount) {
        log.warning(t('act.contribute.short', ticker, fixed0(value), fixed0(amount)));
      }
      total += value;
    }
    if (total <= 0) {
      skip();
      return;
    }
    await waitAct();
    await clickContribute(contribute);
    await waitActionFeedback(tile);
    complete();
  },
});
