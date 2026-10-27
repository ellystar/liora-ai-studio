"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ANNOUNCEMENT,
  CASTS,
  FLOWS,
  INPUTS,
  NODE_LABEL,
  OWN_CASTS,
  OWN_SETTINGS,
  POSTS,
  ROLE_META,
  flowBySlug,
  type FlowDef,
  type InputType,
} from "@/lib/data";
import { fmtDate, useAtelier } from "@/lib/store";
import { TopBar } from "../TopBar";
import { Seam } from "../Seam";
import { Arrow, Close, Lock } from "../icons";
import css from "./Dashboard.module.css";

type Pick = InputType | "all";

export function Dashboard() {
  const { s, t, set, ready } = useAtelier();
  const router = useRouter();
  const [soonNote, setSoonNote] = useState<string | null>(null);

  if (!ready) return <main className={css.dash} />;

  const first = !s.onboarded;
  const pick: Pick | null = s.lastInput ?? (s.onboarded ? "all" : null);
  const flows = pick === null ? [] : FLOWS.filter((f) => pick === "all" || f.inputs.includes(pick));

  const running = s.jobs.filter((j) => j.status === "running");
  const expiring = s.jobs.filter((j) => j.status === "done" && (j.expiresInDays ?? 9) <= 2);
  const drafts = s.jobs.filter((j) => j.status === "draft" && !s.hiddenDrafts.includes(j.id)).slice(0, 2);

  const choose = (p: Pick) => set({ lastInput: p === "all" ? null : p, onboarded: true });
  const skip = () => set({ onboarded: true, lastInput: null });

  const openFlow = (f: FlowDef) => {
    if (f.status === "soon") {
      setSoonNote(f.slug);
      return;
    }
    router.push(`/flow/${f.slug}`);
  };

  const ownCasts = s.role === "partner" ? OWN_CASTS.length : 0;
  const usedCasts = s.session === "returning" ? 2 : 0;
  const castCount = ownCasts + usedCasts;
  const settingCount = (s.role === "partner" ? OWN_SETTINGS.length : 0) + (s.session === "returning" ? 2 : 0);

  return (
    <main className={css.dash}>
      <div className={css.bg} aria-hidden>
        <img src="/img/bg-sky.jpg" alt="" />
        <div className={css.scrim} />
        <div className="grain" />
      </div>

      <TopBar variant="overlay" />

      {/* status strip — only when there is something to say (D-F-11) */}
      {!first && (running.length > 0 || expiring.length > 0) && (
        <Link href="/jobs" className={`${css.status} rise`}>
          {running.length > 0 && (
            <span>
              <i className={css.pulse} />
              {t({ en: `${running.length} production running`, tr: `${running.length} üretim sürüyor` })}
            </span>
          )}
          {expiring.length > 0 && (
            <span className={css.warn}>
              {t({
                en: `${expiring.reduce((n, j) => n + j.frames.length, 0)} frames leave in 2 days`,
                tr: `${expiring.reduce((n, j) => n + j.frames.length, 0)} kare 2 gün sonra siliniyor`,
              })}
            </span>
          )}
          <span className={css.statusGo}>
            {t({ en: "Jobs", tr: "İşlerim" })} <Arrow size={12} />
          </span>
        </Link>
      )}

      <section className={css.center}>
        <p className={`${css.eyebrow} rise`} style={{ animationDelay: "40ms" }}>
          {first
            ? t({
                en: `Welcome · ${ROLE_META[s.role].label.en} · ${s.credits} trial credits are yours`,
                tr: `Hoş geldin · ${ROLE_META[s.role].label.tr} · ${s.credits} deneme kredisi tanımlandı`,
              })
            : `Melis Doğan · ${t(ROLE_META[s.role].label)}`}
        </p>

        <h1 className={`${css.headline} ${pick ? css.headlineSmall : ""} rise`} style={{ animationDelay: "120ms" }}>
          {s.lang === "tr" ? (
            <>
              Elinde ne varsa,
              <br />
              oradan {first ? <span className="soul">başla.</span> : "başla."}
            </>
          ) : (
            <>
              Begin with what you
              <br />
              {first ? <span className="soul">already</span> : "already"} have.
            </>
          )}
        </h1>

        {pick === null ? (
          /* ── first session: the question, answered by recognition (D-F-02/03/05/20) ── */
          <>
            <p className={`${css.lede} rise`} style={{ animationDelay: "220ms" }}>
              {t({
                en: "Pick the one that looks like your shot. We'll open the flows that work with it.",
                tr: "Çekimine en çok benzeyeni seç. Onunla çalışan akışları açalım.",
              })}
            </p>
            <div className={css.answers}>
              {INPUTS.map((inp, i) => (
                <button
                  key={inp.id}
                  className={`${css.answer} rise`}
                  style={{ animationDelay: `${300 + i * 90}ms` }}
                  onClick={() => choose(inp.id)}
                >
                  <span className={css.answerFrame}>
                    <img src={inp.img} alt="" />
                    <span className={css.answerCap}>{t(inp.caption)}</span>
                  </span>
                  <span className={css.answerTitle}>{t(inp.label)}</span>
                </button>
              ))}
            </div>
            <div className={`${css.firstLinks} rise`} style={{ animationDelay: "620ms" }}>
              <button className="link" onClick={skip}>
                {t({ en: "Skip — show every flow", tr: "Atla — tüm akışları göster" })}
              </button>
              <span className={css.or}>{t({ en: "or", tr: "ya da" })}</span>
              <Link className="link" href="/flow/campaign?sample=1">
                {t({ en: "Nothing to hand? Try a sample set", tr: "Elinde bir şey yok mu? Örnek setle dene" })}
              </Link>
            </div>
          </>
        ) : (
          /* ── answered or returning: the question becomes the filter (D-F-04/06/07) ── */
          <>
            <div className={`${css.picker} rise`} style={{ animationDelay: "200ms" }} role="tablist">
              <span className={css.pickerQ}>{t({ en: "What do you have —", tr: "Elinde ne var —" })}</span>
              {INPUTS.map((inp) => (
                <button
                  key={inp.id}
                  role="tab"
                  aria-selected={pick === inp.id}
                  className={pick === inp.id ? css.sel : undefined}
                  onClick={() => choose(inp.id)}
                >
                  {t(inp.caption)}
                </button>
              ))}
              <button role="tab" aria-selected={pick === "all"} className={pick === "all" ? css.sel : undefined} onClick={() => choose("all")}>
                {t({ en: "All", tr: "Hepsi" })}
              </button>
            </div>

            <div className={css.flows} key={pick}>
              {flows.map((f, i) => (
                <button
                  key={f.slug}
                  className={`${css.flow} ${f.status === "soon" ? css.soon : ""} seam-host rise`}
                  style={{ animationDelay: `${260 + i * 80}ms` }}
                  onClick={() => openFlow(f)}
                  onMouseLeave={() => setSoonNote(null)}
                >
                  <span className={css.flowFrame}>
                    <Seam before={f.before} after={f.after} alt={t(f.name)} />
                    <span className={css.flowCap}>{t(f.caption)}</span>
                    {soonNote === f.slug && (
                      <span className={`${css.soonNote} fade-in`}>
                        {t({ en: "In testing — we'll let you know", tr: "Test aşamasında — açılınca haber vereceğiz" })}
                      </span>
                    )}
                  </span>
                  <span className={css.flowName}>{t(f.name)}</span>
                  <span className={css.flowState}>
                    {f.status === "open" ? (
                      <>
                        <em>{t({ en: "Open", tr: "Açık" })}</em> · {t(f.credit)}
                      </>
                    ) : (
                      t({ en: "Soon", tr: "Yakında" })
                    )}
                  </span>
                </button>
              ))}
            </div>

            <p className={`${css.closed} rise`} style={{ animationDelay: "560ms" }}>
              <Lock size={10} /> {t({ en: "Footwear and jewellery are not open yet", tr: "Ayakkabı ve mücevher henüz kapalı" })}
            </p>

            {drafts.length > 0 && (
              <div className={`${css.resume} rise`} style={{ animationDelay: "620ms" }}>
                {drafts.map((d) => {
                  const f = flowBySlug(d.flow)!;
                  return (
                    <div key={d.id} className={css.resumeRow}>
                      <Link href={`/flow/${d.flow}?draft=${d.id}`} className="link">
                        {t({ en: "Continue", tr: "Devam et" })} — {t(d.title)} · {t(f.name)} ·{" "}
                        {t({ en: "at", tr: "" })} {t(NODE_LABEL[d.draftStep ?? "product"])}
                        {t({ en: "", tr: " adımında" })} →
                      </Link>
                      <button
                        className={css.hide}
                        aria-label={t({ en: "Remove from dashboard", tr: "Dashboard'dan kaldır" })}
                        title={t({ en: "Remove from dashboard — stays in Jobs", tr: "Dashboard'dan kaldır — İşlerim'de kalır" })}
                        onClick={() => set({ hiddenDrafts: [...s.hiddenDrafts, d.id] })}
                      >
                        <Close size={11} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </section>

      {/* ── bottom band: library · salon · additions (D-F-13/14/19/20b/25) ── */}
      <footer className={`${css.band} rise`} style={{ animationDelay: "700ms" }}>
        <div className={css.col}>
          <span className="meta">{t({ en: "Library", tr: "Kütüphane" })}</span>
          <div className={css.colRow}>
            {castCount + settingCount > 0 ? (
              <Link href="/library" className={css.counts}>
                <span>
                  <b>{String(castCount).padStart(2, "0")}</b> Cast
                </span>
                <span className={css.midDot}>·</span>
                <span>
                  <b>{String(settingCount).padStart(2, "0")}</b> {t({ en: "Settings", tr: "Ortam" })}
                </span>
              </Link>
            ) : (
              <span className={css.colText}>{t({ en: "Fills after your first job", tr: "İlk işinden sonra dolar" })}</span>
            )}
            <span className={css.castRow}>
              {(s.role === "partner"
                ? [...OWN_CASTS.filter((c) => !c.pending), ...CASTS.slice(0, 2)]
                : s.session === "returning"
                  ? [CASTS[0], CASTS[3]]
                  : []
              ).map((c) => (
                <img key={c.id} src={c.img} alt={c.name} title={c.name} />
              ))}
            </span>
            <Link href="/library" className={`${css.studio} ${s.role !== "partner" ? css.studioLocked : ""}`}>
              {s.role !== "partner" && <Lock size={10} />}
              Cast Studio
              <span>{s.role === "partner" ? t({ en: "1 credit a try", tr: "deneme 1 kredi" }) : "Partner"}</span>
            </Link>
          </div>
        </div>

        <div className={`${css.col} ${css.salon}`}>
          <span className="meta">Salon</span>
          <div className={css.colRow}>
            <Link href="/salon" className={css.salonLink}>
              {t({ en: "A weekly edit from other members", tr: "Diğer üyelerden haftalık bir seçki" })}
            </Link>
            <span className={css.salonRow}>
              {POSTS.slice(0, 6).map((p) => (
                <Link key={p.id} href="/salon" title={p.brand}>
                  <img src={p.img} alt={p.brand} />
                </Link>
              ))}
            </span>
          </div>
        </div>

        <div className={`${css.col} ${css.additions}`}>
          <span className="meta">{t({ en: "Additions", tr: "Eklenenler" })}</span>
          <p className={css.addition}>
            <span className="meta-num">{fmtDate(ANNOUNCEMENT.date, s.lang)}</span> — {t(ANNOUNCEMENT.text)}
          </p>
        </div>
      </footer>
    </main>
  );
}
