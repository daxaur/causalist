import { notFound } from "next/navigation";
import { PREVIEWS, previewBySlug } from "@/lib/graph/previews";
import { PreviewClient } from "./preview-client";

export function generateStaticParams() {
  return PREVIEWS.map((p) => ({ slug: p.slug }));
}

export default async function PreviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const preview = previewBySlug(slug);
  if (!preview) notFound();

  return <PreviewClient preview={preview} />;
}
