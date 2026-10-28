<script setup lang="ts">
import { t, tOptions } from '@src/i18n';
import Active from '@src/components/forms/Active.vue';
import SelectInput from '@src/components/forms/SelectInput.vue';
import RadioItem from '@src/components/forms/RadioItem.vue';
import { Config } from '@src/features/XIT/ACT/actions/cx-buy/config';

const { data, config } = defineProps<{ data: UserData.ActionData; config: Config }>();

const exchanges = ['AI1', 'CI1', 'IC1', 'NC1', 'CI2', 'NC2'];

config.skip ??= false;
config.exchange ??= exchanges[0];
</script>

<template>
  <form>
    <Active v-if="data.skippable" :label="t('act.cxbuy.skip')" :tooltip="t('act.cxbuy.skipTip')">
      <RadioItem v-model="config.skip">{{ t('act.cxbuy.skipToggle') }}</RadioItem>
    </Active>
    <Active v-if="!config.skip" :label="t('act.f.exchange')">
      <SelectInput v-model="config.exchange" :options="tOptions(exchanges)" />
    </Active>
  </form>
</template>
