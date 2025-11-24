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
      <DashboardWrapper>
        {children}
      </DashboardWrapper>
    </div>
  )
}

