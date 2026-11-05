<script setup lang="ts">
import { ArbBatch } from '@src/core/arb-batches';
import { fixed0, fixed02 } from '@src/utils/format';
import { t } from '@src/i18n';

// The orders the plan was going to take when you bought: offers on the start exchange and, to
// sell now, requests on the end exchange; to list, the price you would list at. Taken orders
// are gold; a part-taken one shows taken/amount.
const { batch } = defineProps<{ batch: ArbBatch }>();

const $style = useCssModule();

function amount(level: { amount?: number; take: number }) {
  const all = level.amount === undefined ? '∞' : fixed0(level.amount);
  return level.take > 0 && level.amount !== undefined && level.take < level.amount
    ? `${fixed0(level.take)}/${all}`
    : all;
}
</script>

<template>
  <div v-if="batch.snapshot" :class="$style.plan">
    <div>
      <div :class="$style.title">{{ batch.from }} {{ t('arb.asksBuy') }}</div>
      <div :class="[$style.line, $style.head]">
        <span>{{ t('cx4.price') }}</span>
        <span :class="$style.num">{{ t('cx4.amount') }}</span>
      </div>
      <div
        v-for="(x, i) in batch.snapshot.buys"
        :key="i"
        :class="[$style.line, x.take > 0 ? $style.taken : $style.out]">
        <span>{{ fixed02(x.price) }}</span>
        <span :class="$style.num">{{ amount(x) }}</span>
      </div>
    </div>
    <div>
      <div :class="$style.title">
        {{ batch.to }}
        {{ batch.snapshot.sells.length > 0 ? t('arb.bidsSell') : t('arb.asksList') }}
      </div>
      <div :class="[$style.line, $style.head]">
        <span>{{ t('cx4.price') }}</span>
        <span :class="$style.num">{{ t('cx4.amount') }}</span>
      </div>
      <template v-if="batch.snapshot.sells.length > 0">
        <div
          v-for="(x, i) in batch.snapshot.sells"
          :key="i"
          :class="[$style.line, x.take > 0 ? $style.taken : $style.out]">
          <span>{{ fixed02(x.price) }}</span>
          <span :class="$style.num">{{ amount(x) }}</span>
        </div>
      </template>
      <div v-else :class="[$style.line, $style.ghost]">
        <span>{{
          batch.snapshot.listPrice !== undefined ? fixed02(batch.snapshot.listPrice) : '--'
        }}</span>
        <span :class="$style.num">{{ fixed0(batch.plan.units) }}</span>
      </div>
    </div>
  </div>
  <p v-else :class="$style.out">{{ t('arblog.noSnapshot') }}</p>
</template>

<style module>
.plan {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--rpz-space-3);
}

.title {
  margin-bottom: var(--rpz-space-1);
  color: var(--rpz-text-weak);
}

.line {
  display: grid;
  grid-template-columns: 1fr 100px;
  gap: 0 var(--rpz-space-2);
  padding: 2px 6px;
  border-top: 1px solid var(--rpz-stroke-weak);
}

.head {
  color: var(--rpz-text-weak);
  font-size: var(--rpz-fs-label);
  border-top: none;
}

.num {
  text-align: right;
}

.taken {
  background-color: var(--rpz-brand-fill);
  box-shadow: inset 3px 0 0 var(--rpz-brand);
}

.ghost {
  outline: 1px dashed var(--rpz-brand);
  outline-offset: -1px;
  color: var(--rpz-brand);
}

.out {
  color: var(--rpz-text-off);
}
</style>
