export type VehicleType = 'CAR' | 'TRUCK' | 'VAN' | 'MOTORCYCLE' | 'OTHER';
export type FuelType = 'GASOLINE' | 'DIESEL' | 'FLEX' | 'ELECTRIC' | 'HYBRID';

export interface Vehicle {
    id: string;
    profile_id: string;
    plate: string;
    vehicle_type: VehicleType;
    fuel_type: FuelType;
    brand?: string;
    model?: string;
    year?: number;
    acquisition_date: string;
    acquisition_value?: number;
    created_at: string;
    updated_at: string;
    current_driver_id?: string | null;
    driver?: {
        id: string;
        name: string;
    } | null;
    status?: 'active' | 'maintenance' | 'out_of_service'; // Extended interface for frontend logic
}

export interface VehicleMaintenance {
    id: string;
    vehicle_id: string;
    maintenance_type: string;
    description?: string;
    cost: number;
    maintenance_date: string;
    next_maintenance_date?: string;
    created_at: string;
}

export interface VehicleCost {
    id: string;
    vehicle_id: string;
    cost_type: string;
    amount: number;
    reference_month: string;
    notes?: string;
    created_at: string;
}

export interface VehicleUsageEvent {
    id: string;
    vehicle_id: string;
    collaborator_id?: string;
    usage_type: string;
    usage_date: string;
    notes?: string;
}

export interface VehicleBehaviorFeatures {
    id: string;
    vehicle_id: string;
    monthly_avg_cost: number;
    maintenance_frequency: number;
    downtime_rate: number;
    human_risk_index: number;
    calculated_at: string;
}
