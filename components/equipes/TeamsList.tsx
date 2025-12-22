"use client"

import { Team } from "@/app/dashboard/equipes/types"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import TeamCard from "./TeamCard"
import CreateEditTeamModal from "./CreateEditTeamModal"
import { motion, AnimatePresence } from "framer-motion"

interface TeamsListProps {
    initialTeams: Team[]
}

export default function TeamsList({ initialTeams }: TeamsListProps) {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

    // Safe array check
    const teams = Array.isArray(initialTeams) ? initialTeams : []

    return (
        <div className="h-full flex flex-col space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
                        {teams.length} {teams.length === 1 ? 'equipe' : 'equipes'}
                    </span>
                </div>
                <Button onClick={() => setIsCreateModalOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nova Equipe
                </Button>
            </div>

            {teams.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[50vh] border border-dashed rounded-lg bg-muted/50 p-8 text-center animate-in fade-in-50">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                        <Plus className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold">Nenhuma equipe criada</h3>
                    <p className="mb-4 mt-2 text-sm text-muted-foreground max-w-sm">
                        Crie sua primeira equipe para começar a gerenciar membros e equipamentos.
                    </p>
                    <Button onClick={() => setIsCreateModalOpen(true)}>
                        Criar primeira equipe
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-8 overflow-y-auto">
                    <AnimatePresence mode="popLayout">
                        {teams.map((team) => (
                            <motion.div
                                key={team.id}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.2 }}
                            >
                                <TeamCard team={team} />
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            <CreateEditTeamModal
                open={isCreateModalOpen}
                onOpenChange={setIsCreateModalOpen}
            />
        </div>
    )
}
