import { Canvas } from "@/components/concepts/Canvas";

export default async function Page(props: PageProps<"/concepts/e/restyle">) {
  const q = await props.searchParams;
  const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : null);
  return <Canvas flow="restyle" mod={"mod" in q} sample={one(q.sample)} from={one(q.from)} split={q.panel === "split"} initialCast={one(q.cast)} initialSetting={one(q.setting)} product={one(q.product)} draft={one(q.draft)} />;
}
