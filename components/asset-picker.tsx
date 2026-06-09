'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { listAssets, type Asset } from '@/lib/assets/assets'
import { useI18n } from '@/lib/i18n/language-provider'

export function AssetPicker({
  open,
  onClose,
  onSelect,
}: {
  open: boolean
  onClose: () => void
  onSelect: (asset: Asset) => void
}) {
  const { t } = useI18n()
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    listAssets().then(setAssets).catch(console.error).finally(() => setLoading(false))
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-xl bg-[#141414] border border-[#242424] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-medium">{t('assets.pickerTitle')}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm py-10 text-center">…</p>
        ) : assets.length === 0 ? (
          <p className="text-gray-400 text-sm py-10 text-center">{t('assets.empty')}</p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-[60vh] overflow-y-auto">
            {assets.map((a) => (
              <button
                key={a.id}
                onClick={() => { onSelect(a); onClose() }}
                className="relative aspect-square rounded-lg overflow-hidden border border-[#242424] hover:border-white transition"
              >
                {a.signedUrl && (
                  <img src={a.signedUrl} alt={a.name ?? ''} className="w-full h-full object-cover" />
                )}
                {a.category && (
                  <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded">
                    {a.category}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
