import { deepFreeze } from '@src/utils/deep-freeze';

export const initialUserData = deepFreeze({
  firstLoad: Date.now(),
  lastSeenChangelogVersion: undefined as string | undefined,
  tileState: {} as Record<string, UserData.TileState | undefined>,
  settings: {
    mode: undefined as 'BASIC' | 'FULL' | undefined,
    disabled: [] as string[],
    time: 'DEFAULT' as UserData.TimeFormat,
    defaultChartType: 'SMOOTH' as UserData.ExchangeChartType,
    currency: {
      preset: 'DEFAULT' as UserData.CurrencyPreset,
      custom: '$',
      position: 'BEFORE' as UserData.CurrencyPosition,
      spacing: 'NO_SPACE' as UserData.CurrencySpacing,
    },
    financial: {
      mmMaterials: 'IDC,EDC',
      ignoredMaterials: 'HEX,JUI',
    },
    pricing: {
      exchange: 'UNIVERSE',
      method: 'DEFAULT' as UserData.PricingMethod,
    },
    burn: {
      red: 3,
      yellow: 7,
      resupply: 16,
      planetResupply: {} as Record<string, number>,
      // Planet natural id -> ship-size label from core/ship-sizes.
      planetPickup: {} as Record<string, string>,
      // Planet natural id -> production materials the player unticked in ACT resupply.
      resupplyExcluded: {} as Record<string, string[]>,
      resupplyWarehouseOnly: {} as Record<string, string[]>,
      resupplyWarehouseCx: {} as Record<string, string | undefined>,
      // Planet natural id -> the group it is listed under, when you moved it yourself
      // (player, 2026-11-06). Without an entry the planet follows its faction.
      group: {} as Record<string, string>,
    },
    // XIT ARB (player, 2026-11-06): you set how often a trade may lose money, and the size of
    // every trade follows from it.
    arb: {
      failurePercent: 10,
      minDailyProfit: 30_000,
      maxDays: 7,
      // Days of trade queued in front of one of your orders before it is worth a price cut.
      queueDays: 0.5,
    },
    flow: {
      overrides: {} as Record<string, UserData.PriceOverride>,
    },
    repair: {
      threshold: 60,
      offset: 10,
      planetOverrides: {} as Record<string, { threshold?: number; offset?: number }>,
    },
    noBuy: [] as string[],
    sidebar: [
      ['BS', 'BS'],
      ['CONT', 'XIT CONTS'],
      ['COM', 'COM'],
      ['CORP', 'CORP'],
      ['CXL', 'CXL'],
      ['FIN', 'XIT FIN'],
      ['FLT', 'FLT'],
      ['INV', 'INV'],
      ['MAP', 'MU'],
      ['PROD', 'PROD'],
      ['LEAD', 'LEAD'],
      ['CMDS', 'CMDS'],
      ['ACT', 'XIT ACT'],
      ['BURN', 'XIT BURN'],
      ['REP', 'XIT REP'],
      ['SET', 'XIT SET'],
      ['HELP', 'XIT HELP'],
    ] as [string, string][],
    buffers: [] as [string, number, number][],
    audioVolume: 0.4,
    contextMenuExchange: 'AI1' as UserData.Exchange,
    cxmOrder: ['AI1', 'CI1', 'CI2', 'IC1', 'NC1', 'NC2'] as UserData.Exchange[],
  },
  sorting: {} as Record<string, UserData.StoreSortingData>,
  balanceHistory: {
    v1: [],
    v2: [],
  } as UserData.BalanceHistory,
  fullEquityMode: true,
  notes: [] as UserData.Note[],
  actionPackages: [] as UserData.ActionPackageData[],
  systemMessages: [] as UserData.SystemMessages[],
  todo: [] as UserData.TaskList[],
  tabs: {
    order: [] as string[],
    hidden: [] as string[],
    locked: [] as string[],
    folders: [] as UserData.TabFolder[],
  },
  commandLists: [] as UserData.CommandList[],
  govburn: {
    planets: {} as Record<string, UserData.GovBurnPlanet>,
    config: {
      planets: {} as Record<string, UserData.GovBurnPlanetConfig>,
      slots: {} as Record<string, UserData.GovBurnPlanetSlots>,
      resupplyDays: 30,
      red: 3,
      yellow: 7,
      // CoGC program to vote when no program runs now, by planet natural id.
      cogcPrograms: {} as Record<string, string | undefined>,
    },
    // Last time XIT GOVBURN refreshed all building data.
    refreshedAt: 0,
  },
  // Recipe key picked in XIT RECIPES, by material ticker.
  recipeChoices: {} as Record<string, string | undefined>,
  // XIT EXTRACT: watched planets by resource, and hidden resources. Filled by a migration.
  extract: {
    planets: {} as Record<string, string[] | undefined>,
    hidden: [] as string[],
    // Why a resource is hidden; missing means no reason.
    hiddenReasons: {} as Record<string, string | undefined>,
  },
  // Planet whose extraction gives the daily profit of a raw material in an order book, by 'AIR.NC1'.
  extractPlanets: {} as Record<string, string | undefined>,
  // Amount left of each of your CX orders when you last left XIT ORDERS, by order id.
  orderSeen: {} as Record<string, number | undefined>,
  // XIT ARB blacklist: material ticker -> reason id.
  arbBlacklist: {} as Record<string, string | undefined>,
  // Ship ids in the order you dragged them to in FLT.
  fltOrder: [] as string[],
  // XIT ARB cart: the goods for one flight on one route.
  arbCart: {
    ship: '500/500',
    items: [] as {
      ticker: string;
      from: string;
      to: string;
      mode: 'now' | 'listed';
      units: number;
      // True when you pressed 挂单 on this good: it is offered, never sold to the requests.
      listOnly?: boolean;
    }[],
  },
  // XIT ORDERS: books you pinned, as 'RAT.NC1'. A pinned card stays when the orders are gone.
  pinnedBooks: [] as string[],
  // Arbitrage batches started from XIT ARB, oldest first.
  arbBatches: [] as import('@src/core/arb-batches').ArbBatch[],
  // XIT ARB: when each spread ('AL.AI1>NC1') was first seen, in ms.
  arbSeen: {} as Record<string, number | undefined>,
  // XIT CX4: favorite and recent materials, and the CXOB tile id used for each exchange.
  cx4: {
    favorites: [] as string[],
    recent: [] as string[],
    tiles: {} as Record<string, string | undefined>,
    // Exchange last shown in XIT ORDERS.
    ordersExchange: undefined as string | undefined,
  },

  // Used in user-data-migrations.ts
  migrations: undefined,
});

export const userData = reactive({} as typeof initialUserData);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyUserData(newData: any) {
  newData.balanceHistory.v1 = shallowReactive(newData.balanceHistory.v1);
  newData.balanceHistory.v2 = shallowReactive(newData.balanceHistory.v2);
  Object.assign(userData, newData);
}

export function applyInitialUserData() {
  applyUserData(structuredClone(initialUserData));
}

applyInitialUserData();

export function clearBalanceHistory() {
  userData.balanceHistory.v1.length = 0;
  userData.balanceHistory.v2.length = 0;
}
