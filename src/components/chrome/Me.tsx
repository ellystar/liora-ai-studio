"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ROLE_META } from "@/lib/data";
import { displayName, initials, useAtelier } from "@/lib/store";
import css from "./Me.module.css";

/* Who you are, and the rooms that are not on screen. The same in every
   chrome — the pages' masthead and the canvas rail. */
export function Me({ compact = false }: { compact?: boolean }) {
  const { s, t, set } = useAtelier();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const running = s.jobs.filter((j) => j.status === "running").length;
  const expiring = s.jobs.filter((j) => j.status === "done" && (j.expiresInDays ?? 9) <= 2).length;

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div className={css.wrap} ref={box}>
      <button className={css.who} onClick={() => setOpen(!open)} aria-expanded={open} aria-label={displayName(s)}>
        {!compact && <span className={css.name}>{displayName(s)}</span>}
        <span className={css.avatar}>{initials(s)}</span>
      </button>
      {open && (
        <div className={css.menu} onClick={(e) => (e.target as HTMLElement).closest("a") && setOpen(false)}>
          <p className={css.role}>
            {t(ROLE_META[s.role].label)} · {ROLE_META[s.role].package}
          </p>
          <Link href="/jobs">
            {t({ en: "Jobs", tr: "İşlerim" })}
            {(running > 0 || expiring > 0) && (
              <em>
                {running > 0 && t({ en: `${running} running`, tr: `${running} sürüyor` })}
                {running > 0 && expiring > 0 && " · "}
                {expiring > 0 && t({ en: "frames leaving", tr: "silinecek kareler" })}
              </em>
            )}
          </Link>
          <Link href="/library">{t({ en: "Library", tr: "Kütüphane" })}</Link>
          <Link href="/studio">Cast Studio</Link>
          <Link href="/explore">{t({ en: "Explore", tr: "Keşfet" })}</Link>
          <Link href="/salon">Salon</Link>
          <Link href="/profile" className={css.sep}>
            {t({ en: "Profile", tr: "Profil" })}
          </Link>
          <div className={css.lang}>
            {(["en", "tr"] as const).map((l) => (
              <button key={l} aria-pressed={s.lang === l} onClick={() => set({ lang: l })}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <Link href="/signin" className={css.out}>
            {t({ en: "Sign out", tr: "Çıkış yap" })}
          </Link>
        </div>
      )}
    </div>
  );
}
