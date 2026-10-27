"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { L } from "@/lib/data";
import { useAtelier } from "@/lib/store";
import { Me } from "../chrome/Me";
import { Notices } from "../chrome/Notices";
import css from "./Concept.module.css";

const CONCEPTS = [
  { id: "a", name: { en: "Light table", tr: "Işık masası" } },
  { id: "b", name: { en: "Tech pack", tr: "Föy" } },
  { id: "c", name: { en: "Contact sheet", tr: "Kontak baskı" } },
  { id: "d", name: { en: "Split", tr: "Bölünmüş" } },
  { id: "e", name: { en: "Canvas", tr: "Kanvas" } },
];

/* Minimal chrome for the concept screens: where you are, how to leave,
   what it costs. Global navigation steps back while you are making. */
export function ConceptShell({
  active,
  tools,
  switcher = true,
  crumb = { en: "From Ghost to Campaign", tr: "Ghost'tan Kampanyaya" },
  children,
}: {
  active: string;
  tools?: ReactNode;
  switcher?: boolean; // the concept switcher is a review tool; a concept may keep it out of the product screen
  crumb?: L; // the flow being made
  children: ReactNode;
}) {
  const { t, s, ready } = useAtelier();
  if (!ready) return <div className={css.root} />;
  return (
    <div className={css.root} data-concept={active}>
      <header className={css.chrome}>
        <div className={css.chromeLeft}>
          <Link href="/" className={css.word}>
            LIORA
          </Link>
          <span className={css.crumbSep} />
          <nav className={css.crumb} aria-label="Breadcrumb">
            <Link href="/">{t({ en: "Atelier", tr: "Atölye" })}</Link>
            <span aria-hidden>/</span>
            <b>{t(crumb)}</b>
          </nav>
        </div>
        <div className={css.chromeRight}>
          {tools}
          {s.guest ? (
            /* looking around before an account: no balance, no menu yet */
            <>
              <Link href="/signin" className={css.quiet}>
                {t({ en: "Sign in", tr: "Giriş yap" })}
              </Link>
              <Link href="/signup?from=start" className={css.credits}>
                {t({ en: "Open an account", tr: "Hesap aç" })}
              </Link>
            </>
          ) : (
            <>
              {/* W-F-16: the setup is saved as it is; leaving keeps it as a draft */}
              <Link href="/jobs" className={css.quiet}>
                {t({ en: "Save and exit", tr: "Kaydet ve çık" })}
              </Link>
              <Notices />
              <Link href="/packages" className={css.credits}>
                <span>{s.credits}</span>
                {t({ en: "credits", tr: "kredi" })}
              </Link>
              <Me compact />
            </>
          )}
        </div>
      </header>
      {children}
      {switcher && (
      <nav className={css.switcher} aria-label="Concepts">
        <span>{t({ en: "Concept", tr: "Konsept" })}</span>
        {CONCEPTS.map((c) => (
          <Link key={c.id} href={`/concepts/${c.id}`} className={active === c.id ? css.on : undefined}>
            <b>{c.id.toUpperCase()}</b>
            {t(c.name)}
          </Link>
        ))}
      </nav>
      )}
    </div>
  );
}
