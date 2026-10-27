"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAtelier } from "@/lib/store";

/* The dashboard and every page of an account are for accounts (Elif). Someone
   who answered /start without opening one is sent to sign-up — never left on
   a dashboard they cannot use. Onboarding, the auth pages and the public
   rooms stay open. */
const OPEN = ["/start", "/signup", "/signin", "/reset", "/welcome", "/salon", "/admin"];

export function GuestGate() {
  const { s, ready } = useAtelier();
  const path = usePathname();
  const router = useRouter();
  const blocked = ready && s.guest && !OPEN.some((p) => path === p || path.startsWith(`${p}/`));

  useEffect(() => {
    if (blocked) router.replace("/signup?from=start");
  }, [blocked, router]);

  return null;
}
