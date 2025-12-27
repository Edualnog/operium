import { NextRequest, NextResponse } from 'next/server'
import { sendPushNotification, type NotificationPayload } from '@/lib/push/notifications'

/**
 * POST /api/push/send
 * Send a push notification to a user
 * Requires service role or admin authentication
 */
export async function POST(request: NextRequest) {
    try {
        // Verify authorization (service role key or internal call)
        const authHeader = request.headers.get('authorization')
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        // Allow calls from cron jobs with service key
        const isAuthorized = authHeader === `Bearer ${serviceKey}`

        if (!isAuthorized) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { subscription, notification } = await request.json() as {
            subscription: {
                endpoint: string
                keys: {
                    p256dh: string
                    auth: string
                }
            }
            notification: NotificationPayload
        }

        if (!subscription || !notification) {
            return NextResponse.json({ error: 'Missing subscription or notification' }, { status: 400 })
        }

        const result = await sendPushNotification(subscription, notification)

        return NextResponse.json(result)
    } catch (error) {
        console.error('[Push Send] Error:', error)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}
