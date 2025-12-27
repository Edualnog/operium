"use client"

import { useState, useEffect } from "react"
import { Users, LogOut, RefreshCw, ChevronRight, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { leaveTeam, joinTeam, getAvailableTeams, type AvailableTeam } from "@/app/app/actions"

interface TeamManagerMobileProps {
    currentTeamId: string | null
    currentTeamName: string | null
    onTeamChange?: () => void
}

export function TeamManagerMobile({
    currentTeamId,
    currentTeamName,
    onTeamChange
}: TeamManagerMobileProps) {
    const [openLeave, setOpenLeave] = useState(false)
    const [openJoin, setOpenJoin] = useState(false)
    const [loading, setLoading] = useState(false)
    const [teams, setTeams] = useState<AvailableTeam[]>([])
    const [selectedTeam, setSelectedTeam] = useState<string>("")
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

    // Load available teams when join dialog opens
    useEffect(() => {
        if (openJoin) {
            loadTeams()
        }
    }, [openJoin])

    const loadTeams = async () => {
        try {
            const availableTeams = await getAvailableTeams()
            // Filter out current team
            setTeams(availableTeams.filter(t => t.id !== currentTeamId))
        } catch (err) {
            console.error("Error loading teams:", err)
        }
    }

    const handleLeaveTeam = async () => {
        setLoading(true)
        setMessage(null)

        try {
            const result = await leaveTeam()
            setMessage({ type: "success", text: `Você saiu da equipe ${result.previousTeamName}` })
            setTimeout(() => {
                setOpenLeave(false)
                onTeamChange?.()
            }, 1500)
        } catch (err: any) {
            setMessage({ type: "error", text: err.message || "Erro ao sair da equipe" })
        } finally {
            setLoading(false)
        }
    }

    const handleJoinTeam = async () => {
        if (!selectedTeam) return

        setLoading(true)
        setMessage(null)

        try {
            const result = await joinTeam(selectedTeam)
            setMessage({ type: "success", text: `Você entrou na equipe ${result.teamName}` })
            setTimeout(() => {
                setOpenJoin(false)
                onTeamChange?.()
            }, 1500)
        } catch (err: any) {
            setMessage({ type: "error", text: err.message || "Erro ao entrar na equipe" })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-3">
            {/* Current Team Status */}
            <div className="flex items-center justify-between p-4 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">Minha Equipe</p>
                        <p className="font-medium text-zinc-900 dark:text-zinc-100">
                            {currentTeamName || "Sem equipe"}
                        </p>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
                {currentTeamId ? (
                    <>
                        {/* Leave Team Button */}
                        <Dialog open={openLeave} onOpenChange={setOpenLeave}>
                            <DialogTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="flex-1 text-orange-600 border-orange-200 hover:bg-orange-50 dark:border-orange-800 dark:hover:bg-orange-900/20"
                                >
                                    <LogOut className="h-4 w-4 mr-2" />
                                    Sair da Equipe
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Sair da Equipe</DialogTitle>
                                    <DialogDescription>
                                        Você será desvinculado da equipe <strong>{currentTeamName}</strong>.
                                        Poderá entrar em outra equipe depois.
                                    </DialogDescription>
                                </DialogHeader>

                                {message && (
                                    <div className={`p-3 rounded-lg text-sm ${message.type === "success"
                                            ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                                            : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                                        }`}>
                                        {message.text}
                                    </div>
                                )}

                                <DialogFooter>
                                    <Button
                                        variant="outline"
                                        onClick={() => setOpenLeave(false)}
                                        disabled={loading}
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        onClick={handleLeaveTeam}
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <>
                                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                                Saindo...
                                            </>
                                        ) : (
                                            <>
                                                <LogOut className="h-4 w-4 mr-2" />
                                                Confirmar Saída
                                            </>
                                        )}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>

                        {/* Change Team Button */}
                        <Dialog open={openJoin} onOpenChange={setOpenJoin}>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="flex-1">
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Trocar Equipe
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Trocar de Equipe</DialogTitle>
                                    <DialogDescription>
                                        Selecione outra equipe para entrar. Você será desvinculado da equipe atual.
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="py-4">
                                    <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione uma equipe" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {teams.map((team) => (
                                                <SelectItem key={team.id} value={team.id}>
                                                    {team.name}
                                                </SelectItem>
                                            ))}
                                            {teams.length === 0 && (
                                                <div className="p-2 text-sm text-zinc-500 text-center">
                                                    Nenhuma outra equipe disponível
                                                </div>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {message && (
                                    <div className={`p-3 rounded-lg text-sm ${message.type === "success"
                                            ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                                            : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                                        }`}>
                                        {message.text}
                                    </div>
                                )}

                                <DialogFooter>
                                    <Button
                                        variant="outline"
                                        onClick={() => setOpenJoin(false)}
                                        disabled={loading}
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        onClick={handleJoinTeam}
                                        disabled={loading || !selectedTeam}
                                    >
                                        {loading ? (
                                            <>
                                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                                Entrando...
                                            </>
                                        ) : (
                                            <>
                                                <Check className="h-4 w-4 mr-2" />
                                                Entrar na Equipe
                                            </>
                                        )}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </>
                ) : (
                    /* Join Team Button (when not in a team) */
                    <Dialog open={openJoin} onOpenChange={setOpenJoin}>
                        <DialogTrigger asChild>
                            <Button className="w-full bg-blue-600 hover:bg-blue-700">
                                <Users className="h-4 w-4 mr-2" />
                                Entrar em uma Equipe
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Entrar em uma Equipe</DialogTitle>
                                <DialogDescription>
                                    Selecione a equipe que você faz parte.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="py-4">
                                <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione uma equipe" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {teams.map((team) => (
                                            <SelectItem key={team.id} value={team.id}>
                                                {team.name}
                                            </SelectItem>
                                        ))}
                                        {teams.length === 0 && (
                                            <div className="p-2 text-sm text-zinc-500 text-center">
                                                Nenhuma equipe disponível
                                            </div>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>

                            {message && (
                                <div className={`p-3 rounded-lg text-sm ${message.type === "success"
                                        ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                                        : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                                    }`}>
                                    {message.text}
                                </div>
                            )}

                            <DialogFooter>
                                <Button
                                    variant="outline"
                                    onClick={() => setOpenJoin(false)}
                                    disabled={loading}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={handleJoinTeam}
                                    disabled={loading || !selectedTeam}
                                >
                                    {loading ? (
                                        <>
                                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                            Entrando...
                                        </>
                                    ) : (
                                        <>
                                            <Check className="h-4 w-4 mr-2" />
                                            Entrar na Equipe
                                        </>
                                    )}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}
            </div>
        </div>
    )
}
