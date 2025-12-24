"use client"

import { useTranslation } from "react-i18next"
import { Globe, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useState, useEffect } from "react"

/**
 * FieldLanguageSwitcher - Elegant language selector for field worker mobile app
 * 
 * Features:
 * - Mobile-optimized design
 * - Portuguese / English toggle
 * - Persists selection to localStorage
 * - Dark mode support
 * - Visual feedback for active language
 */
export function FieldLanguageSwitcher() {
    const { i18n } = useTranslation()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return null
    }

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng)
        // Persist to localStorage
        if (typeof window !== "undefined") {
            localStorage.setItem("i18nextLng", lng)
        }
    }

    const currentLanguage = i18n.language?.startsWith("pt") ? "pt" : "en"

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 gap-1.5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    title={currentLanguage === "en" ? "Language" : "Idioma"}
                >
                    <Globe className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase">
                        {currentLanguage}
                    </span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                className="min-w-[160px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
            >
                <DropdownMenuItem
                    onClick={() => changeLanguage("pt")}
                    className="cursor-pointer flex items-center justify-between"
                >
                    <div className="flex items-center gap-2">
                        <span className="text-lg">🇧🇷</span>
                        <span>Português</span>
                    </div>
                    {currentLanguage === "pt" && (
                        <Check className="h-4 w-4 text-green-600 dark:text-green-500" />
                    )}
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => changeLanguage("en")}
                    className="cursor-pointer flex items-center justify-between"
                >
                    <div className="flex items-center gap-2">
                        <span className="text-lg">🇺🇸</span>
                        <span>English</span>
                    </div>
                    {currentLanguage === "en" && (
                        <Check className="h-4 w-4 text-green-600 dark:text-green-500" />
                    )}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
