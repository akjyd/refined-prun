<script setup lang="ts">
import { t } from '@src/i18n';
import Active from '@src/components/forms/Active.vue';
import Commands from '@src/components/forms/Commands.vue';
import SelectInput from '@src/components/forms/SelectInput.vue';
import PrunButton from '@src/components/PrunButton.vue';
import SectionHeader from '@src/components/SectionHeader.vue';
import { popiBuildings } from '@src/core/popi-buildings';
import {
  buildImportPlan,
  parseGovBurnImport,
  type GovBurnImportPlan,
  type GovBurnImportRow,
} from '@src/features/XIT/GOVBURN/govburn-import';
import { planetsStore } from '@src/infrastructure/prun-api/data/planets';
import { userData } from '@src/store/user-data';
import { uploadJson } from '@src/utils/json-file';

const emit = defineEmits<{ (e: 'done'): void }>();

type ImportType = 'TEXT' | 'FILE';

const typeOptions: { label: string; value: ImportType }[] = [
  { label: t('act.import.paste'), value: 'TEXT' },
  { label: t('act.import.upload'), value: 'FILE' },
];

const type = ref('TEXT' as ImportType);
const text = ref('');
const error = ref(false);
const errorMessage = ref('');
const plan = ref<GovBurnImportPlan | undefined>(undefined);
const naturalId = ref('');
const planetLabel = ref('');

function planetName(id: string) {
  return userData.govburn.planets[id]?.name ?? planetsStore.find(id)?.name ?? id;
}

function formatCountMaterials(count: number, materials: string[]) {
  if (count === -1) {
    return '--';
  }
  if (materials.length === 0) {
    return String(count);
  }
  return `${count} (${materials.join(', ')})`;
}

function rowNote(row: GovBurnImportRow) {
  const notes: string[] = [];
  if (row.omitted) {
    notes.push(t('gov.imp.notInImport'));
  }
  if (row.clamped) {
    notes.push(t('gov.imp.clamped', row.count));
  }
  if (row.unknownMaterials.length > 0) {
    notes.push(t('gov.imp.notUpkeep', row.unknownMaterials.join(', ')));
  }
  return notes.join('; ');
}

function applyJson(json: unknown) {
  const input = parseGovBurnImport(json);
  if (input === undefined) {
    error.value = true;
    errorMessage.value = t('gov.imp.invalidJson');
    return;
  }
  const planet = planetsStore.find(input.planet);
  if (planet === undefined) {
    error.value = true;
    errorMessage.value = t('gov.planetNotFound');
    return;
  }
  error.value = false;
  errorMessage.value = '';
  naturalId.value = planet.naturalId;
  planetLabel.value = planetName(planet.naturalId);
  plan.value = buildImportPlan(
    input,
    userData.govburn.planets[planet.naturalId],
    userData.govburn.config.planets[planet.naturalId],
    userData.govburn.config.slots[planet.naturalId],
  );
}

function onPreviewClick() {
  if (text.value.length === 0) {
    error.value = true;
    errorMessage.value = t('gov.imp.invalidJson');
    return;
  }
  try {
    applyJson(JSON.parse(text.value));
  } catch {
    error.value = true;
    errorMessage.value = t('gov.imp.invalidJson');
  }
}

function onUploadClick() {
  uploadJson(applyJson);
}

function onBack() {
  plan.value = undefined;
  error.value = false;
  errorMessage.value = '';
}

function onConfirm() {
  const currentPlan = plan.value;
  const id = naturalId.value;
  if (currentPlan === undefined || id === '') {
    return;
  }
  userData.govburn.config.planets[id] ??= Object.fromEntries(
    popiBuildings.map(x => [x.ticker, -1]),
  );
  const planetConfig = userData.govburn.config.planets[id];
  const slots = (userData.govburn.config.slots[id] ??= {});
  for (const row of currentPlan.rows) {
    planetConfig[row.ticker] = row.count;
    if (row.materials.length === 0) {
      delete slots[row.ticker];
    } else {
      slots[row.ticker] = row.materials;
    }
  }
  emit('done');
}
</script>

<template>
  <div v-if="plan === undefined">
    <SectionHeader>{{ t('gov.imp.title') }}</SectionHeader>
    <form @submit.prevent>
      <Active :label="t('act.common.type')">
        <SelectInput v-model="type" :options="typeOptions" />
      </Active>
      <Active v-if="type === 'TEXT'" label="JSON" :error="error">
        <textarea
          v-model="text"
          :class="[C.TextareaInput.textarea, $style.textarea]"
          placeholder='{"planet":"Phobos","buildings":[{"building":"SST","materials":["DW","OFF"]}]}'
          spellcheck="false" />
      </Active>
      <Commands>
        <PrunButton v-if="type === 'FILE'" primary @click="onUploadClick">{{
          t('act.import.uploadButton')
        }}</PrunButton>
        <PrunButton v-if="type === 'TEXT'" primary @click="onPreviewClick">{{
          t('act.exec.preview')
        }}</PrunButton>
        <PrunButton @click="emit('done')">{{ t('act.exec.cancel') }}</PrunButton>
      </Commands>
    </form>
    <p v-if="error" :class="$style.error">{{ errorMessage }}</p>
  </div>

  <div v-else>
    <SectionHeader>{{ planetLabel }}</SectionHeader>
    <p v-if="plan.hasConflicts" :class="$style.error">
      {{ t('gov.imp.overwrites') }}
    </p>
    <p v-if="!plan.hasData" :class="$style.note">
      {{ t('gov.imp.noData') }}
    </p>
    <p v-if="plan.ignored.length > 0" :class="$style.note">
      {{ t('gov.imp.ignored', plan.ignored.join(', ')) }}
    </p>
    <table>
      <thead>
        <tr>
          <th>{{ t('gov.col.building') }}</th>
          <th>{{ t('gov.imp.current') }}</th>
          <th>{{ t('gov.imp.new') }}</th>
          <th>{{ t('gov.imp.note') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in plan.rows" :key="row.ticker" :class="{ [$style.conflict]: row.conflict }">
          <td>{{ row.ticker }}</td>
          <td>{{ formatCountMaterials(row.currentCount, row.currentMaterials) }}</td>
          <td>{{ formatCountMaterials(row.count, row.materials) }}</td>
          <td>{{ rowNote(row) }}</td>
        </tr>
      </tbody>
    </table>
    <form @submit.prevent>
      <Commands>
        <PrunButton primary @click="onConfirm">{{ t('gov.imp.confirm') }}</PrunButton>
        <PrunButton @click="onBack">{{ t('gov.imp.back') }}</PrunButton>
      </Commands>
    </form>
  </div>
</template>

<style module>
.textarea {
  width: 100%;
  min-height: 80px;
  resize: vertical;
}

.error {
  margin: 0.25rem 0;
  color: rgb(217, 83, 79);
}

.note {
  margin: 0.25rem 0;
}

.conflict {
  color: rgb(217, 83, 79);
}
</style>
