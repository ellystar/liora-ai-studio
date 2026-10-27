"use client";

import Link from "next/link";
import { useEffect, useState, type InputHTMLAttributes, type ReactNode } from "react";
import type { L } from "@/lib/data";
import { check, type Check } from "@/lib/account";
import { useAtelier } from "@/lib/store";
import { Arrow } from "../icons";
import css from "./Auth.module.css";

/* Sign-up, sign-in and password reset share the production sign-in page:
   the same silk photograph, the platform line on the left, one quiet card
   on the right. One question per card; feedback sits under its field as a
   line, never as a box or a modal (wf-01). */

export function AuthShell({ title, sub, children }: { title: L; sub?: L; children: ReactNode }) {
  const { s, t, set, ready } = useAtelier();
  if (!ready) return <main className={`${css.auth} ink`} />;

  return (
    <main className={`${css.auth} ink`}>
      <div className={css.ground} aria-hidden>
        <img src="/img/auth-silk.jpg" alt="" />
        <div className={css.scrim} />
        <div className="grain" />
      </div>

      <header className={css.top}>
        <span className={css.mark}>LIORA</span>
        {/* A-F-07: the choice is kept on the account */}
        <nav className={css.lang} aria-label={t({ en: "Language", tr: "Dil" })}>
          <button aria-pressed={s.lang === "en"} onClick={() => set({ lang: "en" })}>
            EN
          </button>
          <span aria-hidden>|</span>
          <button aria-pressed={s.lang === "tr"} onClick={() => set({ lang: "tr" })}>
            TR
          </button>
        </nav>
      </header>

      <div className={css.middle}>
        <div className={css.hero}>
          <h1>
            {t({ en: "The atelier,", tr: "Atölye," })}
            <br />
            {t({ en: "now a platform.", tr: "artık bir platform." })}
          </h1>
          <p>
            {t({ en: "AI-native creative systems", tr: "Moda ve güzellik markaları için" })}
            <br />
            {t({ en: "for fashion and beauty brands", tr: "yapay zekâ-yerlisi yaratıcı sistemler" })}
          </p>
        </div>

        <section className={css.card}>
          <h2 className={css.title}>{t(title)}</h2>
          {sub && <p className={css.sub}>{t(sub)}</p>}
          {children}
        </section>
      </div>

      <footer className={css.footer}>
        <span>{t({ en: "Scale without losing soul", tr: "Ruhunu kaybetmeden büyü" })}</span>
        <span className={css.links}>
          <a href="#" onClick={(e) => e.preventDefault()}>
            {t({ en: "Privacy policy", tr: "Gizlilik politikası" })}
          </a>
          <span aria-hidden>|</span>
          <a href="#" onClick={(e) => e.preventDefault()}>
            {t({ en: "Terms of use", tr: "Kullanım şartları" })}
          </a>
        </span>
      </footer>
    </main>
  );
}

type Say = { tone: "ok" | "error" | "wait"; text: string } | null;

export function Field({
  id,
  label,
  aside,
  hint,
  say,
  lead,
  password,
  after,
  ...input
}: {
  id: string;
  label: string;
  aside?: ReactNode; // right of the label: a rule or a link
  hint?: string; // quiet line under the field when there is nothing to say
  say?: Say; // system feedback, a line with a rule on its left
  lead?: string; // a fixed mark inside the field, e.g. "@"
  password?: boolean;
  after?: ReactNode;
} & InputHTMLAttributes<HTMLInputElement>) {
  const { t } = useAtelier();
  const [shown, setShown] = useState(false);
  const note = say ?? (hint ? { tone: null, text: hint } : null);

  return (
    <div className={css.field}>
      <div className={css.labelRow}>
        <label htmlFor={id}>{label}</label>
        {aside}
      </div>
      <div className={css.inputWrap}>
        {lead && <span className={css.lead}>{lead}</span>}
        <input
          id={id}
          {...input}
          type={password ? (shown ? "text" : "password") : (input.type ?? "text")}
          data-lead={lead ? "" : undefined}
          data-peek={password ? "" : undefined}
          aria-invalid={say?.tone === "error" || undefined}
          aria-describedby={note ? `${id}-note` : undefined}
        />
        {password && (
          <button
            type="button"
            className={css.peek}
            onClick={() => setShown(!shown)}
            aria-label={shown ? t({ en: "Hide password", tr: "Şifreyi gizle" }) : t({ en: "Show password", tr: "Şifreyi göster" })}
          >
            {shown ? <EyeOff /> : <Eye />}
          </button>
        )}
      </div>
      {note && (
        <p id={`${id}-note`} className={say ? css.say : css.hint} data-tone={say?.tone} aria-live="polite">
          {note.text}
        </p>
      )}
      {after}
    </div>
  );
}

/* A-F-02: the check runs while typing, after a short pause, and offers free
   names when the one typed is taken. Lower case only; spaces never land. */
export function useUsername(initial = "") {
  const [name, setName] = useState(initial);
  const [result, setResult] = useState<Check>(() => check(initial));

  useEffect(() => {
    if (!name) return;
    const id = setTimeout(() => setResult(check(name)), 450);
    return () => clearTimeout(id);
  }, [name]);

  const change = (v: string) => {
    const next = v.toLowerCase().replace(/\s+/g, "");
    setName(next);
    setResult(next ? { state: "checking" } : { state: "empty" });
  };
  const pick = (v: string) => {
    setName(v);
    setResult(check(v));
  };
  return { name, result, change, pick, ok: result.state === "ok" };
}

export function UsernameField({ u }: { u: ReturnType<typeof useUsername> }) {
  const { t } = useAtelier();
  const r = u.result;
  const say: Say =
    r.state === "checking"
      ? { tone: "wait", text: t({ en: "Checking…", tr: "Kontrol ediliyor…" }) }
      : r.state === "ok"
        ? { tone: "ok", text: t({ en: "This name is free", tr: "Bu ad uygun" }) }
        : r.state === "invalid" || r.state === "taken"
          ? { tone: "error", text: t(r.why) }
          : null;

  return (
    <Field
      id="username"
      label={t({ en: "Username", tr: "Kullanıcı adı" })}
      aside={<span className={css.rule}>{t({ en: "can be changed later", tr: "sonradan değiştirilebilir" })}</span>}
      lead="@"
      value={u.name}
      onChange={(e) => u.change(e.target.value)}
      autoComplete="username"
      autoCapitalize="none"
      spellCheck={false}
      maxLength={24}
      say={say}
      after={
        r.state === "taken" && r.offer.length > 0 ? (
          <p className={css.offer}>
            {t({ en: "Free:", tr: "Uygun olanlar:" })}
            {r.offer.map((o) => (
              <button type="button" key={o} onClick={() => u.pick(o)}>
                {o}
              </button>
            ))}
          </p>
        ) : null
      }
    />
  );
}

export function GoogleButton({ busy, onClick }: { busy: boolean; onClick: () => void }) {
  const { t } = useAtelier();
  return (
    <button type="button" className={css.google} onClick={onClick} disabled={busy} aria-busy={busy}>
      <GoogleMark />
      {busy ? t({ en: "Connecting to Google…", tr: "Google'a bağlanılıyor…" }) : t({ en: "Continue with Google", tr: "Google ile devam et" })}
    </button>
  );
}

export function Or({ children }: { children: ReactNode }) {
  return <p className={css.or}>{children}</p>;
}

export function Submit({ children, disabled }: { children: ReactNode; disabled?: boolean }) {
  return (
    <button type="submit" className={css.submit} disabled={disabled}>
      {children}
      <Arrow size={17} />
    </button>
  );
}

export function SwitchLine({ q, a, href }: { q: L; a: L; href: string }) {
  const { t } = useAtelier();
  return (
    <p className={css.switch}>
      {t(q)}
      <Link href={href}>{t(a)}</Link>
    </p>
  );
}

/* A-F-03: brand and website are optional — closed until asked for, and the
   reason they are asked is said once: they appear when you share. */
export function Optional({ brand, website, onBrand, onWebsite }: { brand: string; website: string; onBrand: (v: string) => void; onWebsite: (v: string) => void }) {
  const { t } = useAtelier();
  const [open, setOpen] = useState(!!(brand || website));
  return (
    <div className={css.optional} data-open={open}>
      <button type="button" className={css.optionalHead} onClick={() => setOpen(!open)} aria-expanded={open}>
        <span>{t({ en: "Brand name and website", tr: "Marka adı ve website" })}</span>
        <em>{t({ en: "optional · can be added later", tr: "isteğe bağlı · sonra da eklenebilir" })}</em>
        <i aria-hidden>{open ? "−" : "+"}</i>
      </button>
      {open && (
        <div className={css.optionalBody}>
          <div className={css.pair}>
            <Field id="brand" label={t({ en: "Brand name", tr: "Marka adı" })} value={brand} onChange={(e) => onBrand(e.target.value)} autoComplete="organization" />
            <Field id="website" label="Website" value={website} onChange={(e) => onWebsite(e.target.value)} placeholder="atelier.com" autoComplete="url" inputMode="url" />
          </div>
          <p className={css.hint}>{t({ en: "Shown with your work when you share it in the Salon.", tr: "Salon'da paylaştığında çalışmanla birlikte görünür." })}</p>
        </div>
      )}
    </div>
  );
}

export function Consent({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  const { t } = useAtelier();
  return (
    <label className={css.check}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className={css.box} aria-hidden>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </span>
      <span>
        {t({ en: "I accept the ", tr: "" })}
        <a href="#" onClick={(e) => e.preventDefault()}>
          {t({ en: "Terms of use", tr: "Kullanım şartlarını" })}
        </a>
        {t({ en: " and the ", tr: " ve " })}
        <a href="#" onClick={(e) => e.preventDefault()}>
          {t({ en: "Privacy policy", tr: "Gizlilik politikasını" })}
        </a>
        {t({ en: ".", tr: " kabul ediyorum." })}
      </span>
    </label>
  );
}

/* a plain opt-in: unticked until ticked (KVKK / GDPR) */
export function Tick({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <label className={css.check}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className={css.box} aria-hidden>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </span>
      <span>{children}</span>
    </label>
  );
}

export { css as authCss };

const Eye = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOff = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const GoogleMark = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
);
