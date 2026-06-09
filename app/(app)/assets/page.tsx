'use client'

import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { listAssets, deleteAsset, type Asset } from '@/lib/assets/assets'
import { useI18n } from '@/lib/i18n/language-provider'

export default function AssetsPage() {
  const { t } = useI18n()
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try { setAssets(await listAssets()) } catch (e) { console.error(e) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function handleDelete(a: Asset) {
    if (!confirm(t('assets.confirmDelete'))) return
    setDeleting(a.id)
    try {
      await deleteAsset(a.id, a.image_path)
      setAssets((prev) => prev.filter((x) => x.id !== a.id))
    } catch (e) { console.error(e) } finally { setDeleting(null) }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold text-white mb-1">{t('assets.title')}</h1>
      <p className="text-gray-400 text-sm mb-6">{t('assets.subtitle')}</p>

      {loading ? (
        <p className="text-gray-400">…</p>
      ) : assets.length === 0 ? (
        <p className="text-gray-400">{t('assets.empty')}</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {assets.map((a) => (
            <div key={a.id} className="relative aspect-square rounded-xl overflow-hidden border border-[#242424] bg-[#141414] group">
              {a.signedUrl && (
                <img src={a.signedUrl} alt={a.name ?? ''} className="w-full h-full object-cover" />
              )}
              {a.category && (
                <span className="absolute top-2 left-2 text-[10px] bg-black/60 text-white px-2 py-0.5 rounded">
                  {a.category}
                </span>
              )}
              <button
                onClick={() => handleDelete(a)}
                disabled={deleting === a.id}
                className="absolute top-2 right-2 p-2 rounded-lg bg-black/60 text-white opacity-0 group-hover:opacity-100 hover:bg-red-600 transition disabled:opacity-50"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
