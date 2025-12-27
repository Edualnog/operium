import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@/lib/supabase-server'

/**
 * POST /api/push/subscribe
 * Save a push subscription for the current user
 */
export async function POST(request: NextRequest) {
    try {
        const supabase = await createServerComponentClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { subscription, userAgent } = await request.json()

        if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
            return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
        }

        // Upsert subscription (update if exists, insert if not)
        const { error } = await supabase
            .from('push_subscriptions')
            .upsert({
                user_id: user.id,
                endpoint: subscription.endpoint,
                p256dh: subscription.keys.p256dh,
                auth: subscription.keys.auth,
                user_agent: userAgent || null,
                updated_at: new Date().toISOString(),
            }, {
                onConflict: 'user_id,endpoint'
            })

        if (error) {
            console.error('[Push Subscribe] Error:', error)
            return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[Push Subscribe] Error:', error)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}

/**
 * DELETE /api/push/subscribe
 * Remove a push subscription
 */
export async function DELETE(request: NextRequest) {
    try {
        const supabase = await createServerComponentClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { endpoint } = await request.json()

        if (!endpoint) {
            return NextResponse.json({ error: 'Endpoint required' }, { status: 400 })
        }

        const { error } = await supabase
            .from('push_subscriptions')
            .delete()
            .eq('user_id', user.id)
            .eq('endpoint', endpoint)

        if (error) {
            console.error('[Push Unsubscribe] Error:', error)
            return NextResponse.json({ error: 'Failed to remove subscription' }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[Push Unsubscribe] Error:', error)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}

/**
 * GET /api/push/subscribe
 * Get VAPID public key for client registration
 */
export async function GET() {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

    if (!publicKey) {
        return NextResponse.json({ error: 'VAPID key not configured' }, { status: 500 })
    }

    return NextResponse.json({ publicKey })
}
