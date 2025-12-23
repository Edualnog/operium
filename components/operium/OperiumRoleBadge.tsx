"use client"

import { cn } from "@/lib/utils"
import { OperiumRole } from "@/lib/types/operium"
import { Shield, Truck, Package } from "lucide-react"

interface OperiumRoleBadgeProps {
    role: OperiumRole
    size?: "sm" | "md" | "lg"
    showIcon?: boolean
    className?: string
}

const ROLE_CONFIG = {
    ADMIN: {
        label: "Administrador",
        labelEn: "Admin",
        icon: Shield,
        className: "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900",
    },
    FIELD: {
        label: "Campo",
        labelEn: "Field",
        icon: Truck,
        className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    },
    WAREHOUSE: {
        label: "Almoxarifado",
        labelEn: "Warehouse",
        icon: Package,
        className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    },
}

const SIZE_CONFIG = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-xs",
    lg: "px-3 py-1.5 text-sm",
}

export function OperiumRoleBadge({
    role,
    size = "md",
    showIcon = true,
    className
}: OperiumRoleBadgeProps) {
    const config = ROLE_CONFIG[role]
    const Icon = config.icon

    return (
        <span
            className={cn(
                "inline-flex items-center gap-1.5 rounded-md font-medium",
                SIZE_CONFIG[size],
                config.className,
                className
            )}
        >
            {showIcon && <Icon className={cn(
                size === "sm" ? "h-3 w-3" : size === "lg" ? "h-4 w-4" : "h-3.5 w-3.5"
            )} />}
            {config.label}
        </span>
    )
}

export function getRoleLabel(role: OperiumRole, lang: 'pt' | 'en' = 'pt'): string {
    return lang === 'pt' ? ROLE_CONFIG[role].label : ROLE_CONFIG[role].labelEn
}
