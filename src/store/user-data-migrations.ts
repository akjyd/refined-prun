/* eslint-disable @typescript-eslint/no-explicit-any */
import { migrateVersionedUserData } from '@src/store/user-data-versioned-migrations';
import removeArrayElement from '@src/utils/remove-array-element';
import {
  defaultHiddenResources,
  defaultWatchedPlanets,
} from '@src/core/extraction/watched-planets';

type Migration = [id: string, migration: (userData: any) => void];
// A checkpoint marks that all migrations before it are applied.
// If a user's data contains a checkpoint ID, preceding individual IDs can be pruned.
// New checkpoints subsume older ones.
type Checkpoint = [id: string];
type MigrationEntry = Migration | Checkpoint;

function isCheckpoint(entry: MigrationEntry): entry is Checkpoint {
  return entry.length === 1;
}

// New migrations should be added to the top of the list.
// The date is for reference only, and it does not affect migration order.
const migrations: MigrationEntry[] = [
  [
    '06.11.2026 Add FLT ship order',
    userData => {
      userData.fltOrder ??= [];
    },
  ],
  [
    '05.11.2026 Add arbitrage cart',
    userData => {
      userData.arbCart ??= { ship: '500/500', items: [] };
    },
  ],
  [
    '05.11.2026 Add arbitrage batches',
    userData => {
      userData.arbBatches ??= [];
    },
  ],
  [
    '05.11.2026 Add default CoGC programs',
    userData => {
      userData.govburn.config.cogcPrograms ??= {};
    },
  ],
  [
    '05.11.2026 Add blacklists with reasons',
    userData => {
      userData.arbBlacklist ??= {};
      userData.extract.hiddenReasons ??= {};
    },
  ],
  [
    '05.11.2026 Add arbitrage first-seen times',
    userData => {
      userData.arbSeen ??= {};
    },
  ],
  [
    '07.11.2026 Add pinned order books',
    userData => {
      userData.pinnedBooks ??= [];
    },
  ],
  [
    '07.11.2026 Add the ship resupply settings',
    userData => {
      userData.settings.burn.shipSupplyDays ??= {};
      userData.settings.burn.intermediateDays ??= 5;
    },
  ],
  [
    '07.11.2026 Add the share of trade and the flight days',
    userData => {
      userData.settings.arb.tradeShare ??= 1;
      userData.settings.arb.flightDays ??= {};
    },
  ],
  [
    '07.11.2026 Add the queue warning of an arbitrage order',
    userData => {
      userData.settings.arb.queueDays ??= 0.5;
    },
  ],
  [
    '06.11.2026 Add the longest wait of an arbitrage trade',
    userData => {
      userData.settings.arb.maxDays ??= 7;
    },
  ],
  [
    '06.11.2026 Add arbitrage risk settings',
    userData => {
      userData.settings.arb ??= { failurePercent: 10, minDailyProfit: 30_000, maxDays: 7 };
    },
  ],
  [
    '06.11.2026 Add planet groups for BURN',
    userData => {
      userData.settings.burn.group ??= {};
    },
  ],
  [
    '05.11.2026 Add resupply warehouse-only materials',
    userData => {
      userData.settings.burn.resupplyWarehouseOnly ??= {};
      userData.settings.burn.resupplyWarehouseCx ??= {};
    },
  ],
  [
    '05.11.2026 Add editable extraction planets',
    userData => {
      userData.extract ??= {
        planets: structuredClone(defaultWatchedPlanets),
        hidden: [...defaultHiddenResources],
      };
    },
  ],
  [
    '05.11.2026 Add seen order amounts',
    userData => {
      userData.orderSeen ??= {};
    },
  ],
  [
    '04.11.2026 Add extraction planets for order books',
    userData => {
      userData.extractPlanets ??= {};
    },
  ],
  [
    '04.11.2026 Add CX4 data',
    userData => {
      userData.cx4 ??= { favorites: [], recent: [], tiles: {} };
    },
  ],
  [
    '04.11.2026 Add recipe choices',
    userData => {
      userData.recipeChoices ??= {};
    },
  ],
  [
    '03.11.2026 Add govburn refresh time',
    userData => {
      userData.govburn.refreshedAt ??= 0;
    },
  ],
  [
    '29.10.2026 Add resupply production exclusions',
    userData => {
      userData.settings.burn.resupplyExcluded ??= {};
    },
  ],
  [
    '15.09.2026 Add govburn data',
    userData => {
      userData.govburn ??= { planets: {}, config: { planets: {} } };
      userData.govburn.config.resupplyDays ??= 30;
      userData.govburn.config.red ??= 3;
      userData.govburn.config.yellow ??= 7;
      userData.govburn.config.slots ??= {};
    },
  ],
  [
    '14.09.2026 Add noBuy setting',
    userData => {
      userData.settings.noBuy ??= [];
    },
  ],
  [
    '12.09.2026 Add tab folders',
    userData => {
      userData.tabs.folders ??= [];
    },
  ],
  [
    '11.09.2026 Add XIT PLNT settings',
    userData => {
      userData.settings.burn.planetPickup ??= {};
      userData.settings.repair.planetOverrides ??= {};
      userData.settings.burn.planetResupply ??= {};
    },
  ],
  [
    '11.09.2026 Add cxmOrder setting',
    userData => {
      userData.settings.cxmOrder ??= ['AI1', 'CI1', 'CI2', 'IC1', 'NC1', 'NC2'];
    },
  ],
  [
    '10.09.2026 Add contextMenuExchange setting',
    userData => {
      userData.settings.contextMenuExchange ??= 'AI1';
    },
  ],
  [
    '25.08.2026 Add flow price overrides',
    userData => {
      userData.settings.flow = { overrides: {} };
    },
  ],
  [
    '19.06.2026 Remove adm-hide-inactive-buttons',
    userData => {
      removeFeature(userData, 'adm-hide-inactive-buttons');
    },
  ],
  [
    '11.05.2026 Rename contribution-maxed',
    userData => {
      renameFeature(userData, 'contribution-maxed', 'cogcu-contribution-maxed');
    },
  ],
  ['10.03.2026 Checkpoint'],
  [
    '10.03.2026 Remove funny-rations',
    userData => {
      removeFeature(userData, 'funny-rations');
    },
  ],
  [
    '24.01.2026 Remove cxpc-default-1y',
    userData => {
      removeFeature(userData, 'cxpc-default-1y');
    },
  ],
  [
    '02.02.2026 Add full equity mode',
    userData => {
      userData.fullEquityMode = true;
    },
  ],
  [
    '25.12.2025 Rename features',
    userData => {
      renameFeature(userData, 'custom-item-sorting', 'inv-custom-item-sorting');
      renameFeature(userData, 'item-markers', 'inv-item-markers');
      renameFeature(userData, 'show-space-remaining', 'inv-show-space-remaining');
    },
  ],
  [
    '25.12.2025 Add audio volume',
    userData => {
      userData.settings.audioVolume = 0.4;
    },
  ],
];

function removeFeature(userData: any, feature: string) {
  removeArrayElement(userData.settings.disabled, feature);
}

function renameFeature(userData: any, oldName: string, newName: string) {
  const disabled = userData.settings.disabled;
  const index = disabled.indexOf(oldName);
  if (index !== -1) {
    disabled[index] = newName;
  }
}

export function migrateUserData(userData: any) {
  // The migrations are ordered from newest to oldest, but we want to run them in order.
  const orderedMigrations = migrations.slice().reverse();
  if (userData.version !== undefined) {
    migrateVersionedUserData(userData);
    delete userData.version;
    // After the versioned migration, we should run all the named migrations.
    // Setting the migration list to an empty array will trigger that.
    userData.migrations = [];
  }
  if (userData.migrations === undefined) {
    // The initial user data is already migrated, so just add all migrations to the list.
    userData.migrations = compactIds(
      orderedMigrations,
      orderedMigrations.map(x => x[0]),
    );
    return userData;
  }

  const performed = new Set<string>(userData.migrations);
  for (let i = orderedMigrations.length - 1; i >= 0; i--) {
    const entry = orderedMigrations[i];
    if (isCheckpoint(entry) && performed.has(entry[0])) {
      for (let j = 0; j < i; j++) {
        performed.add(orderedMigrations[j][0]);
      }
      break;
    }
  }

  for (const entry of orderedMigrations) {
    const id = entry[0];
    if (performed.has(id)) {
      continue;
    }
    if (!isCheckpoint(entry)) {
      entry[1](userData);
    }
    performed.add(id);
    userData.migrations.push(id);
  }

  userData.migrations = compactIds(orderedMigrations, userData.migrations);
  return userData;
}

function compactIds(orderedEntries: MigrationEntry[], appliedIds: string[]): string[] {
  const applied = new Set(appliedIds);

  // Find the latest checkpoint where all preceding entries are applied.
  // An applied older checkpoint means everything before it is implicitly applied.
  let latestCheckpointIndex = -1;
  for (let i = orderedEntries.length - 1; i >= 0; i--) {
    const entry = orderedEntries[i];
    if (!isCheckpoint(entry) || !applied.has(entry[0])) {
      continue;
    }
    let complete = true;
    for (let j = i - 1; j >= 0; j--) {
      if (isCheckpoint(orderedEntries[j]) && applied.has(orderedEntries[j][0])) {
        break;
      }
      if (!applied.has(orderedEntries[j][0])) {
        complete = false;
        break;
      }
    }
    if (complete) {
      latestCheckpointIndex = i;
      break;
    }
  }

  if (latestCheckpointIndex === -1) {
    return appliedIds;
  }

  const removable = new Set<string>();
  for (let i = 0; i < latestCheckpointIndex; i++) {
    removable.add(orderedEntries[i][0]);
  }

  const checkpointId = orderedEntries[latestCheckpointIndex][0];
  const result: string[] = [checkpointId];
  for (const id of appliedIds) {
    if (!removable.has(id) && id !== checkpointId) {
      result.push(id);
    }
  }
  return result;
}
