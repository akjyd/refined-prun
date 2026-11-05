<script setup lang="ts">
import MaterialIcon from '@src/components/MaterialIcon.vue';
import PrunButton from '@src/components/PrunButton.vue';
import SelectInput from '@src/components/forms/SelectInput.vue';
import { arbitrage, ArbitrageMode, unitsPerShip } from '@src/core/arbitrage';
import { jumpsFrom } from '@src/core/extraction/extraction';
import { shipSizes } from '@src/core/ship-sizes';
import { fioBooks, loadFioBooks } from '@src/infrastructure/fio/exchange-full';
import { cxStore } from '@src/infrastructure/fio/cx';
import { materialsStore } from '@src/infrastructure/prun-api/data/materials';
import { starsStore } from '@src/infrastructure/prun-api/data/stars';
import { stationsStore } from '@src/infrastructure/prun-api/data/stations';
import { getSystemLineFromAddress } from '@src/infrastructure/prun-api/data/addresses';
import { showBuffer } from '@src/infrastructure/prun-ui/buffers';
import { userData } from '@src/store/user-data';
import { timestampEachMinute } from '@src/utils/dayjs';
import { fixed0, fixed02, percent1 } from '@src/utils/format';
import { formatProfit } from '@src/core/daily-profit/profit-format';
import { t } from '@src/i18n';

const $style = useCssModule();

const EXCHANGES = ['AI1', 'CI1', 'IC1', 'NC1'];
const ROUTES = EXCHANGES.flatMap(a => EXCHANGES.filter(b => b !== a).map(b => `${a}>${b}`));

const mode = ref<ArbitrageMode>('now');
const route = ref('all');
const shipId = ref(shipSizes[0].id);
const ship = computed(() => shipSizes.find(x => x.id === shipId.value) ?? shipSizes[0]);

onMounted(() => {
  if (Date.now() - fioBooks.loadedAt > 5 * 60_000) {
    void loadFioBooks();
  }
});

// Jumps between the exchange stations.
const jumps = computed(() => {
  const stars = starsStore.all.value;
  if (!stars) {
    return undefined;
  }
  const connections = new Map(stars.map(x => [x.systemId, x.connections]));
  const systemOf = (code: string) => {
    const station = stationsStore.all.value?.find(x => x.comex.code === code);
    const natural = getSystemLineFromAddress(station?.address)?.entity.naturalId;
    return starsStore.getByNaturalId(natural)?.systemId;
  };
  const result = new Map<string, number>();
  for (const a of EXCHANGES) {
    const from = systemOf(a);
    if (from === undefined) {
      continue;
    }
    const map = jumpsFrom(from, connections);
    for (const b of EXCHANGES) {
      const to = systemOf(b);
      const d = to !== undefined ? map.get(to) : undefined;
      if (d !== undefined) {
        result.set(`${a}>${b}`, d);
      }
    }
  }
  return result;
});

// Skip materials without trades in the last 7 days on either exchange.
function tradedOn(ticker: string, code: string) {
  return (cxStore.fetched ? (cxStore.prices.get(code)?.get(ticker)?.Traded7D ?? 0) : 0) > 0;
}

interface Row {
  key: string;
  ticker: string;
  from: string;
  to: string;
  buy: number;
  sell: number;
  spread: number;
  units: number;
  profit: number;
  timeA?: number;
  timeB?: number;
}

const allRows = computed(() => {
  const books = fioBooks.books;
  const rows: Row[] = [];
  for (const material of materialsStore.all.value ?? []) {
    const ticker = material.ticker;
    const capacity = unitsPerShip(material.weight, material.volume, ship.value);
    for (const r of ROUTES) {
      const [from, to] = r.split('>');
      const a = books.get(`${ticker}.${from}`);
      const b = books.get(`${ticker}.${to}`);
      if (!a || !b || !tradedOn(ticker, from) || !tradedOn(ticker, to)) {
        continue;
      }
      const result = arbitrage(a.asks, b.bids, b.asks, mode.value, capacity);
      if (!result || result.units <= 0 || result.profit <= 0) {
        continue;
      }
      rows.push({
        key: `${mode.value}:${ticker}.${r}`,
        ticker,
        from,
        to,
        ...result,
        timeA: a.time,
        timeB: b.time,
      });
    }
  }
  return rows.sort((x, y) => y.spread - x.spread);
});

const rows = computed(() =>
  route.value === 'all'
    ? allRows.value
    : allRows.value.filter(x => `${x.from}>${x.to}` === route.value),
);

// Remember when each spread was first seen; forget spreads that are gone. Updated per FIO load.
watch(
  () => fioBooks.loadedAt,
  () => {
    const now = Date.now();
    const seen = userData.arbSeen;
    const next: Record<string, number> = {};
    for (const row of allRows.value) {
      next[row.key] = seen[row.key] ?? now;
    }
    // Keep the other mode's entries.
    for (const [key, value] of Object.entries(seen)) {
      if (!key.startsWith(`${mode.value}:`) && value !== undefined) {
        next[key] = value;
      }
    }
    userData.arbSeen = next;
  },
);

function age(time: number | undefined) {
  if (time === undefined) {
    return '--';
  }
  const minutes = Math.max(0, (timestampEachMinute.value - time) / 60_000);
  if (minutes < 60) {
    return t('arb.minutes', fixed0(minutes));
  }
  if (minutes < 48 * 60) {
    return t('arb.hours', fixed0(minutes / 60));
  }
  return t('arb.days', fixed0(minutes / 1440));
}

function open(row: Row) {
  void showBuffer(`CXOB ${row.ticker}.${row.from}`);
  void showBuffer(`CXOB ${row.ticker}.${row.to}`);
}

const modes: { id: ArbitrageMode; key: 'arb.now' | 'arb.listed' }[] = [
  { id: 'now', key: 'arb.now' },
  { id: 'listed', key: 'arb.listed' },
];
</script>

<template>
  <div :class="$style.root">
    <div :class="$style.bar">
      <span
        v-for="m in modes"
        :key="m.id"
        :class="[$style.tab, m.id === mode ? $style.tabOn : undefined]"
        @click="mode = m.id">
        {{ t(m.key) }}
      </span>
      <span :class="$style.muted">{{ t('arb.ship') }}</span>
      <SelectInput
        v-model="shipId"
        :options="shipSizes.map(x => ({ label: x.label, value: x.id }))" />
      <span :class="$style.spacer" />
      <span :class="$style.muted">
        {{
          fioBooks.loading ? t('arb.loading') : t('arb.loaded', age(fioBooks.loadedAt || undefined))
        }}
      </span>
      <PrunButton dark inline :disabled="fioBooks.loading" @click="loadFioBooks()">↻</PrunButton>
    </div>
    <div :class="$style.bar">
      <span
        :class="[$style.tab, route === 'all' ? $style.tabOn : undefined]"
        @click="route = 'all'">
        {{ t('arb.allRoutes') }}
      </span>
      <span
        v-for="r in ROUTES"
        :key="r"
        :class="[$style.tab, r === route ? $style.tabOn : undefined]"
        @click="route = r">
        {{ r.replace('>', ' → ') }}
      </span>
    </div>
    <p v-if="fioBooks.error" :class="$style.muted">{{ t('arb.error', fioBooks.error) }}</p>
    <div :class="[$style.row, $style.head]">
      <span>{{ t('arb.material') }}</span>
      <span>{{ t('arb.route') }}</span>
      <span :class="$style.num">{{ t('arb.buy') }}</span>
      <span :class="$style.num">{{ t('arb.sell') }}</span>
      <span :class="$style.num">{{ t('arb.spread') }}</span>
      <span :class="$style.num">{{ t('arb.units') }}</span>
      <span :class="$style.num">{{ t('arb.profit') }}</span>
      <span :class="$style.num">{{ t('arb.jumps') }}</span>
      <span :class="$style.num">{{ t('arb.fioTime') }}</span>
      <span :class="$style.num">{{ t('arb.lasting') }}</span>
      <span />
    </div>
    <div v-for="r in rows" :key="r.key" :class="$style.row">
      <span :class="$style.icon"><MaterialIcon size="inline-table" :ticker="r.ticker" /></span>
      <span :class="$style.name">{{ r.from }} → {{ r.to }}</span>
      <span :class="$style.num">{{ fixed02(r.buy) }}</span>
      <span :class="$style.num">{{ fixed02(r.sell) }}</span>
      <span :class="[$style.num, $style.spreadValue]">{{ percent1(r.spread) }}</span>
      <span :class="$style.num">{{ Number.isFinite(r.units) ? fixed0(r.units) : '∞' }}</span>
      <span :class="[$style.num, $style.name]">{{ formatProfit(r.profit) }}</span>
      <span :class="$style.num">{{ jumps?.get(`${r.from}>${r.to}`) ?? '--' }}</span>
      <span :class="[$style.num, $style.muted]">{{ age(r.timeA) }} / {{ age(r.timeB) }}</span>
      <span :class="[$style.num, $style.muted]">{{ age(userData.arbSeen[r.key]) }}</span>
      <span :class="$style.num">
        <PrunButton dark inline @click="open(r)">{{ t('arb.look') }}</PrunButton>
      </span>
    </div>
  </div>
</template>

<style module>
.root {
  min-width: 960px;
  padding: 6px 8px;
  font-variant-numeric: tabular-nums;
}

.bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 6px;
  margin-bottom: 6px;
}

.tab {
  padding: 3px 8px;
  background-color: #2a2a2a;
  cursor: pointer;
}

.tabOn {
  background-color: #f7a600;
  color: #1e1e1e;
}

.spacer {
  flex: 1;
}

.row {
  display: grid;
  grid-template-columns: 50px 100px 80px 80px 64px 70px 80px 44px 110px 64px 50px;
  gap: 0 8px;
  align-items: center;
  padding: 3px 4px;
  border-top: 1px solid #2c2c2c;
}

.head {
  color: #8c8c8c;
  border-top: none;
}

.icon {
  display: inline-flex;
}

.name {
  color: #eee;
}

.num {
  text-align: right;
}

.spreadValue {
  color: #f7a600;
}

.muted {
  color: #8c8c8c;
}
</style>
