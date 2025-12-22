"use client"

import { useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Dialog,
    DialogContent,
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
import {
    Users2,
    Plus,
    MapPin,
    Truck,
    Wrench,
    User,
    Building2,
    Briefcase,
    MoreVertical,
    Edit,
    Trash2,
    UserPlus,
    Package,
} from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Image from "next/image"

interface Team {
    id: string
    profile_id: string
    name: string
    description?: string
    status: "active" | "on_break" | "off_duty"
    current_location?: string
    current_project?: string
    current_service?: string
    leader_id?: string
    leader_name?: string
    leader_photo?: string
    vehicle_id?: string
    vehicle_plate?: string
    vehicle_model?: string
    member_count: number
    equipment_count: number
    equipment_quantity: number
    created_at: string
}

interface Colaborador {
    id: string
    nome: string
    foto_url?: string
    cargo?: string
}

interface Vehicle {
    id: string
    plate: string
    model?: string
    brand?: string
}

interface Ferramenta {
    id: string
    nome: string
    quantidade_disponivel: number
    foto_url?: string
}

interface EquipesClientProps {
    initialTeams: Team[]
    colaboradores: Colaborador[]
    vehicles: Vehicle[]
    ferramentas: Ferramenta[]
    userId: string
}

export default function EquipesClient({
    initialTeams,
    colaboradores,
    vehicles,
    ferramentas,
    userId,
}: EquipesClientProps) {
    const supabase = createClientComponentClient()
    const [teams, setTeams] = useState<Team[]>(initialTeams)
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    const [form, setForm] = useState({
        name: "",
        description: "",
        leader_id: "",
        vehicle_id: "",
        current_location: "",
        current_project: "",
        current_service: "",
    })

    const handleCreate = async () => {
        if (!form.name.trim()) return

        setLoading(true)
        try {
            const { data, error } = await supabase
                .from("teams")
                .insert({
                    profile_id: userId,
                    name: form.name,
                    description: form.description || null,
                    leader_id: form.leader_id || null,
                    vehicle_id: form.vehicle_id || null,
                    current_location: form.current_location || null,
                    current_project: form.current_project || null,
                    current_service: form.current_service || null,
                })
                .select()
                .single()

            if (error) throw error

            // Refresh teams list
            const { data: newTeams } = await supabase
                .from("v_teams_summary")
                .select("*")
                .eq("profile_id", userId)
                .order("created_at", { ascending: false })

            setTeams(newTeams || [])
            setForm({
                name: "",
                description: "",
                leader_id: "",
                vehicle_id: "",
                current_location: "",
                current_project: "",
                current_service: "",
            })
            setIsCreateOpen(false)
        } catch (err) {
            console.error("Error creating team:", err)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (teamId: string) => {
        if (!confirm("Tem certeza que deseja excluir esta equipe?")) return

        try {
            const { error } = await supabase.from("teams").delete().eq("id", teamId)
            if (error) throw error
            setTeams(teams.filter((t) => t.id !== teamId))
        } catch (err) {
            console.error("Error deleting team:", err)
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "active":
                return <Badge className="bg-emerald-500 text-white">Ativa</Badge>
            case "on_break":
                return <Badge className="bg-yellow-500 text-white">Em Pausa</Badge>
            case "off_duty":
                return <Badge className="bg-gray-500 text-white">Fora de Serviço</Badge>
            default:
                return <Badge>{status}</Badge>
        }
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Users2 className="h-7 w-7 text-primary" />
                        Gestão de Equipes
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Gerencie equipes de campo, atribua veículos e equipamentos
                    </p>
                </div>

                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <Plus className="h-4 w-4" />
                            Nova Equipe
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Criar Nova Equipe</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 mt-4">
                            <div>
                                <Label htmlFor="name">Nome da Equipe *</Label>
                                <Input
                                    id="name"
                                    placeholder="Ex: Equipe Alpha - Instalação"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                />
                            </div>

                            <div>
                                <Label htmlFor="description">Descrição</Label>
                                <Textarea
                                    id="description"
                                    placeholder="Descrição ou observações sobre a equipe"
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                />
                            </div>

                            <div>
                                <Label htmlFor="leader">Líder da Equipe</Label>
                                <Select
                                    value={form.leader_id}
                                    onValueChange={(v) => setForm({ ...form, leader_id: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecionar líder" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {colaboradores.map((c) => (
                                            <SelectItem key={c.id} value={c.id}>
                                                {c.nome} {c.cargo && `(${c.cargo})`}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label htmlFor="vehicle">Veículo</Label>
                                <Select
                                    value={form.vehicle_id}
                                    onValueChange={(v) => setForm({ ...form, vehicle_id: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecionar veículo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {vehicles.map((v) => (
                                            <SelectItem key={v.id} value={v.id}>
                                                {v.plate} {v.model && `- ${v.model}`}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="location">Localização</Label>
                                    <Input
                                        id="location"
                                        placeholder="Endereço da obra"
                                        value={form.current_location}
                                        onChange={(e) => setForm({ ...form, current_location: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="project">Projeto/Obra</Label>
                                    <Input
                                        id="project"
                                        placeholder="Nome do projeto"
                                        value={form.current_project}
                                        onChange={(e) => setForm({ ...form, current_project: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="service">Serviço Atual</Label>
                                <Input
                                    id="service"
                                    placeholder="Tipo de serviço sendo executado"
                                    value={form.current_service}
                                    onChange={(e) => setForm({ ...form, current_service: e.target.value })}
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                                <Button
                                    variant="outline"
                                    onClick={() => setIsCreateOpen(false)}
                                >
                                    Cancelar
                                </Button>
                                <Button onClick={handleCreate} disabled={loading || !form.name.trim()}>
                                    {loading ? "Criando..." : "Criar Equipe"}
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Teams Grid */}
            {teams.length === 0 ? (
                <Card className="p-12 text-center">
                    <Users2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground/40" />
                    <h3 className="text-lg font-semibold mb-2">Nenhuma equipe cadastrada</h3>
                    <p className="text-muted-foreground mb-6">
                        Crie sua primeira equipe para começar a gerenciar colaboradores e equipamentos em campo.
                    </p>
                    <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Criar Primeira Equipe
                    </Button>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {teams.map((team, idx) => (
                        <motion.div
                            key={team.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                        >
                            <Card className="hover:shadow-lg transition-shadow">
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                                <Users2 className="h-5 w-5 text-primary" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-lg">{team.name}</CardTitle>
                                                {getStatusBadge(team.status)}
                                            </div>
                                        </div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem className="gap-2">
                                                    <Edit className="h-4 w-4" /> Editar
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="gap-2">
                                                    <UserPlus className="h-4 w-4" /> Adicionar Membro
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="gap-2">
                                                    <Package className="h-4 w-4" /> Atribuir Equipamentos
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    className="gap-2 text-destructive"
                                                    onClick={() => handleDelete(team.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" /> Excluir
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Líder */}
                                    {team.leader_name && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <User className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-muted-foreground">Líder:</span>
                                            <div className="flex items-center gap-2">
                                                {team.leader_photo && (
                                                    <Image
                                                        src={team.leader_photo}
                                                        alt={team.leader_name}
                                                        width={20}
                                                        height={20}
                                                        className="rounded-full"
                                                    />
                                                )}
                                                <span className="font-medium">{team.leader_name}</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Veículo */}
                                    {team.vehicle_plate && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <Truck className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-muted-foreground">Veículo:</span>
                                            <span className="font-medium">
                                                {team.vehicle_plate} {team.vehicle_model && `- ${team.vehicle_model}`}
                                            </span>
                                        </div>
                                    )}

                                    {/* Localização */}
                                    {team.current_project && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <Building2 className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-muted-foreground">Obra:</span>
                                            <span className="font-medium">{team.current_project}</span>
                                        </div>
                                    )}

                                    {team.current_location && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <MapPin className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-muted-foreground truncate">
                                                {team.current_location}
                                            </span>
                                        </div>
                                    )}

                                    {team.current_service && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <Briefcase className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-muted-foreground">Serviço:</span>
                                            <span className="font-medium">{team.current_service}</span>
                                        </div>
                                    )}

                                    {/* Stats */}
                                    <div className="flex items-center gap-4 pt-3 border-t">
                                        <div className="flex items-center gap-1.5 text-sm">
                                            <Users2 className="h-4 w-4 text-blue-500" />
                                            <span className="font-medium">{team.member_count || 0}</span>
                                            <span className="text-muted-foreground">membros</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-sm">
                                            <Wrench className="h-4 w-4 text-orange-500" />
                                            <span className="font-medium">{team.equipment_quantity || 0}</span>
                                            <span className="text-muted-foreground">equipamentos</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    )
}
