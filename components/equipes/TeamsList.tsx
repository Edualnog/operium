"use client"

import { Team } from "@/app/dashboard/equipes/types"
import { Plus, Search, ChevronDown, LayoutGrid, List as ListIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState, useMemo } from "react"
import TeamCard from "./TeamCard"
import CreateEditTeamModal from "./CreateEditTeamModal"
import { motion, AnimatePresence } from "framer-motion"
import TeamDetailsSheet from "./TeamDetailsSheet"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useTranslation } from "react-i18next"
import { useRouter } from "next/navigation"

interface TeamsListProps {
    initialTeams: Team[]
}

export default function TeamsList({ initialTeams }: TeamsListProps) {
    const { t } = useTranslation()
    const router = useRouter()
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [activeTab, setActiveTab] = useState<"todos" | "ativas" | "pausa">("ativas")
    const [search, setSearch] = useState("")

    // Internal state for teams list
    const [teams, setTeams] = useState<Team[]>(Array.isArray(initialTeams) ? initialTeams : [])

    // State for auto-opening details after create
    const [justCreatedTeam, setJustCreatedTeam] = useState<Team | null>(null)
    const [isDetailsOpen, setIsDetailsOpen] = useState(false)

    const handleTeamCreated = (team: Team) => {
        // Add team to local state immediately
        setTeams(prev => [team, ...prev])
        setJustCreatedTeam(team)
        setIsDetailsOpen(true)
        // Also refresh from server
        router.refresh()
    }

    const handleTeamDeleted = (teamId: string) => {
        setTeams(prev => prev.filter(t => t.id !== teamId))
        router.refresh()
    }

    const filteredTeams = useMemo(() => {
        let result = [...teams]

        // Search filter
        if (search) {
            const searchLower = search.toLowerCase()
            result = result.filter(t =>
                t.name.toLowerCase().includes(searchLower) ||
                t.leader_name?.toLowerCase().includes(searchLower)
            )
        }

        // Tab filter
        if (activeTab === "ativas") {
            // Assuming 'active' is the status for active teams
            result = result.filter(t => t.status === 'active')
        } else if (activeTab === "pausa") {
            result = result.filter(t => t.status === 'on_break')
        }

        return result
    }, [teams, search, activeTab])

    const counts = useMemo(() => ({
        todos: teams.length,
        ativas: teams.filter(t => t.status === 'active').length,
        pausa: teams.filter(t => t.status === 'on_break').length
    }), [teams])


    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full sm:w-auto">
                    <TabsList className="bg-transparent p-0">
                        <TabsTrigger
                            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[#37352f] rounded-none border-b-2 border-transparent px-4 pb-2"
                            value="ativas"
                        >
                            {t('teams.tabs.active')} ({counts.ativas})
                        </TabsTrigger>
                        <TabsTrigger
                            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[#37352f] rounded-none border-b-2 border-transparent px-4 pb-2"
                            value="pausa"
                        >
                            {t('teams.tabs.on_break')} ({counts.pausa})
                        </TabsTrigger>
                        <TabsTrigger
                            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[#37352f] rounded-none border-b-2 border-transparent px-4 pb-2"
                            value="todos"
                        >
                            {t('teams.tabs.all')} ({counts.todos})
                        </TabsTrigger>
                    </TabsList>
                </Tabs>

                <div className="flex gap-2 w-full sm:w-auto items-center">
                    <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2 flex-1 sm:flex-none bg-[#37352f] hover:bg-zinc-800 text-white h-11 sm:h-10">
                        <Plus className="h-5 w-5 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline">{t('teams.new_team')}</span>
                    </Button>
                </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-md border shadow-sm">
                {/* Search Header */}
                <div className="p-4 border-b">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1">
                            <div className="relative flex-1 max-w-sm">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder={t('teams.search_placeholder')}
                                    className="pl-8"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6">
                    {filteredTeams.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 mb-4">
                                <Search className="h-6 w-6 text-zinc-400" />
                            </div>
                            <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">{t('teams.empty.title')}</h3>
                            <p className="mt-2 text-sm text-zinc-500 max-w-sm mx-auto">
                                {search ? t('teams.empty.search_hint') : t('teams.empty.start_hint')}
                            </p>
                            {!search && (
                                <Button onClick={() => setIsCreateModalOpen(true)} variant="outline" className="mt-4">
                                    {t('teams.empty.create_button')}
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            <AnimatePresence mode="popLayout">
                                {filteredTeams.map((team) => (
                                    <motion.div
                                        key={team.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <TeamCard team={team} onDeleted={() => handleTeamDeleted(team.id)} />
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </div>

            <CreateEditTeamModal
                open={isCreateModalOpen}
                onOpenChange={setIsCreateModalOpen}
                onTeamCreated={handleTeamCreated}
            />

            {justCreatedTeam && (
                <TeamDetailsSheet
                    open={isDetailsOpen}
                    onOpenChange={(open) => {
                        setIsDetailsOpen(open)
                        if (!open) setJustCreatedTeam(null)
                    }}
                    team={justCreatedTeam}
                />
            )}
        </div>
    )
}

