'use client'

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function drawScaled(img: HTMLImageElement, maxEdge: number): HTMLCanvasElement {
  const scale = Math.min(1, maxEdge / Math.max(img.width, img.height))
  const w = Math.max(1, Math.round(img.width * scale))
  const h = Math.max(1, Math.round(img.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, w, h)
  return canvas
}

// Yuklenen dosyayi kucultup base64 dondurur
export async function fileToScaledBase64(
  file: File,
  maxEdge = 1280,
  quality = 0.85,
): Promise<{ base64: string; mimeType: string }> {
  const url = URL.createObjectURL(file)
  try {
    const img = await loadImage(url)
    const canvas = drawScaled(img, maxEdge)
    const dataUrl = canvas.toDataURL('image/jpeg', quality)
    return { base64: dataUrl.split(',')[1], mimeType: 'image/jpeg' }
  } finally {
    URL.revokeObjectURL(url)
  }
}

// Yuklenen dosyayi kucultup yeni bir File dondurur (storage'a yuklemek icin)
export async function scaleFileForUpload(
  file: File,
  maxEdge = 1280,
  quality = 0.85,
): Promise<File> {
  const url = URL.createObjectURL(file)
  try {
    const img = await loadImage(url)
    const canvas = drawScaled(img, maxEdge)
    const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b as Blob), 'image/jpeg', quality))
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' })
  } finally {
    URL.revokeObjectURL(url)
  }
}

// Bir gorsel URL'ini cekip kucultup base64 dondurur (model gorseli icin)
export async function urlToScaledBase64(
  url: string,
  maxEdge = 1280,
  quality = 0.85,
): Promise<{ base64: string; mimeType: string }> {
  const res = await fetch(url)
  const blob = await res.blob()
  const file = new File([blob], 'image.jpg', { type: blob.type || 'image/jpeg' })
  return fileToScaledBase64(file, maxEdge, quality)
}