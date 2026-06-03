import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminNav } from './admin-nav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (data?.role !== 'admin') redirect('/')

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="text-lg font-medium text-neutral-100">Admin paneli</h1>
      <AdminNav />
      <div className="mt-6">{children}</div>
    </div>
  )
}
