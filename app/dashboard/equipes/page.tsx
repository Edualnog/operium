'use client'

import { Suspense, useEffect, useState } from "react"
import { getTeams } from "./actions"
import TeamsList from "@/components/equipes/TeamsList"
import { useTranslation } from "react-i18next"

export default function EquipesPage() {
    const { t } = useTranslation('common')
    const [teams, setTeams] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        getTeams().then(data => {
            setTeams(data)
            setLoading(false)
        })
    }, [])

    if (loading) return <div>{t('teams.loading')}</div>

    return (
        <div className="space-y-6 sm:space-y-8">
            <div className="flex-none sm:p-0">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold tracking-tight text-[#37352f] dark:text-zinc-50">
                            {t('teams.title')}
                        </h1>
                        <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400">
                            {t('teams.description')}
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-hidden">
                <Suspense fallback={<div>{t('teams.loading')}</div>}>
                    <TeamsList initialTeams={teams} />
                </Suspense>
            </div>
        </div>
    )
}
