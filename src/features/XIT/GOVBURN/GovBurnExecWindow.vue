<script setup lang="ts">
import { t } from '@src/i18n';
import ExecuteActionPackage from '@src/features/XIT/ACT/ExecuteActionPackage.vue';
import { stagedGovBurn } from '@src/features/XIT/GOVBURN/staged';
import { useMinBufferHeight } from '@src/hooks/use-min-buffer-height';

const pkg = stagedGovBurn.value?.pkg;

useMinBufferHeight();
</script>

<template>
  <div v-if="!pkg">{{ t('gov.exec.nothing') }}</div>
  <ExecuteActionPackage v-else :pkg="pkg" />
</template>
