<script setup lang="ts">
import { userData } from '@src/store/user-data';
import { t } from '@src/i18n';

// XIT ARB (player, 2026-11-06): you set how often a trade may lose money; the size of every
// trade follows from it, so nothing else needs a cap.
const $style = useCssModule();

const arb = userData.settings.arb;
arb.failurePercent ??= 10;
arb.minDailyProfit ??= 30_000;
arb.maxDays ??= 7;
arb.queueDays ??= 0.5;

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
      <span :class="$style.label">{{ t('set.arb.queue') }}</span>
      <input
        :class="$style.input"
        :value="arb.queueDays"
        @change="setQueue(($event.target as HTMLInputElement).value)" />
      <span :class="$style.hint">{{ t('set.arb.queueHint') }}</span>
    </div>
    <div :class="$style.row">
      <span :class="$style.label">{{ t('set.arb.minDaily') }}</span>
      <input
        :class="$style.input"
        :value="arb.minDailyProfit"
        @change="setMinDaily(($event.target as HTMLInputElement).value)" />
      <span :class="$style.hint">{{ t('set.arb.minDailyHint') }}</span>
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

.hint {
  color: var(--rpz-text-weak);
  font-size: var(--rpz-fs-label);
}
</style>
