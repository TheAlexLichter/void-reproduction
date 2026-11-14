# Void reproductions

Minimal [Void](https://void.cloud) bug reproductions, one orphan branch per issue.

`main` is the index. Each reproduction branch has its own independent history, pinned dependencies, README, and exact run instructions.

## Reproductions

| Branch | Problem | Confirmed version |
| --- | --- | --- |
| [prefetch-blocks-deferred-navigation](https://github.com/TheAlexLichter/void-reproduction/tree/prefetch-blocks-deferred-navigation) | Clicking during a pending prefetch waits for deferred data instead of rendering the core page first. | Void / @void/vue 1.9.1 |

## Adding a reproduction

Create a new orphan branch containing only the files needed to reproduce the issue. Include affected versions, exact commands, passing controls, and any proposed fix. Add the branch to this index.

Keep credentials, private data, generated output, and unrelated application files out of the repository.
