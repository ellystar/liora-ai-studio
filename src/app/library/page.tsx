import { Library } from "@/components/library/Library";

export default async function Page(props: PageProps<"/library">) {
  const q = await props.searchParams;
  return <Library tab={q.tab === "setting" ? "setting" : "cast"} />;
}
