<script setup lang="ts">
import { bought, sold } from '@src/core/arb-batches';
import { userData } from '@src/store/user-data';
import { fixed0 } from '@src/utils/format';
import { t } from '@src/i18n';

// "倒 209" on an inventory item: units of the material in arbitrage batches not sold yet.
const { ticker } = defineProps<{ ticker: string | null }>();

const batches = computed(() =>
  userData.arbBatches.filter(x => x.ticker === ticker && bought(x) - sold(x) > 0),
);
const units = computed(() => sumBy(batches.value, x => bought(x) - sold(x)));

const tip = computed(() =>
  batches.value
    .map(x =>
      t('arblog.badgeTip', x.from, x.to, fixed0(bought(x) - sold(x)), fixed0(x.plan.sellPrice)),
    )
    .join('\n'),
);
</script>

<template>
  <div v-if="units > 0" :class="$style.badge" :title="tip">
    {{ t('arblog.badge') }} {{ fixed0(units) }}
  </div>
</template>

<style module>
.badge {
  position: absolute;
  top: 1px;
  left: 1px;
  z-index: 1;
  padding: 0 2px;
  border-radius: 2px;
  background-color: var(--rpz-brand);
  color: var(--rpz-on-brand);
  font-size: 9px;
  font-weight: bold;
  line-height: 12px;
  pointer-events: auto;
}
</style>
