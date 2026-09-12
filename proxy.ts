import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    // woff2/woff/ttf/otf listede yoktu: /fonts/*.woff2 istekleri auth
    // kontrolüne giriyor ve oturumu olmayan ziyaretçide /login'e
    // yönleniyordu. Sonuç: login, legal ve fiyatlandırma sayfalarında
    // Neue Haas hiç yüklenmiyordu.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff|woff2|ttf|otf)$).*)',
  ],
}
