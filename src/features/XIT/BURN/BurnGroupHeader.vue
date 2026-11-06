<script setup lang="ts">
// The group a run of planets belongs to: a divider line with the name, no numbers (player,
// 2026-11-06).
const { color } = defineProps<{ name: string; color?: { dot: string; text: string } }>();

const $style = useCssModule();
</script>

<template>
  <tbody>
    <tr>
      <td colspan="8" :class="$style.cell">
        <span
          :class="$style.dot"
          :style="{ backgroundColor: color?.dot ?? 'var(--rpz-text-off)' }" />
        <span :style="{ color: color?.text ?? 'var(--rpz-text-weak)' }">{{ name }}</span>
      </td>
    </tr>
  </tbody>
</template>

<style module>
.cell {
  padding: var(--rpz-space-2) var(--rpz-space-2) 2px;
  border-bottom: 1px solid var(--rpz-stroke-weak);
  color: var(--rpz-text-weak);
  font-size: var(--rpz-fs-label);
  letter-spacing: 0.08em;
}

.dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  margin-right: 6px;
  vertical-align: middle;
}
</style>
