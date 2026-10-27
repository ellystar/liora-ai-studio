import type { CSSProperties } from "react";
import css from "./Seam.module.css";

/* Before → after, shown as a calm dissolve.
   (The torn-seam tear this component used to draw was retired from the
   design system on 2026-10-01; the API is kept so callers don't change.)

   mode="hover"  the after image sits on top; hovering dissolves to the input.
   mode="reveal" the after image develops over the input, once, on arrival. */
export function Seam({
  before,
  after,
  mode = "hover",
  delay = 0,
  alt = "",
  className = "",
  fit = "cover",
}: {
  before: string;
  after: string;
  mode?: "hover" | "reveal";
  delay?: number;
  alt?: string;
  className?: string;
  fit?: "cover" | "contain";
}) {
  const style = { "--delay": `${delay}ms`, "--fit": fit } as CSSProperties;
  return (
    <div className={`${css.seam} ${css[mode]} ${className}`} style={style}>
      {mode === "hover" ? (
        <>
          <img className={css.img} src={after} alt={alt} />
          <img className={`${css.img} ${css.before}`} src={before} alt="" aria-hidden />
        </>
      ) : (
        <>
          <img className={css.img} src={before} alt="" aria-hidden />
          <img className={`${css.img} ${css.after}`} src={after} alt={alt} />
        </>
      )}
    </div>
  );
}
