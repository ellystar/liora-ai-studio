"use client";

import Link from "next/link";
import { useState, type CSSProperties } from "react";
import { NODE_LABEL, flowBySlug, type Job, type L } from "@/lib/data";
import { useAtelier } from "@/lib/store";
import { Masthead } from "../chrome/Masthead";
import { Arrow } from "../icons";
import css from "./Jobs.module.css";

type Filter = "all" | "running" | "draft" | "done";

const TABS: { id: Filter; label: L }[] = [
  { id: "all", label: { en: "All", tr: "Hepsi" } },
  { id: "running", label: { en: "Running", tr: "Süren" } },
  { id: "draft", label: { en: "Drafts", tr: "Taslak" } },
  { id: "done", label: { en: "Finished", tr: "Tamamlanan" } },
];

/* where a flow is set up on the canvas */
export const setupHref = (flow: string) => `/concepts/e${flow === "campaign" ? "" : `/${flow}`}`;

/* Jobs (J-F-01…05): covers first, words only for state. Frames about to
   leave always sit on top, whatever the filter. */
export function Jobs() {
  const { s, t, ready } = useAtelier();
  const [filter, setFilter] = useState<Filter>("all");
  if (!ready) return <main className={`${css.page} ink`} />;

  const leaving = (j: Job) => j.status === "done" && (j.expiresInDays ?? 9) <= 2;
  const list = s.jobs
    .filter((j) => filter === "all" || j.status === filter)
    .sort((a, b) => Number(leaving(b)) - Number(leaving(a)) || b.createdAt.localeCompare(a.createdAt));
  const out = s.jobs.filter(leaving);
  const count = (f: Filter) => (f === "all" ? s.jobs.length : s.jobs.filter((j) => j.status === f).length);

  return (
    <main className={`${css.page} ink`}>
      <Masthead section={{ en: "Jobs", tr: "İşlerim" }} />
      <section className={css.wrap}>
        <header className={css.head}>
          <h1>{t({ en: "Jobs", tr: "İşlerim" })}</h1>
          <nav className={css.tabs} role="tablist">
            {TABS.map((tb) => (
              <button key={tb.id} role="tab" aria-selected={filter === tb.id} onClick={() => setFilter(tb.id)}>
                {t(tb.label)} <span>{count(tb.id)}</span>
              </button>
            ))}
          </nav>
        </header>

        {out.length > 0 && (
          <p className={css.leaving}>
            {t({
              en: `${out.reduce((n, j) => n + j.frames.length, 0)} frames leave in 2 days`,
              tr: `${out.reduce((n, j) => n + j.frames.length, 0)} kare 2 gün sonra siliniyor`,
            })}
            <Link href={`/jobs/${out[0].id}`}>
              {t({ en: "Download", tr: "İndir" })} <Arrow size={12} />
            </Link>
          </p>
        )}

        {list.length === 0 ? (
          <div className={css.empty}>
            <p>{s.jobs.length === 0 ? t({ en: "No jobs yet.", tr: "Henüz bir iş yok." }) : t({ en: "Nothing here.", tr: "Burada bir şey yok." })}</p>
            {s.jobs.length === 0 && (
              <Link href="/">
                {t({ en: "Start one", tr: "Bir iş başlat" })} <Arrow size={12} />
              </Link>
            )}
          </div>
        ) : (
          <ul className={css.grid}>
            {list.map((j, i) => {
              const flow = flowBySlug(j.flow);
              const href = j.status === "draft" ? `${setupHref(j.flow)}?draft=${j.setupId ?? j.id}` : `/jobs/${j.id}`;
              const planned = j.planned?.length ?? 3;
              const ok = j.frames.filter((f) => !f.failed).length;
              return (
                <li key={j.id} style={{ "--i": i } as CSSProperties}>
                  <Link href={href} className={css.card} data-status={j.status} data-leaving={leaving(j) || undefined}>
                    <span className={css.cover}>
                      <img src={j.cover} alt="" />
                      {s.role === "explorer" && j.status === "done" && <span className={css.wm} aria-hidden />}
                      {j.status === "running" && (
                        <span className={css.progress}>
                          <i style={{ width: `${Math.max(8, ((j.progress ?? 0) / planned) * 100)}%` }} />
                        </span>
                      )}
                    </span>
                    <span className={css.title}>{t(j.title)}</span>
                    <span className={css.meta}>
                      {flow && <span>{t(flow.name)}</span>}
                      <span className={css.state}>
                        {j.status === "running"
                          ? t({ en: "Making", tr: "Üretiliyor" })
                          : j.status === "draft"
                            ? `${t({ en: "Draft", tr: "Taslak" })} · ${t(NODE_LABEL[j.draftStep ?? "product"])}`
                            : `${j.video ? t({ en: "1 video", tr: "1 video" }) : t({ en: `${ok} frames`, tr: `${ok} kare` })} · ${t({ en: `${j.expiresInDays ?? 7} d`, tr: `${j.expiresInDays ?? 7} gün` })}`}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
