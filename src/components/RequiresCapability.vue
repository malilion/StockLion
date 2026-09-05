<script setup lang="ts">
import { computed } from 'vue';
import type { Capability } from '../domain/capability';
import { providerRegistry } from '../providers/registry';

const props = defineProps<{
  cap: Capability;
}>();

const isAvailable = computed(() => {
  return providerRegistry.resolve(props.cap) !== null;
});
</script>

<template>
  <slot v-if="isAvailable" />
  <slot v-else name="fallback" />
</template>
