/* Downloads, in the browser. On the free plan the mark is drawn into the
   file itself, not laid over it on screen — a saved file carries it too
   (S-F-15). Until the backend serves the files, this is how a frame leaves. */

export async function renderImage(src: string, watermark: boolean): Promise<Blob> {
  const img = new Image();
  img.src = src;
  await img.decode();
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const g = c.getContext("2d")!;
  g.drawImage(img, 0, 0);
  if (watermark) {
    const w = c.width;
    g.save();
    g.translate(w / 2, c.height / 2);
    g.rotate(-Math.PI / 6);
    g.strokeStyle = "rgba(239, 232, 218, 0.16)";
    g.lineWidth = Math.max(1, w / 700);
    for (let y = -c.height; y <= c.height; y += w / 7) {
      g.beginPath();
      g.moveTo(-w * 1.5, y);
      g.lineTo(w * 1.5, y);
      g.stroke();
    }
    g.restore();
    g.fillStyle = "rgba(239, 232, 218, 0.6)";
    g.font = `${Math.round(w / 16)}px Georgia, serif`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("L I O R A", w / 2, c.height / 2);
  }
  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error("render failed"))), "image/jpeg", 0.92));
}

export async function downloadImage(src: string, name: string, watermark: boolean) {
  const url = URL.createObjectURL(await renderImage(src, watermark));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/* several frames, one after another — browsers ask once to allow them */
export async function downloadAll(items: { src: string; name: string }[], watermark: boolean) {
  for (const it of items) {
    await downloadImage(it.src, it.name, watermark);
    await new Promise((r) => setTimeout(r, 350));
  }
}

export const fileName = (title: string, i: number) =>
  `liora-${title
    .toLocaleLowerCase("tr")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}-${String(i + 1).padStart(2, "0")}.jpg`;
