"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ANGLES, CASTS, RATIOS, ROLE_META, SAMPLE_PRO, SETTINGS, SLOTS } from "@/lib/data";
import { useAtelier } from "@/lib/store";
import { Seam } from "../Seam";
import { Arrow, Check, Chevron, Lock } from "../icons";
import { ConceptShell } from "./Chrome";
import { canUse, useConcept, type CStep } from "./useConcept";
import base from "./Concept.module.css";
import css from "./TechPack.module.css";

/* Concept B — the tech pack.
   No wizard. Every decision lives on one editorial sheet, like a
   production document a studio would print. Choosing is enough: the
   section closes on its answer and the next one opens. The thread runs
   down the margin and is sewn, section by section, when the run starts. */

type Sec = "product" | "cast" | "setting" | "frames" | "result";
const SECS: Sec[] = ["product", "cast", "setting", "frames", "result"];

export function TechPack() {
  const { t, s } = useAtelier();
  const c = useConcept();
  const scroller = useRef<HTMLDivElement>(null);
  const refs = useRef<Partial<Record<Sec, HTMLElement | null>>>({});
  const [editing, setEditing] = useState<Sec | null>(null);

  const open: Sec | null =
    editing ?? (c.step === "cast" ? "cast" : c.step === "setting" ? "setting" : c.step === "ready" ? "frames" : null);

  const state = (sec: Sec): "done" | "open" | "todo" => {
    if (sec === "product") return "done";
    if (open === sec) return "open";
    const order: Record<Sec, number> = { product: 0, cast: 1, setting: 2, frames: 3, result: 4 };
    const at: Record<CStep, number> = { cast: 1, setting: 2, ready: 3, running: 4, done: 5 };
    return order[sec] < at[c.step] ? "done" : "todo";
  };

  const decided = [c.castId && c.step !== "cast", !!c.settingId && c.step !== "setting", c.step === "running" || c.step === "done"].filter(Boolean).length + 1;
  const developing = c.step === "running" || c.step === "done";

  /* bring the open section into view as the sheet advances */
  useEffect(() => {
    const target = developing ? "result" : open;
    if (!target) return;
    const el = refs.current[target];
    const box = scroller.current;
    if (el && box) {
      const id = setTimeout(() => box.scrollTo({ top: el.offsetTop - 24, behavior: "smooth" }), 220);
      return () => clearTimeout(id);
    }
  }, [open, developing]);

  const pickCast = (id: string) => {
    c.setCastId(id);
    setEditing(null);
    if (c.step === "cast") setTimeout(() => c.setStep("setting"), 450);
  };
  const pickSetting = (id: string) => {
    c.setSettingId(id);
    setEditing(null);
    if (c.step === "setting") setTimeout(() => c.setStep("ready"), 450);
  };

  const cost = c.angles.length;

  return (
    <ConceptShell active="b">
      <div className={css.b} ref={scroller}>
        <div className={css.sheet}>
          {/* ── masthead ── */}
          <header className={css.mast}>
            <div className={css.gutter} aria-hidden>
              <span className={css.mastMark}>{t({ en: "Sheet", tr: "Föy" })}</span>
            </div>
            <div className={css.mastBody}>
              <p className={css.kicker}>
                {t({ en: "Sheet no.", tr: "Föy no." })} <span className={base.num}>0147</span> · {t({ en: "Camel wool coat", tr: "Kamel yün kaban" })} ·{" "}
                <span className={base.num}>28.09</span>
              </p>
              <h1 className={css.title}>{t({ en: "From Ghost to Campaign", tr: "Ghost'tan Kampanyaya" })}</h1>
              <p className={css.lede}>
                {t({
                  en: "Your product, on a cast you choose, in a setting you pick. Every decision stays on this sheet — change any of them, any time.",
                  tr: "Ürünün, seçtiğin bir cast'in üzerinde, seçtiğin bir ortamda. Bütün kararlar bu föyde durur — istediğini, istediğin an değiştir.",
                })}
              </p>
            </div>
          </header>

          {/* ── 01 product ── */}
          <Row sec="product" no="01" st={state("product")} sewing={developing} setRef={(el) => { refs.current.product = el; }}>
            <div className={css.compact}>
              <div className={css.compactHead}>
                <h2 className={css.h}>{t({ en: "Product", tr: "Ürün" })}</h2>
                <p className={css.sub}>{t({ en: "5 images · placement checked", tr: "5 görsel · yerleşim onaylandı" })}</p>
                <button className={css.edit}>{t({ en: "Edit", tr: "Düzenle" })}</button>
              </div>
              <div className={css.productStrip}>
                {SAMPLE_PRO.map((u) => (
                  <figure key={u.id}>
                    <img src={u.src} alt="" />
                    <figcaption>{t(SLOTS.find((x) => x.id === u.slot)!.label)}</figcaption>
                  </figure>
                ))}
              </div>
            </div>
          </Row>

          {/* ── 02 cast ── */}
          <Row sec="cast" no="02" st={state("cast")} sewing={developing} setRef={(el) => { refs.current.cast = el; }}>
            {state("cast") === "open" ? (
              <>
                <h2 className={css.q}>{t({ en: "Who wears it?", tr: "Kim giyiyor?" })}</h2>
                <p className={css.sub}>{t({ en: "Choosing is enough — the sheet moves on.", tr: "Seçmen yeterli — föy kendiliğinden ilerler." })}</p>
                <Strip>
                  {CASTS.map((x) => {
                    const ok = canUse(s.role, x.minRole);
                    const sel = c.castId === x.id;
                    return (
                      <button key={x.id} className={`${css.portrait} ${sel ? css.sel : ""} ${ok ? "" : css.locked}`} onClick={() => ok && pickCast(x.id)} aria-pressed={sel} aria-disabled={!ok}>
                        <span className={css.img}>
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
                        <span className={css.name}>{x.name}</span>
                        <span className={css.note}>{t(x.note)}</span>
                      </button>
                    );
                  })}
                </Strip>
                <p className={css.lockedLine}>
                  <Lock size={11} /> {t({ en: "Your own cast — designed once, reused on every sheet — opens with Partner.", tr: "Kendi kadron — bir kez tasarla, her föyde kullan — Partner'da açılır." })}
                </p>
              </>
            ) : (
              <Answer
                title="Cast"
                value={c.cast?.name ?? "—"}
                note={c.cast ? t(c.cast.note) : ""}
                img={c.cast?.img}
                portrait
                onChange={!developing ? () => setEditing("cast") : undefined}
              />
            )}
          </Row>

          {/* ── 03 setting ── */}
          <Row sec="setting" no="03" st={state("setting")} sewing={developing} setRef={(el) => { refs.current.setting = el; }}>
            {state("setting") === "open" ? (
              <>
                <h2 className={css.q}>{t({ en: "Where is it shot?", tr: "Nerede çekiliyor?" })}</h2>
                <Strip>
                  {SETTINGS.map((x) => {
                    const ok = canUse(s.role, x.minRole);
                    const sel = c.settingId === x.id;
                    return (
                      <button key={x.id} className={`${css.place} ${sel ? css.sel : ""} ${ok ? "" : css.locked}`} onClick={() => ok && pickSetting(x.id)} aria-pressed={sel}>
                        <span className={css.img}>
                          <img src={x.img} alt="" />
                          {sel && (
                            <span className={css.check}>
                              <Check />
                            </span>
                          )}
                        </span>
                        <span className={css.name}>{t(x.name)}</span>
                      </button>
                    );
                  })}
                </Strip>
              </>
            ) : state("setting") === "done" ? (
              <Answer
                title={t({ en: "Setting", tr: "Ortam" })}
                value={c.setting ? t(c.setting.name) : "—"}
                img={c.setting?.img}
                onChange={!developing ? () => setEditing("setting") : undefined}
              />
            ) : (
              <Todo title={t({ en: "Setting", tr: "Ortam" })} note={t({ en: "Opens once the cast is chosen", tr: "Cast seçilince açılır" })} imgs={SETTINGS.slice(0, 4).map((x) => x.img)} />
            )}
          </Row>

          {/* ── 04 frames & ratio ── */}
          <Row sec="frames" no="04" st={state("frames")} sewing={developing} setRef={(el) => { refs.current.frames = el; }}>
            {state("frames") === "open" ? (
              <>
                <h2 className={css.q}>{t({ en: "Frames and ratio.", tr: "Kareler ve oran." })}</h2>
                <p className={css.sub}>{t({ en: "Defaults are set. Change only what you need.", tr: "Varsayılanlar hazır. Yalnızca gerekeni değiştir." })}</p>
                <div className={css.framesRow}>
                  {ANGLES.map((a) => {
                    const on = c.angles.includes(a.id);
                    return (
                      <button key={a.id} className={`${css.frameOpt} ${on ? css.frameOn : ""}`} onClick={() => c.toggleAngle(a.id)} aria-pressed={on}>
                        <span className={css.frameBox}>{on && <span className={base.num}>{String(c.angles.indexOf(a.id) + 1).padStart(2, "0")}</span>}</span>
                        {t(a.label)}
                      </button>
                    );
                  })}
                  <span className={css.divider} />
                  {RATIOS.map((r) => (
                    <button key={r} className={`${css.ratioOpt} ${c.ratio === r ? css.frameOn : ""}`} onClick={() => c.setRatio(r)} aria-pressed={c.ratio === r}>
                      <span className={css.ratioBox} style={{ aspectRatio: r.replace(":", " / ") }} />
                      <span className={base.num}>{r}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : state("frames") === "done" ? (
              <Answer
                title={t({ en: "Frames", tr: "Kareler" })}
                value={c.angles.map((a) => t(ANGLES.find((x) => x.id === a)!.label)).join(" · ")}
                note={c.ratio}
              />
            ) : (
              <Todo title={t({ en: "Frames and ratio", tr: "Kareler ve oran" })} note={t({ en: "Three frames at 3:4, unless you say otherwise", tr: "Aksini söylemezsen 3:4'te üç kare" })} />
            )}
          </Row>

          {/* ── 05 result ── */}
          <Row sec="result" no="05" st={state("result")} sewing={developing} setRef={(el) => { refs.current.result = el; }}>
            {developing ? (
              <>
                <h2 className={css.q}>
                  {c.step === "done"
                    ? t({ en: `${c.angles.length} frames are ready.`, tr: `${c.angles.length} kare hazır.` })
                    : t({ en: "Being sewn.", tr: "Dikiliyor." })}
                </h2>
                <div className={css.results}>
                  {c.outputs.map((o, i) => (
                    <figure key={o.id} className={css.result}>
                      <div className={css.resultImg}>
                        {i < c.done ? (
                          <Seam before="/img/product-coat-front.jpg" after={o.out} mode="reveal" className={css.fill} />
                        ) : (
                          <span className={css.waiting} />
                        )}
                      </div>
                      <figcaption>
                        <span className={base.num}>{String(i + 1).padStart(2, "0")}</span> {t(o.label)}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </>
            ) : (
              <Todo title={t({ en: "Result", tr: "Sonuç" })} note={t({ en: "Appears here when the sheet is sewn", tr: "Föy dikilince burada belirir" })} />
            )}
          </Row>
          <div className={css.tail} />
        </div>

        {/* ── the binding: status and the one action, always in reach ── */}
        <div className={css.bar}>
          <div className={css.barLeft}>
            <span className={css.barNo}>
              {t({ en: "Sheet", tr: "Föy" })} <span className={base.num}>0147</span>
            </span>
            <span className={css.segments} aria-label={`${decided} / 5`}>
              {[1, 2, 3, 4, 5].map((n) => (
                <i key={n} className={n <= decided ? css.segOn : undefined} />
              ))}
            </span>
            <span className={css.barNote}>
              {c.step === "running"
                ? t({ en: `Sewing · ${c.done} of ${c.angles.length}`, tr: `Dikiliyor · ${c.angles.length} karenin ${c.done} tanesi` })
                : c.step === "done"
                  ? t({ en: "Sewn", tr: "Dikildi" })
                  : c.step === "ready"
                    ? t({ en: "Ready to sew", tr: "Dikilmeye hazır" })
                    : t({ en: `${4 - decided} decisions left`, tr: `${4 - decided} karar kaldı` })}
            </span>
          </div>
          <div className={css.barRight}>
            <span className={css.barCost}>
              <span className={base.num}>{cost}</span> {t({ en: "frames", tr: "kare" })} · <span className={base.num}>{cost}</span> {t({ en: "credits", tr: "kredi" })}
            </span>
            {c.step === "done" ? (
              <Link href="/jobs/j-coat" className={base.primary}>
                {t({ en: "See the frames", tr: "Karelere git" })} <Arrow />
              </Link>
            ) : (
              <button className={base.primary} disabled={c.step !== "ready"} onClick={() => c.start(900, 1100)}>
                {t({ en: "Start the system", tr: "Sistemi başlat" })} <Arrow />
              </button>
            )}
          </div>
        </div>
      </div>
    </ConceptShell>
  );
}

function Row({
  sec,
  no,
  st,
  sewing,
  setRef,
  children,
}: {
  sec: Sec;
  no: string;
  st: "done" | "open" | "todo";
  sewing: boolean;
  setRef: (el: HTMLElement | null) => void;
  children: ReactNode;
}) {
  return (
    <section
      ref={setRef}
      className={`${css.row} ${css[st] ?? ""} ${sewing ? css.sewing : ""}`}
      style={{ "--i": SECS.indexOf(sec) } as CSSProperties}
    >
      <div className={css.gutter} aria-hidden>
        <span className={css.no}>{no}</span>
        <span className={css.line} />
      </div>
      <div className={css.content}>{children}</div>
    </section>
  );
}

function Strip({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const move = (d: number) => ref.current?.scrollBy({ left: d * 480, behavior: "smooth" });
  return (
    <div className={css.stripWrap}>
      <div className={css.strip} ref={ref}>
        {children}
      </div>
      <div className={css.stripNav}>
        <button onClick={() => move(-1)} aria-label="Previous">
          <Chevron dir="left" />
        </button>
        <button onClick={() => move(1)} aria-label="Next">
          <Chevron />
        </button>
      </div>
    </div>
  );
}

function Answer({ title, value, note, img, portrait, onChange }: { title: string; value: string; note?: string; img?: string; portrait?: boolean; onChange?: () => void }) {
  const { t } = useAtelier();
  return (
    <div className={`${css.answer} fade-in`}>
      {img && <img className={portrait ? css.ansPortrait : css.ansPlace} src={img} alt="" />}
      <div className={css.ansText}>
        <span className={css.ansTitle}>{title}</span>
        <span className={css.ansValue}>{value}</span>
        {note && <span className={css.sub}>{note}</span>}
      </div>
      {onChange && (
        <button className={css.edit} onClick={onChange}>
          {t({ en: "Change", tr: "Değiştir" })}
        </button>
      )}
    </div>
  );
}

function Todo({ title, note, imgs }: { title: string; note: string; imgs?: string[] }) {
  return (
    <div className={css.todoRow}>
      <div>
        <span className={css.todoTitle}>{title}</span>
        <span className={css.sub}>{note}</span>
      </div>
      {imgs && (
        <span className={css.todoImgs} aria-hidden>
          {imgs.map((src) => (
            <img key={src} src={src} alt="" />
          ))}
        </span>
      )}
    </div>
  );
}
