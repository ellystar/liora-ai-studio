'use client'

import { useState } from 'react'
import Link from 'next/link'

type StudioCardProps = {
  href: string
  title: string
  desc: string
  coverImage?: string
  large?: boolean
}

export function StudioCard({ href, title, desc, coverImage, large }: StudioCardProps) {
  const [imageReady, setImageReady] = useState(false)
  const [imageFailed, setImageFailed] = useState(!coverImage)
  const showCover = Boolean(coverImage) && imageReady && !imageFailed

  return (
    <Link
      href={href}
      className={`atelier-studio-card group block w-full ${large ? 'aspect-[16/10]' : 'aspect-[8/10]'}`}
    >
      <div className="absolute inset-0 bg-[#1C1914]" aria-hidden />
      {coverImage && !imageFailed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={coverImage}
          alt=""
          className={`absolute inset-0 z-[1] h-full w-full object-cover ${imageReady ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setImageReady(true)}
          onError={() => setImageFailed(true)}
        />
      )}
      {showCover && <div className="atelier-studio-overlay absolute inset-0 z-[2]" aria-hidden />}
      <div className="atelier-studio-card-caption absolute inset-x-0 bottom-0 z-10 p-4 md:p-5">
        <p className={`atelier-display text-[#EDE8DF] ${large ? 'text-[20px]' : 'text-[17px] leading-snug'}`}>
          {title}
        </p>
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-[#A39D92] md:text-[12px]">{desc}</p>
      </div>
    </Link>
  )
}
