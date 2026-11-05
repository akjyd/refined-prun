<script setup lang="ts">
import MaterialIcon from '@src/components/MaterialIcon.vue';
import PrunButton from '@src/components/PrunButton.vue';
import ChipGroup from '@src/components/ChipGroup.vue';
import { ArbitrageMode } from '@src/core/arbitrage';
import { fioBooks, loadFioBooks } from '@src/infrastructure/fio/exchange-full';
import { cxStore } from '@src/infrastructure/fio/cx';
import { materialsStore } from '@src/infrastructure/prun-api/data/materials';
import { HiddenOrderBooks } from '@src/infrastructure/prun-ui/hidden-order-books';
import ArbDepth from '@src/features/XIT/ARB/ArbDepth.vue';
import CartPanel from '@src/features/XIT/ARB/CartPanel.vue';
import { tradeOf } from '@src/features/XIT/ARB/arb-books';
import { shipSizes } from '@src/core/ship-sizes';
import {
  addToCart,
  arbDays,
  cartLines,
  cartRoute,
  dailyTrade,
  inCart,
  unitCap,
} from '@src/features/XIT/ARB/cart';
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

// Days of end-exchange trade the units are compared with (player, 2026-11-05: 3 by default).
const days = arbDays;
const shipChips = shipSizes.map(x => ({ value: x.id, label: x.label }));
const dayChips = computed(() =>
  (['1', '3', '7'] as const).map(x => ({ value: x, label: t('arb.days', x) })),
);

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
  units: number;
  cost: number;
  profit: number;
  // Profit / what you pay.
  return: number;
  // Average units traded per day on the end exchange (7-day trade / 7).
  daily: number;
  live: boolean;
  time?: number;
}

// Every route of every material: units up to what the ship holds and the end exchange trades in
// the chosen days. With goods in the cart, only the cart's route shows.
const allRows = computed(() => {
  const rows: Row[] = [];
  const route = cartRoute.value;
  const routes = route ? [`${route.from}>${route.to}`] : ROUTES;
  for (const material of materialsStore.all.value ?? []) {
    const ticker = material.ticker;
    for (const r of routes) {
      const [from, to] = r.split('>');
      if (!tradedOn(ticker, from) || !tradedOn(ticker, to)) {
        continue;
      }
      const key = `${ticker}.${r}`;
      const line = cartLines.value.find(x => x.item.ticker === ticker);
      const cap = unitCap(ticker, to);
      if (!line && cap <= 0) {
        continue;
      }
      const trade = line?.trade ?? tradeOf(ticker, from, to, mode.value, cap);
      if (!trade) {
        continue;
      }
      const result = trade.result;
      if (!line && (result.units <= 0 || result.profit < MIN_PROFIT)) {
        continue;
      }
      rows.push({
        key,
        ticker,
        from,
        to,
        units: result.units,
        cost: result.cost,
        profit: result.profit,
        return: result.cost > 0 ? result.profit / result.cost : 0,
        daily: dailyTrade(ticker, to),
        live: trade.live,
        time: trade.time,
      });
    }
  }
  return rows;
});

// Units over the end exchange's trade in the chosen days.
function shareOf(row: Row) {
  const trade = row.daily * Number(days.value);
  return trade > 0 ? row.units / trade : Infinity;
}

// Return / (daily volatility of the end exchange × √flight days); undefined until FIO sends the
// daily prices.
function safetyOf(row: Row) {
  const closes = dailyCloses.get(`${row.ticker}.${row.to}`);
  const volatility = closes ? dailyVolatility(closes) : undefined;
  return safetyMultiple(row.return, volatility, flightDays(row.from, row.to));
}

type SortKey = 'ticker' | 'share' | 'cost' | 'profit' | 'return' | 'safety';
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
  if (cartRoute.value || routeMode.value === 'all') {
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
    if (sortKey.value === 'share') {
      return shareOf(x);
    }
    return sortKey.value === 'ticker' ? 0 : x[sortKey.value];
  };
  return list.sort((a, b) =>
    sortKey.value === 'ticker'
      ? sign * a.ticker.localeCompare(b.ticker)
      : sign * (value(a) - value(b)),
  );
});

function cartSafety(ticker: string) {
  const row = allRows.value.find(x => x.ticker === ticker);
  return row ? safetyOf(row) : undefined;
}

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

// Live books for the open row and every good in the cart.
const open = ref<string>();
const books = new HiddenOrderBooks();
watch(
  () => {
    const row = allRows.value.find(x => x.key === open.value);
    const keys = cartLines.value.flatMap(x => [
      `${x.item.ticker}.${x.item.from}`,
      `${x.item.ticker}.${x.item.to}`,
    ]);
    if (row) {
      keys.push(`${row.ticker}.${row.from}`, `${row.ticker}.${row.to}`);
    }
    return [...new Set(keys)].sort().join(',');
  },
  value => void books.show(value === '' ? [] : value.split(',')),
  { immediate: true },
);
onUnmounted(() => books.close());

function add(row: Row) {
  addToCart({ ticker: row.ticker, from: row.from, to: row.to, mode: mode.value }, row.units);
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
        <span v-if="!cartRoute" :class="$style.group">
          <span :class="$style.muted">{{ t('arb.route') }}</span>
          <ChipGroup v-model="routeMode" :options="routeChips" />
        </span>
        <span :class="$style.group">
          <span :class="$style.muted">{{ t('arb.daysLabel') }}</span>
          <ChipGroup v-model="days" :options="dayChips" />
        </span>
        <span :class="$style.group">
          <span :class="$style.muted">{{ t('arb.ship') }}</span>
          <ChipGroup v-model="userData.arbCart.ship" :options="shipChips" />
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
    <CartPanel v-if="cartRoute && !editingBlacklist" :safety-of="cartSafety" />
    <div
      v-if="routeMode === 'custom' && !cartRoute && !editingBlacklist"
      :class="[$style.bar, $style.sub]">
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
      <span :class="[$style.num, $style.sort]" @click="sortBy('share')"
        >{{ t('arb.unitsTrade', days) }}{{ arrow('share') }}</span
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
      <span />
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
          >{{ r.from }} <span :class="$style.muted">→</span> {{ r.to }}
          <span v-if="cartRoute" :class="$style.age">{{
            r.live ? t('arb.live') : t('arb.fioAgo', ageText(r.time))
          }}</span></span
        >
        <span :class="[$style.share, shareOf(r) > 1 ? $style.over : undefined]">
          <span :class="$style.shareText"
            >{{ fixed0(r.units) }} / {{ fixed0(r.daily * Number(days)) }}</span
          >
          <span :class="$style.shareBar"
            ><i :style="{ width: `${Math.min(1, shareOf(r)) * 100}%` }"
          /></span>
        </span>
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
        <span :class="$style.action">
          <span v-if="inCart(r.ticker)" :class="$style.muted">{{ t('arb.inCart') }}</span>
          <button
            v-else-if="
              !editingBlacklist &&
              (!cartRoute || (r.from === cartRoute.from && r.to === cartRoute.to))
            "
            :class="$style.button"
            @click.stop="add(r)">
            {{ t('arb.add') }}
          </button>
        </span>
      </div>
      <ArbDepth
        v-if="open === r.key"
        :ticker="r.ticker"
        :from="r.from"
        :to="r.to"
        :mode="mode"
        :capacity="cartLines.find(x => x.item.ticker === r.ticker)?.units ?? r.units"
        :safety="safetyOf(r)" />
    </template>
  </div>
</template>

<style module>
.root {
  min-width: 820px;
  padding: 6px 8px;
  color: var(--rpz-text);
  font-size: var(--rpz-fs-body);
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
  grid-template-columns: 56px minmax(100px, 1fr) 150px 80px 80px 64px 64px 60px;
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

/* A warning is red, not the brand orange (player, 2026-11-05). */
.warn {
  color: var(--rpz-neg);
}

.age {
  display: block;
  color: var(--rpz-text-weak);
  font-size: var(--rpz-fs-label);
}

.share {
  display: grid;
  gap: 2px;
}

.shareText {
  text-align: right;
}

.shareBar {
  position: relative;
  height: 4px;
  background-color: #333;
}

.shareBar i {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  background-color: var(--rpz-text-weak);
}

.over .shareText {
  color: var(--rpz-neg);
}

.over .shareBar i {
  background-color: var(--rpz-neg);
}

.action {
  text-align: right;
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
