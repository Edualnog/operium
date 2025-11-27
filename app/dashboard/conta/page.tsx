import { createServerComponentClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import ProfileForm from "@/components/profile/ProfileForm"

export const revalidate = 0

async function getProfile() {
  const supabase = await createServerComponentClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, company_name, cnpj, company_email, phone")
    .eq("id", user.id)
    .single()

  if (error) {
    console.error(error)
  }

  return { user, profile: data }
}

export default async function ContaPage() {
  const { user, profile } = await getProfile()

  return (
    <div className="max-w-3xl space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-zinc-900">
          Minha Conta
        </h1>
        <p className="text-sm sm:text-base text-zinc-600 mt-1.5">
          Gerencie seus dados pessoais e os dados da sua empresa
        </p>
      </div>
      <ProfileForm userId={user.id} userEmail={user.email ?? null} initialProfile={profile} />
    </div>
  )
}
