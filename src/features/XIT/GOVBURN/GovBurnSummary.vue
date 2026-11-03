<script setup lang="ts">
import PrunButton from '@src/components/PrunButton.vue';
import MaterialIcon from '@src/components/MaterialIcon.vue';
import GovBurnConfig from '@src/features/XIT/GOVBURN/GovBurnConfig.vue';
import BatteryBar from '@src/features/XIT/GOVBURN/BatteryBar.vue';
import GovBurnStats from '@src/features/XIT/GOVBURN/GovBurnStats.vue';
import {
  Battery,
  buildPlanetView,
  PlanetView,
  toggleSlot,
} from '@src/features/XIT/GOVBURN/summary';
import { getPopulationReports } from '@src/features/XIT/GOVBURN/population-source';
import { runHidden, isHiddenRunning } from '@src/features/XIT/ACT/hidden-act';
import { getPlanetName } from '@src/core/planet-name';
import { showBuffer } from '@src/infrastructure/prun-ui/buffers';
import { userData } from '@src/store/user-data';
import { comparePlanets } from '@src/util';
import { timestampEachMinute } from '@src/utils/dayjs';
import { fixed0, fixed02 } from '@src/utils/format';
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

// The newest building data of all planets.
const updatedAgo = computed(() => {
  const times = Object.keys(userData.govburn.config.planets).flatMap(naturalId =>
    (userData.govburn.planets[naturalId]?.buildings ?? [])
      .map(x => x.upkeepsCapturedAt)
      .filter(x => x !== undefined),
  );
  if (times.length === 0) {
    return undefined;
  }
  const minutes = Math.max(0, (timestampEachMinute.value - Math.max(...times)) / 60000);
  if (minutes < 60) {
    return t('gov.sum.minutesAgo', fixed0(minutes));
  }
  if (minutes < 48 * 60) {
    return t('gov.sum.hoursAgo', fixed0(minutes / 60));
  }
  return t('gov.sum.daysAgo', fixed0(minutes / 60 / 24));
});

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
  return days > 999 ? '∞' : fixed0(days) + 'd';
}

function cheapest(building: PlanetView['buildings'][number]) {
  const costs = building.slots.map(x => x.pointCost).filter(x => x !== undefined);
  return costs.length > 0 ? Math.min(...costs) : undefined;
}

type Key = Parameters<typeof t>[0];

// The planet battery always has 5 cells; at least one stays lit while anything is left.
function planetBattery(battery: Battery | undefined): Battery | undefined {
  if (battery === undefined || battery.cells === 0) {
    return battery;
  }
  const cells = 5;
  const filled =
    battery.filled > 0 ? Math.max(1, Math.round((cells * battery.filled) / battery.cells)) : 0;
  return { cells, filled: Math.min(cells, filled) };
}

function buildingName(ticker: string) {
  if (!(ticker in INFRASTRUCTURE_POINTS)) {
    return ticker;
  }
  return t(`gov.sum.bld.${ticker}` as Key);
}
</script>

<template>
  <GovBurnConfig v-if="showConfig" @done="showConfig = false" />
  <div v-else :class="$style.root">
    <div :class="$style.header">
      <span :class="$style.spacer" />
      <span v-if="updatedAgo" :class="$style.muted">{{ updatedAgo }}</span>
      <span :class="$style.muted">{{ t('gov.sum.weekly') }}</span>
      <span>{{ fixed0(weeklyTotal) }}</span>
      <PrunButton dark :disabled="refreshing" @click="onRefreshClick">
        {{ refreshing ? t('gov.sum.refreshing') : t('gov.sum.refresh') }}
      </PrunButton>
      <PrunButton dark @click="showConfig = true">{{ t('gov.ov.config') }}</PrunButton>
    </div>

    <p v-if="planets.length === 0" :class="$style.muted">{{ t('gov.ov.empty') }}</p>

    <div v-for="planet in planets" :key="planet.naturalId" :class="$style.planet">
      <div :class="[$style.grid, $style.planetRow]" @click="toggleOpen(planet.naturalId)">
        <span :class="$style.planetHead">
          <span :class="$style.name">
            <span :class="$style.arrow">{{ open.has(planet.naturalId) ? '▾' : '▸' }}</span>
            {{ planet.name }}
          </span>
          <span :class="$style.tag">
            <span :class="$style.muted">{{ t('gov.sum.buildings') }}</span>
            <BatteryBar :battery="planetBattery(planet.view?.battery)" wide />
          </span>
          <span :class="$style.tag">
            <span :class="$style.muted">COGC</span>
            <BatteryBar
              :battery="
                planet.view?.cogc ? { cells: 1, filled: planet.view.cogc.paid ? 1 : 0 } : undefined
              "
              wide />
          </span>
        </span>
        <span :class="$style.num">
          {{ planet.view ? fixed0(planet.view.weeklyCost) : '--' }}
          <span :class="$style.muted">{{ t('gov.sum.perWeek') }}</span>
        </span>
        <span :class="$style.num">
          <span :class="$style.muted">{{ t('gov.sum.warehouse') }}</span>
          <span :class="dayClass(planet.view?.warehouseDays)">
            {{ formatDays(planet.view?.warehouseDays) }}
          </span>
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
          <div v-if="planet.view.cogc" :class="[$style.grid, $style.subRow]">
            <span :class="$style.label">
              <span :class="$style.labelName">COGC</span>
              <span :class="$style.items">
                <span v-for="m in planet.view.cogc.materials" :key="m.ticker" :class="$style.item">
                  <span :class="$style.icon"
                    ><MaterialIcon size="inline-table" :ticker="m.ticker"
                  /></span>
                  {{ fixed0(m.amount) }}
                </span>
              </span>
            </span>
            <span :class="$style.num">
              {{ fixed0(planet.view.cogc.weeklyCost) }}
              <span :class="$style.muted">{{ t('gov.sum.perWeek') }}</span>
            </span>
            <span :class="$style.num">
              <span :class="$style.muted">{{ t('gov.sum.warehouse') }}</span>
              <span :class="dayClass(planet.view.cogc.warehouseDays)">
                {{ formatDays(planet.view.cogc.warehouseDays) }}
              </span>
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
                  :class="[$style.slot, slot.on ? $style.slotOn : undefined]"
                  :aria-pressed="slot.on"
                  @click="onSlotClick(planet.naturalId, building.ticker, slot.ticker)">
                  <span :class="$style.lamp" />
                  <span :class="$style.icon"
                    ><MaterialIcon size="inline-table" :ticker="slot.ticker"
                  /></span>
                  <span :class="$style.slotText">
                    <BatteryBar :battery="slot.battery" />
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
            <span :class="$style.num">
              {{ fixed0(building.weeklyCost) }}
              <span :class="$style.muted">{{ t('gov.sum.perWeek') }}</span>
            </span>
            <span :class="$style.num">
              <span :class="$style.muted">{{ t('gov.sum.warehouse') }}</span>
              <span :class="dayClass(building.warehouseDays)">
                {{ formatDays(building.warehouseDays) }}
              </span>
            </span>
            <span />
          </div>
          <div :class="$style.statsBox">
            <GovBurnStats v-if="planet.view.stats" :stats="planet.view.stats" />
            <p v-else :class="$style.muted">{{ t('gov.sum.noPopulation') }}</p>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style module>
.root {
  font-size: 14px;
  font-variant-numeric: tabular-nums;
}

.header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0 6px;
}

.spacer {
  flex: 1;
}

.muted {
  color: #8c8c8c;
}

.warning {
  color: #f0ad4e;
}

.grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 110px 90px 80px;
  align-items: center;
  column-gap: 10px;
}

.num {
  text-align: right;
  white-space: nowrap;
}

.planet {
  border-bottom: 1px solid #333;
}

.planetRow {
  padding: 7px 6px;
  cursor: pointer;
}

.planetHead {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.name {
  color: #eee;
  font-size: 14px;
  min-width: 130px;
}

.arrow {
  display: inline-block;
  width: 14px;
  color: #8c8c8c;
}

.tag {
  display: flex;
  align-items: center;
  gap: 6px;
}

.actions {
  display: flex;
  justify-content: flex-end;
}

.details {
  padding: 2px 6px 8px 22px;
}

.delta {
  font-size: 12px;
}

.statsBox {
  padding-top: 8px;
  border-top: 1px solid #2a2a2a;
}

.subRow {
  padding: 6px 0;
  border-top: 1px solid #2a2a2a;
  align-items: start;
}

.label {
  display: grid;
  grid-template-columns: 130px minmax(0, 1fr);
  align-items: start;
}

.labelName {
  color: #eee;
  padding-top: 8px;
}

.items {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.item {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* The icon only shows the material; clicks go to the slot button. */
.icon {
  display: flex;
  pointer-events: none;
}

.slots {
  display: grid;
  grid-template-columns: repeat(3, 120px);
  gap: 6px;
}

.slot {
  display: grid;
  grid-template-columns: 4px auto minmax(0, 1fr);
  column-gap: 6px;
  align-items: center;
  padding: 0 6px 0 0;
  background: #252525;
  border: 1px solid #444;
  color: inherit;
  font: inherit;
  cursor: pointer;
  text-align: left;
}

.slotOn {
  border-color: #f7a600;
}

.lamp {
  align-self: stretch;
}

.slotOn .lamp {
  background: #f7a600;
}

.slotText {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 4px 0;
}

.cost {
  font-size: 12px;
  text-align: right;
  color: #8c8c8c;
}
</style>
