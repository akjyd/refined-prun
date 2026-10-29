<script setup lang="ts">
import { t } from '@src/i18n';
import PrunButton from '@src/components/PrunButton.vue';
import SectionHeader from '@src/components/SectionHeader.vue';
import Tooltip from '@src/components/Tooltip.vue';
import TextInput from '@src/components/forms/TextInput.vue';
import Active from '@src/components/forms/Active.vue';
import NumberInput from '@src/components/forms/NumberInput.vue';
import Commands from '@src/components/forms/Commands.vue';
import { showConfirmationOverlay } from '@src/infrastructure/prun-ui/tile-overlay';
import { initialUserData, userData } from '@src/store/user-data';
import {
  downloadBackup,
  exportUserData,
  importUserData,
  resetUserData,
  restoreBackup,
  saveUserData,
} from '@src/infrastructure/storage/user-data-serializer';
import SelectInput from '@src/components/forms/SelectInput.vue';
import { objectId } from '@src/utils/object-id';
import {
  deleteUserDataBackup,
  getUserDataBackups,
  UserDataBackup,
} from '@src/infrastructure/storage/user-data-backup';
import { ddmmyyyy, hhForXitSet, hhmm } from '@src/utils/format';
import dayjs from 'dayjs';
import { vDraggable } from 'vue-draggable-plus';
import { grip } from '@src/components/grip';
import GripChar from '@src/components/grip/GripChar.vue';

const isDefault24 = computed(() => {
  return hhForXitSet.value(dayjs.duration(12, 'hours').asMilliseconds()) === '13';
});

const timeFormats = computed(() => {
  return [
    {
      label: '24h',
      value: '24H',
    },
    {
      label: '12h',
      value: '12H',
    },
  ] as { label: string; value: UserData.TimeFormat }[];
});

const timeFormat = computed({
  get: () => {
    const format = userData.settings.time;
    if (format === 'DEFAULT') {
      return isDefault24.value ? '24H' : '12H';
    }
    return format;
  },
  set: value => (userData.settings.time = value),
});

const exchangeChartTypes: { label: string; value: UserData.ExchangeChartType }[] = [
  {
    label: t('set.opt.smooth'),
    value: 'SMOOTH',
  },
  {
    label: t('set.opt.aligned'),
    value: 'ALIGNED',
  },
  {
    label: t('set.opt.raw'),
    value: 'RAW',
  },
];

const currencySettings = computed(() => userData.settings.currency);

const currencyPresets: { label: string; value: UserData.CurrencyPreset }[] = [
  {
    label: t('set.opt.default'),
    value: 'DEFAULT',
  },
  {
    label: '₳',
    value: 'AIC',
  },
  {
    label: '₡',
    value: 'CIS',
  },
  {
    label: 'ǂ',
    value: 'ICA',
  },
  {
    label: '₦',
    value: 'NCC',
  },
  {
    label: t('set.opt.custom'),
    value: 'CUSTOM',
  },
];

const currencyPosition: { label: string; value: UserData.CurrencyPosition }[] = [
  {
    label: t('set.opt.after'),
    value: 'AFTER',
  },
  {
    label: t('set.opt.before'),
    value: 'BEFORE',
  },
];

const currencySpacing: { label: string; value: UserData.CurrencySpacing }[] = [
  {
    label: t('set.opt.hasSpace'),
    value: 'HAS_SPACE',
  },
  {
    label: t('set.opt.noSpace'),
    value: 'NO_SPACE',
  },
];

const backups = computed(() => getUserDataBackups());

function addSidebarButton() {
  userData.settings.sidebar.push(['SET', 'XIT SET']);
}

function deleteSidebarButton(index: number) {
  userData.settings.sidebar.splice(index, 1);
}

function confirmResetSidebar(ev: Event) {
  showConfirmationOverlay(ev, () => {
    userData.settings.sidebar = structuredClone(initialUserData.settings.sidebar);
  });
}

function importUserDataAndReload() {
  importUserData(async () => {
    await saveUserData();
    window.location.reload();
  });
}

async function restoreBackupAndReload(ev: Event, backup: UserDataBackup) {
  showConfirmationOverlay(
    ev,
    async () => {
      restoreBackup(backup);
      await saveUserData();
      window.location.reload();
    },
    {
      message: t('set.game.restoreConfirm'),
    },
  );
}

function confirmDeleteBackup(ev: Event, backup: UserDataBackup) {
  showConfirmationOverlay(ev, () => deleteUserDataBackup(backup));
}

function confirmResetAllData(ev: Event) {
  showConfirmationOverlay(ev, async () => {
    resetUserData();
    await saveUserData();
    window.location.reload();
  });
}
</script>

<template>
  <SectionHeader>{{ t('set.game.appearance') }}</SectionHeader>
  <form>
    <Active :label="t('set.game.timeFormat')">
      <SelectInput v-model="timeFormat" :options="timeFormats" />
    </Active>
    <Active :label="t('set.game.chartType')">
      <SelectInput v-model="userData.settings.defaultChartType" :options="exchangeChartTypes" />
    </Active>
  </form>
  <SectionHeader>
    {{ t('set.game.currency') }}
    <Tooltip :class="$style.tooltip" :tooltip="t('set.game.currencyTip')" />
  </SectionHeader>
  <form>
    <Active :label="t('set.game.symbol')">
      <SelectInput v-model="currencySettings.preset" :options="currencyPresets" />
    </Active>
    <Active v-if="currencySettings.preset === 'CUSTOM'" :label="t('set.game.customSymbol')">
      <TextInput v-model="currencySettings.custom" />
    </Active>
    <Active v-if="currencySettings.preset !== 'DEFAULT'" :label="t('set.game.position')">
      <SelectInput v-model="currencySettings.position" :options="currencyPosition" />
    </Active>
    <Active
      v-if="currencySettings.preset !== 'DEFAULT'"
      :label="t('set.game.spacing')"
      :tooltip="t('set.game.spacingTip')">
      <SelectInput v-model="currencySettings.spacing" :options="currencySpacing" />
    </Active>
  </form>
  <SectionHeader>{{ t('set.game.burn') }}</SectionHeader>
  <form>
    <Active :label="t('set.game.red')" :tooltip="t('set.game.redTip')">
      <NumberInput v-model="userData.settings.burn.red" float />
    </Active>
    <Active :label="t('set.game.yellow')" :tooltip="t('set.game.yellowTip')">
      <NumberInput v-model="userData.settings.burn.yellow" float />
    </Active>
    <Active :label="t('set.game.resupply')" :tooltip="t('set.game.resupplyTip')">
      <NumberInput v-model="userData.settings.burn.resupply" float />
    </Active>
  </form>
  <SectionHeader>
    {{ t('set.game.sidebar') }}
    <Tooltip :class="$style.tooltip" :tooltip="t('set.game.sidebarTip')" />
  </SectionHeader>
  <form v-draggable="[userData.settings.sidebar, grip.draggable]">
    <Active
      v-for="(button, i) in userData.settings.sidebar"
      :key="objectId(button)"
      :label="t('set.game.buttonN', i + 1)"
      :class="$style.sidebarRow">
      <div :class="$style.sidebarInputPair">
        <GripChar :class="[$style.grip, grip.class]" />
        <TextInput v-model="button[0]" :class="$style.sidebarInput" />
        <TextInput v-model="button[1]" :class="$style.sidebarInput" />
        <PrunButton danger @click="deleteSidebarButton(i)">x</PrunButton>
      </div>
    </Active>
  </form>
  <form>
    <Commands>
      <PrunButton primary @click="confirmResetSidebar">{{ t('set.game.reset') }}</PrunButton>
      <PrunButton primary @click="addSidebarButton">{{ t('set.game.addNew') }}</PrunButton>
    </Commands>
  </form>
  <SectionHeader>{{ t('set.game.importExport') }}</SectionHeader>
  <form>
    <Commands>
      <PrunButton primary @click="importUserDataAndReload">{{ t('set.game.import') }}</PrunButton>
      <PrunButton primary @click="exportUserData">{{ t('set.game.export') }}</PrunButton>
    </Commands>
  </form>
  <template v-if="backups.length > 0">
    <SectionHeader>{{ t('set.game.backups') }}</SectionHeader>
    <form>
      <Commands
        v-for="backup in backups"
        :key="backup.timestamp"
        :label="ddmmyyyy(backup.timestamp) + ' ' + hhmm(backup.timestamp)">
        <PrunButton primary @click="downloadBackup(backup.data, backup.timestamp)">
          {{ t('set.game.backupExport') }}
        </PrunButton>
        <PrunButton primary @click="restoreBackupAndReload($event, backup.data)">
          {{ t('set.game.backupRestore') }}
        </PrunButton>
        <PrunButton danger @click="confirmDeleteBackup($event, backup)">{{
          t('set.game.backupDelete')
        }}</PrunButton>
      </Commands>
    </form>
  </template>
  <SectionHeader>{{ t('set.game.danger') }}</SectionHeader>
  <form>
    <Commands>
      <PrunButton danger @click="confirmResetAllData">{{ t('set.game.resetAll') }}</PrunButton>
    </Commands>
  </form>
</template>

<style module>
.tooltip {
  float: revert;
  font-size: 12px;
  margin-top: -4px;
}

.sidebarInputPair {
  display: flex;
  justify-content: flex-end;
  column-gap: 10px;
}

.sidebarInput {
  width: 40%;
}

.sidebarInput input {
  width: 100%;
}

.grip {
  cursor: move;
  transition: opacity 0.2s ease-in-out;
  opacity: 0;
}

.sidebarRow:hover .grip {
  opacity: 1;
}
</style>
