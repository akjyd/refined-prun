<script setup lang="ts">
import { t } from '@src/i18n';
import SectionHeader from '@src/components/SectionHeader.vue';
import PrunButton from '@src/components/PrunButton.vue';
import Commands from '@src/components/forms/Commands.vue';
import {
  importPmmgActions,
  importPmmgFinancialHistory,
  importPmmgNotes,
  importPmmgSettings,
  importPmmgCommandLists,
} from '@src/infrastructure/storage/pmmg-import';
</script>

<template>
  <SectionHeader>{{ t('set.pmmg.title') }}</SectionHeader>
  <form>
    <Commands label="pmmg-settings.json">
      <PrunButton primary @click="importPmmgSettings">{{ t('set.pmmg.settings') }}</PrunButton>
    </Commands>
    <Commands label="pmmg-finance.json">
      <PrunButton primary @click="importPmmgFinancialHistory">{{
        t('set.pmmg.finance')
      }}</PrunButton>
    </Commands>
    <Commands label="pmmg-notes.json">
      <PrunButton primary @click="importPmmgNotes">{{ t('set.pmmg.notes') }}</PrunButton>
    </Commands>
    <Commands label="pmmg-action.json">
      <PrunButton primary @click="importPmmgActions">{{ t('set.pmmg.actions') }}</PrunButton>
    </Commands>
    <Commands label="pmmg-lists.json">
      <PrunButton primary @click="importPmmgCommandLists">{{ t('set.pmmg.lists') }}</PrunButton>
    </Commands>
  </form>
</template>

<style scoped></style>
