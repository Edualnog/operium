import { redirect } from "next/navigation"
import { createServerComponentClient } from "@/lib/supabase-server"
import dynamic from "next/dynamic"

const Sidebar = dynamic(() => import("@/components/layout/Sidebar"), {
  ssr: false,
  loading: () => (
    <div className="h-screen w-[280px] fixed left-0 top-0 bg-card border-r border-border animate-pulse" />
  ),
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

  return (
    <div className="min-h-screen bg-white">
      <Sidebar />
      <main className="md:ml-[280px] transition-all duration-300 bg-white">
        <div className="p-8">{children}</div>
      </main>
    </div>
  )
}

