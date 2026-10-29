<script setup lang="ts">
import { statusColor, statusLabel } from '@src/features/XIT/contract-overview/utils';

defineProps<{ status: PrunApi.ContractStatus }>();
</script>

<template>
  <td :style="{ color: statusColor(status) }">{{ statusLabel(status) }}</td>
</template>
