import { redirect } from "next/navigation"
import { getSupabaseUser } from "@/lib/supabase-server"
import LandingPage from "@/components/landing/LandingPage"

export default async function MarketingPage() {
  const { supabase, user } = await getSupabaseUser()

  // Se usuário está logado, redirecionar sempre para dashboard
  if (user) {
    redirect("/dashboard")
  }

  // Usuário não logado - mostrar landing normal
  return <LandingPage isLoggedIn={false} hasSubscription={false} />
}
