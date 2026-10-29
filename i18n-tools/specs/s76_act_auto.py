from tr import S, E, R
EX = 'src/features/XIT/ACT/ExecuteActionPackage.vue'

S('新功能 —— ACT 自动执行开关')
E('act.exec.autoOn', 'AUTO: ON', '自动：开')
E('act.exec.autoOff', 'AUTO: OFF', '自动：关')

# Replace the auto block from s73 with a toggle that the player can turn on and off.
R(EX, '''const autoActDelayMs = 300;

if (autoAct) {
  onMounted(() => {
    if (!shouldShowConfigure.value) {
      onExecuteClick();
    }
  });
  watch(actReady, ready => {
    if (!ready || !isRunning.value) {
      return;
    }
    setTimeout(() => {
      if (actReady.value) {
        onActClick();
      }
    }, autoActDelayMs);
  });
}''', '''const autoActDelayMs = 300;

// When on, press ACT for every step without waiting for the player.
const autoMode = ref(autoAct ?? false);
let autoActTimer: ReturnType<typeof setTimeout> | undefined;

watch([actReady, autoMode], ([ready, auto]) => {
  clearTimeout(autoActTimer);
  if (!ready || !auto || !isRunning.value) {
    return;
  }
  autoActTimer = setTimeout(() => {
    if (actReady.value && autoMode.value) {
      onActClick();
    }
  }, autoActDelayMs);
});

function onAutoClick() {
  autoMode.value = !autoMode.value;
}

if (autoAct) {
  onMounted(() => {
    if (!shouldShowConfigure.value) {
      onExecuteClick();
    }
  });
}''')
R(EX, '''function onCancelClick() {
  actReady.value = false;''', '''function onCancelClick() {
  autoMode.value = false;
  clearTimeout(autoActTimer);
  actReady.value = false;''')
AUTO_BTN = '''
        <PrunButton :primary="autoMode" :neutral="!autoMode" @click="onAutoClick">
          {{ autoMode ? t('act.exec.autoOn') : t('act.exec.autoOff') }}
        </PrunButton>'''
R(EX, '''        <PrunButton primary :class="$style.executeButton" @click="onExecuteClick">
          {{ t('act.common.execute') }}
        </PrunButton>''', '''        <PrunButton primary :class="$style.executeButton" @click="onExecuteClick">
          {{ t('act.common.execute') }}
        </PrunButton>''' + AUTO_BTN)
R(EX, '''        <PrunButton neutral :disabled="!actReady && !skipReady" @click="onSkipClick">
          {{ t('act.exec.skip') }}
        </PrunButton>''', '''        <PrunButton neutral :disabled="!actReady && !skipReady" @click="onSkipClick">
          {{ t('act.exec.skip') }}
        </PrunButton>''' + AUTO_BTN)
