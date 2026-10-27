import { Profile, type ProfileTab } from "@/components/profile/Profile";

const TABS: ProfileTab[] = ["account", "brand", "plan", "settings", "delete"];

export default async function Page(props: PageProps<"/profile">) {
  const q = await props.searchParams;
  const tab = TABS.find((x) => x === q.tab) ?? "account";
  return <Profile tab={tab} />;
}
