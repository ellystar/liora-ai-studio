"use client";

import { useState } from "react";
import { FOR, JOBS, TOOLS, VERTICALS, WHY, answerOf, listOf, type Answer } from "@/lib/brand";
import type { L } from "@/lib/data";
import { useAtelier } from "@/lib/store";
import { Check } from "../icons";
import css from "./Admin.module.css";

/* Who's coming — what onboarding learns, read back for the team: who signs
   up, why, with what tools, which world they wait for, and who said we may
   write. The last list is the partnership list. Counts are mock (the last 7
   days); the reachable list includes this session's own answers. */

type Count = [string, number];

const WEEK = 248;
const BY_FOR: Count[] = [
  ["own", 120],
  ["employer", 34],
  ["agency", 27],
  ["explore", 67],
];
const BY_JOB: Count[] = [
  ["designer", 22],
  ["developer", 17],
  ["pm", 11],
  ["student", 9],
  ["photographer", 5],
  ["founder", 3],
];
const BY_WHY: Count[] = [
  ["benchmark", 24],
  ["curious", 18],
  ["ideas", 12],
  ["client", 8],
  ["team", 5],
];
const BY_TOOL: Count[] = [
  ["figma", 41],
  ["midjourney", 29],
  ["photoshop", 26],
  ["flora", 12],
  ["krea", 9],
  ["comfy", 7],
];
const BY_WAIT: Count[] = [
  ["beauty", 19],
  ["jewelry", 11],
  ["home", 6],
  ["else", 4],
  ["food", 3],
];

export interface Person {
  id: string;
  user: string;
  job?: string;
  jobText?: string; // "something else", in their words
  company?: string;
  why?: string;
  tools: string[];
  talk: string[];
  you?: boolean;
}

export const PEOPLE: Person[] = [
  { id: "r1", user: "ece.tasarim", job: "designer", company: "Studio Ayna", why: "benchmark", tools: ["figma", "flora"], talk: ["chat"] },
  { id: "r2", user: "nordform", job: "founder", company: "Nordform", why: "benchmark", tools: ["midjourney", "flora"], talk: ["partner", "news"] },
  { id: "r3", user: "selin.po", job: "pm", company: "Pazarium", why: "team", tools: ["figma"], talk: ["partner"] },
  { id: "r4", user: "kaan.studio", job: "photographer", company: "Kaan Studio", why: "client", tools: ["photoshop", "midjourney"], talk: ["partner"] },
  { id: "r5", user: "mert.dev", job: "developer", why: "curious", tools: ["comfy"], talk: ["chat"] },
  { id: "r6", user: "deniz.icerik", job: "content", company: "Lumen Ajans", why: "client", tools: ["photoshop"], talk: ["chat", "news"] },
];

/* people who said we may write: a chat or a partnership */
export const reachable = (talk: string[]) => talk.includes("chat") || talk.includes("partner");

export function People({ people, contacted, onContact }: { people: Person[]; contacted: Record<string, boolean>; onContact: (p: Person) => void }) {
  const { t, s } = useAtelier();
  const [filter, setFilter] = useState<"all" | "chat" | "partner">("all");
  const list = people.filter((p) => reachable(p.talk) && (filter === "all" || p.talk.includes(filter)));
  const pct = (n: number) => `%${Math.round((n / WEEK) * 100)}`;
  const brands = BY_FOR.filter(([id]) => id !== "explore").reduce((n, [, c]) => n + c, 0);
  const open = people.filter((p) => reachable(p.talk)).length;

  return (
    <>
      <h1>{t({ en: "Who's coming", tr: "Kimler geliyor" })}</h1>
      <div className={css.stats}>
        <Num n={String(WEEK)} l={t({ en: "sign-ups · 7 days", tr: "kayıt · 7 gün" })} />
        <Num n={pct(brands)} l={t({ en: "brand, team or agency", tr: "marka, ekip ya da ajans" })} />
        <Num n={pct(BY_FOR.find(([id]) => id === "explore")![1])} l={t({ en: "just looking", tr: "sadece bakıyor" })} />
        <Num n={String(open)} l={t({ en: "open to talk", tr: "konuşmaya açık" })} />
      </div>

      <div className={css.bars}>
        <Bars title={{ en: "Here for", tr: "Kimin için" }} list={FOR} counts={BY_FOR} />
        <Bars title={{ en: "Just looking · work", tr: "Sadece bakanlar · meslek" }} list={JOBS} counts={BY_JOB} />
        <Bars title={{ en: "What brought them", tr: "Neden geldi" }} list={WHY} counts={BY_WHY} />
        <Bars title={{ en: "Tools", tr: "Araçlar" }} list={TOOLS} counts={BY_TOOL} />
        <Bars title={{ en: "Waiting · besides fashion", tr: "Bekleme listesi · moda dışı" }} list={VERTICALS} counts={BY_WAIT} />
      </div>

      <div className={css.peopleHead}>
        <h2>{t({ en: "Open to talk", tr: "Konuşmaya açık" })}</h2>
        <nav className={css.filters}>
          {(
            [
              ["all", { en: "All", tr: "Hepsi" }],
              ["chat", { en: "Research chat", tr: "Sohbet" }],
              ["partner", { en: "Partnership", tr: "Ortaklık" }],
            ] as const
          ).map(([id, label]) => (
            <button key={id} aria-pressed={filter === id} onClick={() => setFilter(id)}>
              {t(label)}
            </button>
          ))}
        </nav>
      </div>
      <div className={css.table}>
        {list.map((p) => (
          <div key={p.id} className={css.person}>
            <span>
              <span className={css.user}>@{p.user}</span>
              {p.you && <em className={css.you}>{t({ en: "this session", tr: "bu oturum" })}</em>}
              <span className={css.who}>{[p.jobText || t(answerOf(JOBS, p.job)?.label ?? { en: "—", tr: "—" }), p.company].filter(Boolean).join(" · ")}</span>
            </span>
            <span className={css.why}>
              {t(answerOf(WHY, p.why)?.label ?? { en: "—", tr: "—" })}
              <em>{listOf(TOOLS, p.tools, s.lang)}</em>
            </span>
            <span className={css.wants}>{p.talk.includes("partner") ? t({ en: "Partnership", tr: "Ortaklık" }) : t({ en: "Chat", tr: "Sohbet" })}</span>
            <button className={css.contact} aria-pressed={!!contacted[p.id]} onClick={() => onContact(p)} disabled={contacted[p.id]}>
              {contacted[p.id] ? (
                <>
                  <Check size={11} /> {t({ en: "Reached", tr: "Ulaşıldı" })}
                </>
              ) : (
                t({ en: "Mark reached", tr: "Ulaşıldı say" })
              )}
            </button>
          </div>
        ))}
      </div>
    </>
  );
}

function Num({ n, l }: { n: string; l: string }) {
  return (
    <p className={css.stat}>
      <b>{n}</b>
      <span>{l}</span>
    </p>
  );
}

function Bars({ title, list, counts }: { title: L; list: Answer[]; counts: Count[] }) {
  const { t } = useAtelier();
  const max = Math.max(...counts.map((c) => c[1]));
  return (
    <section className={css.barBlock}>
      <h2>{t(title)}</h2>
      <ul>
        {counts.map(([id, n], i) => (
          <li key={id}>
            <span>{t(answerOf(list, id)?.label ?? { en: id, tr: id })}</span>
            <i aria-hidden>
              <b style={{ width: `${(n / max) * 100}%` }} data-top={i === 0 || undefined} />
            </i>
            <em>{n}</em>
          </li>
        ))}
      </ul>
    </section>
  );
}
