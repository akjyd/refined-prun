<script setup lang="ts">
import DeleteExchangeOrderButton from '@src/components/DeleteExchangeOrderButton.vue';
import { showBuffer } from '@src/infrastructure/prun-ui/buffers';
import { fixed02 } from '@src/utils/format';

// The four cells of one order in a book, shared by XIT CX4, ARB, ARBLOG and ORDERS, so that the
// columns cannot drift apart between them (player, 2026-11-07).
//   1. the daily profit, or the trader's name
//   2. the del button and the mark for what is new or changed
//   3. the amount, which opens the order when it is yours
//   4. the price
const { own, orderId } = defineProps<{
  // The first cell: a trader name is text and stays left, a daily profit is a number.
  lead?: string;
  leadClass?: string;
  leadIsText?: boolean;
  mark?: string;
  amount: string;
  price: number;
  own?: boolean;
  orderId?: string;
  deletable?: boolean;
  // A trader name opens that company; a daily profit does nothing.
  leadClickable?: boolean;
}>();

const emit = defineEmits<{ leadClick: [] }>();

const $style = useCssModule();
</script>

<template>
  <span
    :class="[
      leadIsText ? $style.trader : $style.profitCell,
      leadClass,
      leadClickable ? $style.clickable : undefined,
      leadIsText && !own ? $style.weak : undefined,
    ]"
    @click.stop="leadClickable && emit('leadClick')"
    >{{ lead }}</span
  >
  <span :class="$style.markCell">
    <span v-if="deletable && orderId" :class="$style.delSlot"
      ><DeleteExchangeOrderButton :order-id="orderId" screen-command="CXOS"
    /></span>
    <span class="rpz-mark">{{ mark ?? '' }}</span>
  </span>
  <span :class="[$style.num, $style.amount]">
    <span
      :class="[own && orderId ? $style.clickable : undefined, own ? undefined : $style.weak]"
      @click.stop="own && orderId && showBuffer(`CXO ${orderId.substring(0, 8)}`)"
      >{{ amount }}</span
    >
  </span>
  <span :class="$style.num">{{ fixed02(price) }}</span>
</template>

<style module>
.profitCell {
  text-align: right;
}

.trader {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.markCell {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 2px;
  /* The row lines up on the text baseline, so this cell says where its middle is. */
  align-self: center;
}

/* The del button places itself at the left of a box, so it gets a box of its own. */
.delSlot {
  position: relative;
  flex: 0 0 auto;
  width: 22px;
  height: 14px;
}

.amount {
  position: relative;
}

.num {
  text-align: right;
}

/* Tone order in a book: your own orders, then prices, then amounts and traders. */
.weak {
  color: var(--rpz-text-weak);
}

/* Clickable text keeps its ink tone; the brand color shows on hover. */
.clickable {
  cursor: pointer;
}

.clickable:hover {
  color: var(--rpz-brand);
}
</style>
