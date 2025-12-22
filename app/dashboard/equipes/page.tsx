import { Suspense } from "react"
import { getTeams } from "./actions"
import TeamsList from "@/components/equipes/TeamsList"
import { Metadata } from 'next'
import { PageHeader } from "@/components/layout/PageHeader"

export const metadata: Metadata = {
    title: 'Gestão de Equipes | Operium',
    description: 'Gerencie suas equipes operacionais, membros e equipamentos.',
}

export default async function EquipesPage() {
    const teams = await getTeams()

    return (
        <div className="space-y-6 sm:space-y-8">
            <div className="flex-none sm:p-0">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold tracking-tight text-[#37352f] dark:text-zinc-50">
                            Equipes
                        </h1>
                        <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400">
                            Gerencie equipes operacionais, atribua veículos e controle equipamentos.
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-hidden">
                <Suspense fallback={<div>Carregando equipes...</div>}>
                    <TeamsList initialTeams={teams} />
                </Suspense>
            </div>
        </div>
    )
}
