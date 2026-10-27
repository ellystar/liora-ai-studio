"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type CSSProperties } from "react";
import { CAST_SET, ROLE_META } from "@/lib/data";
import { findCast, fmtDate, useAtelier } from "@/lib/store";
import { canUse } from "../concepts/useConcept";
import { Masthead } from "../chrome/Masthead";
import { Arrow, ArrowLeft } from "../icons";
import css from "./Library.module.css";

/* wf-08 · 02 — who this is, and what was made with them. "Make with this
   cast" is the page's real action: the library is a door into making. */
export function CastDetail({ id }: { id: string }) {
  const { s, t, set, ready } = useAtelier();
  const router = useRouter();
  const [renaming, setRenaming] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  if (!ready) return <main className={`${css.page} ink`} />;

  const c = findCast(s, id);
  if (!c || c.archived) {
    return (
      <main className={`${css.page} ink`}>
        <Masthead section={{ en: "Library", tr: "Kütüphane" }} />
        <section className={css.wrap}>
          <h1 className={css.title}>{t({ en: "This cast is no longer here.", tr: "Bu cast artık burada değil." })}</h1>
          <Link href="/library" className={css.textLink}>
            {t({ en: "Library", tr: "Kütüphane" })} <Arrow size={12} />
          </Link>
        </section>
      </main>
    );
  }

  const partner = canUse(s.role, "partner");
  const open = c.own ? partner : canUse(s.role, c.minRole);
  const usable = open && !c.pending;
  const frames = [c.img, ...(c.set ?? CAST_SET[c.id] ?? [])];
  const jobs = s.jobs.filter((j) => j.castId === c.id && j.status === "done");
  const patch = (p: Partial<typeof c>) => set({ casts: s.casts.map((x) => (x.id === c.id ? { ...x, ...p } : x)) });

  return (
    <main className={`${css.page} ink`}>
      <Masthead section={{ en: "Library", tr: "Kütüphane" }} />
      <section className={css.wrap}>
        <header className={css.detailHead}>
          <div>
            <Link href="/library" className={css.back}>
              <ArrowLeft size={12} /> {t({ en: "Library", tr: "Kütüphane" })}
            </Link>
            {renaming !== null ? (
              <form
                className={css.rename}
                onSubmit={(e) => {
                  e.preventDefault();
                  if (renaming.trim()) patch({ name: renaming.trim() });
                  setRenaming(null);
                }}
              >
                <input value={renaming} onChange={(e) => setRenaming(e.target.value)} autoFocus aria-label={t({ en: "Name", tr: "Ad" })} />
                <button className={css.textLink}>{t({ en: "Save", tr: "Kaydet" })}</button>
              </form>
            ) : (
              <h1 className={css.title}>{c.name}</h1>
            )}
            <p className={css.line}>
              {c.own
                ? c.from === "reference"
                  ? t({ en: "Private cast · from a reference", tr: "Özel cast · referanstan" })
                  : t({ en: "Private cast · from text", tr: "Özel cast · metinden" })
                : `${t({ en: "Liora cast", tr: "Liora kadrosu" })} · ${t(c.note)}`}
              {" · "}
              {jobs.length ? t({ en: `used in ${jobs.length} jobs`, tr: `${jobs.length} işte kullanıldı` }) : t({ en: "not used yet", tr: "henüz kullanılmadı" })}
            </p>
            {c.pending && <p className={css.status}>{t({ en: "In review · you'll be told when it opens", tr: "Onay bekliyor · açılınca haber vereceğiz" })}</p>}
            {!open && (
              <p className={css.status}>
                {t({ en: `Opens with ${ROLE_META[c.own ? "partner" : c.minRole].package}`, tr: `${ROLE_META[c.own ? "partner" : c.minRole].package}'da açılır` })}
              </p>
            )}
          </div>
          <div className={css.actions}>
            {c.own && partner && renaming === null && !removing && (
              <>
                <button className={css.quiet} onClick={() => setRenaming(c.name)}>
                  {t({ en: "Rename", tr: "Yeniden adlandır" })}
                </button>
                <button className={css.quiet} onClick={() => setRemoving(true)}>
                  {t({ en: "Remove", tr: "Kaldır" })}
                </button>
              </>
            )}
            {removing && (
              <span className={css.confirm}>
                {t({ en: "Past jobs stay as they are.", tr: "Geçmiş işler etkilenmez." })}
                <button
                  className={css.quiet}
                  onClick={() => {
                    patch({ archived: true });
                    router.push("/library");
                  }}
                >
                  {t({ en: "Remove", tr: "Kaldır" })}
                </button>
                <button className={css.quiet} onClick={() => setRemoving(false)}>
                  {t({ en: "Cancel", tr: "Vazgeç" })}
                </button>
              </span>
            )}
            {usable ? (
              <Link href={`/concepts/e?cast=${c.id}`} className={css.primary}>
                {t({ en: "Make with this cast", tr: "Bu cast ile üret" })} <Arrow size={13} />
              </Link>
            ) : !open ? (
              <Link href={`/packages?from=${encodeURIComponent(`/library/cast/${c.id}`)}`} className={css.primary}>
                {t({ en: "See packages", tr: "Paketlere bak" })} <Arrow size={13} />
              </Link>
            ) : null}
          </div>
        </header>

        {/* the identity set: the same person, other angles and moods */}
        <div className={css.set} style={{ "--n": Math.min(4, frames.length) } as CSSProperties}>
          {frames.slice(0, 4).map((src, i) => (
            <span key={src} className={css.setFrame} style={{ animationDelay: `${i * 90}ms` }}>
              <img src={src} alt="" />
            </span>
          ))}
        </div>

        {jobs.length > 0 && (
          <section className={css.section}>
            <header>
              <h2>{t({ en: "Made with this cast", tr: "Bu cast ile üretilenler" })}</h2>
            </header>
            <div className={css.grid}>
              {jobs.map((j) => (
                <Link key={j.id} href={`/jobs/${j.id}`} className={css.card}>
                  <span className={css.cover}>
                    <img src={j.cover} alt="" />
                  </span>
                  <span className={css.name}>{t(j.title)}</span>
                  <span className={css.meta}>{fmtDate(j.createdAt, s.lang)}</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </section>
    </main>
  );
}
