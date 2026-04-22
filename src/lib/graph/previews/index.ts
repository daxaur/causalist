import type { CausalGraph } from "../types";
import { causalistSelfGraph } from "./causalist";
import { nextjsSliceGraph } from "./nextjs";

export interface PreviewMeta {
  slug: string;
  title: string;
  subtitle: string;
  tagline: string;
  graph: CausalGraph;
}

export const PREVIEWS: PreviewMeta[] = [
  {
    slug: "causalist",
    title: "causalist",
    subtitle: "daxaur/causalist",
    tagline: "The app, mapping itself. Meta-demo.",
    graph: causalistSelfGraph,
  },
  {
    slug: "next-js",
    title: "next.js",
    subtitle: "vercel/next.js",
    tagline: "A hand-curated slice of the framework that built this.",
    graph: nextjsSliceGraph,
  },
];

export function previewBySlug(slug: string): PreviewMeta | null {
  return PREVIEWS.find((p) => p.slug === slug) ?? null;
}
