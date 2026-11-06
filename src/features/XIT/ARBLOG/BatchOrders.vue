<script setup lang="ts">
import { cxLabel } from '@src/core/exchange-label';
import { ArbBatch } from '@src/core/arb-batches';
import { dropPrice } from '@src/core/price-step';
import { cxobStore } from '@src/infrastructure/prun-api/data/cxob';
import { companyStore } from '@src/infrastructure/prun-api/data/company';
import { repriceOrder } from '@src/infrastructure/prun-ui/utils/reprice-order';
import { startChase } from '@src/features/XIT/ARBLOG/arb-batch-store';
import { fixed0, fixed02 } from '@src/utils/format';
import { t } from '@src/i18n';

// The open orders of a batch, each with the best price of the other traders and a chase button
// that places this one order one price step past it.
const { batch, orders } = defineProps<{ batch: ArbBatch; orders: PrunApi.CXOrder[] }>();

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
    const chaseTo = beaten
      ? ask
        ? dropPrice(true, best)
        : dropPrice(false, undefined, best)
      : undefined;
    return { order, best, chaseTo, beaten };
  }),
);

const busy = ref(false);

async function chase(event: MouseEvent, line: (typeof lines.value)[number]) {
  if (busy.value || line.chaseTo === undefined) {
    return;
  }
  busy.value = true;
  try {
    if (line.order.type === 'BUYING') {
      startChase(batch.id, line.order.material.ticker, line.order.exchange.code);
    }
    await repriceOrder(event.currentTarget as Element, line.order, line.chaseTo);
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div :class="$style.orders">
    <div :class="[$style.line, $style.head]">
      <span>{{ t('arblog.market') }}</span>
      <span :class="$style.num">{{ t('cx4.amount') }}</span>
      <span :class="$style.num">{{ t('arblog.yourPrice') }}</span>
      <span :class="$style.num">{{ t('arblog.othersBest') }}</span>
      <span />
    </div>
    <div v-for="l in lines" :key="l.order.id" :class="$style.line">
      <span>
        {{ cxLabel(l.order.exchange.code) }}
        {{ l.order.type === 'SELLING' ? t('arblog.sell') : t('arblog.buy') }}
      </span>
      <span :class="[$style.num, $style.own]"
        >{{ fixed0(l.order.amount) }}/{{ fixed0(l.order.initialAmount) }}</span
      >
      <span :class="[$style.num, $style.own]">{{ fixed02(l.order.limit.amount) }}</span>
      <span :class="[$style.num, l.beaten ? $style.beaten : $style.muted]">
        {{ l.best !== undefined ? fixed02(l.best) : '--' }}
      </span>
      <span :class="$style.action">
        <button
          v-if="l.chaseTo !== undefined"
          :class="$style.button"
          :disabled="busy"
          @click="chase($event, l)">
          {{ t('arblog.chase', fixed02(l.chaseTo)) }}
        </button>
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
  grid-template-columns: 80px 100px 90px 90px minmax(0, 1fr);
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
