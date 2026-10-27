import { Welcome, type Step } from "@/components/auth/Welcome";

/* Onboarding before an account. Opened without a step it begins empty —
   a new visit does not inherit the last one's name and answers (Elif). */
const STEPS: Step[] = ["for", "name", "reading", "wear", "tier", "style", "where", "ready", "question", "job", "why", "tools", "look"];

export default async function Page(props: PageProps<"/start">) {
  const q = await props.searchParams;
  const step = STEPS.find((x) => x === q.step);
  return <Welcome mode="start" step={step === "reading" ? "name" : (step ?? "for")} fresh={!step} />;
}
