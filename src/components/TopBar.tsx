"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ROLE_META } from "@/lib/data";
import { timeAgo, useAtelier } from "@/lib/store";
import { Arrow, Bell } from "./icons";
import css from "./TopBar.module.css";

const LOW_CREDIT = 10;

const NAV = [
  { href: "/", label: { en: "Atelier", tr: "Atölye" }, match: (p: string) => p === "/" || p.startsWith("/flow") },
  { href: "/jobs", label: { en: "Jobs", tr: "İşlerim" }, match: (p: string) => p.startsWith("/jobs") },
  { href: "/library", label: { en: "Library", tr: "Kütüphane" }, match: (p: string) => p.startsWith("/library") },
  { href: "/salon", label: { en: "Salon", tr: "Salon" }, match: (p: string) => p.startsWith("/salon") },
];

export function TopBar({ variant = "solid" }: { variant?: "overlay" | "solid" | "review" }) {
  const { s, t, dispatch, set } = useAtelier();
  const path = usePathname();
  const [open, setOpen] = useState<null | "notices" | "account">(null);
  const ref = useRef<HTMLDivElement>(null);
  const unread = s.notices.filter((n) => !n.read).length;
  const low = s.credits < LOW_CREDIT;

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(null);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <header className={`${css.bar} ${css[variant]}`}>
      <div className={css.left}>
        <Link href="/" className={css.mark} aria-label="Liora Atelier">
          <span className={css.word}>LIORA</span>
          <span className={css.sep} />
          <span className={css.sub}>ATELIER</span>
        </Link>
        <nav className={css.nav} aria-label="Primary">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={n.match(path) ? css.active : undefined}>
              {t(n.label)}
            </Link>
          ))}
        </nav>
      </div>

      <div className={css.right} ref={ref}>
        <button
          className={css.bell}
          onClick={() => setOpen(open === "notices" ? null : "notices")}
          aria-label={t({ en: "Notifications", tr: "Bildirimler" })}
          aria-expanded={open === "notices"}
        >
          <Bell />
          {unread > 0 && <span className={css.dot} />}
        </button>

        <button
          className={`${css.credits} ${low ? css.low : ""}`}
          onClick={() => setOpen(open === "account" ? null : "account")}
          aria-expanded={open === "account"}
        >
          <span className="meta-num">{s.credits}</span>
          <span>{t({ en: "Credits", tr: "Kredi" })}</span>
        </button>

        <button
          className={css.avatar}
          onClick={() => setOpen(open === "account" ? null : "account")}
          aria-label={t({ en: "Account", tr: "Hesap" })}
        >
          MD
        </button>

        {open === "notices" && (
          <div className={`${css.panel} fade-in`} role="dialog" aria-label={t({ en: "Notifications", tr: "Bildirimler" })}>
            <div className={css.panelHead}>
              <span className="meta">{t({ en: "Notifications", tr: "Bildirimler" })}</span>
              {unread > 0 && (
                <button className="meta-sm" onClick={() => dispatch({ type: "readAll" })}>
                  {t({ en: "Mark all read", tr: "Tümünü okundu say" })}
                </button>
              )}
            </div>
            {s.notices.length === 0 ? (
              <div className={css.empty}>
                <p className={css.emptyTitle}>{t({ en: "Nothing new yet.", tr: "Henüz yeni bir şey yok." })}</p>
                <p className={css.emptySub}>
                  {t({
                    en: "Finished productions, Salon approvals and frames about to expire will appear here.",
                    tr: "Biten üretimler, Salon onayları ve silinmek üzere olan kareler burada görünür.",
                  })}
                </p>
              </div>
            ) : (
              <ul className={css.list}>
                {s.notices.map((n) => (
                  <li key={n.id} className={n.read ? undefined : css.unread}>
                    <Link href={n.href} onClick={() => setOpen(null)}>
                      <span className={css.nTitle}>{t(n.title)}</span>
                      <span className={css.nSub}>
                        {t(n.sub)} · {timeAgo(n.at, s.lang)}
                      </span>
                      <Arrow className={css.nArrow} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {open === "account" && (
          <div className={`${css.panel} ${css.account} fade-in`} role="dialog">
            <div className={css.who}>
              <span className={css.whoName}>Melis Doğan</span>
              <span className="meta-sm">@melisdogan · {s.brand || t({ en: "no brand yet", tr: "marka yok" })}</span>
            </div>
            <div className={css.row}>
              <span className="meta-sm">{t({ en: "Membership", tr: "Üyelik" })}</span>
              <span className={css.badge}>
                {t(ROLE_META[s.role].label)} · {ROLE_META[s.role].package}
              </span>
            </div>
            <div className={css.row}>
              <span className="meta-sm">{t({ en: "Balance", tr: "Bakiye" })}</span>
              <span className={`meta-num ${low ? css.lowText : ""}`}>
                {s.credits} {t({ en: "credits", tr: "kredi" })}
              </span>
            </div>
            {low && (
              <p className={css.lowNote}>
                {s.role === "explorer"
                  ? t({
                      en: "Extra credits open with a paid membership.",
                      tr: "Ek kredi ücretli üyelikle açılır.",
                    })
                  : t({ en: "Running low. Top up before your next production.", tr: "Bakiye azaldı. Bir sonraki üretimden önce ekle." })}
              </p>
            )}
            <div className={css.row}>
              <span className="meta-sm">{t({ en: "Language", tr: "Dil" })}</span>
              <span className={css.lang}>
                <button className={s.lang === "en" ? css.on : undefined} onClick={() => set({ lang: "en" })}>
                  EN
                </button>
                <button className={s.lang === "tr" ? css.on : undefined} onClick={() => set({ lang: "tr" })}>
                  TR
                </button>
              </span>
            </div>
            <p className={css.phase}>
              {t({ en: "Profile, memberships and credits arrive in phase 3.", tr: "Profil, üyelik ve kredi ekranları faz 3'te." })}
            </p>
          </div>
        )}
      </div>
    </header>
  );
}
