"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { GOOGLE, MIN_PASSWORD, fromName, validEmail } from "@/lib/account";
import { TALK } from "@/lib/brand";
import type { L } from "@/lib/data";
import { clearGuest, readGuest, writeGuest } from "@/lib/guest";
import { useAtelier } from "@/lib/store";
import { AuthShell, Consent, Field, GoogleButton, Optional, Or, Submit, SwitchLine, Tick, UsernameField, authCss as css, useUsername } from "./AuthShell";

/* A new account starts the first session: free plan, explorer, 5 credits
   (A-B-04). Whatever was answered before the account (/start) comes with it,
   and the account opens straight onto where they were going — the flow they
   chose, or the sample they picked (Elif: right into the work after sign-up).
   Someone who signed up directly gets the questions on /welcome. */
function useOpen() {
  const { dispatch, set } = useAtelier();
  const router = useRouter();
  return (patch: { username: string; name?: string; brand: string; website: string; provider: "email" | "google" }) => {
    const g = readGuest();
    const answered = !!(g?.profile?.for || g?.profile?.waitlist);
    dispatch({ type: "reset", session: "first" });
    set({
      ...patch,
      brand: patch.brand || g?.brand || "",
      website: patch.website || g?.website || "",
      ...(answered ? { profile: g!.profile, onboarded: true } : {}),
    });
    clearGuest();
    router.push(g?.next ?? (answered ? "/" : "/welcome"));
  };
}

/* may we write — asked with the email, never ticked in advance; only for
   someone who came just to look (the partnership list is made of them) */
function KeepInTouch() {
  const { t } = useAtelier();
  const [g, setG] = useState(() => readGuest());
  if (g?.profile.for !== "explore") return null;
  const talk = g.profile.talk ?? [];
  const toggle = (id: string, on: boolean) => {
    const next = { ...g, profile: { ...g.profile, talk: on ? [...talk.filter((x) => x !== id), id] : talk.filter((x) => x !== id), company: id === "partner" && !on ? undefined : g.profile.company } };
    writeGuest(next);
    setG(next);
  };
  return (
    <fieldset className={css.touch}>
      <legend>{t({ en: "Shall we keep in touch?", tr: "Haberleşelim mi?" })}</legend>
      {TALK.filter((x) => x.id !== "no").map((x) => (
        <Tick key={x.id} checked={talk.includes(x.id)} onChange={(on) => toggle(x.id, on)}>
          {t(x.label)}
        </Tick>
      ))}
      {talk.includes("partner") && (
        <Field
          id="company"
          label={t({ en: "Where do you work?", tr: "Nerede çalışıyorsun?" })}
          value={g.profile.company ?? ""}
          onChange={(e) => {
            const next = { ...g, profile: { ...g.profile, company: e.target.value } };
            writeGuest(next);
            setG(next);
          }}
          autoComplete="organization"
        />
      )}
    </fieldset>
  );
}

/* the sign-up page says why it is asking, when it is asking for something already made */
const WHY_NOW: Record<string, { title: L; sub: L }> = {
  start: { title: { en: "Keep your atelier", tr: "Atölyen kaybolmasın" }, sub: { en: "Open an account; your answers come with you.", tr: "Hesabını aç; cevapların seninle gelsin." } },
  make: { title: { en: "An account for your first frame", tr: "İlk karen için hesap aç" }, sub: { en: "Your choices come with you; the first frame is free.", tr: "Seçimlerin seninle gelsin; ilk kare ücretsiz." } },
};

/* wf-01 · 01–02 — Hesap oluştur (A-F-01/02/03/07/09) */
export function SignUp({ from }: { from?: string }) {
  const { t } = useAtelier();
  const why = from ? WHY_NOW[from] : undefined;
  const router = useRouter();
  const open = useOpen();
  const u = useUsername();
  const [email, setEmail] = useState("");
  const [emailSeen, setEmailSeen] = useState(false);
  const [pw, setPw] = useState("");
  const [brand, setBrand] = useState("");
  const [website, setWebsite] = useState("");
  const [google, setGoogle] = useState(false);

  const emailOk = validEmail(email);
  const pwOk = pw.length >= MIN_PASSWORD;
  const ready = emailOk && pwOk && u.ok;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (ready) open({ username: u.name, brand: brand.trim(), website: website.trim(), provider: "email" });
  };

  /* mock OAuth round trip: Google answers, the account still needs a name */
  const withGoogle = () => {
    setGoogle(true);
    setTimeout(() => router.push("/signup/complete"), 900);
  };

  return (
    <AuthShell title={why?.title ?? { en: "Create your account", tr: "Hesap oluştur" }} sub={why?.sub ?? { en: "Start on the free plan.", tr: "Ücretsiz planla başla." }}>
      <form className={css.form} onSubmit={submit} noValidate>
        <GoogleButton busy={google} onClick={withGoogle} />
        <Or>{t({ en: "or with email", tr: "ya da e-posta ile" })}</Or>
        <Field
          id="email"
          label={t({ en: "Email", tr: "E-posta" })}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setEmailSeen(true)}
          placeholder={t({ en: "name@company.com", tr: "isim@sirket.com" })}
          autoComplete="email"
          say={emailSeen && email && !emailOk ? { tone: "error", text: t({ en: "Enter a valid email address.", tr: "Geçerli bir e-posta adresi gir." }) } : null}
        />
        <Field
          id="password"
          label={t({ en: "Password", tr: "Şifre" })}
          aside={<span className={css.rule}>{t({ en: `at least ${MIN_PASSWORD} characters`, tr: `en az ${MIN_PASSWORD} karakter` })}</span>}
          password
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          autoComplete="new-password"
        />
        <UsernameField u={u} />
        <Optional brand={brand} website={website} onBrand={setBrand} onWebsite={setWebsite} />
        <KeepInTouch />
        <Submit disabled={!ready}>{t({ en: "Create account", tr: "Hesap oluştur" })}</Submit>
        <p className={css.legal}>
          {t({ en: "By creating an account you accept the ", tr: "Hesap oluşturarak " })}
          <a href="#" onClick={(e) => e.preventDefault()}>
            {t({ en: "Terms of use", tr: "Kullanım şartlarını" })}
          </a>
          {t({ en: " and the ", tr: " ve " })}
          <a href="#" onClick={(e) => e.preventDefault()}>
            {t({ en: "Privacy policy", tr: "Gizlilik politikasını" })}
          </a>
          {t({ en: ".", tr: " kabul edersin." })}
        </p>
      </form>
      <SwitchLine q={{ en: "Have an account?", tr: "Hesabın var mı?" }} a={{ en: "Sign in", tr: "Giriş yap" }} href="/signin" />
      {!from && <SwitchLine q={{ en: "Want to look first?", tr: "Önce bakmak mı istersin?" }} a={{ en: "Start without an account", tr: "Hesapsız başla" }} href="/start" />}
    </AuthShell>
  );
}

/* wf-01 · 03 — Google dönüşü: one screen longer than the manual road, not
   two. If the address already had an account this screen never opens and the
   user goes straight in (A-F-10/13). */
export function CompleteAccount() {
  const { t } = useAtelier();
  const open = useOpen();
  const u = useUsername(fromName(GOOGLE.name));
  const [brand, setBrand] = useState("");
  const [website, setWebsite] = useState("");
  const [agreed, setAgreed] = useState(false);
  const ready = u.ok && agreed;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (ready) open({ username: u.name, name: GOOGLE.name, brand: brand.trim(), website: website.trim(), provider: "google" });
  };

  return (
    <AuthShell title={{ en: "Complete your account", tr: "Hesabını tamamla" }} sub={{ en: "Google is connected. One last step.", tr: "Google hesabın bağlandı. Son bir adım." }}>
      <form className={css.form} onSubmit={submit} noValidate>
        <div className={css.who}>
          <span className={css.avatar}>{GOOGLE.initials}</span>
          <span className={css.whoText}>
            {GOOGLE.name}
            <span>{GOOGLE.email}</span>
          </span>
          <span className={css.whoNote}>Google</span>
        </div>
        <UsernameField u={u} />
        <Optional brand={brand} website={website} onBrand={setBrand} onWebsite={setWebsite} />
        <KeepInTouch />
        <Consent checked={agreed} onChange={setAgreed} />
        <Submit disabled={!ready}>{t({ en: "Complete account", tr: "Hesabı tamamla" })}</Submit>
      </form>
    </AuthShell>
  );
}
