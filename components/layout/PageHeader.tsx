"use client"

import { useTranslation } from "react-i18next"

interface PageHeaderProps {
    titleKey: string
    subtitleKey: string
    fallbackTitle?: string
    fallbackSubtitle?: string
}

export function PageHeader({ titleKey, subtitleKey, fallbackTitle, fallbackSubtitle }: PageHeaderProps) {
    const { t } = useTranslation()

    return (
        <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                {t(titleKey, fallbackTitle || titleKey)}
            </h1>
            <p className="text-sm sm:text-base text-zinc-600 mt-1.5 dark:text-zinc-400">
                {t(subtitleKey, fallbackSubtitle || subtitleKey)}
            </p>
        </div>
    )
}
