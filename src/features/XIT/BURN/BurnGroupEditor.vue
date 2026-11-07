<script setup lang="ts">
import ChipGroup from '@src/components/ChipGroup.vue';
import { allGroups, groupColor, groupOf } from '@src/features/XIT/BURN/burn-groups';
import { userData } from '@src/store/user-data';
import { t } from '@src/i18n';

// Moves a planet to another group by hand (player, 2026-11-06). Without an entry a planet
// follows its faction.
const { planets } = defineProps<{ planets: { naturalId: string; planetName: string }[] }>();

const $style = useCssModule();

const added = ref<string[]>([]);
const newName = ref('');

const groups = computed(() => [...allGroups(planets.map(x => x.naturalId)), ...added.value]);

function chipsFor() {
  return groups.value.map(x => ({ value: x, label: x }));
}

function set(naturalId: string, name: string) {
  userData.settings.burn.group[naturalId] = name;
}

function reset(naturalId: string) {
  delete userData.settings.burn.group[naturalId];
}

function addGroup() {
  const name = newName.value.trim();
  if (name !== '' && !groups.value.includes(name)) {
    added.value = [...added.value, name];
  }
  newName.value = '';
}
</script>

<template>
  <div :class="$style.panel">
    <div v-for="planet in planets" :key="planet.naturalId" :class="$style.row">
      <span :class="$style.name">{{ planet.planetName }}</span>
      <ChipGroup
        :model-value="groupOf(planet.naturalId)"
        :options="chipsFor()"
        @update:model-value="set(planet.naturalId, String($event))" />
      <span
        v-if="userData.settings.burn.group[planet.naturalId] !== undefined"
        :class="$style.reset"
        @click="reset(planet.naturalId)"
        >{{ t('burn.group.reset') }}</span
      >
    </div>
    <div :class="$style.row">
      <span :class="$style.name">{{ t('burn.group.add') }}</span>
      <input v-model="newName" :class="$style.input" @keyup.enter="addGroup" />
      <span :class="$style.reset" @click="addGroup">{{ t('burn.group.addButton') }}</span>
    </div>
    <div :class="$style.row">
      <span :class="$style.name" />
      <span :class="$style.legend">
        <span v-for="g in groups" :key="g" :class="$style.legendItem">
          <span
            :class="$style.dot"
            :style="{ backgroundColor: groupColor(g)?.dot ?? 'var(--rpz-text-off)' }" />
          {{ g }}
        </span>
      </span>
    </div>
  </div>
</template>

<style module>
.panel {
  display: grid;
  gap: var(--rpz-space-1);
  padding: var(--rpz-space-2);
  margin-bottom: var(--rpz-space-2);
  background-color: var(--rpz-bg-raised);
  color: var(--rpz-text);
  font-size: var(--rpz-fs-body);
}

.row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--rpz-space-2);
}

.name {
  min-width: 140px;
  color: var(--rpz-text-weak);
}

.input {
  width: 120px;
  padding: 3px 6px;
  border: 1px solid var(--rpz-stroke);
  background-color: var(--rpz-bg-base);
  color: var(--rpz-text);
  font: inherit;
  outline: none;
}

.input:focus {
  border-color: var(--rpz-brand);
}

.reset {
  color: var(--rpz-text-weak);
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
}

.reset:hover {
  color: var(--rpz-text);
}

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: var(--rpz-space-2);
  color: var(--rpz-text-weak);
  font-size: var(--rpz-fs-label);
}

.legendItem {
  display: inline-flex;
  align-items: center;
}

.dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  margin-right: 4px;
}
</style>
