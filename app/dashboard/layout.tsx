import { redirect } from "next/navigation"
import { getSupabaseUser } from "@/lib/supabase-server"
import dynamic from "next/dynamic"
import { LegalAgreementModal } from "@/components/legal/LegalAgreementModal"

const DashboardWrapper = dynamic(() => import("@/components/layout/DashboardWrapper"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-white">
      <div className="h-screen w-[280px] fixed left-0 top-0 bg-white border-r border-zinc-200 animate-pulse" />
      <main className="md:ml-[280px] bg-white">
        <div className="p-4 sm:p-6 lg:p-6 xl:p-8 2xl:p-10 max-w-[1920px] mx-auto">
          <div className="h-screen animate-pulse bg-zinc-50" />
        </div>
      </main>
    </div>
  ),
})

const OnboardingWrapper = dynamic(() => import("@/components/onboarding/OnboardingWrapper"), {
  ssr: false,
})

import { headers } from "next/headers"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { supabase, user } = await getSupabaseUser()
  const headersList = headers()
  const pathname = headersList.get('x-pathname') || headersList.get('x-invoke-path') || ''

  if (!user) {
    redirect("/login")
  }

  // Verificar status da assinatura e trial
  let profile = null
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('subscription_status, stripe_customer_id, trial_start_date, company_name, industry_segment, company_size, password_set')
      .eq('id', user.id)
      .single()

    if (!error && data) {
      profile = data
    }
  } catch (error) {
    // Se houver erro ao buscar profile, continuar sem bloquear
    console.error('Erro ao buscar profile:', error)
  }

  // Verificar se o usuário precisa definir senha (fluxo de invite)
  // Se password_set for null, assumimos que é false por segurança (ou true se for migração correta, mas safe fail)
  // Mas na migração setamos true para todos existentes. Novos invites terão false.
  if (profile?.password_set === false) {
    redirect("/criar-senha")
  }

  // Verificar se onboarding foi completado (apenas company_name e industry_segment são obrigatórios)
  const hasCompletedOnboarding = profile?.company_name && profile?.industry_segment
  if (!hasCompletedOnboarding) {
    redirect("/onboarding")
  }

  // Permitir acesso se:
  // 1. Tem assinatura ativa ou em trial
  // 2. Ou tem stripe_customer_id (já passou pelo checkout)
  // 3. Ou está no período de trial grátis (7 dias)
  const activeStatuses = ['active', 'trialing']
  const hasActiveSubscription = profile?.subscription_status && activeStatuses.includes(profile.subscription_status)
  const hasStripeCustomer = !!profile?.stripe_customer_id

  // Verificar se está no período de trial
  let isInTrial = false
  if (profile?.trial_start_date) {
    const startDate = new Date(profile.trial_start_date)
    const now = new Date()
    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + 7) // 7 dias de trial
    isInTrial = now < endDate
  } else if (!hasActiveSubscription && !hasStripeCustomer) {
    // SELF-HEALING: Se não tem data de trial e não tem assinatura, iniciar agora
    // Isso garante que usuários antigos ou com erro na criação tenham o trial ativado ao acessar o dashboard
    try {
      const now = new Date().toISOString()
      await supabase.from('profiles').update({ trial_start_date: now }).eq('id', user.id)
      isInTrial = true
    } catch (error) {
      // Se falhar ao atualizar, permitir acesso mesmo assim
      console.error('Erro ao atualizar trial_start_date:', error)
      isInTrial = true
    }
  }

  // Só redirecionar para subscribe se não tiver assinatura, não tiver passado pelo checkout E não estiver no trial
  if (!hasActiveSubscription && !hasStripeCustomer && !isInTrial) {
    redirect("/subscribe")
  }

  // ============================================================================
  // ROLE-BASED ACCESS CONTROL: Restrict operational users to /dashboard/operium
  // ============================================================================
  // Fetch operium profile to check role
  let operiumProfile = null
  try {
    const { data: opData } = await supabase
      .from('operium_profiles')
      .select('role, active')
      .eq('user_id', user.id)
      .eq('active', true)
      .single()

    if (opData) {
      operiumProfile = opData
    }
  } catch {
    // If no operium profile, user is org owner (ADMIN by default)
  }

  // If user has operium profile and is NOT ADMIN, restrict access
  if (operiumProfile && operiumProfile.role !== 'ADMIN') {
    // Routes allowed for FIELD/WAREHOUSE users
    const allowedPaths = ['/dashboard/operium', '/dashboard/conta']

    // Check if current pathname is allowed
    const isAllowedRoute = allowedPaths.some(path =>
      pathname === path || pathname.startsWith(path + '/')
    )

    // If trying to access a restricted route, redirect to operium
    if (!isAllowedRoute && pathname.startsWith('/dashboard')) {
      redirect('/dashboard/operium')
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <LegalAgreementModal />
      <OnboardingWrapper>
        <DashboardWrapper>
          {children}
        </DashboardWrapper>
      </OnboardingWrapper>
    </div>
  )
}
