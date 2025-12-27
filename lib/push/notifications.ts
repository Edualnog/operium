/**
 * Web Push Notification utilities
 * Uses web-push library for sending notifications
 */

import webpush from 'web-push'

// VAPID keys for Web Push
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY!
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@operium.com.br'

// Configure web-push with VAPID details
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
}

export interface PushSubscription {
    endpoint: string
    keys: {
        p256dh: string
        auth: string
    }
}

export interface NotificationPayload {
    title: string
    body: string
    icon?: string
    badge?: string
    tag?: string
    url?: string
    data?: Record<string, any>
}

/**
 * Send a push notification to a subscription
 */
export async function sendPushNotification(
    subscription: PushSubscription,
    payload: NotificationPayload
): Promise<{ success: boolean; error?: string }> {
    try {
        const pushPayload = JSON.stringify({
            title: payload.title,
            body: payload.body,
            icon: payload.icon || '/icons/icon-192.png',
            badge: payload.badge || '/icons/icon-72.png',
            tag: payload.tag || 'operium-notification',
            url: payload.url || '/app',
            data: payload.data,
        })

        await webpush.sendNotification(subscription, pushPayload)

        return { success: true }
    } catch (error: any) {
        console.error('[Push] Error sending notification:', error)

        // If subscription is invalid, return specific error
        if (error.statusCode === 410 || error.statusCode === 404) {
            return { success: false, error: 'subscription_expired' }
        }

        return { success: false, error: error.message }
    }
}

/**
 * Get the public VAPID key for client subscription
 */
export function getPublicVapidKey(): string {
    return VAPID_PUBLIC_KEY
}
