import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardClientLayout } from '@/components/dashboard-layout'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Buscar perfil no banco
  const { data: profile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', user.id)
    .single()

  const userName = profile?.name || user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário'
  const userEmail = user.email || ''

  return (
    <DashboardClientLayout userEmail={userEmail} userName={userName}>
      {children}
    </DashboardClientLayout>
  )
}
