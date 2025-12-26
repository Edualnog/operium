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

    // Fetch reports - now including user_name from the table
    let query = supabase
        .from("field_reports")
        .select(`
            id,
            report_date,
            summary,
            notes,
            created_at,
            user_id,
            user_name,
            team_id
        `)
        .order("report_date", { ascending: false })
        .order("created_at", { ascending: false })

    if (date) {
        query = query.eq("report_date", date)
    }

    if (teamId) {
        query = query.eq("team_id", teamId)
    }

    const { data: reports, error } = await query

    if (error) {
        console.error("Error fetching reports:", error)
        return []
    }

    if (!reports || reports.length === 0) {
        return []
    }

    // Get unique user IDs (for reports without stored user_name) and team IDs
    const userIdsWithoutName = Array.from(new Set(
        reports.filter(r => !r.user_name && r.user_id).map(r => r.user_id)
    ))
    const teamIds = Array.from(new Set(reports.map(r => r.team_id).filter(Boolean)))

    // Fetch profiles only for users without stored name
    const { data: profiles } = userIdsWithoutName.length > 0
        ? await supabase
            .from("operium_profiles")
            .select("user_id, name")
            .in("user_id", userIdsWithoutName)
        : { data: [] }

    // Fetch teams
    const { data: teams } = teamIds.length > 0
        ? await supabase
            .from("teams")
            .select("id, name, deleted_at")
            .in("id", teamIds)
        : { data: [] }

    // Create lookup maps
    const profileMap = new Map((profiles || []).map(p => [p.user_id, p.name]))
    const teamMap = new Map((teams || []).map(t => [t.id, { name: t.name, deleted_at: t.deleted_at }]))

    return reports.map((item: any) => {
        // Priority: use stored user_name, then fallback to profile lookup
        let userName = item.user_name

        if (!userName) {
            userName = profileMap.get(item.user_id) || "Usuário desconhecido"
        }

        return {
            id: item.id,
            report_date: item.report_date,
            summary: item.summary,
            notes: item.notes,
            created_at: item.created_at,
            user_name: userName,
            team_name: teamMap.get(item.team_id)?.name || "Sem equipe",
            team_deleted: !!teamMap.get(item.team_id)?.deleted_at
        }
    })
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
