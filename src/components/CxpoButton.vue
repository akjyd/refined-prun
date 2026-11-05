<script setup lang="ts">
import PrunButton from '@src/components/PrunButton.vue';
import { showBuffer } from '@src/infrastructure/prun-ui/buffers';
import { t } from '@src/i18n';

// Opens CXPO for a material on an exchange, in the same quiet style as the del button.
const { cxTicker } = defineProps<{ cxTicker: string }>();
</script>

<template>
  <PrunButton dark inline @click.stop="showBuffer(`CXPO ${cxTicker}`)">
    {{ t('orders.cxpo') }}
  </PrunButton>
</template>
