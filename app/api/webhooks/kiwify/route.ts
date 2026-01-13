import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server-admin'

/**
 * Kiwify Webhook Handler
 * 
 * WEBHOOK DISABLED - PLATFORM IS NOW 100% FREE
 * 
 * This webhook is no longer active as the platform has moved to a completely
 * free model. Returns 200 OK to prevent Kiwify from retrying.
 * 
 * If you need to re-enable payments in the future, restore the original
 * webhook logic from git history.
 */
export async function POST(request: Request) {
  try {
    console.log('[Kiwify Webhook] Received request (webhook disabled - platform is free)')

    return NextResponse.json({
      success: true,
      message: 'Webhook disabled - platform is now 100% free'
    }, { status: 200 })

  } catch (error) {
    console.error('[Kiwify Webhook] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
