"use client" // Required for useTranslation

import { VehiclesList } from "@/components/vehicles/VehiclesList"
import { useTranslation } from "react-i18next"

export default function VehiclesPage() {
    const { t } = useTranslation('common')

    return (
        <div className="h-full flex-1 flex-col space-y-8 p-8 md:flex bg-white dark:bg-zinc-950">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{t('vehicles.title')}</h2>
                    <p className="text-zinc-500 dark:text-zinc-400">
                        {t('vehicles.subtitle')}
                    </p>
                </div>
            </div>
            <VehiclesList />
        </div>
    )
}
