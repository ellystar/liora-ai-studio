"use client";

import Link from "next/link";
import { useRef, useState, type DragEvent, type ReactNode } from "react";
import type { L, Slot } from "@/lib/data";
import type { Shot } from "@/lib/store";
import { useAtelier } from "@/lib/store";
import { Close } from "../icons";
import css from "./Upload.module.css";

/* The first step when the user brings their own: drop everything at once,
   see where each image was placed, move what is wrong, confirm (W-F-19…22).
   Images are read in the browser and kept small, so a draft survives a reload.

   A product is two different choices (Elif): what it is — its category,
   once per product — and how each image shows it — front, back, detail.
   They sit in the same panel but never look alike: the category heads the
   product, the view sits under each image. */

export type ShotSlot = Slot | "other";
export type Rules = { slots: ShotSlot[]; max: number; needs: ShotSlot[] };
export type Category = "top" | "bottom" | "outer" | "onepiece" | "shoes" | "acc";
export interface Product {
  id: string;
  category?: Category;
}
/* something brought before, ready to use again */
export interface Asset {
  id: string;
  name: string;
  shots: Shot[];
}

export const SLOT_LABEL: Record<ShotSlot, L> = {
  front: { en: "Front", tr: "Ön" },
  back: { en: "Back", tr: "Arka" },
  detail: { en: "Detail (print, logo, texture)", tr: "Detay (baskı, logo, doku)" },
  complement: { en: "Complement", tr: "Tamamlayıcı" },
  accessory: { en: "Accessory", tr: "Aksesuar" },
  other: { en: "Frame", tr: "Kare" },
};

export const CATEGORIES: Category[] = ["top", "bottom", "outer", "onepiece", "shoes", "acc"];
export const CATEGORY_LABEL: Record<Category, L> = {
  top: { en: "Top", tr: "Üst" },
  bottom: { en: "Bottom", tr: "Alt" },
  outer: { en: "Outerwear", tr: "Dış giyim" },
  onepiece: { en: "One piece", tr: "Tek parça" },
  shoes: { en: "Shoes", tr: "Ayakkabı" },
  acc: { en: "Accessory", tr: "Aksesuar" },
};

const MIN_PX = 600;
const MAX_MB = 15;
const TYPES = ["image/jpeg", "image/png", "image/webp"];
const KEEP_PX = 900; // stored size: enough to judge, small enough to keep in the browser

/* where an image probably belongs — the backend will look at the picture; here the name and the order decide */
function guess(name: string, taken: ShotSlot[], rules: Rules): ShotSlot {
  const n = name.toLowerCase();
  const by: [RegExp, ShotSlot][] = [
    [/back|arka|rear/, "back"],
    [/detail|detay|close|yaka|lapel|zoom|logo|baski|baskı/, "detail"],
    [/belt|kemer|bag|canta|çanta|acc|aksesuar/, "accessory"],
    [/front|on_|ön/, "front"],
  ];
  for (const [re, slot] of by) if (re.test(n) && rules.slots.includes(slot)) return slot;
  return rules.slots.find((sl) => sl !== "other" && !taken.includes(sl)) ?? rules.slots[rules.slots.length - 1];
}

/* what a product probably is, from its name — always shown, always changeable */
export function guessCategory(name: string): Category | undefined {
  const n = name.toLocaleLowerCase("tr");
  const by: [RegExp, Category][] = [
    [/shoe|sneaker|boot|ayakkab|bot\b|loafer/, "shoes"],
    [/bag|çanta|canta|belt|kemer|scarf|şal|eşarp|şapka|hat|acc/, "acc"],
    [/coat|kaban|jacket|ceket|mont|trench|blazer|parka/, "outer"],
    [/dress|elbise|jumpsuit|tulum|abiye/, "onepiece"],
    [/pant|jean|skirt|etek|pantolon|short|şort|trouser/, "bottom"],
    [/shirt|gömlek|gomlek|tee|tişört|knit|triko|blouse|bluz|sweat|cardigan|hırka|top/, "top"],
  ];
  for (const [re, c] of by) if (re.test(n)) return c;
  return undefined;
}

const loadImage = (url: string) =>
  new Promise<HTMLImageElement>((ok, no) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = no;
    img.src = url;
  });

export async function readShots(files: File[], existing: Shot[], rules: Rules, product?: string): Promise<{ shots: Shot[]; errors: L[] }> {
  const shots = [...existing];
  const errors: L[] = [];
  const stamp = Date.now().toString(36);
  for (const [i, f] of files.entries()) {
    if (shots.length >= rules.max) {
      errors.push({ en: `At most ${rules.max} images here.`, tr: `Burada en fazla ${rules.max} görsel olur.` });
      break;
    }
    if (!TYPES.includes(f.type)) {
      errors.push({ en: `${f.name} must be JPG, PNG or WebP.`, tr: `${f.name} JPG, PNG ya da WebP olmalı.` });
      continue;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      errors.push({ en: `${f.name} is over ${MAX_MB} MB.`, tr: `${f.name} ${MAX_MB} MB'tan büyük.` });
      continue;
    }
    const url = URL.createObjectURL(f);
    try {
      const img = await loadImage(url);
      if (Math.min(img.naturalWidth, img.naturalHeight) < MIN_PX) {
        errors.push({ en: `${f.name} is too small — at least ${MIN_PX} px.`, tr: `${f.name} çok küçük — en az ${MIN_PX} px olmalı.` });
        continue;
      }
      const k = Math.min(1, KEEP_PX / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement("canvas");
      c.width = Math.round(img.naturalWidth * k);
      c.height = Math.round(img.naturalHeight * k);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      shots.push({ id: `u${stamp}${i}-${f.name}`, src: c.toDataURL("image/jpeg", 0.8), name: f.name, slot: guess(f.name, shots.map((x) => x.slot), rules), ...(product ? { product } : {}) });
    } catch {
      errors.push({ en: `${f.name} could not be read.`, tr: `${f.name} okunamadı.` });
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  return { shots: shots.slice(existing.length), errors };
}

/* a phone photo on a floor? — said before anything is spent (C1-F-02/03) */
export const looksFlat = (shots: Shot[]) => shots.some((x) => /flat|img_|whatsapp|photo_|pxl_/i.test(x.name));

type ProductMode = "all" | "complements";

export function Upload({
  head,
  shots,
  errors,
  rules,
  item,
  onItem,
  onFiles,
  onSlot,
  onRemove,
  onSample,
  flatHint,
  productMode,
  products = [],
  onCategory,
  onAddProduct,
  onRemoveProduct,
  tuck,
  onTuck,
  assets = [],
  onAsset,
}: {
  head: ReactNode;
  shots: Shot[];
  errors: L[];
  rules: Rules;
  item?: string; // the product's name, where the flow has one
  onItem?: (v: string) => void;
  onFiles: (files: File[], product?: string) => void; // product "new" opens a new one
  onSlot: (id: string, slot: ShotSlot) => void;
  onRemove: (id: string) => void;
  onSample: () => void;
  flatHint: boolean;
  productMode?: ProductMode; // all: every image belongs to a product · complements: a shoot, plus optional pieces
  products?: Product[];
  onCategory?: (id: string, c: Category) => void;
  onAddProduct?: () => void;
  onRemoveProduct?: (id: string) => void;
  tuck?: "in" | "out";
  onTuck?: (v: "in" | "out") => void;
  assets?: Asset[];
  onAsset?: (a: Asset) => void;
}) {
  const { t } = useAtelier();
  const input = useRef<HTMLInputElement>(null);
  const target = useRef<string | undefined>(undefined); // which product the picked files go to
  const [over, setOver] = useState(false);
  const [keepFlat, setKeepFlat] = useState(false);
  const [shelf, setShelf] = useState(false);

  const choose = (product?: string) => {
    target.current = product;
    input.current?.click();
  };
  const drop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    if (!e.dataTransfer.files.length) return;
    /* dropped anywhere: onto the last product, or a first one */
    const last = productMode === "all" ? products[products.length - 1]?.id : undefined;
    onFiles([...e.dataTransfer.files], productMode === "all" ? (last ?? "new") : undefined);
  };

  const base = productMode === "all" ? [] : shots.filter((x) => !x.product);
  const empty = productMode === "all" ? products.length === 0 : base.length === 0;
  const cats = products.map((p) => p.category);
  const layered = cats.includes("top") && cats.includes("bottom");
  const rulesLine = t({ en: `JPG, PNG, WebP · at least ${MIN_PX} px · up to ${MAX_MB} MB`, tr: `JPG, PNG, WebP · en az ${MIN_PX} px · en fazla ${MAX_MB} MB` });

  return (
    <div
      className={css.upload}
      data-over={over || undefined}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={(e) => e.currentTarget === e.target && setOver(false)}
      onDrop={drop}
    >
      {head}

      {onItem && (
        <label className={css.item}>
          <span>
            {t({ en: "Product name", tr: "Ürün adı" })} <em>{t({ en: "optional", tr: "isteğe bağlı" })}</em>
          </span>
          <input value={item ?? ""} onChange={(e) => onItem(e.target.value)} placeholder={t({ en: "e.g. Camel wool coat", tr: "örn. Kamel yün kaban" })} />
        </label>
      )}

      {empty ? (
        <button className={css.zone} onClick={() => choose(productMode === "all" ? "new" : undefined)}>
          <b>{t({ en: "Drop your images", tr: "Görsellerini bırak" })}</b>
          <span>
            {t({ en: "or choose", tr: "ya da seç" })} · {rulesLine}
          </span>
        </button>
      ) : productMode === "all" ? (
        <>
          {products.map((p, i) => (
            <ProductBlock key={p.id} p={p} i={i} label={{ en: "Product", tr: "Ürün" }} shots={shots.filter((x) => x.product === p.id)} onCategory={onCategory} onRemoveProduct={onRemoveProduct} onSlot={onSlot} onRemove={onRemove} onAdd={() => choose(p.id)} />
          ))}
          {layered && onTuck && (
            /* only when a top and a bottom are worn together */
            <div className={css.tuck}>
              <span>{t({ en: "The top is worn", tr: "Üst ürün" })}</span>
              <span className={css.cats} role="radiogroup">
                <button role="radio" aria-checked={tuck === "in"} onClick={() => onTuck("in")}>
                  {t({ en: "Tucked in", tr: "İçeride" })}
                </button>
                <button role="radio" aria-checked={tuck === "out"} onClick={() => onTuck("out")}>
                  {t({ en: "Left out", tr: "Dışarıda" })}
                </button>
              </span>
            </div>
          )}
          {products.length < 4 && (
            <button className={css.more} onClick={() => (onAddProduct ? onAddProduct() : choose("new"))}>
              + {t({ en: "Add a product", tr: "Ürün ekle" })} <span>{t({ en: "a top under the coat, the bag that goes with it…", tr: "kabanın altındaki üst, yanındaki çanta…" })}</span>
            </button>
          )}
        </>
      ) : (
        <>
          <ShotGrid list={base} slots={rules.slots} max={rules.max} onSlot={onSlot} onRemove={onRemove} onAdd={() => choose(undefined)} />
          {productMode === "complements" && (
            /* a shoot, and — if they want another look — the pieces to put on it */
            <div className={css.complements}>
              <p className={css.sectionHead}>
                {t({ en: "Complementary pieces", tr: "Tamamlayıcı parçalar" })} <em>{t({ en: "optional — to change the look", tr: "isteğe bağlı — kombini değiştirmek için" })}</em>
              </p>
              {products.map((p, i) => (
                <ProductBlock key={p.id} p={p} i={i} label={{ en: "Piece", tr: "Parça" }} shots={shots.filter((x) => x.product === p.id)} onCategory={onCategory} onRemoveProduct={onRemoveProduct} onSlot={onSlot} onRemove={onRemove} onAdd={() => choose(p.id)} />
              ))}
              {products.length < 3 && (
                <button className={css.more} onClick={() => choose("new")}>
                  + {t({ en: "Add a piece", tr: "Parça ekle" })}
                </button>
              )}
            </div>
          )}
        </>
      )}
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files?.length) onFiles([...e.target.files], target.current);
          e.target.value = "";
        }}
      />

      {errors.length > 0 && (
        <ul className={css.errors} role="alert">
          {errors.map((er, i) => (
            <li key={i}>{t(er)}</li>
          ))}
        </ul>
      )}

      {flatHint && !keepFlat && (
        <p className={css.hint}>
          {t({ en: "This looks like a phone photo on a floor. Clean it into a ghost first?", tr: "Yerde, telefonla çekilmiş gibi görünüyor. Önce temiz bir ghost'a çevirelim mi?" })}
          <span>
            <Link href="/concepts/e/ghost">{t({ en: "Flat to Ghost", tr: "Flat'ten Ghost'a" })}</Link>
            <button onClick={() => setKeepFlat(true)}>{t({ en: "Go on as it is", tr: "Böyle devam et" })}</button>
          </span>
        </p>
      )}

      {/* things brought before (Elif: "assetlerden seç") */}
      {onAsset && assets.length > 0 && (
        <div className={css.assets}>
          <button className={css.shelfToggle} aria-expanded={shelf} onClick={() => setShelf((v) => !v)}>
            {t({ en: "Pick from your assets", tr: "Assetlerden seç" })} <span>{assets.length}</span>
          </button>
          {shelf && (
            <ul className={css.shelf}>
              {assets.map((a) => (
                <li key={a.id}>
                  <button
                    onClick={() => {
                      onAsset(a);
                      setShelf(false);
                    }}
                  >
                    <img src={a.shots[0].src} alt="" />
                    <span>{a.name}</span>
                    <em>{t({ en: `${a.shots.length} images`, tr: `${a.shots.length} görsel` })}</em>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {empty && (
        <button className={css.sample} onClick={onSample}>
          {t({ en: "Try with a sample product", tr: "Örnek ürünle dene" })}
        </button>
      )}
    </div>
  );
}

const VIEWS: ShotSlot[] = ["front", "back", "detail"];

function ShotGrid({ list, slots, max, onSlot, onRemove, onAdd }: { list: Shot[]; slots: ShotSlot[]; max: number; onSlot: (id: string, slot: ShotSlot) => void; onRemove: (id: string) => void; onAdd?: () => void }) {
  const { t } = useAtelier();
  return (
    <ul className={css.shots}>
      {list.map((sh) => (
        <li key={sh.id}>
          <span className={css.pic}>
            <img src={sh.src} alt="" />
            <button className={css.remove} onClick={() => onRemove(sh.id)} aria-label={t({ en: "Remove", tr: "Kaldır" })}>
              <Close size={11} />
            </button>
          </span>
          {/* W-F-20/21: how this image shows the product, and the way to change it */}
          <select value={sh.slot} onChange={(e) => onSlot(sh.id, e.target.value as ShotSlot)} aria-label={sh.name}>
            {slots.map((sl) => (
              <option key={sl} value={sl}>
                {t(SLOT_LABEL[sl])}
              </option>
            ))}
          </select>
        </li>
      ))}
      {onAdd && list.length < max && (
        <li>
          <button className={css.addTile} onClick={onAdd}>
            <span>+</span>
            {t({ en: "Image", tr: "Görsel" })}
          </button>
        </li>
      )}
    </ul>
  );
}

function ProductBlock({
  p,
  i,
  label,
  shots,
  onCategory,
  onRemoveProduct,
  onSlot,
  onRemove,
  onAdd,
}: {
  p: Product;
  i: number;
  label: L;
  shots: Shot[];
  onCategory?: (id: string, c: Category) => void;
  onRemoveProduct?: (id: string) => void;
  onSlot: (id: string, slot: ShotSlot) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
}) {
  const { t } = useAtelier();
  return (
    <section className={css.product}>
      <header className={css.productHead}>
        <span className={css.productName}>
          {t(label)} {i + 1}
        </span>
        {/* what it is: one choice for the whole product */}
        <span className={css.cats} role="radiogroup" aria-label={t({ en: "Category", tr: "Kategori" })}>
          {CATEGORIES.map((c) => (
            <button key={c} role="radio" aria-checked={p.category === c} onClick={() => onCategory?.(p.id, c)}>
              {t(CATEGORY_LABEL[c])}
            </button>
          ))}
        </span>
        {onRemoveProduct && (
          <button className={css.dropProduct} onClick={() => onRemoveProduct(p.id)} aria-label={t({ en: "Remove product", tr: "Ürünü kaldır" })}>
            <Close size={11} />
          </button>
        )}
      </header>
      {!p.category && <p className={css.ask}>{t({ en: "What is it? Pick its category.", tr: "Bu ne? Kategorisini seç." })}</p>}
      <ShotGrid list={shots} slots={VIEWS} max={6} onSlot={onSlot} onRemove={onRemove} onAdd={onAdd} />
    </section>
  );
}
