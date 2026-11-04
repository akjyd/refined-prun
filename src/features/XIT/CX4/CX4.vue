<script setup lang="ts">
import OrderBook from '@src/features/XIT/CX4/OrderBook.vue';
import { materialCategoriesStore } from '@src/infrastructure/prun-api/data/material-categories';
import { materialsStore } from '@src/infrastructure/prun-api/data/materials';
import {
  closeHiddenBooks,
  CX4_EXCHANGES,
  showMaterial,
  toggleFavorite,
} from '@src/features/XIT/CX4/cx4-tiles';
import { userData } from '@src/store/user-data';
import { t } from '@src/i18n';
import en from '@src/i18n/en';

const $style = useCssModule();

type Key = Parameters<typeof t>[0];

const ALL = 'all';
const FAVORITES = 'favorites';
const RECENT = 'recent';

const tab = ref(RECENT);
const current = ref<string>(userData.cx4.recent[0] ?? '');

onMounted(() => {
  if (current.value !== '') {
    void showMaterial(current.value);
  }
});
onUnmounted(closeHiddenBooks);

// "consumables (basic)" -> "consumablesbasic"
function categoryKey(name: string) {
  return name.toLowerCase().replace(/[^a-z]/g, '');
}

function categoryName(name: string) {
  const key = `cx4.cat.${categoryKey(name)}`;
  return key in en ? t(key as Key) : name;
}

const categories = computed(() =>
  [...(materialCategoriesStore.all.value ?? [])]
    .map(x => ({ ...x, label: categoryName(x.name) }))
    .sort((a, b) => a.label.localeCompare(b.label, 'zh')),
);

const tabs = computed(() => [
  { id: ALL, name: t('cx4.all') },
  { id: FAVORITES, name: t('cx4.favorites') },
  { id: RECENT, name: t('cx4.recent') },
  ...categories.value.map(x => ({ id: x.id, name: x.label })),
]);

const shown = computed(() => {
  switch (tab.value) {
    case ALL:
      return (materialsStore.all.value ?? []).map(x => x.ticker).sort();
    case FAVORITES:
      return userData.cx4.favorites;
    case RECENT:
      return userData.cx4.recent;
    default: {
      const category = categories.value.find(x => x.id === tab.value);
      return (category?.materials ?? []).map(x => x.ticker).sort();
    }
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
          {{ ticker }}
        </span>
      </div>
      <p :class="$style.muted">{{ t('cx4.note') }}</p>
    </div>
    <div v-if="current !== ''" :class="$style.books">
      <OrderBook v-for="code in CX4_EXCHANGES" :key="code" :ticker="current" :exchange="code" />
    </div>
  </div>
</template>

<style module>
.root {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
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
  width: 44px;
  padding: 4px 0;
  text-align: center;
  cursor: pointer;
  background-color: #252525;
}

.itemOn {
  background-color: #3a3a3a;
  color: #f7a600;
}

.favorite {
  box-shadow: inset 0 -2px 0 #f7a600;
}

.books {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 8px;
  align-content: start;
}

.muted {
  color: #8c8c8c;
  font-size: 12px;
}
</style>
