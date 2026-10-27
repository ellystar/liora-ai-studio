"use client";

import Link from "next/link";
import { useState, type CSSProperties } from "react";
import { ANGLES, CASTS, OWN_SETTINGS, RATIOS, ROLE_META, SETTINGS, type Cast } from "@/lib/data";
import { useAtelier } from "@/lib/store";
import { Arrow, Check, Lock } from "../icons";
import { ConceptShell } from "./Chrome";
import { canUse, useConcept, type CStep } from "./useConcept";
import base from "./Concept.module.css";
import css from "./LightTable.module.css";

/* Concept A — the light table.
   The outcome is visible from the first decision: every choice is laid on
   the table as a print, so the user composes a frame instead of filling a
   form. On start, the composition develops into the frames it became. */

const STATIONS = [
  { id: "product", label: { en: "Product", tr: "Ürün" } },
  { id: "cast", label: { en: "Cast", tr: "Cast" } },
  { id: "setting", label: { en: "Setting", tr: "Ortam" } },
  { id: "framing", label: { en: "Frames", tr: "Kareler" } },
  { id: "result", label: { en: "Result", tr: "Sonuç" } },
] as const;

const ORDER: CStep[] = ["cast", "setting", "ready", "running", "done"];

export function LightTable({ cast }: { cast?: string }) {
  const { t, s } = useAtelier();
  const c = useConcept(cast);
  const [preview, setPreview] = useState<string | null>(null);
  const [locked, setLocked] = useState<Cast | null>(null);

  const at = ORDER.indexOf(c.step);
  const [seenStep, setSeenStep] = useState(c.step);
  if (seenStep !== c.step) {
    setSeenStep(c.step);
    setPreview(null);
  }
  const stationState = (id: (typeof STATIONS)[number]["id"]) => {
    const idx = { product: -1, cast: 0, setting: 1, framing: 2, result: 3 }[id];
    if (c.step === "done") return "done";
    if (c.step === "running") return id === "result" ? "now" : "done";
    if (idx < at) return "done";
    if (idx === at) return "now";
    return "todo";
  };

  /* hover previews on the table; falls back to what is chosen */
  const allSettings = [...SETTINGS, ...OWN_SETTINGS];
  const shownCast = (c.step === "cast" && CASTS.find((x) => x.id === preview)) || c.cast;
  const shownSetting = (c.step === "setting" && allSettings.find((x) => x.id === preview)) || c.setting;
  const cost = c.angles.length;
  const developing = c.step === "running" || c.step === "done";

  return (
    <ConceptShell active="a">
      <div className={css.a}>
        {/* ── the thread: progress, summary and way back, in one line ── */}
        <ol className={`${css.thread} ${developing ? css.sewing : ""}`}>
          {STATIONS.map((st, i) => {
            const state = stationState(st.id);
            const back = state === "done" && !developing && (st.id === "cast" || st.id === "setting");
            return (
              <li key={st.id} className={`${css.station} ${css[state] ?? ""}`} style={{ "--i": i } as CSSProperties}>
                {i > 0 && <span className={css.stitch} aria-hidden />}
                <button disabled={!back} onClick={() => back && c.setStep(st.id as CStep)}>
                  <span className={css.dot} />
                  <span className={css.stLabel}>{t(st.label)}</span>
                  {st.id === "product" && <img className={css.stThumb} src="/img/product-coat-front.jpg" alt="" />}
                  {st.id === "cast" && c.cast && state !== "todo" && <img className={`${css.stThumb} ${css.round}`} src={c.cast.img} alt="" />}
                  {st.id === "setting" && c.setting && state === "done" && <img className={`${css.stThumb} ${css.wide}`} src={c.setting.img} alt="" />}
                  {st.id === "framing" && state === "done" && <span className={base.num}>{c.angles.length}</span>}
                  {st.id === "result" && developing && (
                    <span className={base.num}>
                      {c.done}/{c.angles.length}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ol>

        <div className={css.body}>
          {/* ── the table ── */}
          <section className={`${css.table} ${developing ? css.dim : ""}`} aria-label={t({ en: "Composition", tr: "Kompozisyon" })}>
            <div className={css.mat} aria-hidden />
            <div className={css.plateHead}>
              <span>{t({ en: "Composition", tr: "Kompozisyon" })}</span>
              <span className={base.num}>
                {cost} {t({ en: "frames", tr: "kare" })} · {c.ratio}
              </span>
            </div>

            <figure className={`${css.print} ${css.pSetting} ${shownSetting ? "" : css.empty}`}>
              {shownSetting ? (
                <>
                  <img key={shownSetting.id} src={shownSetting.img} alt="" />
                  <figcaption>
                    <span className={base.num}>03</span> {t(shownSetting.name)}
                    {preview && c.step === "setting" && preview !== c.settingId && <em>{t({ en: "preview", tr: "önizleme" })}</em>}
                  </figcaption>
                </>
              ) : (
                <span className={css.slot}>
                  <b>{t({ en: "Setting", tr: "Ortam" })}</b>
                  {t({ en: "next", tr: "sırada" })}
                </span>
              )}
            </figure>

            <figure className={`${css.print} ${css.pCast} ${shownCast ? "" : css.empty}`}>
              {shownCast ? (
                <>
                  <img key={shownCast.id} src={shownCast.img} alt="" />
                  <figcaption>
                    <span className={base.num}>02</span> {shownCast.name}
                    {preview && c.step === "cast" && preview !== c.castId && <em>{t({ en: "preview", tr: "önizleme" })}</em>}
                  </figcaption>
                </>
              ) : (
                <span className={css.slot}>
                  <b>Cast</b>
                </span>
              )}
            </figure>

            <div className={css.pProduct}>
              <figure className={`${css.print} ${css.behind2}`}>
                <img src="/img/product-coat-detail.jpg" alt="" />
              </figure>
              <figure className={`${css.print} ${css.behind1}`}>
                <img src="/img/product-coat-back.jpg" alt="" />
              </figure>
              <figure className={css.print}>
                <img src="/img/product-coat-front.jpg" alt="" />
                <figcaption>
                  <span className={base.num}>01</span> {t({ en: "Camel coat · 5", tr: "Kamel kaban · 5" })}
                </figcaption>
              </figure>
            </div>

            <div className={css.frames} aria-label={t({ en: "Frames to be made", tr: "Üretilecek kareler" })}>
              {c.angles.map((a) => (
                <span key={a}>
                  <i />
                  {t(ANGLES.find((x) => x.id === a)!.label)}
                </span>
              ))}
            </div>
          </section>

          {/* the composition, developed into the frames it became */}
          {developing && (
            <div className={css.develop} aria-live="polite">
              {c.outputs.map((o, i) => (
                <figure key={o.id} className={`${css.out} ${i < c.done ? css.outIn : ""}`}>
                  <div className={css.outImg}>
                    <img src={o.out} alt="" />
                  </div>
                  <figcaption>
                    <span className={base.num}>{String(i + 1).padStart(2, "0")}</span> {t(o.label)}
                  </figcaption>
                </figure>
              ))}
            </div>
          )}

          {/* ── the decision ── */}
          <aside className={css.panel}>
            {c.step === "cast" && (
              <>
                <Head no="02" label="Cast" q={t({ en: "Who wears it?", tr: "Kim giyiyor?" })} help={t({ en: "Hover to try them on the table.", tr: "Masada denemek için üzerine gel." })} />
                <div className={css.tabs}>
                  <button className={css.tabOn}>
                    {t({ en: "Liora cast", tr: "Liora kadrosu" })} <span className={base.num}>{CASTS.length}</span>
                  </button>
                  <button className={css.tabLocked} title={t({ en: "Opens with Partner", tr: "Partner'da açılır" })}>
                    <Lock size={11} /> {t({ en: "Your cast", tr: "Kadron" })}
                  </button>
                </div>
                {locked && (
                  <p className={css.upsell}>
                    {locked.name} {t({ en: "opens with", tr: "şu üyelikte açılır:" })} {t(ROLE_META[locked.minRole].label)}.
                    <button onClick={() => setLocked(null)}>{t({ en: "Choose an open cast", tr: "Açık bir cast seç" })}</button>
                  </p>
                )}
                <div className={css.grid} onMouseLeave={() => setPreview(null)}>
                  {CASTS.map((x) => {
                    const ok = canUse(s.role, x.minRole);
                    const sel = c.castId === x.id;
                    return (
                      <button
                        key={x.id}
                        className={`${css.card} ${sel ? css.sel : ""} ${ok ? "" : css.lockedCard}`}
                        onMouseEnter={() => ok && setPreview(x.id)}
                        onFocus={() => ok && setPreview(x.id)}
                        onClick={() => (ok ? (c.setCastId(x.id), setLocked(null)) : setLocked(x))}
                        aria-pressed={sel}
                      >
                        <span className={css.cardImg}>
                          <img src={x.img} alt="" />
                          {sel && (
                            <span className={css.check}>
                              <Check />
                            </span>
                          )}
                          {!ok && (
                            <span className={css.lockChip}>
                              <Lock size={10} /> {t(ROLE_META[x.minRole].label)}
                            </span>
                          )}
                        </span>
                        <span className={css.cardName}>{x.name}</span>
                        <span className={css.cardNote}>{t(x.note)}</span>
                      </button>
                    );
                  })}
                </div>
                <Foot cost={cost}>
                  <button className={base.primary} disabled={!c.castId} onClick={() => c.setStep("setting")}>
                    {t({ en: `Continue with ${c.cast?.name ?? ""}`, tr: `${c.cast?.name ?? ""} ile devam et` })} <Arrow />
                  </button>
                </Foot>
              </>
            )}

            {c.step === "setting" && (
              <>
                <Head no="03" label={t({ en: "Setting", tr: "Ortam" })} q={t({ en: "Where is it shot?", tr: "Nerede çekiliyor?" })} help={t({ en: "Hover to lay it on the table.", tr: "Masaya koymak için üzerine gel." })} />
                <div className={`${css.grid} ${css.gridWide}`} onMouseLeave={() => setPreview(null)}>
                  {SETTINGS.map((x) => {
                    const ok = canUse(s.role, x.minRole);
                    const sel = c.settingId === x.id;
                    return (
                      <button
                        key={x.id}
                        className={`${css.card} ${sel ? css.sel : ""} ${ok ? "" : css.lockedCard}`}
                        onMouseEnter={() => ok && setPreview(x.id)}
                        onFocus={() => ok && setPreview(x.id)}
                        onClick={() => ok && c.setSettingId(x.id)}
                        aria-pressed={sel}
                      >
                        <span className={`${css.cardImg} ${css.landscape}`}>
                          <img src={x.img} alt="" />
                          {sel && (
                            <span className={css.check}>
                              <Check />
                            </span>
                          )}
                          {!ok && (
                            <span className={css.lockChip}>
                              <Lock size={10} /> {t(ROLE_META[x.minRole].label)}
                            </span>
                          )}
                        </span>
                        <span className={css.cardName}>{t(x.name)}</span>
                      </button>
                    );
                  })}
                </div>
                <p className={css.lockedLine}>
                  <Lock size={11} />
                  {t({ en: "Describe or upload your own setting with Partner.", tr: "Kendi ortamını tarif etmek ya da yüklemek Partner'da açılır." })}
                </p>
                <Foot cost={cost} back={() => c.setStep("cast")}>
                  <button className={base.primary} disabled={!c.settingId} onClick={() => c.setStep("ready")}>
                    {c.setting ? t({ en: "Continue", tr: "Devam et" }) : t({ en: "Choose a setting", tr: "Bir ortam seç" })}{" "}
                    <Arrow />
                  </button>
                </Foot>
              </>
            )}

            {c.step === "ready" && (
              <>
                <Head no="04" label={t({ en: "Frames", tr: "Kareler" })} q={s.lang === "tr" ? "Masa hazır." : "The table is set."} help={t({ en: "Sensible defaults — change only what you need.", tr: "Makul varsayılanlar — yalnızca gerekeni değiştir." })} />
                <div className={css.opts}>
                  <div className={css.opt}>
                    <span className={css.optLabel}>{t({ en: "Frames", tr: "Kareler" })}</span>
                    <div className={css.chips}>
                      {ANGLES.map((a) => (
                        <button key={a.id} className={c.angles.includes(a.id) ? css.chipOn : undefined} onClick={() => c.toggleAngle(a.id)} aria-pressed={c.angles.includes(a.id)}>
                          {t(a.label)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className={css.opt}>
                    <span className={css.optLabel}>{t({ en: "Ratio", tr: "Oran" })}</span>
                    <div className={css.chips}>
                      {RATIOS.map((r) => (
                        <button key={r} className={c.ratio === r ? css.chipOn : undefined} onClick={() => c.setRatio(r)} aria-pressed={c.ratio === r}>
                          <span className={base.num}>{r}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className={css.cost}>
                  <span className={css.costBig}>
                    {cost} {t({ en: "credits", tr: "kredi" })}
                  </span>
                  <span className={css.costSub}>
                    {cost} {t({ en: "frames × 1 credit · balance after", tr: "kare × 1 kredi · sonraki bakiye" })} <span className={base.num}>{s.credits - cost}</span>
                  </span>
                </div>
                <Foot back={() => c.setStep("setting")}>
                  <button className={base.primary} onClick={() => c.start()}>
                    {t({ en: "Start the system", tr: "Sistemi başlat" })} <Arrow />
                  </button>
                </Foot>
              </>
            )}

            {c.step === "running" && (
              <Head
                no="05"
                label={t({ en: "Result", tr: "Sonuç" })}
                q={t({ en: "Developing.", tr: "Banyo ediliyor." })}
                help={t({ en: "You can close this screen — we'll let you know.", tr: "Bu ekranı kapatabilirsin — haber vereceğiz." })}
              >
                <p className={css.progress}>
                  <span className={base.num}>
                    {c.done} / {c.angles.length}
                  </span>
                  <span className={css.track}>
                    <span style={{ width: `${(c.done / c.angles.length) * 100}%` }} />
                  </span>
                </p>
              </Head>
            )}

            {c.step === "done" && (
              <>
                <Head
                  no="05"
                  label={t({ en: "Result", tr: "Sonuç" })}
                  q={t({ en: `${c.angles.length} frames are ready.`, tr: `${c.angles.length} kare hazır.` })}
                  help={t({ en: "Judge them on the dark table.", tr: "Onları koyu masada değerlendir." })}
                />
                <Foot back={c.reset} backLabel={t({ en: "Set the table again", tr: "Masayı yeniden kur" })}>
                  <Link href="/jobs/j-coat" className={base.primary}>
                    {t({ en: "See the frames", tr: "Karelere git" })} <Arrow />
                  </Link>
                </Foot>
              </>
            )}
          </aside>
        </div>
      </div>
    </ConceptShell>
  );
}

function Head({ no, label, q, help, children }: { no: string; label: string; q: string; help?: string; children?: React.ReactNode }) {
  return (
    <header className={css.head}>
      <p className={css.stepNo}>
        <span className={base.num}>{no}</span> {label}
      </p>
      <h1 className={css.q}>{q}</h1>
      {help && <p className={css.help}>{help}</p>}
      {children}
    </header>
  );
}

function Foot({ children, cost, back, backLabel }: { children: React.ReactNode; cost?: number; back?: () => void; backLabel?: string }) {
  const { t } = useAtelier();
  return (
    <footer className={css.foot}>
      {children}
      {back && (
        <button className={base.ghostBtn} onClick={back}>
          {backLabel ?? t({ en: "Back", tr: "Geri" })}
        </button>
      )}
      {cost !== undefined && (
        <span className={css.footCost}>
          <span className={base.num}>{cost}</span> {t({ en: "frames", tr: "kare" })} · <span className={base.num}>{cost}</span> {t({ en: "credits", tr: "kredi" })}
        </span>
      )}
    </footer>
  );
}
