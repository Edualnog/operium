"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { acceptLegalDocuments, checkLegalStatus, LegalStatus } from "@/lib/actions-legal"
import { LEGAL_CONTENT } from "@/lib/legal-constants"
import ReactMarkdown from "react-markdown"
import { AlertCircle, FileText, Lock, Shield } from "lucide-react"
import { toast } from "sonner"

export function LegalAgreementModal() {
    const [isOpen, setIsOpen] = useState(false)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)

    const [agreements, setAgreements] = useState({
        terms: false,
        privacy: false,
        data: false
    })

    const [activeTab, setActiveTab] = useState("terms")

    useEffect(() => {
        checkStatus()
    }, [])

    async function checkStatus() {
        try {
            const status = await checkLegalStatus()
            if (!status.allAccepted) {
                setIsOpen(true)
            }
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    async function handleAccept() {
        setSubmitting(true)
        try {
            await acceptLegalDocuments()
            setIsOpen(false)
            toast.success("Documentos aceitos com sucesso!")
        } catch (e) {
            toast.error("Erro ao salvar aceite. Tente novamente.")
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) return null // Or a small spinner, but cleaner strictly to show nothing until known

    const allChecked = agreements.terms && agreements.privacy && agreements.data

    return (
        <Dialog open={isOpen} onOpenChange={() => { }}>
            <DialogContent className="max-w-3xl h-[85vh] flex flex-col sm:max-h-[700px] gap-0 p-0 [&>button]:hidden overflow-hidden border-zinc-200 shadow-xl">
                <DialogHeader className="p-4 sm:p-5 pb-3 border-b border-zinc-100 bg-white">
                    <DialogTitle className="text-lg sm:text-xl font-serif font-medium flex items-center gap-2 text-zinc-900">
                        <Shield className="w-5 h-5 text-zinc-900" strokeWidth={1.5} />
                        Atualização de Termos e Privacidade
                    </DialogTitle>
                    <DialogDescription className="text-zinc-500 mt-1.5 text-xs sm:text-sm font-light leading-relaxed">
                        Para continuar usando o Operium, precisamos que você leia e aceite nossos documentos alinhados à LGPD.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-white">
                    <div className="w-full md:w-56 p-3 sm:p-4 border-r border-zinc-100 bg-zinc-50/50 space-y-4">
                        <div>
                            <h3 className="font-medium text-[10px] uppercase tracking-wider text-zinc-400 mb-2 px-1.5">Documentos Pendentes</h3>

                            <Tabs value={activeTab} onValueChange={setActiveTab} orientation="vertical" className="w-full">
                                <TabsList className="flex flex-col h-auto bg-transparent gap-0.5 p-0">
                                    <TabsTrigger
                                        value="terms"
                                        className="w-full justify-start gap-1.5 px-2 py-1.5 text-zinc-600 data-[state=active]:bg-zinc-200/50 data-[state=active]:text-zinc-900 hover:bg-zinc-100 transition-colors rounded-md font-medium text-xs"
                                    >
                                        <FileText className="w-3.5 h-3.5" /> Termos de Uso
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="privacy"
                                        className="w-full justify-start gap-1.5 px-2 py-1.5 text-zinc-600 data-[state=active]:bg-zinc-200/50 data-[state=active]:text-zinc-900 hover:bg-zinc-100 transition-colors rounded-md font-medium text-xs"
                                    >
                                        <Lock className="w-3.5 h-3.5" /> Privacidade
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="data"
                                        className="w-full justify-start gap-1.5 px-2 py-1.5 text-zinc-600 data-[state=active]:bg-zinc-200/50 data-[state=active]:text-zinc-900 hover:bg-zinc-100 transition-colors rounded-md font-medium text-xs"
                                    >
                                        <AlertCircle className="w-3.5 h-3.5" /> Data & Analytics
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>

                        <div className="space-y-2.5 pt-3 border-t border-zinc-100">
                            <h3 className="font-medium text-[10px] uppercase tracking-wider text-zinc-400 mb-2 px-1.5">Confirmação</h3>

                            <div className="flex items-start space-x-2 px-1.5">
                                <Checkbox
                                    id="check-terms"
                                    checked={agreements.terms}
                                    onCheckedChange={(c) => setAgreements(prev => ({ ...prev, terms: !!c }))}
                                    className="data-[state=checked]:bg-zinc-900 data-[state=checked]:border-zinc-900 border-zinc-300 mt-0.5 shadow-none h-3.5 w-3.5"
                                />
                                <Label htmlFor="check-terms" className="text-[11px] sm:text-xs text-zinc-600 font-normal leading-tight cursor-pointer select-none">
                                    Li e concordo com os <span className="font-medium text-zinc-900">Termos de Uso</span>
                                </Label>
                            </div>

                            <div className="flex items-start space-x-2 px-1.5">
                                <Checkbox
                                    id="check-privacy"
                                    checked={agreements.privacy}
                                    onCheckedChange={(c) => setAgreements(prev => ({ ...prev, privacy: !!c }))}
                                    className="data-[state=checked]:bg-zinc-900 data-[state=checked]:border-zinc-900 border-zinc-300 mt-0.5 shadow-none h-3.5 w-3.5"
                                />
                                <Label htmlFor="check-privacy" className="text-[11px] sm:text-xs text-zinc-600 font-normal leading-tight cursor-pointer select-none">
                                    Li e concordo com a <span className="font-medium text-zinc-900">Política de Privacidade</span>
                                </Label>
                            </div>

                            <div className="flex items-start space-x-2 px-1.5">
                                <Checkbox
                                    id="check-data"
                                    checked={agreements.data}
                                    onCheckedChange={(c) => setAgreements(prev => ({ ...prev, data: !!c }))}
                                    className="data-[state=checked]:bg-zinc-900 data-[state=checked]:border-zinc-900 border-zinc-300 mt-0.5 shadow-none h-3.5 w-3.5"
                                />
                                <Label htmlFor="check-data" className="text-[11px] sm:text-xs text-zinc-600 font-normal leading-tight cursor-pointer select-none">
                                    Li e concordo com a <span className="font-medium text-zinc-900">Política de Dados</span>
                                </Label>
                            </div>
                        </div>

                    </div>

                    <div className="flex-1 overflow-hidden bg-white relative">
                        <ScrollArea className="h-full w-full p-4 sm:p-6 md:p-8">
                            <article className="prose prose-zinc prose-xs sm:prose-sm max-w-none prose-headings:font-serif prose-headings:font-medium prose-headings:text-sm prose-p:text-zinc-600 prose-p:text-xs prose-p:leading-relaxed prose-strong:text-zinc-900 prose-strong:font-medium prose-li:text-xs prose-li:leading-relaxed">
                                <Tabs value={activeTab}>
                                    <TabsContent value="terms" className="mt-0 animate-in fade-in duration-500">
                                        <ReactMarkdown>{LEGAL_CONTENT.TERMS}</ReactMarkdown>
                                    </TabsContent>
                                    <TabsContent value="privacy" className="mt-0 animate-in fade-in duration-500">
                                        <ReactMarkdown>{LEGAL_CONTENT.PRIVACY}</ReactMarkdown>
                                    </TabsContent>
                                    <TabsContent value="data" className="mt-0 animate-in fade-in duration-500">
                                        <ReactMarkdown>{LEGAL_CONTENT.DATA_POLICY}</ReactMarkdown>
                                    </TabsContent>
                                </Tabs>
                            </article>
                            <div className="h-12" /> {/* Spacer for scroll */}
                        </ScrollArea>
                    </div>
                </div>

                <DialogFooter className="p-3 sm:p-4 bg-white border-t border-zinc-100 flex flex-col sm:flex-row items-center justify-between gap-2">
                    <div className="text-[10px] sm:text-xs text-zinc-400 font-light text-center sm:text-left">
                        Ao continuar, você confirma que leu todos os documentos.
                    </div>
                    <Button
                        onClick={handleAccept}
                        disabled={!allChecked || submitting}
                        className="w-full sm:w-auto bg-zinc-900 hover:bg-zinc-800 text-white font-medium px-6 sm:px-8 shadow-sm transition-all text-xs sm:text-sm"
                        size="default"
                    >
                        {submitting ? "Processando..." : "Confirmar e Continuar"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
