"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { castById, flowBySlug, type L } from "@/lib/data";
import { useAtelier } from "@/lib/store";
import { Masthead } from "../chrome/Masthead";
import { Chevron, Close } from "../icons";
import { Viewer } from "./Viewer";
import { BRANDS, ISSUE, POSTS, ROLE_LABEL, SPREAD, brandById, pad, postById, thumb, img, type Post } from "./salon-data";
import css from "./Salon.module.css";

/* The Salon reads like an issue, not a feed.
   spread   → the week's selection: one page, then four
   register → every published frame, indexed, brand first
   viewer   → a frame opens beside the brand's other frames, with the one
              move that matters here: make something with that cast.
   Filters and the open frame live in the URL, so any state can be shared. */

type Query = { brand?: string; cast?: string; flow?: string; post?: string };
const KEYS = ["brand", "cast", "flow", "post"] as const;

function readQuery(): Query {
  if (typeof window === "undefined") return {};
  const p = new URLSearchParams(window.location.search);
  const q: Query = {};
  KEYS.forEach((k) => {
    const v = p.get(k);
    if (v) q[k] = v;
  });
  return q;
}

const toUrl = (q: Query) => {
  const p = new URLSearchParams();
  KEYS.forEach((k) => q[k] && p.set(k, q[k]!));
  const s = p.toString();
  return s ? `/salon?${s}` : "/salon";
};

const CAST_IDS = [...new Set(POSTS.map((p) => p.cast).filter(Boolean))] as string[];
const FLOW_IDS = [...new Set(POSTS.map((p) => p.flow))];

export function Salon() {
  const { s, t, ready } = useAtelier();
  const [q, setQ] = useState<Query>(readQuery);
  const opened = useRef(false); // the viewer was opened from this page, so Back closes it
  const trigger = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const sync = () => {
      opened.current = false;
      setQ(readQuery());
    };
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  /* focus goes back to the frame that opened the viewer */
  useEffect(() => {
    if (!q.post && trigger.current) {
      trigger.current.focus({ preventScroll: true });
      trigger.current = null;
    }
  }, [q.post]);

  const open = (id: string, el: HTMLElement) => {
    trigger.current = el;
    opened.current = true;
    const next = { ...q, post: id };
    window.history.pushState(null, "", toUrl(next));
    setQ(next);
  };

  const close = useCallback(() => {
    if (opened.current) {
      window.history.back();
      return;
    }
    const next = { ...q, post: undefined };
    window.history.replaceState(null, "", toUrl(next));
    setQ(next);
  }, [q]);

  const pick = useCallback(
    (id: string) => {
      const next = { ...q, post: id };
      window.history.replaceState(null, "", toUrl(next));
      setQ(next);
    },
    [q],
  );

  const filter = (k: "brand" | "cast" | "flow", v?: string) => {
    const next = { ...q, [k]: v, post: undefined };
    window.history.replaceState(null, "", toUrl(next));
    setQ(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!ready) return <main className={`${css.salon} ink`} />;

  const filtered = !!(q.brand || q.cast || q.flow);
  const list = POSTS.filter(
    (p) => (!q.brand || p.brand === q.brand) && (!q.cast || p.cast === q.cast) && (!q.flow || p.flow === q.flow),
  );
  const brand = brandById(q.brand);
  const post = postById(q.post);
  const no = (p: Post) => pad(POSTS.indexOf(p) + 1, 3);
  const castName = (id: string) => (id === "private" ? t({ en: "Private cast", tr: "Özel cast" }) : (castById(id)?.name ?? id));
  const issue = t({ en: `Issue ${ISSUE.no}`, tr: `Sayı ${ISSUE.no}` });
  const selected = t({ en: "Selected this week", tr: "Bu hafta seçilenler" });
  const [hero, ...four] = SPREAD.map((id) => postById(id)!);

  return (
    <main className={`${css.salon} ink`}>
      <Masthead section={{ en: "Salon", tr: "Salon" }} />
      <h1 className="sr-only">Salon</h1>

      {/* ── the week's selection, as a spread ── */}
      {!filtered && (
        <section className={css.spread} aria-label={selected}>
          <div className={css.page}>
            <p className={css.runhead}>
              <span>Salon</span>
              <span>{issue}</span>
            </p>
            <button className={css.hero} onClick={(e) => open(hero.id, e.currentTarget)}>
              <img src={img(hero.id)} alt={`${brandById(hero.brand)!.name} — ${castName(hero.cast ?? "")}`} />
              <span className={css.heroCap}>
                {brandById(hero.brand)!.name} — 01
              </span>
            </button>
            <p className={css.folio}>
              <span>01 — {pad(SPREAD.length)}</span>
              <a href="#register" className={css.toRegister}>
                {t({ en: "The register", tr: "Arşiv" })} · {POSTS.length} <Chevron size={11} dir="down" />
              </a>
            </p>
          </div>
          <div className={css.page}>
            <p className={`${css.runhead} ${css.end}`}>
              <span>{selected}</span>
              <span>{t({ en: `Week ${ISSUE.week} · ${ISSUE.year}`, tr: `Hafta ${ISSUE.week} · ${ISSUE.year}` })}</span>
            </p>
            <div className={css.four}>
              {four.map((p, i) => (
                <button key={p.id} className={css.cell} onClick={(e) => open(p.id, e.currentTarget)} style={{ "--i": i } as CSSProperties}>
                  <span className={css.cellImg}>
                    <img src={thumb(p.id)} alt={`${brandById(p.brand)!.name} — ${p.cast ? castName(p.cast) : t(flowBySlug(p.flow)!.name)}`} />
                  </span>
                  <span className={css.cellCap}>
                    {brandById(p.brand)!.name} — {pad(i + 2)}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <span className={css.spine} aria-hidden>
            Salon — {issue} — {selected}
          </span>
        </section>
      )}

      {/* ── every published frame, indexed ── */}
      <section id="register" className={`${css.register} ${filtered ? css.registerTop : ""}`}>
        <header className={css.regHead}>
          {brand ? (
            <div className={css.brandHead}>
              <h2>{brand.name}</h2>
              <p>
                {brand.by} · {t(ROLE_LABEL[brand.role])} · <span className={css.ext}>{brand.site} ↗</span>
              </p>
            </div>
          ) : (
            <h2 className={css.regTitle}>
              {filtered ? (q.cast ? castName(q.cast) : t(flowBySlug(q.flow!)!.name)) : t({ en: "The register", tr: "Arşiv" })}
              <span className={css.count}>{pad(list.length)}</span>
            </h2>
          )}
          <div className={css.picks}>
            <Pick
              label={{ en: "Brand", tr: "Marka" }}
              value={q.brand}
              options={BRANDS.map((b) => ({ id: b.id, label: b.name }))}
              onChange={(v) => filter("brand", v)}
            />
            <Pick
              label={{ en: "Cast", tr: "Cast" }}
              value={q.cast}
              options={CAST_IDS.map((id) => ({ id, label: castName(id) }))}
              onChange={(v) => filter("cast", v)}
            />
            <Pick
              label={{ en: "Flow", tr: "Akış" }}
              value={q.flow}
              options={FLOW_IDS.map((id) => ({ id, label: t(flowBySlug(id)!.name) }))}
              onChange={(v) => filter("flow", v)}
            />
            {filtered && (
              <button
                className={css.clear}
                onClick={() => {
                  const next = { post: undefined };
                  window.history.replaceState(null, "", toUrl(next));
                  setQ(next);
                }}
                aria-label={t({ en: "Clear filters", tr: "Filtreleri temizle" })}
              >
                <Close size={11} />
              </button>
            )}
          </div>
        </header>

        <ol className={css.grid}>
          {list.map((p, i) => {
            const b = brandById(p.brand)!;
            return (
              <li key={p.id} style={{ "--i": Math.min(i, 12) } as CSSProperties}>
                <button className={css.frame} onClick={(e) => open(p.id, e.currentTarget)}>
                  <span className={css.shot}>
                    <img
                      src={thumb(p.id)}
                      alt={`${b.name} — ${p.cast ? castName(p.cast) : t(flowBySlug(p.flow)!.name)}`}
                      loading={i < 8 ? "eager" : "lazy"}
                      decoding="async"
                      width={480}
                      height={640}
                    />
                  </span>
                  <span className={css.cap}>
                    {/* on a brand's own page the brand is the heading; the caption names the cast */}
                    <span className={css.capBrand}>{q.brand ? (p.cast ? castName(p.cast) : t(flowBySlug(p.flow)!.name)) : b.name}</span>
                    <span className={css.capNo}>{no(p)}</span>
                  </span>
                  <span className={css.capBy}>
                    {b.by} · {t(ROLE_LABEL[b.role])}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        {list.length === 0 && (
          <p className={css.empty}>{t({ en: "Nothing in the register matches yet.", tr: "Arşivde henüz buna uyan bir kare yok." })}</p>
        )}
      </section>

      {/* ── the colophon, as on the register's last page ── */}
      <footer className={css.colophon}>
        <div>
          <p className={css.colLabel}>{t({ en: "Index", tr: "İndeks" })}</p>
          <ul className={css.index}>
            {BRANDS.map((b) => (
              <li key={b.id}>
                <button className={q.brand === b.id ? css.on : undefined} onClick={() => filter("brand", q.brand === b.id ? undefined : b.id)}>
                  <span>{b.name}</span>
                  <span className={css.capNo}>{pad(POSTS.filter((p) => p.brand === b.id).length)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div>
          {s.role === "explorer" && (
            <>
              <p className={css.colLabel}>{t({ en: "Sharing", tr: "Paylaşım" })}</p>
              <p className={css.colNote}>
                {t({
                  en: "The Salon is open to everyone. Sharing your own work opens with Creator.",
                  tr: "Salon herkese açık. Kendi işini paylaşmak Creator paketiyle açılır.",
                })}
              </p>
            </>
          )}
        </div>
        <div className={css.colEnd}>
          <p className={css.colLabel}>{issue}</p>
          <p className={css.capNo}>{ISSUE.date.split("-").reverse().join(".")}</p>
        </div>
      </footer>

      {post && <Viewer post={post} onClose={close} onPick={pick} />}
    </main>
  );
}

/* A typographic select: label, current value, a quiet list. */
function Pick({
  label,
  value,
  options,
  onChange,
}: {
  label: L;
  value?: string;
  options: { id: string; label: string }[];
  onChange: (v?: string) => void;
}) {
  const { t } = useAtelier();
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

  const choose = (v?: string) => {
    setOpen(false);
    onChange(v);
  };
  const current = options.find((o) => o.id === value);

  return (
    <div className={css.pick} ref={box}>
      <button className={`${css.pickBtn} ${current ? css.set : ""}`} onClick={() => setOpen(!open)} aria-haspopup="listbox" aria-expanded={open}>
        <span className={css.pickLabel}>{t(label)}</span>
        <span>{current?.label ?? t({ en: "All", tr: "Tümü" })}</span>
        <Chevron size={11} dir="down" />
      </button>
      {open && (
        <ul className={css.pickList} role="listbox" aria-label={t(label)}>
          <li role="option" aria-selected={!value}>
            <button onClick={() => choose(undefined)}>{t({ en: "All", tr: "Tümü" })}</button>
          </li>
          {options.map((o) => (
            <li key={o.id} role="option" aria-selected={o.id === value}>
              <button onClick={() => choose(o.id)}>{o.label}</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
