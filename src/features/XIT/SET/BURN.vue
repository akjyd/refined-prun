<script setup lang="ts">
import BurnGroupEditor from '@src/features/XIT/BURN/BurnGroupEditor.vue';
import { getPlanetBurn } from '@src/core/burn';
import { sitesStore } from '@src/infrastructure/prun-api/data/sites';
import { getEntityNameFromAddress } from '@src/infrastructure/prun-api/data/addresses';
import { userData } from '@src/store/user-data';
import { t } from '@src/i18n';

// BURN settings (player, 2026-11-07): the groups of the planets, and what a ship leaves and
// takes when you press Resupply on it.

const $style = useCssModule();

const burn = userData.settings.burn;
burn.shipSupplyDays ??= {};
burn.intermediateDays ??= 5;

const planets = computed(() =>
  (sitesStore.all.value ?? [])
    .map(site => ({
      naturalId: getPlanetBurn(site)?.naturalId ?? '',
      planetName: getEntityNameFromAddress(site.address) ?? '',
    }))
    .filter(x => x.naturalId !== ''),
);

function daysOf(naturalId: string) {
  const value = burn.shipSupplyDays[naturalId];
  return value === null || value === undefined ? '' : String(value);
}

function setDays(naturalId: string, value: string) {
  const text = value.trim();
  if (text === '') {
    burn.shipSupplyDays[naturalId] = null;
    return;
  }
  const n = Number(text);
  if (Number.isFinite(n) && n >= 0) {
    burn.shipSupplyDays[naturalId] = Math.min(Math.round(n), 365);
  }
}

function setIntermediate(value: string) {
  const n = Number(value);
  if (Number.isFinite(n) && n >= 0) {
    burn.intermediateDays = Math.min(Math.round(n), 365);
  }
}
</script>

<template>
  <div :class="$style.page">
    <div :class="$style.group">{{ t('set.burn.groupShip') }}</div>
    <div :class="$style.row">
      <span :class="$style.label">{{ t('set.burn.intermediate') }}</span>
      <input
        :class="$style.input"
        :value="burn.intermediateDays"
        @change="setIntermediate(($event.target as HTMLInputElement).value)" />
      <span :class="$style.hint">{{ t('set.burn.intermediateHint') }}</span>
    </div>
    <div :class="$style.row">
      <span :class="$style.label">{{ t('set.burn.shipDays') }}</span>
      <span :class="$style.hint">{{ t('set.burn.shipDaysHint') }}</span>
    </div>
    <div :class="$style.planets">
      <span v-for="planet in planets" :key="planet.naturalId" :class="$style.planet">
        <span :class="$style.planetName">{{ planet.planetName }}</span>
        <input
          :class="[$style.input, $style.small]"
          :value="daysOf(planet.naturalId)"
          :placeholder="t('set.burn.infinite')"
          @change="setDays(planet.naturalId, ($event.target as HTMLInputElement).value)" />
      </span>
    </div>
    <div :class="$style.group">{{ t('set.burn.groupGroups') }}</div>
    <BurnGroupEditor :planets="planets" />
  </div>
</template>

<style module>
.page {
  display: grid;
  gap: var(--rpz-space-1);
  padding: var(--rpz-space-2);
  color: var(--rpz-text);
  font-size: var(--rpz-fs-body);
}

.group {
  margin-top: var(--rpz-space-2);
  color: var(--rpz-text-strong);
  font-size: var(--rpz-fs-title);
}

.group:first-child {
  margin-top: 0;
}

.row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--rpz-space-2);
  padding: var(--rpz-space-1) 0;
  border-bottom: 1px solid var(--rpz-stroke-weak);
}

.label {
  min-width: 140px;
  color: var(--rpz-text-weak);
}

.planets {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: var(--rpz-space-1) var(--rpz-space-3);
  padding-bottom: var(--rpz-space-2);
  border-bottom: 1px solid var(--rpz-stroke-weak);
}

.planet {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--rpz-space-1);
}

.planetName {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.input {
  width: 72px;
  padding: 3px 6px;
  border: 1px solid var(--rpz-stroke);
  background-color: var(--rpz-bg-base);
  color: var(--rpz-text);
  font: inherit;
  text-align: right;
  outline: none;
}

.input:focus {
  border-color: var(--rpz-brand);
}

.small {
  width: 56px;
}

.hint {
  color: var(--rpz-text-weak);
  font-size: var(--rpz-fs-label);
}
</style>
