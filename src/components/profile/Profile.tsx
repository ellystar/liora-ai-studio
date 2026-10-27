"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ROLE_META, flowBySlug, type L } from "@/lib/data";
import { GOOGLE } from "@/lib/account";
import { AGES, FOR, JOBS, KID_AGES, TALK, TIERS, TOOLS, VERTICALS, WHERE, WHO, WHY, answerOf, listOf, styleNames, suggestCast, suggestSetting } from "@/lib/brand";
import { ledgerLabel, readLedger, type LedgerRow } from "@/lib/live";
import { NOTICE_KINDS, displayName, fmtDate, initials, useAtelier } from "@/lib/store";
import { Field, UsernameField, authCss, useUsername } from "../auth/AuthShell";
import { Masthead } from "../chrome/Masthead";
import { Arrow, Check } from "../icons";
import css from "./Profile.module.css";

export type ProfileTab = "account" | "brand" | "plan" | "settings" | "delete";

const TABS: { id: ProfileTab; label: L }[] = [
  { id: "account", label: { en: "Account", tr: "Hesap" } },
  { id: "brand", label: { en: "Brand", tr: "Marka" } },
  { id: "plan", label: { en: "Plan and credits", tr: "Abonelik ve kredi" } },
  { id: "settings", label: { en: "Settings", tr: "Ayarlar" } },
  { id: "delete", label: { en: "Delete account", tr: "Hesabı sil" } },
];

/* wf-11 — the profile manages the account; nothing here is shown twice. */
export function Profile({ tab: initial }: { tab: ProfileTab }) {
  const { s, t, ready } = useAtelier();
  const [tab, setTab] = useState<ProfileTab>(initial);
  if (!ready) return <main className={`${css.page} ink`} />;

  const select = (v: ProfileTab) => {
    setTab(v);
    window.history.replaceState(null, "", v === "account" ? "/profile" : `/profile?tab=${v}`);
  };

  return (
    <main className={`${css.page} ink`}>
      <Masthead section={{ en: "Profile", tr: "Profil" }} />
      <section className={css.wrap}>
        <header className={css.head}>
          <span className={css.avatar}>{initials(s)}</span>
          <div>
            <h1>{displayName(s)}</h1>
            <p>
              {s.username && <>@{s.username} · </>}
              {t(ROLE_META[s.role].label)} · {ROLE_META[s.role].package}
            </p>
          </div>
        </header>
        <div className={css.body}>
          <nav className={css.tabs} aria-label={t({ en: "Profile", tr: "Profil" })}>
            {TABS.map((x) => (
              <button key={x.id} aria-current={tab === x.id ? "page" : undefined} onClick={() => select(x.id)} data-danger={x.id === "delete" || undefined}>
                {t(x.label)}
              </button>
            ))}
          </nav>
          <div className={css.panel} key={tab}>
            {tab === "account" && <Account />}
            {tab === "brand" && <Brand />}
            {tab === "plan" && <Plan />}
            {tab === "settings" && <Settings />}
            {tab === "delete" && <Delete />}
          </div>
        </div>
      </section>
    </main>
  );
}

function Account() {
  const { s, t, set } = useAtelier();
  const u = useUsername(s.username);
  const [name, setName] = useState(s.name);
  const [brand, setBrand] = useState(s.brand);
  const [website, setWebsite] = useState(s.website);
  const [saved, setSaved] = useState(false);
  const paid = s.role !== "explorer";
  const changed = u.name !== s.username;
  const ok = !changed || u.ok;
  const made = s.jobs.filter((j) => j.status === "done").length;

  const save = (e: FormEvent) => {
    e.preventDefault();
    if (!ok) return;
    set({ username: u.name, name: name.trim(), brand: brand.trim(), website: website.trim() });
    setSaved(true);
  };

  return (
    <form className={css.form} onSubmit={save} noValidate>
      <Field
        id="name"
        label={t({ en: "Name", tr: "Ad soyad" })}
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setSaved(false);
        }}
        autoComplete="name"
      />
      <UsernameField u={u} />
      {changed && u.ok && (
        <p className={css.warn}>
          {t({ en: "Your old name becomes free for others; past posts show the new one.", tr: "Eski adın serbest kalır; geçmiş paylaşımlarda yeni adın görünür." })}
        </p>
      )}
      <Field id="email" label={t({ en: "Email", tr: "E-posta" })} value={s.provider === "google" ? GOOGLE.email : "melis@atelierdogan.com"} readOnly />
      <div className={authCss.pair}>
        <Field
          id="brand"
          label={t({ en: "Brand name", tr: "Marka adı" })}
          aside={paid && !brand.trim() ? <span className={css.missing}>{t({ en: "missing", tr: "eksik" })}</span> : undefined}
          value={brand}
          onChange={(e) => {
            setBrand(e.target.value);
            setSaved(false);
          }}
          hint={t({ en: "The first line of your Salon posts.", tr: "Salon paylaşımlarında ilk satır." })}
        />
        <Field
          id="website"
          label="Website"
          value={website}
          onChange={(e) => {
            setWebsite(e.target.value);
            setSaved(false);
          }}
          placeholder="atelier.com"
        />
      </div>
      <div className={css.row}>
        <span className={css.label}>{t({ en: "Sign-in", tr: "Giriş yöntemi" })}</span>
        <span>
          {s.provider === "google" ? t({ en: "Google", tr: "Google ile" }) : t({ en: "Email and password", tr: "E-posta ve şifre" })}
          {s.provider !== "google" && (
            <Link href="/reset" className={css.link}>
              {t({ en: "Change password", tr: "Şifre değiştir" })}
            </Link>
          )}
        </span>
      </div>
      <div className={css.row}>
        <span className={css.label}>{t({ en: "Made", tr: "Üretilen" })}</span>
        <span>{t({ en: `${made} jobs`, tr: `${made} iş` })}</span>
      </div>
      <div className={css.actions}>
        <button className={css.primary} disabled={!ok}>
          {t({ en: "Save", tr: "Kaydet" })}
        </button>
        {saved && (
          <span className={css.saved}>
            <Check size={12} /> {t({ en: "Saved", tr: "Kaydedildi" })}
          </span>
        )}
      </div>
    </form>
  );
}

/* what onboarding learned — read back as it was answered, changed by answering again */
function Brand() {
  const { s, t } = useAtelier();
  const p = s.profile;
  const again = "/welcome?step=for&back=profile";
  if (!p) {
    return (
      <div className={css.stack}>
        <p className={css.line}>{t({ en: "Not answered yet. A minute, and every job starts closer to your brand.", tr: "Henüz yanıtlanmadı. Bir dakika sürer; her iş markana daha yakın başlar." })}</p>
        <span>
          <Link href={again} className={css.link}>
            {t({ en: "Answer", tr: "Yanıtla" })}
          </Link>
        </span>
      </div>
    );
  }
  /* just looking: who they are and how we may write — nothing to set up yet */
  if (p.for === "explore") {
    const rows: [L, string][] = [
      [{ en: "Here for", tr: "Kimin için" }, t(answerOf(FOR, p.for)!.label)],
      [{ en: "Work", tr: "Meslek" }, p.job === "other" && p.jobOther ? p.jobOther : t(answerOf(JOBS, p.job)?.label ?? { en: "—", tr: "—" })],
      [{ en: "Why", tr: "Neden" }, t(answerOf(WHY, p.why)?.label ?? { en: "—", tr: "—" })],
      [{ en: "Tools", tr: "Araçlar" }, listOf(TOOLS, p.tools ?? [], s.lang) || "—"],
      [{ en: "Keep in touch", tr: "Haberleşme" }, listOf(TALK, p.talk ?? [], s.lang) || "—"],
      ...(p.company ? [[{ en: "Works at", tr: "Çalıştığı yer" }, p.company] as [L, string]] : []),
    ];
    return (
      <div className={css.stack}>
        <section>
          {rows.map(([k, v]) => (
            <div key={k.en} className={css.row}>
              <span className={css.label}>{t(k)}</span>
              <span>{v}</span>
            </div>
          ))}
        </section>
        <p className={css.note}>{t({ en: "When you bring your own product, we'll ask about the brand.", tr: "Kendi ürününü getirdiğinde markayı sorarız." })}</p>
        <span>
          <Link href={again} className={css.link}>
            {t({ en: "Answer again", tr: "Yeniden yanıtla" })}
          </Link>
        </span>
      </div>
    );
  }
  const cast = suggestCast(p, s.role);
  const setting = suggestSetting(p, s.role);
  const rows: [L, string][] = [
    [{ en: "Shooting for", tr: "Kimin için" }, t(answerOf(FOR, p.for)?.label ?? { en: "—", tr: "—" }) + (p.brands ? ` · ${p.brands} ${t({ en: "brands", tr: "marka" })}` : "")],
    ...(p.waitlist ? [[{ en: "Waiting for", tr: "Bekleme listesi" }, t(answerOf(VERTICALS, p.waitlist)!.label)] as [L, string]] : []),
    [{ en: "Who wears it", tr: "Kim giyiyor" }, [listOf(WHO, p.who, s.lang), listOf(AGES, p.ages, s.lang), listOf(KID_AGES, p.kidAges ?? [], s.lang)].filter(Boolean).join(" · ") || "—"],
    [{ en: "Price", tr: "Fiyat" }, answerOf(TIERS, p.tier) ? `${t(answerOf(TIERS, p.tier)!.label)} · ${t(answerOf(TIERS, p.tier)!.sub!)}` : "—"],
    [{ en: "Style", tr: "Stil" }, styleNames(p) || "—"],
    [{ en: "Used on", tr: "Kullanım" }, listOf(WHERE, p.where, s.lang) || "—"],
  ];
  return (
    <div className={css.stack}>
      <section>
        {rows.map(([k, v]) => (
          <div key={k.en} className={css.row}>
            <span className={css.label}>{t(k)}</span>
            <span>{v}</span>
          </div>
        ))}
      </section>
      <section>
        <h2 className={css.h2}>{t({ en: "Every job starts with", tr: "Her iş şununla başlar" })}</h2>
        <div className={css.row}>
          <span className={css.label}>{t({ en: "Cast", tr: "Kast" })}</span>
          <span>{cast ? `${cast.name} · ${t(cast.note)}` : t({ en: "Ghost mannequin", tr: "Cansız manken" })}</span>
        </div>
        <div className={css.row}>
          <span className={css.label}>{t({ en: "Setting", tr: "Ortam" })}</span>
          <span>{setting ? t(setting.name) : "—"}</span>
        </div>
        <div className={css.row}>
          <span className={css.label}>{t({ en: "Style", tr: "Stil" })}</span>
          <span>{styleNames(p) || "—"}</span>
        </div>
        <p className={css.note}>{t({ en: "Offered first on the canvas, never forced.", tr: "Kanvasta önce önerilir, hiçbir zaman dayatılmaz." })}</p>
      </section>
      <span>
        <Link href={again} className={css.link}>
          {t({ en: "Answer again", tr: "Yeniden yanıtla" })}
        </Link>
      </span>
    </div>
  );
}

/* P-F-05/06 — the package, and where the credits went */
function Plan() {
  const { s, t, set } = useAtelier();
  const [asking, setAsking] = useState(false);
  const paid = s.role !== "explorer";
  const returning = s.session === "returning";

  /* live: the ledger is the server's credit_transactions, the person's own rows */
  const liveId = s.live?.id;
  const [ledger, setLedger] = useState<{ id: string; rows: LedgerRow[] } | null>(null);
  useEffect(() => {
    if (!liveId) return;
    let gone = false;
    readLedger()
      .then((rows) => !gone && setLedger({ id: liveId, rows }))
      .catch((e) => console.error("ledger read failed", e));
    return () => {
      gone = true;
    };
  }, [liveId]);

  type Row = { at: string; label: string; amount: number };
  const liveRows: Row[] | null = liveId
    ? (ledger?.id === liveId ? ledger.rows : []).map((r) => ({ at: r.at, label: t(ledgerLabel(r)), amount: r.amount }))
    : null;
  const rows: Row[] = liveRows ?? [
    ...s.jobs
      .filter((j) => j.status === "done")
      .map((j) => {
        const ok = j.frames.filter((f) => !f.failed).length;
        return { at: j.createdAt, label: `${t(flowBySlug(j.flow)?.name ?? j.title)} · ${t(j.title)}`, amount: -(j.cost ?? ok * (j.creditPerFrame ?? 1)) };
      }),
    ...s.jobs.flatMap((j) =>
      j.frames.filter((f) => f.review === "refunded").map(() => ({ at: j.createdAt, label: t({ en: "Refund · review accepted", tr: "İade · inceleme kabul edildi" }), amount: j.creditPerFrame ?? 1 })),
    ),
    ...(returning
      ? [
          { at: "2026-10-01T09:00:00", label: t({ en: "Package renewal · Basic", tr: "Paket yenileme · Basic" }), amount: 30 },
          { at: "2026-09-12T14:20:00", label: t({ en: "Extra credits", tr: "Ek kredi" }), amount: 50 },
        ]
      : [{ at: "2026-10-13T10:00:00", label: t({ en: "Welcome credits", tr: "Kayıt bonusu" }), amount: 5 }]),
  ].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <div className={css.stack}>
      <section className={css.plan}>
        <div>
          <span className={css.label}>{t({ en: "Package", tr: "Paket" })}</span>
          <p className={css.big}>
            {ROLE_META[s.role].package} <em>{t(ROLE_META[s.role].label)}</em>
          </p>
          <p className={css.line}>
            {paid
              ? s.cancelled
                ? t({ en: "Ends on 14 Nov · then Free", tr: "14 Kas'ta biter · sonra Free" })
                : t({ en: "Renews on 14 Nov · 30 credits", tr: "14 Kas'ta yenilenir · 30 kredi" })
              : t({ en: "5 trial credits · once", tr: "5 deneme kredisi · tek sefer" })}
          </p>
        </div>
        <div className={css.planActions}>
          <Link href="/packages?from=%2Fprofile%3Ftab%3Dplan" className={css.primary}>
            {paid ? t({ en: "Change package", tr: "Paketi değiştir" }) : t({ en: "See packages", tr: "Paketlere bak" })} <Arrow size={12} />
          </Link>
          {paid && !s.cancelled && !asking && (
            <button className={css.quiet} onClick={() => setAsking(true)}>
              {t({ en: "Cancel subscription", tr: "Aboneliği iptal et" })}
            </button>
          )}
          {paid && s.cancelled && (
            <button className={css.quiet} onClick={() => set({ cancelled: false })}>
              {t({ en: "Keep it", tr: "Vazgeç, devam etsin" })}
            </button>
          )}
        </div>
      </section>

      {asking && (
        <section className={css.confirm}>
          <p className={css.label}>{t({ en: "If you cancel", tr: "İptal edersen" })}</p>
          <ul>
            <li>{t({ en: "It stays open until the period ends, then turns Free.", tr: "Dönem sonuna kadar açık kalır, sonra Free'ye döner." })}</li>
            <li>{t({ en: "Your own cast and settings are locked, not deleted.", tr: "Kendi cast ve ortamların kilitlenir, silinmez." })}</li>
            <li>{t({ en: "Your Salon posts stay live.", tr: "Salon paylaşımların yayında kalır." })}</li>
          </ul>
          <span className={css.actions}>
            <button
              className={css.danger}
              onClick={() => {
                set({ cancelled: true });
                setAsking(false);
              }}
            >
              {t({ en: "Cancel subscription", tr: "Aboneliği iptal et" })}
            </button>
            <button className={css.quiet} onClick={() => setAsking(false)}>
              {t({ en: "Keep it", tr: "Vazgeç" })}
            </button>
          </span>
        </section>
      )}

      <section>
        <h2 className={css.h2}>{t({ en: "Credit history", tr: "Kredi hareketleri" })}</h2>
        <ul className={css.ledger}>
          {rows.map((r, i) => (
            <li key={i}>
              <span className={css.date}>{fmtDate(r.at, s.lang)}</span>
              <span>{r.label}</span>
              <b data-plus={r.amount > 0 || undefined}>
                {r.amount > 0 ? "+" : "−"}
                {Math.abs(r.amount)}
              </b>
            </li>
          ))}
        </ul>
        <p className={css.note}>{t({ en: "Package credits are spent first; extra credits stay through renewals.", tr: "Önce paket kredisi harcanır; ek kredi yenilemede kalır." })}</p>
      </section>
    </div>
  );
}

function Settings() {
  const { s, t, set } = useAtelier();
  const [introsReset, setIntrosReset] = useState(false);
  const [exported, setExported] = useState(false);
  const toggle = (id: string, k: "panel" | "mail") => set({ prefs: { ...s.prefs, [id]: { ...s.prefs[id], [k]: !s.prefs[id]?.[k] } } });

  return (
    <div className={css.stack}>
      <section className={css.setting}>
        <span className={css.label}>{t({ en: "Language", tr: "Dil" })}</span>
        <span className={css.seg}>
          {(["tr", "en"] as const).map((l) => (
            <button key={l} aria-pressed={s.lang === l} onClick={() => set({ lang: l })}>
              {l === "tr" ? "Türkçe" : "English"}
            </button>
          ))}
        </span>
      </section>

      <section>
        <h2 className={css.h2}>{t({ en: "Notifications", tr: "Bildirimler" })}</h2>
        <div className={css.prefs} role="table">
          <div role="row" className={css.prefHead}>
            <span />
            <span>{t({ en: "In Liora", tr: "Panelde" })}</span>
            <span>{t({ en: "Email", tr: "E-posta" })}</span>
          </div>
          {NOTICE_KINDS.map((k) => (
            <div key={k.id} role="row">
              <span>{t(k.label)}</span>
              {(["panel", "mail"] as const).map((c) => (
                <span key={c}>
                  <button className={css.switch} role="switch" aria-checked={!!s.prefs[k.id]?.[c]} onClick={() => toggle(k.id, c)} aria-label={`${t(k.label)} · ${c}`}>
                    <i />
                  </button>
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className={css.setting}>
        <span className={css.label}>{t({ en: "Flow intros", tr: "Akış tanıtımları" })}</span>
        <span>
          {introsReset ? (
            <span className={css.saved}>
              <Check size={12} /> {t({ en: "They show again on your next visit", tr: "Bir sonraki girişte yeniden gösterilir" })}
            </span>
          ) : (
            <button
              className={css.link}
              onClick={() => {
                set({ seenIntro: [] });
                setIntrosReset(true);
              }}
            >
              {t({ en: "Show them again", tr: "Yeniden göster" })}
            </button>
          )}
        </span>
      </section>

      <section className={css.setting}>
        <span className={css.label}>{t({ en: "Your data", tr: "Veri" })}</span>
        <span>
          {t({ en: "Frames are kept for 7 days.", tr: "Kareler 7 gün saklanır." })}
          {exported ? (
            <span className={css.saved}>
              <Check size={12} /> {t({ en: "On its way to your email", tr: "E-postana geliyor" })}
            </span>
          ) : (
            <button className={css.link} onClick={() => setExported(true)}>
              {t({ en: "Download everything", tr: "Üretimlerimi indir" })}
            </button>
          )}
        </span>
      </section>
    </div>
  );
}

function Delete() {
  const { s, t, dispatch } = useAtelier();
  const router = useRouter();
  const word = s.username || t({ en: "DELETE", tr: "SİL" });
  const [typed, setTyped] = useState("");

  return (
    <div className={css.stack}>
      <section>
        <p className={css.label}>{t({ en: "When you delete your account", tr: "Hesabını silince" })}</p>
        <ul className={css.list}>
          <li>{t({ en: "Your details and sign-in are deleted.", tr: "Kişisel bilgilerin ve giriş bilgin silinir." })}</li>
          <li>{t({ en: "Your frames, drafts and library are deleted.", tr: "Karelerin, taslakların ve kütüphanen silinir." })}</li>
          <li>{t({ en: "Your own cast is deleted — it can't come back.", tr: "Özel cast'lerin silinir — geri getirilemez." })}</li>
          <li>{t({ en: "Your Salon posts are removed.", tr: "Salon paylaşımların kaldırılır." })}</li>
        </ul>
      </section>
      <section className={css.form}>
        <Field id="confirm" label={t({ en: `Type ${word} to confirm`, tr: `Onaylamak için ${word} yaz` })} value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" spellCheck={false} />
        <div className={css.actions}>
          <button
            className={css.danger}
            disabled={typed.trim() !== word}
            onClick={() => {
              dispatch({ type: "reset", session: "first" });
              router.push("/signup");
            }}
          >
            {t({ en: "Delete my account", tr: "Hesabımı sil" })}
          </button>
        </div>
      </section>
    </div>
  );
}
