import { createClient } from '@/lib/supabase/server'
import { HomeDashboard } from '@/components/home-dashboard'

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let credits = 0
  if (user) {
    const { data } = await supabase.from('profiles').select('credits').eq('id', user.id).single()
    credits = data?.credits ?? 0
  }

  return <HomeDashboard credits={credits} />
}
