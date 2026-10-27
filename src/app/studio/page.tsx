import { Studio } from "@/components/library/Studio";

export default async function Page(props: PageProps<"/studio">) {
  const q = await props.searchParams;
  /* where to return with the new cast — only a path inside the app */
  const from = typeof q.from === "string" && q.from.startsWith("/") && !q.from.startsWith("//") ? q.from : null;
  return <Studio from={from} />;
}
