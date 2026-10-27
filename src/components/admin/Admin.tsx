"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { CASTS, CAST_SET, FLOWS, ROLE_META, SETTINGS, castById, flowBySlug, settingById, type L, type Role } from "@/lib/data";
import { fmtDate, useAtelier, type Notice } from "@/lib/store";
import { Arrow, Check } from "../icons";
import { frameName } from "../review/ReviewSurface";
import { PEOPLE, People, reachable, type Person } from "./People";
import css from "./Admin.module.css";

/* wf-09 — the admin panel's job is not to manage but to finish waiting
   work. Its home is a work list, not a dashboard of numbers. Decisions here
   reach the user: a cast opens, a credit comes back, a notice arrives. */

export type AdminView = "home" | "salon" | "cast" | "review" | "catalog" | "flows" | "users" | "people" | "news" | "stats" | "audit";

const NAV: { group: L; items: { id: AdminView; label: L }[] }[] = [
  {
    group: { en: "Queues", tr: "Kuyruklar" },
    items: [
      { id: "home", label: { en: "Waiting work", tr: "Bekleyen işler" } },
      { id: "salon", label: { en: "Salon", tr: "Salon onayı" } },
      { id: "cast", label: { en: "Cast review", tr: "Cast onayı" } },
      { id: "review", label: { en: "Not-right reviews", tr: "İnceleme" } },
    ],
  },
  {
    group: { en: "Catalogue", tr: "Katalog" },
    items: [
      { id: "catalog", label: { en: "Cast and settings", tr: "Cast ve ortam" } },
      { id: "flows", label: { en: "Flows", tr: "İş akışları" } },
    ],
  },
  {
    group: { en: "Accounts", tr: "Hesaplar" },
    items: [
      { id: "users", label: { en: "Users and credits", tr: "Kullanıcılar ve kredi" } },
      { id: "people", label: { en: "Who's coming", tr: "Kimler geliyor" } },
    ],
  },
  {
    group: { en: "Other", tr: "Diğer" },
    items: [
      { id: "news", label: { en: "Updates", tr: "Duyurular" } },
      { id: "stats", label: { en: "Numbers", tr: "İstatistik" } },
      { id: "audit", label: { en: "Audit log", tr: "Denetim kaydı" } },
    ],
  },
];

/* Salon posts waiting (mock — the user's own shares arrive with the backend) */
const POSTS = [
  { id: "p1", img: "/img/salon/d1.jpg", user: "maison.noir", brand: "Maison Noir", flow: "campaign", cast: "Mateo", site: "maisonnoir.com", plan: "Creator", check: "clean" },
  { id: "p2", img: "/img/salon/n1.jpg", user: "atelier.ova", brand: "Atelier Ova", flow: "recast", cast: "Liv", site: "atelierova.co", plan: "Partner", check: "clean" },
  { id: "p3", img: "/img/salon/k2.jpg", user: "linen.lab", brand: "", flow: "campaign", cast: "Elias", site: "", plan: "Explorer", check: "watermark" },
];

const REASONS: Record<string, L> = {
  product: { en: "The product is wrong", tr: "Ürün yanlış" },
  model: { en: "The model is wrong", tr: "Manken yanlış" },
  framing: { en: "The framing is wrong", tr: "Kadraj yanlış" },
  quality: { en: "Quality is low", tr: "Kalite düşük" },
  other: { en: "Something else", tr: "Diğer" },
};

const USERS = [
  { id: "u1", name: "melis.dogan", brand: "Atelier Doğan", role: "creator" as Role, me: true },
  { id: "u2", name: "maison.noir", brand: "Maison Noir", role: "creator" as Role, credits: 64 },
  { id: "u3", name: "atelier.ova", brand: "Atelier Ova", role: "partner" as Role, credits: 1180 },
  { id: "u4", name: "linen.lab", brand: "", role: "explorer" as Role, credits: 2 },
];

type Access = Role | "closed";

const stamp = () => Date.now(); // only called from an action

export function Admin({ view: initial }: { view: AdminView }) {
  const { s, t, set, dispatch, ready } = useAtelier();
  const [view, setView] = useState<AdminView>(initial);
  const [log, setLog] = useState<{ at: number; text: string }[]>([]);
  /* queues */
  const [posts, setPosts] = useState(POSTS);
  const [why, setWhy] = useState("");
  const [refund, setRefund] = useState(true);
  /* catalogue and accounts — local to this review */
  const [access, setAccess] = useState<Record<string, Access>>(() => Object.fromEntries([...CASTS, ...SETTINGS].map((x) => [x.id, x.minRole])));
  const [open, setOpen] = useState<Record<string, boolean>>(() => Object.fromEntries(FLOWS.map((f) => [f.slug, f.status !== "soon"])));
  const [grants, setGrants] = useState<Record<string, number>>({});
  const [news, setNews] = useState<{ at: number; text: string }[]>([]);
  const [draft, setDraft] = useState("");
  const [contacted, setContacted] = useState<Record<string, boolean>>({});

  const go = (v: AdminView) => {
    setView(v);
    setWhy("");
    window.history.replaceState(null, "", v === "home" ? "/admin" : `/admin?view=${v}`);
  };
  const note = (text: string) => setLog((l) => [{ at: stamp(), text }, ...l]);
  const notify = (n: Omit<Notice, "at">) => dispatch({ type: "notify", notice: { ...n, at: stamp() } });

  const pendingCasts = s.casts.filter((c) => c.pending && !c.archived);
  /* this session's own "just looking" answers join the list when they said we may write */
  const me = s.profile;
  const people: Person[] =
    me?.for === "explore" && reachable(me.talk ?? [])
      ? [{ id: "me", user: s.username || "you", job: me.job, jobText: me.job === "other" ? me.jobOther : undefined, company: me.company, why: me.why, tools: me.tools ?? [], talk: me.talk ?? [], you: true }, ...PEOPLE]
      : PEOPLE;
  const toReach = people.filter((x) => reachable(x.talk) && !contacted[x.id]).length;
  const reviews = s.jobs.flatMap((j) => j.frames.filter((f) => f.review === "pending").map((f) => ({ job: j, frame: f })));

  /* the Salon queue moves fast: A publishes, S skips */
  useEffect(() => {
    if (view !== "salon") return;
    const key = (e: KeyboardEvent) => {
      if (/INPUT|TEXTAREA/.test((e.target as HTMLElement | null)?.tagName ?? "")) return;
      if (e.key === "a") document.getElementById("publish")?.click();
      if (e.key === "s") document.getElementById("skip")?.click();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [view]);

  if (!ready) return <main className={css.page} />;

  const counts: Partial<Record<AdminView, number>> = { salon: posts.length, cast: pendingCasts.length, review: reviews.length };

  return (
    <main className={`${css.page} ink`}>
      <header className={css.top}>
        <Link href="/admin" className={css.mark} onClick={(e) => (e.preventDefault(), go("home"))}>
          LIORA <span>Admin</span>
        </Link>
        <span className={css.me}>
          {t({ en: "Waiting", tr: "Bekleyen" })} <b>{posts.length + pendingCasts.length + reviews.length}</b>
          <Link href="/">{t({ en: "Back to Atelier", tr: "Atelier'e dön" })}</Link>
        </span>
      </header>

      <div className={css.layout}>
        <nav className={css.nav}>
          {NAV.map((g) => (
            <div key={g.group.en}>
              <p>{t(g.group)}</p>
              {g.items.map((x) => (
                <button key={x.id} aria-current={view === x.id ? "page" : undefined} onClick={() => go(x.id)}>
                  {t(x.label)}
                  {counts[x.id] ? <em>{counts[x.id]}</em> : null}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <section className={css.main} key={view}>
          {/* ── waiting work ── */}
          {view === "home" && (
            <>
              <h1>{t({ en: "Waiting work", tr: "Bekleyen işler" })}</h1>
              <div className={css.queues}>
                <Queue n={posts.length} urgent title={t({ en: "Salon posts to approve", tr: "Salon onayı bekliyor" })} line={t({ en: "Someone is waiting to be published", tr: "Biri yayınlanmayı bekliyor" })} onOpen={() => go("salon")} />
                <Queue n={pendingCasts.length} urgent title={t({ en: "Casts from a reference", tr: "Cast onayı bekliyor" })} line={t({ en: "30 credits paid, waiting to open", tr: "30 kredi ödendi, açılmayı bekliyor" })} onOpen={() => go("cast")} />
                <Queue n={reviews.length} title={t({ en: "Not-right reviews", tr: "Beğenmedim incelemesi" })} line={t({ en: "A refund to decide", tr: "Kredi iadesi kararı" })} onOpen={() => go("review")} />
                <Queue n={0} title={t({ en: "Reported posts", tr: "Bildirilen gönderi" })} line={t({ en: "User reports", tr: "Kullanıcı şikayeti" })} />
                <Queue n={toReach} title={t({ en: "Open to talk", tr: "Konuşmaya açık" })} line={t({ en: "Research chats and partnerships", tr: "Sohbet ve ortaklık isteyenler" })} onOpen={() => go("people")} />
              </div>
              <p className={css.today}>
                {t({ en: "Today", tr: "Bugün" })} · 1.284 {t({ en: "frames", tr: "üretim" })} · 37 {t({ en: "new users", tr: "yeni kullanıcı" })} · 6 {t({ en: "upgrades", tr: "paket yükseltme" })} · 12 {t({ en: "failed", tr: "başarısız" })}
              </p>
            </>
          )}

          {/* ── Salon approval ── */}
          {view === "salon" && (
            <>
              <h1>{t({ en: "Salon", tr: "Salon onayı" })}</h1>
              {posts.length === 0 ? (
                <Empty />
              ) : (
                <div className={css.review}>
                  <img className={css.shot} src={posts[0].img} alt="" />
                  <div className={css.facts}>
                    <Fact k={t({ en: "Who", tr: "Kim" })} v={`@${posts[0].user}${posts[0].brand ? ` · ${posts[0].brand}` : ""}`} />
                    <Fact k={t({ en: "How", tr: "Nasıl" })} v={`${t(flowBySlug(posts[0].flow)!.name)} · ${posts[0].cast}`} />
                    <Fact k={t({ en: "Links", tr: "Bağlantılar" })} v={posts[0].site || "—"} />
                    <Fact
                      k={t({ en: "Checks", tr: "Kontrol" })}
                      v={posts[0].check === "clean" ? t({ en: "Content clean", tr: "İçerik temiz" }) : t({ en: "Watermarked · free plan", tr: "Filigranlı · ücretsiz plan" })}
                      warn={posts[0].check !== "clean"}
                    />
                    <Fact k={t({ en: "Plan", tr: "Paket" })} v={posts[0].plan} />
                    <div className={css.decide}>
                      <button
                        id="publish"
                        className={css.primary}
                        onClick={() => {
                          note(`Salon · @${posts[0].user} yayınlandı`);
                          setPosts((p) => p.slice(1));
                        }}
                      >
                        {t({ en: "Publish", tr: "Yayınla" })} <span>A</span>
                      </button>
                      <button id="skip" className={css.quiet} onClick={() => setPosts((p) => [...p.slice(1), p[0]])}>
                        {t({ en: "Next", tr: "Sonraki" })} <span>S</span>
                      </button>
                    </div>
                    <Reject
                      why={why}
                      setWhy={setWhy}
                      onReject={() => {
                        note(`Salon · @${posts[0].user} reddedildi: ${why}`);
                        setPosts((p) => p.slice(1));
                        setWhy("");
                      }}
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── cast from a reference ── */}
          {view === "cast" && (
            <>
              <h1>{t({ en: "Cast review", tr: "Cast onayı" })}</h1>
              {pendingCasts.length === 0 ? (
                <Empty />
              ) : (
                (() => {
                  const c = pendingCasts[0];
                  const made = [c.img, ...(c.set ?? CAST_SET[c.id] ?? [])].slice(0, 3);
                  return (
                    <div className={css.review}>
                      <div className={css.compare}>
                        <figure>
                          <img src={c.ref ?? c.img} alt="" />
                          <figcaption>{t({ en: "Reference", tr: "Referans" })}</figcaption>
                        </figure>
                        {made.map((src) => (
                          <figure key={src}>
                            <img src={src} alt="" />
                            <figcaption>{t({ en: "Made", tr: "Üretilen" })}</figcaption>
                          </figure>
                        ))}
                      </div>
                      <div className={css.facts}>
                        <Fact k="Cast" v={c.name} />
                        <Fact k={t({ en: "Checks", tr: "Kontrol" })} v={t({ en: "Adult · not a known person · one person", tr: "Yetişkin · tanınmış kişi değil · tek kişi" })} />
                        <Fact k={t({ en: "Declaration", tr: "Hak beyanı" })} v={t({ en: "Given · today · melis.dogan", tr: "Verildi · bugün · melis.dogan" })} />
                        <div className={css.decide}>
                          <button
                            className={css.primary}
                            onClick={() => {
                              set({ casts: s.casts.map((x) => (x.id === c.id ? { ...x, pending: false } : x)) });
                              notify({ id: `n-cast-${c.id}`, title: { en: "Your cast is open", tr: "Cast'in kullanıma açıldı" }, sub: { en: `${c.name} · approved`, tr: `${c.name} · onaylandı` }, href: `/library/cast/${c.id}` });
                              note(`Cast · ${c.name} onaylandı`);
                            }}
                          >
                            {t({ en: "Approve", tr: "Onayla" })} <Check size={12} />
                          </button>
                        </div>
                        <label className={css.toggle}>
                          <input type="checkbox" checked={refund} onChange={(e) => setRefund(e.target.checked)} />
                          {t({ en: "Refund 30 credits if declined", tr: "Reddedilirse 30 kredi iade et" })}
                        </label>
                        <Reject
                          why={why}
                          setWhy={setWhy}
                          onReject={() => {
                            set({ casts: s.casts.map((x) => (x.id === c.id ? { ...x, archived: true, pending: false } : x)), credits: s.credits + (refund ? 30 : 0) });
                            notify({
                              id: `n-cast-${c.id}`,
                              title: { en: "Your cast was declined", tr: "Cast'in reddedildi" },
                              sub: { en: `${why}${refund ? " · 30 credits back" : ""}`, tr: `${why}${refund ? " · 30 kredi iade edildi" : ""}` },
                              href: "/library",
                            });
                            note(`Cast · ${c.name} reddedildi${refund ? " · 30 kredi iade" : ""}`);
                            setWhy("");
                          }}
                        />
                      </div>
                    </div>
                  );
                })()
              )}
            </>
          )}

          {/* ── not-right reviews and refunds ── */}
          {view === "review" && (
            <>
              <h1>{t({ en: "Not-right reviews", tr: "İnceleme" })}</h1>
              {reviews.length === 0 ? (
                <Empty />
              ) : (
                (() => {
                  const { job, frame } = reviews[0];
                  const name = frameName(frame);
                  const patch = (p: Partial<typeof frame>) => ({ frames: job.frames.map((f) => (f.id === frame.id ? { ...f, ...p } : f)) });
                  const per = job.creditPerFrame ?? 1;
                  return (
                    <div className={css.review}>
                      <img className={css.shot} src={frame.src} alt="" />
                      <div className={css.facts}>
                        <Fact k={t({ en: "Made with", tr: "Üretim" })} v={`${t(flowBySlug(job.flow)?.name ?? job.title)} · ${castById(job.castId)?.name ?? "—"} · ${settingById(job.settingId) ? t(settingById(job.settingId)!.name) : "—"}${name ? ` · ${t(name)}` : ""}`} />
                        <Fact k={t({ en: "Their reason", tr: "Sebebi" })} v={(frame.reasons ?? ["other"]).map((r) => t(REASONS[r] ?? REASONS.other)).join(", ")} warn />
                        <Fact k={t({ en: "History", tr: "Geçmiş" })} v={t({ en: "2 requests · 1 accepted", tr: "2 talep · 1'i kabul edildi" })} />
                        <div className={css.decide}>
                          <button
                            className={css.primary}
                            onClick={() => {
                              dispatch({ type: "patchJob", id: job.id, patch: patch({ review: "refunded" }) });
                              set({ credits: s.credits + per });
                              notify({ id: `n-rev-${frame.id}`, title: { en: `Review done — ${per} credit back`, tr: `İnceleme sonuçlandı — ${per} kredi iade edildi` }, sub: { en: `${job.title.en} · accepted`, tr: `${job.title.tr} · kabul edildi` }, href: `/jobs/${job.id}` });
                              note(`İnceleme · ${job.title.tr} kabul · ${per} kredi iade`);
                            }}
                          >
                            {t({ en: `Accept · refund ${per}`, tr: `Kabul et · ${per} kredi iade` })}
                          </button>
                        </div>
                        <Reject
                          why={why}
                          setWhy={setWhy}
                          onReject={() => {
                            dispatch({ type: "patchJob", id: job.id, patch: patch({ review: "declined" }) });
                            notify({ id: `n-rev-${frame.id}`, title: { en: "Review done", tr: "İnceleme sonuçlandı" }, sub: { en: why, tr: why }, href: `/jobs/${job.id}` });
                            note(`İnceleme · ${job.title.tr} reddedildi: ${why}`);
                            setWhy("");
                          }}
                        />
                      </div>
                    </div>
                  );
                })()
              )}
            </>
          )}

          {/* ── catalogue: who sees what ── */}
          {view === "catalog" && (
            <>
              <h1>{t({ en: "Cast and settings", tr: "Cast ve ortam" })}</h1>
              <div className={css.table}>
                {[...CASTS.map((c) => ({ id: c.id, name: c.name, img: c.img, wide: false })), ...SETTINGS.map((x) => ({ id: x.id, name: t(x.name), img: x.img, wide: true }))].map((x) => (
                  <div key={x.id} className={css.tr}>
                    <img src={x.img} alt="" data-wide={x.wide || undefined} />
                    <span>{x.name}</span>
                    <select
                      value={access[x.id]}
                      onChange={(e) => {
                        setAccess((a) => ({ ...a, [x.id]: e.target.value as Access }));
                        note(`Katalog · ${x.name} → ${e.target.value}`);
                      }}
                      aria-label={t({ en: "Opens from", tr: "Açık olduğu paket" })}
                    >
                      {(["explorer", "creator", "partner"] as Role[]).map((r) => (
                        <option key={r} value={r}>
                          {ROLE_META[r].package} {t({ en: "and up", tr: "ve üstü" })}
                        </option>
                      ))}
                      <option value="closed">{t({ en: "Closed", tr: "Kapalı" })}</option>
                    </select>
                  </div>
                ))}
              </div>
            </>
          )}

          {view === "flows" && (
            <>
              <h1>{t({ en: "Flows", tr: "İş akışları" })}</h1>
              <div className={css.table}>
                {FLOWS.map((f) => (
                  <div key={f.slug} className={css.tr}>
                    <img src={f.after} alt="" />
                    <span>{t(f.name)}</span>
                    <button
                      className={css.switch}
                      role="switch"
                      aria-checked={open[f.slug]}
                      onClick={() => {
                        setOpen((o) => ({ ...o, [f.slug]: !o[f.slug] }));
                        note(`Akış · ${f.name.tr} ${open[f.slug] ? "kapatıldı" : "açıldı"}`);
                      }}
                      aria-label={t(f.name)}
                    >
                      <i />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── users and manual credits ── */}
          {view === "users" && (
            <>
              <h1>{t({ en: "Users and credits", tr: "Kullanıcılar ve kredi" })}</h1>
              <div className={css.table}>
                {USERS.map((u) => {
                  const credits = u.me ? s.credits : (u.credits ?? 0) + (grants[u.id] ?? 0);
                  return (
                    <form
                      key={u.id}
                      className={css.tr}
                      onSubmit={(e) => {
                        e.preventDefault();
                        const n = Number(new FormData(e.currentTarget).get("n"));
                        if (!n) return;
                        if (u.me) set({ credits: s.credits + n });
                        else setGrants((g) => ({ ...g, [u.id]: (g[u.id] ?? 0) + n }));
                        note(`Kredi · @${u.name} +${n}`);
                        e.currentTarget.reset();
                      }}
                    >
                      <span className={css.user}>@{u.me ? s.username || u.name : u.name}</span>
                      <span>
                        {u.brand || "—"} · {ROLE_META[u.me ? s.role : u.role].package}
                      </span>
                      <span className={css.num}>{credits}</span>
                      <span className={css.grant}>
                        <input name="n" type="number" min={1} placeholder="+" aria-label={t({ en: "Credits to add", tr: "Eklenecek kredi" })} />
                        <button>{t({ en: "Add", tr: "Tanımla" })}</button>
                      </span>
                    </form>
                  );
                })}
              </div>
            </>
          )}

          {view === "people" && (
            <People
              people={people}
              contacted={contacted}
              onContact={(x) => {
                setContacted((c) => ({ ...c, [x.id]: true }));
                note(`Ulaşıldı · @${x.user}`);
              }}
            />
          )}

          {view === "news" && (
            <>
              <h1>{t({ en: "Updates", tr: "Duyurular" })}</h1>
              <form
                className={css.news}
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!draft.trim()) return;
                  setNews((n) => [{ at: stamp(), text: draft.trim() }, ...n]);
                  note(`Duyuru · ${draft.trim()}`);
                  setDraft("");
                }}
              >
                <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} placeholder={t({ en: "What's new on the platform", tr: "Platformda ne yeni" })} />
                <button className={css.primary} disabled={!draft.trim()}>
                  {t({ en: "Publish", tr: "Yayınla" })}
                </button>
              </form>
              <ul className={css.logList}>
                {news.map((n) => (
                  <li key={n.at}>
                    <span>{fmtDate(new Date(n.at).toISOString(), s.lang)}</span>
                    {n.text}
                  </li>
                ))}
                <li>
                  <span>10 Eyl</span>
                  {t({ en: "180° Product Video enters testing", tr: "180° Ürün Videosu teste girdi" })}
                </li>
              </ul>
            </>
          )}

          {view === "stats" && (
            <>
              <h1>{t({ en: "Numbers", tr: "İstatistik" })}</h1>
              <div className={css.stats}>
                <Stat n="18.420" l={t({ en: "frames this month", tr: "kare bu ay" })} />
                <Stat n="%86" l={t({ en: "kept (liked)", tr: "beğenildi" })} />
                <Stat n="%4,1" l={t({ en: "failed frames", tr: "başarısız kare" })} />
                <Stat n="312" l={t({ en: "paying accounts", tr: "ücretli hesap" })} />
              </div>
            </>
          )}

          {view === "audit" && (
            <>
              <h1>{t({ en: "Audit log", tr: "Denetim kaydı" })}</h1>
              {log.length === 0 ? (
                <p className={css.empty}>{t({ en: "No admin actions in this session.", tr: "Bu oturumda yönetici işlemi yok." })}</p>
              ) : (
                <ul className={css.logList}>
                  {log.map((l) => (
                    <li key={l.at + l.text}>
                      <span>{new Date(l.at).toLocaleTimeString(s.lang === "tr" ? "tr-TR" : "en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
                      {l.text}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}

function Queue({ n, title, line, urgent, onOpen }: { n: number; title: string; line: string; urgent?: boolean; onOpen?: () => void }) {
  return (
    <button className={css.queue} data-urgent={(urgent && n > 0) || undefined} onClick={onOpen} disabled={!onOpen}>
      <b>{n}</b>
      <span>{title}</span>
      <em>{line}</em>
      {onOpen && <Arrow size={13} />}
    </button>
  );
}

function Fact({ k, v, warn }: { k: string; v: ReactNode; warn?: boolean }) {
  return (
    <p className={css.fact}>
      <span>{k}</span>
      <b data-warn={warn || undefined}>{v}</b>
    </p>
  );
}

/* a reason is required — without it the same thing comes back */
function Reject({ why, setWhy, onReject }: { why: string; setWhy: (v: string) => void; onReject: () => void }) {
  const { t } = useAtelier();
  return (
    <div className={css.reject}>
      <input value={why} onChange={(e) => setWhy(e.target.value)} placeholder={t({ en: "Reason — the user sees it", tr: "Gerekçe — kullanıcıya iletilir" })} />
      <button className={css.quiet} disabled={!why.trim()} onClick={onReject}>
        {t({ en: "Decline", tr: "Reddet" })}
      </button>
    </div>
  );
}

function Empty() {
  const { t } = useAtelier();
  return <p className={css.empty}>{t({ en: "The queue is empty.", tr: "Kuyruk boş." })}</p>;
}

function Stat({ n, l }: { n: string; l: string }) {
  return (
    <p className={css.stat}>
      <b>{n}</b>
      <span>{l}</span>
    </p>
  );
}
