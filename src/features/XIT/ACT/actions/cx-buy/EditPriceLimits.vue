<script setup lang="ts">
import { t } from '@src/i18n';
import { objectId } from '@src/utils/object-id';
import NumberInput from '@src/components/forms/NumberInput.vue';
import PrunButton from '@src/components/PrunButton.vue';
import Active from '@src/components/forms/Active.vue';
import TextInput from '@src/components/forms/TextInput.vue';
import Commands from '@src/components/forms/Commands.vue';
import SectionHeader from '@src/components/SectionHeader.vue';

const { priceLimits } = defineProps<{
  priceLimits: [string, number][];
}>();

const emit = defineEmits<{ (e: 'close'): void }>();

function onAddClick() {
  priceLimits.push(['', 0]);
}
</script>

<template>
  <div :class="C.DraftConditionEditor.form">
    <SectionHeader>{{ t('act.cxbuy.editLimits') }}</SectionHeader>
    <form>
      <template v-for="(pair, i) in priceLimits" :key="objectId(pair)">
        <Active :label="t('act.f.tickerN', i + 1)">
          <TextInput v-model="pair[0]" />
        </Active>
        <Active :label="t('act.cxbuy.limitN', i + 1)">
          <NumberInput v-model="pair[1]" float />
        </Active>
      </template>
      <Commands>
        <PrunButton primary @click="onAddClick">{{ t('act.common.add') }}</PrunButton>
      </Commands>
      <Commands>
        <PrunButton primary @click="emit('close')">{{ t('act.f.close') }}</PrunButton>
      </Commands>
    </form>
  </div>
</template>
