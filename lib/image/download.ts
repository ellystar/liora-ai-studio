'use client'

import { createClient } from '@/lib/supabase/client'

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

// data URL (veya herhangi bir gorsel) -> JPEG Blob
export async function imageToJpegBlob(src: string, quality = 0.95): Promise<Blob> {
  const img = await loadImage(src)
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')!
  // JPEG'in alpha kanali yok; seffaf alanlar siyah cikmasin diye beyaz zemin
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, 0, 0)
  return await new Promise((res) => canvas.toBlob((b) => res(b as Blob), 'image/jpeg', quality))
}

// Ayni-origin blob linkiyle indirir. URL hemen revoke edilirse bazi tarayicilar
// (ozellikle Safari) indirmeyi sessizce iptal ediyor; bu yuzden gecikmeli.
function triggerBlobDownload(blob: Blob, fileName: string) {
  const objectUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objectUrl
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000)
}

type DownloadOptions = {
  /** Varsayilan: 'outputs' */
  bucket?: string
  /** Storage'daki dosya yolu (varsa en guvenilir yol bu) */
  storagePath?: string
  /** storagePath yoksa: elde sadece URL / data URL varsa */
  url?: string
  /** Hazir dosya (or. ZIP) */
  blob?: Blob
  /** url'deki gorseli beyaz zeminli JPEG'e cevirip indirir */
  asJpg?: boolean
  /** Inen dosyanin adi */
  fileName?: string
  /** downloads kaydi; indirme basladiktan sonra arka planda calisir */
  onLogged?: () => Promise<unknown> | unknown
}

/**
 * Uygulamadaki tum indirmelerin tek giris noktasi. Indirme baslatilabildiyse
 * true doner; kayit (onLogged) indirmeyi bekletmez, hata verse de indirme etkilenmez.
 */
export async function downloadImage({
  bucket = 'outputs',
  storagePath,
  url,
  blob,
  asJpg = false,
  fileName,
  onLogged,
}: DownloadOptions): Promise<boolean> {
  let name =
    fileName ??
    `liora-${(storagePath ?? url ?? 'image').split('/').pop()?.split('?')[0] || 'image.jpg'}`
  if (asJpg && !name.toLowerCase().endsWith('.jpg')) name = `${name}.jpg`

  try {
    if (storagePath) {
      // Supabase dosyayi "attachment" olarak verir: tarayici acmak yerine indirir.
      const { data, error } = await createClient()
        .storage.from(bucket)
        .createSignedUrl(storagePath, 60, { download: name })
      if (error || !data?.signedUrl) throw error ?? new Error('signed url missing')

      // Attachment oldugu icin sayfadan cikmaz, yeni sekme acmaz, pop-up engeline takilmaz.
      window.location.assign(data.signedUrl)
    } else if (blob) {
      triggerBlobDownload(blob, name)
    } else if (url) {
      if (asJpg) {
        triggerBlobDownload(await imageToJpegBlob(url), name)
      } else {
        const res = await fetch(url)
        if (!res.ok) throw new Error(`fetch failed: ${res.status}`)
        triggerBlobDownload(await res.blob(), name)
      }
    } else {
      throw new Error('downloadImage: storagePath, blob veya url gerekli')
    }
  } catch (e) {
    console.error('download failed', e)
    alert('İndirme başlatılamadı, lütfen tekrar deneyin.')
    return false
  }

  if (onLogged) {
    Promise.resolve()
      .then(() => onLogged())
      .then((res) => {
        // Supabase cagrisi dogrudan verilirse { error } doner, throw etmez
        const err = (res as { error?: unknown } | undefined)?.error
        if (err) console.error('downloads insert failed', err)
      })
      .catch((err) => console.error('downloads insert failed', err))
  }

  return true
}
