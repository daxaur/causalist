import { notFound } from "next/navigation";
import { REFERENCES, referenceBySlug } from "@/lib/graph/references";
import { ReferenceClient } from "./reference-client";

export function generateStaticParams() {
  return REFERENCES.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ref = referenceBySlug(slug);
  if (!ref) return {};
  return {
    title: `${ref.title} · Causalist reference`,
    description: ref.subtitle,
  };
}

export default async function ReferencePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ref = referenceBySlug(slug);
  if (!ref) notFound();
  return <ReferenceClient reference={ref} />;
}
