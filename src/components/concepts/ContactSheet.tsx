"use client";

import Link from "next/link";
import { useRef, useState, type KeyboardEvent } from "react";
import { ANGLES, CASTS, RATIOS, ROLE_META, SETTINGS } from "@/lib/data";
import { useAtelier } from "@/lib/store";
import { Arrow, Lock } from "../icons";
import { ConceptShell } from "./Chrome";
import { canUse, useConcept } from "./useConcept";
import base from "./Concept.module.css";
import css from "./ContactSheet.module.css";

/* Concept C — the contact sheet.
   The photographer's culling table. Choices are frames on a sheet, a loupe
   shows the one under the eye, and a choice is marked the way editors
   always have: a grease-pencil loop. Results develop like prints in a tray,
   and are culled with the same pencil. */

const LOOP = "M9 7 C30 2 70 3 92 8 C98 30 97 70 93 92 C70 98 30 97 8 94 C3 70 2 30 7 9 C10 4 16 4 22 6";

function Loop({ small }: { small?: boolean }) {
  return (
    <svg className={`${css.loop} ${small ? css.loopSmall : ""}`} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
      <path d={LOOP} pathLength={1} />
    </svg>
  );
}

export function ContactSheet() {
  const { t, s } = useAtelier();
  const c = useConcept();
  const [hover, setHover] = useState<string | null>(null);
  const [keep, setKeep] = useState<string[]>([]);
  const grid = useRef<HTMLDivElement>(null);

  const developing = c.step === "running" || c.step === "done";
  const sheetNo = c.step === "cast" ? "02" : c.step === "setting" ? "03" : c.step === "ready" ? "04" : "05";

  /* arrow keys walk the sheet like a culling app */
  const walk = (e: KeyboardEvent) => {
    if (!["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].includes(e.key)) return;
    const cells = Array.from(grid.current?.querySelectorAll<HTMLButtonElement>("button[data-cell]") ?? []);
    const i = cells.indexOf(document.activeElement as HTMLButtonElement);
    const cols = getComputedStyle(grid.current!).gridTemplateColumns.split(" ").length;
    const d = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols }[e.key]!;
    const next = cells[Math.max(0, Math.min(cells.length - 1, (i < 0 ? 0 : i) + d))];
    next?.focus();
    e.preventDefault();
  };

  const castInLoupe = CASTS.find((x) => x.id === (hover ?? c.castId));
  const settingInLoupe = SETTINGS.find((x) => x.id === (hover ?? c.settingId));
  const outInLoupe = c.outputs.find((o) => o.id === hover) ?? c.outputs[Math.max(0, c.done - 1)];
  const cost = c.angles.length;

  const frameCode = (i: number) => `${sheetNo}${String.fromCharCode(65 + i)}`;

  return (
    <ConceptShell active="c">
      <div className={css.c}>
        <div className={css.main}>
          {/* ── the sheet ── */}
          <section className={css.sheet} aria-label={t({ en: "Contact sheet", tr: "Kontak baskı" })}>
            <header className={css.head}>
              <div>
                <h1 className={css.q}>
                  {c.step === "cast" && t({ en: "Who wears it?", tr: "Kim giyiyor?" })}
                  {c.step === "setting" && t({ en: "Where is it shot?", tr: "Nerede çekiliyor?" })}
                  {c.step === "ready" && t({ en: "Marked and ready.", tr: "İşaretlendi, hazır." })}
                  {c.step === "running" && t({ en: "In the tray.", tr: "Banyoda." })}
                  {c.step === "done" && t({ en: "Cull the prints.", tr: "Baskıları ayıkla." })}
                </h1>
                <p className={css.sub}>
                  {c.step === "done"
                    ? t({ en: "Circle what you keep — the rest can be redone.", tr: "Tuttuklarını çiz — kalanı yeniden üretilebilir." })
                    : developing
                      ? t({ en: "Prints develop one by one. You can leave — they'll wait.", tr: "Baskılar tek tek gelişiyor. Ayrılabilirsin — seni beklerler." })
                      : c.step === "ready"
                        ? t({ en: "Every choice is circled. Frames and ratio are set below.", tr: "Her seçim çizildi. Kareler ve oran aşağıda." })
                        : t({ en: "Look closely on the right, circle one to choose.", tr: "Sağda yakından bak, seçmek için birini çiz." })}
                </p>
              </div>
              <p className={css.keys}>
                <kbd>←</kbd>
                <kbd>→</kbd> {t({ en: "walk", tr: "gez" })} · <kbd>↵</kbd> {t({ en: "circle", tr: "çiz" })}
              </p>
            </header>

            {c.step === "cast" && (
              <div className={css.grid} ref={grid} onKeyDown={walk} onMouseLeave={() => setHover(null)}>
                {CASTS.map((x, i) => {
                  const ok = canUse(s.role, x.minRole);
                  const sel = c.castId === x.id;
                  return (
                    <button
                      key={x.id}
                      data-cell
                      className={`${css.cell} ${sel ? css.sel : ""} ${ok ? "" : css.lockedCell}`}
                      onMouseEnter={() => setHover(x.id)}
                      onFocus={() => setHover(x.id)}
                      onClick={() => ok && c.setCastId(x.id)}
                      aria-pressed={sel}
                    >
                      <span className={css.frame}>
                        <img src={x.img} alt={x.name} />
                      </span>
                      <span className={css.rebate}>
                        <span>{frameCode(i)} ▸</span>
                        {ok ? (
                          <span>{x.name}</span>
                        ) : (
                          <span className={css.rebateLock}>
                            <Lock size={9} /> {t(ROLE_META[x.minRole].label)}
                          </span>
                        )}
                      </span>
                      {sel && <Loop />}
                    </button>
                  );
                })}
              </div>
            )}

            {c.step === "setting" && (
              <div className={`${css.grid} ${css.gridWide}`} ref={grid} onKeyDown={walk} onMouseLeave={() => setHover(null)}>
                {SETTINGS.map((x, i) => {
                  const ok = canUse(s.role, x.minRole);
                  const sel = c.settingId === x.id;
                  return (
                    <button
                      key={x.id}
                      data-cell
                      className={`${css.cell} ${sel ? css.sel : ""} ${ok ? "" : css.lockedCell}`}
                      onMouseEnter={() => setHover(x.id)}
                      onFocus={() => setHover(x.id)}
                      onClick={() => ok && c.setSettingId(x.id)}
                      aria-pressed={sel}
                    >
                      <span className={`${css.frame} ${css.landscape}`}>
                        <img src={x.img} alt={t(x.name)} />
                      </span>
                      <span className={css.rebate}>
                        <span>{frameCode(i)} ▸</span>
                        <span>{t(x.name)}</span>
                      </span>
                      {sel && <Loop />}
                    </button>
                  );
                })}
              </div>
            )}

            {c.step === "ready" && (
              <div className={css.readyWrap}>
                <div className={`${css.grid} ${css.gridReady}`}>
                  {[
                    { k: "01A", src: "/img/product-coat-front.jpg", label: t({ en: "Camel coat", tr: "Kamel kaban" }), wide: false },
                    { k: "02A", src: c.cast?.img ?? "", label: c.cast?.name ?? "", wide: false },
                    { k: "03B", src: c.setting?.img ?? "", label: c.setting ? t(c.setting.name) : "", wide: true },
                  ].map((f) => (
                    <div key={f.k} className={`${css.cell} ${css.sel} ${css.still}`}>
                      <span className={`${css.frame} ${f.wide ? css.landscape : ""}`}>
                        <img src={f.src} alt="" />
                      </span>
                      <span className={css.rebate}>
                        <span>{f.k} ▸</span>
                        <span>{f.label}</span>
                      </span>
                      <Loop />
                    </div>
                  ))}
                </div>
                <div className={css.opts}>
                  <div className={css.opt}>
                    <span>{t({ en: "Frames", tr: "Kareler" })}</span>
                    {ANGLES.map((a) => (
                      <button key={a.id} className={c.angles.includes(a.id) ? css.optOn : undefined} onClick={() => c.toggleAngle(a.id)} aria-pressed={c.angles.includes(a.id)}>
                        {t(a.label)}
                      </button>
                    ))}
                  </div>
                  <div className={css.opt}>
                    <span>{t({ en: "Ratio", tr: "Oran" })}</span>
                    {RATIOS.map((r) => (
                      <button key={r} className={c.ratio === r ? css.optOn : undefined} onClick={() => c.setRatio(r)} aria-pressed={c.ratio === r}>
                        <span className={base.num}>{r}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {developing && (
              <div className={`${css.grid} ${css.gridOut}`} ref={grid} onKeyDown={walk}>
                {c.outputs.map((o, i) => {
                  const developed = i < c.done;
                  const kept = keep.includes(o.id);
                  return (
                    <button
                      key={o.id}
                      data-cell
                      className={`${css.cell} ${kept ? css.sel : ""}`}
                      disabled={!developed}
                      onMouseEnter={() => setHover(o.id)}
                      onFocus={() => setHover(o.id)}
                      onClick={() => c.step === "done" && setKeep(kept ? keep.filter((k) => k !== o.id) : [...keep, o.id])}
                      aria-pressed={kept}
                    >
                      <span className={`${css.frame} ${css.tray}`}>
                        {developed && <img className={css.develop} src={o.out} alt={t(o.label)} />}
                      </span>
                      <span className={css.rebate}>
                        <span>{frameCode(i)} ▸</span>
                        <span>{developed ? t(o.label) : t({ en: "developing", tr: "gelişiyor" })}</span>
                      </span>
                      {kept && <Loop />}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* ── the loupe ── */}
          <aside className={css.loupe} aria-label={t({ en: "Loupe", tr: "Büyüteç" })}>
            <div className={css.lens}>
              {c.step === "cast" && castInLoupe && <img key={castInLoupe.id} src={castInLoupe.img} alt="" />}
              {c.step === "setting" && (settingInLoupe ? <img key={settingInLoupe.id} className={css.lensWide} src={settingInLoupe.img} alt="" /> : <span className={css.lensEmpty}>{t({ en: "Hover a frame", tr: "Bir kareye gel" })}</span>)}
              {c.step === "ready" && <img className={css.lensWide} src={c.setting?.img} alt="" />}
              {developing &&
                (c.done > 0 && outInLoupe ? <img key={outInLoupe.id} className={css.develop} src={outInLoupe.out} alt="" /> : <span className={css.lensEmpty}>{t({ en: "The first print is coming", tr: "İlk baskı geliyor" })}</span>)}
            </div>

            <div className={css.lensInfo}>
              {c.step === "cast" && castInLoupe && (
                <>
                  <h2 className={css.name}>{castInLoupe.name}</h2>
                  <p className={css.meta}>{t(castInLoupe.note)}</p>
                  {castInLoupe.id === "ada" && (
                    <p className={css.meta}>
                      {t({ en: "Last on: Camel wool coat ·", tr: "Son iş: Kamel yün kaban ·" })} <span className={base.num}>21.09</span>
                    </p>
                  )}
                  {!canUse(s.role, castInLoupe.minRole) && (
                    <p className={css.lockNote}>
                      <Lock size={11} /> {t({ en: "Opens with", tr: "Açıldığı üyelik:" })} {t(ROLE_META[castInLoupe.minRole].label)}
                    </p>
                  )}
                </>
              )}
              {c.step === "setting" && settingInLoupe && <h2 className={css.name}>{t(settingInLoupe.name)}</h2>}
              {c.step === "ready" && (
                <>
                  <h2 className={css.name}>
                    {c.cast?.name} · {c.setting && t(c.setting.name)}
                  </h2>
                  <p className={css.meta}>
                    {c.angles.map((a) => t(ANGLES.find((x) => x.id === a)!.label)).join(" · ")} · <span className={base.num}>{c.ratio}</span>
                  </p>
                </>
              )}
              {developing && (
                <h2 className={css.name}>
                  <span className={base.num}>
                    {c.done} / {c.angles.length}
                  </span>{" "}
                  {t({ en: "developed", tr: "gelişti" })}
                </h2>
              )}
            </div>

            <footer className={css.loupeFoot}>
              {c.step === "cast" && (
                <button className={base.primary} disabled={!c.castId} onClick={() => c.setStep("setting")}>
                  {t({ en: `Continue with ${c.cast?.name ?? ""}`, tr: `${c.cast?.name ?? ""} ile devam et` })} <Arrow />
                </button>
              )}
              {c.step === "setting" && (
                <>
                  <button className={base.primary} disabled={!c.settingId} onClick={() => c.setStep("ready")}>
                    {t({ en: "Continue", tr: "Devam et" })} <Arrow />
                  </button>
                  <button className={base.ghostBtn} onClick={() => c.setStep("cast")}>
                    {t({ en: "Back", tr: "Geri" })}
                  </button>
                </>
              )}
              {c.step === "ready" && (
                <>
                  <button className={base.primary} onClick={() => c.start(1000, 1500)}>
                    {t({ en: "Start the system", tr: "Sistemi başlat" })} <Arrow />
                  </button>
                  <button className={base.ghostBtn} onClick={() => c.setStep("setting")}>
                    {t({ en: "Back", tr: "Geri" })}
                  </button>
                </>
              )}
              {c.step === "done" && (
                <Link href="/jobs/j-coat" className={base.primary}>
                  {keep.length
                    ? t({ en: `Keep ${keep.length}, see all`, tr: `${keep.length} tanesini tut, hepsini gör` })
                    : t({ en: "See the frames", tr: "Karelere git" })}{" "}
                  <Arrow />
                </Link>
              )}
              <span className={css.cost}>
                <span className={base.num}>{cost}</span> {t({ en: "frames", tr: "kare" })} · <span className={base.num}>{cost}</span> {t({ en: "credits", tr: "kredi" })}
              </span>
            </footer>
          </aside>
        </div>

        {/* ── the chain, as a strip of film ── */}
        <nav className={css.film} aria-label={t({ en: "Production chain", tr: "Üretim zinciri" })}>
          {[
            { k: "01", label: t({ en: "Product", tr: "Ürün" }), src: "/img/product-coat-front.jpg", state: "done" },
            { k: "02", label: "Cast", src: c.cast?.img, state: c.step === "cast" ? "now" : "done" },
            { k: "03", label: t({ en: "Setting", tr: "Ortam" }), src: c.step === "cast" ? undefined : c.setting?.img, state: c.step === "cast" ? "todo" : c.step === "setting" ? "now" : "done", wide: true },
            { k: "04", label: t({ en: "Frames", tr: "Kareler" }), state: c.step === "ready" ? "now" : developing ? "done" : "todo" },
            { k: "05", label: t({ en: "Result", tr: "Sonuç" }), src: c.done > 0 ? c.outputs[0].out : undefined, state: developing ? (c.step === "done" ? "done" : "now") : "todo" },
          ].map((f) => (
            <button
              key={f.k}
              className={`${css.filmFrame} ${css[f.state] ?? ""}`}
              disabled={developing || f.state !== "done" || f.k === "01"}
              onClick={() => (f.k === "02" ? c.setStep("cast") : f.k === "03" ? c.setStep("setting") : null)}
            >
              <span className={`${css.filmImg} ${f.wide ? css.filmWide : ""}`}>{f.src ? <img src={f.src} alt="" /> : null}</span>
              <span className={css.filmLabel}>
                <span className={base.num}>{f.k}</span> {f.label}
              </span>
            </button>
          ))}
        </nav>
      </div>
    </ConceptShell>
  );
}
