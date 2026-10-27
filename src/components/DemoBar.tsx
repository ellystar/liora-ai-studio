"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Role } from "@/lib/data";
import { useAtelier, type Session } from "@/lib/store";
import css from "./DemoBar.module.css";

/* Review tool, not product UI. Lets a reviewer flip between the states the
   backend would decide: first vs returning session, membership, balance.
   Parked as a tab on the left edge so it never covers the product. Signed
   in live, the backend answers session and balance, so those switches go;
   the package stays here until it is stored (Aşama 2). */
export function DemoBar() {
  const { s, set, dispatch, ready } = useAtelier();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  if (!ready) return null;

  const session = (v: Session) => {
    dispatch({ type: "reset", session: v });
    router.push("/");
  };

  return (
    <div className={css.wrap} data-open={open}>
      <button className={css.tab} onClick={() => setOpen(!open)} aria-expanded={open}>
        {s.live ? `Live · ${s.live.email}` : `Mockup · ${s.session === "first" ? "first" : "returning"}`} · {s.role} · {s.lang}
      </button>

      {open && (
        <div className={`${css.panel} fade-in`}>
          {!s.live && (
            <div className={css.group}>
              <span className={css.key}>Session</span>
              <button className={s.session === "returning" ? css.on : undefined} onClick={() => session("returning")}>
                returning
              </button>
              <button className={s.session === "first" ? css.on : undefined} onClick={() => session("first")}>
                first session
              </button>
            </div>
          )}
          <div className={css.group}>
            <span className={css.key}>Entry</span>
            <button onClick={() => router.push("/signup")}>sign up</button>
            <button onClick={() => router.push("/signin")}>sign in</button>
            <button onClick={() => router.push("/welcome?step=question")}>first question</button>
            <button onClick={() => router.push("/admin")}>admin</button>
          </div>
          <div className={css.group}>
            <span className={css.key}>Language</span>
            {(["en", "tr"] as const).map((l) => (
              <button key={l} className={s.lang === l ? css.on : undefined} onClick={() => set({ lang: l })}>
                {l}
              </button>
            ))}
          </div>
          <div className={css.group}>
            <span className={css.key}>Role</span>
            {(["explorer", "creator", "partner"] as Role[]).map((r) => (
              <button key={r} className={s.role === r ? css.on : undefined} onClick={() => set({ role: r })}>
                {r}
              </button>
            ))}
          </div>
          {!s.live && (
            <div className={css.group}>
              <span className={css.key}>Credits</span>
              {[0, 3, 5, 142, 1240].map((c) => (
                <button key={c} className={s.credits === c ? css.on : undefined} onClick={() => set({ credits: c })}>
                  {c}
                </button>
              ))}
            </div>
          )}
          <div className={css.group}>
            <span className={css.key}>Next run</span>
            <button className={!s.failOne ? css.on : undefined} onClick={() => set({ failOne: false })}>
              all frames
            </button>
            <button className={s.failOne ? css.on : undefined} onClick={() => set({ failOne: true })}>
              one fails
            </button>
          </div>
          <div className={css.group}>
            <span className={css.key}>Intros</span>
            <button onClick={() => set({ seenIntro: [] })}>replay flow intros</button>
          </div>
        </div>
      )}
    </div>
  );
}
