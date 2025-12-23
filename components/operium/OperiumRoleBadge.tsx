"use client"

import { cn } from "@/lib/utils"
import { OperiumRole } from "@/lib/types/operium"
import { Shield, Truck, Package, Monitor, Smartphone } from "lucide-react"

interface OperiumRoleBadgeProps {
    role: OperiumRole
    size?: "sm" | "md" | "lg"
    showIcon?: boolean
    showAccessTag?: boolean
    className?: string
}

const ROLE_CONFIG = {
    ADMIN: {
        label: "Administrador",
        labelEn: "Admin",
        icon: Shield,
        className: "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900",
        accessType: "Sistema" as const,
        accessIcon: Monitor,
    },
    FIELD: {
        label: "Campo",
        labelEn: "Field",
        icon: Truck,
        className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
        accessType: "Mobile" as const,
        accessIcon: Smartphone,
    },
    WAREHOUSE: {
        label: "Almoxarifado",
        labelEn: "Warehouse",
        icon: Package,
        className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
        accessType: "Sistema" as const,
        accessIcon: Monitor,
    },
}

// Configuração de tipo de acesso por papel
export const ACCESS_TYPE_CONFIG = {
    ADMIN: { type: "Sistema", description: "Acesso ao sistema central" },
    FIELD: { type: "Mobile", description: "Acesso via aplicativo de campo" },
    WAREHOUSE: { type: "Sistema", description: "Acesso ao sistema central" },
} as const

// Responsabilidades por papel (hardcoded para preparação futura)
export const ROLE_RESPONSIBILITIES = {
    ADMIN: "Aprova dados e gerencia acessos",
    FIELD: "Registra despesas e status de veículos",
    WAREHOUSE: "Controla entrada e saída de itens",
} as const

const SIZE_CONFIG = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-xs",
    lg: "px-3 py-1.5 text-sm",
}

export function OperiumRoleBadge({
    role,
    size = "md",
    showIcon = true,
    showAccessTag = false,
    className
}: OperiumRoleBadgeProps) {
    const config = ROLE_CONFIG[role]
    const Icon = config.icon

    return (
        <div className="inline-flex items-center gap-2">
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
            {showAccessTag && (
                <AccessTypeTag role={role} size={size} />
            )}
        </div>
    )
}

// Tag de tipo de acesso (Sistema ou Mobile)
export function AccessTypeTag({
    role,
    size = "sm"
}: {
    role: OperiumRole
    size?: "sm" | "md" | "lg"
}) {
    const config = ROLE_CONFIG[role]
    const AccessIcon = config.accessIcon
    const isSystem = config.accessType === "Sistema"

    return (
        <span
            className={cn(
                "inline-flex items-center gap-1 rounded font-medium",
                size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs",
                isSystem
                    ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                    : "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
            )}
        >
            <AccessIcon className={cn(
                size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"
            )} />
            {config.accessType}
        </span>
    )
}

export function getRoleLabel(role: OperiumRole, lang: 'pt' | 'en' = 'pt'): string {
    return lang === 'pt' ? ROLE_CONFIG[role].label : ROLE_CONFIG[role].labelEn
}
