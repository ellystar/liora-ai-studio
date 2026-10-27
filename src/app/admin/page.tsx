import { Admin, type AdminView } from "@/components/admin/Admin";

const VIEWS: AdminView[] = ["home", "salon", "cast", "review", "catalog", "flows", "users", "people", "news", "stats", "audit"];

export default async function Page(props: PageProps<"/admin">) {
  const q = await props.searchParams;
  const view = VIEWS.find((v) => v === q.view) ?? "home";
  return <Admin view={view} />;
}
