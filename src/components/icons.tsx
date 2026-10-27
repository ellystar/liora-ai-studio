/* Line icons, 1.25px stroke, drawn to sit beside mono type.
   Liora uses very few icons; text carries most of the meaning. */

type P = { size?: number; className?: string };

const base = (size = 16) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.25,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export const Arrow = ({ size = 14, className }: P) => (
  <svg {...base(size)} className={className}>
    <line x1="4" y1="12" x2="19" y2="12" />
    <polyline points="13 6 19 12 13 18" />
  </svg>
);

export const ArrowLeft = ({ size = 14, className }: P) => (
  <svg {...base(size)} className={className}>
    <line x1="20" y1="12" x2="5" y2="12" />
    <polyline points="11 6 5 12 11 18" />
  </svg>
);

export const Lock = ({ size = 12, className }: P) => (
  <svg {...base(size)} className={className}>
    <rect x="5" y="11" width="14" height="9" rx="1" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);

export const Bell = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" />
    <path d="M10 20a2 2 0 0 0 4 0" />
  </svg>
);

export const Close = ({ size = 14, className }: P) => (
  <svg {...base(size)} className={className}>
    <line x1="6" y1="6" x2="18" y2="18" />
    <line x1="18" y1="6" x2="6" y2="18" />
  </svg>
);

export const Download = ({ size = 14, className }: P) => (
  <svg {...base(size)} className={className}>
    <line x1="12" y1="4" x2="12" y2="15" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="5" y1="20" x2="19" y2="20" />
  </svg>
);

export const Check = ({ size = 12, className }: P) => (
  <svg {...base(size)} className={className} strokeWidth={1.6}>
    <polyline points="5 12.5 10 17 19 7" />
  </svg>
);

export const Plus = ({ size = 14, className }: P) => (
  <svg {...base(size)} className={className}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

export const Upload = ({ size = 20, className }: P) => (
  <svg {...base(size)} className={className}>
    <line x1="12" y1="16" x2="12" y2="4" />
    <polyline points="7 9 12 4 17 9" />
    <path d="M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" />
  </svg>
);

export const ThumbUp = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M7 11v9H4v-9zM7 11l4-7a2 2 0 0 1 3 2l-1 4h5a2 2 0 0 1 2 2.3l-1.2 6A2 2 0 0 1 16.8 20H7" />
  </svg>
);

export const ThumbDown = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M17 13V4h3v9zM17 13l-4 7a2 2 0 0 1-3-2l1-4H6a2 2 0 0 1-2-2.3l1.2-6A2 2 0 0 1 7.2 4H17" />
  </svg>
);

export const Chevron = ({ size = 14, className, dir = "right" }: P & { dir?: "left" | "right" | "down" }) => (
  <svg
    {...base(size)}
    className={className}
    style={{ transform: dir === "left" ? "rotate(180deg)" : dir === "down" ? "rotate(90deg)" : undefined }}
  >
    <polyline points="9 5 16 12 9 19" />
  </svg>
);
