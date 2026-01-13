"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

/**
 * Subscribe page redirect
 * 
 * Platform is now 100% free - this page redirects to dashboard
 */
export default function SubscribePage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to dashboard immediately
    router.push("/dashboard")
  }, [router])

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        <p className="text-slate-600">Redirecionando...</p>
      </div>
    </div>
  )
}
