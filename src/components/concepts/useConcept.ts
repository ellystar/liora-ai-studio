"use client";

import { useEffect, useRef, useState } from "react";
import { ANGLES, CASTS, ROLE_RANK, SETTINGS, type Angle, type Role } from "@/lib/data";

/* The same slice of the Campaign flow for every concept, so the three are
   judged on the design, not on scope: product is in, the user is choosing
   the cast, then the setting; framing and ratio arrive as defaults. */

export type CStep = "cast" | "setting" | "ready" | "running" | "done";

export const canUse = (role: Role, min: Role) => ROLE_RANK[role] >= ROLE_RANK[min];

/* "Make with this cast" in the Salon arrives with ?cast= — the cast node
   comes filled and the setting is next (wf-05 · 02). */
export function useConcept(initialCast?: string) {
  const fromSalon = CASTS.find((c) => c.id === initialCast)?.id;
  const [step, setStep] = useState<CStep>(fromSalon ? "setting" : "cast");
  const [castId, setCastId] = useState<string | undefined>(fromSalon ?? "ada");
  const [settingId, setSettingId] = useState<string | undefined>();
  const [angles, setAngles] = useState<Angle[]>(["front", "threeQuarter", "back"]);
  const [ratio, setRatio] = useState("3:4");
  const [done, setDone] = useState(0); // frames delivered while running
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const start = (lead = 1400, each = 1000) => {
    setStep("running");
    setDone(0);
    timers.current.forEach(clearTimeout);
    timers.current = angles.map((_, i) => setTimeout(() => setDone(i + 1), lead + each * (i + 1)));
    timers.current.push(setTimeout(() => setStep("done"), lead + each * angles.length + 500));
  };

  const reset = () => {
    timers.current.forEach(clearTimeout);
    setStep("cast");
    setCastId("ada");
    setSettingId(undefined);
    setDone(0);
  };

  const toggleAngle = (a: Angle) =>
    setAngles((cur) =>
      cur.includes(a) ? (cur.length > 1 ? cur.filter((x) => x !== a) : cur) : ANGLES.map((x) => x.id).filter((x) => x === a || cur.includes(x)),
    );

  return {
    step,
    setStep,
    castId,
    setCastId,
    settingId,
    setSettingId,
    angles,
    toggleAngle,
    ratio,
    setRatio,
    done,
    start,
    reset,
    cast: CASTS.find((c) => c.id === castId),
    setting: SETTINGS.find((x) => x.id === settingId),
    outputs: angles.map((a) => ANGLES.find((x) => x.id === a)!),
  };
}
