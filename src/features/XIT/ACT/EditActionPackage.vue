<script setup lang="ts">
import { t, tType } from '@src/i18n';
import Header from '@src/components/Header.vue';
import SectionHeader from '@src/components/SectionHeader.vue';
import Commands from '@src/components/forms/Commands.vue';
import PrunButton from '@src/components/PrunButton.vue';
import { showConfirmationOverlay, showTileOverlay } from '@src/infrastructure/prun-ui/tile-overlay';
import removeArrayElement from '@src/utils/remove-array-element';
import { objectId } from '@src/utils/object-id';
import { act } from '@src/features/XIT/ACT/act-registry';
import { showBuffer } from '@src/infrastructure/prun-ui/buffers';
import EditMaterialGroup from '@src/features/XIT/ACT/EditMaterialGroup.vue';
import EditAction from '@src/features/XIT/ACT/EditAction.vue';
import { downloadJson } from '@src/utils/json-file';
import { deepToRaw } from '@src/utils/deep-to-raw';
import RenameActionPackage from '@src/features/XIT/ACT/RenameActionPackage.vue';
import { vDraggable } from 'vue-draggable-plus';
import { grip } from '@src/components/grip';
import GripCell from '@src/components/grip/GripCell.vue';
import GripHeaderCell from '@src/components/grip/GripHeaderCell.vue';
import { isValidPackageName } from '@src/features/XIT/ACT/utils';

const { pkg } = defineProps<{ pkg: UserData.ActionPackageData }>();

function onAddMaterialGroupClick(e: Event) {
  const group: UserData.MaterialGroupData = {
    name: '',
    type: 'Resupply',
  };
  showTileOverlay(e, EditMaterialGroup, {
    add: true,
    group,
    onSave: () => pkg.groups.push(group),
  });
}

function onEditMaterialGroupClick(e: Event, group: UserData.MaterialGroupData) {
  showTileOverlay(e, EditMaterialGroup, { group });
}

function onDeleteMaterialGroupClick(e: Event, group: UserData.MaterialGroupData) {
  showConfirmationOverlay(e, () => removeArrayElement(pkg.groups, group), {
    message: t('act.edit.confirmDeleteGroup', group.name ?? '--'),
    confirmLabel: t('act.common.delete'),
  });
}

function onAddActionClick(e: Event) {
  const action: UserData.ActionData = {
    name: '',
    type: 'MTRA',
  };
  showTileOverlay(e, EditAction, {
    add: true,
    action,
    pkg,
    onSave: () => pkg.actions.push(action),
  });
}

function onEditActionClick(e: Event, action: UserData.ActionData) {
  showTileOverlay(e, EditAction, { action, pkg });
}

function onDeleteActionClick(e: Event, action: UserData.ActionData) {
  showConfirmationOverlay(e, () => removeArrayElement(pkg.actions, action), {
    message: t('act.edit.confirmDeleteAction', action.name ?? '--'),
    confirmLabel: t('act.common.delete'),
  });
}

function getMaterialGroupDescription(group: UserData.MaterialGroupData) {
  const info = act.getMaterialGroupInfo(group.type);
  return info ? info.description(group) : '--';
}

function getActionDescription(action: UserData.ActionData) {
  const info = act.getActionInfo(action.type);
  return info ? info.description(action) : '--';
}

function validatePackageName(name: string) {
  return isValidPackageName(name) ? true : t('act.edit.invalidName');
}

function onRenameClick(ev: Event) {
  showTileOverlay(ev, RenameActionPackage, {
    name: pkg.global.name,
    onRename: name => (pkg.global.name = name),
  });
}

function onExecuteClick() {
  showBuffer(`XIT ACT_${pkg.global.name.replace(' ', '_')}`);
}

function onExportClick() {
  const json = deepToRaw(pkg);
  downloadJson(json, `${pkg.global.name.replace(' ', '_')}-${Date.now()}.json`);
}
</script>

<template>
  <Header
    v-model="pkg.global.name"
    editable
    :validate="validatePackageName"
    :class="$style.header" />
  <SectionHeader>{{ t('act.edit.groups') }}</SectionHeader>
  <table>
    <thead>
      <tr>
        <GripHeaderCell />
        <th>{{ t('act.common.type') }}</th>
        <th>{{ t('act.common.name') }}</th>
        <th>{{ t('act.common.content') }}</th>
        <th />
      </tr>
    </thead>
    <tbody v-if="pkg.groups.length === 0">
      <tr>
        <td colspan="4" :class="$style.emptyRow">{{ t('act.edit.noGroups') }}</td>
      </tr>
    </tbody>
    <tbody v-else v-draggable="[pkg.groups, grip.draggable]">
      <tr v-for="group in pkg.groups" :key="objectId(group)">
        <GripCell />
        <td>{{ tType(group.type) }}</td>
        <td>{{ group.name || '--' }}</td>
        <td>{{ getMaterialGroupDescription(group) }}</td>
        <td>
          <PrunButton dark inline @click="onEditMaterialGroupClick($event, group)">
            {{ t('act.common.editSmall') }}
          </PrunButton>
          <PrunButton dark inline @click="onDeleteMaterialGroupClick($event, group)">
            {{ t('act.common.deleteSmall') }}
          </PrunButton>
        </td>
      </tr>
    </tbody>
  </table>
  <form :class="$style.sectionCommands">
    <Commands>
      <PrunButton primary @click="onAddMaterialGroupClick">{{ t('act.common.add') }}</PrunButton>
    </Commands>
  </form>
  <SectionHeader>{{ t('act.edit.actions') }}</SectionHeader>
  <table>
    <thead>
      <tr>
        <GripHeaderCell />
        <th>{{ t('act.common.type') }}</th>
        <th>{{ t('act.common.name') }}</th>
        <th>{{ t('act.common.content') }}</th>
        <th />
      </tr>
    </thead>
    <tbody v-if="pkg.actions.length === 0">
      <tr>
        <td colspan="4" :class="$style.emptyRow">{{ t('act.edit.noActions') }}</td>
      </tr>
    </tbody>
    <tbody v-else v-draggable="[pkg.actions, grip.draggable]">
      <tr v-for="action in pkg.actions" :key="objectId(action)">
        <GripCell />
        <td>{{ tType(action.type) }}</td>
        <td>{{ action.name || '--' }}</td>
        <td>{{ getActionDescription(action) }}</td>
        <td>
          <PrunButton dark inline @click="onEditActionClick($event, action)">{{
            t('act.common.editSmall')
          }}</PrunButton>
          <PrunButton dark inline @click="onDeleteActionClick($event, action)">{{
            t('act.common.deleteSmall')
          }}</PrunButton>
        </td>
      </tr>
    </tbody>
  </table>
  <form :class="$style.sectionCommands">
    <Commands>
      <PrunButton primary @click="onAddActionClick">{{ t('act.common.add') }}</PrunButton>
    </Commands>
  </form>
  <SectionHeader>{{ t('act.edit.commands') }}</SectionHeader>
  <form>
    <Commands :label="t('act.edit.rename')">
      <PrunButton primary @click="onRenameClick">{{ t('act.common.rename') }}</PrunButton>
    </Commands>
    <Commands :label="t('act.edit.execute')">
      <PrunButton primary @click="onExecuteClick">{{ t('act.common.execute') }}</PrunButton>
    </Commands>
    <Commands :label="t('act.edit.export')">
      <PrunButton primary @click="onExportClick">{{ t('act.edit.exportButton') }}</PrunButton>
    </Commands>
  </form>
</template>

<style module>
.header {
  margin-left: 4px;
}

.emptyRow {
  text-align: center;
}

.sectionCommands {
  margin-top: 0.75rem;
}
</style>
