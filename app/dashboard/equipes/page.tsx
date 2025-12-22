import { Suspense } from "react"
import { getTeams } from "./actions"
import TeamsList from "@/components/equipes/TeamsList"
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Gestão de Equipes | Operium',
    description: 'Gerencie suas equipes operacionais, membros e equipamentos.',
}

export default async function EquipesPage() {
    const teams = await getTeams()

    return (
        <div className="flex flex-col h-full bg-background">
            <div className="flex-none p-6 md:p-8 space-y-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Equipes</h2>
                    <p className="text-muted-foreground">
                        Gerencie equipes operacionais, atribua veículos e controle equipamentos.
                    </p>
                </div>
            </div>

            <div className="flex-1 p-6 md:p-8 pt-0 overflow-hidden">
                <Suspense fallback={<div>Carregando equipes...</div>}>
                    <TeamsList initialTeams={teams} />
                </Suspense>
            </div>
        </div>
    )
}
