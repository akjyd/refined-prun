from tr import S, E, R
EX = 'src/features/XIT/ACT/ExecuteActionPackage.vue'
AR = 'src/features/XIT/ACT/runner/action-runner.ts'
SM = 'src/features/XIT/ACT/runner/step-machine.ts'
RF = 'src/features/XIT/ACT/actions/refuel/refuel.ts'
FLT = 'src/features/XIT/FLT/FLT.vue'

S('新功能 —— 单船加油、隐藏窗口')
E('flt.refuelShip', 'REFUEL', '加油')
E('flt.refueling', 'REFUELING…', '加油中…')
E('act.refuel.noShip', 'Ship {0} not found.', '找不到船 {0}。')
E('act.run.preOpen', 'Opening {0} exchange windows for auto mode...', '自动模式：正在打开 {0} 个交易所窗口...')

# ---------------------------------------------------------------- execute window
R(EX, '''  // Start at once and press ACT for every step without waiting for the player.
  autoAct?: boolean;''', '''  // Start at once and press ACT for every step without waiting for the player.
  autoAct?: boolean;
  // Called once when the run ends. ok is false if the run had errors, warnings or was canceled.
  onFinish?: (ok: boolean) => void;''')
R(EX, 'const { pkg, afterExecute, extraSteps, autoAct } = defineProps<{',
  'const { pkg, afterExecute, extraSteps, autoAct, onFinish } = defineProps<{')
R(EX, '''const skipReady = ref(false);
''', '''const skipReady = ref(false);
let started = false;
let hasProblem = false;
''')
R(EX, '  onStart: () => (isRunning.value = true),', '''  onStart: () => {
    isRunning.value = true;
    started = true;
  },''')
R(EX, '''    afterExecute?.(config.value, logMessage);''', '''    afterExecute?.(config.value, logMessage);
    onFinish?.(!hasProblem);''')
R(EX, '''  onSkipReady: () => {
    skipReady.value = true;
  },''', '''  onSkipReady: () => {
    skipReady.value = true;
  },
  isAutoAct: () => autoMode.value,''')
R(EX, '''function logMessage(tag: LogTag, message: LogContent) {''', '''function logMessage(tag: LogTag, message: LogContent) {
  if (tag === 'ERROR' || tag === 'WARNING' || tag === 'CANCEL') {
    hasProblem = true;
  }''')
R(EX, '''function onExecuteClick() {''', '''async function onExecuteClick() {''')
R(EX, '''  runner.execute(pkg, config.value, extraSteps);''', '''  started = false;
  hasProblem = false;
  await runner.execute(pkg, config.value, extraSteps);
  // The package can fail before it starts; report that too.
  if (!started) {
    onFinish?.(false);
  }''')
R(EX, '''      onExecuteClick();
    }
  });''', '''      void onExecuteClick();
    }
  });''')
R(EX, '''function onAutoClick() {
  autoMode.value = !autoMode.value;
}''', '''function onAutoClick() {
  autoMode.value = !autoMode.value;
  if (autoMode.value && isRunning.value) {
    void runner.prepareAuto();
  }
}''')
# The window splits itself right after it opens; only the instance after the split may start.
R(EX, '''  onMounted(() => {
    if (!shouldShowConfigure.value) {''', '''  onMounted(() => {
    if (!goingToSplit.value && !shouldShowConfigure.value) {''')

# ---------------------------------------------------------------- runner
R(SM, '''  get isRunning() {
    return this.next !== undefined;
  }''', '''  get isRunning() {
    return this.next !== undefined;
  }

  get remainingSteps() {
    return this.steps;
  }''')
R(AR, '''  onSkipReady: () => void;
}''', '''  onSkipReady: () => void;
  isAutoAct?: () => boolean;
}''')
R(AR, '''  private stepMachine?: StepMachine;
''', '''  private stepMachine?: StepMachine;
  // True when the current run has ended; closes the exchange windows opened for auto mode.
  private runEnded = ref(true);
''')
R(AR, '''    this.log.info(t('act.run.started'));
    this.log.info(formatTotals(steps));
    this.stepMachine = new StepMachine(steps, {
      ...this.options,
      tileAllocator: this.tileAllocator,
    });''', '''    this.log.info(t('act.run.started'));
    this.log.info(formatTotals(steps));
    const ended = ref(false);
    this.runEnded = ended;
    if (this.options.isAutoAct?.()) {
      await this.prepareAuto(steps);
    }
    this.stepMachine = new StepMachine(steps, {
      ...this.options,
      tileAllocator: this.tileAllocator,
      onEnd: () => {
        ended.value = true;
        this.options.onEnd();
      },
    });''')
R(AR, '''  act() {
    this.stepMachine?.act();''', '''  // Auto mode presses ACT faster than one shared exchange window can change its material,
  // and a purchase in a window that changes is canceled. So open one hidden exchange window
  // for each purchase before the steps run. The windows close when the run ends.
  async prepareAuto(steps = this.stepMachine?.remainingSteps ?? []) {
    const ended = this.runEnded;
    const cxTickers = new Set<string>();
    for (const step of steps) {
      if (step.type === 'CXPO_BUY') {
        const data = step as unknown as { ticker: string; exchange: string };
        cxTickers.add(`${data.ticker.toUpperCase()}.${data.exchange}`);
      }
    }
    const missing = [...cxTickers].filter(x => tiles.find(`CXPO ${x}`, true).length === 0);
    if (missing.length === 0) {
      return;
    }
    // Log instead of status: a status change would clear the ACT button of a waiting step.
    this.log.info(t('act.run.preOpen', missing.length));
    for (const cxTicker of missing) {
      await showBuffer(`CXPO ${cxTicker}`, { force: true, autoClose: true, closeWhen: ended });
    }
    const timedOut = ref(false);
    const timer = setTimeout(() => (timedOut.value = true), orderBookTimeoutMs);
    try {
      await watchUntil(
        () => timedOut.value || missing.every(x => cxobStore.getByTicker(x) !== undefined),
      );
    } finally {
      clearTimeout(timer);
    }
  }

  act() {
    this.stepMachine?.act();''')

# ---------------------------------------------------------------- refuel one ship
R(RF, '''  const originName = serializeStorage(origin);
  const isFree = (store: PrunApi.Store) => !planned?.has(store.id);''', '''  const originName = serializeStorage(origin);
  // With shipId, refuel only the fuel tanks of that ship.
  const ship = data.shipId ? shipsStore.getById(data.shipId) : undefined;
  const isTarget = (store: PrunApi.Store) =>
    !data.shipId || store.id === ship?.idStlFuelStore || store.id === ship?.idFtlFuelStore;
  const isFree = (store: PrunApi.Store) => !planned?.has(store.id) && isTarget(store);''')
R(RF, "import { storagesStore } from '@src/infrastructure/prun-api/data/storage';", """import { storagesStore } from '@src/infrastructure/prun-api/data/storage';
import { shipsStore } from '@src/infrastructure/prun-api/data/ships';""")

# ---------------------------------------------------------------- XIT FLT: refuel all ships in a hidden window
R(FLT, '''<FuelHeaderButton @refuel="showBuffer('XIT REFUELACT AUTO')">''',
  '''<FuelHeaderButton @refuel="runHidden('refuel all', 'XIT REFUELACT AUTO')">''')
R(FLT, "import FuelHeaderButton from './FuelHeaderButton.vue';", """import FuelHeaderButton from './FuelHeaderButton.vue';
import { runHidden } from '@src/features/XIT/ACT/hidden-act';""")
