import { redirect } from "next/navigation"
import { createServerComponentClient } from "@/lib/supabase-server"
import dynamic from "next/dynamic"

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

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerComponentClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Verificar status da assinatura
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status, stripe_customer_id')
    .eq('id', user.id)
    .single()

  // Permitir acesso se:
  // 1. Tem assinatura ativa ou em trial
  // 2. Ou tem stripe_customer_id (já passou pelo checkout)
  const activeStatuses = ['active', 'trialing']
  const hasActiveSubscription = profile?.subscription_status && activeStatuses.includes(profile.subscription_status)
  const hasStripeCustomer = !!profile?.stripe_customer_id
  
  if (!hasActiveSubscription && !hasStripeCustomer) {
    redirect("/subscribe")
  }

  return (
    <div className="min-h-screen bg-white">
      <OnboardingWrapper>
      <DashboardWrapper>
        {children}
      </DashboardWrapper>
      </OnboardingWrapper>
    </div>
  )
}

