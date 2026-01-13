import { redirect } from "next/navigation"
import { getSupabaseUser } from "@/lib/supabase-server"
import { isAdminEmail } from "@/lib/admin-emails"
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

  // Fetch profile for onboarding check
  let profile = null
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('company_name, industry_segment')
      .eq('id', user.id)
      .single()

    if (!error && data) {
      profile = data
    }
  } catch (error) {
    console.error('Erro ao buscar profile:', error)
  }

  // Verificar se onboarding foi completado (apenas company_name e industry_segment são obrigatórios)
  const hasCompletedOnboarding = profile?.company_name && profile?.industry_segment
  if (!hasCompletedOnboarding) {
    redirect("/onboarding")
  }

  // ============================================================================
  // FREE ACCESS FOR ALL USERS
  // ============================================================================
  // Platform is now 100% free - no subscription or trial checks needed
  // All authenticated users with completed onboarding have full access

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

  // If user is FIELD role, redirect to mobile app
  if (operiumProfile && operiumProfile.role === 'FIELD') {
    redirect('/app')
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
