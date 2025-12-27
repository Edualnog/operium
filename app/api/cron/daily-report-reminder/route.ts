import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendPushNotification } from '@/lib/push/notifications'

/**
 * GET /api/cron/daily-report-reminder
 * Cron job that runs at 18:00 (UTC-3 = 21:00 UTC) to remind users to fill daily report
 */
export async function GET(request: Request) {
    try {
        // Verify cron secret (Vercel adds this header)
        const authHeader = request.headers.get('authorization')
        const cronSecret = process.env.CRON_SECRET

        // In production, verify the request is from Vercel Cron
        if (process.env.NODE_ENV === 'production' && cronSecret) {
            if (authHeader !== `Bearer ${cronSecret}`) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
            }
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

        const supabase = createClient(supabaseUrl, serviceRoleKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        })

        // Get today's date in Brazil timezone (UTC-3)
        const now = new Date()
        const brazilOffset = -3 * 60 // UTC-3 in minutes
        const brazilTime = new Date(now.getTime() + (brazilOffset + now.getTimezoneOffset()) * 60000)
        const today = brazilTime.toISOString().split('T')[0]

        // Find users who have push subscriptions but haven't submitted a report today
        const { data: subscriptions, error: subError } = await supabase
            .from('push_subscriptions')
            .select(`
        id,
        user_id,
        endpoint,
        p256dh,
        auth
      `)

        if (subError) {
            console.error('[Cron] Error fetching subscriptions:', subError)
            return NextResponse.json({ error: 'Database error' }, { status: 500 })
        }

        if (!subscriptions || subscriptions.length === 0) {
            return NextResponse.json({ message: 'No subscriptions to notify', sent: 0 })
        }

        // Get users who already submitted a report today
        const { data: reportsToday } = await supabase
            .from('field_reports')
            .select('user_id')
            .gte('created_at', `${today}T00:00:00`)
            .lt('created_at', `${today}T23:59:59`)

        const usersWithReportToday = new Set(reportsToday?.map(r => r.user_id) || [])

        // Send notifications to users without reports
        let sentCount = 0
        let failedCount = 0
        const expiredSubscriptions: string[] = []

        for (const sub of subscriptions) {
            // Skip if user already submitted report today
            if (usersWithReportToday.has(sub.user_id)) {
                continue
            }

            const result = await sendPushNotification(
                {
                    endpoint: sub.endpoint,
                    keys: {
                        p256dh: sub.p256dh,
                        auth: sub.auth
                    }
                },
                {
                    title: '📋 Hora do Relatório Diário!',
                    body: 'Não esqueça de preencher seu relatório de hoje antes de sair.',
                    tag: 'daily-report-reminder',
                    url: '/app?action=report',
                    data: {
                        type: 'daily_report_reminder',
                        date: today
                    }
                }
            )

            if (result.success) {
                sentCount++
            } else {
                failedCount++

                // Mark expired subscriptions for cleanup
                if (result.error === 'subscription_expired') {
                    expiredSubscriptions.push(sub.id)
                }
            }
        }

        // Clean up expired subscriptions
        if (expiredSubscriptions.length > 0) {
            await supabase
                .from('push_subscriptions')
                .delete()
                .in('id', expiredSubscriptions)

            console.log(`[Cron] Cleaned up ${expiredSubscriptions.length} expired subscriptions`)
        }

        console.log(`[Cron] Daily report reminder: sent=${sentCount}, failed=${failedCount}`)

        return NextResponse.json({
            message: 'Daily report reminder completed',
            sent: sentCount,
            failed: failedCount,
            cleaned: expiredSubscriptions.length
        })
    } catch (error) {
        console.error('[Cron] Daily report reminder error:', error)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}
