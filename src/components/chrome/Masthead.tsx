"use client";

import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";
import type { L } from "@/lib/data";
import { useAtelier } from "@/lib/store";
import { Me } from "./Me";
import { Notices } from "./Notices";
import css from "./Masthead.module.css";

/* The v2 chrome: the wordmark with the room you are in, your balance,
   your name. Everything else waits in the name menu. */
export function Masthead({
  section,
  onMark,
  center,
  aside,
}: {
  section: L;
  onMark?: (e: MouseEvent<HTMLAnchorElement>) => void;
  center?: ReactNode; // a page's own line, centred (e.g. the flow you are in)
  aside?: ReactNode; // a quiet action before the balance (e.g. save and exit)
}) {
  const { s, t } = useAtelier();

  return (
    <header className={css.top}>
      <Link href="/" className={css.mark} onClick={onMark}>
        LIORA <span>{t(section)}</span>
      </Link>
      {center && <div className={css.center}>{center}</div>}
      <div className={css.me}>
        {aside}
        {s.guest ? (
          /* looking around before an account */
          <>
            <Link href="/signin" className={css.guestLink}>
              {t({ en: "Sign in", tr: "Giriş yap" })}
            </Link>
            <Link href="/signup?from=start" className={css.credits}>
              {t({ en: "Open an account", tr: "Hesap aç" })}
            </Link>
          </>
        ) : (
          <>
            <Notices />
            <Link href="/packages" className={css.credits} data-low={s.credits <= 3 || undefined}>
              <span>{s.credits}</span> {t({ en: "credits", tr: "kredi" })}
            </Link>
            <Me />
          </>
        )}
      </div>
    </header>
  );
}
