import { ReviewSurface } from "@/components/review/ReviewSurface";

export default async function JobPage(props: PageProps<"/jobs/[id]">) {
  const { id } = await props.params;
  return <ReviewSurface id={id} />;
}
