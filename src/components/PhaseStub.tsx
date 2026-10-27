"use client";

import Link from "next/link";
import type { L } from "@/lib/data";
import { useAtelier } from "@/lib/store";
import { TopBar } from "./TopBar";

/* Placeholder for screens outside the first slice — still on-brand, and
   explicit about when they arrive, so a review never hits a dead end. */
export function PhaseStub({ title, phase, note }: { title: L; phase: number; note: L }) {
  const { t, ready } = useAtelier();
  if (!ready) return <main style={{ minHeight: "100vh" }} />;
  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <TopBar />
      <section
        style={{
          flex: 1,
          display: "grid",
          placeContent: "center",
          justifyItems: "center",
          gap: 18,
          textAlign: "center",
          padding: 40,
        }}
      >
        <span className="meta">
          {t({ en: "Phase", tr: "Faz" })} {phase}
        </span>
        <h1 className="display" style={{ fontSize: "clamp(40px,4.4vw,64px)", margin: 0, lineHeight: 1.04 }}>
          {t(title)}
        </h1>
        <p style={{ maxWidth: "46ch", color: "var(--content-secondary)", margin: 0 }}>{t(note)}</p>
        <Link href="/" className="link" style={{ marginTop: 16 }}>
          {t({ en: "Back to the Atelier", tr: "Atölye'ye dön" })}
        </Link>
      </section>
    </main>
  );
}
