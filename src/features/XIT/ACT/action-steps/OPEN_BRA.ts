import { act } from '@src/features/XIT/ACT/act-registry';
import { getPlanetName } from '@src/core/planet-name';
import { t } from '@src/i18n';

interface Data {
  planet: string;
}

export const OPEN_BRA = act.addActionStep<Data>({
  type: 'OPEN_BRA',
  description: data => t('act.bra.open', getPlanetName(data.planet) ?? data.planet),
  execute: async ctx => {
    const { data, waitAct, requestTile, complete } = ctx;
    const tile = await requestTile(`BRA ${data.planet}`);
    if (!tile) {
      return;
    }
    // Reminder pause: keep ACT grayed so the player runs the repair first.
    await waitAct(t('act.bra.wait', getPlanetName(data.planet) ?? data.planet), {
      actDelayMs: 2000,
    });
    complete();
  },
});
