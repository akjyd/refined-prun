import { act } from '@src/features/XIT/ACT/act-registry';
import { planetsStore } from '@src/infrastructure/prun-api/data/planets';
import { populationsStore } from '@src/infrastructure/prun-api/data/populations';
import { sleep } from '@src/utils/sleep';
import { t } from '@src/i18n';

interface Data {
  planet: string;
}

export const OPEN_POPI = act.addActionStep<Data>({
  type: 'OPEN_POPI',
  description: data => t('act.popi.open', data.planet),
  execute: async ctx => {
    const { data, log, requestTile, complete, fail } = ctx;
    const tile = await requestTile(`POPI ${data.planet}`);
    if (!tile) {
      return;
    }

    const deadline = Date.now() + 15000;
    while (Date.now() < deadline) {
      const popId = planetsStore.find(data.planet)?.populationId;
      if (popId !== undefined && populationsStore.getById(popId) !== undefined) {
        const population = populationsStore.getById(popId)!;
        const present = population.infrastructure
          .filter(x => x.level > 0)
          .map(x => `${x.ticker} ${x.level}`);
        log.info(
          present.length > 0
            ? t('act.popi.buildings', data.planet, present.join(', '))
            : t('act.popi.none', data.planet),
        );
        complete();
        return;
      }
      await sleep(200);
    }
    fail(t('act.popi.noData', data.planet));
  },
});
