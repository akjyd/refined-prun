<script setup lang="ts">
import PriceLadder from '@src/features/XIT/CX4/PriceLadder.vue';
import MaterialIcon from '@src/components/MaterialIcon.vue';
import { materialsStore } from '@src/infrastructure/prun-api/data/materials';
import { compareMaterials } from '@src/core/sort-materials';
import { chosenRecipe } from '@src/core/daily-profit/recipe-choice';
import { useProfitData } from '@src/infrastructure/prunplanner/profit-data';
import {
  closeHiddenBooks,
  CX4_EXCHANGES,
  showMaterial,
  toggleFavorite,
} from '@src/features/XIT/CX4/cx4-tiles';
import { userData } from '@src/store/user-data';
import { t } from '@src/i18n';

const $style = useCssModule();

type Key = Parameters<typeof t>[0];

const ALL = 'all';
const FAVORITES = 'favorites';
const RECENT = 'recent';
const OTHER = 'OTHER';
const INDUSTRIES = [
  'AGRICULTURE',
  'FOOD_INDUSTRIES',
  'CHEMISTRY',
  'METALLURGY',
  'CONSTRUCTION',
  'MANUFACTURING',
  'ELECTRONICS',
  'FUEL_REFINING',
  'RESOURCE_EXTRACTION',
];

const tab = ref(RECENT);
const current = ref<string>(userData.cx4.recent[0] ?? '');
const profitData = useProfitData();

onMounted(() => {
  if (current.value !== '') {
    void showMaterial(current.value);
  }
});
onUnmounted(closeHiddenBooks);

// The industry (COGC) of the building that makes the material; mined materials are extraction.
function industryOf(ticker: string) {
  if (profitData.data.extractable.has(ticker)) {
    return 'RESOURCE_EXTRACTION';
  }
  const recipe = chosenRecipe(ticker);
  const expertise = recipe ? profitData.data.buildings[recipe.building]?.expertise : undefined;
  return expertise !== undefined && expertise !== '' ? expertise : OTHER;
}

// Materials in the game's icon order (category, then the order inside the category).
function sortTickers(tickers: string[]) {
  return [...tickers].sort((a, b) =>
    compareMaterials(materialsStore.getByTicker(a), materialsStore.getByTicker(b)),
  );
}

const allTickers = computed(() => sortTickers((materialsStore.all.value ?? []).map(x => x.ticker)));

const tabs = computed(() => [
  { id: ALL, name: t('cx4.all') },
  { id: FAVORITES, name: t('cx4.favorites') },
  { id: RECENT, name: t('cx4.recent') },
  ...[...INDUSTRIES, OTHER].map(x => ({
    id: x,
    name: x === OTHER ? t('cx4.other') : t(`extract.cogc.${x}` as Key),
  })),
]);

const shown = computed(() => {
  switch (tab.value) {
    case ALL:
      return allTickers.value;
    case FAVORITES:
      return sortTickers(userData.cx4.favorites);
    case RECENT:
      return userData.cx4.recent;
    default:
      return allTickers.value.filter(x => industryOf(x) === tab.value);
  }
});

async function pick(ticker: string) {
  current.value = ticker;
  await showMaterial(ticker);
}

function onRightClick(e: MouseEvent, ticker: string) {
  e.preventDefault();
  toggleFavorite(ticker);
}
</script>

<template>
  <div :class="$style.root">
    <div :class="$style.picker">
      <div :class="$style.tabs">
        <span
          v-for="x in tabs"
          :key="x.id"
          :class="[$style.tab, x.id === tab ? $style.tabOn : undefined]"
          @click="tab = x.id">
          {{ x.name }}
        </span>
      </div>
      <div :class="$style.items">
        <span
          v-for="ticker in shown"
          :key="ticker"
          :class="[
            $style.item,
            ticker === current ? $style.itemOn : undefined,
            userData.cx4.favorites.includes(ticker) ? $style.favorite : undefined,
          ]"
          @click="pick(ticker)"
          @contextmenu="onRightClick($event, ticker)">
          <MaterialIcon size="inline-table" :ticker="ticker" />
        </span>
      </div>
      <p :class="$style.muted">{{ t('cx4.note') }}</p>
    </div>
    <div v-if="current !== ''" :class="$style.books">
      <PriceLadder :ticker="current" :exchanges="CX4_EXCHANGES" />
    </div>
  </div>
</template>

<style module>
.root {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  gap: 10px;
  padding: 6px 8px;
  font-size: 13px;
}

.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 8px;
}

.tab {
  padding: 3px 7px;
  background-color: #2a2a2a;
  cursor: pointer;
}

.tabOn {
  background-color: #f7a600;
  color: #1e1e1e;
}

.items {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.item {
  display: inline-flex;
  padding: 2px;
  cursor: pointer;
}

/* The icon would open MAT on click; the click picks the material instead. */
.item > * {
  pointer-events: none;
}

/* Text only: no category picture. */
.item *::before {
  content: none !important;
}

.itemOn {
  outline: 2px solid #f7a600;
}

.favorite {
  box-shadow: inset 0 -3px 0 #f7a600;
}

.books {
  min-width: 0;
}

.muted {
  color: #8c8c8c;
  font-size: 12px;
}
</style>
