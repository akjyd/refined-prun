<script setup lang="ts">
import MaterialIcon from '@src/components/MaterialIcon.vue';
import CopyButton from '@src/components/CopyButton.vue';
import { Recipe } from '@src/core/daily-profit/daily-profit';
import {
  bestRecipe,
  exchangePrice,
  profitOf,
  recipesFor,
} from '@src/core/daily-profit/recipe-choice';
import { useProfitData } from '@src/infrastructure/prunplanner/profit-data';
import { getMaterialNameByTicker } from '@src/util';
import { userData } from '@src/store/user-data';
import { fixed0, fixed01 } from '@src/utils/format';
import { formatProfit, profitClass } from '@src/core/daily-profit/profit-format';
import { t } from '@src/i18n';

const $style = useCssModule();

const open = ref(new Set<string>());

const profitData = useProfitData();

interface RecipeRow {
  recipe: Recipe;
  profit?: number;
  selected: boolean;
}

// Materials that more than one recipe makes. Prices are the all-exchange averages.
const materials = computed(() => {
  const price = exchangePrice('UNIVERSE');
  const tickers = [...profitData.byOutput.keys()].filter(x => recipesFor(x).length > 1).sort();
  return tickers.map(ticker => {
    const best = bestRecipe(ticker);
    const key = userData.recipeChoices[ticker];
    const recipes = recipesFor(ticker);
    const picked = recipes.find(x => x.key === key);
    const selected = picked ?? best;
    const rows: RecipeRow[] = recipes.map(recipe => ({
      recipe,
      profit: profitOf(recipe, price),
      selected: recipe === selected,
    }));
    return {
      ticker,
      name: getMaterialNameByTicker(ticker) ?? ticker,
      price: price(ticker),
      auto: picked === undefined,
      selected: rows.find(x => x.selected),
      rows,
    };
  });
});

function toggle(ticker: string) {
  const next = new Set(open.value);
  if (next.has(ticker)) {
    next.delete(ticker);
  } else {
    next.add(ticker);
  }
  open.value = next;
}

function pick(ticker: string, recipe: Recipe) {
  userData.recipeChoices[ticker] = recipe.key;
}

// Every material with its selected recipe, for sharing.
function exportChoices() {
  const result: Record<string, { recipe: string; auto: boolean; profit?: number }> = {};
  for (const m of materials.value) {
    if (m.selected) {
      result[m.ticker] = {
        recipe: m.selected.recipe.key,
        auto: m.auto,
        profit: m.selected.profit !== undefined ? Math.round(m.selected.profit) : undefined,
      };
    }
  }
  return JSON.stringify(result, null, 1);
}

function recipeText(recipe: Recipe) {
  const side = (x: Record<string, number>) =>
    Object.entries(x)
      .map(([k, n]) => `${fixed01(n)} ${k}`)
      .join(' + ');
  return `${recipe.building}  ${side(recipe.inputs)} → ${side(recipe.outputs)}`;
}
</script>

<template>
  <div :class="$style.root">
    <div :class="$style.toolbar"><CopyButton :copy-fn="exportChoices" /></div>
    <div :class="[$style.row, $style.head]">
      <span />
      <span>{{ t('recipes.material') }}</span>
      <span>{{ t('recipes.selected') }}</span>
      <span :class="$style.num">{{ t('recipes.price') }}</span>
      <span :class="$style.num">{{ t('recipes.profit') }}</span>
    </div>
    <div v-for="m in materials" :key="m.ticker" :class="$style.material">
      <div :class="[$style.row, $style.clickable]" @click="toggle(m.ticker)">
        <span :class="$style.icon"><MaterialIcon size="inline-table" :ticker="m.ticker" /></span>
        <span :class="$style.name">{{ m.name }}</span>
        <span :class="$style.summary">
          <span :class="$style.arrow">{{ open.has(m.ticker) ? '▾' : '▸' }}</span>
          {{ m.selected ? recipeText(m.selected.recipe) : '--' }}
          <span v-if="m.auto" :class="$style.muted">{{ t('recipes.auto') }}</span>
        </span>
        <span :class="$style.num">{{ m.price !== undefined ? fixed0(m.price) : '--' }}</span>
        <span :class="[$style.num, profitClass(m.selected?.profit)]">
          {{ formatProfit(m.selected?.profit) }}
        </span>
      </div>
      <div v-if="open.has(m.ticker)" :class="$style.recipes">
        <div
          v-for="r in m.rows"
          :key="r.recipe.key"
          :class="[$style.recipe, r.selected ? $style.picked : undefined]"
          @click="pick(m.ticker, r.recipe)">
          <span :class="[$style.lamp, r.selected ? $style.lampOn : undefined]" />
          <span :class="$style.building">{{ r.recipe.building }}</span>
          <span :class="$style.items">
            <span v-for="(n, k) in r.recipe.inputs" :key="k" :class="$style.item">
              {{ fixed01(n) }}
              <span :class="$style.icon"><MaterialIcon size="inline-table" :ticker="k" /></span>
            </span>
            <span :class="$style.muted">→</span>
            <span v-for="(n, k) in r.recipe.outputs" :key="k" :class="$style.item">
              {{ fixed01(n) }}
              <span :class="[$style.icon, k === m.ticker ? $style.target : undefined]">
                <MaterialIcon size="inline-table" :ticker="k" />
              </span>
            </span>
          </span>
          <span :class="[$style.num, $style.muted]">{{ fixed01(r.recipe.hours) }}h</span>
          <span :class="[$style.num, profitClass(r.profit)]">{{ formatProfit(r.profit) }}</span>
        </div>
      </div>
    </div>
    <p :class="$style.muted">{{ t('recipes.note') }}</p>
  </div>
</template>

<style module>
.root {
  padding: 6px 8px;
  font-size: 13px;
}

.toolbar {
  display: flex;
  justify-content: flex-end;
  padding-bottom: 4px;
}

.row {
  display: grid;
  grid-template-columns: 30px 120px minmax(0, 1fr) 70px 70px;
  gap: 0 10px;
  align-items: center;
  padding: 4px 4px;
}

.head {
  color: #8c8c8c;
}

.material {
  border-top: 1px solid #2c2c2c;
}

.clickable {
  cursor: pointer;
}

.name {
  color: #eee;
}

.summary {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.arrow {
  display: inline-block;
  width: 12px;
}

.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.muted {
  color: #8c8c8c;
}

.icon {
  display: inline-flex;
  pointer-events: none;
}

.target {
  outline: 1px solid #f7a600;
}

.recipes {
  display: grid;
  gap: 2px;
  padding: 0 4px 6px 40px;
}

.recipe {
  display: grid;
  grid-template-columns: 12px 40px minmax(0, 1fr) 50px 70px;
  gap: 0 10px;
  align-items: center;
  padding: 3px 6px;
  cursor: pointer;
}

.picked {
  background-color: #2a2a2a;
}

.lamp {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: #3a3a3a;
}

.lampOn {
  background-color: #f7a600;
}

.building {
  color: #eee;
  font-weight: bold;
}

.items {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 8px;
}

.item {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}
</style>
