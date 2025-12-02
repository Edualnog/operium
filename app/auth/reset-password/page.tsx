export const dynamic = "force-dynamic"

import ResetPasswordForm from "@/components/auth/ResetPasswordForm"
import { Suspense } from "react"

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Suspense fallback={<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  )
}

