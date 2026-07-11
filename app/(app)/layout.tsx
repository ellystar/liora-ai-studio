import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/navbar'
import { SiteFooter } from '@/components/site-footer'

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
    <div className="flex min-h-screen flex-col bg-[#0a0a0a] text-white">
      <Navbar credits={credits} email={user?.email ?? ''} isAdmin={isAdmin} />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  )
}
