<script setup lang="ts">
import { cxLabel } from '@src/core/exchange-label';
import MaterialIcon from '@src/components/MaterialIcon.vue';
import PrunButton from '@src/components/PrunButton.vue';
import ChipGroup from '@src/components/ChipGroup.vue';
import { fioBooks, loadFioBooks } from '@src/infrastructure/fio/exchange-full';
import { cxStore } from '@src/infrastructure/fio/cx';
import { materialsStore } from '@src/infrastructure/prun-api/data/materials';
import { HiddenOrderBooks } from '@src/infrastructure/prun-ui/hidden-order-books';
import ArbDepth from '@src/features/XIT/ARB/ArbDepth.vue';
import CartPanel from '@src/features/XIT/ARB/CartPanel.vue';
import { planOf } from '@src/features/XIT/ARB/arb-books';
import { ArbPlanResult } from '@src/core/arb-plan';
import { shipSizes } from '@src/core/ship-sizes';
import {
  addToCart,
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
import { percent0, percent1 } from '@src/utils/format';
import { formatProfit } from '@src/core/daily-profit/profit-format';
import { requestCloses } from '@src/infrastructure/fio/cxpc';
import { fixed0, fixed01 } from '@src/utils/format';
import { t } from '@src/i18n';
import { showBuffer } from '@src/infrastructure/prun-ui/buffers';
import { historyKey } from '@src/core/arb-history';
import {
  arbHistory,
  markAllRead,
  markListed,
  markRead,
} from '@src/features/XIT/ARB/arb-history-store';

const $style = useCssModule();

const EXCHANGES = ['AI1', 'CI1', 'IC1', 'NC1'];
const ROUTES = EXCHANGES.flatMap(a => EXCHANGES.filter(b => b !== a).map(b => `${a}>${b}`));

const exchangeChips = EXCHANGES.map(x => ({ value: x, label: cxLabel(x) }));

// Route: all, or the start and end exchanges you pick (several of each). No pick on a side
// means any exchange on that side.
const routeMode = ref<'all' | 'custom'>('all');
const routeChips = computed(() => [
  { value: 'all' as const, label: t('arb.any') },
  { value: 'custom' as const, label: t('arb.custom') },
]);
const starts = ref<string[]>([]);
const ends = ref<string[]>([]);

const shipChips = shipSizes.map(x => ({ value: x.id, label: x.label }));
// What you set in XIT SET: how often a trade may lose money.
const target = computed(() => userData.settings.arb.failurePercent);

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
  plan: ArbPlanResult;
  // Average units traded per day on the end exchange (7-day trade / 7).
  daily: number;
  live: boolean;
  time?: number;
}

// Every route of every material, at the size the failure rate you set allows. With goods in the
// cart, only the cart's route shows.
const allRows = computed(() => {
  const rows: Row[] = [];
  const route = cartRoute.value;
  const routes = route ? [`${route.from}>${route.to}`] : ROUTES;
  const minDaily = userData.settings.arb.minDailyProfit;
  for (const material of materialsStore.all.value ?? []) {
    const ticker = material.ticker;
    for (const r of routes) {
      const [from, to] = r.split('>');
      if (!tradedOn(ticker, from) || !tradedOn(ticker, to)) {
        continue;
      }
      const line = cartLines.value.find(x => x.item.ticker === ticker);
      const cap = unitCap(ticker);
      if (!line && cap <= 0) {
        continue;
      }
      const trade = line?.plan
        ? { plan: line.plan, live: true, time: undefined }
        : planOf(ticker, from, to, cap);
      if (!trade) {
        continue;
      }
      const plan = trade.plan;
      if (!line && (plan.units <= 0 || plan.profit / plan.days < minDaily)) {
        continue;
      }
      rows.push({
        key: `${ticker}.${r}`,
        ticker,
        from,
        to,
        plan,
        daily: dailyTrade(ticker, to),
        live: trade.live,
        time: trade.time,
      });
    }
  }
  return rows;
});

function perDayOf(row: Row) {
  return row.plan.profit / row.plan.days;
}

function perDayReturnOf(row: Row) {
  return row.plan.cost > 0 ? row.plan.margin / row.plan.days : 0;
}

type SortKey = 'ticker' | 'units' | 'cost' | 'days' | 'perDay' | 'perDayReturn' | 'failure';
const sortKey = ref<SortKey>('perDay');
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
    switch (sortKey.value) {
      case 'perDay':
        return perDayOf(x);
      case 'perDayReturn':
        return perDayReturnOf(x);
      case 'days':
        return x.plan.days;
      case 'units':
        return x.plan.units;
      case 'cost':
        return x.plan.cost;
      case 'failure':
        return x.plan.failure;
      default:
        return 0;
    }
  };
  return list.sort((a, b) =>
    sortKey.value === 'ticker'
      ? sign * a.ticker.localeCompare(b.ticker)
      : sign * (value(a) - value(b)),
  );
});

// Daily prices of the end exchanges in the list, for the volatility.
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
  addToCart(
    {
      ticker: row.ticker,
      from: row.from,
      to: row.to,
      mode: row.plan.listUnits > 0 ? 'listed' : 'now',
    },
    row.plan.units,
  );
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
  markRead(hKey(row));
  open.value = open.value === row.key ? undefined : row.key;
}

// New chances (player, 2026-11-06): a chance not in the list for a day gets a mark until you
// open its row or mark all read.
function hKey(row: Row) {
  return historyKey(row.plan.listUnits > 0 ? 'listed' : 'now', row.ticker, row.from, row.to);
}

const unread = computed(() => new Set(arbHistory.value.unread));
const unreadCount = computed(() => rows.value.filter(x => unread.value.has(hKey(x))).length);

watch(
  () => rows.value.map(hKey).join(','),
  keys => {
    if (keys !== '') {
      markListed(keys.split(','));
    }
  },
  { immediate: true },
);

function toggleBlacklistMode() {
  editingBlacklist.value = !editingBlacklist.value;
  open.value = undefined;
}
</script>

<template>
  <div :class="$style.root">
    <div :class="$style.bar">
      <template v-if="!editingBlacklist">
        <span v-if="!cartRoute" :class="$style.group">
          <span :class="$style.muted">{{ t('arb.route') }}</span>
          <ChipGroup v-model="routeMode" :options="routeChips" />
        </span>
        <span :class="$style.group">
          <span :class="$style.muted">{{ t('arb.ship') }}</span>
          <ChipGroup v-model="userData.arbCart.ship" :options="shipChips" />
        </span>
      </template>
      <span :class="$style.spacer" />
      <template v-if="!editingBlacklist">
        <span :class="$style.muted"
          >{{ t('arb.failureLabel') }}
          <span :class="$style.reload" @click="showBuffer('XIT SET ARB')">{{
            percent0(target / 100)
          }}</span></span
        >
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
      <button
        v-if="!editingBlacklist && unreadCount > 0"
        :class="$style.button"
        @click="markAllRead">
        {{ t('arb.allRead') }} <span :class="$style.muted">{{ unreadCount }}</span>
      </button>
      <PrunButton dark inline @click="toggleBlacklistMode">
        {{ editingBlacklist ? t('bl.done') : t('bl.title') }}
        <span v-if="!editingBlacklist" :class="$style.muted">{{ blacklistCount }}</span>
      </PrunButton>
    </div>
    <CartPanel v-if="cartRoute && !editingBlacklist" />
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
      <span />
      <span :class="$style.sort" @click="sortBy('ticker')"
        >{{ t('arb.material') }}{{ arrow('ticker') }}</span
      >
      <span>{{ t('arb.route') }}</span>
      <span
        :class="[$style.num, $style.sort, C.Tooltip.container]"
        :data-tooltip="t('arb.tipUnits')"
        data-tooltip-position="bottom"
        @click="sortBy('units')"
        >{{ t('arb.unitsFill') }}{{ arrow('units') }}</span
      >
      <span
        :class="[$style.num, $style.sort, C.Tooltip.container]"
        :data-tooltip="t('arb.tipCost')"
        data-tooltip-position="bottom"
        @click="sortBy('cost')"
        >{{ t('arb.cost') }}{{ arrow('cost') }}</span
      >
      <span
        :class="[$style.num, $style.sort, C.Tooltip.container]"
        :data-tooltip="t('arb.tipDays')"
        data-tooltip-position="bottom"
        @click="sortBy('days')"
        >{{ t('arb.tradeDays') }}{{ arrow('days') }}</span
      >
      <span
        :class="[$style.num, $style.sort, C.Tooltip.container]"
        :data-tooltip="t('arb.tipPerDay')"
        data-tooltip-position="bottom"
        @click="sortBy('perDay')"
        >{{ t('arb.perDay') }}{{ arrow('perDay') }}</span
      >
      <span
        :class="[$style.num, $style.sort, C.Tooltip.container]"
        :data-tooltip="t('arb.tipReturn')"
        data-tooltip-position="bottom"
        @click="sortBy('perDayReturn')"
        >{{ t('arb.perDayReturn') }}{{ arrow('perDayReturn') }}</span
      >
      <span
        :class="[$style.num, $style.sort, C.Tooltip.container]"
        :data-tooltip="t('arb.tipFailure')"
        data-tooltip-position="bottom"
        @click="sortBy('failure')"
        >{{ t('arb.failure') }}{{ arrow('failure') }}</span
      >
      <span />
    </div>
    <template v-for="r in rows" :key="r.key">
      <div
        :class="[
          'rpz-row',
          $style.row,
          $style.data,
          open === r.key ? $style.opened : undefined,
          editingBlacklist && r.ticker in userData.arbBlacklist ? $style.struck : undefined,
          unread.has(hKey(r)) ? 'rpz-marked' : undefined,
        ]"
        @click="onRowClick(r)">
        <span class="rpz-mark">{{ unread.has(hKey(r)) ? t('arb.new') : '' }}</span>
        <span :class="$style.icon" @click.stop
          ><MaterialIcon size="inline-table" :ticker="r.ticker"
        /></span>
        <span :class="$style.name"
          >{{ cxLabel(r.from) }} <span :class="$style.muted">→</span> {{ cxLabel(r.to) }}
          <span v-if="cartRoute" :class="$style.age">{{
            r.live ? t('arb.live') : t('arb.fioAgo', ageText(r.time))
          }}</span></span
        >
        <span :class="$style.share">
          <span :class="$style.shareText"
            >{{ fixed0(r.plan.fillUnits) }}
            <span :class="$style.muted">/ {{ fixed0(r.plan.units) }}</span></span
          >
          <span :class="$style.shareBar"
            ><i
              :class="$style.fill"
              :style="{
                width: `${r.plan.units > 0 ? (r.plan.fillUnits / r.plan.units) * 100 : 0}%`,
              }" /></span
        ></span>
        <span :class="[$style.num, $style.muted]">{{ formatProfit(r.plan.cost) }}</span>
        <span :class="[$style.num, $style.muted]">{{ t('arb.days', fixed01(r.plan.days)) }}</span>
        <span :class="[$style.num, $style.key]">{{ formatProfit(perDayOf(r)) }}</span>
        <span :class="$style.num">
          {{
            editingBlacklist && r.ticker in userData.arbBlacklist
              ? reasonLabel(r.ticker)
              : percent1(perDayReturnOf(r))
          }}
        </span>
        <span
          :class="[
            $style.num,
            r.plan.failure > target
              ? $style.warn
              : r.plan.failure < target - 1
                ? $style.good
                : $style.muted,
          ]"
          >{{ percent0(r.plan.failure / 100) }}</span
        >
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
      <ArbDepth v-if="open === r.key" :ticker="r.ticker" :from="r.from" :to="r.to" :plan="r.plan" />
    </template>
  </div>
</template>

<style module>
.root {
  min-width: 900px;
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
  grid-template-columns: 22px 56px minmax(100px, 1fr) 130px 80px 68px 80px 72px 56px 60px;
  gap: 0 16px;
  /* On the text baseline, so the small new mark lines up with the numbers. */
  align-items: baseline;
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
  align-self: center;
}

.name {
  color: var(--rpz-text);
}

.num {
  text-align: right;
}

/* The one value of a row that the decision is made on (docs/ui-rules.md 3.5). */
.key {
  color: var(--rpz-text-strong);
  font-weight: 600;
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
  background-color: var(--rpz-stroke-weak);
}

.shareBar i {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  background-color: var(--rpz-text-weak);
}

.shareBar .fill {
  background-color: var(--rpz-pos);
}

.good {
  color: var(--rpz-pos);
}

.action {
  text-align: right;
}

.amount {
  display: flex;
  align-items: center;
  gap: var(--rpz-space-2);
  padding: var(--rpz-space-2) var(--rpz-space-2) 0 102px;
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
