"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Bell, BellOff, X } from "lucide-react"
import { Card } from "@/components/ui/card"

/**
 * Component that prompts users to enable push notifications
 * Shows only on first visit or after user closes the prompt
 */
export function PushNotificationPrompt() {
    const [showPrompt, setShowPrompt] = useState(false)
    const [permissionState, setPermissionState] = useState<NotificationPermission | null>(null)
    const [isSubscribing, setIsSubscribing] = useState(false)

    useEffect(() => {
        // Check if push notifications are supported
        if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
            return
        }

        // Check current permission state
        setPermissionState(Notification.permission)

        // Only show prompt if permission is "default" (not asked yet)
        if (Notification.permission === "default") {
            // Check if user has dismissed the prompt before
            const dismissed = localStorage.getItem("push-prompt-dismissed")
            if (!dismissed) {
                // Show after a short delay
                const timer = setTimeout(() => setShowPrompt(true), 3000)
                return () => clearTimeout(timer)
            }
        }
    }, [])

    const handleEnable = async () => {
        setIsSubscribing(true)

        try {
            // Request permission
            const permission = await Notification.requestPermission()
            setPermissionState(permission)

            if (permission !== "granted") {
                setShowPrompt(false)
                return
            }

            // Get VAPID public key
            const response = await fetch("/api/push/subscribe")
            const { publicKey } = await response.json()

            if (!publicKey) {
                console.error("VAPID public key not configured")
                setShowPrompt(false)
                return
            }

            // Get service worker registration
            const registration = await navigator.serviceWorker.ready

            // Subscribe to push
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource
            })

            // Save subscription to server
            await fetch("/api/push/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    subscription: subscription.toJSON(),
                    userAgent: navigator.userAgent
                })
            })

            console.log("Push notification subscription successful")
            setShowPrompt(false)
        } catch (error) {
            console.error("Error subscribing to push notifications:", error)
        } finally {
            setIsSubscribing(false)
        }
    }

    const handleDismiss = () => {
        localStorage.setItem("push-prompt-dismissed", "true")
        setShowPrompt(false)
    }

    // Don't render if not showing
    if (!showPrompt) return null

    return (
        <Card className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 p-4 shadow-lg border-blue-200 bg-white dark:bg-zinc-900 dark:border-blue-800">
            <button
                onClick={handleDismiss}
                className="absolute top-2 right-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            >
                <X className="h-4 w-4" />
            </button>

            <div className="flex gap-3">
                <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm text-zinc-900 dark:text-zinc-100">
                        Ativar Notificações
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        Receba lembretes para preencher o relatório diário e outras atualizações importantes.
                    </p>
                    <div className="flex gap-2 mt-3">
                        <Button
                            size="sm"
                            onClick={handleEnable}
                            disabled={isSubscribing}
                            className="text-xs h-7"
                        >
                            {isSubscribing ? "Ativando..." : "Ativar"}
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleDismiss}
                            className="text-xs h-7"
                        >
                            Agora não
                        </Button>
                    </div>
                </div>
            </div>
        </Card>
    )
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
}
