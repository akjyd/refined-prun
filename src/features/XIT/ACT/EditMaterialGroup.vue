<script setup lang="ts">
import { t, tType } from '@src/i18n';
import PrunButton from '@src/components/PrunButton.vue';
import SectionHeader from '@src/components/SectionHeader.vue';
import Active from '@src/components/forms/Active.vue';
import TextInput from '@src/components/forms/TextInput.vue';
import Commands from '@src/components/forms/Commands.vue';
import Passive from '@src/components/forms/Passive.vue';
import SelectInput from '@src/components/forms/SelectInput.vue';
import { act } from '@src/features/XIT/ACT/act-registry';

const { add, group, onSave } = defineProps<{
  add?: boolean;
  group: UserData.MaterialGroupData;
  onSave?: () => void;
}>();

const emit = defineEmits<{ (e: 'close'): void }>();

const name = ref(group.name ?? '');
const nameError = ref(false);

const typeOptions = act.getMaterialGroupTypes().map(x => ({ label: tType(x), value: x }));
const type = ref(group.type);

const shortDescription = computed(() => act.getMaterialGroupInfo(type.value)?.shortDescription);
const editFormComponent = computed(() => act.getMaterialGroupInfo(type.value)?.editComponent);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const editForm = useTemplateRef<any>('editForm');

function onSaveClick() {
  let isValid = editForm.value?.validate() ?? true;
  nameError.value = name.value.length === 0;
  isValid &&= !nameError.value;
  if (!isValid) {
    return;
  }
  for (const key of Object.keys(group)) {
    delete group[key];
  }
  editForm.value?.save();
  group.name = name.value;
  group.type = type.value;
  onSave?.();
  emit('close');
}
</script>

<template>
  <div :class="C.DraftConditionEditor.form">
    <SectionHeader>{{ add ? t('act.edit.addGroup') : t('act.edit.editGroup') }}</SectionHeader>
    <form>
      <Active :label="t('act.common.type')">
        <SelectInput v-model="type" :options="typeOptions" />
      </Active>
      <Passive v-if="shortDescription" :label="t('act.common.description')">
        <span>{{ shortDescription }}</span>
      </Passive>
      <Active :label="t('act.common.name')" :error="nameError">
        <TextInput v-model="name" />
      </Active>
      <Component :is="editFormComponent" v-if="editFormComponent" ref="editForm" :group="group" />
      <Commands>
        <PrunButton primary @click="onSaveClick">{{
          add ? t('act.common.add') : t('act.common.save')
        }}</PrunButton>
      </Commands>
    </form>
  </div>
</template>
