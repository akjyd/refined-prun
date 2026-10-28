<script setup lang="ts">
import { t } from '@src/i18n';
import ActionBar from '@src/components/ActionBar.vue';
import PrunButton from '@src/components/PrunButton.vue';
import { showBuffer } from '@src/infrastructure/prun-ui/buffers';
import { showConfirmationOverlay, showTileOverlay } from '@src/infrastructure/prun-ui/tile-overlay';
import CreateActionPackage from '@src/features/XIT/ACT/CreateActionPackage.vue';
import ImportActionPackage from '@src/features/XIT/ACT/ImportActionPackage.vue';
import Quickstart from '@src/features/XIT/ACT/Quickstart.vue';
import { userData } from '@src/store/user-data';
import PrunLink from '@src/components/PrunLink.vue';
import removeArrayElement from '@src/utils/remove-array-element';
import { objectId } from '@src/utils/object-id';
import { vDraggable } from 'vue-draggable-plus';
import { grip } from '@src/components/grip';
import GripCell from '@src/components/grip/GripCell.vue';
import GripHeaderCell from '@src/components/grip/GripHeaderCell.vue';

const actionPackages = computed(() => userData.actionPackages);
const showQuickstart = computed(() => userData.actionPackages.length === 0);

function onQuickstartClick(ev: Event) {
  showTileOverlay(ev, Quickstart);
}

function onCreateClick(ev: Event) {
  showTileOverlay(ev, CreateActionPackage, {
    onCreate: name => {
      userData.actionPackages.push({
        global: { name },
        groups: [],
        actions: [],
      });
      showBuffer('XIT ACT_EDIT_' + name.split(' ').join('_'));
    },
  });
}

function onImportClick(ev: Event) {
  showTileOverlay(ev, ImportActionPackage, {
    onImport: json => {
      const existing = userData.actionPackages.find(x => x.global.name === json.global.name);
      if (existing) {
        const index = userData.actionPackages.indexOf(existing);
        userData.actionPackages[index] = json;
      } else {
        userData.actionPackages.push(json);
      }
    },
  });
}

function onDeleteClick(ev: Event, pkg: UserData.ActionPackageData) {
  showConfirmationOverlay(ev, () => removeArrayElement(userData.actionPackages, pkg), {
    message: t('act.list.confirmDelete', pkg.global.name),
    confirmLabel: t('act.common.delete'),
  });
}

function friendlyName(pkg: UserData.ActionPackageData) {
  return pkg.global.name.split('_').join(' ');
}

function paramName(pkg: UserData.ActionPackageData) {
  return pkg.global.name.split(' ').join('_');
}
</script>

<template>
  <ActionBar>
    <div v-if="showQuickstart"
      >{{ t('act.list.quickstartHint1') }}<br />{{ t('act.list.quickstartHint2') }}</div
    >
    <div v-if="showQuickstart">→</div>
    <PrunButton v-if="showQuickstart" primary @click="onQuickstartClick">{{
      t('act.list.quickstart')
    }}</PrunButton>
    <PrunButton primary @click="onCreateClick">{{ t('act.list.createNew') }}</PrunButton>
    <PrunButton primary @click="onImportClick">{{ t('act.common.import') }}</PrunButton>
  </ActionBar>
  <table>
    <thead>
      <tr>
        <GripHeaderCell />
        <th>{{ t('act.common.name') }}</th>
        <th>{{ t('act.list.colExecute') }}</th>
        <th>{{ t('act.list.colEdit') }}</th>
        <th>{{ t('act.list.colDelete') }}</th>
      </tr>
    </thead>
    <tbody v-if="userData.actionPackages.length === 0">
      <tr>
        <td colspan="5">{{ t('act.list.empty') }}</td>
      </tr>
    </tbody>
    <tbody v-else v-draggable="[actionPackages, grip.draggable]">
      <tr v-for="pkg in actionPackages" :key="objectId(pkg)">
        <GripCell />
        <td>
          <PrunLink inline :command="`XIT ACT_${paramName(pkg)}`">
            {{ friendlyName(pkg) }}
          </PrunLink>
        </td>
        <td>
          <PrunButton primary @click="showBuffer(`XIT ACT_${paramName(pkg)}`)">
            {{ t('act.common.execute') }}
          </PrunButton>
        </td>
        <td>
          <PrunButton primary @click="showBuffer(`XIT ACT_EDIT_${paramName(pkg)}`)">
            {{ t('act.common.edit') }}
          </PrunButton>
        </td>
        <td>
          <PrunButton dark inline @click="onDeleteClick($event, pkg)">{{
            t('act.common.deleteSmall')
          }}</PrunButton>
        </td>
      </tr>
    </tbody>
  </table>
</template>
