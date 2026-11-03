<script setup lang="ts">
import PrunButton from '@src/components/PrunButton.vue';
import MaterialIcon from '@src/components/MaterialIcon.vue';
import GovBurnConfig from '@src/features/XIT/GOVBURN/GovBurnConfig.vue';
import { buildPlanetView, PlanetView, toggleSlot } from '@src/features/XIT/GOVBURN/summary';
import { getPopulationReports } from '@src/features/XIT/GOVBURN/population-source';
import { runHidden, isHiddenRunning } from '@src/features/XIT/ACT/hidden-act';
import { getPlanetName } from '@src/core/planet-name';
import { showBuffer } from '@src/infrastructure/prun-ui/buffers';
import { userData } from '@src/store/user-data';
import { comparePlanets } from '@src/util';
import { timestampEachMinute } from '@src/utils/dayjs';
import { fixed0, fixed01, fixed02, percent0 } from '@src/utils/format';
import { TIERS } from '@src/core/population/engine';
import { INFRASTRUCTURE_POINTS } from '@src/features/XIT/GOVBURN/infrastructure-points';
import { t } from '@src/i18n';

const $style = useCssModule();

const showConfig = ref(false);
const open = ref(new Set<string>());

const planets = computed(() => {
  const now = timestampEachMinute.value;
  return Object.keys(userData.govburn.config.planets)
    .sort(comparePlanets)
    .map(naturalId => {
      const captured = userData.govburn.planets[naturalId];
      return {
        naturalId,
        name: getPlanetName(naturalId),
        view:
          captured !== undefined
            ? buildPlanetView(captured, getPopulationReports(naturalId), now)
            : undefined,
      };
    });
});

const weeklyTotal = computed(() => sumBy(planets.value, x => x.view?.weeklyCost ?? 0));

function toggleOpen(naturalId: string) {
  const next = new Set(open.value);
  if (next.has(naturalId)) {
    next.delete(naturalId);
  } else {
    next.add(naturalId);
  }
  open.value = next;
}

function onSlotClick(naturalId: string, buildingTicker: string, ticker: string) {
  const building = userData.govburn.planets[naturalId]?.buildings.find(
    x => x.ticker === buildingTicker,
  );
  if (building) {
    toggleSlot(naturalId, building, ticker);
  }
}

const refreshing = computed(() => isHiddenRunning('govburn data'));

function onRefreshClick() {
  void runHidden('govburn data', 'XIT GOVBURNDATA AUTO');
}

function dayClass(days: number | undefined) {
  if (days === undefined) {
    return undefined;
  }
  return {
    [C.ColoredValue.negative]: days <= userData.govburn.config.red,
    [$style.warning]: days > userData.govburn.config.red && days <= userData.govburn.config.yellow,
    [C.ColoredValue.positive]: days > userData.govburn.config.yellow,
  };
}

function formatDays(days: number | undefined) {
  if (days === undefined) {
    return '--';
  }
  return days > 999 ? '∞' : fixed01(days) + 'd';
}

function needClass(value: number) {
  return {
    [C.ColoredValue.negative]: value < 0.7,
    [$style.warning]: value >= 0.7 && value < 1,
    [C.ColoredValue.positive]: value >= 1,
  };
}

function trendClass(now: number, next: number) {
  return {
    [C.ColoredValue.positive]: next > now + 1e-9,
    [C.ColoredValue.negative]: next < now - 1e-9,
  };
}

const tierLabels = computed(() => [
  t('gov.sum.tier.PIONEER'),
  t('gov.sum.tier.SETTLER'),
  t('gov.sum.tier.TECHNICIAN'),
  t('gov.sum.tier.ENGINEER'),
  t('gov.sum.tier.SCIENTIST'),
]);
const needLabels = computed(() => [
  t('gov.sum.need.SAFETY'),
  t('gov.sum.need.HEALTH'),
  t('gov.sum.need.COMFORT'),
  t('gov.sum.need.CULTURE'),
  t('gov.sum.need.EDUCATION'),
]);

function cheapest(building: PlanetView['buildings'][number]) {
  const costs = building.slots.map(x => x.pointCost).filter(x => x !== undefined);
  return costs.length > 0 ? Math.min(...costs) : undefined;
}

function buildingName(ticker: string) {
  if (!(ticker in INFRASTRUCTURE_POINTS)) {
    return ticker;
  }
  return t(`gov.sum.bld.${ticker}` as Parameters<typeof t>[0]);
}
</script>

<template>
  <GovBurnConfig v-if="showConfig" @done="showConfig = false" />
  <div v-else :class="$style.root">
    <div :class="$style.header">
      <span :class="$style.spacer" />
      <span :class="$style.muted">{{ t('gov.sum.weekly') }}</span>
      <span :class="$style.total">{{ fixed0(weeklyTotal) }}</span>
      <PrunButton dark :disabled="refreshing" @click="onRefreshClick">
        {{ refreshing ? t('gov.sum.refreshing') : t('gov.sum.refresh') }}
      </PrunButton>
      <PrunButton dark @click="showConfig = true">{{ t('gov.ov.config') }}</PrunButton>
    </div>

    <p v-if="planets.length === 0" :class="$style.muted">{{ t('gov.ov.empty') }}</p>

    <div v-else :class="[$style.grid, $style.head]">
      <span>{{ t('gov.col.planet') }}</span>
      <span :class="$style.num">{{ t('gov.sum.cost') }}</span>
      <span :class="$style.num">{{ t('gov.sum.stock') }}</span>
      <span :class="$style.num">{{ t('gov.sum.warehouse') }}</span>
      <span />
    </div>

    <div v-for="planet in planets" :key="planet.naturalId" :class="$style.planet">
      <div :class="[$style.grid, $style.planetRow]" @click="toggleOpen(planet.naturalId)">
        <span :class="$style.name">
          <span :class="$style.arrow">{{ open.has(planet.naturalId) ? '▾' : '▸' }}</span>
          {{ planet.name }}
        </span>
        <span :class="$style.num">{{ planet.view ? fixed0(planet.view.weeklyCost) : '--' }}</span>
        <span :class="[$style.num, dayClass(planet.view?.days)]">
          {{ formatDays(planet.view?.days) }}
        </span>
        <span :class="[$style.num, dayClass(planet.view?.warehouseDays)]">
          {{ formatDays(planet.view?.warehouseDays) }}
        </span>
        <span :class="$style.actions">
          <PrunButton dark inline @click.stop="showBuffer(`XIT GOVBURNACT ${planet.naturalId}`)">
            {{ t('gov.sum.restock') }}
          </PrunButton>
        </span>
      </div>

      <div v-if="open.has(planet.naturalId)" :class="$style.details">
        <p v-if="!planet.view" :class="$style.muted">{{ t('gov.noDataTip') }}</p>
        <template v-else>
          <div v-if="planet.view.stats" :class="$style.stats">
            <span :class="$style.statHead">{{ t('gov.sum.nowNext') }}</span>
            <span v-for="label in tierLabels" :key="label" :class="[$style.num, $style.statHead]">
              {{ label }}
            </span>
            <span>{{ t('gov.sum.population') }}</span>
            <span v-for="tier in TIERS" :key="tier" :class="$style.num">
              {{ fixed0(planet.view.stats.population[tier].now) }}
              <span :class="$style.arrowText">→</span>
              <span
                :class="
                  trendClass(
                    planet.view.stats.population[tier].now,
                    planet.view.stats.population[tier].next,
                  )
                ">
                {{ fixed0(planet.view.stats.population[tier].next) }}
              </span>
            </span>
            <span>{{ t('gov.sum.happiness') }}</span>
            <span v-for="tier in TIERS" :key="tier" :class="$style.num">
              {{ percent0(planet.view.stats.happiness[tier].now) }}
              <span :class="$style.arrowText">→</span>
              <span
                :class="
                  trendClass(
                    planet.view.stats.happiness[tier].now,
                    planet.view.stats.happiness[tier].next,
                  )
                ">
                {{ percent0(planet.view.stats.happiness[tier].next) }}
              </span>
            </span>
            <span />
            <span v-for="label in needLabels" :key="label" :class="[$style.num, $style.statHead]">
              {{ label }}
            </span>
            <span>{{ t('gov.sum.needs') }}</span>
            <span v-for="(need, i) in planet.view.stats.needs" :key="i" :class="$style.num">
              <span :class="needClass(need.now)">{{ percent0(need.now) }}</span>
              <span :class="$style.arrowText">→</span>
              <span :class="needClass(need.next)">{{ percent0(need.next) }}</span>
            </span>
          </div>
          <p v-else :class="$style.muted">{{ t('gov.sum.noPopulation') }}</p>

          <div v-if="planet.view.cogc" :class="[$style.grid, $style.subRow]">
            <span :class="$style.label">
              <span :class="$style.labelName">COGC</span>
              <span :class="$style.items">
                <span v-for="m in planet.view.cogc.materials" :key="m.ticker" :class="$style.item">
                  <MaterialIcon size="inline-table" :ticker="m.ticker" />
                  {{ fixed0(m.amount) }}
                </span>
              </span>
            </span>
            <span :class="$style.num">{{ fixed0(planet.view.cogc.weeklyCost) }}</span>
            <span :class="[$style.num, dayClass(planet.view.cogc.days)]">
              {{ formatDays(planet.view.cogc.days) }}
            </span>
            <span :class="[$style.num, dayClass(planet.view.cogc.warehouseDays)]">
              {{ formatDays(planet.view.cogc.warehouseDays) }}
            </span>
            <span />
          </div>

          <div
            v-for="building in planet.view.buildings"
            :key="building.ticker"
            :class="[$style.grid, $style.subRow]">
            <span :class="$style.label">
              <span :class="$style.labelName">
                {{ buildingName(building.ticker) }}
                <span :class="$style.muted">{{ building.ticker }} {{ building.level }}</span>
              </span>
              <span v-if="!building.hasData" :class="$style.muted">{{ t('gov.noDataTip') }}</span>
              <span v-else :class="$style.slots">
                <button
                  v-for="slot in building.slots"
                  :key="slot.ticker"
                  type="button"
                  :class="[$style.slot, slot.on ? $style.slotOn : $style.slotOff]"
                  :aria-pressed="slot.on"
                  @click="onSlotClick(planet.naturalId, building.ticker, slot.ticker)">
                  <span :class="$style.lamp" />
                  <MaterialIcon size="inline-table" :ticker="slot.ticker" />
                  <span :class="$style.slotText">
                    <span :class="slot.on ? dayClass(slot.days) : undefined">
                      {{ slot.on ? formatDays(slot.days) : '—' }}
                    </span>
                    <span
                      :class="[
                        $style.cost,
                        slot.pointCost !== undefined && slot.pointCost === cheapest(building)
                          ? C.ColoredValue.positive
                          : undefined,
                      ]">
                      {{ slot.pointCost !== undefined ? '$' + fixed02(slot.pointCost) : '--' }}
                    </span>
                  </span>
                </button>
              </span>
            </span>
            <span :class="$style.num">{{ fixed0(building.weeklyCost) }}</span>
            <span :class="[$style.num, dayClass(building.days)]">
              {{ formatDays(building.days) }}
            </span>
            <span :class="[$style.num, dayClass(building.warehouseDays)]">
              {{ formatDays(building.warehouseDays) }}
            </span>
            <span />
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style module>
.root {
  font-variant-numeric: tabular-nums;
}

.header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 0;
}

.spacer {
  flex: 1;
}

.total {
  margin-right: 6px;
}

.muted {
  color: #8c8c8c;
}

.warning {
  color: #f0ad4e;
}

.grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 90px 60px 60px 60px;
  align-items: center;
  column-gap: 6px;
}

.head {
  padding: 4px 6px;
  color: #8c8c8c;
  border-bottom: 1px solid #333;
}

.num {
  text-align: right;
  white-space: nowrap;
}

.planet {
  border-bottom: 1px solid #333;
}

.planetRow {
  padding: 5px 6px;
  cursor: pointer;
}

.name {
  color: #eee;
}

.arrow {
  display: inline-block;
  width: 12px;
  color: #8c8c8c;
}

.actions {
  display: flex;
  justify-content: flex-end;
}

.details {
  padding: 2px 6px 6px 18px;
}

.stats {
  display: grid;
  grid-template-columns: 70px repeat(5, minmax(0, 1fr));
  row-gap: 3px;
  column-gap: 6px;
  padding: 5px 6px;
  margin-bottom: 4px;
  background: rgba(255, 255, 255, 0.04);
}

.statHead {
  color: #8c8c8c;
  font-size: 10px;
}

.arrowText {
  color: #666;
}

.subRow {
  padding: 4px 0;
  border-top: 1px solid #2a2a2a;
}

.label {
  display: grid;
  grid-template-columns: 110px minmax(0, 1fr);
  align-items: start;
}

.labelName {
  color: #eee;
  padding-top: 3px;
}

.items {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.item {
  display: flex;
  align-items: center;
  gap: 3px;
}

.slots {
  display: grid;
  grid-template-columns: repeat(3, 86px);
  gap: 3px;
}

.slot {
  display: flex;
  align-items: center;
  padding: 0;
  background: #262626;
  border: 1px solid #444;
  color: inherit;
  font: inherit;
  cursor: pointer;
  text-align: left;
}

.slotOn {
  border-color: #f7a600;
}

.slotOff {
  opacity: 0.55;
}

.lamp {
  width: 5px;
  align-self: stretch;
  background: #3a3a3a;
}

.slotOn .lamp {
  background: #f7a600;
}

.slotText {
  display: flex;
  flex-direction: column;
  padding: 0 4px;
  line-height: 1.15;
}

.cost {
  font-size: 10px;
  color: #8c8c8c;
}
</style>
