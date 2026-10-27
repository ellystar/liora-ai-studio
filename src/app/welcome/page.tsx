import { Welcome, type Step } from "@/components/auth/Welcome";

const STEPS: Step[] = ["opened", "for", "name", "reading", "wear", "tier", "style", "where", "ready", "question", "job", "why", "tools", "talk", "look"];

export default async function Page(props: PageProps<"/welcome">) {
  const q = await props.searchParams;
  const step = STEPS.find((x) => x === q.step) ?? "opened";
  /* only a path inside the app is followed after onboarding */
  const next = typeof q.next === "string" && q.next.startsWith("/") && !q.next.startsWith("//") ? q.next : undefined;
  return <Welcome step={step === "reading" ? "name" : step} back={q.back === "profile" ? "profile" : undefined} next={next} />;
}
