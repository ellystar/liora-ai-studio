"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { ANGLES, flowBySlug, settingById, type Frame, type Job } from "@/lib/data";
import { findCast, fmtDate, useAtelier } from "@/lib/store";
import { Masthead } from "../chrome/Masthead";
import { Seam } from "../Seam";
import { Arrow, ArrowLeft, Download, ThumbDown, ThumbUp } from "../icons";
import { downloadAll, fileName } from "@/lib/download";
import { Detail } from "./Detail";
import { setupHref } from "./Jobs";
import css from "./Review.module.css";

/* what a frame came from — the seam reveals the result over it */
export const inputFor = (job: Job) =>
  job.flow === "recast"
    ? "/img/input-onmodel.jpg"
    : job.flow === "ghost"
      ? "/img/input-flat.jpg"
      : job.flow === "restyle"
        ? "/img/out-front-edit.jpg"
        : "/img/product-coat-front.jpg";

/* a frame's name: its angle, or the label it was made with */
export const frameName = (f: Frame) => ANGLES.find((a) => a.id === f.angle)?.label ?? f.label;

/* The result (S-F-01…17): the frames on the review ink, large; one line of
   what made them; three actions. A frame opens into its detail. */
export function ReviewSurface({ id }: { id: string }) {
  const { s, t, set, dispatch, ready } = useAtelier();
  const [open, setOpen] = useState<number | null>(null);
  const [retrying, setRetrying] = useState<string[]>([]);
  const [downloaded, setDownloaded] = useState(false);
  const [thanked, setThanked] = useState<string | null>(null); // a like says thank you, briefly
  const job = s.jobs.find((j) => j.id === id);

  /* the seam reveal happens once per job — the first time it is judged */
  const [reveal] = useState(() => (job ? !job.seen : false));
  useEffect(() => {
    if (!job || job.seen || job.status !== "done") return;
    const tm = setTimeout(() => dispatch({ type: "patchJob", id: job.id, patch: { seen: true } }), 2600);
    return () => clearTimeout(tm);
  }, [job, dispatch]);

  if (!ready) return <main className={`${css.page} ink`} />;

  const shell = (body: ReactNode) => (
    <main className={`${css.page} ink`}>
      <Masthead section={{ en: "Jobs", tr: "İşlerim" }} />
      {body}
    </main>
  );

  if (!job) {
    return shell(
      <div className={css.missing}>
        <h1 className={css.title}>{t({ en: "This job is no longer here.", tr: "Bu iş artık burada değil." })}</h1>
        <p className={css.line}>{t({ en: "Frames are kept for seven days.", tr: "Kareler yedi gün saklanır." })}</p>
        <Link href="/jobs" className={css.textLink}>
          {t({ en: "All jobs", tr: "Tüm işler" })} <Arrow size={12} />
        </Link>
      </div>,
    );
  }

  const flow = flowBySlug(job.flow)!;
  const cast = findCast(s, job.castId);
  const setting = settingById(job.settingId);
  const watermark = s.role === "explorer";
  const days = job.expiresInDays ?? 7;
  const running = job.status === "running";
  const frames = running ? (job.planned ?? []) : job.frames;
  const ok = job.frames.filter((f) => !f.failed);
  const failed = job.frames.length - ok.length;
  const turnable = (job.flow === "campaign" || job.flow === "restyle") && !running;
  const n = Math.max(1, frames.length);

  const patchFrame = (fid: string, patch: Partial<Frame>) =>
    dispatch({ type: "patchJob", id: job.id, patch: { frames: job.frames.map((f) => (f.id === fid ? { ...f, ...patch } : f)) } });

  const retry = (f: Frame) => {
    setRetrying((r) => [...r, f.id]);
    setTimeout(() => {
      patchFrame(f.id, { failed: false, src: ANGLES.find((a) => a.id === f.angle)?.out ?? f.src });
      dispatch({ type: "spend", amount: job.creditPerFrame ?? 1 });
      setRetrying((r) => r.filter((x) => x !== f.id));
    }, 2600);
  };

  const input = inputFor(job);

  return shell(
    <div className={css.body} style={{ "--n": job.video ? 1 : Math.min(4, n) } as CSSProperties}>
      <header className={css.top}>
        <div>
          <Link href="/jobs" className={css.back}>
            <ArrowLeft size={12} /> {t({ en: "Jobs", tr: "İşlerim" })}
          </Link>
          <h1 className={css.title}>{t(job.title)}</h1>
          <p className={css.line}>
            {t(flow.name)}
            {cast && <> · {cast.name}</>}
            {setting && <> · {t(setting.name)}</>} · {fmtDate(job.createdAt, s.lang)}
            {!running && <span className={days <= 2 ? css.soon : undefined}> · {t({ en: `leaves in ${days} days`, tr: `${days} gün sonra silinir` })}</span>}
          </p>
          {/* what a Partner described for this run — kept from here, offered next time under "my themes / my poses" */}
          {!running && job.custom && (job.custom.setting || job.custom.pose) && (
            <p className={css.keepLine}>
              {job.custom.setting && (
                <span>
                  “{job.custom.setting}”
                  {s.themes.some((x) => x.name.en === job.custom!.setting) ? (
                    <em>{t({ en: "Kept in your themes", tr: "Temalarına kaydedildi" })}</em>
                  ) : (
                    <button className={css.secondaryBtn} onClick={() => set({ themes: [...s.themes, { id: `theme-${job.id}`, name: { en: job.custom!.setting!, tr: job.custom!.setting! }, img: frames[0]?.src ?? "/img/flow/set-library.jpg" }] })}>
                      {t({ en: "Keep the background", tr: "Arkaplanı kaydet" })}
                    </button>
                  )}
                </span>
              )}
              {job.custom.pose && (
                <span>
                  “{job.custom.pose}”
                  {s.poses.some((x) => x.name === job.custom!.pose) ? (
                    <em>{t({ en: "Kept in your poses", tr: "Pozlarına kaydedildi" })}</em>
                  ) : (
                    <button className={css.secondaryBtn} onClick={() => set({ poses: [...s.poses, { id: `pose-${job.id}`, name: job.custom!.pose!, img: frames[frames.length - 1]?.src ?? "/img/salon/r1-s.jpg" }] })}>
                      {t({ en: "Keep the pose", tr: "Pozu kaydet" })}
                    </button>
                  )}
                </span>
              )}
            </p>
          )}
        </div>
        <div className={css.actions}>
          {running ? (
            <span className={css.making}>
              {t({ en: `Making · ${job.progress ?? 0}/${frames.length}`, tr: `Üretiliyor · ${job.progress ?? 0}/${frames.length}` })}
            </span>
          ) : (
            <>
              {/* real buttons, not lines of text that only reveal themselves on hover (Elif) */}
              {turnable && (
                <Link href="/concepts/e/turn?from=campaign" className={css.secondaryBtn}>
                  180° video
                </Link>
              )}
              <Link href={job.setupId ? `${setupHref(job.flow)}?draft=${job.setupId}` : setupHref(job.flow)} className={css.secondaryBtn}>
                {t({ en: "Open the setup", tr: "Kurulumu aç" })}
              </Link>
              <button
                className={css.primary}
                onClick={() => {
                  setDownloaded(true);
                  if (!job.video) void downloadAll(ok.map((f, i) => ({ src: f.src, name: fileName(t(job.title), i) })), watermark);
                }}
              >
                <Download size={13} /> {downloaded ? t({ en: "Downloaded", tr: "İndirildi" }) : job.video ? t({ en: "Download", tr: "İndir" }) : t({ en: "Download all", tr: "Tümünü indir" })}
              </button>
            </>
          )}
        </div>
      </header>

      {watermark && !running && (
        <p className={css.note}>
          {t({ en: "Watermarked on the free plan.", tr: "Ücretsiz planda filigranlı." })}
          <Link href={`/packages?from=${encodeURIComponent(`/jobs/${job.id}`)}`}>
            {t({ en: "Clean with Basic", tr: "Basic'te temiz" })} <Arrow size={11} />
          </Link>
        </p>
      )}
      {failed > 0 && <p className={css.note}>{t({ en: "No credit used for the missing frame.", tr: "Gelmeyen kare için kredi yakılmadı." })}</p>}

      <section className={css.frames} aria-label={t({ en: "Frames", tr: "Kareler" })}>
        {job.video ? (
          <figure className={css.frame}>
            <div className={css.shot}>
              {running ? (
                <span className={css.waiting} />
              ) : (
                <span className={css.spin}>
                  {job.video.map((src, k) => (
                    <img key={k} src={src} alt="" style={{ "--k": k } as CSSProperties} />
                  ))}
                </span>
              )}
              {watermark && !running && <span className={css.wm} aria-hidden />}
            </div>
            <figcaption className={css.cap}>
              <span>180° · 5 {t({ en: "s", tr: "sn" })} · 1080p</span>
            </figcaption>
          </figure>
        ) : (
          frames.map((f, i) => {
            const busy = retrying.includes(f.id);
            const name = frameName(f);
            return (
              <figure key={f.id} className={css.frame} style={{ animationDelay: `${i * 120}ms` }}>
                {running && i >= (job.progress ?? 0) ? (
                  <div className={css.shot}>
                    <span className={css.waiting} />
                  </div>
                ) : f.failed ? (
                  <div className={`${css.shot} ${css.failed}`}>
                    {busy ? (
                      <span className={css.waiting} />
                    ) : (
                      <div className={css.failBody}>
                        <p>{t({ en: "Didn't arrive", tr: "Gelmedi" })}</p>
                        <button className={css.secondaryBtn} onClick={() => retry(f)}>
                          {t({ en: "Try again", tr: "Yeniden dene" })} · {job.creditPerFrame ?? 1} {t({ en: "credit", tr: "kredi" })}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <button className={css.shot} onClick={() => !running && setOpen(i)} aria-label={t({ en: "Open frame", tr: "Kareyi aç" })}>
                    {reveal && !running ? <Seam before={input} after={f.src} mode="reveal" delay={400 + i * 380} className={css.seam} /> : <img src={f.src} alt="" />}
                    {watermark && <span className={css.wm} aria-hidden />}
                    {f.versions && f.versions.length > 0 && <span className={css.version}>v{f.versions.length + 1}</span>}
                  </button>
                )}
                <figcaption className={css.cap}>
                  <span>
                    <span className={css.num}>{String(i + 1).padStart(2, "0")}</span> {name ? t(name) : ""}
                  </span>
                  {!f.failed && !running && (
                    <span className={css.rate}>
                      <button
                        className={f.liked === true ? css.on : undefined}
                        onClick={() => {
                          const like = f.liked !== true;
                          patchFrame(f.id, { liked: like ? true : null });
                          if (like) {
                            setThanked(f.id);
                            window.setTimeout(() => setThanked((x) => (x === f.id ? null : x)), 2600);
                          }
                        }}
                        aria-label={t({ en: "Keep", tr: "Beğendim" })}
                        aria-pressed={f.liked === true}
                      >
                        <ThumbUp size={14} />
                      </button>
                      <button className={f.liked === false ? css.onNeg : undefined} onClick={() => setOpen(i)} aria-label={t({ en: "Not right", tr: "Beğenmedim" })}>
                        <ThumbDown size={14} />
                      </button>
                    </span>
                  )}
                  {thanked === f.id && (
                    <span className={css.thanks} role="status">
                      {t({ en: "Thank you — we learn from what you keep.", tr: "Teşekkürler; beğendiklerinden öğreniyoruz." })}
                    </span>
                  )}
                </figcaption>
              </figure>
            );
          })
        )}
      </section>

      {open !== null && <Detail job={job} index={open} onIndex={setOpen} onClose={() => setOpen(null)} patchFrame={patchFrame} />}
    </div>,
  );
}
