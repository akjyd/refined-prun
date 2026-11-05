<script setup lang="ts">
import MaterialIcon from '@src/components/MaterialIcon.vue';
import PrunButton from '@src/components/PrunButton.vue';

// A blacklist grouped by reason: one line per reason with its materials. Click × to take a
// material off the list. Automatic exclusions show as their own lines and cannot be removed.
const { entries, reasons, automatic } = defineProps<{
  // Material ticker -> reason id.
  entries: Record<string, string | undefined>;
  // Reason id -> label, in display order.
  reasons: { id: string; label: string }[];
  // Lines of materials left out by rules, not by you.
  automatic?: { label: string; tickers: string[] }[];
}>();

const emit = defineEmits<{ remove: [ticker: string] }>();

const $style = useCssModule();

const groups = computed(() =>
  reasons
    .map(reason => ({
      ...reason,
      tickers: Object.keys(entries)
        .filter(x => (entries[x] ?? reasons[0].id) === reason.id)
        .sort(),
    }))
    .filter(x => x.tickers.length > 0),
);
</script>

<template>
  <div :class="$style.panel">
    <div v-for="g in groups" :key="g.id" :class="$style.line">
      <span :class="$style.reason">{{ g.label }}</span>
      <span :class="$style.items">
        <span v-for="ticker in g.tickers" :key="ticker" :class="$style.item">
          <MaterialIcon size="inline-table" :ticker="ticker" />
          <PrunButton dark inline @click="emit('remove', ticker)">×</PrunButton>
        </span>
      </span>
    </div>
    <div v-for="a in automatic ?? []" :key="a.label" :class="$style.line">
      <span :class="$style.reason">{{ a.label }}</span>
      <span :class="$style.items">
        <span v-for="ticker in a.tickers" :key="ticker" :class="$style.item">
          <MaterialIcon size="inline-table" :ticker="ticker" />
        </span>
      </span>
    </div>
  </div>
</template>

<style module>
.panel {
  display: grid;
  gap: 4px;
  padding: 6px;
  margin-bottom: 8px;
  background-color: var(--rpz-bg-raised);
  border: 1px solid var(--rpz-stroke-weak);
}

.line {
  display: grid;
  grid-template-columns: 140px minmax(0, 1fr);
  gap: 0 10px;
  align-items: start;
  padding: 3px 0;
  border-top: 1px solid var(--rpz-bg-raised);
}

.line:first-child {
  border-top: none;
}

.reason {
  color: var(--rpz-text);
}

.items {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 8px;
}

.item {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}
</style>
