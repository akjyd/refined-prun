<script setup lang="ts">
import MaterialIcon from '@src/components/MaterialIcon.vue';
import PrunButton from '@src/components/PrunButton.vue';
import SelectInput from '@src/components/forms/SelectInput.vue';
import { arbitrage, ArbitrageMode, unitsPerShip } from '@src/core/arbitrage';
import { shipSizes } from '@src/core/ship-sizes';
import { fioBooks, loadFioBooks } from '@src/infrastructure/fio/exchange-full';
import { cxStore } from '@src/infrastructure/fio/cx';
import { materialsStore } from '@src/infrastructure/prun-api/data/materials';
import { HiddenOrderBooks } from '@src/infrastructure/prun-ui/hidden-order-books';
import PriceLadder from '@src/features/XIT/CX4/PriceLadder.vue';
import BlacklistPanel from '@src/components/BlacklistPanel.vue';
import { arbReasons } from '@src/core/blacklist-reasons';
import { userData } from '@src/store/user-data';
import { timestampEachMinute } from '@src/utils/dayjs';
import { fixed0, fixed02, percent1 } from '@src/utils/format';
import { formatProfit } from '@src/core/daily-profit/profit-format';
import { t } from '@src/i18n';

const $style = useCssModule();

const EXCHANGES = ['AI1', 'CI1', 'IC1', 'NC1'];
const ROUTES = EXCHANGES.flatMap(a => EXCHANGES.filter(b => b !== a).map(b => `${a}>${b}`));

const mode = ref<ArbitrageMode>('now');
const start = ref('all');
const end = ref('all');
const shipId = ref(shipSizes[0].id);
const ship = computed(() => shipSizes.find(x => x.id === shipId.value) ?? shipSizes[0]);
const exchangeOptions = computed(() => [
  { label: t('arb.any'), value: 'all' },
  ...EXCHANGES.map(x => ({ label: x, value: x })),
]);

onMounted(() => {
  if (Date.now() - fioBooks.loadedAt > 5 * 60_000) {
    void loadFioBooks();
  }
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
      if (
        !a ||
        !b ||
        ticker in userData.arbBlacklist ||
        !tradedOn(ticker, from) ||
        !tradedOn(ticker, to)
      ) {
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
  return rows;
});

type SortKey = 'spread' | 'units' | 'profit' | 'buy' | 'sell' | 'seen';
const sortKey = ref<SortKey>('profit');
const sortDown = ref(true);

function sortBy(key: SortKey) {
  if (sortKey.value === key) {
    sortDown.value = !sortDown.value;
  } else {
    sortKey.value = key;
    sortDown.value = true;
  }
}

function sortValue(row: Row) {
  if (sortKey.value === 'seen') {
    return -(userData.arbSeen[row.key] ?? Date.now());
  }
  return row[sortKey.value];
}

function arrow(key: SortKey) {
  return sortKey.value === key ? (sortDown.value ? ' ▾' : ' ▴') : '';
}

const rows = computed(() => {
  const list = allRows.value.filter(
    x =>
      (start.value === 'all' || x.from === start.value) &&
      (end.value === 'all' || x.to === end.value),
  );
  const sign = sortDown.value ? -1 : 1;
  return list.sort((a, b) => sign * (sortValue(a) - sortValue(b)));
});

// Blacklist: the materials you left out, by reason, and the ones without trades.
const showBlacklist = ref(false);
const reasons = arbReasons();
const pickReason = ref(reasons[0].id);
const automatic = computed(() => [
  {
    label: t('bl.auto7d'),
    tickers: (materialsStore.all.value ?? [])
      .map(x => x.ticker)
      .filter(x => !(x in userData.arbBlacklist) && EXCHANGES.every(code => !tradedOn(x, code)))
      .sort(),
  },
]);

function blacklist(ticker: string) {
  userData.arbBlacklist[ticker] = pickReason.value;
  open.value = undefined;
}

function unblacklist(ticker: string) {
  delete userData.arbBlacklist[ticker];
}

// Click a row to see both live order books.
const open = ref<string>();
const books = new HiddenOrderBooks();
watch(open, key => {
  const row = allRows.value.find(x => x.key === key);
  void books.show(row ? [`${row.ticker}.${row.from}`, `${row.ticker}.${row.to}`] : []);
});
onUnmounted(() => books.close());

function toggle(row: Row) {
  open.value = open.value === row.key ? undefined : row.key;
}

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
      <span :class="$style.muted">{{ t('arb.from') }}</span>
      <SelectInput v-model="start" :options="exchangeOptions" />
      <span :class="$style.muted">{{ t('arb.to') }}</span>
      <SelectInput v-model="end" :options="exchangeOptions" />
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
      <PrunButton dark inline @click="showBlacklist = !showBlacklist">{{
        t('bl.title')
      }}</PrunButton>
    </div>
    <BlacklistPanel
      v-if="showBlacklist"
      :entries="userData.arbBlacklist"
      :reasons="reasons"
      :automatic="automatic"
      @remove="unblacklist" />
    <p v-if="fioBooks.error" :class="$style.muted">{{ t('arb.error', fioBooks.error) }}</p>
    <div :class="[$style.row, $style.head]">
      <span>{{ t('arb.material') }}</span>
      <span>{{ t('arb.route') }}</span>
      <span :class="[$style.num, $style.sort]" @click="sortBy('buy')"
        >{{ t('arb.buy') }}{{ arrow('buy') }}</span
      >
      <span :class="[$style.num, $style.sort]" @click="sortBy('sell')"
        >{{ t('arb.sell') }}{{ arrow('sell') }}</span
      >
      <span :class="[$style.num, $style.sort]" @click="sortBy('spread')"
        >{{ t('arb.spread') }}{{ arrow('spread') }}</span
      >
      <span :class="[$style.num, $style.sort]" @click="sortBy('units')"
        >{{ t('arb.units') }}{{ arrow('units') }}</span
      >
      <span :class="[$style.num, $style.sort]" @click="sortBy('profit')"
        >{{ t('arb.profit') }}{{ arrow('profit') }}</span
      >
      <span :class="[$style.num, $style.sort]" @click="sortBy('seen')"
        >{{ t('arb.lasting') }}{{ arrow('seen') }}</span
      >
    </div>
    <template v-for="r in rows" :key="r.key">
      <div :class="[$style.row, $style.clickable]" @click="toggle(r)">
        <span :class="$style.icon" @click.stop
          ><MaterialIcon size="inline-table" :ticker="r.ticker"
        /></span>
        <span :class="$style.name">{{ r.from }} → {{ r.to }}</span>
        <span :class="$style.num">{{ fixed02(r.buy) }}</span>
        <span :class="$style.num">{{ fixed02(r.sell) }}</span>
        <span :class="$style.num">{{ percent1(r.spread) }}</span>
        <span :class="$style.num">{{ Number.isFinite(r.units) ? fixed0(r.units) : '∞' }}</span>
        <span :class="[$style.num, $style.name]">{{ formatProfit(r.profit) }}</span>
        <span :class="[$style.num, $style.muted]">{{ age(userData.arbSeen[r.key]) }}</span>
      </div>
      <div v-if="open === r.key" :class="$style.details">
        <div :class="$style.bar">
          <span :class="$style.muted">
            {{ t('arb.fioAge', r.from, age(r.timeA), r.to, age(r.timeB)) }}
          </span>
          <span :class="$style.spacer" />
          <SelectInput
            v-model="pickReason"
            :options="reasons.map(x => ({ label: x.label, value: x.id }))" />
          <PrunButton dark inline @click="blacklist(r.ticker)">{{ t('bl.add') }}</PrunButton>
        </div>
        <PriceLadder :ticker="r.ticker" :exchanges="[r.from, r.to]" />
      </div>
    </template>
  </div>
</template>

<style module>
.root {
  min-width: 760px;
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
  grid-template-columns: 50px 100px 90px 90px 70px 80px 90px 80px;
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

.sort {
  cursor: pointer;
}

.clickable {
  cursor: pointer;
}

.details {
  padding: 6px 4px 10px;
  border-top: 1px solid #2c2c2c;
}

.muted {
  color: #8c8c8c;
}
</style>
