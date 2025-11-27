"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@/lib/supabase-client"

export default function CheckoutHandler({ userId }: { userId: string }) {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [checked, setChecked] = React.useState(false)
  
  React.useEffect(() => {
    const handleCheckout = async () => {
      const params = new URLSearchParams(window.location.search)
      const sessionId = params.get('session_id')
      
      if (sessionId && !checked) {
        setChecked(true)
        
        // Aguardar webhook processar
        await new Promise(resolve => setTimeout(resolve, 3000))
        
        // Verificar status da assinatura
        const { data: profile } = await supabase
          .from('profiles')
          .select('subscription_status')
          .eq('id', userId)
          .single()
        
        // Limpar URL se assinatura está ativa
        if (profile?.subscription_status === 'active' || profile?.subscription_status === 'trialing') {
          router.replace('/dashboard')
        }
      }
    }
    
    handleCheckout()
  }, [checked, router, supabase, userId])
  
  return null
}

