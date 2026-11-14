import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { createPageNavigationEngine } from "void/pages-client";
import { parseCacheFor } from "void/pages-prefetch";
import { serializePageData } from "void/pages-server";

// Only the browser host and transport are faked. Cache selection, prefetch consumption,
// streaming and deferred resolution all run through the installed Void router.
async function fixture() {
  const initial = { component: "/", props: {}, params: {}, shared: {}, url: "/", errors: null };
  const target = {
    ...initial,
    component: "/dashboard",
    url: "/dashboard",
    props: { heading: "Core page is ready", stats: { loading: true, value: null, error: null } },
    deferred: ["stats"],
    deferredKeys: { stats: "stats" },
  };
  vi.stubGlobal("window", { location: new URL("http://localhost/") });
  vi.stubGlobal("document", {
    getElementById: () => ({ textContent: serializePageData(initial) }),
  });
  class Cell {
    loading = true;
  }
  const engine = await createPageNavigationEngine({
    adapter: {
      createDeferred: () => new Cell(),
      resolveDeferred: (cell, value) => {
        if (!(cell instanceof Cell)) throw new Error("Unexpected deferred cell");
        return Object.assign(cell, { value, loading: false });
      },
      rejectDeferred: (cell, error) => {
        if (!(cell instanceof Cell)) throw new Error("Unexpected deferred cell");
        return Object.assign(cell, { error, loading: false });
      },
      isLoading: (cell) => cell instanceof Cell && cell.loading,
    },
    components: { "/": async () => ({ default: {} }), "/dashboard": async () => ({ default: {} }) },
    layoutTree: {},
    routeMeta: {},
    matchRoute: (path) => path,
    viewTransitions: false,
    prefetchHoverDelay: 75,
    prefetchDefaultCacheFor: parseCacheFor("60s"),
  });
  let releasePrefetch!: () => void;
  const prefetched = new Promise<Response>((resolve) => {
    releasePrefetch = () =>
      resolve(
        new Response(
          serializePageData({
            ...target,
            props: { heading: "Core page is ready", stats: { message: "Secondary data is ready" } },
            deferred: undefined,
          }),
          { headers: { "X-VoidPages": "true", "content-type": "application/json" } },
        ),
      );
  });
  let releaseStream!: () => void;
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(serializePageData(target) + "\n"));
      releaseStream = () => {
        controller.enqueue(
          encoder.encode(
            serializePageData({
              __deferred: "stats",
              data: { message: "Secondary data is ready" },
            }) + "\n",
          ),
        );
        controller.close();
      };
    },
  });
  const request = vi.fn<typeof fetch>().mockImplementation(async (_url, init) =>
    new Headers(init?.headers).get("Purpose") === "prefetch"
      ? prefetched
      : new Response(stream, {
          headers: { "X-VoidPages": "true", "content-type": "application/x-ndjson" },
        }),
  );
  vi.stubGlobal("fetch", request);
  return { engine, request, releasePrefetch, releaseStream };
}

afterEach(() => vi.unstubAllGlobals());

describe("prefetch and deferred navigation", () => {
  it("control: without prefetch, core content arrives while secondary data is pending", async () => {
    const f = await fixture();
    const navigation = f.engine.prepareVisit("/dashboard");
    try {
      const shell = await navigation.shell;
      expect(shell?.pageData.props.heading).toBe("Core page is ready");
      expect(shell?.pageData.props.stats).toMatchObject({ loading: true });
      expect(f.request).toHaveBeenCalledTimes(1);
    } finally {
      f.releaseStream();
      navigation.dispose();
      f.engine.flushAll();
    }
  });

  it("control: a completed prefetch is reused without another request", async () => {
    const f = await fixture();
    const prefetch = f.engine.prefetch("/dashboard");
    f.releasePrefetch();
    await prefetch;
    const navigation = f.engine.prepareVisit("/dashboard");
    try {
      const shell = await navigation.shell;
      expect(shell?.pageData.props.stats).toMatchObject({
        loading: false,
        value: { message: "Secondary data is ready" },
      });
      expect(f.request).toHaveBeenCalledTimes(1);
    } finally {
      f.releaseStream();
      navigation.dispose();
      f.engine.flushAll();
    }
  });

  it("pending prefetch should not block the core page on secondary data", async () => {
    const f = await fixture();
    const prefetch = f.engine.prefetch("/dashboard");
    const navigation = f.engine.prepareVisit("/dashboard");
    let shell: Awaited<typeof navigation.shell>;
    void navigation.shell.then(
      (value) => {
        shell = value;
      },
      () => {},
    );
    try {
      await new Promise<void>((resolve) => setImmediate(resolve));
      // Fails on stock Void: navigation is awaiting the still-pending prefetch response.
      expect(shell?.pageData.props.heading).toBe("Core page is ready");
      expect(shell?.pageData.props.stats).toMatchObject({ loading: true });
    } finally {
      f.releasePrefetch();
      f.releaseStream();
      await Promise.allSettled([prefetch, navigation.shell]);
      navigation.dispose();
      f.engine.flushAll();
    }
  });
});
