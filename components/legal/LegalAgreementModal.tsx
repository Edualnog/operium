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
            <DialogContent className="max-w-4xl h-[90vh] flex flex-col sm:max-h-[800px] gap-0 p-0 [&>button]:hidden overflow-hidden border-zinc-200 shadow-xl">
                <DialogHeader className="p-6 pb-4 border-b border-zinc-100 bg-white">
                    <DialogTitle className="text-2xl font-serif font-medium flex items-center gap-3 text-zinc-900">
                        <Shield className="w-6 h-6 text-zinc-900" strokeWidth={1.5} />
                        Atualização de Termos e Privacidade
                    </DialogTitle>
                    <DialogDescription className="text-zinc-500 mt-2 text-sm font-light">
                        Para continuar usando o Almox Fácil com segurança e transparência, precisamos que você leia e aceite nossos novos documentos alinhados à LGPD e práticas industriais.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-white">
                    <div className="w-full md:w-64 p-4 border-r border-zinc-100 bg-zinc-50/50 space-y-6">
                        <div>
                            <h3 className="font-medium text-xs uppercase tracking-wider text-zinc-400 mb-3 px-2">Documentos Pendentes</h3>

                            <Tabs value={activeTab} onValueChange={setActiveTab} orientation="vertical" className="w-full">
                                <TabsList className="flex flex-col h-auto bg-transparent gap-1 p-0">
                                    <TabsTrigger
                                        value="terms"
                                        className="w-full justify-start gap-2 px-3 py-2 text-zinc-600 data-[state=active]:bg-zinc-200/50 data-[state=active]:text-zinc-900 hover:bg-zinc-100 transition-colors rounded-md font-medium text-sm"
                                    >
                                        <FileText className="w-4 h-4" /> Termos de Uso
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="privacy"
                                        className="w-full justify-start gap-2 px-3 py-2 text-zinc-600 data-[state=active]:bg-zinc-200/50 data-[state=active]:text-zinc-900 hover:bg-zinc-100 transition-colors rounded-md font-medium text-sm"
                                    >
                                        <Lock className="w-4 h-4" /> Privacidade
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="data"
                                        className="w-full justify-start gap-2 px-3 py-2 text-zinc-600 data-[state=active]:bg-zinc-200/50 data-[state=active]:text-zinc-900 hover:bg-zinc-100 transition-colors rounded-md font-medium text-sm"
                                    >
                                        <AlertCircle className="w-4 h-4" /> Data & Analytcs
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-zinc-100">
                            <h3 className="font-medium text-xs uppercase tracking-wider text-zinc-400 mb-3 px-2">Confirmação</h3>

                            <div className="flex items-start space-x-3 px-2">
                                <Checkbox
                                    id="check-terms"
                                    checked={agreements.terms}
                                    onCheckedChange={(c) => setAgreements(prev => ({ ...prev, terms: !!c }))}
                                    className="data-[state=checked]:bg-zinc-900 data-[state=checked]:border-zinc-900 border-zinc-300 mt-0.5 shadow-none"
                                />
                                <Label htmlFor="check-terms" className="text-sm text-zinc-600 font-normal leading-snug cursor-pointer select-none">
                                    Li e concordo com os <span className="font-medium text-zinc-900">Termos de Uso</span>
                                </Label>
                            </div>

                            <div className="flex items-start space-x-3 px-2">
                                <Checkbox
                                    id="check-privacy"
                                    checked={agreements.privacy}
                                    onCheckedChange={(c) => setAgreements(prev => ({ ...prev, privacy: !!c }))}
                                    className="data-[state=checked]:bg-zinc-900 data-[state=checked]:border-zinc-900 border-zinc-300 mt-0.5 shadow-none"
                                />
                                <Label htmlFor="check-privacy" className="text-sm text-zinc-600 font-normal leading-snug cursor-pointer select-none">
                                    Li e concordo com a <span className="font-medium text-zinc-900">Política de Privacidade</span>
                                </Label>
                            </div>

                            <div className="flex items-start space-x-3 px-2">
                                <Checkbox
                                    id="check-data"
                                    checked={agreements.data}
                                    onCheckedChange={(c) => setAgreements(prev => ({ ...prev, data: !!c }))}
                                    className="data-[state=checked]:bg-zinc-900 data-[state=checked]:border-zinc-900 border-zinc-300 mt-0.5 shadow-none"
                                />
                                <Label htmlFor="check-data" className="text-sm text-zinc-600 font-normal leading-snug cursor-pointer select-none">
                                    Li e concordo com a <span className="font-medium text-zinc-900">Política de Dados</span>
                                </Label>
                            </div>
                        </div>

                    </div>

                    <div className="flex-1 overflow-hidden bg-white relative">
                        <ScrollArea className="h-full w-full p-8 md:p-10">
                            <article className="prose prose-zinc prose-sm max-w-none prose-headings:font-serif prose-headings:font-medium prose-p:text-zinc-600 prose-strong:text-zinc-900 prose-strong:font-medium">
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
                            <div className="h-20" /> {/* Spacer for scroll */}
                        </ScrollArea>
                    </div>
                </div>

                <DialogFooter className="p-6 bg-white border-t border-zinc-100 flex items-center justify-between">
                    <div className="text-xs text-zinc-400 font-light hidden sm:block">
                        Ao continuar, você confirma que leu todos os documentos.
                    </div>
                    <Button
                        onClick={handleAccept}
                        disabled={!allChecked || submitting}
                        className="w-full md:w-auto bg-zinc-900 hover:bg-zinc-800 text-white font-medium px-8 shadow-sm transition-all"
                        size="lg"
                    >
                        {submitting ? "Processando..." : "Confirmar e Continuar"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
