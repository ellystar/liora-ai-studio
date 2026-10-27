import { LightTable } from "@/components/concepts/LightTable";

export default async function ConceptA(props: PageProps<"/concepts/a">) {
  const { cast } = await props.searchParams;
  return <LightTable cast={typeof cast === "string" ? cast : undefined} />;
}
