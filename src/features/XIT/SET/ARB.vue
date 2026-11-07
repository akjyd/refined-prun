<script setup lang="ts">
import { userData } from '@src/store/user-data';
import { t } from '@src/i18n';
import { defaultFlightDays, routeKey } from '@src/core/volatility';
import { cxLabel } from '@src/core/exchange-label';

// XIT ARB (player, 2026-11-06): you set how often a trade may lose money; the size of every
// trade follows from it, so nothing else needs a cap.
const $style = useCssModule();

const arb = userData.settings.arb;
arb.failurePercent ??= 10;
arb.minDailyProfit ??= 30_000;
arb.maxDays ??= 7;
arb.queueDays ??= 0.5;
arb.tradeShare ??= 1;
arb.flightDays ??= {};

// A flight takes as long each way, so the four exchanges make six routes.
const EXCHANGES = ['AI1', 'CI1', 'IC1', 'NC1'];
const routes = EXCHANGES.flatMap((from, i) =>
  EXCHANGES.slice(i + 1).map(to => ({ from, to, key: routeKey(from, to) })),
);

function routeDays(key: string) {
  const [from, to] = key.split('>');
  return arb.flightDays[key] ?? defaultFlightDays(from, to);
}

function setRouteDays(key: string, value: string) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    return;
  }
  arb.flightDays[key] = Math.min(Math.round(n * 10) / 10, 30);
}

function setShare(value: string) {
  const n = Number(value);
  if (Number.isFinite(n) && n > 0) {
    arb.tradeShare = Math.min(Math.round(n * 100) / 100, 1);
  }
}

function setFailure(value: string) {
  const n = Number(value);
  if (Number.isFinite(n)) {
    arb.failurePercent = Math.min(Math.max(Math.round(n), 0), 100);
  }
}

function setMaxDays(value: string) {
  const n = Number(value);
  if (Number.isFinite(n) && n >= 1) {
    arb.maxDays = Math.min(Math.round(n), 60);
  }
}

function setQueue(value: string) {
  const n = Number(value);
  if (Number.isFinite(n) && n >= 0) {
    arb.queueDays = Math.min(n, 30);
  }
}

function setMinDaily(value: string) {
  const n = Number(value);
  if (Number.isFinite(n) && n >= 0) {
    arb.minDailyProfit = Math.round(n);
  }
}
</script>

<template>
  <div :class="$style.page">
    <div :class="$style.group">{{ t('set.arb.groupArb') }}</div>
    <div :class="$style.row">
      <span :class="$style.label">{{ t('set.arb.failure') }}</span>
      <input
        :class="$style.input"
        :value="arb.failurePercent"
        @change="setFailure(($event.target as HTMLInputElement).value)" />
      <span :class="$style.hint">% {{ t('set.arb.failureHint') }}</span>
    </div>
    <div :class="$style.row">
      <span :class="$style.label">{{ t('set.arb.maxDays') }}</span>
      <input
        :class="$style.input"
        :value="arb.maxDays"
        @change="setMaxDays(($event.target as HTMLInputElement).value)" />
      <span :class="$style.hint">{{ t('set.arb.maxDaysHint') }}</span>
    </div>
    <div :class="$style.row">
      <span :class="$style.label">{{ t('set.arb.share') }}</span>
      <input
        :class="$style.input"
        :value="arb.tradeShare"
        @change="setShare(($event.target as HTMLInputElement).value)" />
      <span :class="$style.hint">{{ t('set.arb.shareHint') }}</span>
    </div>
    <div :class="$style.row">
      <span :class="$style.label">{{ t('set.arb.minDaily') }}</span>
      <input
        :class="$style.input"
        :value="arb.minDailyProfit"
        @change="setMinDaily(($event.target as HTMLInputElement).value)" />
      <span :class="$style.hint">{{ t('set.arb.minDailyHint') }}</span>
    </div>
    <div :class="$style.row">
      <span :class="$style.label">{{ t('set.arb.flight') }}</span>
      <span :class="$style.hint">{{ t('set.arb.flightHint') }}</span>
    </div>
    <div :class="$style.routes">
      <span v-for="r in routes" :key="r.key" :class="$style.route">
        <span :class="$style.routeName"
          >{{ cxLabel(r.from) }} <span :class="$style.weak">↔</span> {{ cxLabel(r.to) }}</span
        >
        <input
          :class="[$style.input, $style.small]"
          :value="routeDays(r.key)"
          @change="setRouteDays(r.key, ($event.target as HTMLInputElement).value)" />
      </span>
    </div>
    <div :class="$style.group">{{ t('set.arb.groupLog') }}</div>
    <div :class="$style.row">
      <span :class="$style.label">{{ t('set.arb.queue') }}</span>
      <input
        :class="$style.input"
        :value="arb.queueDays"
        @change="setQueue(($event.target as HTMLInputElement).value)" />
      <span :class="$style.hint">{{ t('set.arb.queueHint') }}</span>
    </div>
  </div>
</template>
<style module>
.page {
  display: grid;
  gap: var(--rpz-space-1);
  padding: var(--rpz-space-2);
  color: var(--rpz-text);
  font-size: var(--rpz-fs-body);
}

.row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--rpz-space-2);
  padding: var(--rpz-space-1) 0;
  border-bottom: 1px solid var(--rpz-stroke-weak);
}

.label {
  min-width: 140px;
  color: var(--rpz-text-weak);
}

.input {
  width: 72px;
  padding: 3px 6px;
  border: 1px solid var(--rpz-stroke);
  background-color: var(--rpz-bg-base);
  color: var(--rpz-text);
  font: inherit;
  text-align: right;
  outline: none;
}

.input:focus {
  border-color: var(--rpz-brand);
}

.group {
  margin-top: var(--rpz-space-2);
  color: var(--rpz-text-strong);
  font-size: var(--rpz-fs-title);
}

.group:first-child {
  margin-top: 0;
}

.routes {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: var(--rpz-space-1) var(--rpz-space-3);
  padding-bottom: var(--rpz-space-2);
  border-bottom: 1px solid var(--rpz-stroke-weak);
}

.route {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--rpz-space-1);
}

.routeName {
  color: var(--rpz-text);
}

.weak {
  color: var(--rpz-text-weak);
}

.small {
  width: 54px;
}

.hint {
  color: var(--rpz-text-weak);
  font-size: var(--rpz-fs-label);
}
</style>
