import './dashboard.css'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/navbar'

const ATELIER_FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;1,6..72,300&display=swap'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let credits = 0
  let isAdmin = false
  if (user) {
    const { data } = await supabase.from('profiles').select('credits, role').eq('id', user.id).single()
    credits = data?.credits ?? 0
    isAdmin = data?.role === 'admin'
  }

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="stylesheet" href={ATELIER_FONTS_URL} />
      <div className="min-h-screen bg-[#100E0B] text-[#EDE8DF]">
        <Navbar credits={credits} email={user?.email ?? ''} isAdmin={isAdmin} />
        {children}
      </div>
    </>
  )
}
