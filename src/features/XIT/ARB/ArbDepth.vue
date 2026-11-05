<script setup lang="ts">
import CxpoButton from '@src/components/CxpoButton.vue';
import { arbitrage, ArbitrageMode, BookLevel, Fill } from '@src/core/arbitrage';
import { getOwnCxOrder } from '@src/core/order-seen';
import { OrderBookData } from '@src/infrastructure/fio/exchange-full';
import { cxobStore } from '@src/infrastructure/prun-api/data/cxob';
import { companyStore } from '@src/infrastructure/prun-api/data/company';
import { ageText } from '@src/features/XIT/ARB/age';
import { fixed0, percent1 } from '@src/utils/format';
import { t } from '@src/i18n';

// The orders a trade takes on both exchanges. A bar behind each order shows the part you take;
// a line shows where the trade stops and why. Live books are used when the game sends them,
// else the FIO copies.
const { ticker, from, to, mode, capacity, fioA, fioB } = defineProps<{
  ticker: string;
  from: string;
  to: string;
  mode: ArbitrageMode;
  capacity: number;
  fioA?: OrderBookData;
  fioB?: OrderBookData;
}>();

const $style = useCssModule();

// Orders after the stop line that stay in view.
const AFTER = 3;

function liveBook(code: string): OrderBookData | undefined {
  const book = cxobStore.getByTicker(`${ticker}.${code}`);
  if (!book) {
    return undefined;
  }
  const level = (x: PrunApi.CXBrokerOrder): BookLevel => ({
    price: x.limit.amount,
    amount: x.amount ?? undefined,
    id: x.id,
  });
  return { asks: book.sellingOrders.map(level), bids: book.buyingOrders.map(level) };
}

const a = computed(() => liveBook(from) ?? fioA);
const b = computed(() => liveBook(to) ?? fioB);
const liveA = computed(() => liveBook(from) !== undefined);
const liveB = computed(() => liveBook(to) !== undefined);

const result = computed(() =>
  a.value && b.value
    ? arbitrage(a.value.asks, b.value.bids, b.value.asks, mode, capacity)
    : undefined,
);

interface Line {
  fill: Fill;
  amount: string;
  own: boolean;
  share: number;
}

// Your own orders show the amount left / the amount placed, as in CXOB.
function toLine(fill: Fill): Line {
  const mine = fill.id !== undefined ? getOwnCxOrder(fill.id) : undefined;
  const own = mine !== undefined && companyStore.value !== undefined;
  const amount = mine
    ? `${fixed0(mine.amount)}/${fixed0(mine.initialAmount)}`
    : fill.amount === undefined
      ? '∞'
      : fixed0(fill.amount);
  const share = fill.amount === undefined ? (fill.take > 0 ? 1 : 0) : fill.take / fill.amount;
  return { fill, amount, own, share: Math.min(1, share) };
}

function split(fills: Fill[]) {
  const taken = fills.filter(x => x.take > 0).map(toLine);
  const rest = fills.slice(taken.length, taken.length + AFTER).map(toLine);
  return { taken, rest };
}

const left = computed(() => split(result.value?.fillsA ?? []));
const right = computed(() => {
  const r = result.value;
  if (!r) {
    return { taken: [], rest: [] };
  }
  if (mode === 'now') {
    return split(r.fillsB);
  }
  return { taken: [], rest: r.fillsB.slice(0, AFTER + 1).map(toLine) };
});

const stopText = computed(() => {
  const r = result.value;
  if (!r) {
    return '';
  }
  if (r.limit === 'ship') {
    return t('arb.stopShip', fixed0(r.units));
  }
  return r.limit === 'price' ? t('arb.stopPrice') : t('arb.stopBook');
});

function dataAge(live: boolean, fio: OrderBookData | undefined) {
  return live ? t('arb.live') : t('arb.fioAgo', ageText(fio?.time));
}
</script>

<template>
  <div :class="$style.depth">
    <p v-if="!result" :class="$style.muted">{{ t('cx4.loading') }}</p>
    <template v-else>
      <div :class="$style.books">
        <div>
          <div :class="$style.title">
            <span>
              <span :class="$style.code">{{ from }}</span>
              <span :class="$style.muted"> {{ t('arb.asksBuy') }}</span>
            </span>
            <span :class="$style.muted">{{ dataAge(liveA, fioA) }}</span>
            <CxpoButton :cx-ticker="`${ticker}.${from}`" />
          </div>
          <div :class="[$style.line, $style.colHead]">
            <span>{{ t('cx4.price') }}</span>
            <span :class="$style.num">{{ t('arb.colOrder') }}</span>
            <span :class="$style.num">{{ t('arb.colBuy') }}</span>
          </div>
          <div
            v-for="(l, i) in left.taken"
            :key="`t${i}`"
            :class="[$style.line, l.own ? $style.own : undefined]">
            <div :class="$style.bar" :style="{ width: `${l.share * 100}%` }" />
            <span>{{ fixed0(l.fill.price) }}</span>
            <span :class="$style.num">{{ l.amount }}</span>
            <span :class="[$style.num, $style.take]">{{ fixed0(l.fill.take) }}</span>
          </div>
          <div :class="$style.stop">
            <span>{{ stopText }}</span>
          </div>
          <div
            v-for="(l, i) in left.rest"
            :key="`r${i}`"
            :class="[$style.line, $style.out, l.own ? $style.own : undefined]">
            <span>{{ fixed0(l.fill.price) }}</span>
            <span :class="$style.num">{{ l.amount }}</span>
            <span />
          </div>
        </div>
        <div>
          <div :class="$style.title">
            <span>
              <span :class="$style.code">{{ to }}</span>
              <span :class="$style.muted">
                {{ mode === 'now' ? t('arb.bidsSell') : t('arb.asksList') }}</span
              >
            </span>
            <span :class="$style.muted">{{ dataAge(liveB, fioB) }}</span>
            <CxpoButton :cx-ticker="`${ticker}.${to}`" />
          </div>
          <div :class="[$style.line, $style.colHead]">
            <span>{{ t('cx4.price') }}</span>
            <span :class="$style.num">{{ t('arb.colOrder') }}</span>
            <span :class="$style.num">{{ mode === 'now' ? t('arb.colSell') : '' }}</span>
          </div>
          <template v-if="mode === 'now'">
            <div
              v-for="(l, i) in right.taken"
              :key="`t${i}`"
              :class="[$style.line, l.own ? $style.own : undefined]">
              <div :class="$style.bar" :style="{ width: `${l.share * 100}%` }" />
              <span>{{ fixed0(l.fill.price) }}</span>
              <span :class="$style.num">{{ l.amount }}</span>
              <span :class="[$style.num, $style.take]">{{ fixed0(l.fill.take) }}</span>
            </div>
            <div :class="$style.stop">
              <span>{{ stopText }}</span>
            </div>
          </template>
          <div v-else :class="[$style.line, $style.ghost]">
            <span>{{ fixed0(result.sell) }}</span>
            <span :class="$style.num">{{ fixed0(result.units) }}</span>
            <span :class="$style.num">{{ t('arb.yours') }}</span>
          </div>
          <div
            v-for="(l, i) in right.rest"
            :key="`r${i}`"
            :class="[$style.line, $style.out, l.own ? $style.own : undefined]">
            <span>{{ fixed0(l.fill.price) }}</span>
            <span :class="$style.num">{{ l.amount }}</span>
            <span />
          </div>
        </div>
      </div>
      <div :class="$style.sum">
        <span
          ><span :class="$style.muted">{{ t('arb.cost') }}</span> {{ fixed0(result.cost) }}</span
        >
        <span
          ><span :class="$style.muted">{{ t('arb.revenue') }}</span>
          {{ fixed0(result.cost + result.profit) }}</span
        >
        <span
          ><span :class="$style.muted">{{ t('arb.profit') }}</span>
          <span :class="C.ColoredValue.positive"> {{ fixed0(result.profit) }}</span></span
        >
        <span
          ><span :class="$style.muted">{{ t('arb.return') }}</span>
          {{ result.cost > 0 ? percent1(result.profit / result.cost) : '--' }}</span
        >
      </div>
    </template>
  </div>
</template>

<style module>
.depth {
  padding: 8px 8px 16px 64px;
  background-color: #252525;
  border-top: 1px solid #2c2c2c;
  font-variant-numeric: tabular-nums;
}

.books {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-bottom: 4px;
}

.code {
  color: #eee;
  font-weight: bold;
}

.line {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 90px 70px;
  gap: 0 8px;
  padding: 2px 6px;
  border-top: 1px solid #2c2c2c;
}

.line > span {
  position: relative;
}

.colHead {
  color: #8c8c8c;
  font-size: 11px;
  border-top: none;
}

/* The part of the order you take. */
.bar {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  background-color: rgba(247, 166, 0, 0.22);
}

.take {
  color: #f7a600;
}

.out {
  color: #6a6a6a;
}

.own {
  font-weight: bold;
}

.ghost {
  outline: 1px dashed #f7a600;
  outline-offset: -1px;
  color: #f7a600;
}

.stop {
  position: relative;
  margin-bottom: 14px;
  border-top: 2px solid #f7a600;
}

.stop span {
  position: absolute;
  top: 2px;
  right: 0;
  color: #f7a600;
  font-size: 11px;
}

.sum {
  display: flex;
  gap: 24px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #2c2c2c;
}

.num {
  text-align: right;
}

.muted {
  color: #8c8c8c;
}
</style>
