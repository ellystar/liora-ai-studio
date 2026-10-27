import { SignUp } from "@/components/auth/SignUp";

export default async function Page(props: PageProps<"/signup">) {
  const q = await props.searchParams;
  const from = q.from === "start" || q.from === "make" ? q.from : undefined;
  return <SignUp from={from} />;
}
