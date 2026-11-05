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
  capacity: number;
  profit: number;
  // Profit / what you pay.
  return: number;
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
      if (!result || result.units <= 0 || result.profit < MIN_PROFIT) {
        continue;
      }
      rows.push({
        key: `${ticker}.${r}`,
        ticker,
        from,
        to,
        capacity,
        profit: result.profit,
        return: result.cost > 0 ? result.profit / result.cost : 0,
      });
    }
  }
  return rows;
});

type SortKey = 'ticker' | 'profit' | 'return';
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
  return list.sort((a, b) =>
    sortKey.value === 'ticker'
      ? sign * a.ticker.localeCompare(b.ticker)
      : sign * (a[sortKey.value] - b[sortKey.value]),
  );
});

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
      <span :class="[$style.num, $style.sort]" @click="sortBy('profit')"
        >{{ t('arb.profit') }}{{ arrow('profit') }}</span
      >
      <span :class="[$style.num, $style.sort]" @click="sortBy('return')"
        >{{ t('arb.return') }}{{ arrow('return') }}</span
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
        <span :class="[$style.num, $style.name]">{{ formatProfit(r.profit) }}</span>
        <span :class="$style.num">
          {{
            editingBlacklist && r.ticker in userData.arbBlacklist
              ? reasonLabel(r.ticker)
              : percent1(r.return)
          }}
        </span>
      </div>
      <ArbDepth
        v-if="open === r.key"
        :ticker="r.ticker"
        :from="r.from"
        :to="r.to"
        :mode="mode"
        :capacity="r.capacity"
        :fio-a="fioBooks.books.get(`${r.ticker}.${r.from}`)"
        :fio-b="fioBooks.books.get(`${r.ticker}.${r.to}`)" />
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
  background-color: #252525;
}

.blBar {
  border-left: 2px solid #f7a600;
}

.spacer {
  flex: 1;
}

.reload {
  padding: 0 4px;
  color: #8c8c8c;
  cursor: pointer;
}

.reload:hover {
  color: #eee;
}

.row {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr) 110px 90px;
  gap: 0 16px;
  align-items: center;
  padding: 4px 8px;
  border-top: 1px solid #2c2c2c;
}

.head {
  color: #8c8c8c;
  border-top: none;
}

.data {
  cursor: pointer;
}

.data:hover {
  background-color: rgba(255, 255, 255, 0.06);
}

.data:active {
  background-color: rgba(255, 255, 255, 0.1);
}

.opened {
  background-color: #252525;
}

.struck {
  opacity: 0.4;
  text-decoration: line-through;
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

.sort:hover {
  color: #eee;
}

.muted {
  color: #8c8c8c;
}
</style>
