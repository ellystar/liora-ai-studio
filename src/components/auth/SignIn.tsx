"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { MIN_PASSWORD, inboxFor, openedWithGoogle, validEmail } from "@/lib/account";
import type { L } from "@/lib/data";
import { useAtelier } from "@/lib/store";
import { createClient, hasBackend } from "@/lib/supabase/client";
import { ArrowLeft } from "../icons";
import { AuthShell, Field, GoogleButton, Or, Submit, SwitchLine, authCss as css } from "./AuthShell";

/* Signing in lands on an existing account. If this review has no account
   yet, it opens the returning one; one made here in sign-up is kept. */
function useEnter() {
  const { s, dispatch } = useAtelier();
  const router = useRouter();
  return () => {
    if (!s.username || s.guest) dispatch({ type: "reset", session: "returning" });
    router.push("/");
  };
}

/* wf-01 · 06 — Giriş yap (A-F-08/06/11). Username or email: someone who
   forgets the name still remembers the address (the wireframe's open note).
   With the live backend the account is real: email and password, as in the
   MVP. Usernames and Google arrive with Aşama 4 (Kimlik). */
export function SignIn() {
  const { t } = useAtelier();
  const enter = useEnter();
  const router = useRouter();
  const [who, setWho] = useState("");
  const [pw, setPw] = useState("");
  const [tried, setTried] = useState(false);
  const [google, setGoogle] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<L | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    setFailed(null);
    if (!who.trim() || !pw) return;
    if (!hasBackend) return enter();
    if (!who.includes("@")) {
      setFailed({ en: "Sign in with your email for now.", tr: "Şimdilik e-postanla giriş yap." });
      return;
    }
    setBusy(true);
    const { error } = await createClient().auth.signInWithPassword({ email: who.trim(), password: pw });
    setBusy(false);
    if (error) {
      setFailed(
        error.status === 400
          ? { en: "The email or password is wrong.", tr: "E-posta ya da şifre yanlış." }
          : { en: "Couldn't sign in. Try again.", tr: "Giriş yapılamadı. Tekrar dene." },
      );
      return;
    }
    router.push("/");
  };

  const withGoogle = () => {
    if (hasBackend) {
      setFailed({ en: "Google sign-in isn't open yet.", tr: "Google ile giriş henüz açık değil." });
      return;
    }
    setGoogle(true);
    setTimeout(enter, 900);
  };

  return (
    <AuthShell title={{ en: "Welcome back", tr: "Tekrar hoş geldin" }} sub={{ en: "Sign in to your workspace.", tr: "Çalışma alanına giriş yap." }}>
      <form className={css.form} onSubmit={submit} noValidate>
        <GoogleButton busy={google} onClick={withGoogle} />
        <Or>{t({ en: "or", tr: "ya da" })}</Or>
        <Field
          id="who"
          label={t({ en: "Username or email", tr: "Kullanıcı adı ya da e-posta" })}
          value={who}
          onChange={(e) => setWho(e.target.value)}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          say={tried && !who.trim() ? { tone: "error", text: t({ en: "Enter your username or email.", tr: "Kullanıcı adını ya da e-postanı gir." }) } : null}
        />
        <Field
          id="password"
          label={t({ en: "Password", tr: "Şifre" })}
          aside={<Link href="/reset">{t({ en: "Forgot your password?", tr: "Şifreni mi unuttun?" })}</Link>}
          password
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          autoComplete="current-password"
          say={
            tried && !pw
              ? { tone: "error", text: t({ en: "Enter your password.", tr: "Şifreni gir." }) }
              : failed
                ? { tone: "error", text: t(failed) }
                : null
          }
        />
        <Submit disabled={busy}>{busy ? t({ en: "Signing in…", tr: "Giriş yapılıyor…" }) : t({ en: "Sign in", tr: "Giriş yap" })}</Submit>
      </form>
      <SwitchLine q={{ en: "No account yet?", tr: "Hesabın yok mu?" }} a={{ en: "Create one", tr: "Hesap oluştur" }} href="/signup" />
    </AuthShell>
  );
}

/* wf-01 · 07 — Şifreni sıfırla (A-F-06/12). The answer arrives in the same
   column; the page does not change. An account opened with Google has no
   password, and is told so instead. (Mock: a gmail.com address.) */
export function ResetPassword() {
  const { t } = useAtelier();
  const enter = useEnter();
  const [email, setEmail] = useState("");
  const [tried, setTried] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [google, setGoogle] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (validEmail(email)) setSent(email.trim());
  };

  return (
    <AuthShell
      title={{ en: "Reset your password", tr: "Şifreni sıfırla" }}
      sub={{ en: "Write your account's email; we'll send a link.", tr: "Hesabının e-postasını yaz; bir bağlantı gönderelim." }}
    >
      {!sent && (
        <form className={css.form} onSubmit={submit} noValidate>
          <Field
            id="email"
            label={t({ en: "Email", tr: "E-posta" })}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t({ en: "name@company.com", tr: "isim@sirket.com" })}
            autoComplete="email"
            say={tried && !validEmail(email) ? { tone: "error", text: t({ en: "Enter a valid email address.", tr: "Geçerli bir e-posta adresi gir." }) } : null}
          />
          <Submit>{t({ en: "Send link", tr: "Bağlantı gönder" })}</Submit>
        </form>
      )}

      {sent && !openedWithGoogle(sent) && (
        <div className={css.sent} role="status">
          <h3>{t({ en: "The link is in your inbox.", tr: "Bağlantı e-postana gönderildi." })}</h3>
          <p>
            {t({ en: "We sent it to ", tr: "" })}
            <b>{sent}</b>
            {t({ en: ". If it isn't there, look in spam.", tr: " adresine gönderdik. Gelmediyse spam klasörüne bak." })}
          </p>
          <span className={css.sentActions}>
            {inboxFor(sent) && (
              <a className={css.inbox} href={inboxFor(sent)!.href} target="_blank" rel="noopener noreferrer">
                {t({ en: `Open ${inboxFor(sent)!.name}`, tr: `${inboxFor(sent)!.name}'i aç` })}
              </a>
            )}
            <button className={css.again} onClick={() => setSent(null)}>
              {t({ en: "Use another address", tr: "Başka bir adres yaz" })}
            </button>
          </span>
          {/* prototype only: what clicking the link in the email opens */}
          <Link href="/reset?token=demo" className={css.demoLink}>
            {t({ en: "Open the email's link (prototype)", tr: "E-postadaki bağlantıyı aç (prototip)" })}
          </Link>
        </div>
      )}

      {sent && openedWithGoogle(sent) && (
        <div className={css.sent} role="status">
          <h3>{t({ en: "This account was opened with Google.", tr: "Bu hesap Google ile açılmış." })}</h3>
          <p>{t({ en: "It has no password. Continue with Google to sign in.", tr: "Şifresi yok. Giriş için Google ile devam et." })}</p>
          <GoogleButton
            busy={google}
            onClick={() => {
              setGoogle(true);
              setTimeout(enter, 900);
            }}
          />
        </div>
      )}

      <Link href="/signin" className={css.back}>
        <ArrowLeft size={14} />
        {t({ en: "Back to sign in", tr: "Girişe dön" })}
      </Link>
    </AuthShell>
  );
}

/* wf-01 · 07b — the page the email's link opens: a new password, twice. A link
   that has run out says so and offers a new one, instead of a form that fails. */
export function NewPassword({ token }: { token: string }) {
  const { t } = useAtelier();
  const [pw, setPw] = useState("");
  const [again, setAgain] = useState("");
  const [tried, setTried] = useState(false);
  const [done, setDone] = useState(false);
  const expired = token === "expired";
  const long = pw.length >= MIN_PASSWORD;
  const same = pw === again;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (long && same) setDone(true);
  };

  if (expired) {
    return (
      <AuthShell title={{ en: "This link has run out", tr: "Bağlantının süresi dolmuş" }} sub={{ en: "Reset links last an hour. Ask for a new one.", tr: "Sıfırlama bağlantıları bir saat geçerli. Yenisini iste." }}>
        <Link href="/reset" className={css.again}>
          {t({ en: "Send a new link", tr: "Yeni bağlantı gönder" })}
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={{ en: "Set a new password", tr: "Yeni şifreni belirle" }} sub={done ? undefined : { en: "Then sign in with it.", tr: "Sonra onunla giriş yap." }}>
      {done ? (
        <div className={css.sent} role="status">
          <h3>{t({ en: "Your password is new.", tr: "Şifren yenilendi." })}</h3>
          <p>{t({ en: "Other devices are signed out.", tr: "Diğer cihazlardaki oturumlar kapatıldı." })}</p>
          <Link href="/signin" className={css.inbox}>
            {t({ en: "Sign in", tr: "Giriş yap" })}
          </Link>
        </div>
      ) : (
        <form className={css.form} onSubmit={submit} noValidate>
          <Field
            id="password"
            label={t({ en: "New password", tr: "Yeni şifre" })}
            aside={<span className={css.rule}>{t({ en: `at least ${MIN_PASSWORD} characters`, tr: `en az ${MIN_PASSWORD} karakter` })}</span>}
            password
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            autoComplete="new-password"
            say={tried && !long ? { tone: "error", text: t({ en: `At least ${MIN_PASSWORD} characters.`, tr: `En az ${MIN_PASSWORD} karakter olmalı.` }) } : null}
          />
          <Field
            id="again"
            label={t({ en: "Once more", tr: "Bir kez daha" })}
            password
            value={again}
            onChange={(e) => setAgain(e.target.value)}
            autoComplete="new-password"
            say={tried && long && !same ? { tone: "error", text: t({ en: "The two don't match.", tr: "İki şifre aynı değil." }) } : null}
          />
          <Submit>{t({ en: "Save the new password", tr: "Yeni şifreyi kaydet" })}</Submit>
        </form>
      )}
      <Link href="/signin" className={css.back}>
        <ArrowLeft size={14} />
        {t({ en: "Back to sign in", tr: "Girişe dön" })}
      </Link>
    </AuthShell>
  );
}
