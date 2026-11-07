<script setup lang="ts">
import { cxLabel } from '@src/core/exchange-label';
import { ArbBatch } from '@src/core/arb-batches';
import { cxobStore } from '@src/infrastructure/prun-api/data/cxob';
import { companyStore } from '@src/infrastructure/prun-api/data/company';
import { fixed0 } from '@src/utils/format';
import { stepPrice } from '@src/core/price-step';
import { t } from '@src/i18n';

// The open orders of a batch, each with the best price of the other traders.
const { orders } = defineProps<{ batch: ArbBatch; orders: PrunApi.CXOrder[] }>();

const $style = useCssModule();

// For each order: the best price of the other traders on the same side of the book.
const lines = computed(() =>
  orders.map(order => {
    const ask = order.type === 'SELLING';
    const book = cxobStore.getByTicker(`${order.material.ticker}.${order.exchange.code}`);
    const ownId = companyStore.value?.id;
    const others = (ask ? book?.sellingOrders : book?.buyingOrders)?.filter(
      x => x.trader.id !== ownId,
    );
    const prices = (others ?? []).map(x => x.limit.amount);
    const best = prices.length > 0 ? (ask ? Math.min(...prices) : Math.max(...prices)) : undefined;
    const price = order.limit.amount;
    const beaten = best !== undefined && (ask ? best <= price : best >= price);
    return { order, best, beaten };
  }),
);
</script>

<template>
  <div :class="$style.orders">
    <div :class="[$style.line, $style.head]">
      <span>{{ t('arblog.market') }}</span>
      <span :class="$style.num">{{ t('cx4.amount') }}</span>
      <span :class="$style.num">{{ t('arblog.yourPrice') }}</span>
      <span :class="$style.num">{{ t('arblog.othersBest') }}</span>
    </div>
    <div v-for="l in lines" :key="l.order.id" :class="['rpz-row', $style.line]">
      <span>
        {{ cxLabel(l.order.exchange.code) }}
        {{ l.order.type === 'SELLING' ? t('arblog.sell') : t('arblog.buy') }}
      </span>
      <span :class="[$style.num, $style.own]"
        >{{ fixed0(l.order.amount) }}/{{ fixed0(l.order.initialAmount) }}</span
      >
      <span :class="[$style.num, $style.own]">{{ stepPrice(l.order.limit.amount) }}</span>
      <span :class="[$style.num, l.beaten ? $style.beaten : $style.muted]">
        {{ l.best !== undefined ? stepPrice(l.best) : '--' }}
      </span>
    </div>
  </div>
</template>
<style module>
.orders {
  display: grid;
}

.line {
  display: grid;
  grid-template-columns: 80px 100px 90px minmax(90px, 1fr);
  gap: 0 var(--rpz-space-2);
  align-items: center;
  padding: 3px 0;
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

.own {
  font-weight: bold;
}

.muted {
  color: var(--rpz-text-weak);
}

.beaten {
  color: var(--rpz-brand);
}

.action {
  justify-self: end;
}

.button {
  padding: 1px 8px;
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

.button:disabled {
  color: var(--rpz-text-off);
  cursor: default;
}
</style>
