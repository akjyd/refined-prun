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
import { getMaterialNameByTicker } from '@src/util';
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

const tab = ref(FAVORITES);
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

const favorites = computed(() => new Set(userData.cx4.favorites));

function onRightClick(e: MouseEvent, ticker: string) {
  e.preventDefault();
  toggleFavorite(ticker);
}
</script>

<template>
  <div :class="$style.root">
    <div :class="$style.picker">
      <div v-if="current !== ''" :class="$style.current">
        <MaterialIcon size="large" :ticker="current" />
        <span>
          <span :class="$style.currentTicker">{{ current }}</span>
          <span :class="$style.muted">{{ getMaterialNameByTicker(current) }}</span>
        </span>
      </div>
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
            tab !== FAVORITES && favorites.has(ticker) ? $style.favorite : undefined,
          ]"
          @click="pick(ticker)"
          @contextmenu="onRightClick($event, ticker)">
          <MaterialIcon size="inline-table" :ticker="ticker" />
        </span>
      </div>
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
  min-width: 1100px;
  gap: 10px;
  padding: 6px 8px;
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
  position: relative;
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

/* A small star in the corner marks a favorite. */
.favorite::after {
  content: '★';
  position: absolute;
  top: -5px;
  right: -3px;
  color: #f7a600;
  font-size: 10px;
  line-height: 1;
  text-shadow: 0 0 2px #000;
}

.itemOn {
  outline: 2px solid #f7a600;
}

.current {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  padding: 6px;
  background-color: #252525;
}

.current > span {
  display: grid;
}

.currentTicker {
  color: #eee;
  font-size: 15px;
  font-weight: bold;
}

.books {
  min-width: 0;
}

.muted {
  color: #8c8c8c;
  font-size: 12px;
}
</style>
