<script setup lang="ts">
import { cxLabel } from '@src/core/exchange-label';
import MaterialIcon from '@src/components/MaterialIcon.vue';
import RangeInput from '@src/components/forms/RangeInput.vue';
import { userData } from '@src/store/user-data';
import { createId } from '@src/store/create-id';
import { placeCxOrder } from '@src/infrastructure/prun-ui/utils/place-cx-order';
import { isArbBatchLinked, startArbBatch } from '@src/features/XIT/ARBLOG/arb-batch-store';
import {
  cartLines,
  cartRoute,
  cartShip,
  cartTotals,
  clearCart,
  removeFromCart,
  snapshotOf,
} from '@src/features/XIT/ARB/cart';
import { formatProfit } from '@src/core/daily-profit/profit-format';
import { waitUntil } from '@src/utils/wait';
import { fixed0, fixed01, fixed02, percent1 } from '@src/utils/format';
import { t } from '@src/i18n';

// The cart: goods for one flight, each with a slider and a number field. A good cannot take
// more than its order books allow or than the ship has left.
const { safetyOf } = defineProps<{ safetyOf: (ticker: string) => number | undefined }>();

const $style = useCssModule();

function setUnits(index: number, value: number | string) {
  const line = cartLines.value.at(index);
  const n = Math.floor(Number(value));
  if (line === undefined || !Number.isFinite(n)) {
    return;
  }
  userData.arbCart.items[index].units = Math.max(0, Math.min(n, line.max));
}

function onInput(index: number, event: Event) {
  const input = event.target as HTMLInputElement;
  setUnits(index, input.value);
  input.value = String(userData.arbCart.items[index].units);
}

// The highest offer the buy takes: the limit price of the buy order.
function limitOf(line: (typeof cartLines.value)[number]) {
  const taken = line.trade?.result.fillsA.filter(x => x.take > 0) ?? [];
  return taken.length > 0 ? Math.max(...taken.map(x => x.price)) : undefined;
}

const orders = computed(() =>
  cartLines.value
    .map(line => ({ line, limit: limitOf(line) }))
    .filter(x => x.line.units > 0 && x.limit !== undefined && x.line.trade !== undefined),
);

// Buy all: first a list of the orders to confirm, then one buy order per good.
const confirming = ref(false);
const buying = ref(false);
const report = ref<string[]>([]);

async function buyAll() {
  const route = cartRoute.value;
  if (!route || buying.value) {
    return;
  }
  buying.value = true;
  report.value = [];
  const tripId = createId();
  const bought: string[] = [];
  try {
    for (const { line, limit } of orders.value) {
      const result = line.trade!.result;
      startArbBatch({
        ticker: line.item.ticker,
        from: route.from,
        to: route.to,
        mode: line.item.mode,
        tripId,
        ship: cartShip.value.label,
        snapshot: snapshotOf(result),
        plan: {
          units: result.units,
          cost: result.cost,
          sellPrice: result.sell,
          profit: result.profit,
          return: result.cost > 0 ? result.profit / result.cost : 0,
          safety: safetyOf(line.item.ticker),
        },
      });
      const error = await placeCxOrder(
        `${line.item.ticker}.${route.from}`,
        false,
        result.units,
        limit!,
      );
      if (error !== undefined) {
        report.value.push(t('arb.buyFailed', line.item.ticker, error));
        continue;
      }
      // Wait until the new order is recorded as a batch before the next one.
      await waitUntil(() => isArbBatchLinked(), 10000);
      bought.push(line.item.ticker);
    }
  } finally {
    for (const ticker of bought) {
      removeFromCart(ticker);
    }
    if (bought.length > 0) {
      report.value.unshift(t('arb.buyDone', bought.length));
    }
    buying.value = false;
    confirming.value = false;
  }
}
</script>

<template>
  <div :class="$style.cart">
    <div :class="$style.bar">
      <span
        ><b>{{ t('arb.cart') }}</b> {{ cxLabel(cartRoute?.from) }} →
        {{ cxLabel(cartRoute?.to) }}</span
      >
      <span :class="$style.spacer" />
      <button :class="$style.tertiary" @click="clearCart">{{ t('arb.clearCart') }}</button>
    </div>
    <div :class="$style.capacity">
      <span :class="$style.muted">{{ t('arb.weight') }}</span>
      <span :class="$style.meter"
        ><i :style="{ width: `${Math.min(100, (cartTotals.weight / cartShip.weight) * 100)}%` }"
      /></span>
      <span :class="$style.num"
        >{{ fixed01(cartTotals.weight) }} / {{ fixed0(cartShip.weight) }} t</span
      >
      <span :class="$style.muted">{{ t('arb.volume') }}</span>
      <span :class="$style.meter"
        ><i :style="{ width: `${Math.min(100, (cartTotals.volume / cartShip.volume) * 100)}%` }"
      /></span>
      <span :class="$style.num"
        >{{ fixed01(cartTotals.volume) }} / {{ fixed0(cartShip.volume) }} m³</span
      >
    </div>
    <div>
      <div :class="[$style.item, $style.head]">
        <span>{{ t('arb.material') }}</span>
        <span>{{ t('arb.mode') }}</span>
        <span>{{ t('arb.units') }}</span>
        <span />
        <span :class="$style.num">{{ t('arb.weightVolume') }}</span>
        <span :class="$style.num">{{ t('arb.cost') }}</span>
        <span :class="$style.num">{{ t('arb.profit') }}</span>
        <span />
      </div>
      <div v-for="(line, i) in cartLines" :key="line.item.ticker" :class="$style.item">
        <span :class="$style.icon"
          ><MaterialIcon size="inline-table" :ticker="line.item.ticker"
        /></span>
        <span :class="$style.muted">{{
          line.item.mode === 'now' ? t('arb.fill') : t('arb.list')
        }}</span>
        <RangeInput
          :model-value="line.units"
          :min="0"
          :max="Math.max(1, line.max)"
          @update:model-value="setUnits(i, $event ?? 0)" />
        <input
          :id="`arb-cart-${line.item.ticker}`"
          :class="$style.input"
          type="number"
          min="0"
          :max="line.max"
          :value="line.units"
          @change="onInput(i, $event)" />
        <span :class="[$style.num, $style.muted]"
          >{{ fixed01(line.units * line.weight) }}t ·
          {{ fixed01(line.units * line.volume) }}m³</span
        >
        <span :class="$style.num">{{ formatProfit(line.trade?.result.cost ?? 0) }}</span>
        <span :class="[$style.num, C.ColoredValue.positive]">{{
          formatProfit(line.trade?.result.profit ?? 0)
        }}</span>
        <button :class="$style.remove" @click="removeFromCart(line.item.ticker)">×</button>
      </div>
    </div>
    <div :class="$style.totals">
      <span
        ><span :class="$style.muted">{{ t('arb.cost') }}</span>
        {{ formatProfit(cartTotals.cost) }}</span
      >
      <span
        ><span :class="$style.muted">{{ t('arb.profit') }}</span>
        <span :class="C.ColoredValue.positive">{{ formatProfit(cartTotals.profit) }}</span></span
      >
      <span
        ><span :class="$style.muted">{{ t('arb.return') }}</span>
        {{ percent1(cartTotals.return) }}</span
      >
      <span :class="$style.spacer" />
      <button
        v-if="!confirming"
        :class="$style.primary"
        :disabled="orders.length === 0"
        @click="confirming = true">
        {{ t('arb.buyAll') }}
      </button>
    </div>
    <div v-if="confirming" :class="$style.confirm">
      <div :class="[$style.order, $style.head]">
        <span>{{ t('arb.material') }}</span>
        <span>{{ t('arb.mode') }}</span>
        <span :class="$style.num">{{ t('arb.units') }}</span>
        <span :class="$style.num">{{ t('arb.limit') }}</span>
        <span :class="$style.num">{{ t('arb.amountTotal') }}</span>
      </div>
      <div v-for="o in orders" :key="o.line.item.ticker" :class="$style.order">
        <span :class="$style.icon"
          ><MaterialIcon size="inline-table" :ticker="o.line.item.ticker"
        /></span>
        <span :class="$style.muted">{{
          o.line.item.mode === 'now' ? t('arb.fill') : t('arb.list')
        }}</span>
        <span :class="$style.num">{{ fixed0(o.line.trade!.result.units) }}</span>
        <span :class="$style.num">{{ fixed02(o.limit!) }}</span>
        <span :class="$style.num">{{ formatProfit(o.line.trade!.result.cost) }}</span>
      </div>
      <div :class="$style.bar">
        <span :class="$style.spacer" />
        <button :class="$style.tertiary" :disabled="buying" @click="confirming = false">
          {{ t('arb.cancel') }}
        </button>
        <button :class="$style.primary" :disabled="buying" @click="buyAll">
          {{ buying ? t('arb.buying') : t('arb.confirmBuy') }}
        </button>
      </div>
    </div>
    <div v-for="(line, i) in report" :key="i" :class="$style.muted">{{ line }}</div>
  </div>
</template>

<style module>
.cart {
  display: grid;
  gap: var(--rpz-space-2);
  padding: var(--rpz-space-2);
  margin-bottom: var(--rpz-space-2);
  background-color: var(--rpz-bg-raised);
  box-shadow: inset 2px 0 0 var(--rpz-brand);
}

.bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--rpz-space-2) var(--rpz-space-3);
}

.group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.spacer {
  flex: 1;
}

.capacity {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) 130px;
  gap: var(--rpz-space-1) var(--rpz-space-2);
  align-items: center;
}

.meter {
  position: relative;
  height: 8px;
  background-color: #333;
}

.meter i {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  background-color: var(--rpz-brand);
}

.item {
  display: grid;
  grid-template-columns: 44px 44px minmax(140px, 1fr) 80px 130px 90px 80px 20px;
  gap: 0 var(--rpz-space-2);
  align-items: center;
  padding: var(--rpz-space-1) 0;
  border-top: 1px solid var(--rpz-stroke-weak);
}

.head {
  color: var(--rpz-text-weak);
  border-top: none;
}

.icon {
  display: inline-flex;
}

.num {
  text-align: right;
}

.muted {
  color: var(--rpz-text-weak);
}

.input {
  width: 80px;
  padding: 2px 6px;
  border: 1px solid var(--rpz-stroke);
  background-color: var(--rpz-bg-base);
  color: var(--rpz-text);
  font: inherit;
  outline: none;
}

.input:focus {
  border-color: var(--rpz-brand);
}

.remove {
  padding: 0;
  border: none;
  background: none;
  color: var(--rpz-text-weak);
  font: inherit;
  cursor: pointer;
}

.remove:hover {
  color: var(--rpz-text);
}

.totals {
  display: flex;
  align-items: center;
  gap: var(--rpz-space-3);
  padding-top: var(--rpz-space-1);
  border-top: 1px solid var(--rpz-stroke-weak);
}

.primary {
  padding: 3px 12px;
  border: none;
  background-color: var(--rpz-brand);
  color: var(--rpz-on-brand);
  font: inherit;
  cursor: pointer;
}

.primary:disabled {
  opacity: 0.5;
  cursor: default;
}

.tertiary {
  padding: 2px;
  border: none;
  background: none;
  color: var(--rpz-text-weak);
  font: inherit;
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
}

.tertiary:hover {
  color: var(--rpz-text);
}

.confirm {
  display: grid;
  gap: 2px;
  padding: var(--rpz-space-2);
  background-color: var(--rpz-bg-base);
  border: 1px solid var(--rpz-stroke);
}

.order {
  display: grid;
  grid-template-columns: 44px 44px 80px 100px 100px;
  gap: 0 var(--rpz-space-2);
  align-items: center;
  padding: 2px 0;
}
</style>
