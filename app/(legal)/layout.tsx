import './legal.css'

const LEGAL_FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;1,6..72,300&family=Spline+Sans+Mono:wght@400;500&family=Hanken+Grotesk:wght@400;500;600&display=swap'

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="stylesheet" href={LEGAL_FONTS_URL} />
      {children}
    </>
  )
}
