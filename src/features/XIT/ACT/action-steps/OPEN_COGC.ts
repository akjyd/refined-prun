import { act } from '@src/features/XIT/ACT/act-registry';
import { cogcsStore } from '@src/infrastructure/prun-api/data/cogcs';
import { planetsStore } from '@src/infrastructure/prun-api/data/planets';
import { waitUntil } from '@src/utils/wait';
import { t } from '@src/i18n';

interface Data {
  planet: string;
}

export const OPEN_COGC = act.addActionStep<Data>({
  type: 'OPEN_COGC',
  description: data => t('act.cogc.open', data.planet),
  execute: async ctx => {
    const { data, log, requestTile, complete } = ctx;
    const tile = await requestTile(`COGC ${data.planet}`);
    if (!tile) {
      return;
    }

    const naturalId = planetsStore.find(data.planet)?.naturalId ?? data.planet;
    const loaded = await waitUntil(
      () => cogcsStore.getByPlanetNaturalId(naturalId) !== undefined,
      15000,
      200,
    );
    if (!loaded) {
      // Some planets have no COGC; missing data must not stop the run.
      log.warning(t('act.cogc.none', data.planet));
    }
    complete();
  },
});
