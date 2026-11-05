<script setup lang="ts">
import MaterialIcon from '@src/components/MaterialIcon.vue';
import PrunButton from '@src/components/PrunButton.vue';
import SelectInput from '@src/components/forms/SelectInput.vue';
import BlacklistPanel from '@src/components/BlacklistPanel.vue';
import { extractReasons } from '@src/core/blacklist-reasons';
import { showBuffer } from '@src/infrastructure/prun-ui/buffers';
import { userData } from '@src/store/user-data';
import {
  extractionProfit,
  jumpsFrom,
  PlanetInfo,
  ResourceSite,
} from '@src/core/extraction/extraction';
import { exchangePrice, withPrice } from '@src/core/daily-profit/recipe-choice';
import { layoutText } from '@src/core/daily-profit/daily-profit';
import { formatProfit, profitClass } from '@src/core/daily-profit/profit-format';
import { useProfitData } from '@src/infrastructure/prunplanner/profit-data';
import { getLiveCogc, requestLiveCogc } from '@src/infrastructure/fio/planet-cogc';
import { cxStore } from '@src/infrastructure/fio/cx';
import { starsStore } from '@src/infrastructure/prun-api/data/stars';
import { stationsStore } from '@src/infrastructure/prun-api/data/stations';
import { getSystemLineFromAddress } from '@src/infrastructure/prun-api/data/addresses';
import { isHiddenResource, watchedPlanetsOf } from '@src/core/extraction/watched-planets';
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

// The daily profit when the material sells at the lowest offer of the exchange; undefined when
// nobody offers it there. The other prices stay the 7-day VWAP.
function profitAtAsk(ticker: string, site: ResourceSite, planet: PlanetInfo, code: string) {
  const ask = cxStore.fetched ? cxStore.prices.get(code)?.get(ticker)?.Ask : undefined;
  if (ask === undefined || ask === null) {
    return undefined;
  }
  const price = withPrice(exchangePrice(code), ticker, ask);
  return extractionProfit(profitData.data, ticker, site, planet, price).profit;
}

// Each resource: the planet with the highest daily profit, then the watched planets.
const resources = computed(() => {
  const d = data.value;
  if (!d) {
    return [];
  }
  const universe = exchangePrice('UNIVERSE');
  const tickers = Object.keys(d.resources)
    .filter(x => editing.value || !isHiddenResource(x))
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
    const ids = [best?.[0], ...watchedPlanetsOf(ticker)].filter(
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
        // At the current lowest offer (from the price file) of this exchange.
        profit: profitAtAsk(ticker, site, planet, code),
        jumps: jumpsTo(id, code),
      }));
      const base = extractionProfit(profitData.data, ticker, site, planet, universe);
      const output = base.output;
      return [
        {
          id,
          watched: watchedPlanetsOf(ticker).includes(id),
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
  return list;
});

// Click a column head to sort by it; click again to reverse.
type SortKey = 'name' | 'output' | 'volume' | 'profit';
const sortKey = ref<SortKey>('profit');
const sortDown = ref(true);

function sortBy(key: SortKey) {
  if (sortKey.value === key) {
    sortDown.value = !sortDown.value;
  } else {
    sortKey.value = key;
    sortDown.value = key !== 'name';
  }
}

function arrow(key: SortKey) {
  return sortKey.value === key ? (sortDown.value ? ' ▾' : ' ▴') : '';
}

type Resource = (typeof resources.value)[number];

function sortValue(r: Resource): number | undefined {
  switch (sortKey.value) {
    case 'output':
      return r.top?.row.output;
    case 'volume':
      return r.volume;
    case 'profit':
      return r.top?.cell.profit;
    default:
      return undefined;
  }
}

// Resources without a value go last in both directions.
const sorted = computed(() => {
  const sign = sortDown.value ? -1 : 1;
  return [...resources.value].sort((a, b) => {
    if (sortKey.value === 'name') {
      return sign * a.name.localeCompare(b.name);
    }
    const x = sortValue(a);
    const y = sortValue(b);
    if (x === undefined || y === undefined) {
      return x === y ? 0 : x === undefined ? 1 : -1;
    }
    return sign * (x - y);
  });
});

const open = ref(new Set<string>());

// Edit mode: add and remove watched planets, hide and show resources.
const editing = ref(false);
const adding = ref<Record<string, string>>({});

function isOpen(ticker: string) {
  return editing.value || open.value.has(ticker);
}

function removePlanet(ticker: string, id: string) {
  userData.extract.planets[ticker] = watchedPlanetsOf(ticker).filter(x => x !== id);
}

// The input holds "Name (ID)" or an ID.
function addPlanet(ticker: string) {
  const text = (adding.value[ticker] ?? '').trim();
  const id = /\(([^)]+)\)\s*[\d.]*$/.exec(text)?.[1] ?? text;
  const site = data.value?.resources[ticker]?.find(x => x[0].toUpperCase() === id.toUpperCase());
  if (site && !watchedPlanetsOf(ticker).includes(site[0])) {
    userData.extract.planets[ticker] = [...watchedPlanetsOf(ticker), site[0]];
  }
  adding.value = { ...adding.value, [ticker]: '' };
}

// Hiding a resource puts it on the blacklist with the picked reason.
const reasons = extractReasons();
const pickReason = ref(reasons[0].id);
const showBlacklist = ref(false);
const blacklist = computed(() =>
  Object.fromEntries(
    userData.extract.hidden.map(x => [x, userData.extract.hiddenReasons[x] ?? reasons[0].id]),
  ),
);

function toggleHidden(ticker: string) {
  const hidden = userData.extract.hidden;
  if (hidden.includes(ticker)) {
    unhide(ticker);
  } else {
    userData.extract.hidden = [...hidden, ticker];
    userData.extract.hiddenReasons[ticker] = pickReason.value;
  }
}

function unhide(ticker: string) {
  userData.extract.hidden = userData.extract.hidden.filter(x => x !== ticker);
  delete userData.extract.hiddenReasons[ticker];
}

// Planets with the resource, the richest first, as "Name (ID) factor".
function candidates(ticker: string) {
  const sites = [...(data.value?.resources[ticker] ?? [])].sort((a, b) => b[2] - a[2]);
  return sites.slice(0, 200).map(x => {
    const name = planetInfo(x[0])?.name ?? '';
    return `${name !== '' ? name + ' ' : ''}(${x[0]}) ${x[2].toFixed(3)}`;
  });
}

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
    <div :class="$style.toolbar">
      <template v-if="editing">
        <span :class="$style.muted">{{ t('bl.reason') }}</span>
        <SelectInput
          v-model="pickReason"
          :options="reasons.map(x => ({ label: x.label, value: x.id }))" />
      </template>
      <PrunButton dark inline @click="showBlacklist = !showBlacklist">{{
        t('bl.title')
      }}</PrunButton>
      <PrunButton dark inline @click="editing = !editing">
        {{ editing ? t('extract.done') : t('extract.edit') }}
      </PrunButton>
    </div>
    <BlacklistPanel v-if="showBlacklist" :entries="blacklist" :reasons="reasons" @remove="unhide" />
    <p v-if="resources.length === 0" :class="$style.muted">{{ t('extract.loading') }}</p>
    <div v-if="resources.length > 0" :class="[$style.top, $style.head]">
      <span :class="$style.sort" @click="sortBy('name')"
        >{{ t('extract.headMaterial') }}{{ arrow('name') }}</span
      >
      <span>{{ t('extract.headPlanet') }}</span>
      <span :class="$style.num">
        <span :class="$style.sort" @click="sortBy('output')"
          >{{ t('extract.headOutput') }}{{ arrow('output') }}</span
        >
        /
        <span :class="$style.sort" @click="sortBy('volume')"
          >{{ t('extract.headVolume') }}{{ arrow('volume') }}</span
        >
      </span>
      <span :class="[$style.cellHead, $style.sort]" @click="sortBy('profit')"
        >{{ t('extract.headProfit') }}{{ arrow('profit') }}</span
      >
    </div>
    <div v-for="r in sorted" :key="r.ticker" :class="$style.resource">
      <div :class="[$style.top, $style.clickable]" @click="toggle(r.ticker)">
        <span :class="$style.resourceName">
          <span :class="$style.arrow">{{ isOpen(r.ticker) ? '▾' : '▸' }}</span>
          <span :class="$style.iconLink" @click.stop
            ><MaterialIcon size="inline-table" :ticker="r.ticker"
          /></span>
          <span :class="[$style.name, isHiddenResource(r.ticker) ? $style.hiddenName : undefined]">
            {{ r.name }}
          </span>
          <PrunButton v-if="editing" dark inline @click.stop="toggleHidden(r.ticker)">
            {{ isHiddenResource(r.ticker) ? t('extract.show') : t('extract.hide') }}
          </PrunButton>
        </span>
        <template v-if="r.top">
          <span>
            <span
              :class="[$style.name, $style.planet]"
              @click.stop="showBuffer(`PLI ${r.top.row.id}`)"
              >{{ r.top.row.name }}</span
            >
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
      <template v-if="isOpen(r.ticker)">
        <div v-for="p in r.rows" :key="p.id" :class="$style.row">
          <span>
            <PrunButton
              v-if="editing && p.watched"
              dark
              inline
              @click="removePlanet(r.ticker, p.id)">
              ×
            </PrunButton>
            <span :class="[$style.name, $style.planet]" @click="showBuffer(`PLI ${p.id}`)">{{
              p.name
            }}</span>
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
        <form v-if="editing" :class="$style.add" @submit.prevent="addPlanet(r.ticker)">
          <input
            v-model="adding[r.ticker]"
            :class="$style.input"
            :list="`extract-planets-${r.ticker}`"
            :placeholder="t('extract.addPlaceholder')" />
          <datalist :id="`extract-planets-${r.ticker}`">
            <option v-for="c in candidates(r.ticker)" :key="c" :value="c" />
          </datalist>
          <PrunButton dark inline @click="addPlanet(r.ticker)">{{ t('extract.add') }}</PrunButton>
        </form>
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

.iconLink {
  display: inline-flex;
}

.planet {
  cursor: pointer;
}

.planet:hover {
  text-decoration: underline;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
  justify-content: flex-end;
  padding-bottom: 4px;
}

.hiddenName {
  opacity: 0.4;
  text-decoration: line-through;
}

.add {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-left: 24px;
  padding: 4px;
}

.input {
  width: 260px;
  padding: 2px 6px;
  border: 1px solid #3a3a3a;
  background-color: #252525;
  color: #eee;
  font: inherit;
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

.head {
  color: #8c8c8c;
  background-color: transparent;
}

.sort {
  cursor: pointer;
}

.cellHead {
  text-align: center;
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
