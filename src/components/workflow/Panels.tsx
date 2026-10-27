"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ANGLES,
  CASTS,
  FLOWS,
  OWN_CASTS,
  OWN_SETTINGS,
  RATIOS,
  ROLE_META,
  ROLE_RANK,
  SAMPLE_FLAT,
  SAMPLE_PRO,
  SAMPLE_SHOOT,
  SETTINGS,
  SLOTS,
  type Cast,
  type FlowDef,
  type Frame,
  type Role,
  type Setting,
  type Slot,
  type Upload,
} from "@/lib/data";
import { useAtelier } from "@/lib/store";
import { Arrow, Check, Chevron, Lock, Plus } from "../icons";
import { cost, frameCount, type FlowState } from "../flow/model";
import css from "./Band.module.css";

/* The band: the foot of the screen is where you answer — as on the
   dashboard. Left: where you are and the question. Middle: the choices,
   in a row. Right: the one action. */

export type Up = (patch: Partial<FlowState>) => void;
export type Peek = (p: { kind: "cast" | "setting"; id: string } | null) => void;

const canUse = (role: Role, min: Role) => ROLE_RANK[role] >= ROLE_RANK[min];

export function Band({
  idx,
  title,
  hint,
  actions,
  children,
  tone,
}: {
  idx?: string;
  title: ReactNode;
  hint?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  tone?: "quiet";
}) {
  return (
    <section className={`${css.band} ${tone === "quiet" ? css.quiet : ""}`} aria-live="polite">
      <header className={css.head}>
        {idx && <span className={css.idx}>{idx}</span>}
        <h2 className={css.title}>{title}</h2>
        {hint && <p className={css.hint}>{hint}</p>}
      </header>
      <div className={css.body}>{children}</div>
      <div className={css.acts}>{actions}</div>
    </section>
  );
}

function Primary({ children, ...p }: { children: ReactNode; onClick?: () => void; disabled?: boolean; href?: string }) {
  if (p.href)
    return (
      <Link href={p.href} className={css.primary}>
        {children} <Arrow size={14} />
      </Link>
    );
  return (
    <button className={css.primary} onClick={p.onClick} disabled={p.disabled}>
      {children} <Arrow size={14} />
    </button>
  );
}

function Quiet({ children, onClick, href }: { children: ReactNode; onClick?: () => void; href?: string }) {
  if (href)
    return (
      <Link href={href} className={css.quietBtn}>
        {children}
      </Link>
    );
  return (
    <button className={css.quietBtn} onClick={onClick}>
      {children}
    </button>
  );
}

/* ───────────── intro: what this flow does (W-F-01/03) ───────────── */

export function IntroPanel({ flow, onBegin }: { flow: FlowDef; onBegin: () => void }) {
  const { t } = useAtelier();
  const alt = flow.inputs.includes("onModel") ? FLOWS.find((f) => f.slug === "campaign") : FLOWS.find((f) => f.slug === "recast");
  const bring = flow.slug === "recast" ? [SAMPLE_SHOOT[0].src] : flow.slug === "ghost" ? [SAMPLE_FLAT[0].src] : SAMPLE_PRO.slice(0, 3).map((u) => u.src);
  return (
    <Band
      title={t(flow.name)}
      hint={t(flow.line)}
      actions={
        <>
          <Primary onClick={onBegin}>{t({ en: "Begin", tr: "Başla" })}</Primary>
          <span className={css.note}>{t(flow.credit)}</span>
        </>
      }
    >
      <div className={css.pair}>
        <figure>
          <div className={css.thumbs}>
            {bring.map((src) => (
              <img key={src} src={src} alt="" />
            ))}
          </div>
          <figcaption>{t({ en: "What you bring", tr: "Getirdiğin" })}</figcaption>
        </figure>
        <Arrow size={16} className={css.pairArrow} />
        <figure>
          <div className={css.thumbs}>
            <img src={flow.after} alt="" />
          </div>
          <figcaption>{t({ en: "What you get", tr: "Aldığın" })}</figcaption>
        </figure>
        {alt && (
          <p className={css.alt}>
            {flow.slug === "recast"
              ? t({ en: "Only a product photo?", tr: "Elinde yalnızca ürün fotoğrafı mı var?" })
              : t({ en: "A model already in your shot?", tr: "Çekiminde zaten manken mi var?" })}{" "}
            <Link href={`/flow/${alt.slug}`}>{t(alt.name)} →</Link>
          </p>
        )}
      </div>
    </Band>
  );
}

/* ───────────── upload → analysis → confirm (W-F-19…22) ───────────── */

const MAX_MB = 20;
const OK_TYPES = ["image/jpeg", "image/png", "image/webp"];
const SLOT_ORDER: Slot[] = ["front", "back", "detail", "complement", "accessory"];

export function UploadPanel({
  flow,
  st,
  up,
  idx,
  onConfirm,
}: {
  flow: FlowDef;
  st: FlowState;
  up: Up;
  idx: string;
  onConfirm: (flat: boolean) => void;
}) {
  const { t } = useAtelier();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const shoot = flow.nodes[0] === "shoot";
  const ghostFlow = flow.slug === "ghost";
  const max = shoot ? 6 : 8;

  useEffect(() => {
    if (st.uploadStage !== "analyzing") return;
    const id = setTimeout(() => up({ uploadStage: "review" }), 1600);
    return () => clearTimeout(id);
  }, [st.uploadStage, up]);

  const take = (list: Upload[], flat: boolean, errors: string[] = []) =>
    up({ uploads: list, isFlat: flat, errors, uploadStage: list.length ? "analyzing" : "empty" });

  const onFiles = (files: FileList | null) => {
    if (!files) return;
    const ok: Upload[] = [];
    const errs: string[] = [];
    Array.from(files).forEach((f) => {
      if (!OK_TYPES.includes(f.type))
        errs.push(t({ en: `${f.name} — can't be read. Use JPG, PNG or WEBP.`, tr: `${f.name} — okunamıyor. JPG, PNG ya da WEBP kullan.` }));
      else if (f.size > MAX_MB * 1024 * 1024)
        errs.push(t({ en: `${f.name} — over ${MAX_MB} MB.`, tr: `${f.name} — ${MAX_MB} MB'tan büyük.` }));
      else if (ok.length >= max) errs.push(t({ en: `${f.name} — only the first ${max} are used.`, tr: `${f.name} — yalnızca ilk ${max} görsel kullanılır.` }));
      else ok.push({ id: `${Date.now()}-${ok.length}`, src: URL.createObjectURL(f), name: f.name, slot: SLOT_ORDER[ok.length % 5] });
    });
    take(ok, false, errs);
  };

  const what = shoot
    ? t({ en: "Bring the shoot.", tr: "Çekimi getir." })
    : ghostFlow
      ? t({ en: "Bring the flat shots.", tr: "Flat çekimleri getir." })
      : t({ en: "Bring the product.", tr: "Ürünü getir." });

  if (st.uploadStage === "empty")
    return (
      <Band
        idx={idx}
        title={what}
        hint={
          shoot
            ? t({ en: "Frames with a model in them, up to six.", tr: "Mankenli kareler, en fazla altı." })
            : ghostFlow
              ? t({ en: "Phone photos on a floor or bed are fine.", tr: "Yerde ya da yatakta telefonla çekilmiş olabilir." })
              : t({ en: "Front, back, detail, the rest — all at once. We sort them.", tr: "Ön, arka, detay, diğerleri — hepsi birden. Biz ayırırız." })
        }
      >
        <div
          className={`${css.drop} ${over ? css.over : ""}`}
          onDragOver={(e) => (e.preventDefault(), setOver(true))}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => (e.preventDefault(), setOver(false), onFiles(e.dataTransfer.files))}
          onClick={() => input.current?.click()}
          onKeyDown={(e) => e.key === "Enter" && input.current?.click()}
          role="button"
          tabIndex={0}
        >
          <span className={css.dropTitle}>{t({ en: "Drop your images here", tr: "Görsellerini buraya bırak" })}</span>
          <span className={css.dropSub}>
            {t({ en: "or choose files", tr: "ya da dosya seç" })} · JPG PNG WEBP · {t({ en: `up to ${max}`, tr: `en fazla ${max}` })}
          </span>
          <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => onFiles(e.target.files)} />
        </div>
        <p className={css.samples}>
          <span>{t({ en: "Nothing to hand?", tr: "Elinde yok mu?" })}</span>
          {shoot ? (
            <button onClick={() => take(SAMPLE_SHOOT, false)}>{t({ en: "Studio shoot · 1 frame", tr: "Stüdyo çekimi · 1 kare" })}</button>
          ) : ghostFlow ? (
            <button onClick={() => take(SAMPLE_FLAT, true)}>{t({ en: "Cardigan on a bed · 1 image", tr: "Yataktaki hırka · 1 görsel" })}</button>
          ) : (
            <>
              <button onClick={() => take(SAMPLE_PRO, false)}>{t({ en: "Ghost set · 5 images", tr: "Ghost seti · 5 görsel" })}</button>
              <button onClick={() => take(SAMPLE_FLAT, true)}>{t({ en: "Amateur flat · 1 image", tr: "Amatör flat · 1 görsel" })}</button>
            </>
          )}
        </p>
        {st.errors.length > 0 && (
          <ul className={css.errors} role="alert">
            {st.errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}
      </Band>
    );

  if (st.uploadStage === "analyzing")
    return (
      <Band idx={idx} title={t({ en: "Reading your images…", tr: "Görsellerin okunuyor…" })} hint={t({ en: "Sorting front, back, detail and the rest.", tr: "Ön, arka, detay ve diğerleri ayrılıyor." })}>
        <ul className={css.row}>
          {st.uploads.map((u, i) => (
            <li key={u.id} className={`${css.up} ${css.scan}`} style={{ animationDelay: `${i * 90}ms` }}>
              <img src={u.src} alt="" />
            </li>
          ))}
        </ul>
      </Band>
    );

  return (
    <Band
      idx={idx}
      title={shoot || ghostFlow ? t({ en: "All in. Check them.", tr: "Hepsi geldi. Kontrol et." }) : t({ en: "Placed. Check the order.", tr: "Yerleştirildi. Kontrol et." })}
      hint={
        shoot || ghostFlow
          ? t({ en: "Each frame becomes one output.", tr: "Her kare bir çıktıya dönüşür." })
          : t({ en: "Move anything that landed in the wrong place.", tr: "Yanlış yere düşeni taşı." })
      }
      actions={
        <>
          <Primary onClick={() => onConfirm(st.isFlat)}>
            {st.editing ? t({ en: "Update", tr: "Güncelle" }) : t({ en: "Confirm and continue", tr: "Onayla ve devam et" })}
          </Primary>
          <Quiet onClick={() => up({ uploadStage: "empty", uploads: [], errors: [] })}>{t({ en: "Start over", tr: "Baştan yükle" })}</Quiet>
        </>
      }
    >
      <ul className={css.row}>
        {st.uploads.map((u, i) => (
          <li key={u.id} className={css.up}>
            <img src={u.src} alt={u.name} />
            {shoot || ghostFlow ? (
              <span className={css.slotFixed}>
                {t({ en: "Frame", tr: "Kare" })} {String(i + 1).padStart(2, "0")}
              </span>
            ) : (
              <SlotPick value={u.slot} onChange={(slot) => up({ uploads: st.uploads.map((x) => (x.id === u.id ? { ...x, slot } : x)) })} />
            )}
          </li>
        ))}
      </ul>
    </Band>
  );
}

function SlotPick({ value, onChange }: { value: Slot; onChange: (s: Slot) => void }) {
  const { t } = useAtelier();
  const [open, setOpen] = useState(false);
  return (
    <span className={css.slot}>
      <button onClick={() => setOpen(!open)} aria-expanded={open}>
        {t(SLOTS.find((x) => x.id === value)!.label)} <Chevron size={10} dir="down" />
      </button>
      {open && (
        <span className={css.slotMenu}>
          {SLOTS.map((x) => (
            <button
              key={x.id}
              className={x.id === value ? css.on : undefined}
              onClick={() => {
                onChange(x.id);
                setOpen(false);
              }}
            >
              {t(x.label)}
            </button>
          ))}
        </span>
      )}
    </span>
  );
}

/* ───────────── the system added a step (C1-F-02) ───────────── */

export function GhostPanel({ idx, flat, onAccept, onSkip }: { idx: string; flat: string; onAccept: () => void; onSkip: () => void }) {
  const { t } = useAtelier();
  return (
    <Band
      idx={idx}
      title={t({ en: "The system added a step.", tr: "Sistem bir adım ekledi." })}
      hint={t({ en: "Your shot looks like an amateur flat.", tr: "Yüklediğin çekim amatör flat görünüyor." })}
      actions={
        <>
          <Primary onClick={onAccept}>{t({ en: "Continue", tr: "Devam" })}</Primary>
          <Quiet onClick={onSkip}>{t({ en: "Skip this step", tr: "Adımı atla" })}</Quiet>
        </>
      }
    >
      <div className={css.pair}>
        <figure>
          <div className={css.thumbs}>
            <img src={flat} alt="" />
          </div>
          <figcaption>{t({ en: "Your flat", tr: "Flat çekimin" })}</figcaption>
        </figure>
        <Arrow size={16} className={css.pairArrow} />
        <figure>
          <div className={css.thumbs}>
            <img src="/img/home/ghostflow-out.jpg" alt="" />
          </div>
          <figcaption>{t({ en: "Cleaned first", tr: "Önce temizlenir" })}</figcaption>
        </figure>
        <p className={css.alt}>
          {t({
            en: "A clean product image is made first, then dressed on the cast. Skip it to go on with the flat as it is.",
            tr: "Önce temiz bir ürün görseli üretilir, sonra cast'e giydirilir. Atlarsan flat çekimle olduğu gibi devam edilir.",
          })}
        </p>
      </div>
    </Band>
  );
}

/* ───────────── a row of pictures to choose from ───────────── */

function Tile({
  img,
  name,
  sub,
  sel,
  lock,
  onPick,
  onPeek,
}: {
  img: string;
  name: string;
  sub?: string;
  sel?: boolean;
  lock?: string;
  onPick: () => void;
  onPeek?: (on: boolean) => void;
}) {
  return (
    <li>
      <button
        className={`${css.tile} ${sel ? css.sel : ""} ${lock ? css.locked : ""}`}
        onClick={onPick}
        onMouseEnter={() => onPeek?.(true)}
        onMouseLeave={() => onPeek?.(false)}
        onFocus={() => onPeek?.(true)}
        onBlur={() => onPeek?.(false)}
        aria-pressed={sel}
      >
        <span className={css.tileImg}>
          <img src={img} alt="" />
          {sel && (
            <span className={css.check}>
              <Check size={11} />
            </span>
          )}
          {lock && (
            <span className={css.lock}>
              <Lock size={10} /> {lock}
            </span>
          )}
        </span>
        <span className={css.tileName}>{name}</span>
        {sub && <span className={css.tileSub}>{sub}</span>}
      </button>
    </li>
  );
}

function Upsell({ what, need }: { what: string; need: Role }) {
  const { t } = useAtelier();
  return (
    <p className={css.upsell}>
      <Lock size={11} />
      {t({ en: `${what} opens with ${t(ROLE_META[need].label)}.`, tr: `${what}, ${t(ROLE_META[need].label)} ile açılır.` })}
      <Link href="/packages">{t({ en: "See packages", tr: "Paketlere bak" })}</Link>
    </p>
  );
}

/* ───────────── cast (C1-F-04/05) ───────────── */

export function CastPanel({ st, up, idx, peek, onConfirm }: { st: FlowState; up: Up; idx: string; peek: Peek; onConfirm: () => void }) {
  const { t, s } = useAtelier();
  const [locked, setLocked] = useState<Cast | null>(null);
  const partner = s.role === "partner";

  const tile = (c: Cast) => {
    const usable = canUse(s.role, c.minRole) && !c.pending;
    return (
      <Tile
        key={c.id}
        img={c.img}
        name={c.name}
        sub={c.pending ? t({ en: "In review", tr: "İncelemede" }) : t(c.note)}
        sel={st.castId === c.id}
        lock={!canUse(s.role, c.minRole) ? t(ROLE_META[c.minRole].label) : undefined}
        onPick={() => (usable ? (setLocked(null), up({ castId: c.id })) : c.pending ? undefined : setLocked(c))}
        onPeek={(on) => peek(on && usable ? { kind: "cast", id: c.id } : null)}
      />
    );
  };

  return (
    <Band
      idx={idx}
      title={t({ en: "Who wears it?", tr: "Kim giysin?" })}
      hint={locked ? <Upsell what={locked.name} need={locked.minRole} /> : t({ en: "One cast per production. Hover to see it in the chain.", tr: "Her üretimde tek cast. Üstüne gel, zincirde gör." })}
      actions={
        <>
          <Primary disabled={!st.castId} onClick={onConfirm}>
            {st.editing ? t({ en: "Update", tr: "Güncelle" }) : t({ en: "Choose and continue", tr: "Seç ve devam et" })}
          </Primary>
          {st.editing && <span className={css.note}>{t({ en: "Later nodes are kept.", tr: "Sonraki düğümler korunur." })}</span>}
        </>
      }
    >
      <ul className={css.row}>
        <li className={css.group}>{t({ en: "Your cast", tr: "Kadron" })}</li>
        {partner ? (
          <>
            {OWN_CASTS.map(tile)}
            <li>
              <Link href="/library" className={`${css.tile} ${css.newTile}`}>
                <span className={css.tileImg}>
                  <Plus />
                </span>
                <span className={css.tileName}>{t({ en: "New cast", tr: "Yeni cast" })}</span>
                <span className={css.tileSub}>Cast Studio</span>
              </Link>
            </li>
          </>
        ) : (
          <li className={css.groupNote}>
            <Lock size={10} /> {t({ en: "Your own cast opens with Partner.", tr: "Kendi kadron Partner ile açılır." })}
          </li>
        )}
        <li className={css.group}>{t({ en: "Liora cast", tr: "Liora kadrosu" })}</li>
        {CASTS.map(tile)}
      </ul>
    </Band>
  );
}

/* ───────────── setting (C1-F-06, L-F-04/05) ───────────── */

export function SettingPanel({ st, up, idx, peek, onConfirm }: { st: FlowState; up: Up; idx: string; peek: Peek; onConfirm: () => void }) {
  const { t, s } = useAtelier();
  const [locked, setLocked] = useState<Setting | null>(null);
  const partner = s.role === "partner";

  const tile = (x: Setting) => {
    const usable = canUse(s.role, x.minRole);
    return (
      <Tile
        key={x.id}
        img={x.img}
        name={t(x.name)}
        sel={st.settingId === x.id}
        lock={!usable ? t(ROLE_META[x.minRole].label) : undefined}
        onPick={() => (usable ? (setLocked(null), up({ settingId: x.id })) : setLocked(x))}
        onPeek={(on) => peek(on && usable ? { kind: "setting", id: x.id } : null)}
      />
    );
  };

  return (
    <Band
      idx={idx}
      title={t({ en: "Where is it shot?", tr: "Nerede çekilsin?" })}
      hint={locked ? <Upsell what={t(locked.name)} need={locked.minRole} /> : t({ en: "Your saved settings come first.", tr: "Kayıtlı ortamların önce gelir." })}
      actions={
        <Primary disabled={!st.settingId} onClick={onConfirm}>
          {st.editing ? t({ en: "Update", tr: "Güncelle" }) : t({ en: "Choose and continue", tr: "Seç ve devam et" })}
        </Primary>
      }
    >
      <ul className={css.row}>
        {partner && (
          <>
            <li className={css.group}>{t({ en: "Saved", tr: "Kayıtlı" })}</li>
            {OWN_SETTINGS.map(tile)}
          </>
        )}
        <li className={css.group}>{t({ en: "Ready-made", tr: "Hazır" })}</li>
        {SETTINGS.map(tile)}
        <li className={css.group}>{t({ en: "Your own", tr: "Kendin" })}</li>
        <li>
          <button className={`${css.tile} ${css.newTile} ${partner ? "" : css.locked}`} disabled={!partner} title={partner ? undefined : "Partner"}>
            <span className={css.tileImg}>{partner ? <Plus /> : <Lock size={14} />}</span>
            <span className={css.tileName}>{t({ en: "Describe one", tr: "Metinle üret" })}</span>
            <span className={css.tileSub}>{partner ? t({ en: "Saved to your library", tr: "Kütüphanene kaydedilir" }) : "Partner"}</span>
          </button>
        </li>
        <li>
          <button className={`${css.tile} ${css.newTile} ${partner ? "" : css.locked}`} disabled={!partner}>
            <span className={css.tileImg}>{partner ? <Plus /> : <Lock size={14} />}</span>
            <span className={css.tileName}>{t({ en: "Upload a backdrop", tr: "Arka plan yükle" })}</span>
            <span className={css.tileSub}>{partner ? "JPG · PNG" : "Partner"}</span>
          </button>
        </li>
      </ul>
    </Band>
  );
}

/* ───────────── framing (C1-F-07/08) ───────────── */

export function FramingPanel({ st, up, idx, onConfirm }: { st: FlowState; up: Up; idx: string; onConfirm: () => void }) {
  const { t } = useAtelier();
  const toggle = (a: (typeof ANGLES)[number]["id"]) =>
    up({
      angles: st.angles.includes(a)
        ? st.angles.length > 1
          ? st.angles.filter((x) => x !== a)
          : st.angles
        : ANGLES.map((x) => x.id).filter((x) => x === a || st.angles.includes(x)),
    });
  return (
    <Band
      idx={idx}
      title={t({ en: "Which frames?", tr: "Hangi kareler?" })}
      hint={t({ en: "Each angle is one frame, one credit.", tr: "Her açı bir kare, bir kredi." })}
      actions={
        <>
          <Primary onClick={onConfirm}>{st.editing ? t({ en: "Update", tr: "Güncelle" }) : t({ en: "Continue", tr: "Devam et" })}</Primary>
          <span className={css.note}>
            {st.angles.length} {t({ en: st.angles.length === 1 ? "frame" : "frames", tr: "kare" })}
          </span>
        </>
      }
    >
      <ul className={css.row}>
        {ANGLES.map((a) => (
          <Tile key={a.id} img={a.out} name={t(a.label)} sel={st.angles.includes(a.id)} onPick={() => toggle(a.id)} />
        ))}
        <li className={css.styling}>
          <label>
            <span>{t({ en: "Styling note", tr: "Styling notu" })}</span>
            <input
              value={st.styling}
              onChange={(e) => up({ styling: e.target.value })}
              placeholder={t({ en: "e.g. the knit tucked in", tr: "örn. triko içeride" })}
              maxLength={80}
            />
          </label>
        </li>
      </ul>
    </Band>
  );
}

/* ───────────── ratio and quality (C1-F-09) ───────────── */

export function QualityPanel({ st, up, idx, onConfirm }: { st: FlowState; up: Up; idx: string; onConfirm: () => void }) {
  const { t } = useAtelier();
  return (
    <Band
      idx={idx}
      title={t({ en: "Size and finish.", tr: "Oran ve kalite." })}
      hint={t({ en: "Quality doesn't change the cost.", tr: "Kalite maliyeti değiştirmez." })}
      actions={<Primary onClick={onConfirm}>{st.editing ? t({ en: "Update", tr: "Güncelle" }) : t({ en: "Continue", tr: "Devam et" })}</Primary>}
    >
      <div className={css.quality}>
        <div className={css.ratios}>
          {RATIOS.map((r) => {
            const [w, h] = r.split(":").map(Number);
            return (
              <button key={r} className={st.ratio === r ? css.sel : undefined} onClick={() => up({ ratio: r })} aria-pressed={st.ratio === r}>
                <span style={{ aspectRatio: `${w} / ${h}` }} />
                {r}
              </button>
            );
          })}
        </div>
        <div className={css.segment} role="group" aria-label={t({ en: "Quality", tr: "Kalite" })}>
          <button className={st.quality === "standard" ? css.on : undefined} onClick={() => up({ quality: "standard" })} aria-pressed={st.quality === "standard"}>
            {t({ en: "Standard", tr: "Standart" })} <em>1K</em>
          </button>
          <button className={st.quality === "high" ? css.on : undefined} onClick={() => up({ quality: "high" })} aria-pressed={st.quality === "high"}>
            {t({ en: "High", tr: "Yüksek" })} <em>2K</em>
          </button>
        </div>
      </div>
    </Band>
  );
}

/* ───────────── ready (W-F-10/11/16) ───────────── */

export function ReadyPanel({ flow, st, onStart, onSave, onFewer }: { flow: FlowDef; st: FlowState; onStart: () => void; onSave: () => void; onFewer?: () => void }) {
  const { t, s } = useAtelier();
  const n = frameCount(flow, st);
  const total = cost(flow, st);
  const short = s.credits < total;
  return (
    <Band
      title={t({ en: "Ready.", tr: "Hazır." })}
      hint={t({ en: "To change anything, click its node.", tr: "Bir şeyi değiştirmek için düğümüne tıkla." })}
      actions={
        <>
          <Primary disabled={short} onClick={onStart}>
            {t({ en: "Start the system", tr: "Sistemi başlat" })}
          </Primary>
          <Quiet onClick={onSave}>{t({ en: "Save and exit", tr: "Kaydet ve çık" })}</Quiet>
        </>
      }
    >
      <div className={css.cost}>
        <p className={css.costBig}>
          <span>
            {n} {t({ en: n === 1 ? "frame" : "frames", tr: "kare" })}
          </span>
          <i />
          <span>
            {total} {t({ en: "credits", tr: "kredi" })}
          </span>
        </p>
        {short ? (
          <p className={css.costShort}>
            {t({ en: `Your balance is ${s.credits}; this run needs ${total}.`, tr: `Bakiyen ${s.credits}; bu üretim ${total} kredi istiyor.` })}{" "}
            <Link href="/packages">{s.role === "explorer" ? t({ en: "See packages", tr: "Paketlere bak" }) : t({ en: "Buy credits", tr: "Kredi al" })}</Link>
            {onFewer && <button onClick={onFewer}>{t({ en: "Fewer frames", tr: "Kare sayısını azalt" })}</button>}
          </p>
        ) : (
          <p className={css.costSub}>
            {t({ en: "Balance after", tr: "Sonraki bakiye" })} <b>{s.credits - total}</b> ·{" "}
            {t({ en: "frames that don't arrive cost nothing", tr: "gelmeyen kare ücretsizdir" })}
          </p>
        )}
      </div>
    </Band>
  );
}

/* ───────────── production and after (W-F-12…18) ───────────── */

export function RunPanel({ done, total, failed, frames, jobId }: { done: boolean; total: number; failed: number; frames: Frame[]; jobId?: string }) {
  const { t } = useAtelier();
  const arrived = frames.length;
  if (!done)
    return (
      <Band
        title={t({ en: "Sewing it together.", tr: "Birbirine dikiliyor." })}
        hint={t({ en: "You can close this screen; the work carries on and we'll tell you when it's done.", tr: "Bu ekranı kapatabilirsin; iş arka planda sürer, bitince haber veririz." })}
        actions={
          <>
            <Quiet href="/">{t({ en: "Close the screen", tr: "Ekranı kapat" })}</Quiet>
            <Quiet href="/jobs">{t({ en: "Jobs", tr: "İşlerim" })}</Quiet>
          </>
        }
      >
        <div className={css.progress}>
          <p>
            <b>{arrived}</b> / {total} {t({ en: "frames", tr: "kare" })}
          </p>
          <span className={css.track}>
            <span style={{ width: `${total ? (arrived / total) * 100 : 0}%` }} />
          </span>
        </div>
      </Band>
    );
  return (
    <Band
      title={
        failed
          ? t({ en: `${total - failed} of ${total} arrived.`, tr: `${total} karenin ${total - failed} tanesi geldi.` })
          : t({ en: `${total} frames are ready.`, tr: `${total} kare hazır.` })
      }
      hint={
        failed
          ? t({ en: "The missing one cost nothing; retry it alone from the results.", tr: "Gelmeyen kare için kredi yakılmadı; sonuçlardan tek başına yeniden dene." })
          : t({ en: "Judge them on the dark table.", tr: "Onları koyu masada değerlendir." })
      }
      actions={jobId && <Primary href={`/jobs/${jobId}`}>{t({ en: "Open the results", tr: "Sonuçları aç" })}</Primary>}
    >
      <ul className={css.row}>
        {frames.map((f) => (
          <li key={f.id} className={`${css.up} ${f.failed ? css.failed : ""}`}>
            {f.failed ? <span className={css.missing}>{t({ en: "Didn't arrive", tr: "Gelmedi" })}</span> : <img src={f.src} alt="" />}
          </li>
        ))}
      </ul>
    </Band>
  );
}

export function SavedPanel({ onKeep }: { onKeep: () => void }) {
  const { t } = useAtelier();
  return (
    <Band
      title={t({ en: "Saved as a draft.", tr: "Taslak olarak kaydedildi." })}
      hint={t({
        en: "Every filled node is kept. It waits on the Atelier as a Continue line.",
        tr: "Dolu düğümlerin hepsi korunuyor. Atölye'de Devam et satırı olarak seni bekliyor.",
      })}
      actions={
        <>
          <Primary href="/">{t({ en: "Back to the Atelier", tr: "Atölye'ye dön" })}</Primary>
          <Quiet onClick={onKeep}>{t({ en: "Keep working", tr: "Çalışmaya devam et" })}</Quiet>
        </>
      }
    />
  );
}
