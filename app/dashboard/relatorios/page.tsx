'use client'

import { Suspense, useEffect, useState } from "react"
import { getDailyReports, getAllTeamsForFilter } from "./actions"
import ReportsList from "@/components/relatorios/ReportsList"
import { useTranslation } from "react-i18next"

export default function ReportsPage() {
    const { t } = useTranslation('common')
    const [reports, setReports] = useState([])
    const [teams, setTeams] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        Promise.all([
            getDailyReports(),
            getAllTeamsForFilter()
        ]).then(([reportsData, teamsData]) => {
            setReports(reportsData)
            setTeams(teamsData)
            setLoading(false)
        })
    }, [])

    if (loading) return <div>{t('reports.loading')}</div>

    return (
        <div className="space-y-6 sm:space-y-8">
            <div className="flex-none sm:p-0">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold tracking-tight text-[#37352f] dark:text-zinc-50">
                            {t('reports.title')}
                        </h1>
                        <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400">
                            {t('reports.description')}
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex-1">
                <Suspense fallback={<div>{t('reports.loading')}</div>}>
                    <ReportsList initialReports={reports} teams={teams} />
                </Suspense>
            </div>
        </div>
    )
}
