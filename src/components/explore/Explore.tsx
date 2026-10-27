"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { useAtelier } from "@/lib/store";
import { Masthead } from "../chrome/Masthead";
import { NodeCanvas } from "../home/NodeCanvas";
import { Close } from "../icons";
import { SETS, setById, type SetId } from "./sets";
import css from "./Explore.module.css";

/* Explore — the dashboard's "Nothing yet", opened (wf-10). No product of
   your own yet? Pick a real one from a few sets; the set opens in place
   onto the same node canvas as the dashboard, wired to the flows it can
   try. The first frame is on us. The set lives in the URL. */

function readSet(): SetId | null {
  if (typeof window === "undefined") return null;
  return setById(new URLSearchParams(window.location.search).get("set"))?.id ?? null;
}

export function Explore() {
  const { t, ready } = useAtelier();
  const [id, setId] = useState<SetId | null>(readSet);
  const [peek, setPeek] = useState<SetId | null>(null);

  useEffect(() => {
    const sync = () => setId(readSet());
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  const go = useCallback((next: SetId | null) => {
    window.history.pushState(null, "", next ? `/explore?set=${next}` : "/explore");
    setPeek(null);
    setId(next);
  }, []);

  if (!ready) return <main className={`${css.page} ink`} />;

  const chosen = setById(id);
  const state = chosen ? "chosen" : peek ? "peek" : "idle";

  return (
    <main className={`${css.page} ink`} data-state={state}>
      <div className={css.ground} aria-hidden>
        <img src="/img/bg-silk.jpg" alt="" />
        <div className={css.dots} />
        <div className="grain" />
      </div>

      <Masthead section={{ en: "Explore", tr: "Explore" }} />

      {!chosen && (
        <section className={css.sets}>
          <header className={css.head}>
            <h1>{t({ en: "Try it on one of ours.", tr: "Bizimkilerden biriyle dene." })}</h1>
            <p>
              {t({
                en: "No product photo yet? These are real ones. The first frame is free.",
                tr: "Henüz ürün fotoğrafın yok mu? Bunlar gerçek ürünler. İlk kare ücretsiz.",
              })}
            </p>
          </header>

          <ol className={css.grid}>
            {SETS.map((x, i) => (
              <li key={x.id} className={peek === x.id ? css.on : undefined} style={{ "--i": i } as CSSProperties}>
                <button
                  className={css.set}
                  onClick={() => go(x.id)}
                  onMouseEnter={() => setPeek(x.id)}
                  onMouseLeave={() => setPeek((p) => (p === x.id ? null : p))}
                  onFocus={() => setPeek(x.id)}
                  onBlur={() => setPeek((p) => (p === x.id ? null : p))}
                >
                  <span className={css.shot}>
                    <img src={x.frames[0]} alt="" />
                  </span>
                  {/* what the set holds: its frames, small, like a contact strip */}
                  <span className={css.strip}>
                    {x.frames.map((f, k) => (
                      <img key={f} src={f} alt="" className={k === 0 ? css.lead : undefined} />
                    ))}
                  </span>
                  {/* where it leads comes first (Elif) — the flows this set opens, then what it is */}
                  <span className={css.leads}>{x.doors.filter((d) => d.status === "open").map((d) => t(d.name)).join(" · ")}</span>
                  <span className={css.name}>{t(x.name)}</span>
                  <span className={css.kind}>{t(x.kind)}</span>
                </button>
              </li>
            ))}
          </ol>
        </section>
      )}

      {chosen && (
        <section className={css.chosen}>
          <div className={css.switch} role="tablist" aria-label={t({ en: "Sample sets", tr: "Örnek setler" })}>
            {SETS.map((x) => (
              <button key={x.id} role="tab" aria-selected={x.id === chosen.id} className={x.id === chosen.id ? css.here : undefined} onClick={() => x.id !== chosen.id && go(x.id)}>
                {t(x.name)}
              </button>
            ))}
            <button className={css.close} onClick={() => go(null)} aria-label={t({ en: "Back to the sets", tr: "Setlere dön" })}>
              <Close size={13} />
            </button>
          </div>
          <NodeCanvas key={chosen.id} option={{ example: chosen.frames[0], label: chosen.name, doors: chosen.doors }} />
          <p className={css.after}>
            {t({
              en: "After the free frame, the same flow opens with your own product — the cast and setting you chose stay.",
              tr: "Ücretsiz kareden sonra aynı akış kendi ürününle açılır — seçtiğin cast ve ortam korunur.",
            })}
          </p>
        </section>
      )}
    </main>
  );
}
