export type TeamStatus = 'active' | 'on_break' | 'off_duty'

export interface Team {
    id: string
    profile_id: string
    name: string
    description: string | null
    leader_id: string | null
    vehicle_id: string | null
    current_location: string | null
    current_project: string | null
    current_service: string | null
    status: TeamStatus
    created_at: string
    updated_at: string
    // Joins/Counts from View or Relations
    leader_name?: string
    leader_photo?: string | null
    vehicle_plate?: string | null
    vehicle_model?: string | null
    member_count?: number
    equipment_count?: number
    equipment_quantity?: number
}

export interface TeamMember {
    id: string
    team_id: string
    colaborador_id: string
    role: string | null
    joined_at: string
    left_at: string | null
    // Joins
    colaborador_nome?: string
    colaborador_foto?: string | null
    colaborador_cargo?: string | null
}

export interface TeamEquipment {
    id: string
    team_id: string
    ferramenta_id: string
    quantity: number
    assigned_at: string
    returned_at: string | null
    notes: string | null
    // Joins
    ferramenta_nome?: string
    ferramenta_tipo?: string
}

export interface TeamAssignment {
    id: string
    team_id: string
    project_name: string
    location: string | null
    service_type: string | null
    started_at: string
    ended_at: string | null
    notes: string | null
    created_at: string
}
