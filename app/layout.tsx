import { cookies } from 'next/headers'
import { GoogleAnalytics } from '@next/third-parties/google'
import { LanguageProvider } from '@/lib/i18n/language-provider'
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Liora Atelier",
  description: "AI-native creative systems for fashion and beauty brands.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies()
  const locale = (cookieStore.get('locale')?.value === 'tr' ? 'tr' : 'en') as 'tr' | 'en'
  const gaId = process.env.NEXT_PUBLIC_GA_ID

  return (
    <html
      lang={locale}
      data-theme="dark"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
        <LanguageProvider initialLocale={locale}>{children}</LanguageProvider>
      </body>
      {gaId ? <GoogleAnalytics gaId={gaId} /> : null}
    </html>
  );
}
