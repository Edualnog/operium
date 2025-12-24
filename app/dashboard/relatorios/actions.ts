"use server"

import { createServerActionClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export type DailyReport = {
    id: string
    report_date: string
    summary: string
    notes: string | null
    created_at: string
    user_name: string
    team_name: string | null
    team_deleted: boolean
}

export async function getDailyReports(
    date?: string,
    teamId?: string
): Promise<DailyReport[]> {
    const supabase = createServerActionClient({ cookies })
    let query = supabase
        .from("field_reports")
        .select(`
            id,
            report_date,
            summary,
            notes,
            created_at,
            operium_profiles!field_reports_user_id_fkey_operium_profiles (
                name
            ),
            teams (
                name,
                deleted_at
            )
        `)
        .order("report_date", { ascending: false })
        .order("created_at", { ascending: false })

    if (date) {
        query = query.eq("report_date", date)
    }

    if (teamId) {
        query = query.eq("team_id", teamId)
    }

    const { data, error } = await query

    if (error) {
        console.error("Error fetching reports:", error)
        return []
    }

    return data.map((item: any) => ({
        id: item.id,
        report_date: item.report_date,
        summary: item.summary,
        notes: item.notes,
        created_at: item.created_at,
        user_name: item.operium_profiles?.name || "Usuário desconhecido",
        team_name: item.teams?.name || "Sem equipe",
        team_deleted: !!item.teams?.deleted_at
    }))
}

export async function getAllTeamsForFilter() {
    const supabase = createServerActionClient({ cookies })
    // Fetch ALL teams, even deleted ones
    const { data } = await supabase
        .from("teams")
        .select("id, name, deleted_at")
        .order("name")

    return data || []
}
