"use client";

import Link from "next/link";
import { useState, type CSSProperties, type ReactNode } from "react";
import { CASTS, CAST_SET, OWN_SETTINGS, ROLE_META, SETTINGS, type Cast, type L, type Setting } from "@/lib/data";
import { useAtelier } from "@/lib/store";
import { canUse } from "../concepts/useConcept";
import { Masthead } from "../chrome/Masthead";
import { Arrow, Lock } from "../icons";
import css from "./Library.module.css";

export type LibraryTab = "cast" | "setting";

/* wf-08 — the library is the user's accumulated decisions: who they use and
   where they shoot. Its job is to start the next job, not to archive the last. */
export function Library({ tab: initial }: { tab: LibraryTab }) {
  const { s, t, ready } = useAtelier();
  const [tab, setTab] = useState<LibraryTab>(initial);
  const [uploaded, setUploaded] = useState<Setting[]>([]);
  if (!ready) return <main className={`${css.page} ink`} />;

  const partner = canUse(s.role, "partner");
  const own = s.casts.filter((c) => !c.archived);
  const used = (id: string) => s.jobs.filter((j) => j.castId === id && j.status === "done").length;
  /* the catalogue: what you used first, then what is open to you, then what opens later */
  const catalogue = [...CASTS].sort(
    (a, b) => Number(canUse(s.role, b.minRole)) - Number(canUse(s.role, a.minRole)) || used(b.id) - used(a.id),
  );
  const opensIn = (r: Cast["minRole"]): L => ({ en: `Opens with ${ROLE_META[r].package}`, tr: `${ROLE_META[r].package}'da açılır` });

  const select = (v: LibraryTab) => {
    setTab(v);
    window.history.replaceState(null, "", v === "cast" ? "/library" : "/library?tab=setting");
  };

  return (
    <main className={`${css.page} ink`}>
      <Masthead section={{ en: "Library", tr: "Kütüphane" }} />
      <section className={css.wrap}>
        <header className={css.head}>
          <h1>{t({ en: "Library", tr: "Kütüphane" })}</h1>
          <nav className={css.tabs} role="tablist">
            <button role="tab" aria-selected={tab === "cast"} onClick={() => select("cast")}>
              Cast <span>{own.length + CASTS.length}</span>
            </button>
            <button role="tab" aria-selected={tab === "setting"} onClick={() => select("setting")}>
              {t({ en: "Settings", tr: "Ortam" })} <span>{SETTINGS.length + (partner ? OWN_SETTINGS.length + uploaded.length : 0)}</span>
            </button>
          </nav>
        </header>

        {tab === "cast" ? (
          <>
            <Section title={t({ en: "Your cast", tr: "Kadron" })} line={t({ en: "Yours alone · never in the catalogue", tr: "Yalnızca senin · katalogda yayınlanmaz" })}>
              {partner ? (
                <div className={css.grid}>
                  {own.map((c, i) => (
                    <CastCard key={c.id} c={c} i={i} line={c.pending ? t({ en: "In review", tr: "Onay bekliyor" }) : used(c.id) ? t({ en: `Used in ${used(c.id)} jobs`, tr: `${used(c.id)} işte kullanıldı` }) : t(c.note)} pending={c.pending} />
                  ))}
                  <Link href="/studio?from=/library" className={css.new}>
                    <span>+</span>
                    {t({ en: "New cast", tr: "Yeni cast" })}
                    <em>Cast Studio · 30 {t({ en: "credits", tr: "kredi" })}</em>
                  </Link>
                </div>
              ) : (
                <Locked img="/img/cast-selin.jpg" line={t({ en: "Design models only your brand uses.", tr: "Yalnızca markanın kullandığı mankenler tasarla." })} />
              )}
            </Section>

            <Section title={t({ en: "Liora cast", tr: "Liora kadrosu" })} line={t({ en: "What you used comes first", tr: "Kullandıkların önde" })}>
              <div className={css.grid}>
                {catalogue.map((c, i) => {
                  const open = canUse(s.role, c.minRole);
                  return <CastCard key={c.id} c={c} i={i} locked={!open} line={!open ? t(opensIn(c.minRole)) : used(c.id) ? t({ en: `Used in ${used(c.id)} jobs`, tr: `${used(c.id)} işte kullanıldı` }) : t(c.note)} />;
                })}
              </div>
            </Section>
          </>
        ) : (
          <>
            <Section title={t({ en: "Your set", tr: "Kendi setin" })} line={t({ en: "Described or uploaded · yours alone", tr: "Tarif ettiklerin ve yüklediklerin · yalnızca senin" })}>
              {partner ? (
                <div className={`${css.grid} ${css.wide}`}>
                  {[...OWN_SETTINGS, ...uploaded].map((x, i) => (
                    <SettingCard key={x.id} x={x} i={i} line={x.id.startsWith("up-") ? t({ en: "Uploaded", tr: "Yüklendi" }) : t({ en: "From your words", tr: "Metinden" })} />
                  ))}
                  <Link href="/concepts/e" className={`${css.new} ${css.newWide}`}>
                    <span>+</span>
                    {t({ en: "Describe one", tr: "Metinle üret" })}
                    <em>{t({ en: "in the setting step", tr: "ortam adımında" })}</em>
                  </Link>
                  <button
                    className={`${css.new} ${css.newWide}`}
                    onClick={() =>
                      setUploaded((u) => [...u, { id: `up-${u.length + 1}`, name: { en: "Your backdrop", tr: "Senin arka planın" }, img: "/img/bg-atelier.jpg", minRole: "partner", own: true }])
                    }
                  >
                    <span>+</span>
                    {t({ en: "Upload a backdrop", tr: "Görsel yükle" })}
                    <em>JPG · PNG</em>
                  </button>
                </div>
              ) : (
                <Locked img={OWN_SETTINGS[0].img} wide line={t({ en: "Settings from your own words, or your own backdrops.", tr: "Kendi cümlenle ortamlar ya da kendi arka planların." })} />
              )}
            </Section>

            <Section title={t({ en: "Ready settings", tr: "Hazır ortamlar" })} line={t({ en: "Choose one to start a campaign with it", tr: "Birini seç, kampanyaya onunla başla" })}>
              <div className={`${css.grid} ${css.wide}`}>
                {SETTINGS.map((x, i) => {
                  const open = canUse(s.role, x.minRole);
                  return <SettingCard key={x.id} x={x} i={i} locked={!open} line={open ? "" : t(opensIn(x.minRole))} />;
                })}
              </div>
            </Section>
          </>
        )}
      </section>
    </main>
  );
}

function Section({ title, line, children }: { title: string; line: string; children: ReactNode }) {
  return (
    <section className={css.section}>
      <header>
        <h2>{title}</h2>
        <p>{line}</p>
      </header>
      {children}
    </section>
  );
}

/* a person: portrait, and on hover the same person in a shoot */
function CastCard({ c, i, line, locked, pending }: { c: Cast; i: number; line: string; locked?: boolean; pending?: boolean }) {
  const pose = (c.set ?? CAST_SET[c.id])?.[0];
  return (
    <Link href={`/library/cast/${c.id}`} className={css.card} data-locked={locked || undefined} data-pending={pending || undefined} style={{ "--i": i } as CSSProperties}>
      <span className={css.cover}>
        <img src={c.img} alt="" />
        {pose && <img className={css.pose} src={pose} alt="" />}
      </span>
      <span className={css.name}>{c.name}</span>
      <span className={css.meta}>
        {locked && <Lock size={10} />}
        {line}
      </span>
    </Link>
  );
}

/* a place: landscape; choosing it starts a campaign with it set */
function SettingCard({ x, i, line, locked }: { x: Setting; i: number; line: string; locked?: boolean }) {
  const { t } = useAtelier();
  const body = (
    <>
      <span className={css.cover}>
        <img src={x.img} alt="" />
      </span>
      <span className={css.name}>{t(x.name)}</span>
      <span className={css.meta}>
        {locked && <Lock size={10} />}
        {line}
        {!locked && (
          <span className={css.go}>
            {t({ en: "Use", tr: "Kullan" })} <Arrow size={11} />
          </span>
        )}
      </span>
    </>
  );
  return locked ? (
    <Link href="/packages?from=/library%3Ftab%3Dsetting" className={css.card} data-locked style={{ "--i": i } as CSSProperties}>
      {body}
    </Link>
  ) : (
    <Link href={`/concepts/e?setting=${x.id}`} className={css.card} style={{ "--i": i } as CSSProperties}>
      {body}
    </Link>
  );
}

/* closed by package: shown, not hidden — one example, one line, one way to open it */
function Locked({ img, line, wide }: { img: string; line: string; wide?: boolean }) {
  const { t } = useAtelier();
  return (
    <div className={css.locked}>
      <img src={img} alt="" data-wide={wide || undefined} />
      <span>
        <em>
          <Lock size={10} /> Partner
        </em>
        {line}
      </span>
      <Link href="/packages?from=/library">
        {t({ en: "See Partner", tr: "Partner'ı gör" })} <Arrow size={12} />
      </Link>
    </div>
  );
}
