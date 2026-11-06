<script setup lang="ts">
// The faction a group of planets belongs to: a divider line, no numbers (player, 2026-11-06).
defineProps<{ name: string }>();
</script>

<template>
  <tbody>
    <tr>
      <td colspan="8" :class="$style.cell">{{ name }}</td>
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
  text-transform: uppercase;
}
</style>
