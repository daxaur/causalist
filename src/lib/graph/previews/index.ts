import type { CausalGraph } from "../types";
import { causalistSelfGraph } from "./causalist";
import { nextjsSliceGraph } from "./nextjs";
import { flaskGraph } from "./flask";

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
    tagline: "The app, mapping itself. Every file in this repo, visualized.",
    graph: causalistSelfGraph,
  },
  {
    slug: "next-js",
    title: "next.js",
    subtitle: "vercel/next.js",
    tagline: "A curated slice of the framework that built this — 30+ core modules.",
    graph: nextjsSliceGraph,
  },
  {
    slug: "flask",
    title: "flask",
    subtitle: "pallets/flask",
    tagline: "Python microframework — close to the full `flask/` package.",
    graph: flaskGraph,
  },
];

export function previewBySlug(slug: string): PreviewMeta | null {
  return PREVIEWS.find((p) => p.slug === slug) ?? null;
}
