import { Packages } from "@/components/packages/Packages";

export default async function Page(props: PageProps<"/packages">) {
  const q = await props.searchParams;
  /* where to return after an upgrade — only a path inside the app */
  const from = typeof q.from === "string" && q.from.startsWith("/") && !q.from.startsWith("//") ? q.from : null;
  return <Packages from={from} />;
}
