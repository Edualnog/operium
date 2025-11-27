import { createServerComponentClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import ContaClient from "@/components/conta/ContaClient"

export const revalidate = 0

async function getAccountData() {
  const supabase = await createServerComponentClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  if (error) {
    console.error(error)
  }

  return { user, profile }
}

export default async function ContaPage() {
  const { user, profile } = await getAccountData()

  return (
    <ContaClient 
      user={{
        id: user.id,
        email: user.email || "",
        created_at: user.created_at || "",
      }}
      profile={profile}
    />
  )
}
