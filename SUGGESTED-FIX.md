# Avoid awaiting unfinished prefetches for progressive navigation

## Why it happens

Void intentionally resolves deferred props before returning a prefetch response, so the prefetch cache contains a complete page object. That behavior is described in its [prefetch design](https://github.com/voidzero-dev/void/blob/v1.9.1/platform/meta/design-docs/0029-prefetch.md).

During navigation, [the engine awaits the cached response promise](https://github.com/voidzero-dev/void/blob/v1.9.1/packages/void/src/pages/navigation-engine.ts#L740-L744), even if it has not settled. That couples the core page's visibility to the slowest deferred group whenever a click follows an unfinished prefetch.

## App-level avoidance

Set `:prefetch="false"` in Vue (`prefetch={false}` in JSX) on links to routes whose secondary data should stream. Keep automatic prefetching on other destinations. This uses the existing API, but loses speculative prefetching for those particular links.

The “No prefetch” control demonstrates this behavior without a runtime patch.

## Tested prototype: reuse only fulfilled prefetches

The runtime prototype in [scripts/patch-runtime.mjs](./scripts/patch-runtime.mjs) makes two changes:

1. A cache entry starts with `fulfilled: false`. Its promise sets that flag to `true` when it fulfills. Rejection does not make an entry eligible.
2. Navigation reuses an entry only when `fulfilled` is true. Otherwise it takes the existing normal navigation path, which streams deferred groups.

Conceptually:

```ts
const candidate = method === "GET" ? cache.get(fetchUrl, method) : null;
const cacheEntry = candidate?.fulfilled ? candidate : null;
```

This preserves reuse of completed prefetches, and does not attempt to render an incomplete prefetch payload as a complete one. A late settlement updates only its original cache entry; it does not reinsert a flushed entry.

`vp run verify:prototype` checks the stock behavior and the prototype against the real installed router, then restores the original files:

- No prefetch: the core shell arrives with the deferred group still loading.
- Completed prefetch: navigation reuses it without another request.
- Pending prefetch: stock Void blocks the core shell; the prototype returns it while secondary data is still pending.

## Upstream API and tradeoff

This prototype applies the policy globally to make the difference easy to demonstrate. An upstream change should make the policy configurable, or apply it specifically to progressive/deferred routes. For a route whose entire response is required, waiting for a prefetch already near completion can be better than starting again.

Bypassing a pending prefetch starts a second request. The prototype leaves the speculative request running, so it is a latency fix with a request-cost tradeoff. A production implementation could abort a bypassed prefetch if no other consumer needs it, with appropriate ownership/reference tracking.

A more complete approach would let prefetch use the streaming protocol too: keep the core shell separately from completion, then promote the in-flight resource into the active navigation and continue consuming its deferred groups. That could preserve the head start and avoid duplicate requests, but needs changes to the prefetch protocol, cache ownership, cancellation and deferred replay across adapters.

Useful upstream regression coverage would also include rejected prefetches, expiry, late completion after flush, navigation cancellation, redirects, and multiple consumers. The small prototype is evidence for the completed-only policy, rather than a complete framework patch.
