import { CastDetail } from "@/components/library/CastDetail";

export default async function Page(props: PageProps<"/library/cast/[id]">) {
  const { id } = await props.params;
  return <CastDetail id={id} />;
}
