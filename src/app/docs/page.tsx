import { redirect } from "next/navigation";
import { SECTIONS } from "@/lib/docs/content";

export default function DocsIndexPage() {
  const first = SECTIONS[0];
  redirect(`/docs/${first.slug}`);
}
