import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  // Create admin client inside function to avoid build-time errors
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  try {
    // 1. Validate webhook token
    const token = request.headers.get('x-kiwify-token')
      || request.headers.get('authorization')?.replace('Bearer ', '')

    if (token !== process.env.KIWIFY_WEBHOOK_SECRET) {
      console.error('[Kiwify Webhook] Invalid token')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await request.json()
    console.log('[Kiwify Webhook] Received:', JSON.stringify(payload, null, 2))

    // 2. Only process approved purchases
    const orderStatus = payload.order_status || payload.status
    if (orderStatus !== 'paid' && orderStatus !== 'approved') {
      console.log('[Kiwify Webhook] Skipped - status:', orderStatus)
      return NextResponse.json({ ok: true, skipped: true })
    }

    // Extract customer data
    const email = (payload.Customer?.email || payload.customer?.email)?.toLowerCase()
    const name = payload.Customer?.full_name || payload.customer?.full_name || email
    const orderId = payload.order_id || payload.id

    if (!email) {
      console.error('[Kiwify Webhook] Email not found in payload')
      return NextResponse.json({ error: 'Email not found' }, { status: 400 })
    }

    if (!orderId) {
      console.error('[Kiwify Webhook] Order ID not found in payload')
      return NextResponse.json({ error: 'Order ID not found' }, { status: 400 })
    }

    // 3. Idempotency check (prevent duplicate order processing)
    const { data: existing } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('kiwify_order_id', orderId)
      .single()

    if (existing) {
      console.log('[Kiwify Webhook] Order already processed:', orderId)
      return NextResponse.json({ ok: true, already_processed: true })
    }

    // 4. Check if user already exists in auth
    const { data: authData } = await supabaseAdmin.auth.admin.listUsers()
    const users = authData?.users || []
    const existingUser = users.find((u: { email?: string }) => u.email === email)

    if (existingUser) {
      // Update existing profile
      console.log('[Kiwify Webhook] Activating existing user:', email)
      await supabaseAdmin
        .from('profiles')
        .update({
          subscription_status: 'active',
          kiwify_order_id: orderId,
          license_activated_at: new Date().toISOString()
        })
        .eq('id', existingUser.id)
    } else {
      // Create new user
      console.log('[Kiwify Webhook] Creating new user:', email)
      const { data: newUser, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { name }
      })

      if (error) {
        console.error('[Kiwify Webhook] Error creating user:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      // Wait a bit for trigger to create profile
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Update profile with purchase data
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          subscription_status: 'active',
          kiwify_order_id: orderId,
          license_activated_at: new Date().toISOString()
        })
        .eq('id', newUser.user.id)

      if (updateError) {
        console.error('[Kiwify Webhook] Error updating profile:', updateError)
        // Continue anyway, user was created
      }

      // Send password reset email with retry
      let emailSent = false
      for (let i = 0; i < 3; i++) {
        const { error: linkError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'recovery',
          email
        })

        if (!linkError) {
          emailSent = true
          console.log('[Kiwify Webhook] Password reset email sent to:', email)
          break
        }

        console.error(`[Kiwify Webhook] Attempt ${i + 1}/3 - Error generating password reset link:`, linkError)
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      if (!emailSent) {
        console.error('[Kiwify Webhook] CRITICAL: Failed to send password email after 3 attempts')
        // TODO: Add fallback notification (e.g., admin alert)
      }
    }

    console.log('[Kiwify Webhook] Successfully processed order:', orderId, 'for:', email)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[Kiwify Webhook] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
