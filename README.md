# Pending prefetch blocks deferred navigation

A runnable Vue Pages reproduction for **Void 1.9.1 / @void/vue 1.9.1**.

The destination returns a heading immediately and a `defer()` result four seconds later. If a link is clicked while its hover prefetch is pending, the heading waits for the deferred result. Without prefetch, the heading and loading state appear first. A completed prefetch is reused normally.

## Run the example

Requires [Vite+](https://viteplus.dev/guide/) and Node 26.13.1 (pinned in `.node-version`). Dependencies and the lockfile are committed. No database, credentials, Cloudflare account or deployment is needed.

```sh
git clone --single-branch --branch prefetch-blocks-deferred-navigation https://github.com/TheAlexLichter/void-reproduction.git
cd void-reproduction
vp install
vp dev
```

Open the URL printed by the dev server, normally http://localhost:5173.

The start page has three trials:

1. **Pending prefetch:** hover for about 200 ms, then click before four seconds have passed. The start page stays visible until the deferred operation finishes.
2. **No prefetch:** click the control. The destination heading appears with “Loading secondary data…” before the result arrives.
3. **Completed prefetch:** hover for at least five seconds, then click. The complete destination appears from cache.

Use **Reset to the start page** after each trial. This reloads the document and clears the client router cache. Each fresh load also gives the trials unique query strings; ISR is disabled so an edge cache cannot hide the behavior.

The reproduction itself is [pages/index.vue](./pages/index.vue), [pages/dashboard.server.ts](./pages/dashboard.server.ts), and [pages/dashboard.vue](./pages/dashboard.vue). The loader uses only a timer and Void's native `defer()`.

## Automated reproduction

```sh
vp test                    # intentionally fails the pending-prefetch case on stock Void
vp run test:controls        # two passing controls: no prefetch and completed prefetch
```

The tests exercise the installed `createPageNavigationEngine`. Only the browser host and HTTP transport are faked, allowing secondary data to be held open without timing-based assertions. Stock Void produces **one failed / two passed**. No application router or replacement prefetch cache is involved.

## Try the proposed fix

```sh
# Stop the dev server first.
vp run verify:prototype
```

This verifies the stock failure, applies a small completed-prefetch-only prototype, verifies **all three tests pass**, and restores the original runtime. The command exits successfully only if both the reproduction and the prototype behave as expected.

To compare the prototype in the browser:

```sh
# Stop the dev server first.
vp run patch:apply
vp dev --force
# The pending-prefetch trial should now show the core page before the secondary result.

# Stop the dev server, then restore stock behavior:
vp run patch:revert
vp dev --force
```

The patch script supports only the pinned Void 1.9.1 runtime. It validates each replacement, backs up the two affected files under git-ignored `.repro-patch/`, and replaces files atomically rather than modifying pnpm store links. The default checkout uses unmodified packages.

See [SUGGESTED-FIX.md](./SUGGESTED-FIX.md) for the algorithm, verification and request-cost tradeoff. See [ISSUE.md](./ISSUE.md) for a short issue draft linking to this example.

[All reproductions](https://github.com/TheAlexLichter/void-reproduction/tree/main)
