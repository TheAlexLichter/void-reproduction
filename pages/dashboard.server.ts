import { defer, defineHandler, type InferProps } from "void";

export type Props = InferProps<typeof loader>;

export const loader = defineHandler((c) => ({
  heading: "Core page is ready",
  trial: c.req.query("trial") ?? "unknown",
  stats: defer(async () => {
    await new Promise((resolve) => setTimeout(resolve, 4000));
    return { message: "Secondary data is ready" };
  }),
}));
