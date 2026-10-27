"use client";

import Link from "next/link";
import { useState } from "react";
import { ROLE_META, type L, type Role } from "@/lib/data";
import { useAtelier } from "@/lib/store";
import { Masthead } from "../chrome/Masthead";
import { Arrow, Check } from "../icons";
import css from "./Packages.module.css";

/* wf-06 — packages, upgrade and extra credits. One page: the comparison,
   buying in place, then extra credits. Said in "what opens", never in
   "what you can't have". Prices and rows as Elif set them (2026-10); own
   cast follows Cast Studio: a try is 1 credit, making it yours is 30. */

type Plan = Role | "enterprise";

const PLANS: { id: Plan; name: string; role: L; credits: L; price?: string }[] = [
  { id: "explorer", name: "Free", role: ROLE_META.explorer.label, credits: { en: "5 · once", tr: "5 · tek sefer" } },
  { id: "creator", name: "Basic", role: ROLE_META.creator.label, credits: { en: "30 / month", tr: "30 / ay" }, price: "$30" },
  { id: "partner", name: "Pro", role: ROLE_META.partner.label, credits: { en: "100 / month", tr: "100 / ay" }, price: "$100" },
  { id: "enterprise", name: "Enterprise", role: { en: "One to one", tr: "Birebir" }, credits: { en: "By offer", tr: "Teklif ile" } },
];
const MONTHLY: Partial<Record<Plan, number>> = { creator: 30, partner: 100 };

/* yes / a value / no — one row per thing that opens */
const ROWS: { label: L; cells: (L | boolean)[] }[] = [
  { label: { en: "Watermark", tr: "Filigran" }, cells: [{ en: "On every size", tr: "Her boyda" }, false, false, false] },
  { label: { en: "Full-size download", tr: "Tam boy indirme" }, cells: [false, true, true, true] },
  { label: { en: "Cast catalogue", tr: "Cast kataloğu" }, cells: [{ en: "Limited", tr: "Sınırlı" }, { en: "Limited", tr: "Sınırlı" }, { en: "All", tr: "Tamamı" }, { en: "All", tr: "Tamamı" }] },
  { label: { en: "Your own cast", tr: "Kendi cast'in" }, cells: [false, false, { en: "1 credit a try · 30 to make it yours", tr: "Üretim 1 kredi · münhasırlık 30 kredi" }, { en: "Made for your brand's identity", tr: "Marka kimliğine özel üretim" }] },
  { label: { en: "Cast exclusivity", tr: "Cast münhasırlığı" }, cells: [false, false, true, true] },
  { label: { en: "Describe a setting · themes", tr: "Ortamı tarif et · tema çalışması" }, cells: [false, false, { en: "Made from your reference", tr: "Referans vererek oluştur" }, { en: "Made by the Liora team", tr: "Temayı Liora ekibi oluşturur" }] },
  { label: { en: "Batch", tr: "Batch" }, cells: [false, false, { en: "Up to 20 products", tr: "20 ürüne kadar" }, { en: "By project", tr: "Proje bazlı" }] },
  { label: { en: "Styling notes", tr: "Styling notları" }, cells: [false, false, true, { en: "For every product", tr: "Her ürüne özel" }] },
  { label: { en: "Brand analysis", tr: "Marka analizi" }, cells: [false, false, false, true] },
  { label: { en: "Custom workflow", tr: "Özel iş akışı geliştirme" }, cells: [false, false, false, true] },
  { label: { en: "Share in the Salon", tr: "Salon'da paylaşım" }, cells: [false, true, true, true] },
  { label: { en: "Extra credits", tr: "Ek kredi" }, cells: [false, true, true, true] },
];

const OPENS: Record<"creator" | "partner", L[]> = {
  creator: [
    { en: "The watermark goes — earlier frames download clean too", tr: "Filigran kalkar — önceki kareler de temiz iner" },
    { en: "Full-size frames", tr: "Tam boy kareler" },
    { en: "Sharing in the Salon", tr: "Salon'da paylaşım" },
    { en: "Extra credits", tr: "Ek kredi" },
  ],
  partner: [
    { en: "Everything in Basic", tr: "Basic'teki her şey" },
    { en: "The whole cast catalogue", tr: "Cast kataloğunun tamamı" },
    { en: "Your own cast · Cast Studio, exclusive to you", tr: "Kendi cast'in · Cast Studio, sana münhasır" },
    { en: "Themes from your reference", tr: "Referansla tema çalışması" },
    { en: "Batch, up to 20 products", tr: "20 ürüne kadar batch" },
    { en: "Styling notes", tr: "Styling notları" },
  ],
};

const EXTRA = [50, 150, 500];

export function Packages({ from }: { from: string | null }) {
  const { s, t, set, ready } = useAtelier();
  const [buy, setBuy] = useState<"creator" | "partner" | null>(null);
  const [done, setDone] = useState<Role | null>(null);
  const [added, setAdded] = useState<number | null>(null);

  if (!ready) return <main className={`${css.page} ink`} />;

  const current: Plan = s.role;
  const back = from ?? "/";
  const paid = s.role !== "explorer";

  const complete = () => {
    if (!buy) return;
    set({ role: buy, credits: s.credits + (MONTHLY[buy] ?? 0) });
    setDone(buy);
    setBuy(null);
  };

  return (
    <main className={`${css.page} ink`}>
      <Masthead section={{ en: "Packages", tr: "Paketler" }} />

      <section className={css.wrap}>
        <header className={css.head}>
          <h1>{t({ en: "Packages", tr: "Paketler" })}</h1>
          <p>
            {t(ROLE_META[s.role].label)} · <span className={css.num}>{s.credits}</span> {t({ en: "credits", tr: "kredi" })}
          </p>
        </header>

        {done && (
          <p className={css.done} role="status">
            <Check size={12} />
            {t({ en: "Your package is updated", tr: "Paketin güncellendi" })} · {t(ROLE_META[done].label)}
            <Link href={back}>
              {from ? t({ en: "Back to making", tr: "Üretime dön" }) : t({ en: "To the Atelier", tr: "Atelier'e dön" })} <Arrow size={12} />
            </Link>
          </p>
        )}

        {buy ? (
          /* buying in place: what is bought, the provider's own field, and what opens */
          <div className={css.checkout}>
            <div className={css.pay}>
              <span className={css.kicker}>{t({ en: "Selected", tr: "Seçilen paket" })}</span>
              <h2>
                {PLANS.find((p) => p.id === buy)!.name} <em>{t(ROLE_META[buy].label)}</em>
              </h2>
              <p className={css.line}>
                {PLANS.find((p) => p.id === buy)!.price} · {t(PLANS.find((p) => p.id === buy)!.credits)} {t({ en: "credits", tr: "kredi" })}
              </p>
              <div className={css.provider}>{t({ en: "Payment provider", tr: "Ödeme sağlayıcısı" })}</div>
              <p className={css.small}>
                {/* live: payments open with PayTR (Aşama 6); until then a demo purchase must not look real */}
                {s.live
                  ? t({ en: "Payments aren't open yet; the Liora team adds credits by hand.", tr: "Ödeme henüz açık değil; krediyi Liora ekibi elle yüklüyor." })
                  : t({ en: "Card details are never kept in Liora.", tr: "Kart bilgisi Liora'da tutulmaz." })}
              </p>
              <span className={css.actions}>
                <button className={css.primary} onClick={complete} disabled={Boolean(s.live)}>
                  {t({ en: "Complete payment", tr: "Ödemeyi tamamla" })} <Arrow size={14} />
                </button>
                <button className={css.quiet} onClick={() => setBuy(null)}>
                  {t({ en: "Cancel", tr: "Vazgeç" })}
                </button>
              </span>
            </div>
            <div className={css.opens}>
              <span className={css.kicker}>{t({ en: "What opens", tr: "Açılanlar" })}</span>
              <ul>
                {OPENS[buy].map((l, i) => (
                  <li key={i}>{t(l)}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className={css.table} role="table">
            <div className={css.row} role="row" data-head>
              <span role="columnheader" />
              {PLANS.map((p) => (
                <span key={p.id} role="columnheader" className={css.plan} data-current={p.id === current || undefined}>
                  <b>{p.name}</b>
                  <em>{t(p.role)}</em>
                  <span className={css.credits}>
                    {p.price && <span className={css.price}>{p.price}</span>}
                    {t(p.credits)} {p.price ? t({ en: "credits", tr: "kredi" }) : ""}
                  </span>
                  {p.id === current ? (
                    <span className={css.mine}>{t({ en: "Your package", tr: "Mevcut paketin" })}</span>
                  ) : p.id === "enterprise" ? (
                    <a className={css.quiet} href="mailto:info@lioralabs.io">
                      {t({ en: "Ask for an offer", tr: "Teklif al" })}
                    </a>
                  ) : p.id === "explorer" ? (
                    <span />
                  ) : (
                    <button className={css.primary} onClick={() => setBuy(p.id as "creator" | "partner")}>
                      {t({ en: "Switch", tr: "Bu pakete geç" })}
                    </button>
                  )}
                </span>
              ))}
            </div>
            {ROWS.map((r, i) => (
              <div key={i} className={css.row} role="row">
                <span role="rowheader" className={css.rowLabel}>
                  {t(r.label)}
                </span>
                {r.cells.map((c, k) => (
                  <span key={k} role="cell" className={css.cell} data-current={PLANS[k].id === current || undefined}>
                    {c === true ? <Check size={13} /> : c === false ? <i aria-label={t({ en: "No", tr: "Yok" })}>—</i> : t(c)}
                  </span>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* extra credits: paid packages only; the reason is one line, never hidden (B-F-05) */}
        <section className={css.extra}>
          <h2>{t({ en: "Extra credits", tr: "Ek kredi" })}</h2>
          {s.live ? (
            <p className={css.locked}>{t({ en: "Extra credits open with payments; for now the Liora team adds them.", tr: "Ek kredi ödemeyle açılacak; şimdilik Liora ekibi yüklüyor." })}</p>
          ) : paid ? (
            <>
              <div className={css.packs}>
                {EXTRA.map((n) => (
                  <button
                    key={n}
                    className={css.pack}
                    onClick={() => {
                      set({ credits: s.credits + n });
                      setAdded(n);
                    }}
                  >
                    <span className={css.num}>{n}</span>
                    <em>{t({ en: "credits", tr: "kredi" })}</em>
                    <span className={css.buy}>
                      {t({ en: "Buy", tr: "Al" })} <Arrow size={12} />
                    </span>
                  </button>
                ))}
              </div>
              <p className={css.small}>
                {added ? t({ en: `+${added} credits added · `, tr: `+${added} kredi eklendi · ` }) : ""}
                {t({ en: "Package credits are spent first.", tr: "Önce paket kredisi harcanır." })}
              </p>
            </>
          ) : (
            <p className={css.locked}>{t({ en: "Extra credits open with a paid package.", tr: "Ek kredi ücretli paketlerde açılır." })}</p>
          )}
        </section>
      </section>
    </main>
  );
}
