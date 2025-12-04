"use client"

import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Globe } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function LanguageSwitcher() {
    const { i18n } = useTranslation()

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
                    size="icon"
                    className="h-9 w-9 rounded-full"
                    title={currentLanguage === "en" ? "Language" : "Idioma"}
                >
                    <Globe className="h-[1.2rem] w-[1.2rem]" />
                    <span className="sr-only">Toggle language</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem
                    onClick={() => changeLanguage("en")}
                    className={currentLanguage === "en" ? "bg-accent" : ""}
                >
                    🇺🇸 English
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => changeLanguage("pt")}
                    className={currentLanguage === "pt" ? "bg-accent" : ""}
                >
                    🇧🇷 Português
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
