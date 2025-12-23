import { OperiumDashboard } from "@/components/operium/OperiumDashboard"

export const metadata = {
    title: "OPERIUM - Painel Operacional",
    description: "Sistema de controle de acesso operacional",
}

export default function OperiumPage() {
    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <OperiumDashboard />
        </div>
    )
}
