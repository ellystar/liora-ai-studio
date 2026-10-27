"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { L } from "@/lib/data";
import { useAtelier } from "@/lib/store";
import { canUse } from "../concepts/useConcept";
import { Masthead } from "../chrome/Masthead";
import { Arrow, ArrowLeft, Lock } from "../icons";
import css from "./Studio.module.css";

/* wf-07 — Cast Studio. Not a flow: it makes a cast, not product frames.
   Two roads chosen up front because they end differently: from text the
   cast is ready at once; from a reference it is reviewed first.

   Pricing (Elif): a try costs 1 credit like any frame; 30 credits only to
   make the model yours alone ("Kullan ve kendi mankenim yap"). A reference —
   a real person's likeness — can only be kept that way. There is no
   children's cast: minors are not offered, here or by reference. */

type Step = "path" | "text" | "reference" | "making" | "result" | "saved";
type Road = "text" | "reference";

const RUN = 1; // a try
const OWN = 30; // making it yours, exclusively
const stamp = () => Date.now().toString(36); // only called from an action

/* what a run returns: the same person, four ways */
const MADE: { src: string; label: L }[] = [
  { src: "/img/salon/r2.jpg", label: { en: "Profile", tr: "Profil" } },
  { src: "/img/salon/r1.jpg", label: { en: "Full length", tr: "Boy" } },
  { src: "/img/salon/r3.jpg", label: { en: "Wide", tr: "Uzak plan" } },
  { src: "/img/salon/r4.jpg", label: { en: "Detail", tr: "Detay" } },
];

/* every trait is optional: pick some, write it in words, or both (Elif) */
const FIELDS: { id: string; label: L; options: L[] }[] = [
  { id: "gender", label: { en: "Gender", tr: "Cinsiyet" }, options: [{ en: "Woman", tr: "Kadın" }, { en: "Man", tr: "Erkek" }, { en: "Unstated", tr: "Belirtme" }] },
  { id: "age", label: { en: "Age", tr: "Yaş" }, options: [{ en: "20s", tr: "20'ler" }, { en: "30s", tr: "30'lar" }, { en: "40s", tr: "40'lar" }, { en: "50+", tr: "50+" }] },
  { id: "skin", label: { en: "Skin", tr: "Ten" }, options: [{ en: "Fair", tr: "Açık" }, { en: "Olive", tr: "Buğday" }, { en: "Tan", tr: "Esmer" }, { en: "Deep", tr: "Koyu" }] },
  { id: "hairType", label: { en: "Hair type", tr: "Saç tipi" }, options: [{ en: "Wavy", tr: "Dalgalı" }, { en: "Curly", tr: "Kıvırcık" }, { en: "Straight", tr: "Düz" }] },
  { id: "hairCut", label: { en: "Hair length", tr: "Saç kesimi" }, options: [{ en: "Long", tr: "Uzun" }, { en: "Shoulder", tr: "Omuzlarda" }, { en: "Short", tr: "Kısa" }] },
  { id: "hairColour", label: { en: "Hair colour", tr: "Saç rengi" }, options: [{ en: "Brown", tr: "Kumral" }, { en: "Black", tr: "Siyah" }, { en: "Blond", tr: "Sarı" }, { en: "Red", tr: "Kızıl" }, { en: "Copper", tr: "Turuncu" }, { en: "Grey", tr: "Gri" }] },
  { id: "eyes", label: { en: "Eyes", tr: "Göz rengi" }, options: [{ en: "Brown", tr: "Kahverengi" }, { en: "Black", tr: "Siyah" }, { en: "Blue", tr: "Mavi" }, { en: "Dark blue", tr: "Koyu mavi" }, { en: "Hazel", tr: "Ela" }, { en: "Green", tr: "Yeşil" }, { en: "Amber", tr: "Kehribar" }] },
  { id: "body", label: { en: "Build", tr: "Vücut" }, options: [{ en: "Slim", tr: "İnce" }, { en: "Medium", tr: "Orta" }, { en: "Athletic", tr: "Atletik" }, { en: "Curvy", tr: "Dolgun" }] },
  { id: "style", label: { en: "Style", tr: "Tarz" }, options: [{ en: "Cool", tr: "Cool" }, { en: "Minimal", tr: "Minimal" }, { en: "Romantic", tr: "Romantik" }, { en: "Classic", tr: "Klasik" }, { en: "Street", tr: "Sokak" }] },
];

export function Studio({ from }: { from: string | null }) {
  const { s, t, set, dispatch, ready } = useAtelier();
  const [step, setStep] = useState<Step>("path");
  const [road, setRoad] = useState<Road>("text");
  const [picks, setPicks] = useState<Record<string, number | null>>({});
  const [words, setWords] = useState("");
  const [reference, setReference] = useState<string | null>(null);
  const [declared, setDeclared] = useState(false);
  const [name, setName] = useState("");
  const [saved, setSaved] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  if (!ready) return <main className={`${css.page} ink`} />;

  const partner = canUse(s.role, "partner");
  const short = s.credits < RUN;
  const described = Object.values(picks).some((v) => v !== null && v !== undefined) || !!words.trim();
  const canMake = road === "text" ? described : !!reference && declared;

  /* the credit is spent once, when the set arrives; a failed run costs nothing (K-B-02, K-B-10) */
  const make = () => {
    if (short || !canMake) return;
    setStep("making");
    timer.current = setTimeout(() => {
      dispatch({ type: "spend", amount: RUN });
      setStep("result");
    }, 4200);
  };

  /* keep it: in the cast for this account, or yours alone for 30 credits */
  const save = (exclusive: boolean) => {
    if (!name.trim() || (exclusive && s.credits < OWN)) return;
    if (exclusive) dispatch({ type: "spend", amount: OWN });
    const id = `c-${stamp()}`;
    set({
      casts: [
        {
          id,
          name: name.trim(),
          img: MADE[0].src,
          set: MADE.slice(1).map((m) => m.src),
          minRole: "partner",
          own: true,
          exclusive,
          from: road,
          pending: road === "reference",
          ref: road === "reference" ? (reference ?? undefined) : undefined,
          note: exclusive
            ? road === "reference"
              ? { en: "Yours alone · from reference", tr: "Sana özel · referanstan" }
              : { en: "Yours alone · from text", tr: "Sana özel · metinden" }
            : { en: "In your cast · from text", tr: "Kadronda · metinden" },
        },
        ...s.casts,
      ],
    });
    setSaved(id);
    setStep("saved");
  };

  const back = from && from.startsWith("/concepts/") ? from : null;

  return (
    <main className={`${css.page} ink`}>
      <Masthead section={{ en: "Cast Studio", tr: "Cast Studio" }} />
      <section className={css.wrap}>
        <header className={css.head}>
          <div>
            {step !== "path" && step !== "saved" && step !== "making" && (
              <button className={css.back} onClick={() => setStep(step === "result" ? road : "path")}>
                <ArrowLeft size={12} /> {step === "result" ? t({ en: "Edit the description", tr: "Tarifi düzelt" }) : t({ en: "Two roads", tr: "İki yol" })}
              </button>
            )}
            <h1>{step === "result" ? t({ en: "The cast is ready.", tr: "Kadro hazır." }) : t({ en: "Your own model.", tr: "Kendi mankenin." })}</h1>
            <p className={css.line}>
              {step === "result"
                ? t({ en: "Is it the same person in every frame?", tr: "Her karede aynı kişi mi?" })
                : t({ en: `${RUN} credit a try · ${OWN} credits to make it yours alone · nothing spent if it fails`, tr: `Deneme ${RUN} kredi · sana özel yapmak ${OWN} kredi · başarısızsa kredi yakılmaz` })}
            </p>
          </div>
        </header>

        {!partner ? (
          <div className={css.locked}>
            <span className={css.lockedStrip}>
              {MADE.slice(0, 3).map((m) => (
                <img key={m.src} src={m.src} alt="" />
              ))}
            </span>
            <p>
              <em>
                <Lock size={10} /> Partner
              </em>
              {t({ en: "Design models only your brand uses.", tr: "Yalnızca markanın kullandığı mankenler tasarla." })}
            </p>
            <Link href="/packages?from=/studio" className={css.primary}>
              {t({ en: "See Partner", tr: "Partner'ı gör" })} <Arrow size={13} />
            </Link>
          </div>
        ) : step === "path" ? (
          /* two roads, said before choosing — no surprise after the run */
          <div className={css.roads}>
            {(
              [
                { id: "text", img: "/img/cast-selin.jpg", title: { en: "Describe", tr: "Metinle tarif et" }, line: { en: "Pick traits or write it · ready at once", tr: "Özellik seç ya da yaz · hemen kullanıma açılır" } },
                { id: "reference", img: "/img/salon/r2.jpg", title: { en: "From a reference", tr: "Referans fotoğrafla" }, line: { en: "Rights declared · reviewed before use", tr: "Hak beyanı gerekir · incelemeden geçer" } },
              ] as { id: Road; img: string; title: L; line: L }[]
            ).map((r) => (
              <button
                key={r.id}
                className={css.road}
                onClick={() => {
                  setRoad(r.id);
                  setStep(r.id);
                }}
              >
                <span className={css.roadImg}>
                  <img src={r.img} alt="" />
                </span>
                <span className={css.roadTitle}>{t(r.title)}</span>
                <span className={css.roadLine}>
                  {t(r.line)} <Arrow size={12} />
                </span>
              </button>
            ))}
          </div>
        ) : step === "text" || step === "reference" || step === "making" ? (
          <div className={css.build}>
            <div className={css.form} aria-disabled={step === "making" || undefined}>
              {road === "text" ? (
                <>
                  {FIELDS.map((f) => (
                    <div key={f.id} className={css.field}>
                      <span className={css.label}>{t(f.label)}</span>
                      <span className={css.chips} role="radiogroup" aria-label={t(f.label)}>
                        {f.options.map((o, i) => (
                          <button key={i} role="radio" aria-checked={picks[f.id] === i} onClick={() => setPicks((p) => ({ ...p, [f.id]: p[f.id] === i ? null : i }))} disabled={step === "making"}>
                            {t(o)}
                          </button>
                        ))}
                      </span>
                    </div>
                  ))}
                  <div className={css.field}>
                    <span className={css.label}>{t({ en: "In your words · or instead of the picks", tr: "Kendi cümlenle · seçimlerin yerine de olur" })}</span>
                    <textarea
                      className={css.words}
                      value={words}
                      onChange={(e) => setWords(e.target.value)}
                      placeholder={t({ en: "Late 20s, freckles, wavy copper hair, calm look", tr: "20'lerin sonu, çilli, dalgalı bakır saç, sakin bakış" })}
                      rows={2}
                      disabled={step === "making"}
                    />
                  </div>
                </>
              ) : (
                <>
                  <button className={css.drop} onClick={() => setReference("/img/salon/r1-s.jpg")} disabled={step === "making"}>
                    {reference ? <img src={reference} alt="" /> : <span>{t({ en: "Choose a photo", tr: "Fotoğraf seç" })}</span>}
                    <em>{t({ en: "Clear face · good light · one person", tr: "Net yüz · iyi ışık · tek kişi" })}</em>
                  </button>
                  <label className={css.declare}>
                    <input type="checkbox" checked={declared} onChange={(e) => setDeclared(e.target.checked)} disabled={step === "making"} />
                    <span className={css.box} aria-hidden />
                    <span>
                      {t({
                        en: "I have the right to use the image of the person in this photo.",
                        tr: "Bu fotoğraftaki kişinin görüntüsünü kullanma hakkına sahibim.",
                      })}
                    </span>
                  </label>
                  <p className={css.rule}>
                    {t({ en: "Minors, well-known people and group photos are refused.", tr: "Reşit olmayan, tanınmış ya da birden fazla kişi kabul edilmez." })}
                  </p>
                </>
              )}
            </div>

            <div className={css.preview}>
              <div className={css.slots}>
                {MADE.map((m) => (
                  <span key={m.src} className={css.slot}>
                    {step === "making" && <i className={css.waiting} />}
                    <em>{t(m.label)}</em>
                  </span>
                ))}
              </div>
              <div className={css.cost}>
                <span>
                  <b>{RUN}</b> {t({ en: "credit a try", tr: "kredi · deneme" })}
                  <em>
                    {" · "}
                    {t({ en: `${Math.max(0, s.credits - RUN)} left after`, tr: `sonrası ${Math.max(0, s.credits - RUN)} kredi` })}
                  </em>
                </span>
                {step === "making" ? (
                  <button className={css.primary} disabled>
                    {t({ en: "Making the cast", tr: "Kadro hazırlanıyor" })}
                  </button>
                ) : short ? (
                  <Link href="/packages?from=/studio" className={css.primary}>
                    {t({ en: "Add credits", tr: "Kredi ekle" })} <Arrow size={13} />
                  </Link>
                ) : (
                  <button className={css.primary} onClick={make} disabled={!canMake} title={!canMake && road === "text" ? t({ en: "Pick a trait or write a line", tr: "Bir özellik seç ya da bir cümle yaz" }) : undefined}>
                    {t({ en: "Make", tr: "Üret" })} <Arrow size={13} />
                  </button>
                )}
              </div>
              {road === "reference" && <p className={css.rule}>{t({ en: "Reviewed by Liora before it can be used.", tr: "Kullanıma açılmadan önce Liora inceler." })}</p>}
            </div>
          </div>
        ) : step === "result" ? (
          <>
            <div className={css.made}>
              {MADE.map((m, i) => (
                <figure key={m.src} style={{ animationDelay: `${i * 110}ms` }}>
                  <span>
                    <img src={m.src} alt="" />
                  </span>
                  <figcaption>{t(m.label)}</figcaption>
                </figure>
              ))}
            </div>
            <form
              className={css.save}
              onSubmit={(e) => {
                e.preventDefault();
                save(road === "reference");
              }}
            >
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t({ en: "Give it a name", tr: "Bir isim ver" })} aria-label={t({ en: "Name", tr: "İsim" })} autoFocus />
              {/* a likeness from a reference is only kept as yours alone */}
              {road === "text" && (
                <button className={css.secondary} disabled={!name.trim()}>
                  {t({ en: "Use it", tr: "Kullan" })}
                </button>
              )}
              <button type="button" className={css.primary} disabled={!name.trim() || s.credits < OWN} onClick={() => save(true)}>
                {t({ en: `Use it and make it mine · ${OWN} credits`, tr: `Kullan ve kendi mankenim yap · ${OWN} kredi` })} <Arrow size={13} />
              </button>
              <button type="button" className={css.quiet} onClick={make} disabled={short}>
                {t({ en: `Make again · ${RUN} credit`, tr: `Yeniden üret · ${RUN} kredi` })}
              </button>
            </form>
            <p className={css.rule}>{t({ en: "Made yours, no other account can use this model.", tr: "Kendi mankenin yaptığında başka hiçbir hesap bu mankeni kullanamaz." })}</p>
          </>
        ) : (
          /* saved: where to go next */
          <div className={css.done}>
            <img src={MADE[0].src} alt="" />
            <div>
              <p className={css.doneTitle}>{t({ en: `${name} is in your cast.`, tr: `${name} kadronda.` })}</p>
              <p className={css.line}>
                {road === "reference"
                  ? t({ en: "In review · you'll be told when it opens.", tr: "Onay bekliyor · açılınca haber vereceğiz." })
                  : t({ en: "Ready to use in any flow.", tr: "Her akışta kullanılabilir." })}
              </p>
              <span className={css.doneActions}>
                {back && road === "text" && saved && (
                  <Link href={`${back}?cast=${saved}`} className={css.primary}>
                    {t({ en: "Back to the flow", tr: "Akışa dön" })} <Arrow size={13} />
                  </Link>
                )}
                {saved && (
                  <Link href={`/library/cast/${saved}`} className={back && road === "text" ? css.quiet : css.primary}>
                    {t({ en: "Open the cast", tr: "Cast'i aç" })}
                  </Link>
                )}
              </span>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
