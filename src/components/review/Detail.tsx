"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ROLE_META,
  flowBySlug,
  settingById,
  type Frame,
  type Job,
  type L,
} from "@/lib/data";
import { findCast, fmtDate, useAtelier } from "@/lib/store";
import { Seam } from "../Seam";
import { Chevron, Close, Download, Lock, ThumbDown, ThumbUp } from "../icons";
import { downloadImage, fileName } from "@/lib/download";
import { frameName, inputFor } from "./ReviewSurface";
import css from "./Review.module.css";

const REASONS: { id: string; label: L }[] = [
  { id: "product", label: { en: "The product is wrong", tr: "Ürün yanlış" } },
  { id: "model", label: { en: "The model is wrong", tr: "Manken yanlış" } },
  { id: "framing", label: { en: "The framing is wrong", tr: "Kadraj yanlış" } },
  { id: "quality", label: { en: "Quality is low", tr: "Kalite düşük" } },
  { id: "other", label: { en: "Something else", tr: "Diğer" } },
];

type Panel = "none" | "edit" | "recreate" | "share";

/* One frame, and every decision that can be taken about it (S-F-02…20).
   Everything works from the frame's own record — nothing is re-uploaded. */
export function Detail({
  job,
  index,
  onIndex,
  onClose,
  patchFrame,
}: {
  job: Job;
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
  patchFrame: (id: string, patch: Partial<Frame>) => void;
}) {
  const { s, t, dispatch, set } = useAtelier();
  const f = job.frames[index];
  const flow = flowBySlug(job.flow)!;
  const cast = findCast(s, job.castId);
  const setting = settingById(job.settingId);
  const name = frameName(f);
  const watermark = s.role === "explorer";
  const days = job.expiresInDays ?? 7;

  const [panel, setPanel] = useState<Panel>("none");
  const [compare, setCompare] = useState(false);
  const [reasons, setReasons] = useState<string[]>([]);
  const [other, setOther] = useState("");
  const [askReason, setAskReason] = useState(false);
  const [busy, setBusy] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [history, setHistory] = useState<{ text: string; src: string }[]>([]);
  const [suggest, setSuggest] = useState<string | null>(null);
  const [brand, setBrand] = useState(s.brand);
  const [pubLink, setPubLink] = useState("");
  const [shared, setShared] = useState(false);

  /* moving to another frame starts its panel fresh (state adjusted during
     render, as React recommends, instead of in an effect) */
  const [shownIndex, setShownIndex] = useState(index);
  if (shownIndex !== index) {
    setShownIndex(index);
    setPanel("none");
    setAskReason(false);
    setReasons([]);
    setSuggest(null);
    setHistory([]);
    setCompare(false);
    setShared(false);
  }

  const nav = job.frames.map((x, i) => (x.failed ? -1 : i)).filter((i) => i >= 0);
  const pos = nav.indexOf(index);
  const go = (d: number) => {
    const next = nav[(pos + d + nav.length) % nav.length];
    onIndex(next);
  };

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (/INPUT|TEXTAREA/.test((e.target as HTMLElement | null)?.tagName ?? "")) return;
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", key);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = "";
    };
  });

  const sendEdit = () => {
    if (!prompt.trim()) return;
    setBusy(true);
    const text = prompt;
    setPrompt("");
    setTimeout(() => {
      const src = f.angle === "front" ? "/img/out-front-edit.jpg" : f.src;
      setHistory((h) => [...h, { text, src }]);
      setSuggest(src);
      setBusy(false);
      dispatch({ type: "spend", amount: 1 });
    }, 1900);
  };

  const useEdit = () => {
    if (!suggest) return;
    patchFrame(f.id, { src: suggest, versions: [...(f.versions ?? []), f.src] });
    setSuggest(null);
    setPanel("none");
  };

  const recreate = () => {
    setBusy(true);
    setTimeout(() => {
      patchFrame(f.id, { versions: [...(f.versions ?? []), f.src] });
      dispatch({ type: "spend", amount: job.creditPerFrame ?? 1 });
      setBusy(false);
      setPanel("none");
    }, 2400);
  };

  const sendReview = () => {
    patchFrame(f.id, { liked: false, review: "pending", reasons });
    setAskReason(false);
  };

  const share = () => {
    if (!brand.trim()) return;
    if (!s.brand) set({ brand: brand.trim() });
    setShared(true);
  };

  const showImg = suggest ?? f.src;

  return (
    <div className={`${css.detail} fade-in`} role="dialog" aria-modal="true" aria-label={t({ en: "Frame detail", tr: "Görsel detayı" })}>
      <div className={css.stage}>
        <div className={css.stageTop}>
          <span className={css.num}>
            {String(pos + 1).padStart(2, "0")} / {String(nav.length).padStart(2, "0")}
          </span>
          <button className={`${css.compare} ${compare ? css.on : ""}`} onClick={() => setCompare(!compare)}>
            {compare ? t({ en: "Hover the frame to compare", tr: "Karşılaştırmak için üzerine gel" }) : t({ en: "Compare with input", tr: "Girdiyle karşılaştır" })}
          </button>
        </div>

        <div className={css.imageWrap}>
          {compare ? (
            <Seam before={inputFor(job)} after={showImg} className={css.bigSeam} fit="contain" />
          ) : (
            <div className={css.bigImg}>
              <img src={showImg} alt={name ? t(name) : ""} className={busy && panel === "recreate" ? css.working : undefined} />
              {watermark && <span className={css.wm} aria-hidden />}
              {suggest && <span className={css.suggestTag}>{t({ en: "Suggestion", tr: "Öneri" })}</span>}
            </div>
          )}
          {nav.length > 1 && (
            <>
              <button className={`${css.navBtn} ${css.prev}`} onClick={() => go(-1)} aria-label="Previous">
                <Chevron dir="left" size={18} />
              </button>
              <button className={`${css.navBtn} ${css.next}`} onClick={() => go(1)} aria-label="Next">
                <Chevron size={18} />
              </button>
            </>
          )}
        </div>
      </div>

      <aside className={css.side}>
        <button className={css.close} onClick={onClose} aria-label={t({ en: "Close", tr: "Kapat" })}>
          <Close size={16} />
        </button>

        <div className={css.sideBlock}>
          <h2 className={css.sideTitle}>{name ? t(name) : t({ en: "Frame", tr: "Kare" })}</h2>
          <dl className={css.metaList}>
            <dt>{t({ en: "Flow", tr: "Akış" })}</dt>
            <dd>{t(flow.name)}</dd>
            {cast && (
              <>
                <dt>Cast</dt>
                <dd>{cast.name}</dd>
              </>
            )}
            {setting && (
              <>
                <dt>{t({ en: "Setting", tr: "Ortam" })}</dt>
                <dd>{t(setting.name)}</dd>
              </>
            )}
            <dt>{t({ en: "Ratio", tr: "Oran" })}</dt>
            <dd>{job.ratio ?? "3:4"}</dd>
            <dt>{t({ en: "Made", tr: "Üretim" })}</dt>
            <dd>{fmtDate(job.createdAt, s.lang)}</dd>
            {f.versions && f.versions.length > 0 && (
              <>
                <dt>{t({ en: "Version", tr: "Sürüm" })}</dt>
                <dd>
                  v{f.versions.length + 1} · {t({ en: "earlier kept", tr: "öncekiler saklı" })}
                </dd>
              </>
            )}
          </dl>
          <p className={`${css.expiry} ${days <= 2 ? css.soon : ""}`}>
            {t({ en: `Leaves in ${days} days`, tr: `${days} gün sonra silinir` })}
          </p>
        </div>

        {/* judge (S-F-03/18/19/20) */}
        <div className={css.sideBlock}>
          <span className={css.label}>{t({ en: "Your verdict", tr: "Kararın" })}</span>
          {f.review === "refunded" || f.review === "declined" ? (
            <p className={css.reviewNote}>
              {f.review === "refunded"
                ? t({ en: "Reviewed · this frame's credit came back.", tr: "İncelendi · bu karenin kredisi iade edildi." })
                : t({ en: "Reviewed · no refund for this frame.", tr: "İncelendi · bu kare için iade yapılmadı." })}
            </p>
          ) : f.review === "pending" ? (
            <p className={css.reviewNote}>
              {t({
                en: "Sent for review. If we agree, this frame's credit comes back — we'll let you know either way.",
                tr: "İncelemeye gönderildi. Haklı bulunursan bu karenin kredisi iade edilir — sonuç ne olursa haber vereceğiz.",
              })}
            </p>
          ) : (
            <>
              <div className={css.verdict}>
                <button
                  className={f.liked === true ? css.on : undefined}
                  onClick={() => {
                    patchFrame(f.id, { liked: f.liked === true ? null : true });
                    setAskReason(false);
                  }}
                >
                  <ThumbUp size={15} /> {t({ en: "Keep", tr: "Beğendim" })}
                </button>
                <button className={askReason ? css.onNeg : undefined} onClick={() => setAskReason(!askReason)}>
                  <ThumbDown size={15} /> {t({ en: "Not right", tr: "Beğenmedim" })}
                </button>
              </div>
              {askReason && (
                <div className={`${css.reasons} fade-in`}>
                  <p className={css.small}>{t({ en: "What's off?", tr: "Sorun ne?" })}</p>
                  <div className={css.chips}>
                    {REASONS.map((r) => (
                      <button
                        key={r.id}
                        className={reasons.includes(r.id) ? css.on : undefined}
                        onClick={() => setReasons(reasons.includes(r.id) ? reasons.filter((x) => x !== r.id) : [...reasons, r.id])}
                      >
                        {t(r.label)}
                      </button>
                    ))}
                  </div>
                  {reasons.includes("other") && (
                    <input className={css.input} value={other} onChange={(e) => setOther(e.target.value)} placeholder={t({ en: "A few words", tr: "Birkaç kelime" })} />
                  )}
                  <button className={css.secondaryBtn} disabled={reasons.length === 0} onClick={sendReview}>
                    {t({ en: "Send for review", tr: "İncelemeye gönder" })}
                  </button>
                  <p className={css.small}>
                    {t({
                      en: "If the team agrees, the credit for this frame is refunded.",
                      tr: "Ekip haklı bulursa bu karenin kredisi iade edilir.",
                    })}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* actions (S-F-04…11) */}
        <div className={css.sideBlock}>
          <button className={css.primaryBtn} onClick={() => downloadImage(showImg, fileName(t(job.title), index), watermark)}>
            <Download /> {watermark ? t({ en: "Download · watermarked", tr: "İndir · filigranlı" }) : t({ en: "Download", tr: "İndir" })}
          </button>

          <div className={css.actionList}>
            <button className={panel === "edit" ? css.on : undefined} onClick={() => setPanel(panel === "edit" ? "none" : "edit")}>
              {t({ en: "Edit photo", tr: "Fotoğrafı düzenle" })} <span>1 {t({ en: "credit / try", tr: "kredi / deneme" })}</span>
            </button>
            {panel === "edit" && (
              <div className={`${css.chat} fade-in`}>
                {history.map((h, i) => (
                  <p key={i} className={css.chatLine}>
                    <span className={css.label}>{t({ en: "You", tr: "Sen" })}</span> {h.text}
                  </p>
                ))}
                {busy && <p className={css.small}>{t({ en: "Working on it…", tr: "Üzerinde çalışılıyor…" })}</p>}
                {suggest && !busy && (
                  <div className={css.suggestRow}>
                    <img src={suggest} alt="" />
                    <div>
                      <p className={css.small}>
                        {t({ en: "Like it? It replaces the frame. The original is kept as a version.", tr: "Beğendiysen kareyle yer değiştirir. Orijinal sürüm olarak saklanır." })}
                      </p>
                      <button className={css.secondaryBtn} onClick={useEdit}>
                        {t({ en: "Use it", tr: "Kullan" })}
                      </button>
                    </div>
                  </div>
                )}
                <div className={css.chatInput}>
                  <input
                    className={css.input}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendEdit()}
                    placeholder={t({ en: "What should change? e.g. collar up, hands in pockets", tr: "Ne değişsin? örn. yaka kalksın, eller cepte" })}
                    disabled={busy}
                  />
                  <button className={css.secondaryBtn} onClick={sendEdit} disabled={busy || !prompt.trim()}>
                    {t({ en: "Send", tr: "Gönder" })}
                  </button>
                </div>
              </div>
            )}

            <button className={panel === "recreate" ? css.on : undefined} onClick={() => setPanel(panel === "recreate" ? "none" : "recreate")}>
              {t({ en: "Recreate", tr: "Yeniden oluştur" })} <span>{job.creditPerFrame ?? 1} {t({ en: "credit", tr: "kredi" })}</span>
            </button>
            {panel === "recreate" && (
              <div className={`${css.chat} fade-in`}>
                <p className={css.small}>
                  {t({
                    en: "Same inputs, same cast, same setting and this frame's pose — a new take. This uses 1 credit.",
                    tr: "Aynı girdiler, aynı cast, aynı ortam ve bu karenin pozu — yeni bir çekim. 1 kredi yakar.",
                  })}
                </p>
                <button className={css.secondaryBtn} onClick={recreate} disabled={busy}>
                  {busy ? t({ en: "Recreating…", tr: "Yeniden oluşturuluyor…" }) : t({ en: "Recreate this frame", tr: "Bu kareyi yeniden oluştur" })}
                </button>
              </div>
            )}

            <button className={panel === "share" ? css.on : undefined} onClick={() => setPanel(panel === "share" ? "none" : "share")}>
              {t({ en: "Share to the Salon", tr: "Salon'da paylaş" })}
              {watermark ? <Lock size={11} /> : <span>{t({ en: "reviewed first", tr: "önce onay" })}</span>}
            </button>
            {panel === "share" && (
              <div className={`${css.chat} fade-in`}>
                {watermark ? (
                  <>
                    <p className={css.small}>
                      {t({
                        en: "Sharing opens with Creator. You can browse the Salon freely meanwhile.",
                        tr: "Paylaşım Creator üyelikte açılır. Bu arada Salon'u dilediğin gibi gezebilirsin.",
                      })}
                    </p>
                    <div className={css.rowBtns}>
                      <Link href={`/packages?from=${encodeURIComponent(`/jobs/${job.id}`)}`} className={css.textLink}>
                        {t({ en: "See packages", tr: "Paketlere bak" })}
                      </Link>
                      <button className={css.ghostBtn} onClick={() => setPanel("none")}>
                        {t({ en: "Just download", tr: "Sadece indir" })}
                      </button>
                    </div>
                  </>
                ) : shared ? (
                  <p className={css.reviewNote}>
                    {t({
                      en: "Sent. It goes live once the team approves it — we'll let you know. It won't expire with the job.",
                      tr: "Gönderildi. Ekip onaylayınca yayına girer — haber vereceğiz. İşle birlikte silinmez.",
                    })}
                  </p>
                ) : (
                  <>
                    <p className={css.label}>{t({ en: "What people will see", tr: "İnsanların göreceği" })}</p>
                    <div className={css.postPreview}>
                      <img src={f.src} alt="" />
                      <div>
                        <p className={css.postBrand}>{brand.trim() || t({ en: "Your brand", tr: "Markan" })}</p>
                        <p className={css.label}>
                          @{s.username || "liora"} · {t(ROLE_META[s.role].label)}
                        </p>
                        <p className={css.label}>
                          {cast?.name ?? "—"} · {t(flow.name)} · {fmtDate(job.createdAt, s.lang)}
                        </p>
                      </div>
                    </div>
                    {!s.brand && (
                      <label className={css.fieldLabel}>
                        <span className={css.label}>{t({ en: "Brand name · required", tr: "Marka adı · zorunlu" })}</span>
                        <input className={css.input} value={brand} onChange={(e) => setBrand(e.target.value)} placeholder={t({ en: "No brand? Your own name works", tr: "Markan yok mu? Kendi adın da olur" })} />
                        <span className={css.small}>{t({ en: "Saved to your profile too.", tr: "Profiline de yazılır." })}</span>
                      </label>
                    )}
                    <label className={css.fieldLabel}>
                      <span className={css.label}>{t({ en: "Where it's published · optional", tr: "Yayın linki · isteğe bağlı" })}</span>
                      <input className={css.input} value={pubLink} onChange={(e) => setPubLink(e.target.value)} placeholder="https://" />
                    </label>
                    <button className={css.secondaryBtn} onClick={share} disabled={!brand.trim()}>
                      {t({ en: "Send for approval", tr: "Onaya gönder" })}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
