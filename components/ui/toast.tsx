"use client"

import { motion, AnimatePresence } from "framer-motion"
import { X, CheckCircle, AlertCircle, Info } from "lucide-react"
import { useEffect } from "react"

export type ToastType = "success" | "error" | "info"

export interface ToastProps {
    id: string
    message: string
    type: ToastType
    onDismiss: (id: string) => void
}

const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-500" />,
    error: <AlertCircle className="w-5 h-5 text-red-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />,
}

const bgColors = {
    success: "bg-white dark:bg-zinc-900 border-green-200 dark:border-green-900",
    error: "bg-white dark:bg-zinc-900 border-red-200 dark:border-red-900",
    info: "bg-white dark:bg-zinc-900 border-blue-200 dark:border-blue-900",
}

export function Toast({ id, message, type, onDismiss }: ToastProps) {
    useEffect(() => {
        const timer = setTimeout(() => {
            onDismiss(id)
        }, 5000)

        return () => clearTimeout(timer)
    }, [id, onDismiss])

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 50, scale: 0.3 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
            className={`flex items-center gap-3 p-4 rounded-lg shadow-lg border ${bgColors[type]} min-w-[300px] max-w-md pointer-events-auto`}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="flex-shrink-0">{icons[type]}</div>
            <p className="text-sm font-medium text-slate-900 dark:text-zinc-100 flex-1">
                {message}
            </p>
            <button
                onClick={() => onDismiss(id)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 transition-colors"
            >
                <X className="w-4 h-4" />
            </button>
        </motion.div>
    )
}
