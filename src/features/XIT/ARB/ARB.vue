<script setup lang="ts">
import MaterialIcon from '@src/components/MaterialIcon.vue';
import PrunButton from '@src/components/PrunButton.vue';
import ChipGroup from '@src/components/ChipGroup.vue';
import { arbitrage, ArbitrageMode, unitsPerShip } from '@src/core/arbitrage';
import { shipSizes } from '@src/core/ship-sizes';
import { fioBooks, loadFioBooks } from '@src/infrastructure/fio/exchange-full';
import { cxStore } from '@src/infrastructure/fio/cx';
import { materialsStore } from '@src/infrastructure/prun-api/data/materials';
import { HiddenOrderBooks } from '@src/infrastructure/prun-ui/hidden-order-books';
import ArbDepth from '@src/features/XIT/ARB/ArbDepth.vue';
import { ageText } from '@src/features/XIT/ARB/age';
import BlacklistPanel from '@src/components/BlacklistPanel.vue';
import { arbReasons } from '@src/core/blacklist-reasons';
import { userData } from '@src/store/user-data';
import { percent1 } from '@src/utils/format';
import { formatProfit } from '@src/core/daily-profit/profit-format';
import { dailyVolatility, flightDays, safetyMultiple } from '@src/core/volatility';
import { dailyCloses, requestCloses } from '@src/infrastructure/fio/cxpc';
import { fixed0, fixed01 } from '@src/utils/format';
import { t } from '@src/i18n';

const $style = useCssModule();

const EXCHANGES = ['AI1', 'CI1', 'IC1', 'NC1'];
const ROUTES = EXCHANGES.flatMap(a => EXCHANGES.filter(b => b !== a).map(b => `${a}>${b}`));
// Trades that make less than this do not pay for the flight (player, 2026-11-05).
const MIN_PROFIT = 30_000;

const exchangeChips = EXCHANGES.map(x => ({ value: x, label: x }));

const mode = ref<ArbitrageMode>('now');
const modeChips = computed(() => [
  { value: 'now' as const, label: t('arb.now') },
  { value: 'listed' as const, label: t('arb.listed') },
]);

// Route: all, or the start and end exchanges you pick (several of each). No pick on a side
// means any exchange on that side.
const routeMode = ref<'all' | 'custom'>('all');
const routeChips = computed(() => [
  { value: 'all' as const, label: t('arb.any') },
  { value: 'custom' as const, label: t('arb.custom') },
]);
const starts = ref<string[]>([]);
const ends = ref<string[]>([]);

const shipId = ref(shipSizes[0].id);
const ship = computed(() => shipSizes.find(x => x.id === shipId.value) ?? shipSizes[0]);
const shipChips = shipSizes.map(x => ({ value: x.id, label: x.label }));

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
  // Units the trade may take: a full ship, or the amount you set for this row.
  capacity: number;
  units: number;
  cost: number;
  profit: number;
  // Profit / what you pay.
  return: number;
  // Units traded on the end exchange in the last 7 days.
  traded7: number;
  weight: number;
  volume: number;
}

// Amounts you set in an expanded row, by row key. Most trades are not a full ship.
const unitLimits = reactive(new Map<string, number>());

const allRows = computed(() => {
  const books = fioBooks.books;
  const rows: Row[] = [];
  for (const material of materialsStore.all.value ?? []) {
    const ticker = material.ticker;
    const full = unitsPerShip(material.weight, material.volume, ship.value);
    for (const r of ROUTES) {
      const [from, to] = r.split('>');
      const a = books.get(`${ticker}.${from}`);
      const b = books.get(`${ticker}.${to}`);
      if (!a || !b || !tradedOn(ticker, from) || !tradedOn(ticker, to)) {
        continue;
      }
      const key = `${ticker}.${r}`;
      const limit = unitLimits.get(key);
      const capacity = limit !== undefined ? Math.min(limit, full) : full;
      const result = arbitrage(a.asks, b.bids, b.asks, mode.value, capacity);
      // A row with an amount you set stays while it makes money, so it does not vanish while
      // you change the amount.
      const minProfit = limit !== undefined ? 0 : MIN_PROFIT;
      if (!result || result.units <= 0 || result.profit <= 0 || result.profit < minProfit) {
        continue;
      }
      rows.push({
        key,
        ticker,
        from,
        to,
        capacity,
        units: result.units,
        cost: result.cost,
        traded7: cxStore.prices.get(to)?.get(ticker)?.Traded7D ?? 0,
        weight: material.weight,
        volume: material.volume,
        profit: result.profit,
        return: result.cost > 0 ? result.profit / result.cost : 0,
      });
    }
  }
  return rows;
});

// Return / (daily volatility of the end exchange × √flight days); undefined until FIO sends the
// daily prices.
function safetyOf(row: Row) {
  const closes = dailyCloses.get(`${row.ticker}.${row.to}`);
  const volatility = closes ? dailyVolatility(closes) : undefined;
  return safetyMultiple(row.return, volatility, flightDays(row.from, row.to));
}

type SortKey = 'ticker' | 'units' | 'cost' | 'profit' | 'return' | 'safety' | 'traded7';
const sortKey = ref<SortKey>('profit');
const sortDown = ref(true);

function sortBy(key: SortKey) {
  if (sortKey.value === key) {
    sortDown.value = !sortDown.value;
  } else {
    sortKey.value = key;
    sortDown.value = key !== 'ticker';
  }
}

function arrow(key: SortKey) {
  return sortKey.value === key ? (sortDown.value ? ' ▾' : ' ▴') : '';
}

function onRoute(row: Row) {
  if (routeMode.value === 'all') {
    return true;
  }
  return (
    (starts.value.length === 0 || starts.value.includes(row.from)) &&
    (ends.value.length === 0 || ends.value.includes(row.to))
  );
}

// Blacklist mode shows the blacklisted rows too, so you can take them off again.
const editingBlacklist = ref(false);

const rows = computed(() => {
  const list = allRows.value.filter(
    x => onRoute(x) && (editingBlacklist.value || !(x.ticker in userData.arbBlacklist)),
  );
  const sign = sortDown.value ? -1 : 1;
  const value = (x: Row) => {
    if (sortKey.value === 'safety') {
      return safetyOf(x) ?? -Infinity;
    }
    return sortKey.value === 'ticker' ? 0 : x[sortKey.value];
  };
  return list.sort((a, b) =>
    sortKey.value === 'ticker'
      ? sign * a.ticker.localeCompare(b.ticker)
      : sign * (value(a) - value(b)),
  );
});

// Daily prices of the end exchanges in the list, for the safety multiple.
watchEffect(() => requestCloses([...new Set(rows.value.map(x => `${x.ticker}.${x.to}`))]));

// Blacklist: one button. In blacklist mode you pick a reason, then click rows to add them.
const reasons = arbReasons();
const reasonChips = reasons.map(x => ({ value: x.id, label: x.label }));
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
const blacklistCount = computed(() => Object.keys(userData.arbBlacklist).length);

function reasonLabel(ticker: string) {
  const id = userData.arbBlacklist[ticker] ?? reasons[0].id;
  return reasons.find(x => x.id === id)?.label ?? '';
}

function unblacklist(ticker: string) {
  delete userData.arbBlacklist[ticker];
}

// Click a row to see the orders the trade takes, from the live books.
const open = ref<string>();
const books = new HiddenOrderBooks();
watch(open, key => {
  const row = allRows.value.find(x => x.key === key);
  void books.show(row ? [`${row.ticker}.${row.from}`, `${row.ticker}.${row.to}`] : []);
});
onUnmounted(() => books.close());

function fullShip(row: Row) {
  const material = materialsStore.getByTicker(row.ticker);
  return material ? unitsPerShip(material.weight, material.volume, ship.value) : row.capacity;
}

function setUnits(row: Row, event: Event) {
  const value = Math.floor(Number((event.target as HTMLInputElement).value));
  if (Number.isFinite(value) && value > 0 && value < fullShip(row)) {
    unitLimits.set(row.key, value);
  } else {
    unitLimits.delete(row.key);
  }
}

function clearUnits(row: Row) {
  unitLimits.delete(row.key);
}

function onRowClick(row: Row) {
  if (editingBlacklist.value) {
    if (row.ticker in userData.arbBlacklist) {
      unblacklist(row.ticker);
    } else {
      userData.arbBlacklist[row.ticker] = pickReason.value;
    }
    return;
  }
  open.value = open.value === row.key ? undefined : row.key;
}

function toggleBlacklistMode() {
  editingBlacklist.value = !editingBlacklist.value;
  open.value = undefined;
}
</script>

<template>
  <div :class="$style.root">
    <div :class="$style.bar">
      <ChipGroup v-model="mode" :options="modeChips" />
      <template v-if="!editingBlacklist">
        <span :class="$style.group">
          <span :class="$style.muted">{{ t('arb.route') }}</span>
          <ChipGroup v-model="routeMode" :options="routeChips" />
        </span>
        <span :class="$style.group">
          <span :class="$style.muted">{{ t('arb.ship') }}</span>
          <ChipGroup v-model="shipId" :options="shipChips" />
        </span>
      </template>
      <span :class="$style.spacer" />
      <template v-if="!editingBlacklist">
        <span :class="$style.muted">
          {{
            fioBooks.loading
              ? t('arb.loading')
              : t('arb.loaded', ageText(fioBooks.loadedAt || undefined))
          }}
        </span>
        <span
          :class="[$style.reload, fioBooks.loading ? $style.muted : undefined]"
          @click="loadFioBooks()"
          >↻</span
        >
      </template>
      <PrunButton dark inline @click="toggleBlacklistMode">
        {{ editingBlacklist ? t('bl.done') : t('bl.title') }}
        <span v-if="!editingBlacklist" :class="$style.muted">{{ blacklistCount }}</span>
      </PrunButton>
    </div>
    <div v-if="routeMode === 'custom' && !editingBlacklist" :class="[$style.bar, $style.sub]">
      <span :class="$style.group">
        <span :class="$style.muted">{{ t('arb.from') }}</span>
        <ChipGroup v-model="starts" multiple :options="exchangeChips" />
      </span>
      <span :class="$style.muted">→</span>
      <span :class="$style.group">
        <span :class="$style.muted">{{ t('arb.to') }}</span>
        <ChipGroup v-model="ends" multiple :options="exchangeChips" />
      </span>
    </div>
    <template v-if="editingBlacklist">
      <div :class="[$style.bar, $style.sub, $style.blBar]">
        <span :class="$style.muted">{{ t('bl.reason') }}</span>
        <ChipGroup v-model="pickReason" :options="reasonChips" />
      </div>
      <BlacklistPanel
        :entries="userData.arbBlacklist"
        :reasons="reasons"
        :automatic="automatic"
        @remove="unblacklist" />
    </template>
    <p v-if="fioBooks.error" :class="$style.muted">{{ t('arb.error', fioBooks.error) }}</p>
    <div :class="[$style.row, $style.head]">
      <span :class="$style.sort" @click="sortBy('ticker')"
        >{{ t('arb.material') }}{{ arrow('ticker') }}</span
      >
      <span>{{ t('arb.route') }}</span>
      <span :class="[$style.num, $style.sort]" @click="sortBy('units')"
        >{{ t('arb.units') }}{{ arrow('units') }}</span
      >
      <span :class="[$style.num, $style.sort]" @click="sortBy('cost')"
        >{{ t('arb.cost') }}{{ arrow('cost') }}</span
      >
      <span :class="[$style.num, $style.sort]" @click="sortBy('profit')"
        >{{ t('arb.profit') }}{{ arrow('profit') }}</span
      >
      <span :class="[$style.num, $style.sort]" @click="sortBy('return')"
        >{{ t('arb.return') }}{{ arrow('return') }}</span
      >
      <span :class="[$style.num, $style.sort]" @click="sortBy('safety')"
        >{{ t('arb.safety') }}{{ arrow('safety') }}</span
      >
      <span :class="[$style.num, $style.sort]" @click="sortBy('traded7')"
        >{{ t('arb.traded7') }}{{ arrow('traded7') }}</span
      >
    </div>
    <template v-for="r in rows" :key="r.key">
      <div
        :class="[
          $style.row,
          $style.data,
          open === r.key ? $style.opened : undefined,
          editingBlacklist && r.ticker in userData.arbBlacklist ? $style.struck : undefined,
        ]"
        @click="onRowClick(r)">
        <span :class="$style.icon" @click.stop
          ><MaterialIcon size="inline-table" :ticker="r.ticker"
        /></span>
        <span :class="$style.name"
          >{{ r.from }} <span :class="$style.muted">→</span> {{ r.to }}</span
        >
        <span :class="$style.num">{{ fixed0(r.units) }}</span>
        <span :class="$style.num">{{ formatProfit(r.cost) }}</span>
        <span :class="[$style.num, $style.name]">{{ formatProfit(r.profit) }}</span>
        <span :class="$style.num">
          {{
            editingBlacklist && r.ticker in userData.arbBlacklist
              ? reasonLabel(r.ticker)
              : percent1(r.return)
          }}
        </span>
        <span :class="[$style.num, (safetyOf(r) ?? Infinity) < 1 ? $style.warn : undefined]">{{
          safetyOf(r) !== undefined ? fixed01(safetyOf(r)!) : '--'
        }}</span>
        <span :class="[$style.num, r.traded7 < r.units ? $style.warn : undefined]">{{
          fixed0(r.traded7)
        }}</span>
      </div>
      <div v-if="open === r.key" :class="$style.amount">
        <span :class="$style.muted">{{ t('arb.units') }}</span>
        <input
          :id="`arb-units-${r.key}`"
          :class="$style.input"
          type="number"
          min="1"
          :max="fullShip(r)"
          :value="r.capacity"
          @change="setUnits(r, $event)" />
        <button :class="$style.button" @click="clearUnits(r)">{{ t('arb.fullShip') }}</button>
        <span>
          {{ fixed0(r.units) }} · {{ fixed01(r.units * r.weight) }} t / {{ fixed0(ship.weight) }} t
          · {{ fixed01(r.units * r.volume) }} m³ / {{ fixed0(ship.volume) }} m³
        </span>
      </div>
      <ArbDepth
        v-if="open === r.key"
        :ticker="r.ticker"
        :from="r.from"
        :to="r.to"
        :mode="mode"
        :capacity="r.capacity"
        :safety="safetyOf(r)" />
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
  gap: 8px 12px;
  margin-bottom: 8px;
}

.group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.sub {
  padding: 6px 8px;
  background-color: var(--rpz-bg-raised);
}

.blBar {
  border-left: 2px solid var(--rpz-brand);
}

.spacer {
  flex: 1;
}

.reload {
  padding: 0 4px;
  color: var(--rpz-text-weak);
  cursor: pointer;
}

.reload:hover {
  color: var(--rpz-text);
}

.row {
  display: grid;
  grid-template-columns: 56px minmax(80px, 1fr) 70px 80px 80px 70px 70px 80px;
  gap: 0 16px;
  align-items: center;
  padding: 4px 8px;
  border-top: 1px solid var(--rpz-stroke-weak);
}

.head {
  color: var(--rpz-text-weak);
  border-top: none;
}

.data {
  cursor: pointer;
}

.data:hover {
  background-color: var(--rpz-hover);
}

.data:active {
  background-color: var(--rpz-press);
}

.opened {
  background-color: var(--rpz-bg-raised);
}

.struck {
  opacity: 0.4;
  text-decoration: line-through;
}

.icon {
  display: inline-flex;
}

.name {
  color: var(--rpz-text);
}

.num {
  text-align: right;
}

.sort {
  cursor: pointer;
}

.sort:hover {
  color: var(--rpz-text);
}

.muted {
  color: var(--rpz-text-weak);
}

.warn {
  color: var(--rpz-warn);
}

.amount {
  display: flex;
  align-items: center;
  gap: var(--rpz-space-2);
  padding: var(--rpz-space-2) var(--rpz-space-2) 0 64px;
  background-color: var(--rpz-bg-raised);
}

.input {
  width: 80px;
  padding: 3px 6px;
  border: 1px solid var(--rpz-stroke);
  background-color: var(--rpz-bg-raised);
  color: var(--rpz-text);
  font: inherit;
  outline: none;
}

.input:focus {
  border-color: var(--rpz-brand);
}

.button {
  padding: 2px 8px;
  border: 1px solid var(--rpz-stroke);
  background: none;
  color: var(--rpz-text);
  font: inherit;
  cursor: pointer;
}

.button:hover {
  background-color: var(--rpz-hover);
}

.button:active {
  background-color: var(--rpz-press);
}
</style>
