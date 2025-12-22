import { createServerComponentClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import EquipesClient from "./EquipesClient"

export const dynamic = "force-dynamic"

async function getTeams(userId: string) {
    const supabase = await createServerComponentClient()

    const { data: teams } = await supabase
        .from("v_teams_summary")
        .select("*")
        .eq("profile_id", userId)
        .order("created_at", { ascending: false })

    return teams || []
}

async function getCollaborators(userId: string) {
    const supabase = await createServerComponentClient()

    const { data: colaboradores } = await supabase
        .from("colaboradores")
        .select("id, nome, foto_url, cargo")
        .eq("profile_id", userId)
        .eq("status", "ATIVO")
        .order("nome")

    return colaboradores || []
}

async function getVehicles(userId: string) {
    const supabase = await createServerComponentClient()

    const { data: vehicles } = await supabase
        .from("vehicles")
        .select("id, plate, model, brand")
        .eq("profile_id", userId)
        .eq("status", "active")
        .order("plate")

    return vehicles || []
}

async function getTools(userId: string) {
    const supabase = await createServerComponentClient()

    const { data: ferramentas } = await supabase
        .from("ferramentas")
        .select("id, nome, quantidade_disponivel, foto_url")
        .eq("profile_id", userId)
        .gt("quantidade_disponivel", 0)
        .order("nome")

    return ferramentas || []
}

export default async function EquipesPage() {
    const supabase = await createServerComponentClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect("/login")
    }

    const [teams, colaboradores, vehicles, ferramentas] = await Promise.all([
        getTeams(user.id),
        getCollaborators(user.id),
        getVehicles(user.id),
        getTools(user.id),
    ])

    return (
        <EquipesClient
            initialTeams={teams}
            colaboradores={colaboradores}
            vehicles={vehicles}
            ferramentas={ferramentas}
            userId={user.id}
        />
    )
}
