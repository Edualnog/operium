import { redirect } from "next/navigation"
import { createServerComponentClient } from "@/lib/supabase-server"

export default async function HomePage() {
  const supabase = await createServerComponentClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session) {
    redirect("/dashboard")
  } else {
    redirect("/login")
  }
}

