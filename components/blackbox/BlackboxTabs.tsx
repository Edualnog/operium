"use client"

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ObservabilityDashboard } from "@/components/observability/ObservabilityDashboard"
import { ExportCenter } from "@/components/export/ExportCenter"
import { useTranslation } from "react-i18next"

export function BlackboxTabs() {
    const { t } = useTranslation()

    return (
        <Tabs defaultValue="observability" className="w-full">
            <TabsList className="mb-6">
                <TabsTrigger value="observability">
                    🔭 {t('blackbox.tab_observability')}
                </TabsTrigger>
                <TabsTrigger value="export">
                    📁 {t('blackbox.tab_export')}
                </TabsTrigger>
            </TabsList>

            <TabsContent value="observability">
                <ObservabilityDashboard />
            </TabsContent>

            <TabsContent value="export">
                <ExportCenter />
            </TabsContent>
        </Tabs>
    )
}
