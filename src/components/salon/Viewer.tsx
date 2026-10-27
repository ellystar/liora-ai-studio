"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ROLE_META, ROLE_RANK, castById, flowBySlug, type FlowSlug } from "@/lib/data";
import { useAtelier } from "@/lib/store";
import { Arrow, ArrowLeft, Lock } from "../icons";
import { ROLE_LABEL, brandById, framesOf, img, letter, pad, thumb, type Post } from "./salon-data";
import css from "./Viewer.module.css";

/* One frame, opened like a spread: on the left page the brand's other
   frames run as a strip beside the colophon; on the right, the frame
   itself, with the brand set across it. Hovering the plate clears the
   type so the image can be judged on its own. */

const FLOW_HREF: Partial<Record<FlowSlug, string>> = {
  campaign: "/concepts/e",
  recast: "/concepts/e/recast",
  ghost: "/concepts/e/ghost",
  restyle: "/concepts/e/restyle",
  turn: "/concepts/e/turn",
};

const day = (iso: string) => iso.split("-").reverse().join(".");

export function Viewer({ post, onClose, onPick }: { post: Post; onClose: () => void; onPick: (id: string) => void }) {
  const { s, t } = useAtelier();
  const box = useRef<HTMLDivElement>(null);
  const back = useRef<HTMLButtonElement>(null);
  const [flagged, setFlagged] = useState<string[]>([]);
  const [shown, setShown] = useState<string | null>(null); // the plate that has finished loading
  const [cur, setCur] = useState(post.id);
  const [under, setUnder] = useState<string | null>(null); // the plate it develops over
  if (cur !== post.id) {
    setUnder(cur);
    setCur(post.id);
  }

  const brand = brandById(post.brand)!;
  const frames = useMemo(() => framesOf(post.brand), [post.brand]);
  const at = frames.findIndex((f) => f.id === post.id);
  const flow = flowBySlug(post.flow)!;
  const flowHref = FLOW_HREF[post.flow];
  const cast = post.cast && post.cast !== "private" ? castById(post.cast) : undefined;
  const locked = !!cast && ROLE_RANK[s.role] < ROLE_RANK[cast.minRole];
  const isFlagged = flagged.includes(post.id);

  /* the page behind stays put; focus starts on the way back */
  useEffect(() => {
    back.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  /* the brand's plates load as the viewer opens, so the strip answers at once */
  useEffect(() => {
    frames.forEach((f) => {
      const i = new Image();
      i.src = img(f.id);
    });
  }, [frames]);

  /* Esc closes, arrows walk the strip, Tab stays inside */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        if (at < frames.length - 1) onPick(frames[at + 1].id);
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        if (at > 0) onPick(frames[at - 1].id);
      } else if (e.key === "Tab" && box.current) {
        const f = box.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])");
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [at, frames, onClose, onPick]);

  const castLine = cast ? cast.name : post.cast === "private" ? t({ en: "Private cast", tr: "Özel cast" }) : null;

  return (
    <div className={css.viewer} ref={box} role="dialog" aria-modal="true" aria-label={`${brand.name} — (${letter(at)})`}>
      {/* ── the left page: colophon and strip ── */}
      <section className={css.leaf}>
        <button ref={back} className={css.back} onClick={onClose}>
          <ArrowLeft size={13} /> Salon
        </button>

        <div className={css.colophon}>
          <h2 className={css.brand}>{brand.name}</h2>
          <p className={css.by}>
            {brand.by}
            <span className={css.badge}>{t(ROLE_LABEL[brand.role])}</span>
          </p>
          {brand.by === "@liora" && (
            <p className={css.shared}>
              {t({ en: `Shared by Liora for ${brand.name}`, tr: `${brand.name} için Liora tarafından paylaşıldı` })}
            </p>
          )}

          <dl className={css.facts}>
            <div>
              <dt>Cast</dt>
              <dd>
                {cast && <img className={css.castImg} src={cast.img} alt="" />}
                {castLine ?? "—"}
                {post.cast === "private" && <span className={css.quiet}>{t({ en: "not shared", tr: "paylaşılmaz" })}</span>}
              </dd>
            </div>
            <div>
              <dt>{t({ en: "Flow", tr: "Akış" })}</dt>
              <dd>{t(flow.name)}</dd>
            </div>
            <div>
              <dt>{t({ en: "Made", tr: "Tarih" })}</dt>
              <dd className={css.num}>{day(post.date)}</dd>
            </div>
            <div>
              <dt>{t({ en: "Site", tr: "Site" })}</dt>
              <dd className={css.ext}>{brand.site} ↗</dd>
            </div>
            {post.live && (
              <div>
                <dt>{t({ en: "Live at", tr: "Yayında" })}</dt>
                <dd className={css.ext}>{post.live} ↗</dd>
              </div>
            )}
          </dl>

          {/* the bridge from looking to making */}
          <div className={css.acts}>
            {cast && !locked && (
              <Link href={`/concepts/e?cast=${cast.id}`} className={css.make}>
                {t({ en: "Make with this cast", tr: "Bu cast ile üret" })}
                <Arrow size={14} />
              </Link>
            )}
            {cast && locked && (
              <span className={`${css.make} ${css.makeLocked}`} aria-disabled>
                <Lock size={12} />
                {t({
                  en: `${cast.name} opens with ${t(ROLE_META[cast.minRole].label)}`,
                  tr: `${cast.name}, ${t(ROLE_META[cast.minRole].label)} ile açılır`,
                })}
              </span>
            )}
            {flowHref && (
              <Link href={flowHref} className={cast && !locked ? css.alt : css.make}>
                {t({ en: "Open the same flow", tr: "Aynı akışı aç" })}
                {!(cast && !locked) && <Arrow size={14} />}
              </Link>
            )}
          </div>

          <button className={css.flag} onClick={() => setFlagged((f) => (isFlagged ? f.filter((x) => x !== post.id) : [...f, post.id]))}>
            {isFlagged ? t({ en: "Reported · undo", tr: "Bildirildi · geri al" }) : t({ en: "Report", tr: "Bildir" })}
          </button>
        </div>

        <ol className={css.strip} aria-label={t({ en: `${brand.name} in the Salon`, tr: `Salon'da ${brand.name}` })}>
          {frames.map((f, i) => (
            <li key={f.id} style={{ "--i": i } as CSSProperties}>
              <button className={f.id === post.id ? css.now : undefined} aria-current={f.id === post.id} onClick={() => onPick(f.id)}>
                <img src={thumb(f.id)} alt={`(${letter(i)})`} />
                <span className={css.stripCap}>
                  <span>({letter(i)})</span>
                  <span>{pad(i + 1)}</span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      </section>

      {/* ── the right page: the frame ── */}
      <figure className={css.plate}>
        {under && <img className={css.plateUnder} src={img(under)} alt="" aria-hidden />}
        <img
          key={post.id}
          className={`${css.plateImg} ${shown === post.id ? css.in : ""}`}
          src={img(post.id)}
          alt={`${brand.name}${castLine ? ` — ${castLine}` : ""}`}
          onLoad={() => setShown(post.id)}
        />
        <figcaption className={css.type}>
          <span className={css.line}>
            <em>{brand.name}</em>
            <i />
            <span>({letter(at)})</span>
          </span>
          <span className={css.corner}>
            <span>{castLine ? `${castLine} · ${t(flow.name)}` : t(flow.name)}</span>
            <span>{day(post.date)}</span>
          </span>
        </figcaption>
      </figure>
    </div>
  );
}
