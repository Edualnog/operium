"use client"

import * as React from "react"
import Image from "next/image"
import {
    Zap,
    Wrench,
    BatteryWarning,
    Hourglass,
    HelpCircle,
    Camera,
    CheckCircle2,
    AlertTriangle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { ProductPhotoUpload } from "./ProductPhotoUpload"
import { Label } from "@/components/ui/label"

// --- Configuration Definitions ---

type IssueCategory = "eletrica" | "mecanica" | "bateria" | "desgaste" | "outro"

interface IssueType {
    id: string
    label: string
    icon: React.ReactNode
    subIssues: string[]
}

const ISSUE_TYPES: IssueType[] = [
    {
        id: "eletrica",
        label: "Elétrica",
        icon: <Zap className="h-8 w-8" />,
        subIssues: ["Não Liga", "Cheiro de Queimado", "Fio Cortado/Desencapado", "Faíscas", "Intermitente"]
    },
    {
        id: "mecanica",
        label: "Mecânica",
        icon: <Wrench className="h-8 w-8" />,
        subIssues: ["Peça Quebrada", "Travado/Emperrado", "Ruído Estranho", "Folga Excessiva", "Gatilho Quebrado"]
    },
    {
        id: "bateria",
        label: "Bateria",
        icon: <BatteryWarning className="h-8 w-8" />,
        subIssues: ["Não Segura Carga", "Não Carrega", "Aquecimento Excessivo", "Carcaça Rachada", "Conector Danificado"]
    },
    {
        id: "desgaste",
        label: "Desgaste",
        icon: <Hourglass className="h-8 w-8" />,
        subIssues: ["Cariá/Escovas Gastas", "Mandril Gasto", "Cabo Desgastado", "Desalinhado", "Fim de Vida Útil"]
    },
    {
        id: "outro",
        label: "Outro",
        icon: <HelpCircle className="h-8 w-8" />,
        subIssues: ["Perda/Roubo", "Erro Operacional", "Não Sei Identificar", "Outro"]
    }
]

interface IncidentReporterProps {
    ferramentaNome: string
    onSubmit: (data: { category: string; issue: string; photoUrl?: string }) => void
    onCancel: () => void
}

export function IncidentReporter({ ferramentaNome, onSubmit, onCancel }: IncidentReporterProps) {
    const [step, setStep] = React.useState<1 | 2 | 3>(1)
    const [selectedCategory, setSelectedCategory] = React.useState<IssueType | null>(null)
    const [selectedSubIssue, setSelectedSubIssue] = React.useState<string | null>(null)
    const [photoUrl, setPhotoUrl] = React.useState<string | undefined>(undefined)

    const handleCategorySelect = (category: IssueType) => {
        setSelectedCategory(category)
        setStep(2)
    }

    const handleSubIssueSelect = (issue: string) => {
        setSelectedSubIssue(issue)
        setStep(3)
    }

    const handleSubmit = () => {
        if (selectedCategory && selectedSubIssue) {
            onSubmit({
                category: selectedCategory.id,
                issue: selectedSubIssue,
                photoUrl
            })
        }
    }

    const reset = () => {
        setStep(1)
        setSelectedCategory(null)
        setSelectedSubIssue(null)
        setPhotoUrl(undefined)
    }

    return (
        <div className="flex flex-col h-full min-h-[400px]">
            {/* Header / Progress */}
            <div className="mb-4">
                <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                    <span>Reportar Problema: {ferramentaNome}</span>
                    <span>Passo {step} de 3</span>
                </div>
                <div className="h-2 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-red-500 transition-all duration-300 ease-out"
                        style={{ width: `${(step / 3) * 100}%` }}
                    />
                </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-2">

                {/* STEP 1: CATEGORY */}
                {step === 1 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full">
                        {ISSUE_TYPES.map((type) => (
                            <Button
                                key={type.id}
                                variant="outline"
                                className="h-32 flex flex-col items-center justify-center gap-2 border-2 hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 text-wrap text-center"
                                onClick={() => handleCategorySelect(type)}
                            >
                                <div className={cn("p-2 rounded-full bg-slate-100 dark:bg-zinc-800", type.id === 'eletrica' ? "text-yellow-500" : type.id === 'mecanica' ? "text-slate-600" : type.id === 'bateria' ? "text-green-500" : "text-blue-500")}>
                                    {type.icon}
                                </div>
                                <span className="font-semibold text-sm">{type.label}</span>
                            </Button>
                        ))}
                    </div>
                )}

                {/* STEP 2: SUB-ISSUE */}
                {step === 2 && selectedCategory && (
                    <div className="w-full space-y-3">
                        <h3 className="text-center font-medium text-lg mb-4 flex items-center justify-center gap-2">
                            {selectedCategory.icon} O que aconteceu na parte {selectedCategory.label}?
                        </h3>
                        <div className="grid grid-cols-1 gap-2">
                            {selectedCategory.subIssues.map((issue) => (
                                <Button
                                    key={issue}
                                    variant="outline"
                                    className="h-14 justify-start px-6 text-base hover:border-red-500 hover:text-red-600"
                                    onClick={() => handleSubIssueSelect(issue)}
                                >
                                    <AlertTriangle className="mr-3 h-4 w-4 text-muted-foreground" />
                                    {issue}
                                </Button>
                            ))}
                        </div>
                        <Button variant="ghost" className="w-full mt-4" onClick={() => setStep(1)}>
                            Voltar
                        </Button>
                    </div>
                )}

                {/* STEP 3: PHOTO & CONFIRM */}
                {step === 3 && selectedCategory && selectedSubIssue && (
                    <div className="w-full space-y-6 text-center animate-in fade-in slide-in-from-bottom-4">
                        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-100 dark:border-red-900/50">
                            <h4 className="font-semibold text-red-900 dark:text-red-300 mb-1">Resumo da Falha</h4>
                            <p className="text-lg">
                                <span className="font-bold">{selectedCategory.label}</span> • {selectedSubIssue}
                            </p>
                        </div>

                        <div className="space-y-3">
                            <Label className="block text-left font-medium">Foto da Avaria (Opcional, mas recomendado)</Label>
                            {/* Reuse Logic: Passing a dummy user ID since we are client side or handle upload differently. 
                  Actually ProductPhotoUpload expects userId. 
                  For MVP we might skip upload or mock it if userId isn't handy here, but FerramentasList has userId.
                  Let's assume we pass userId or make it optional in ProductPhotoUpload? 
                  Checking ProductPhotoUpload contract... it needs props.
                  We will use a simplified mock for now or just the standard Input type=file if simpler.
                  Let's try to simulate a simple file input for speed in MVP Phase 2.
              */}
                            <div className="border-2 border-dashed border-slate-200 dark:border-zinc-700 rounded-lg p-8 flex flex-col items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer relative">
                                <input
                                    type="file"
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    accept="image/*"
                                    capture="environment" // Forces camera on mobile
                                    onChange={(e) => {
                                        const file = e.target.files?.[0]
                                        if (file) {
                                            setPhotoUrl(URL.createObjectURL(file)) // Local preview
                                        }
                                    }}
                                />
                                {photoUrl ? (
                                    <div className="relative h-40 w-full">
                                        <Image src={photoUrl} fill className="object-contain rounded" alt="Preview" unoptimized />
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            className="absolute bottom-[-10px] right-2"
                                            onClick={(e) => { e.stopPropagation(); e.preventDefault(); setPhotoUrl(undefined); }}
                                        >
                                            Remover
                                        </Button>
                                    </div>
                                ) : (
                                    <>
                                        <Camera className="h-10 w-10 text-slate-400" />
                                        <span className="text-sm text-muted-foreground">Toque para tirar foto</span>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>
                                Voltar
                            </Button>
                            <Button className="flex-[2] bg-red-600 hover:bg-red-700 text-white" onClick={handleSubmit}>
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Confirmar Reporte
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
