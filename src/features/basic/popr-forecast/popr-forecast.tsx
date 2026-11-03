import css from '@src/utils/css-utils.module.css';
import { planetsStore } from '@src/infrastructure/prun-api/data/planets';
import { populationsStore } from '@src/infrastructure/prun-api/data/populations';
import { planetSitesStore } from '@src/infrastructure/prun-api/data/planet-sites';
import { refTextContent } from '@src/utils/reactive-dom';
import { fixed0, percent0 } from '@src/utils/format';
import {
  capFulfillment,
  forecast,
  NEEDS,
  PerTier,
  requiredNeeds,
  supplyOf,
  TIERS,
} from '@src/core/population/engine';
import { t } from '@src/i18n';
import { watchEffectWhileNodeAlive } from '@src/utils/watch';
import { onNodeDisconnected } from '@src/utils/on-node-disconnected';

function toReport(r: PrunApi.PopulationReport) {
  return {
    timestamp: r.time.timestamp,
    explorersGrace: r.explorersGraceEnabled,
    population: r.nextPopulation as PerTier,
    happiness: r.averageHappiness as PerTier,
    unemployment: r.unemploymentRate as PerTier,
    openJobs: r.openJobs as PerTier,
    fulfillment: NEEDS.map(n => r.needFulfillment[n] ?? 0),
    program: r.governmentProgramType,
    shares: r.needFulfillments.map(x => ({
      source: x.infrastructureType,
      need: x.needType,
      fulfillment: x.fulfillment,
    })),
  };
}

interface NeedValue {
  value: number;
  // False when the value is a lower bound.
  exact: boolean;
}

function onTileReady(tile: PrunTile) {
  const planet = computed(() => planetsStore.find(tile.parameter));
  const population = computed(() =>
    populationsStore.getById(planet.value?.populationId ?? populationsStore.lastId.value),
  );
  const reports = computed(() => (population.value?.reports ?? []).map(toReport));
  const bases = computed(() => {
    const sites =
      planetSitesStore.getByNaturalId(planet.value?.naturalId) ??
      planetSitesStore.getById(planetSitesStore.lastPlanetId.value);
    return planetSitesStore.countBases(sites);
  });
  const levels = computed(() =>
    Object.fromEntries((population.value?.infrastructure ?? []).map(x => [x.ticker, x.level])),
  );

  // The shown report: the period number after "#" in the tile; the newest report otherwise.
  const tileText = refTextContent(tile.anchor);
  const index = computed(() => {
    const raw = population.value?.reports ?? [];
    const period = /#\s*(\d+)/.exec(tileText.value ?? '')?.[1];
    const found = period ? raw.findIndex(x => x.simulationPeriod === Number(period)) : -1;
    return found >= 0 ? found : raw.length - 1;
  });
  const report = computed(() => reports.value[index.value]);

  // Uncapped fulfillment of the shown week, and the expected fulfillment next week
  // with the same supply. The game measures a week against the previous population.
  const needs = computed(() => {
    const i = index.value;
    const list = reports.value;
    if (i < 1) {
      return undefined;
    }
    const current = list[i];
    const supply = supplyOf(current, list[i - 1].population, bases.value);
    const toValues = (required: number[]): NeedValue[] =>
      supply.map((s, n) =>
        n === 0
          ? { value: current.fulfillment[0], exact: true }
          : { value: s.supplied / required[n], exact: s.exact },
      );
    return {
      now: toValues(requiredNeeds(list[i - 1].population)),
      next: toValues(requiredNeeds(current.population)),
    };
  });

  const prediction = computed(() => {
    if (!needs.value) {
      return undefined;
    }
    // A lower bound means the supply is unknown: assume the current fulfillment holds.
    const nextFulfillment = capFulfillment(
      needs.value.next.map((x, n) =>
        x.exact ? x.value : Math.max(x.value, report.value.fulfillment[n]),
      ),
    );
    nextFulfillment[0] = report.value.fulfillment[0];
    return forecast(reports.value, index.value, nextFulfillment, levels.value);
  });

  const formatNeed = (x: NeedValue) =>
    Number.isFinite(x.value) ? (x.exact ? '' : '≥') + percent0(x.value) : '--';
  const signed = (x: number) => (Math.round(x) > 0 ? '+' : '') + fixed0(x);

  subscribe($$(tile.anchor, 'tr'), element => {
    const row = element as HTMLTableRowElement;
    // Skip the rows this feature adds.
    if (row.dataset.rpPopr) {
      return;
    }
    const label = row.cells[0]?.textContent?.trim() ?? '';
    const is = (text: string | undefined) => text !== undefined && label.startsWith(text);
    if (is(L.Population.report.unemployment())) {
      // Replace the rates with the number of unemployed people.
      addRow(row, row, undefined, i => {
        const r = report.value;
        const tier = TIERS[i];
        return r !== undefined
          ? fixed0(Math.max(0, r.unemployment[tier]) * r.population[tier])
          : '--';
      });
      row.classList.add(css.hidden);
      return;
    }
    if (is(L.Population.report.openJobs())) {
      addRow(row, row, t('popr.nextChange'), i => {
        const p = prediction.value;
        return p !== undefined ? signed(p[TIERS[i]].change) : '--';
      });
      return;
    }
    if (is(L.PopulationNeedsTable.NEED_FULFILLMENT())) {
      // Replace the capped values, and add the expected values for next week.
      const now = addRow(row, row, undefined, i =>
        needs.value !== undefined ? formatNeed(needs.value.now[i]) : '--',
      );
      addRow(row, now, t('popr.nextFulfillment'), i =>
        needs.value !== undefined ? formatNeed(needs.value.next[i]) : '--',
      );
      row.classList.add(css.hidden);
    }
  });
}

// Copies a game row, so the new row keeps the game's styles, and puts it after `after`.
// The copy goes away with the source row.
function addRow(
  source: HTMLTableRowElement,
  after: Element,
  label: string | undefined,
  value: (index: number) => string,
) {
  const copy = source.cloneNode(true) as HTMLTableRowElement;
  copy.dataset.rpPopr = '1';
  if (label !== undefined && copy.cells.length > 0) {
    copy.cells[0].textContent = label;
  }
  after.after(copy);
  const cells = Array.from(copy.cells).slice(1);
  watchEffectWhileNodeAlive(copy, () => {
    for (let i = 0; i < cells.length; i++) {
      setText(cells[i], value(i));
    }
  });
  onNodeDisconnected(source, () => copy.remove());
  return copy;
}

// Sets the text of the innermost element, so the game's inner styles stay.
function setText(cell: Element, text: string) {
  let target = cell;
  while (target.children.length === 1) {
    target = target.children[0];
  }
  target.textContent = text;
}

function init() {
  tiles.observe('POPR', onTileReady);
}

features.add(
  import.meta.url,
  init,
  'POPR: Shows unemployment as people, uncapped need fulfillment, need fulfillment next week, and the forecast population change.',
);
