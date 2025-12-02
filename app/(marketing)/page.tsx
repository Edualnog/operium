import { redirect } from "next/navigation"
import { getSupabaseUser } from "@/lib/supabase-server"
import LandingPage from "@/components/landing/LandingPage"

export default async function MarketingPage() {
  const { supabase, user } = await getSupabaseUser()

  // Se usuário está logado, verificar status da assinatura
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_status")
      .eq("id", user.id)
      .single()

    // Se tem assinatura ativa ou em trial, redirecionar para dashboard
    const activeStatuses = ["active", "trialing"]
    if (profile?.subscription_status && activeStatuses.includes(profile.subscription_status)) {
      redirect("/dashboard")
    }

    // Usuário logado mas sem assinatura - mostrar landing com estado de logged
    return <LandingPage isLoggedIn={true} hasSubscription={false} userEmail={user.email} />
  }

  // Usuário não logado - mostrar landing normal
  return <LandingPage isLoggedIn={false} hasSubscription={false} />
}
