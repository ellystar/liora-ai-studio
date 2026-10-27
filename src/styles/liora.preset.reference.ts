/**
 * LIORA — Tailwind preset
 * v1.0 · shared by lioralabs.io and atelier.lioralabs.io
 *
 * Usage (Atelier's tailwind.config.ts):
 *
 *   import liora from "./liora.preset";
 *   export default {
 *     presets: [liora],
 *     content: ["./app/**\/*.{ts,tsx}", "./components/**\/*.{ts,tsx}"],
 *   };
 *
 * Import `liora-tokens.css` once in the root layout as well: the semantic
 * colours below resolve to CSS variables, which is what makes a dark theme a
 * `data-theme="dark"` attribute instead of a second set of classes.
 *
 * Two families of colour are exposed on purpose:
 *   · brand.*    — the raw constants (bone, ink, gold…). Use in marketing surfaces.
 *   · semantic   — surface / content / border / state. Use in the app.
 * Reach for semantic first; it is the one that survives a theme switch.
 */
import type { Config } from "tailwindcss";

const preset = {
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        /* raw brand constants */
        bone: "#F2EDE3",
        "bone-2": "#E9E2D5",
        stone: "#C8BCA8",
        ink: "#100E0B",
        "ink-2": "#1C1813",
        text: "#1A1611",
        "text-mut": "#6E665A",
        "on-dark": "#EFE8DA",
        "on-dark-mut": "#A99C86",
        gold: "#B07A2E",
        oxblood: "#5C1F29",
        "oxblood-lift": "#CF8076",
        olive: "#5F6B4B",

        /* semantic — theme-aware, backed by liora-tokens.css */
        surface: {
          DEFAULT: "var(--surface-page)",
          raised: "var(--surface-raised)",
          sunken: "var(--surface-sunken)",
          inverse: "var(--surface-inverse)",
        },
        content: {
          DEFAULT: "var(--content-primary)",
          secondary: "var(--content-secondary)",
          muted: "var(--content-muted)",
          inverse: "var(--content-inverse)",
          link: "var(--content-link)",
          disabled: "var(--content-disabled)",
        },
        line: {
          subtle: "var(--border-subtle)",
          DEFAULT: "var(--border-default)",
          strong: "var(--border-strong)",
          focus: "var(--border-focus)",
        },
        state: {
          success: "var(--state-success)",
          "success-surface": "var(--state-success-surface)",
          warning: "var(--state-warning)",
          "warning-surface": "var(--state-warning-surface)",
          danger: "var(--state-danger)",
          "danger-surface": "var(--state-danger-surface)",
          info: "var(--state-info)",
          "info-surface": "var(--state-info-surface)",
        },
      },

      fontFamily: {
        display: ["var(--font-display)", "Newsreader", "Georgia", "serif"],
        ui: ["var(--font-ui)", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "Menlo", "monospace"],
      },

      /* The site's display scale, available as text-d1 … text-d4 */
      fontSize: {
        d1: ["clamp(40px, 6.4vw, 78px)", { lineHeight: "1.03", letterSpacing: "-0.022em", fontWeight: "300" }],
        d2: ["clamp(29px, 4.2vw, 48px)", { lineHeight: "1.07", letterSpacing: "-0.016em", fontWeight: "300" }],
        d3: ["clamp(22px, 2.6vw, 28px)", { lineHeight: "1.16", letterSpacing: "-0.01em", fontWeight: "400" }],
        d4: ["21px", { lineHeight: "1.2", letterSpacing: "-0.006em", fontWeight: "400" }],
        "body-l": ["18px", { lineHeight: "1.65" }],
        body: ["16px", { lineHeight: "1.6" }],
        "body-s": ["14px", { lineHeight: "1.55" }],
        "ui-md": ["15px", { lineHeight: "1.5" }],
        "ui-sm": ["13px", { lineHeight: "1.45" }],
        "ui-xs": ["12px", { lineHeight: "1.4" }],
        meta: ["12px", { lineHeight: "1.4", letterSpacing: "0.1em" }],
        eyebrow: ["11px", { lineHeight: "1.3", letterSpacing: "0.2em" }],
      },

      letterSpacing: {
        wordmark: "0.22em",
        eyebrow: "0.2em",
        meta: "0.1em",
      },

      /* Near-square. Liora is not a rounded brand — 2px is the house radius. */
      borderRadius: {
        DEFAULT: "2px",
        seam: "2px",
        pill: "999px",
      },

      /* Barely-there. Prefer a hairline; use shadow only when a layer floats. */
      boxShadow: {
        1: "var(--elevation-1)",
        2: "var(--elevation-2)",
        3: "var(--elevation-3)",
      },

      maxWidth: {
        wrap: "1280px",
        prose: "65ch",
      },

      spacing: {
        18: "4.5rem",
        30: "7.5rem",
        38: "9.5rem",
        50: "12.5rem",
      },

      height: {
        "control-sm": "32px",
        "control-md": "40px",
        "control-lg": "48px",
      },

      /* One curve for the whole brand. */
      transitionTimingFunction: {
        liora: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      transitionDuration: {
        fast: "150ms",
        base: "300ms",
        slow: "500ms",
        reveal: "800ms",
      },
    },
  },
} satisfies Partial<Config>;

export default preset;
