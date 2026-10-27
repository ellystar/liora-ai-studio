"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ANGLES,
  CASTS,
  FLOWS,
  NODE_LABEL,
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
  castById,
  settingById,
  type Angle,
  type Cast,
  type FlowDef,
  type NodeKind,
  type Role,
  type Setting,
  type Slot,
  type Upload,
} from "@/lib/data";
import { useAtelier } from "@/lib/store";
import { Seam } from "../Seam";
import { Arrow, Check, Chevron, Lock, Plus, Upload as UploadIcon } from "../icons";
import { cost, frameCount, type FlowState, type StepId } from "./model";
import css from "./Flow.module.css";

type Up = (patch: Partial<FlowState>) => void;

/* ───────────── shell ───────────── */

export function StepShell({
  index,
  label,
  editing,
  title,
  lede,
  children,
  actions,
}: {
  index?: number;
  label: string;
  editing?: boolean;
  title: ReactNode;
  lede?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  const { t } = useAtelier();
  return (
    <div className={`${css.step} fade-in`}>
      <p className={css.stepEyebrow}>
        {index !== undefined && <span className="meta-num">{String(index).padStart(2, "0")}</span>}
        <span>{label}</span>
        {editing && <em>{t({ en: "Reopened", tr: "Yeniden açıldı" })}</em>}
      </p>
      <h2 className={css.stepTitle}>{title}</h2>
      {lede && <p className={css.stepLede}>{lede}</p>}
      {children && <div className={css.stepBody}>{children}</div>}
      {actions && <div className={css.stepActions}>{actions}</div>}
    </div>
  );
}

/* ───────────── intro (W-F-01/02/03) ───────────── */

export function Intro({ flow, onBegin }: { flow: FlowDef; onBegin: () => void }) {
  const { t } = useAtelier();
  const alt = flow.inputs.includes("flat")
    ? FLOWS.find((f) => f.slug === "recast")
    : FLOWS.find((f) => f.slug === "campaign");
  const examples =
    flow.slug === "recast"
      ? ["/img/input-onmodel.jpg"]
      : flow.slug === "ghost"
        ? ["/img/input-flat.jpg"]
        : ["/img/product-coat-front.jpg", "/img/product-coat-back.jpg", "/img/product-coat-detail.jpg"];

  return (
    <div className={`${css.step} ${css.intro} fade-in`}>
      <p className={css.stepEyebrow}>
        <span>{t({ en: "The flow", tr: "Akış" })}</span>
      </p>
      <h1 className={css.introTitle}>{t(flow.name)}</h1>
      <p className={css.stepLede}>{t(flow.line)}</p>

      <div className={css.introPair}>
        <div className={css.introIn}>
          <span className="meta-sm">{t({ en: "What you bring", tr: "Getirdiğin" })}</span>
          <div className={css.introThumbs}>
            {examples.map((src) => (
              <img key={src} src={src} alt="" />
            ))}
          </div>
        </div>
        <Arrow className={css.introArrow} size={18} />
        <div className={css.introOut}>
          <span className="meta-sm">{t({ en: "What you get", tr: "Aldığın" })}</span>
          <Seam before={flow.before} after={flow.after} className={css.introSeam} />
        </div>
      </div>

      {alt && (
        <p className={css.introAlt}>
          {flow.slug === "recast"
            ? t({ en: "Only have a product photo?", tr: "Elinde yalnızca ürün fotoğrafı mı var?" })
            : t({ en: "Your shot already has a model in it?", tr: "Çekiminde zaten bir manken mi var?" })}{" "}
          <Link href={`/flow/${alt.slug}`} className={css.inlineLink}>
            {t(alt.name)} →
          </Link>
        </p>
      )}

      <div className={css.stepActions}>
        <button className="btn btn-primary" onClick={onBegin}>
          {t({ en: "Begin", tr: "Başla" })} <Arrow className="ar" />
        </button>
        <span className={css.actionNote}>
          {t(flow.credit)} · {t({ en: "you only pay for frames that arrive", tr: "yalnızca gelen kareler için ödersin" })}
        </span>
      </div>
    </div>
  );
}

/* ───────────── upload (W-F-19…22, C1-F-01) ───────────── */

const MAX_MB = 20;
const OK_TYPES = ["image/jpeg", "image/png", "image/webp"];
const SLOT_ORDER: Slot[] = ["front", "back", "detail", "complement", "accessory"];

export function UploadStep({
  flow,
  st,
  up,
  index,
  onConfirm,
}: {
  flow: FlowDef;
  st: FlowState;
  up: Up;
  index: number;
  onConfirm: (flat: boolean) => void;
}) {
  const { t } = useAtelier();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [menu, setMenu] = useState<string | null>(null);
  const shoot = flow.nodes[0] === "shoot";
  const ghostFlow = flow.slug === "ghost";
  const max = shoot ? 6 : 8;

  useEffect(() => {
    if (st.uploadStage !== "analyzing") return;
    const id = setTimeout(() => up({ uploadStage: "review" }), 1500);
    return () => clearTimeout(id);
  }, [st.uploadStage, up]);

  const take = (list: Upload[], flat: boolean, errors: string[] = []) =>
    up({ uploads: list, isFlat: flat, errors, uploadStage: list.length ? "analyzing" : "empty" });

  const onFiles = (files: FileList | null) => {
    if (!files) return;
    const ok: Upload[] = [];
    const errs: string[] = [];
    Array.from(files).forEach((f) => {
      if (!OK_TYPES.includes(f.type)) {
        errs.push(
          t({
            en: `${f.name} — this format can't be read. Export it as JPG, PNG or WEBP.`,
            tr: `${f.name} — bu format okunamıyor. JPG, PNG ya da WEBP olarak dışa aktar.`,
          }),
        );
      } else if (f.size > MAX_MB * 1024 * 1024) {
        errs.push(
          t({
            en: `${f.name} — larger than ${MAX_MB} MB. Reduce it and drop it again.`,
            tr: `${f.name} — ${MAX_MB} MB'tan büyük. Küçültüp yeniden bırak.`,
          }),
        );
      } else if (ok.length >= max) {
        errs.push(t({ en: `${f.name} — only the first ${max} images are used.`, tr: `${f.name} — yalnızca ilk ${max} görsel kullanılır.` }));
      } else {
        ok.push({ id: `${Date.now()}-${ok.length}`, src: URL.createObjectURL(f), name: f.name, slot: SLOT_ORDER[ok.length % 5] });
      }
    });
    take(ok, false, errs);
  };

  const setSlot = (id: string, slot: Slot) => {
    up({ uploads: st.uploads.map((u) => (u.id === id ? { ...u, slot } : u)) });
    setMenu(null);
  };

  const title = shoot
    ? t({ en: "Bring the shoot.", tr: "Çekimi getir." })
    : ghostFlow
      ? t({ en: "Bring the flat shots.", tr: "Flat çekimleri getir." })
      : t({ en: "Bring the product.", tr: "Ürünü getir." });

  const lede = shoot
    ? t({ en: "Frames with a model in them, up to six. They are processed together.", tr: "Mankenli kareler, en fazla altı. Hepsi birlikte işlenir." })
    : ghostFlow
      ? t({ en: "Phone photos on a floor or bed are fine. One product per image.", tr: "Yerde ya da yatakta telefonla çekilmiş olabilir. Her görselde bir ürün." })
      : t({
          en: "Drop everything at once — front, back, detail, complements, accessories. We'll sort them.",
          tr: "Hepsini tek seferde bırak — ön, arka, detay, tamamlayıcı, aksesuar. Biz yerleştiririz.",
        });

  if (st.uploadStage === "empty") {
    return (
      <StepShell index={index} label={t(NODE_LABEL[flow.nodes[0]])} editing={st.editing} title={title} lede={lede}>
        <div
          className={`${css.drop} ${over ? css.dropOver : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            onFiles(e.dataTransfer.files);
          }}
          onClick={() => input.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && input.current?.click()}
        >
          <UploadIcon />
          <span className={css.dropTitle}>{t({ en: "Drop your images here", tr: "Görsellerini buraya bırak" })}</span>
          <span className={css.dropSub}>{t({ en: "or choose files", tr: "ya da dosya seç" })}</span>
          <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => onFiles(e.target.files)} />
        </div>
        <p className={css.rules}>
          JPG · PNG · WEBP — {t({ en: `up to ${MAX_MB} MB each`, tr: `her biri en fazla ${MAX_MB} MB` })} —{" "}
          {t({ en: `up to ${max} images`, tr: `en fazla ${max} görsel` })}
        </p>
        {st.errors.length > 0 && <Errors list={st.errors} />}
        <div className={css.samples}>
          <span className="meta-sm">{t({ en: "Nothing to hand? Use a sample", tr: "Elinde yok mu? Örnekle dene" })}</span>
          {shoot ? (
            <button className="link" onClick={() => take(SAMPLE_SHOOT, false)}>
              {t({ en: "Studio shoot · 1 frame", tr: "Stüdyo çekimi · 1 kare" })}
            </button>
          ) : ghostFlow ? (
            <button className="link" onClick={() => take(SAMPLE_FLAT, true)}>
              {t({ en: "Coat on the floor · 1 image", tr: "Yerdeki kaban · 1 görsel" })}
            </button>
          ) : (
            <>
              <button className="link" onClick={() => take(SAMPLE_PRO, false)}>
                {t({ en: "Ghost set · 5 images", tr: "Ghost seti · 5 görsel" })}
              </button>
              <button className="link" onClick={() => take(SAMPLE_FLAT, true)}>
                {t({ en: "Amateur flat · 1 image", tr: "Amatör flat · 1 görsel" })}
              </button>
            </>
          )}
        </div>
      </StepShell>
    );
  }

  if (st.uploadStage === "analyzing") {
    return (
      <StepShell
        index={index}
        label={t(NODE_LABEL[flow.nodes[0]])}
        title={t({ en: "Reading your images…", tr: "Görsellerin okunuyor…" })}
        lede={t({ en: "Sorting them into front, back, detail and the rest.", tr: "Ön, arka, detay ve diğerlerine ayrılıyor." })}
      >
        <div className={css.uploadGrid}>
          {st.uploads.map((u, i) => (
            <div key={u.id} className={`${css.upItem} ${css.scanning}`} style={{ animationDelay: `${i * 80}ms` }}>
              <img src={u.src} alt="" />
            </div>
          ))}
        </div>
      </StepShell>
    );
  }

  return (
    <StepShell
      index={index}
      label={t(NODE_LABEL[flow.nodes[0]])}
      editing={st.editing}
      title={
        shoot || ghostFlow
          ? t({ en: "Everything's in. Check it.", tr: "Hepsi geldi. Kontrol et." })
          : t({ en: "Placed. Check the order.", tr: "Yerleştirildi. Sırayı kontrol et." })
      }
      lede={
        shoot || ghostFlow
          ? t({ en: "Each frame becomes one output.", tr: "Her kare bir çıktıya dönüşür." })
          : t({
              en: "One misplaced frame can spoil the whole run — move anything that landed in the wrong place.",
              tr: "Yanlış yere düşen tek bir kare bütün üretimi bozabilir — yanlış yerleşeni taşı.",
            })
      }
      actions={
        <>
          <button className="btn btn-primary" onClick={() => onConfirm(st.isFlat)}>
            {t({ en: "Confirm and continue", tr: "Onayla ve devam et" })} <Arrow className="ar" />
          </button>
          <button className="btn btn-ghost" onClick={() => up({ uploadStage: "empty", uploads: [], errors: [] })}>
            {t({ en: "Start over", tr: "Baştan yükle" })}
          </button>
        </>
      }
    >
      <div className={css.uploadGrid}>
        {st.uploads.map((u, i) => (
          <div key={u.id} className={css.upItem}>
            <img src={u.src} alt={u.name} />
            {shoot || ghostFlow ? (
              <span className={css.slot}>
                {t({ en: "Frame", tr: "Kare" })} {String(i + 1).padStart(2, "0")}
              </span>
            ) : (
              <div className={css.slotWrap}>
                <button className={css.slot} onClick={() => setMenu(menu === u.id ? null : u.id)} aria-expanded={menu === u.id}>
                  {t(SLOTS.find((x) => x.id === u.slot)!.label)} <Chevron dir="down" size={10} />
                </button>
                {menu === u.id && (
                  <div className={`${css.slotMenu} fade-in`}>
                    {SLOTS.map((x) => (
                      <button key={x.id} onClick={() => setSlot(u.id, x.id)} className={x.id === u.slot ? css.on : undefined}>
                        {t(x.label)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <span className={css.fileName}>{u.name}</span>
          </div>
        ))}
      </div>
      {st.errors.length > 0 && <Errors list={st.errors} />}
    </StepShell>
  );
}

function Errors({ list }: { list: string[] }) {
  return (
    <ul className={css.errors} role="alert">
      {list.map((e) => (
        <li key={e}>{e}</li>
      ))}
    </ul>
  );
}

/* ───────────── ghost suggestion (C1-F-02/03) ───────────── */

export function GhostSuggest({ index, onAccept, onSkip }: { index: number; onAccept: () => void; onSkip: () => void }) {
  const { t } = useAtelier();
  return (
    <StepShell
      index={index}
      label={t({ en: "Ghost · added by the system", tr: "Ghost · sistem ekledi" })}
      title={t({ en: "This looks like a flat shot.", tr: "Bu bir flat çekim gibi görünüyor." })}
      lede={t({
        en: "We added a step to the chain: the product is cleaned into a ghost shot first, then dressed on the cast. The campaign comes out noticeably better this way.",
        tr: "Zincire bir adım ekledik: ürün önce ghost çekime temizlenir, sonra cast'in üzerine giydirilir. Kampanya bu şekilde belirgin biçimde daha iyi çıkar.",
      })}
      actions={
        <>
          <button className="btn btn-primary" onClick={onAccept}>
            {t({ en: "Keep the step", tr: "Adımı koru" })} <Arrow className="ar" />
          </button>
          <button className="btn btn-ghost" onClick={onSkip}>
            {t({ en: "Skip it — use the flat as it is", tr: "Atla — flat'i olduğu gibi kullan" })}
          </button>
        </>
      }
    >
      <div className={`${css.ghostPair} seam-host`}>
        <Seam before="/img/input-flat.jpg" after="/img/product-coat-front.jpg" className={css.ghostSeam} />
        <p className="meta-sm">{t({ en: "Hover — your shot, torn into the clean version", tr: "Üzerine gel — çekimin, temiz hâline yırtılarak" })}</p>
      </div>
      <p className={css.aside}>
        {t({ en: "No extra credits: the cleanup doesn't produce a frame of its own.", tr: "Ek kredi yok: temizleme kendi başına bir kare üretmez." })}
      </p>
    </StepShell>
  );
}

/* ───────────── locked upsell, shared (B-F-06) ───────────── */

function Upsell({ need, what, onAlt, altLabel }: { need: Role; what: string; onAlt: () => void; altLabel: string }) {
  const { t } = useAtelier();
  return (
    <div className={`${css.upsell} fade-in`}>
      <Lock size={12} />
      <span>
        {what} {t({ en: "opens with", tr: "şu üyelikte açılır:" })} <b>{t(ROLE_META[need].label)}</b>.
      </span>
      <span className={css.upsellActions}>
        <button className="link">{t({ en: "See memberships", tr: "Üyelikleri gör" })}</button>
        <button className="btn btn-ghost" onClick={onAlt}>
          {altLabel}
        </button>
      </span>
    </div>
  );
}

const canUse = (role: Role, min: Role) => ROLE_RANK[role] >= ROLE_RANK[min];

/* ───────────── cast (C1-F-04/04b/05, L-F-03) ───────────── */

export function CastStep({ st, up, index, onConfirm }: { st: FlowState; up: Up; index: number; onConfirm: () => void }) {
  const { t, s } = useAtelier();
  const [locked, setLocked] = useState<Cast | null>(null);
  const partner = s.role === "partner";

  const card = (c: Cast) => {
    const usable = canUse(s.role, c.minRole) && !c.pending;
    const sel = st.castId === c.id;
    return (
      <button
        key={c.id}
        className={`${css.castCard} ${sel ? css.sel : ""} ${!usable ? css.dim : ""}`}
        onClick={() => (usable ? (setLocked(null), up({ castId: c.id })) : c.pending ? null : setLocked(c))}
        aria-pressed={sel}
      >
        <span className={css.castImg}>
          <img src={c.img} alt="" />
          {sel && (
            <span className={css.selMark}>
              <Check />
            </span>
          )}
          {!canUse(s.role, c.minRole) && (
            <span className={css.lockTag}>
              <Lock size={10} /> {t(ROLE_META[c.minRole].label)}
            </span>
          )}
          {c.pending && <span className={css.lockTag}>{t({ en: "In review", tr: "İncelemede" })}</span>}
        </span>
        <span className={css.castName}>{c.name}</span>
        <span className={css.castNote}>{t(c.note)}</span>
      </button>
    );
  };

  return (
    <StepShell
      index={index}
      label={t(NODE_LABEL.cast)}
      editing={st.editing}
      title={t({ en: "Who wears it?", tr: "Kim giyiyor?" })}
      lede={t({ en: "One cast per production. Your own cast comes first.", tr: "Her üretimde tek cast. Kendi kadron önce gelir." })}
      actions={
        <button className="btn btn-primary" disabled={!st.castId} onClick={onConfirm}>
          {st.editing ? t({ en: "Update", tr: "Güncelle" }) : t({ en: "Choose and continue", tr: "Seç ve devam et" })}{" "}
          <Arrow className="ar" />
        </button>
      }
    >
      <section className={css.group}>
        <header>
          <span className="meta">{t({ en: "Your cast", tr: "Kadron" })}</span>
          <span className="meta-sm">{t({ en: "private to your account", tr: "yalnızca senin hesabında" })}</span>
        </header>
        {partner ? (
          <div className={css.castGrid}>
            {OWN_CASTS.map(card)}
            <Link href="/library" className={`${css.castCard} ${css.newCast}`}>
              <span className={css.castImg}>
                <Plus />
              </span>
              <span className={css.castName}>{t({ en: "New cast", tr: "Yeni cast" })}</span>
              <span className={css.castNote}>Cast Studio · {t({ en: "1 credit a try", tr: "deneme 1 kredi" })}</span>
            </Link>
          </div>
        ) : (
          <p className={css.lockedLine}>
            <Lock size={11} />
            {t({
              en: "Your own cast — designed once, reused forever — opens with Partner in Cast Studio.",
              tr: "Kendi kadron — bir kez tasarla, hep kullan — Partner üyelikte Cast Studio'da açılır.",
            })}
          </p>
        )}
      </section>

      <section className={css.group}>
        <header>
          <span className="meta">{t({ en: "Liora cast", tr: "Liora kadrosu" })}</span>
          <span className="meta-sm">
            {CASTS.filter((c) => canUse(s.role, c.minRole)).length} / {CASTS.length} {t({ en: "open to you", tr: "sana açık" })}
          </span>
        </header>
        {locked && (
          <Upsell
            need={locked.minRole}
            what={locked.name}
            onAlt={() => setLocked(null)}
            altLabel={t({ en: "Choose an open cast", tr: "Açık bir cast seç" })}
          />
        )}
        <div className={css.castGrid}>{CASTS.map(card)}</div>
      </section>
    </StepShell>
  );
}

/* ───────────── setting (C1-F-06, L-F-04/04b/05) ───────────── */

export function SettingStep({ st, up, index, onConfirm }: { st: FlowState; up: Up; index: number; onConfirm: () => void }) {
  const { t, s } = useAtelier();
  const [locked, setLocked] = useState<Setting | null>(null);
  const [prompt, setPrompt] = useState("");
  const [gen, setGen] = useState<"idle" | "working" | "done">("idle");
  const partner = s.role === "partner";

  const card = (se: Setting) => {
    const usable = canUse(s.role, se.minRole);
    const sel = st.settingId === se.id;
    return (
      <button
        key={se.id}
        className={`${css.setCard} ${sel ? css.sel : ""} ${!usable ? css.dim : ""}`}
        onClick={() => (usable ? (setLocked(null), up({ settingId: se.id })) : setLocked(se))}
        aria-pressed={sel}
      >
        <span className={css.setImg}>
          <img src={se.img} alt="" />
          {sel && (
            <span className={css.selMark}>
              <Check />
            </span>
          )}
          {!usable && (
            <span className={css.lockTag}>
              <Lock size={10} /> {t(ROLE_META[se.minRole].label)}
            </span>
          )}
        </span>
        <span className={css.castName}>{t(se.name)}</span>
      </button>
    );
  };

  const generate = () => {
    if (!prompt.trim()) return;
    setGen("working");
    setTimeout(() => {
      setGen("done");
      up({ settingId: "library" });
    }, 1600);
  };

  return (
    <StepShell
      index={index}
      label={t(NODE_LABEL.setting)}
      editing={st.editing}
      title={t({ en: "Where is it shot?", tr: "Nerede çekiliyor?" })}
      lede={t({ en: "A ready setting, or one of your own.", tr: "Hazır bir ortam ya da kendi ortamın." })}
      actions={
        <button className="btn btn-primary" disabled={!st.settingId} onClick={onConfirm}>
          {st.editing ? t({ en: "Update", tr: "Güncelle" }) : t({ en: "Choose and continue", tr: "Seç ve devam et" })}{" "}
          <Arrow className="ar" />
        </button>
      }
    >
      <section className={css.group}>
        <header>
          <span className="meta">{t({ en: "Your sets", tr: "Kendi setin" })}</span>
          <span className="meta-sm">{t({ en: "described or uploaded by you", tr: "tarif ettiğin ya da yüklediğin" })}</span>
        </header>
        {partner ? (
          <>
            <div className={css.setGrid}>{OWN_SETTINGS.map(card)}</div>
            <div className={css.describe}>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={t({
                  en: "Describe a setting — e.g. an empty hammam at noon, marble, soft steam",
                  tr: "Bir ortam tarif et — örn. öğle vakti boş bir hamam, mermer, hafif buhar",
                })}
                rows={2}
              />
              <div className={css.describeRow}>
                <button className="btn btn-secondary btn-sm" onClick={generate} disabled={!prompt.trim() || gen === "working"}>
                  {gen === "working" ? t({ en: "Composing…", tr: "Oluşturuluyor…" }) : t({ en: "Compose setting", tr: "Ortamı oluştur" })}
                </button>
                <button className="link">{t({ en: "Or upload your own background", tr: "Ya da kendi arka planını yükle" })}</button>
              </div>
              {gen === "done" && (
                <p className={css.aside}>
                  {t({
                    en: "Preview selected. Saved to your library when the production finishes.",
                    tr: "Önizleme seçildi. Üretim bitince kütüphanene kaydedilir.",
                  })}
                </p>
              )}
            </div>
          </>
        ) : (
          <p className={css.lockedLine}>
            <Lock size={11} />
            {t({
              en: "Describing your own setting, uploading a background and keeping a set open with Partner.",
              tr: "Kendi ortamını tarif etmek, arka plan yüklemek ve set kaydetmek Partner üyelikte açılır.",
            })}
          </p>
        )}
      </section>

      <section className={css.group}>
        <header>
          <span className="meta">{t({ en: "Ready settings", tr: "Hazır ortamlar" })}</span>
        </header>
        {locked && (
          <Upsell
            need={locked.minRole}
            what={t(locked.name)}
            onAlt={() => setLocked(null)}
            altLabel={t({ en: "Choose an open setting", tr: "Açık bir ortam seç" })}
          />
        )}
        <div className={css.setGrid}>{SETTINGS.map(card)}</div>
      </section>
    </StepShell>
  );
}

/* ───────────── framing (C1-F-07/08) ───────────── */

function Pictogram({ a }: { a: Angle }) {
  const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.1, vectorEffect: "non-scaling-stroke" as const };
  return (
    <svg viewBox="0 0 40 60" className={css.picto} aria-hidden>
      {a === "front" && (
        <>
          <circle cx="20" cy="10" r="4.5" {...stroke} />
          <path d="M13 18 h14 l3 26 h-20 z M15 44 l-1 12 M25 44 l1 12" {...stroke} />
        </>
      )}
      {a === "threeQuarter" && (
        <>
          <circle cx="22" cy="10" r="4.5" {...stroke} />
          <path d="M15 18 h11 l4 26 h-17 z M17 44 l-1 12 M26 44 l2 12" {...stroke} />
          <path d="M26 18 l3 10" {...stroke} />
        </>
      )}
      {a === "back" && (
        <>
          <circle cx="20" cy="10" r="4.5" {...stroke} fill="currentColor" fillOpacity={0.25} />
          <path d="M13 18 h14 l3 26 h-20 z M20 18 v26 M15 44 l-1 12 M25 44 l1 12" {...stroke} />
        </>
      )}
      {a === "detail" && (
        <>
          <path d="M8 20 h24 l3 30 h-30 z" {...stroke} />
          <rect x="14" y="24" width="12" height="12" {...stroke} strokeDasharray="2 2" />
          <circle cx="20" cy="42" r="1" fill="currentColor" />
        </>
      )}
      {a === "seated" && (
        <>
          <circle cx="16" cy="10" r="4.5" {...stroke} />
          <path d="M10 18 h12 l2 18 h12 l-1 20 M24 36 l-2 20 M10 18 l-2 18 h16" {...stroke} />
        </>
      )}
    </svg>
  );
}

export function FramingStep({ st, up, index, onConfirm }: { st: FlowState; up: Up; index: number; onConfirm: () => void }) {
  const { t } = useAtelier();
  const toggle = (a: Angle) =>
    up({ angles: st.angles.includes(a) ? st.angles.filter((x) => x !== a) : ANGLES.map((x) => x.id).filter((x) => x === a || st.angles.includes(x)) });

  return (
    <StepShell
      index={index}
      label={t(NODE_LABEL.framing)}
      editing={st.editing}
      title={t({ en: "Which frames?", tr: "Hangi kareler?" })}
      lede={t({ en: "Each angle is one frame and one credit.", tr: "Her açı bir kare ve bir kredi." })}
      actions={
        <>
          <button className="btn btn-primary" disabled={st.angles.length === 0} onClick={onConfirm}>
            {st.editing ? t({ en: "Update", tr: "Güncelle" }) : t({ en: "Continue", tr: "Devam et" })} <Arrow className="ar" />
          </button>
          <span className={css.actionNote}>
            {st.angles.length} {t({ en: "frames", tr: "kare" })}
          </span>
        </>
      }
    >
      <div className={css.angles}>
        {ANGLES.map((a) => {
          const on = st.angles.includes(a.id);
          return (
            <button key={a.id} className={`${css.angle} ${on ? css.sel : ""}`} onClick={() => toggle(a.id)} aria-pressed={on}>
              <Pictogram a={a.id} />
              <span>{t(a.label)}</span>
              {on && (
                <span className={css.angleNum}>{String(st.angles.indexOf(a.id) + 1).padStart(2, "0")}</span>
              )}
            </button>
          );
        })}
      </div>
      <label className={css.field}>
        <span className="meta-sm">{t({ en: "Styling note · optional", tr: "Styling notu · isteğe bağlı" })}</span>
        <input
          value={st.styling}
          onChange={(e) => up({ styling: e.target.value })}
          placeholder={t({ en: "e.g. coat worn open, knit tucked in", tr: "örn. kaban açık, triko içeride" })}
        />
      </label>
    </StepShell>
  );
}

/* ───────────── quality & ratio (C1-F-09) ───────────── */

export function QualityStep({ st, up, index, onConfirm }: { st: FlowState; up: Up; index: number; onConfirm: () => void }) {
  const { t } = useAtelier();
  return (
    <StepShell
      index={index}
      label={t(NODE_LABEL.quality)}
      editing={st.editing}
      title={t({ en: "Size and finish.", tr: "Oran ve kalite." })}
      actions={
        <button className="btn btn-primary" onClick={onConfirm}>
          {st.editing ? t({ en: "Update", tr: "Güncelle" }) : t({ en: "Continue", tr: "Devam et" })} <Arrow className="ar" />
        </button>
      }
    >
      <section className={css.group}>
        <header>
          <span className="meta">{t({ en: "Ratio", tr: "Oran" })}</span>
        </header>
        <div className={css.ratios}>
          {RATIOS.map((r) => {
            const [w, h] = r.split(":").map(Number);
            return (
              <button key={r} className={`${css.ratio} ${st.ratio === r ? css.sel : ""}`} onClick={() => up({ ratio: r })} aria-pressed={st.ratio === r}>
                <span className={css.ratioBox} style={{ aspectRatio: `${w} / ${h}` }} />
                <span className="meta-num">{r}</span>
              </button>
            );
          })}
        </div>
      </section>
      <section className={css.group}>
        <header>
          <span className="meta">{t({ en: "Quality", tr: "Kalite" })}</span>
        </header>
        <div className={css.segment}>
          <button className={st.quality === "standard" ? css.on : undefined} onClick={() => up({ quality: "standard" })}>
            {t({ en: "Standard", tr: "Standart" })} <span>1K</span>
          </button>
          <button className={st.quality === "high" ? css.on : undefined} onClick={() => up({ quality: "high" })}>
            {t({ en: "High", tr: "Yüksek" })} <span>2K</span>
          </button>
        </div>
        <p className={css.assume}>
          {t({
            en: "Assumed: quality doesn't change the credit cost. Open decision with product.",
            tr: "Varsayım: kalite kredi maliyetini değiştirmiyor. Ürünle kapatılacak karar.",
          })}
        </p>
      </section>
    </StepShell>
  );
}

/* ───────────── summary (W-F-10/11/16) ───────────── */

export function SummaryStep({
  flow,
  st,
  chain,
  onJump,
  onStart,
  onSave,
}: {
  flow: FlowDef;
  st: FlowState;
  chain: NodeKind[];
  onJump: (s: StepId) => void;
  onStart: () => void;
  onSave: () => void;
}) {
  const { t, s } = useAtelier();
  const frames = frameCount(flow, st);
  const total = cost(flow, st);
  const short = s.credits < total;

  const value = (n: NodeKind): string => {
    switch (n) {
      case "product":
      case "shoot":
        return `${st.uploads.length} ${t({ en: st.uploads.length === 1 ? "image" : "images", tr: "görsel" })}`;
      case "ghost":
        return flow.slug === "ghost" ? t({ en: "Made in the run", tr: "Üretimde" }) : t({ en: "Cleaned first", tr: "Önce temizlenir" });
      case "cast":
        return castById(st.castId)?.name ?? "—";
      case "setting":
        return flow.locked?.includes("setting") ? t({ en: "From your shoot", tr: "Çekiminden" }) : t(settingById(st.settingId)?.name ?? { en: "—", tr: "—" });
      case "framing":
        return flow.locked?.includes("framing")
          ? t({ en: "From your shoot", tr: "Çekiminden" })
          : st.angles.map((a) => t(ANGLES.find((x) => x.id === a)!.label)).join(", ");
      case "quality":
        return `${st.ratio} · ${st.quality === "high" ? "2K" : t({ en: "Standard", tr: "Standart" })}`;
      default:
        return "";
    }
  };

  return (
    <StepShell
      label={t({ en: "Ready", tr: "Hazır" })}
      title={
        s.lang === "tr" ? (
          <>
            Hepsi <span className="soul">hazır.</span>
          </>
        ) : (
          <>
            Everything is <span className="soul">ready.</span>
          </>
        )
      }
      lede={t({ en: "To change anything, click it here or on the sheet.", tr: "Bir şeyi değiştirmek için buradan ya da föyden tıkla." })}
    >
      <ul className={css.summary}>
        {chain
          .filter((n) => n !== "result")
          .map((n, i) => {
            const locked = flow.locked?.includes(n) || (flow.slug === "ghost" && n === "ghost");
            return (
              <li key={n}>
                <span className="meta-num">{String(i + 1).padStart(2, "0")}</span>
                <span className={css.sumLabel}>{t(NODE_LABEL[n])}</span>
                <span className={css.sumValue}>{value(n)}</span>
                {!locked && (
                  <button className={css.sumEdit} onClick={() => onJump(n)}>
                    {t({ en: "Change", tr: "Değiştir" })}
                  </button>
                )}
              </li>
            );
          })}
      </ul>

      <div className={`${css.costBox} ${short ? css.costShort : ""}`}>
        <div className={css.costLine}>
          <span className="meta-num">
            {frames} × {flow.creditPerFrame}
          </span>
          <span className={css.costTotal}>
            {total} {t({ en: "credits", tr: "kredi" })}
          </span>
        </div>
        <div className={css.costSub}>
          {short ? (
            <>
              {t({ en: `Your balance is ${s.credits}. This run needs ${total}.`, tr: `Bakiyen ${s.credits}. Bu üretim ${total} kredi istiyor.` })}
            </>
          ) : (
            <>
              {t({ en: "Balance after", tr: "Sonraki bakiye" })} <span className="meta-num">{s.credits - total}</span> ·{" "}
              {t({ en: "frames that don't arrive cost nothing", tr: "gelmeyen kare ücretsizdir" })}
            </>
          )}
        </div>
        {short && (
          <div className={css.costExits}>
            <button className="link">
              {s.role === "explorer" ? t({ en: "See memberships", tr: "Üyeliklere bak" }) : t({ en: "Buy credits", tr: "Kredi al" })}
            </button>
            {flow.nodes.includes("framing") && !flow.locked?.includes("framing") && (
              <button className="link" onClick={() => onJump("framing")}>
                {t({ en: "Fewer frames", tr: "Kare sayısını azalt" })}
              </button>
            )}
          </div>
        )}
      </div>

      <div className={css.stepActions}>
        <button className="btn btn-primary" disabled={short} onClick={onStart}>
          {t({ en: "Start the system", tr: "Sistemi başlat" })} <Arrow className="ar" />
        </button>
        <button className="btn btn-secondary" onClick={onSave}>
          {t({ en: "Save and exit", tr: "Kaydet ve çık" })}
        </button>
      </div>
    </StepShell>
  );
}
