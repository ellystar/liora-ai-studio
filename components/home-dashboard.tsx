'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { useI18n } from '@/lib/i18n/language-provider'
import { createClient } from '@/lib/supabase/client'
import { listRecentGenerationImages, type RecentGenerationImage } from '@/lib/generations/recent-images'
import { UserModelUpload } from '@/components/user-model-upload'
import type { NewUserModel } from '@/lib/models/user-models'

type OwnModel = { id: string; name: string; image_url: string | null }

type StudioCardProps = {
  href: string
  title: string
  desc: string
  bgImage?: string | null
  large?: boolean
}

function StudioCard({ href, title, desc, bgImage, large }: StudioCardProps) {
  return (
    <Link
      href={href}
      className={`atelier-studio-card group block w-full ${large ? 'aspect-[16/10]' : 'aspect-[8/10]'}`}
    >
      {bgImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={bgImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-[#14110c]" />
      )}
      <div className="atelier-studio-overlay absolute inset-0" />
      <div className="absolute inset-x-0 bottom-0 z-10 p-4 md:p-5">
        <p className={`atelier-display text-[#EDE8DF] ${large ? 'text-[20px]' : 'text-[17px] leading-snug'}`}>
          {title}
        </p>
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-[#A39D92] md:text-[12px]">{desc}</p>
      </div>
    </Link>
  )
}

function greetingKey(hour: number): 'home.greeting.morning' | 'home.greeting.afternoon' | 'home.greeting.evening' {
  if (hour >= 6 && hour < 12) return 'home.greeting.morning'
  if (hour >= 12 && hour < 18) return 'home.greeting.afternoon'
  return 'home.greeting.evening'
}

export function HomeDashboard() {
  const { t, locale } = useI18n()
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [ownModels, setOwnModels] = useState<OwnModel[]>([])
  const [recentShots, setRecentShots] = useState<RecentGenerationImage[]>([])
  const [uploadOpen, setUploadOpen] = useState(false)
  const [now] = useState(() => new Date())

  const dateLabel = useMemo(() => {
    const formatted = new Intl.DateTimeFormat(locale === 'tr' ? 'tr-TR' : 'en-US', {
      day: 'numeric',
      month: 'long',
    }).format(now)
    return formatted.toLocaleUpperCase(locale === 'tr' ? 'tr-TR' : 'en-US')
  }, [locale, now])

  const greeting = t(greetingKey(now.getHours()))

  useEffect(() => {
    const supabase = createClient()

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const profileRes = await supabase.from('profiles').select('name').eq('id', user.id).single()
      const profileName =
        !profileRes.error && profileRes.data
          ? ((profileRes.data as { name?: string | null }).name?.trim() || null)
          : null
      const metaName = (user.user_metadata?.name as string | undefined)?.trim()
      const emailName = user.email?.split('@')[0] ?? ''
      setDisplayName(profileName || metaName || emailName || null)

      const { data: models } = await supabase
        .from('models')
        .select('id,name,image_url')
        .eq('owner_id', user.id)
        .eq('scope', 'own')
        .order('created_at', { ascending: false })
        .limit(8)

      setOwnModels((models as OwnModel[]) ?? [])
      setRecentShots(await listRecentGenerationImages(6))
    }

    load().catch(console.error)
  }, [])

  function onModelAdded(model: NewUserModel) {
    setOwnModels((prev) => [{ id: model.id, name: model.name, image_url: model.image_url }, ...prev])
  }

  const workshopTools = [
    { href: '/pose-generator', title: t('tool.pose.title'), desc: t('tool.pose.desc') },
    { href: '/edit-photo', title: t('tool.edit.title'), desc: t('tool.edit.desc') },
    { href: '/flat-to-ghost', title: t('tool.flat.title'), desc: t('tool.flat.desc') },
  ]

  return (
    <>
      <main className="atelier mx-auto w-full max-w-6xl px-5 py-8 md:px-8 md:py-10">
        <section className="mb-10 md:mb-10">
          <p className="atelier-section-label">
            {t('home.studio.label')} · {dateLabel}
          </p>
          <h1 className="atelier-display mt-4 text-[30px] leading-[1.12] text-[#EDE8DF] md:text-[34px]">
            {displayName ? `${greeting} ${displayName}.` : `${greeting}.`}
            <span className="mt-1 block text-[#8F8A80]">{t('home.greeting.question')}</span>
          </h1>
        </section>

        <section className="mb-10">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <p className="atelier-section-label">{t('home.section.cast')}</p>
            {ownModels.length > 0 ? (
              <div className="flex items-center">
                {ownModels.map((model, i) => (
                  <Link
                    key={model.id}
                    href="/ecom-studio"
                    className="relative block"
                    style={{ marginLeft: i === 0 ? 0 : -10, zIndex: ownModels.length - i }}
                    title={model.name}
                  >
                    {model.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={model.image_url} alt={model.name} className="atelier-cast-avatar" />
                    ) : (
                      <span className="atelier-cast-avatar flex items-center justify-center bg-[#1a1713] text-[10px] text-[#8F8A80]">
                        {model.name.charAt(0)}
                      </span>
                    )}
                  </Link>
                ))}
                <button
                  type="button"
                  onClick={() => setUploadOpen(true)}
                  className="atelier-cast-add relative z-0 ml-1 flex items-center justify-center"
                  style={{ marginLeft: ownModels.length > 0 ? 4 : 0 }}
                  aria-label={t('home.cast.add')}
                >
                  <Plus className="h-4 w-4" strokeWidth={1.5} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setUploadOpen(true)}
                className="text-[12.5px] text-[#A39D92] transition-colors hover:text-[#EDE8DF]"
              >
                {t('home.cast.createCta')}
              </button>
            )}
          </div>
        </section>

        <section className="mb-10">
          <p className="atelier-section-label mb-4">{t('home.section.studios')}</p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            <div className="col-span-2">
              <StudioCard
                href="/ecom-studio"
                large
                title={t('tool.ecom.title')}
                desc={t('tool.ecom.desc')}
                bgImage="/ecom-studio.jpg"
              />
            </div>
            <StudioCard
              href="/shoe-studio"
              title={t('tool.shoe.title')}
              desc={t('shoe.cardDesc')}
              bgImage="/shoe-studio.jpg"
            />
            <StudioCard
              href="/batch-studio"
              title={t('batch.title')}
              desc={t('batch.cardDesc')}
              bgImage="/batch-studio.jpg"
            />
            <StudioCard
              href="/style-transfer"
              title={t('tool.style.title')}
              desc={t('style.cardDesc')}
              bgImage={null}
            />
            <StudioCard
              href="/video-studio"
              title={t('tool.video.title')}
              desc={t('video.cardDesc')}
              bgImage={null}
            />
            <div className="col-span-2">
              <div className="flex h-full min-h-[200px] flex-col rounded-[4px] border-[0.5px] border-[#26231E] bg-transparent p-4 md:aspect-[16/10] md:min-h-0 md:p-5">
                <p className="atelier-section-label mb-4">{t('home.workshop.title')}</p>
                <div className="flex flex-1 flex-col justify-center">
                  {workshopTools.map((tool) => (
                    <Link key={tool.href} href={tool.href} className="atelier-workshop-row flex items-baseline justify-between gap-4 py-3.5">
                      <span className="atelier-workshop-name text-[13.5px] text-[#A39D92] transition-colors duration-200">{tool.title}</span>
                      <span className="max-w-[52%] text-right text-[11px] leading-relaxed text-[#8F8A80]">{tool.desc}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {recentShots.length > 0 && (
          <section>
            <div className="mb-4 flex items-center gap-4">
              <p className="atelier-section-label shrink-0">{t('home.section.recent')}</p>
              <div className="h-[0.5px] flex-1 bg-[#26231E]" />
              <Link href="#" className="shrink-0 text-[12px] text-[#8F8A80] transition-colors hover:text-[#EDE8DF]">
                {t('home.recent.viewAll')}
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-2 md:grid-cols-6 md:gap-3">
              {recentShots.map((shot) => (
                <a
                  key={shot.id}
                  href={shot.signedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="atelier-recent-thumb block"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={shot.signedUrl} alt="" />
                </a>
              ))}
            </div>
          </section>
        )}
      </main>

      <UserModelUpload open={uploadOpen} onClose={() => setUploadOpen(false)} onAdded={onModelAdded} />
    </>
  )
}
