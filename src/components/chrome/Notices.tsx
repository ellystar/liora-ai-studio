"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { timeAgo, useAtelier } from "@/lib/store";
import { Arrow, Bell } from "../icons";
import css from "./Notices.module.css";

/* wf-12 — notifications carry this product: work runs in the background,
   posts wait for approval, frames leave after a week. Every line says what
   happened, when, and takes you there. Unread lines carry a rule on the left;
   the bell carries a dot, never a number. */
export function Notices() {
  const { s, t, dispatch } = useAtelier();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

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

  const list = [...s.notices].sort((a, b) => b.at - a.at);
  const unread = list.filter((n) => !n.read).length;

  return (
    <div className={css.wrap} ref={box}>
      <button className={css.bell} onClick={() => setOpen(!open)} aria-expanded={open} aria-label={t({ en: "Notifications", tr: "Bildirimler" })}>
        <Bell size={16} />
        {unread > 0 && <i />}
      </button>
      {open && (
        <div className={css.panel} role="dialog" aria-label={t({ en: "Notifications", tr: "Bildirimler" })}>
          <header>
            <b>{t({ en: "Notifications", tr: "Bildirimler" })}</b>
            {unread > 0 && <button onClick={() => dispatch({ type: "readAll" })}>{t({ en: "Mark all read", tr: "Tümünü okundu say" })}</button>}
          </header>
          {list.length === 0 ? (
            <p className={css.empty}>
              {t({ en: "Nothing new.", tr: "Yeni bir şey yok." })}
              <span>
                {t({
                  en: "Finished work, approved posts and frames about to leave show up here.",
                  tr: "Üretim bittiğinde, paylaşımın yayınlandığında ve kareler silinmeden önce burada görünür.",
                })}
              </span>
            </p>
          ) : (
            <ul>
              {list.map((n) => (
                <li key={n.id}>
                  <Link
                    href={n.href}
                    data-unread={!n.read || undefined}
                    onClick={() => {
                      dispatch({ type: "read", id: n.id });
                      setOpen(false);
                    }}
                  >
                    <b>{t(n.title)}</b>
                    <span>
                      {t(n.sub)} · {timeAgo(n.at, s.lang)}
                    </span>
                    <Arrow size={12} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link href="/profile?tab=settings" className={css.prefs} onClick={() => setOpen(false)}>
            {t({ en: "Notification settings", tr: "Bildirim tercihleri" })}
          </Link>
        </div>
      )}
    </div>
  );
}
