"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  AGES,
  BRANDS,
  EMPTY_PROFILE,
  FOR,
  JOBS,
  KID_AGES,
  RACK,
  STYLES,
  TALK,
  TIERS,
  TOOLS,
  VERTICALS,
  WHERE,
  WHO,
  WHY,
  adults,
  castEcho,
  cleanSite,
  listOf,
  pickStyle,
  readSite,
  styleEcho,
  styleNames,
  suggestCast,
  suggestSetting,
  summary,
  toolsEcho,
  waitEcho,
  waitLine,
  type Answer,
  type BrandProfile,
} from "@/lib/brand";
import { ROLE_META, type L, type Role } from "@/lib/data";
import { readGuest, writeGuest } from "@/lib/guest";
import { useAtelier } from "@/lib/store";
import { SETS } from "../explore/sets";
import { OPTIONS, type Have } from "../home/options";
import { Arrow } from "../icons";
import css from "./Welcome.module.css";

/* Onboarding, on the dashboard's own linen. Two rooms share these screens:

   /start   — before an account. The brand answers, sees "Atölyen hazır.",
              picks what it has ("Elinde ne var?"); someone just looking
              picks a sample. Either way the account comes next, and once it
              opens they land straight in that flow (Elif: onboarding always
              ends at sign-up; the dashboard is for accounts). Answers are
              kept apart (lib/guest) and carried into the account.
   /welcome — someone who signed up directly: "Hesabın açıldı." then the
              same questions, then the flow.

   Each answer may say in one line what it changes. A single answer moves
   on by itself only when there is no such line — a line is meant to be read. */

export type Step = "opened" | "for" | "name" | "reading" | "wear" | "tier" | "style" | "where" | "ready" | "question" | "job" | "why" | "tools" | "talk" | "look";
type Mode = "start" | "account";

const PATHS: Record<Mode, { brand: Step[]; look: Step[] }> = {
  /* before the account: may we write is asked on the sign-up form, with the email */
  start: { brand: ["for", "name", "wear", "tier", "style", "where"], look: ["for", "job", "why", "tools"] },
  account: { brand: ["for", "name", "wear", "tier", "style", "where"], look: ["for", "job", "why", "tools", "talk"] },
};

const INPUT: Partial<Record<Have, "product" | "onModel" | "flat">> = { ghost: "product", onModel: "onModel", flat: "flat" };
const ADVANCE_MS = 700; // only for answers with nothing more to say
const thinProfile = (p: BrandProfile) => !p.who.length && !p.style.length && !p.where.length;

export function Welcome({ mode = "account", step: initial, back, next: nextUrl, fresh }: { mode?: Mode; step?: Step; back?: "profile"; next?: string; fresh?: boolean }) {
  const { s, t, set, ready } = useAtelier();
  const router = useRouter();
  const [step, setStep] = useState<Step>(initial ?? (mode === "start" ? "for" : "opened"));
  const [peek, setPeek] = useState<Have | null>(null);
  /* before an account the answers live in the guest store; a fresh /start begins empty */
  const fromGuest = mode === "start" && !fresh;
  const [draft, setDraft] = useState<BrandProfile | null>(() => (fromGuest ? (readGuest()?.profile ?? null) : null));
  const [brand, setBrand] = useState<string | null>(() => (fromGuest ? (readGuest()?.brand ?? null) : null));
  const [site, setSite] = useState<string | null>(() => (fromGuest ? (readGuest()?.website ?? null) : null));
  const [elsewhere, setElsewhere] = useState(false);
  const [echo, setEcho] = useState<{ l: L; n: number } | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const readTo = useRef<Step>("wear"); // where the site reading lands
  const base = mode === "start" ? "/start" : "/welcome";

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const apply = () => (document.hidden || reduce ? v.pause() : v.play().catch(() => {}));
    v.playbackRate = 0.6;
    apply();
    document.addEventListener("visibilitychange", apply);
    return () => document.removeEventListener("visibilitychange", apply);
  }, [ready]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  /* the site is read, then the questions come back filled */
  useEffect(() => {
    if (step !== "reading") return;
    const id = window.setTimeout(() => {
      setStep(readTo.current);
      window.history.replaceState(null, "", `${base}?step=${readTo.current}${back ? `&back=${back}` : ""}`);
    }, 3200);
    return () => window.clearTimeout(id);
  }, [step, back, base]);

  if (!ready) return <main className={`${css.welcome} ink`} />;

  const p = draft ?? (mode === "start" ? EMPTY_PROFILE : (s.profile ?? EMPTY_PROFILE));
  const brandName = brand ?? (mode === "start" ? "" : s.brand);
  const siteName = site ?? (mode === "start" ? "" : s.website);
  const agency = p.for === "agency";
  const looking = p.for === "explore";
  const away = !p.for && !!p.waitlist; // their rail is not fashion yet
  const role: Role = mode === "start" ? "explorer" : s.role; // a new account starts on the free plan
  const filled = (q: string) => !!p.read && !!p.prefilled?.includes(q);

  const pathOf = (prof: BrandProfile) => PATHS[mode][prof.for === "explore" ? "look" : "brand"];
  const path = pathOf(p);

  const nextOf = (st: Step, prof: BrandProfile = p): Step | "exit" => {
    if (st === "for" && !prof.for && prof.waitlist) return "look";
    const list = pathOf(prof);
    const i = list.indexOf(st);
    if (i >= 0 && i < list.length - 1) return list[i + 1];
    const look = prof.for === "explore";
    if (back === "profile") return look ? "exit" : "ready";
    if (look) return "look";
    if (mode === "start") return "ready";
    return thinProfile(prof) ? "question" : "ready";
  };
  const prevOf = (st: Step): Step | null => {
    if (st === "reading") return "name";
    if (st === "question") return mode === "start" ? "ready" : null;
    if (st === "ready") return path[path.length - 1];
    if (st === "look") return looking ? path[path.length - 1] : "for";
    const i = path.indexOf(st);
    if (i > 0) return path[i - 1];
    return mode === "start" ? null : "opened";
  };

  /* a question that comes back answered (from the site, or a second pass) says its line at once */
  const echoFor = (st: Step): L | null => {
    if (st === "for") return p.waitlist && !p.for ? waitEcho(p.waitlist) : null;
    if (st === "wear") return p.who.length ? castEcho(p, role) : null;
    if (st === "tier") return TIERS.find((a) => a.id === p.tier)?.echo ?? null;
    if (st === "style") return styleEcho(p, role);
    if (st === "why") return WHY.find((a) => a.id === p.why)?.echo ?? null;
    if (st === "tools") return toolsEcho(p.tools ?? []);
    if (st === "talk") return TALK.find((a) => a.id === p.talk?.[p.talk.length - 1])?.echo ?? null;
    return null;
  };

  const save = (nextP: BrandProfile, q?: string, said?: L | null) => {
    const kept = q ? { ...nextP, prefilled: nextP.prefilled?.filter((x) => x !== q) } : nextP;
    setDraft(kept);
    if (mode === "start") {
      writeGuest({ profile: kept, brand: brandName, website: siteName });
      /* answering here is someone without an account: the account pages wait for sign-up */
      if (!s.guest) set({ guest: true });
    } else set({ profile: kept });
    setEcho((e) => (said ? { l: said, n: (e?.n ?? 0) + 1 } : null));
  };

  const leave = (href: string) => {
    window.clearTimeout(timer.current);
    set({ onboarded: true });
    router.push(href);
  };

  const go = (to: Step | "exit" | null) => {
    window.clearTimeout(timer.current);
    if (to === null) return;
    if (to === "exit") return leave(back === "profile" ? "/profile?tab=brand" : (nextUrl ?? "/"));
    const said = echoFor(to);
    setEcho(said ? { l: said, n: 0 } : null);
    setStep(to);
    window.history.replaceState(null, "", `${base}?step=${to}${back ? `&back=${back}` : ""}`);
  };
  const forward = (st: Step, prof: BrandProfile = p) => go(nextOf(st, prof));
  const backward = (st: Step) => go(prevOf(st));

  /* a single answer with nothing more to say moves on by itself */
  const thenGo = (to: Step | "exit") => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => go(to), ADVANCE_MS);
  };

  /* the end of onboarding before an account: remember where they are going, then the account */
  const toAccount = (href: string, from: "start" | "make") => {
    writeGuest({ profile: p, brand: brandName, website: siteName, next: href });
    router.push(`/signup?from=${from}`);
  };

  /* answering ends onboarding and opens the one flow that answer leads to */
  const choose = (id: Have, href: string) => {
    if (mode === "start") return toAccount(href, "start");
    const input = INPUT[id];
    set({ onboarded: true, ...(input ? { lastInput: input } : {}) });
    router.push(href);
  };

  const skip = () => {
    if (back === "profile") return router.push("/profile?tab=brand");
    leave(nextUrl ?? "/");
  };

  const submitName = () => {
    const name = brandName.trim();
    if (!name) return;
    const url = cleanSite(siteName);
    if (mode === "account") set({ brand: name, website: url });
    /* read the site only into what is still unanswered */
    if (url && !p.read) {
      const r = readSite(url);
      const merged: BrandProfile = {
        ...p,
        rack: p.rack.length ? p.rack : r.rack,
        who: p.who.length ? p.who : r.who,
        ages: p.ages.length ? p.ages : r.ages,
        tier: p.tier ?? r.tier,
        style: p.style.length ? p.style : r.style,
        where: p.where.length ? p.where : r.where,
        read: url,
        prefilled: r.prefilled,
      };
      save(merged);
      if (mode === "start") writeGuest({ profile: merged, brand: name, website: url });
      const to = nextOf("name", merged);
      readTo.current = to === "exit" ? "wear" : to;
      go("reading");
      return;
    }
    if (mode === "start") writeGuest({ profile: p, brand: name, website: url });
    forward("name");
  };

  const at = path.indexOf(step === "reading" ? "name" : step);
  const asking = at >= 0 || step === "reading";
  const fromSite = { en: "Read from your site — go on if it's right.", tr: "Sitenden okuduk; doğruysa devam et." };
  const nameQ =
    p.for === "agency"
      ? t({ en: "What's your studio called?", tr: "Stüdyonun adı ne?" })
      : p.for === "employer"
        ? t({ en: "What's the brand you work for called?", tr: "Çalıştığın markanın adı ne?" })
        : t({ en: "What's your brand called?", tr: "Markanın adı ne?" });

  return (
    <main className={`${css.welcome} ink`} data-step={step} data-peek={peek ? "" : undefined} data-asking={asking || step === "ready" || step === "look" || undefined}>
      <div className={css.ground} aria-hidden>
        <img className={css.silk} src="/img/bg-silk.jpg" alt="" />
        <video ref={video} className={css.silk} src="/video/silk.mp4" poster="/img/bg-silk.jpg" muted loop playsInline preload="auto" />
        <div className={css.scrim} />
        <div className="grain" />
      </div>

      <header className={css.top}>
        <span className={css.mark}>LIORA</span>
        {asking && (
          <ol className={css.progress} aria-label={t({ en: `Question ${at + 1} of ${path.length}`, tr: `${path.length} sorudan ${at + 1}.` })}>
            {path.map((a, i) => (
              <li key={a} data-done={i < at || undefined} data-now={i === at || undefined} />
            ))}
          </ol>
        )}
        {mode === "start" ? (
          <Link href="/signin" className={css.skip}>
            {t({ en: "Sign in", tr: "Giriş yap" })}
            <Arrow size={13} />
          </Link>
        ) : (
          step !== "opened" && (
            <button className={css.skip} onClick={skip}>
              {back === "profile" ? t({ en: "Close", tr: "Kapat" }) : t({ en: "Skip", tr: "Atla" })}
              <Arrow size={13} />
            </button>
          )
        )}
      </header>

      {step === "opened" && (
        <section className={css.opened} key="opened">
          {s.username && <p className={css.handle}>@{s.username}</p>}
          <h1>{t({ en: "Your account is open.", tr: "Hesabın açıldı." })}</h1>
          <p className={css.line}>
            <span>{t({ en: "Free plan", tr: "Ücretsiz plan" })}</span>
            <span>{t(ROLE_META[s.role].label)}</span>
            <span>{t({ en: `${s.credits} trial credits`, tr: `${s.credits} deneme kredisi` })}</span>
          </p>
          <button className={css.go} onClick={() => go(path[0])} autoFocus>
            {t({ en: "Continue", tr: "Devam" })}
            <Arrow size={16} />
          </button>
        </section>
      )}

      {step === "for" && (
        <Ask
          key="for"
          q={t({ en: "Who are you shooting for?", tr: "Kimin için çekiyorsun?" })}
          lede={mode === "start" ? t({ en: "A minute, no account needed. Every answer changes something.", tr: "Bir dakika sürer, hesap gerekmez. Her cevap bir şeyi değiştirir." }) : t({ en: "A minute. Every answer changes something on your canvas.", tr: "Bir dakika sürer. Her cevap kanvasında bir şeyi değiştirir." })}
        >
          <Words
            list={FOR}
            on={(id) => p.for === id}
            onPick={(a) => {
              const nextP = { ...p, for: a.id as BrandProfile["for"], waitlist: undefined };
              setElsewhere(false);
              save(nextP);
              thenGo(nextOf("for", nextP));
            }}
          />
          {/* the worlds after fashion: asked quietly, so we know which opens next */}
          {elsewhere || away ? (
            <div className={css.more}>
              <span className={css.rowLabel}>{t({ en: "What do you sell?", tr: "Ne satıyorsun?" })}</span>
              <Words small list={VERTICALS} on={(id) => away && p.waitlist === id} onPick={(a) => save({ ...p, for: undefined, waitlist: a.id }, undefined, waitEcho(a.id))} />
            </div>
          ) : (
            <button type="button" className={css.aside} onClick={() => setElsewhere(true)}>
              {t({ en: "Selling something besides fashion?", tr: "Moda dışı bir şey mi satıyorsun?" })}
            </button>
          )}
          <Foot echo={echo} onBack={prevOf("for") ? () => backward("for") : undefined} onPass={away ? undefined : () => forward("for")} next={away ? { ok: true, onNext: () => go("look"), glow: true } : undefined} />
        </Ask>
      )}

      {step === "name" && (
        <Ask key="name" q={nameQ} lede={t({ en: "Add your site and we'll read the rest.", tr: "Siteni de yazarsan gerisini biz okuruz." })}>
          <form
            className={css.names}
            onSubmit={(e) => {
              e.preventDefault();
              submitName();
            }}
          >
            <input className={css.brandField} value={brandName} onChange={(e) => setBrand(e.target.value)} placeholder={agency ? "Studio Ova" : "Atelier Ova"} aria-label={t({ en: "Name", tr: "Ad" })} autoFocus autoComplete="organization" />
            <input className={css.siteField} value={siteName} onChange={(e) => setSite(e.target.value)} placeholder={t({ en: "site or @instagram", tr: "site ya da @instagram" })} aria-label={t({ en: "Site or Instagram", tr: "Site ya da Instagram" })} inputMode="url" autoComplete="url" />
            {agency && (
              <div className={css.more}>
                <span className={css.rowLabel}>{t({ en: "How many brands?", tr: "Kaç markayla çalışıyorsun?" })}</span>
                <Words small list={BRANDS} on={(id) => p.brands === id} onPick={(a) => save({ ...p, brands: a.id })} />
              </div>
            )}
            <Foot onBack={prevOf("name") ? () => backward("name") : undefined} next={{ ok: !!brandName.trim(), submit: true }} />
          </form>
        </Ask>
      )}

      {step === "reading" && (
        <Ask key="reading" q={t({ en: "Reading your site", tr: "Siten okunuyor" })} lede={p.read}>
          <ul className={css.reading}>
            {[listOf(RACK, p.rack, s.lang), t(summary(p)), listOf(WHERE, p.where, s.lang)].filter(Boolean).map((x, i) => (
              <li key={i} style={{ "--i": i } as CSSProperties}>
                {x}
              </li>
            ))}
          </ul>
          <span className={css.readBar} aria-hidden />
        </Ask>
      )}

      {step === "wear" && (
        <Ask key="wear" q={t({ en: "Who wears it?", tr: "Kim giyiyor?" })} lede={filled("wear") ? t(fromSite) : t({ en: "Pick any.", tr: "Birden fazla seçebilirsin." })}>
          <Words
            list={WHO}
            on={(id) => p.who.includes(id)}
            onPick={(a) => {
              const who = p.who.includes(a.id) ? p.who.filter((x) => x !== a.id) : WHO.map((x) => x.id).filter((x) => x === a.id || p.who.includes(x));
              const nextP = { ...p, who, ages: who.some((x) => x !== "kids") ? p.ages : [], kidAges: who.includes("kids") ? p.kidAges : undefined };
              save(nextP, "wear", who.length ? castEcho(nextP, role) : null);
            }}
          />
          {adults(p).length > 0 && (
            <div className={css.more}>
              <span className={css.rowLabel}>{t({ en: "How old?", tr: "Kaç yaşında?" })}</span>
              <Words
                small
                list={AGES}
                on={(id) => p.ages.includes(id)}
                onPick={(a) => {
                  const ages = p.ages.includes(a.id) ? p.ages.filter((x) => x !== a.id) : AGES.map((x) => x.id).filter((x) => x === a.id || p.ages.includes(x));
                  const nextP = { ...p, ages };
                  save(nextP, "wear", castEcho(nextP, role));
                }}
              />
            </div>
          )}
          {p.who.includes("kids") && (
            <div className={css.more}>
              <span className={css.rowLabel}>{t({ en: "Children of what age?", tr: "Kaç yaşında çocuklar?" })}</span>
              <Words
                small
                list={KID_AGES}
                on={(id) => !!p.kidAges?.includes(id)}
                onPick={(a) => {
                  const had = p.kidAges ?? [];
                  const kidAges = had.includes(a.id) ? had.filter((x) => x !== a.id) : KID_AGES.map((x) => x.id).filter((x) => x === a.id || had.includes(x));
                  save({ ...p, kidAges }, "wear", castEcho(p, role));
                }}
              />
            </div>
          )}
          <Foot echo={echo} onBack={prevOf("wear") ? () => backward("wear") : undefined} onPass={() => forward("wear")} next={{ ok: p.who.length > 0, onNext: () => forward("wear"), glow: !!echo }} />
        </Ask>
      )}

      {step === "tier" && (
        <Ask key="tier" q={t({ en: "What does a piece sell for?", tr: "Bir parçan kaça satılıyor?" })} lede={filled("tier") ? t(fromSite) : agency ? t({ en: "Most of your brands.", tr: "Markalarının çoğu için." }) : undefined}>
          <Words list={TIERS} on={(id) => p.tier === id} onPick={(a) => save({ ...p, tier: a.id as BrandProfile["tier"] }, "tier", a.echo)} />
          <Foot echo={echo} onBack={prevOf("tier") ? () => backward("tier") : undefined} onPass={() => forward("tier")} next={{ ok: !!p.tier, onNext: () => forward("tier"), glow: !!p.tier }} />
        </Ask>
      )}

      {step === "style" && (
        <Ask key="style" q={t({ en: "If it were one frame?", tr: "Bir kareyle anlatsan?" })} lede={filled("style") ? t(fromSite) : t({ en: "Pick a way of shooting; add a pose, light or frame if you like.", tr: "Bir çekim stili seç; istersen poz, ışık ya da kadraj ekle." })}>
          <div className={css.styles} role="list">
            {STYLES.map((a, i) => {
              const on = p.style.includes(a.id);
              return (
                <div key={a.id} role="listitem" className={css.cell} style={{ "--i": i } as CSSProperties}>
                  <button
                    className={`${css.answer} ${on ? css.on : ""}`}
                    aria-pressed={on}
                    onClick={() => {
                      const nextP = { ...p, style: pickStyle(p.style, a.id) };
                      save(nextP, "style", styleEcho(nextP, role));
                    }}
                  >
                    <span className={css.frame}>
                      <img src={a.img} alt="" />
                    </span>
                    <span className={css.label}>{t(a.label)}</span>
                    {a.sub && <span className={css.styleSub}>{t(a.sub)}</span>}
                  </button>
                </div>
              );
            })}
          </div>
          <Foot echo={echo} onBack={prevOf("style") ? () => backward("style") : undefined} onPass={() => forward("style")} next={{ ok: p.style.length > 0, onNext: () => forward("style"), glow: !!echo }} />
        </Ask>
      )}

      {step === "where" && (
        <Ask key="where" q={t({ en: "Where will you use what you make here?", tr: "Görselleri nerede kullanacaksın?" })} lede={filled("where") ? t(fromSite) : t({ en: "Pick any.", tr: "Birden fazla seçebilirsin." })}>
          <Words
            list={WHERE}
            on={(id) => p.where.includes(id)}
            onPick={(a) => {
              const where = p.where.includes(a.id) ? p.where.filter((x) => x !== a.id) : [...p.where, a.id];
              save({ ...p, where }, "where");
            }}
          />
          <Foot onBack={prevOf("where") ? () => backward("where") : undefined} onPass={() => forward("where")} next={{ ok: p.where.length > 0, onNext: () => forward("where") }} />
        </Ask>
      )}

      {step === "job" && (
        <Ask key="job" q={t({ en: "What do you do?", tr: "Ne iş yapıyorsun?" })} lede={t({ en: "Looking is free. We'd just like to know who's looking.", tr: "Bakmak serbest. Sadece kimin baktığını bilmek istiyoruz." })}>
          <Words
            list={JOBS}
            on={(id) => p.job === id}
            onPick={(a) => {
              const nextP = { ...p, job: a.id, jobOther: a.id === "other" ? p.jobOther : undefined };
              save(nextP);
              if (a.id !== "other") thenGo(nextOf("job", nextP));
            }}
          />
          {p.job === "other" && (
            <div className={css.more}>
              <input className={css.siteField} value={p.jobOther ?? ""} onChange={(e) => save({ ...p, jobOther: e.target.value })} placeholder={t({ en: "Write your work", tr: "Mesleğini yaz" })} aria-label={t({ en: "Your work", tr: "Mesleğin" })} autoFocus />
            </div>
          )}
          <Foot onBack={prevOf("job") ? () => backward("job") : undefined} onPass={() => forward("job")} next={p.job ? { ok: p.job !== "other" || !!p.jobOther?.trim(), onNext: () => forward("job") } : undefined} />
        </Ask>
      )}

      {step === "why" && (
        <Ask key="why" q={t({ en: "What brought you here?", tr: "Seni buraya ne getirdi?" })}>
          <Words list={WHY} on={(id) => p.why === id} onPick={(a) => save({ ...p, why: a.id }, undefined, a.echo)} />
          <Foot echo={echo} onBack={prevOf("why") ? () => backward("why") : undefined} onPass={() => forward("why")} next={{ ok: !!p.why, onNext: () => forward("why"), glow: !!p.why }} />
        </Ask>
      )}

      {step === "tools" && (
        <Ask key="tools" q={t({ en: "What do you work with?", tr: "Hangi araçlarla çalışıyorsun?" })} lede={t({ en: "Pick any.", tr: "Birden fazla seçebilirsin." })}>
          <Words
            list={TOOLS}
            on={(id) => !!p.tools?.includes(id)}
            onPick={(a) => {
              const had = p.tools ?? [];
              const tools = had.includes(a.id) ? had.filter((x) => x !== a.id) : [...had, a.id];
              save({ ...p, tools }, undefined, toolsEcho(tools));
            }}
          />
          <Foot echo={echo} onBack={prevOf("tools") ? () => backward("tools") : undefined} onPass={() => forward("tools")} next={{ ok: !!p.tools?.length, onNext: () => forward("tools"), glow: !!echo }} />
        </Ask>
      )}

      {step === "talk" && (
        <Ask key="talk" q={t({ en: "Shall we keep in touch?", tr: "Haberleşelim mi?" })} lede={t({ en: "Your email is used only for what you pick.", tr: "E-postanı yalnızca seçtiğin şey için kullanırız." })}>
          <Words
            list={TALK}
            on={(id) => !!p.talk?.includes(id)}
            onPick={(a) => {
              const had = p.talk ?? [];
              const talk = a.id === "no" ? (had.includes("no") ? [] : ["no"]) : had.includes(a.id) ? had.filter((x) => x !== a.id) : [...had.filter((x) => x !== "no"), a.id];
              save({ ...p, talk, company: talk.includes("partner") ? p.company : undefined }, undefined, talk.includes(a.id) ? a.echo : null);
            }}
          />
          {p.talk?.includes("partner") && (
            <div className={css.more}>
              <span className={css.rowLabel}>{t({ en: "Where do you work?", tr: "Nerede çalışıyorsun?" })}</span>
              <input className={css.siteField} value={p.company ?? ""} onChange={(e) => save({ ...p, company: e.target.value })} placeholder={t({ en: "Company or studio", tr: "Şirket ya da stüdyo" })} autoComplete="organization" />
            </div>
          )}
          <Foot echo={echo} onBack={prevOf("talk") ? () => backward("talk") : undefined} onPass={() => forward("talk")} next={{ ok: !!p.talk?.length, onNext: () => forward("talk"), glow: !!echo }} />
        </Ask>
      )}

      {step === "look" && (
        <section className={`${css.ask} ${css.brand}`} key="look">
          <h1 className={css.question}>{looking ? t({ en: "Look around.", tr: "Rahatça bak." }) : t({ en: "We start with fashion.", tr: "Şimdilik modayla başlıyoruz." })}</h1>
          <p className={css.lede}>
            {looking
              ? mode === "start"
                ? t({ en: "Pick a sample set. Open your account and we start right there — the first frame is free.", tr: "Bir örnek set seç. Hesabını aç, doğrudan oradan başlayalım; ilk kare ücretsiz." })
                : t({ en: "The sample sets are ready. Try the canvas without uploading — the first frame is free.", tr: "Örnek setler hazır. Yüklemeden kanvası dene; ilk kare ücretsiz." })
              : `${t(waitLine(p.waitlist))} ${t({ en: "Until then, try it with a sample.", tr: "O zamana kadar bir örnekle dene." })}`}
          </p>
          <div className={css.answers} role="list">
            {SETS.map((x, i) => {
              const door = x.doors.find((d) => d.status === "open" && d.href);
              if (!door?.href) return null;
              const href = door.href;
              return (
                <div key={x.id} role="listitem" className={css.cell} style={{ "--i": i } as CSSProperties}>
                  <button className={css.answer} onClick={() => (mode === "start" ? toAccount(href, "make") : leave(href))}>
                    <span className={css.frame}>
                      <img src={door.after} alt="" />
                    </span>
                    {/* where it leads, first — then what it is (Elif: the flow should lead) */}
                    <span className={css.door} data-lead>
                      {t(door.name)}
                      <Arrow size={12} />
                    </span>
                    <span className={css.label}>{t(x.name)}</span>
                    <span className={css.sub}>{t(x.kind)}</span>
                  </button>
                </div>
              );
            })}
          </div>
          <div className={css.foot}>
            {prevOf("look") && (
              <button type="button" className={css.back} onClick={() => backward("look")}>
                {t({ en: "Back", tr: "Geri" })}
              </button>
            )}
            {mode === "account" && (
              <button type="button" className={css.pass} onClick={() => leave("/salon")}>
                {t({ en: "Or browse the Salon", tr: "ya da Salon'a göz at" })}
              </button>
            )}
          </div>
        </section>
      )}

      {step === "ready" && <Ready p={p} brand={brandName} mode={mode} role={role} onNext={back === "profile" ? () => go("exit") : () => go("question")} onBack={() => backward("ready")} back={back} />}

      {step === "question" && (
        <section className={css.ask} key="question">
          <h1 className={css.question}>{t({ en: "What do you have?", tr: "Elinde ne var?" })}</h1>
          <p className={css.lede}>{mode === "start" ? t({ en: "Choose; once your account is open, you start right there.", tr: "Seç; hesabını açınca doğrudan oradan başlarsın." }) : t({ en: "Choose, and we'll open the right flow.", tr: "Seç, seni doğru akışa götürelim." })}</p>
          <div className={css.answers} role="list">
            {OPTIONS.map((o, i) => {
              const door = o.doors.find((d) => d.status === "open" && d.href);
              if (!door?.href) return null;
              const href = door.href;
              return (
                <div key={o.id} role="listitem" className={css.cell} style={{ "--i": i } as CSSProperties}>
                  <button
                    className={`${css.answer} ${peek === o.id ? css.on : ""}`}
                    onClick={() => choose(o.id, href)}
                    onMouseEnter={() => setPeek(o.id)}
                    onMouseLeave={() => setPeek((x) => (x === o.id ? null : x))}
                    onFocus={() => setPeek(o.id)}
                    onBlur={() => setPeek((x) => (x === o.id ? null : x))}
                  >
                    <span className={css.frame}>
                      <img src={o.example} alt="" />
                    </span>
                    <span className={css.idx}>{String(i + 1).padStart(2, "0")}</span>
                    <span className={css.label}>{t(o.label)}</span>
                    <span className={css.sub}>{t(o.sub)}</span>
                    <span className={css.door}>
                      {t(door.name)}
                      <Arrow size={12} />
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
          {prevOf("question") && (
            <div className={css.foot}>
              <button type="button" className={css.back} onClick={() => backward("question")}>
                {t({ en: "Back", tr: "Geri" })}
              </button>
            </div>
          )}
        </section>
      )}
    </main>
  );
}

function Ask({ q, lede, children }: { q: string; lede?: string; children: ReactNode }) {
  return (
    <section className={`${css.ask} ${css.brand}`}>
      <h1 className={css.question}>{q}</h1>
      {lede && <p className={css.lede}>{lede}</p>}
      <div className={css.body}>{children}</div>
    </section>
  );
}

function Words({ list, on, onPick, small }: { list: Answer[]; on: (id: string) => boolean; onPick: (a: Answer) => void; small?: boolean }) {
  const { t } = useAtelier();
  return (
    <div className={css.words} data-small={small || undefined}>
      {list.map((a, i) => (
        <button key={a.id} type="button" className={css.word} aria-pressed={on(a.id)} style={{ "--i": i } as CSSProperties} onClick={() => onPick(a)}>
          <span className={css.wordName}>{t(a.label)}</span>
          {a.sub && <span className={css.wordSub}>{t(a.sub)}</span>}
        </button>
      ))}
    </div>
  );
}

/* what the answer changes sits right above the way on — read, then go on (the way lights up) */
function Foot({ onBack, onPass, next, echo }: { onBack?: () => void; onPass?: () => void; next?: { ok: boolean; onNext?: () => void; submit?: boolean; glow?: boolean }; echo?: { l: L; n: number } | null }) {
  const { t } = useAtelier();
  return (
    <>
      {echo !== undefined && (
        <p className={css.echo} aria-live="polite">
          {echo && <span key={echo.n}>{t(echo.l)}</span>}
        </p>
      )}
      <div className={css.foot}>
        {onBack && (
          <button type="button" className={css.back} onClick={onBack}>
            {t({ en: "Back", tr: "Geri" })}
          </button>
        )}
        {onPass && (
          <button type="button" className={css.pass} onClick={onPass}>
            {t({ en: "Not now", tr: "Geç" })}
          </button>
        )}
        {next && (
          <button type={next.submit ? "submit" : "button"} className={css.next} data-glow={(next.ok && next.glow) || undefined} disabled={!next.ok} onClick={next.submit ? undefined : next.onNext}>
            {t({ en: "Continue", tr: "Devam" })}
            <Arrow size={14} />
          </button>
        )}
      </div>
    </>
  );
}

/* what the answers set up — the dashboard's cards and cables, already connected */
function Ready({ p, brand, mode, role, onNext, onBack, back }: { p: BrandProfile; brand: string; mode: Mode; role: Role; onNext: () => void; onBack: () => void; back?: "profile" }) {
  const { s, t } = useAtelier();
  const cast = suggestCast(p, role);
  const setting = suggestSetting(p, role);
  const tier = TIERS.find((x) => x.id === p.tier);
  const firstStyle = STYLES.find((x) => p.style.includes(x.id));
  const agency = p.for === "agency";
  const nodes: { label: L; img: string; value: string; sub?: string }[] = [
    cast
      ? { label: { en: "Cast", tr: "Kast" }, img: cast.img, value: cast.name, sub: t(cast.note) }
      : { label: { en: "Cast", tr: "Kast" }, img: "/img/home/ghost-in.jpg", value: t({ en: "Ghost mannequin", tr: "Cansız manken" }), sub: p.who.includes("kids") ? t({ en: "No children's cast", tr: "Çocuk kastı yok" }) : undefined },
    { label: { en: "Setting", tr: "Ortam" }, img: setting?.img ?? "/img/flow/set-studio.jpg", value: t(setting?.name ?? { en: "Plaster studio", tr: "Alçı stüdyo" }), sub: tier?.echo ? t(tier.echo) : undefined },
    /* the style, not a ratio: each channel takes its own ratio, chosen with the frames */
    { label: { en: "Style", tr: "Stil" }, img: firstStyle?.img ?? "/img/home/sample-out.jpg", value: p.style.length ? styleNames(p) : "—", sub: listOf(WHERE, p.where, s.lang) || undefined },
  ];
  return (
    <section className={css.ready} key="ready">
      {brand && <p className={css.handle}>{brand}</p>}
      <h1 className={css.readyTitle}>{agency ? t({ en: "Your studio is ready.", tr: "Stüdyon hazır." }) : t({ en: "Your atelier is ready.", tr: "Atölyen hazır." })}</h1>
      <p className={css.lede}>{t(summary(p))}</p>
      <div className={css.kit}>
        {nodes.map((n, i) => (
          <div key={i} className={css.kitNode} style={{ "--i": i } as CSSProperties}>
            {i > 0 && <span className={css.wire} aria-hidden />}
            <div className={css.kitCard}>
              <span className={`${css.bar} ${css.barL}`} aria-hidden />
              <span className={`${css.bar} ${css.barR}`} aria-hidden />
              <span className={css.kitPic}>
                <img src={n.img} alt="" />
              </span>
              <span className={css.kitLabel}>{t(n.label)}</span>
              <span className={css.kitValue}>{n.value}</span>
              {n.sub && <span className={css.kitSub}>{n.sub}</span>}
            </div>
          </div>
        ))}
      </div>
      <p className={css.readyLine}>
        {mode === "start" ? t({ en: "Every job starts here — it comes with you when your account opens.", tr: "Her iş buradan başlar; hesabını açınca seninle gelir." }) : t({ en: "Every job starts here. Change any of it on the canvas.", tr: "Her iş buradan başlar. Kanvasta istediğin an değiştirirsin." })}
      </p>
      <div className={css.foot}>
        <button type="button" className={css.back} onClick={onBack}>
          {t({ en: "Back", tr: "Geri" })}
        </button>
        <button type="button" className={css.next} onClick={onNext} autoFocus>
          {back === "profile" ? t({ en: "Save", tr: "Kaydet" }) : t({ en: "Continue", tr: "Devam" })}
          <Arrow size={14} />
        </button>
      </div>
    </section>
  );
}
