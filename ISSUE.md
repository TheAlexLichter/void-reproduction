# Pending prefetch blocks navigation until deferred props resolve

Clicking a link while its hover prefetch is still pending blocks the destination's core content on its deferred data. Without prefetch, the same page shows its heading and loading state before that data arrives.

## Runnable reproduction

[TheAlexLichter/void-reproduction — prefetch-blocks-deferred-navigation](https://github.com/TheAlexLichter/void-reproduction/tree/prefetch-blocks-deferred-navigation)

```sh
git clone --single-branch --branch prefetch-blocks-deferred-navigation https://github.com/TheAlexLichter/void-reproduction.git
cd void-reproduction
vp install
vp dev
```

Open the printed local URL. Try the pending-prefetch link by hovering briefly and clicking before the four-second secondary operation completes. Compare the no-prefetch and fully completed-prefetch controls. Reset the document between trials using the provided link.

Reproduced with Void 1.9.1, @void/vue 1.9.1, Vue 3.5.45, and Node 26.13.1. The example uses native `Link`, a native loader and `defer()`, with ISR disabled and no database or external services.

## Expected

For a route with deferred data, the core page should be able to appear while secondary data is pending, including when a prefetch has already started. Fully completed prefetches should remain reusable.

## Actual

The old page stays visible until the pending prefetch resolves every deferred group. The destination's intermediate loading state is skipped.

The navigation engine [awaits `cacheEntry.response`](https://github.com/voidzero-dev/void/blob/v1.9.1/packages/void/src/pages/navigation-engine.ts#L740-L744). Prefetch responses intentionally resolve deferred groups before returning, so navigation inherits that wait.

## Possible fix

Could Void expose an opt-in policy that reuses only fulfilled prefetches and otherwise falls back to normal streamed navigation?

The reproduction includes a reversible proof of concept and a one-command check:

```sh
vp run verify:prototype
```

Stock Void fails the pending-prefetch assertion while both controls pass. After marking fulfilled cache entries and bypassing unfinished ones, all three tests pass. The command restores stock files afterward.

This fallback starts a second request when prefetch is pending, so it should be configurable rather than an unconditional policy for all routes. Promoting an in-flight streaming prefetch into active navigation could avoid that duplication, but requires broader protocol and resource-lifecycle changes. The repository's [suggested fix](https://github.com/TheAlexLichter/void-reproduction/blob/prefetch-blocks-deferred-navigation/SUGGESTED-FIX.md) documents the prototype and those tradeoffs.
