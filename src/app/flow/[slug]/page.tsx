import { notFound } from "next/navigation";
import { flowBySlug } from "@/lib/data";
import { FlowSurface } from "@/components/flow/FlowSurface";

export default async function FlowPage(props: PageProps<"/flow/[slug]">) {
  const { slug } = await props.params;
  const sp = await props.searchParams;
  const flow = flowBySlug(slug);
  if (!flow) notFound();
  const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);
  return <FlowSurface key={flow.slug} slug={flow.slug} query={{ draft: one(sp.draft), from: one(sp.from), sample: one(sp.sample) }} />;
}
