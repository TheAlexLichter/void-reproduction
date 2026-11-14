<script setup lang="ts">
import { Link, useNavigation } from "@void/vue";
import { onMounted, ref } from "vue";
import { routeUrl } from "void/routes";

const navigation = useNavigation();
const run = ref("initial");
onMounted(() => {
  run.value = crypto.randomUUID();
});
</script>

<template>
  <p class="eyebrow">Void 1.9.1 · Vue · pending prefetch + deferred data</p>
  <h1>Does prefetch hold up navigation?</h1>
  <p>The destination has an immediate heading and a secondary operation that takes four seconds.</p>
  <div class="trials">
    <section class="panel">
      <h2>1. Pending prefetch</h2>
      <p>Hover for about 200 ms, then click before four seconds have passed.</p>
      <Link
        :href="routeUrl('/dashboard', { query: { trial: 'Pending prefetch', run } })"
        prefetch
        data-testid="pending-link"
        >Try pending prefetch →</Link
      >
      <p class="expected">Bug: the heading waits for the secondary data.</p>
    </section>
    <section class="panel">
      <h2>2. No prefetch</h2>
      <p>Click immediately. This is the passing control.</p>
      <Link
        :href="routeUrl('/dashboard', { query: { trial: 'No prefetch', run } })"
        :prefetch="false"
        data-testid="direct-link"
        >Try direct navigation →</Link
      >
      <p class="expected">The heading appears first, with “Loading secondary data…”.</p>
    </section>
    <section class="panel">
      <h2>3. Completed prefetch</h2>
      <p>Hover and wait at least five seconds, then click.</p>
      <Link
        :href="routeUrl('/dashboard', { query: { trial: 'Completed prefetch', run } })"
        prefetch
        data-testid="completed-link"
        >Try completed prefetch →</Link
      >
      <p class="expected">The heading and secondary data appear together from cache.</p>
    </section>
  </div>
  <p role="status" class="status">
    {{
      navigation.state === "idle"
        ? "Ready for a trial."
        : "Navigation pending: still waiting for the destination…"
    }}
  </p>
  <p>
    Use the reset link after each trial. Each fresh page load creates unique destination URLs, and
    ISR is disabled.
  </p>
</template>
