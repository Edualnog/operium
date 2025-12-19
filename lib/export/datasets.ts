// Dataset configuration for export center
export interface DatasetConfig {
    id: string
    labelKey: string
    table: string
    columns: string[]
    dateColumn?: string
    filters?: {
        key: string
        labelKey: string
        options?: { value: string; labelKey: string }[]
    }[]
}

export const DATASETS: DatasetConfig[] = [
    {
        id: 'movements',
        labelKey: 'export.datasets.movements',
        table: 'movimentacoes',
        columns: ['id', 'tipo', 'quantidade', 'observacao', 'created_at'],
        dateColumn: 'created_at',
        filters: [
            {
                key: 'tipo',
                labelKey: 'export.filters.type',
                options: [
                    { value: 'ENTRADA', labelKey: 'movements.entry' },
                    { value: 'SAIDA', labelKey: 'movements.exit' },
                    { value: 'DEVOLUCAO', labelKey: 'movements.return' },
                ]
            }
        ]
    },
    {
        id: 'products',
        labelKey: 'export.datasets.products',
        table: 'produtos',
        columns: ['id', 'nome', 'codigo_ca', 'quantidade_atual', 'quantidade_minima', 'categoria', 'validade', 'created_at'],
        dateColumn: 'created_at',
    },
    {
        id: 'collaborators',
        labelKey: 'export.datasets.collaborators',
        table: 'colaboradores',
        columns: ['id', 'nome', 'cpf', 'cargo', 'status', 'created_at'],
        dateColumn: 'created_at',
        filters: [
            {
                key: 'status',
                labelKey: 'export.filters.status',
                options: [
                    { value: 'ATIVO', labelKey: 'common.active' },
                    { value: 'INATIVO', labelKey: 'common.inactive' },
                ]
            }
        ]
    },
    {
        id: 'vehicles',
        labelKey: 'export.datasets.vehicles',
        table: 'vehicles',
        columns: ['id', 'plate', 'brand', 'model', 'vehicle_type', 'fuel_type', 'status', 'current_odometer', 'acquisition_date', 'created_at'],
        dateColumn: 'created_at',
        filters: [
            {
                key: 'status',
                labelKey: 'export.filters.status',
                options: [
                    { value: 'active', labelKey: 'vehicles.status.active' },
                    { value: 'maintenance', labelKey: 'vehicles.status.maintenance' },
                    { value: 'out_of_service', labelKey: 'vehicles.status.out_of_service' },
                ]
            }
        ]
    },
    {
        id: 'vehicle_maintenances',
        labelKey: 'export.datasets.vehicle_maintenances',
        table: 'vehicle_maintenances',
        columns: ['id', 'vehicle_id', 'maintenance_type', 'description', 'cost', 'maintenance_date', 'next_maintenance_date', 'created_at'],
        dateColumn: 'maintenance_date',
    },
    {
        id: 'vehicle_costs',
        labelKey: 'export.datasets.vehicle_costs',
        table: 'vehicle_costs',
        columns: ['id', 'vehicle_id', 'cost_type', 'amount', 'reference_month', 'notes', 'created_at'],
        dateColumn: 'reference_month',
    },
    {
        id: 'tools',
        labelKey: 'export.datasets.tools',
        table: 'ferramentas',
        columns: ['id', 'codigo_patrimonio', 'nome', 'estado', 'categoria', 'localizacao', 'created_at'],
        dateColumn: 'created_at',
    },
]

export function exportToCSV(data: any[], filename: string) {
    if (!data || data.length === 0) return

    // Get headers from first row
    const headers = Object.keys(data[0])

    // Build CSV content
    const csvContent = [
        headers.join(';'), // Header row with semicolon (better for Excel PT-BR)
        ...data.map(row =>
            headers.map(header => {
                const value = row[header]
                // Handle values with special characters
                if (value === null || value === undefined) return ''
                const stringValue = String(value)
                // Escape quotes and wrap in quotes if contains separator or newline
                if (stringValue.includes(';') || stringValue.includes('"') || stringValue.includes('\n')) {
                    return `"${stringValue.replace(/"/g, '""')}"`
                }
                return stringValue
            }).join(';')
        )
    ].join('\n')

    // Add BOM for UTF-8 Excel compatibility
    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })

    // Download
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
}
