export type TeamStatus = 'active' | 'on_break' | 'off_duty'

export type EquipmentStatus =
    | 'pending_acceptance'
    | 'accepted'
    | 'in_use'
    | 'pending_return'
    | 'returned'
    | 'returned_with_issue'

export type EquipmentIssueType = 'damage' | 'malfunction' | 'loss' | 'wear' | 'other'
export type EquipmentIssueSeverity = 'low' | 'medium' | 'high' | 'critical'

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
    total_costs?: number
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
    // Status tracking
    status: EquipmentStatus
    accepted_at?: string | null
    accepted_by_user_id?: string | null
    return_requested_at?: string | null
    return_requested_by_user_id?: string | null
    admin_validated_at?: string | null
    admin_validated_by?: string | null
    // Joins
    ferramenta_nome?: string
    ferramenta_tipo?: string
}

export interface EquipmentIssue {
    id: string
    team_equipment_id: string
    reported_by_user_id: string
    org_id: string
    issue_type: EquipmentIssueType
    severity: EquipmentIssueSeverity
    description: string
    location?: string | null
    photo_url?: string | null
    resolved_at?: string | null
    resolved_by?: string | null
    resolution_notes?: string | null
    created_at: string
    updated_at: string
}

export interface EquipmentNotification {
    id: string
    user_id: string
    org_id: string
    team_equipment_id: string | null
    notification_type: 'equipment_assigned' | 'equipment_accepted' | 'issue_reported' | 'return_requested' | 'return_validated'
    title: string
    message: string | null
    read_at: string | null
    created_at: string
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
