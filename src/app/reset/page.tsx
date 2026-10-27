import { NewPassword, ResetPassword } from "@/components/auth/SignIn";

/* /reset asks for the link; /reset?token=… is where the email's link lands */
export default async function Page(props: PageProps<"/reset">) {
  const q = await props.searchParams;
  return typeof q.token === "string" ? <NewPassword token={q.token} /> : <ResetPassword />;
}
