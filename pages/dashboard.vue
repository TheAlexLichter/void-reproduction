<script setup lang="ts">
import { Link } from "@void/vue";
import { routeUrl } from "void/routes";
import type { Props } from "./dashboard.server.ts";

defineProps<Props>();
</script>

<template>
  <p class="eyebrow">{{ trial }}</p>
  <h1 data-testid="core">{{ heading }}</h1>
  <p>This heading does not depend on the four-second secondary operation.</p>
  <section class="panel" :aria-busy="stats.loading">
    <p v-if="stats.loading" role="status" data-testid="secondary-loading">
      Loading secondary data…
    </p>
    <p v-else-if="stats.error">{{ stats.error.message }}</p>
    <p v-else data-testid="secondary-ready">{{ stats.value.message }}</p>
  </section>
  <Link :href="routeUrl('/')" reload-document class="reset">Reset to the start page</Link>
</template>
