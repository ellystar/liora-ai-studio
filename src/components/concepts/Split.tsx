"use client";

import Link from "next/link";
import { Fragment, useEffect, useRef, useState, type CSSProperties } from "react";
import { ANGLES, CASTS, RATIOS, ROLE_META, SAMPLE_PRO, SETTINGS, SLOTS, type Angle, type L } from "@/lib/data";
import { useAtelier } from "@/lib/store";
import { Seam } from "../Seam";
import { Arrow } from "../icons";
import { ConceptShell } from "./Chrome";
import { Ask, Card, EDITORIAL, FLY, MarkPicker, Shelf, flyTo, morph } from "./Choice";
import { type Mark } from "./Stitch";
import { canUse } from "./useConcept";
import base from "./Concept.module.css";
import ch from "./Choice.module.css";
import css from "./Split.module.css";

/* Concept D — the split.
   Two planes. Above, most of the room goes to the work: one question, its
   answers as large images. Hovering an answer shows it in a shoot; nothing
   grows. Choosing is enough — the picture drops into its node below and the
   next question arrives. Below, the system being built: one node per
   decision, each carrying the picture it was given, stitched to the next.
   A decided node reopens its question above.
   When the last decision is made the system rises to fill the screen:
   you see what you built, then start it, and it is sewn in gold. */

type Node = "product" | "cast" | "setting" | "frames" | "result";
type Phase = "cast" | "setting" | "frames" | "review" | "running" | "done";
const NODES: Node[] = ["product", "cast", "setting", "frames", "result"];

const LABEL: Record<Node, L> = {
  product: { en: "Product", tr: "Ürün" },
  cast: { en: "Cast", tr: "Cast" },
  setting: { en: "Setting", tr: "Ortam" },
  frames: { en: "Frames", tr: "Kareler" },
  result: { en: "Result", tr: "Sonuç" },
};

const ADVANCE = 540; // the beat between a choice and the next question
const PRODUCT = "/img/home/ghost-in.jpg";

export function Split() {
  const { t, s } = useAtelier();
  const [phase, setPhase] = useState<Phase>("cast");
  const [editing, setEditing] = useState<Node | null>(null);
  const [castId, setCastId] = useState<string>();
  const [settingId, setSettingId] = useState<string>();
  const [angles, setAngles] = useState<Angle[]>(["front", "threeQuarter", "back"]);
  const [ratio, setRatio] = useState<string>("3:4");
  const [done, setDone] = useState(0);
  const [mark, setMark] = useState<Mark>("teyel");
  const [landing, setLanding] = useState<Node | null>(null);
  const [busy, setBusy] = useState(false);
  const slots = useRef<Partial<Record<Node, HTMLElement | null>>>({});
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn: () => void, ms: number) => void timers.current.push(setTimeout(fn, ms));

  const cast = CASTS.find((x) => x.id === castId);
  const setting = SETTINGS.find((x) => x.id === settingId);
  const outputs = angles.map((a) => ANGLES.find((x) => x.id === a)!);
  const n = outputs.length;

  const current: Node | null = phase === "cast" || phase === "setting" || phase === "frames" ? phase : null;
  const open: Node | null = editing ?? current;
  const risen = open === null;
  const sewing = phase === "running" || phase === "done";

  const filled = (x: Node) =>
    x === "product" ? true : x === "cast" ? !!cast : x === "setting" ? !!setting : x === "frames" ? !current : phase === "done";

  /* the chosen picture travels from its card to its node */
  const fly = (from: HTMLElement | null, to: Node, src: string) => {
    if (flyTo(from, slots.current[to], src, () => setLanding(null))) setLanding(to);
  };

  /* back to wherever the user was before reopening a node */
  const close = () => (phase === "review" ? morph(() => setEditing(null)) : setEditing(null));

  const choose = (node: "cast" | "setting", id: string, from: HTMLElement | null, src: string) => {
    if (busy) return;
    if (node === "cast") setCastId(id);
    else setSettingId(id);
    fly(from, node, src);
    setBusy(true);
    const reopened = editing !== null;
    later(
      () => {
        setBusy(false);
        if (reopened) close();
        else setPhase(node === "cast" ? "setting" : "frames");
      },
      reopened && phase === "review" ? 140 + FLY + 160 : ADVANCE,
    );
  };

  const toggleAngle = (a: Angle) =>
    setAngles((cur) =>
      cur.includes(a) ? (cur.length > 1 ? cur.filter((x) => x !== a) : cur) : ANGLES.map((x) => x.id).filter((x) => x === a || cur.includes(x)),
    );

  const framesDone = () =>
    phase === "frames"
      ? morph(() => {
          setEditing(null);
          setPhase("review");
        })
      : close();

  const reopen = (x: Node) => {
    if (sewing || busy || x === "result" || x === open) return;
    if (x !== current && !filled(x)) return;
    const next = x === current ? null : x;
    if (risen) morph(() => setEditing(next));
    else setEditing(next);
  };

  const start = () => {
    setPhase("running");
    setDone(0);
    const lead = 1500;
    const each = 1100;
    outputs.forEach((_, i) => later(() => setDone(i + 1), lead + each * i));
    later(() => setPhase("done"), lead + each * n + 300);
  };

  const reset = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    morph(() => {
      setPhase("cast");
      setEditing(null);
      setCastId(undefined);
      setSettingId(undefined);
      setDone(0);
    });
  };

  const nodeState = (x: Node) =>
    x === open || (risen && x === "result" && phase !== "done") ? "current" : filled(x) ? "filled" : "empty";

  return (
    <ConceptShell active="d" tools={<MarkPicker mark={mark} setMark={setMark} />}>
      <main className={css.d} data-risen={risen}>
        {/* ── above: the work ── */}
        {!risen && (
          <section className={css.stage} key={open} data-busy={busy || undefined}>
            {open === "cast" && (
              <>
                <Ask
                  no="02"
                  q={t({ en: "Who wears it?", tr: "Kim giyiyor?" })}
                  hint={t({ en: "Hover to see them in a shoot. Choosing is enough.", tr: "Üzerine gel, bir çekimde gör. Seçmen yeterli." })}
                />
                <Shelf>
                  {CASTS.map((x) => {
                    const ok = canUse(s.role, x.minRole);
                    return (
                      <Card
                        key={x.id}
                        img={x.img}
                        alt={EDITORIAL[x.id]}
                        name={x.name}
                        note={t(x.note)}
                        sel={castId === x.id}
                        lock={ok ? undefined : t(ROLE_META[x.minRole].label)}
                        mark={mark}
                        onPick={(el) => choose("cast", x.id, el, x.img)}
                      />
                    );
                  })}
                </Shelf>
              </>
            )}

            {open === "setting" && (
              <>
                <Ask no="03" q={t({ en: "Where is it shot?", tr: "Nerede çekiliyor?" })} hint={t({ en: "Choosing is enough.", tr: "Seçmen yeterli." })} />
                <Shelf>
                  {SETTINGS.map((x) => {
                    const ok = canUse(s.role, x.minRole);
                    return (
                      <Card
                        key={x.id}
                        img={x.img}
                        name={t(x.name)}
                        sel={settingId === x.id}
                        lock={ok ? undefined : t(ROLE_META[x.minRole].label)}
                        mark={mark}
                        onPick={(el) => choose("setting", x.id, el, x.img)}
                      />
                    );
                  })}
                </Shelf>
              </>
            )}

            {open === "frames" && (
              <>
                <Ask
                  no="04"
                  q={t({ en: "Which frames?", tr: "Hangi kareler?" })}
                  hint={t({ en: "Three are set. Change only what you need.", tr: "Üçü hazır. Yalnızca gerekeni değiştir." })}
                  side={
                    <>
                      <span className={ch.ratios} role="radiogroup" aria-label={t({ en: "Ratio", tr: "Oran" })}>
                        {RATIOS.map((r) => (
                          <button key={r} role="radio" aria-checked={ratio === r} className={ratio === r ? ch.on : undefined} onClick={() => setRatio(r)}>
                            <i style={{ aspectRatio: r.replace(":", " / ") }} />
                            <span className={base.num}>{r}</span>
                          </button>
                        ))}
                      </span>
                      <button className={base.primary} onClick={framesDone}>
                        {current === "frames" ? t({ en: "Continue", tr: "Devam" }) : t({ en: "Done", tr: "Tamam" })} <Arrow />
                      </button>
                    </>
                  }
                />
                <Shelf>
                  {ANGLES.map((a) => {
                    const at = angles.indexOf(a.id);
                    return (
                      <Card
                        key={a.id}
                        img={a.out}
                        name={t(a.label)}
                        sel={at >= 0}
                        badge={at >= 0 ? String(at + 1).padStart(2, "0") : undefined}
                        mark={mark}
                        onPick={() => toggleAngle(a.id)}
                      />
                    );
                  })}
                </Shelf>
              </>
            )}

            {open === "product" && (
              <>
                <Ask
                  no="01"
                  q={t({ en: "Your product.", tr: "Ürünün." })}
                  hint={t({ en: "5 images · placement checked", tr: "5 görsel · yerleşim onaylandı" })}
                  side={
                    <button className={base.primary} onClick={close}>
                      {t({ en: "Done", tr: "Tamam" })} <Arrow />
                    </button>
                  }
                />
                <Shelf>
                  {SAMPLE_PRO.map((u) => (
                    <Card key={u.id} img={u.src} name={t(SLOTS.find((x) => x.id === u.slot)!.label)} mark={mark} still />
                  ))}
                </Shelf>
              </>
            )}
          </section>
        )}

        {/* ── below: the system ── */}
        <section className={css.rail} data-risen={risen}>
          {risen && (
            <header className={`${css.railHead} fade-in`}>
              <h1 className={ch.q}>
                {phase === "done"
                  ? t({ en: `${n} frames are ready.`, tr: `${n} kare hazır.` })
                  : phase === "running"
                    ? t({ en: "Being sewn.", tr: "Dikiliyor." })
                    : t({ en: "Your system.", tr: "Sistemin hazır." })}
              </h1>
              <p className={ch.hint}>
                {phase === "review"
                  ? t({ en: "Touch a node to change it.", tr: "Değiştirmek için bir node'a dokun." })
                  : phase === "running"
                    ? t({ en: `${done} of ${n} frames`, tr: `${n} karenin ${done} tanesi` })
                    : t({ en: "Kept for 7 days. Download what you keep.", tr: "7 gün saklanır. Tuttuklarını indir." })}
              </p>
            </header>
          )}

          <div className={css.chain}>
            {NODES.map((x, i) => {
              const st = nodeState(x);
              return (
                <Fragment key={x}>
                  {i > 0 && (
                    <span
                      className={css.wire}
                      data-mark={mark}
                      data-on={(filled(NODES[i - 1]) && (filled(x) || st === "current")) || undefined}
                      data-sewn={sewing || undefined}
                      style={{ "--i": i } as CSSProperties}
                      aria-hidden
                    >
                      <i />
                    </span>
                  )}
                  <button
                    className={css.node}
                    data-state={st}
                    data-landing={landing === x || undefined}
                    onClick={() => reopen(x)}
                    aria-current={x === open ? "step" : undefined}
                    style={{ viewTransitionName: `d-node-${x}`, viewTransitionClass: "vt-card" } as CSSProperties}
                  >
                    <span className={`${css.port} ${css.portL}`} />
                    <span
                      className={css.thumb}
                      ref={(el) => {
                        slots.current[x] = el;
                      }}
                      style={{ viewTransitionName: `d-img-${x}` } as CSSProperties}
                    >
                      {x === "product" && <img src={PRODUCT} alt="" />}
                      {x === "cast" && cast && <img key={cast.id} src={cast.img} alt="" />}
                      {x === "setting" && setting && <img key={setting.id} src={setting.img} alt="" />}
                      {/* the frames are empty until the system fills them in the result */}
                      {x === "frames" && !current && (
                        <span className={css.slices}>
                          {outputs.map((o) => (
                            <span key={o.id} className={css.blank} style={{ aspectRatio: ratio.replace(":", " / ") }}>
                              <span className={base.num}>{o.short}</span>
                            </span>
                          ))}
                        </span>
                      )}
                      {x === "result" && sewing && (
                        <span className={css.slices}>
                          {outputs.map((o, k) =>
                            k < done ? <Seam key={o.id} before={PRODUCT} after={o.out} mode="reveal" className={css.slice} /> : <span key={o.id} className={css.waiting} />,
                          )}
                        </span>
                      )}
                    </span>
                    <span className={css.nodeText} style={{ viewTransitionName: `d-txt-${x}`, viewTransitionClass: "vt-text" } as CSSProperties}>
                      <span className={css.nodeLabel}>
                        <span className={base.num}>{String(i + 1).padStart(2, "0")}</span>
                        {t(LABEL[x])}
                      </span>
                      <span className={css.nodeValue}>
                        {x === "product"
                          ? t({ en: "Camel wool coat", tr: "Kamel yün kaban" })
                          : x === "cast"
                            ? (cast?.name ?? "—")
                            : x === "setting"
                              ? setting
                                ? t(setting.name)
                                : "—"
                              : x === "frames"
                                ? current
                                  ? "—"
                                  : t({ en: `${n} frames · ${ratio}`, tr: `${n} kare · ${ratio}` })
                                : phase === "done"
                                  ? t({ en: `${n} frames`, tr: `${n} kare` })
                                  : sewing
                                    ? `${done} / ${n}`
                                    : "—"}
                      </span>
                    </span>
                    <span className={`${css.port} ${css.portR}`} />
                  </button>
                </Fragment>
              );
            })}
          </div>

          {risen && (
            <footer className={`${css.railFoot} fade-in`}>
              <span className={css.cost}>
                <span className={base.num}>{n}</span> {t({ en: "frames", tr: "kare" })} · <span className={base.num}>{n}</span>{" "}
                {t({ en: "credits", tr: "kredi" })}
              </span>
              <span className={css.actions}>
                {phase === "done" && (
                  <button className={base.ghostBtn} onClick={reset}>
                    {t({ en: "Start over", tr: "Baştan kur" })}
                  </button>
                )}
                {phase === "done" ? (
                  <Link href="/jobs/j-coat" className={base.primary}>
                    {t({ en: "See the frames", tr: "Karelere git" })} <Arrow />
                  </Link>
                ) : (
                  <button className={base.primary} onClick={start} disabled={phase === "running"}>
                    {phase === "running" ? t({ en: "Sewing", tr: "Dikiliyor" }) : t({ en: "Start the system", tr: "Sistemi başlat" })} <Arrow />
                  </button>
                )}
              </span>
            </footer>
          )}
        </section>
      </main>
    </ConceptShell>
  );
}
