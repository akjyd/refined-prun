<script setup lang="ts">
import MaterialIcon from '@src/components/MaterialIcon.vue';
import {
  extractionProfit,
  jumpsFrom,
  PlanetInfo,
  ResourceSite,
} from '@src/core/extraction/extraction';
import { exchangePrice } from '@src/core/daily-profit/recipe-choice';
import { layoutText } from '@src/core/daily-profit/daily-profit';
import { formatProfit, profitClass } from '@src/core/daily-profit/profit-format';
import { useProfitData } from '@src/infrastructure/prunplanner/profit-data';
import { getLiveCogc, requestLiveCogc } from '@src/infrastructure/fio/planet-cogc';
import { cxStore } from '@src/infrastructure/fio/cx';
import { starsStore } from '@src/infrastructure/prun-api/data/stars';
import { stationsStore } from '@src/infrastructure/prun-api/data/stations';
import { getSystemLineFromAddress } from '@src/infrastructure/prun-api/data/addresses';
import { hiddenResources, watchedPlanets } from '@src/core/extraction/watched-planets';
import { getMaterialNameByTicker } from '@src/util';
import { fixed0 } from '@src/utils/format';
import { t } from '@src/i18n';

const $style = useCssModule();

type Key = Parameters<typeof t>[0];

const EXCHANGES = ['AI1', 'CI1', 'IC1', 'NC1'];

interface ExtractionData {
  resources: Record<string, ResourceSite[]>;
  // Name, rocky (1/0), gravity, pressure, temperature, COGC.
  planets: Record<string, [string, number, number, number, number, string]>;
}

const data = shallowRef<ExtractionData>();
const profitData = useProfitData();

onMounted(async () => {
  const module = await import('@src/core/extraction/extraction-data.json');
  data.value = module.default as unknown as ExtractionData;
});

function planetInfo(id: string): PlanetInfo | undefined {
  const p = data.value?.planets[id];
  if (!p) {
    return undefined;
  }
  const [name, rocky, gravity, pressure, temperature, cogc] = p;
  return {
    name,
    rocky: rocky === 1,
    gravity,
    pressure,
    temperature,
    cogc: getLiveCogc(id) ?? cogc,
  };
}

// Jumps from each exchange station, by system id.
const jumps = computed(() => {
  const stars = starsStore.all.value;
  if (!stars) {
    return undefined;
  }
  const connections = new Map(stars.map(x => [x.systemId, x.connections]));
  const result = new Map<string, Map<string, number>>();
  for (const code of EXCHANGES) {
    const station = stationsStore.all.value?.find(x => x.comex.code === code);
    const system = getSystemLineFromAddress(station?.address)?.entity.naturalId;
    const star = starsStore.getByNaturalId(system);
    if (star) {
      result.set(code, jumpsFrom(star.systemId, connections));
    }
  }
  return result;
});

function jumpsTo(planet: string, code: string) {
  const star = starsStore.getByPlanetNaturalId(planet);
  return star ? jumps.value?.get(code)?.get(star.systemId) : undefined;
}

// 30-day traded units ÷ 30, averaged over the four exchanges.
function dailyVolume(ticker: string) {
  if (!cxStore.fetched) {
    return undefined;
  }
  const traded = EXCHANGES.map(x => cxStore.prices.get(x)?.get(ticker)?.Traded30D ?? 0);
  return sumBy(traded, x => x) / traded.length / 30;
}

// Each resource: the planet with the highest daily profit, then the watched planets.
const resources = computed(() => {
  const d = data.value;
  if (!d) {
    return [];
  }
  const universe = exchangePrice('UNIVERSE');
  const tickers = Object.keys(d.resources)
    .filter(x => !hiddenResources.has(x))
    .sort();
  const list = tickers.map(ticker => {
    const sites = d.resources[ticker];
    let best: ResourceSite | undefined;
    let bestProfit = -Infinity;
    for (const site of sites) {
      const planet = planetInfo(site[0]);
      if (!planet) {
        continue;
      }
      const profit = extractionProfit(profitData.data, ticker, site, planet, universe).profit;
      if (profit !== undefined && profit > bestProfit) {
        best = site;
        bestProfit = profit;
      }
    }
    const ids = [best?.[0], ...(watchedPlanets[ticker] ?? [])].filter(
      (x, i, all): x is string => x !== undefined && all.indexOf(x) === i,
    );
    const volume = dailyVolume(ticker);
    const rows = ids.flatMap(id => {
      const site = sites.find(x => x[0] === id);
      const planet = planetInfo(id);
      if (!site || !planet) {
        return [];
      }
      const cells = EXCHANGES.map(code => ({
        code,
        profit: extractionProfit(profitData.data, ticker, site, planet, exchangePrice(code)).profit,
        jumps: jumpsTo(id, code),
      }));
      const base = extractionProfit(profitData.data, ticker, site, planet, universe);
      const output = base.output;
      return [
        {
          id,
          name: planet.name !== '' ? planet.name : id,
          cogc: planet.cogc,
          layout: layoutText(profitData.data, base.building, base.count),
          output,
          tooMuch: volume !== undefined && output > volume,
          cells,
        },
      ];
    });
    // The highest daily profit over all shown planets and exchanges.
    let top:
      | { row: (typeof rows)[number]; cell: (typeof rows)[number]['cells'][number] }
      | undefined;
    for (const row of rows) {
      for (const cell of row.cells) {
        if (cell.profit !== undefined && (top === undefined || cell.profit > top.cell.profit!)) {
          top = { row, cell };
        }
      }
    }
    return { ticker, name: getMaterialNameByTicker(ticker) ?? ticker, volume, rows, top };
  });
  return list.sort((a, b) => (b.top?.cell.profit ?? -Infinity) - (a.top?.cell.profit ?? -Infinity));
});

const open = ref(new Set<string>());

function toggle(ticker: string) {
  const next = new Set(open.value);
  if (next.has(ticker)) {
    next.delete(ticker);
  } else {
    next.add(ticker);
  }
  open.value = next;
}

watchEffect(() => {
  requestLiveCogc(resources.value.flatMap(x => x.rows.map(r => r.id)));
});

function cogcName(cogc: string) {
  return cogc === '' ? '' : t(`extract.cogc.${cogc}` as Key);
}
</script>

<template>
  <div :class="$style.root">
    <p v-if="resources.length === 0" :class="$style.muted">{{ t('extract.loading') }}</p>
    <div v-for="r in resources" :key="r.ticker" :class="$style.resource">
      <div :class="[$style.top, $style.clickable]" @click="toggle(r.ticker)">
        <span :class="$style.resourceName">
          <span :class="$style.arrow">{{ open.has(r.ticker) ? '▾' : '▸' }}</span>
          <span :class="$style.icon"><MaterialIcon size="inline-table" :ticker="r.ticker" /></span>
          <span :class="$style.name">{{ r.name }}</span>
        </span>
        <template v-if="r.top">
          <span>
            <span :class="$style.name">{{ r.top.row.name }}</span>
            <span :class="$style.muted"> {{ cogcName(r.top.row.cogc) }}</span>
            <span :class="$style.layout">{{ r.top.row.layout }}</span>
          </span>
          <span :class="$style.num">
            <span :class="r.top.row.tooMuch ? C.ColoredValue.negative : $style.name">
              {{ fixed0(r.top.row.output) }}
            </span>
            <span :class="$style.muted">
              / {{ r.volume !== undefined ? fixed0(r.volume) : '--' }}
            </span>
          </span>
          <span :class="$style.cell">
            <span :class="$style.muted">{{ r.top.cell.code }}</span>
            <span :class="profitClass(r.top.cell.profit)">{{
              formatProfit(r.top.cell.profit)
            }}</span>
            <span :class="$style.muted">
              · {{ r.top.cell.jumps !== undefined ? t('extract.jumps', r.top.cell.jumps) : '--' }}
            </span>
          </span>
        </template>
      </div>
      <template v-if="open.has(r.ticker)">
        <div v-for="p in r.rows" :key="p.id" :class="$style.row">
          <span>
            <span :class="$style.name">{{ p.name }}</span>
            <span :class="$style.muted"> {{ cogcName(p.cogc) }}</span>
            <span :class="$style.layout">{{ p.layout }}</span>
          </span>
          <span :class="$style.num">
            <span :class="p.tooMuch ? C.ColoredValue.negative : $style.name">
              {{ fixed0(p.output) }}
            </span>
            <span :class="$style.muted">
              / {{ r.volume !== undefined ? fixed0(r.volume) : '--' }}
            </span>
          </span>
          <span v-for="c in p.cells" :key="c.code" :class="$style.cell">
            <span :class="$style.muted">{{ c.code }}</span>
            <span :class="profitClass(c.profit)">{{ formatProfit(c.profit) }}</span>
            <span :class="$style.muted">
              · {{ c.jumps !== undefined ? t('extract.jumps', c.jumps) : '--' }}
            </span>
          </span>
        </div>
      </template>
    </div>
  </div>
</template>

<style module>
.root {
  min-width: 900px;
  padding: 6px 8px;
  font-size: 13px;
}

.row {
  display: grid;
  grid-template-columns: 190px 120px repeat(4, minmax(130px, 1fr));
  margin-left: 24px;
  gap: 0 8px;
  align-items: center;
  padding: 4px 4px;
  border-top: 1px solid #2c2c2c;
}

.top {
  display: grid;
  grid-template-columns: 170px 200px 120px 160px;
  gap: 0 8px;
  align-items: center;
  padding: 4px;
  background-color: #252525;
}

.clickable {
  cursor: pointer;
}

.resourceName {
  display: flex;
  align-items: center;
  gap: 6px;
}

.arrow {
  width: 10px;
  color: #8c8c8c;
}

.resource {
  margin-top: 6px;
  border-top: 1px solid #3a3a3a;
}

.title {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px;
  background-color: #252525;
}

.icon {
  display: inline-flex;
  pointer-events: none;
}

.name {
  color: #eee;
}

.muted {
  color: #8c8c8c;
}

.layout {
  display: block;
  color: #8c8c8c;
  font-size: 12px;
}

.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.cell {
  display: flex;
  justify-content: center;
  gap: 4px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
</style>
