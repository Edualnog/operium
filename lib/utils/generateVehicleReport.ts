import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { Vehicle, VehicleCost, VehicleMaintenance } from "@/lib/types/vehicles"
import { format } from "date-fns"

interface ReportData {
    vehicle: Vehicle
    maintenances: VehicleMaintenance[]
    costs: VehicleCost[]
    startDate?: string
    endDate?: string
}

export async function generateVehicleReport({ vehicle, maintenances, costs, startDate, endDate }: ReportData) {
    const doc = new jsPDF()

    // Title
    doc.setFontSize(20)
    doc.text("Relatório do Veículo", 14, 22)

    // Period Info
    doc.setFontSize(10)
    const periodText = startDate && endDate
        ? `Período: ${format(new Date(startDate), 'dd/MM/yyyy')} a ${format(new Date(endDate), 'dd/MM/yyyy')}`
        : "Período: Completo"
    doc.text(periodText, 14, 28)

    // Vehicle Details Table
    autoTable(doc, {
        startY: 35,
        head: [['Placa', 'Marca/Modelo', 'Ano', 'Combustível', 'Status']],
        body: [[
            vehicle.plate,
            `${vehicle.brand || '-'} / ${vehicle.model || '-'}`,
            vehicle.year?.toString() || '-',
            vehicle.fuel_type,
            'Ativo' // TODO: Pass status if dynamic
        ]],
        theme: 'grid',
        headStyles: { fillColor: [24, 24, 27] } // zinc-900
    })

    let currentY = (doc as any).lastAutoTable.finalY + 10

    // Summary
    const totalMaintenance = maintenances.reduce((acc, curr) => acc + curr.cost, 0)
    const totalCosts = costs.reduce((acc, curr) => acc + curr.amount, 0)
    const acquisitionValue = vehicle.acquisition_value || 0
    const totalInvested = totalMaintenance + totalCosts + acquisitionValue

    doc.setFontSize(14)
    doc.text("Resumo Financeiro", 14, currentY)

    autoTable(doc, {
        startY: currentY + 5,
        head: [['Categoria', 'Valor Total']],
        body: [
            ['Valor de Aquisição', new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(acquisitionValue)],
            ['Total Manutenções', new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalMaintenance)],
            ['Total Despesas', new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalCosts)],
            ['TOTAL INVESTIDO', new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalInvested)]
        ],
        theme: 'striped',
        headStyles: { fillColor: [40, 40, 40] } // zinc-800
    })

    currentY = (doc as any).lastAutoTable.finalY + 15

    // Maintenances Table
    if (maintenances.length > 0) {
        doc.setFontSize(14)
        doc.text("Histórico de Manutenções", 14, currentY)

        autoTable(doc, {
            startY: currentY + 5,
            head: [['Data', 'Tipo', 'Descrição', 'Custo']],
            body: maintenances.map(m => [
                format(new Date(m.maintenance_date), 'dd/MM/yyyy'),
                m.maintenance_type,
                m.description || '-',
                new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(m.cost)
            ]),
            theme: 'grid',
            headStyles: { fillColor: [24, 24, 27] }
        })
        currentY = (doc as any).lastAutoTable.finalY + 15
    }

    // Costs Table
    if (costs.length > 0) {
        // Check if we need a new page
        if (currentY > 250) {
            doc.addPage()
            currentY = 20
        }

        doc.setFontSize(14)
        doc.text("Histórico de Despesas", 14, currentY)

        autoTable(doc, {
            startY: currentY + 5,
            head: [['Mês Ref.', 'Tipo', 'Valor', 'Notas']],
            body: costs.map(c => [
                format(new Date(c.reference_month), 'MM/yyyy'),
                c.cost_type,
                new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c.amount),
                c.notes || '-'
            ]),
            theme: 'grid',
            headStyles: { fillColor: [24, 24, 27] }
        })
    }

    doc.save(`relatorio-veiculo-${vehicle.plate}.pdf`)
}
