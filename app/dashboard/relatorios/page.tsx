import { Suspense } from "react"
import { Metadata } from 'next'
import { getDailyReports, getAllTeamsForFilter } from "./actions"
import ReportsList from "@/components/relatorios/ReportsList"

export const metadata: Metadata = {
    title: 'Relatórios de Campo | Operium',
    description: 'Central de relatórios operacionais.',
}

export default async function ReportsPage() {
    const [reports, teams] = await Promise.all([
        getDailyReports(),
        getAllTeamsForFilter()
    ])

    return (
        <div className="space-y-6 sm:space-y-8">
            <div className="flex-none sm:p-0">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold tracking-tight text-[#37352f] dark:text-zinc-50">
                            Relatórios de Campo
                        </h1>
                        <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400">
                            Acompanhe registros operacionais enviados pelas equipes em campo.
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex-1">
                <Suspense fallback={<div>Carregando relatórios...</div>}>
                    <ReportsList initialReports={reports} teams={teams} />
                </Suspense>
            </div>
        </div>
    )
}
