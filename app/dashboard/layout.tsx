import { redirect } from "next/navigation"
import { createServerComponentClient } from "@/lib/supabase-server"
import dynamic from "next/dynamic"

const Sidebar = dynamic(() => import("@/components/layout/Sidebar"), {
  ssr: false,
})

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerComponentClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login")
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="md:ml-[280px] transition-all duration-300">
        <div className="p-8">{children}</div>
      </main>
    </div>
  )
}

