"use client"

import { motion } from "framer-motion"
import { useEffect, useState } from "react"
import { Check, Plus, Search, BarChart3, Package, ArrowUpRight } from "lucide-react"

export function HeroAnimation() {
    const [step, setStep] = useState(0)

    // Cycle through animation steps
    useEffect(() => {
        const timer = setInterval(() => {
            setStep((prev) => (prev + 1) % 4)
        }, 4000)
        return () => clearInterval(timer)
    }, [])

    return (
        <div className="w-full aspect-video bg-white rounded-xl border border-slate-200 overflow-hidden relative shadow-sm flex select-none font-sans">
            {/* Sidebar */}
            <div className="w-16 sm:w-48 h-full bg-[#F7F7F5] border-r border-slate-200 p-3 hidden sm:flex flex-col gap-3">
                <div className="flex items-center gap-2 px-2 mb-4">
                    <div className="w-6 h-6 rounded-md bg-zinc-800 flex items-center justify-center shadow-sm">
                        <Package className="w-3 h-3 text-white" />
                    </div>
                    <div className="h-3 w-20 rounded-full bg-zinc-200" />
                </div>

                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className={`h-8 w-full rounded-md flex items-center gap-3 px-2 transition-colors duration-300 ${i === 1 ? 'bg-white shadow-sm border border-slate-200' : 'hover:bg-slate-200/50'}`}>
                        <div className={`w-4 h-4 rounded ${i === 1 ? 'text-zinc-800' : 'text-zinc-300'}`}>
                            <div className={`w-full h-full rounded ${i === 1 ? 'bg-zinc-800' : 'bg-zinc-300'} opacity-20`} />
                        </div>
                        <div className={`h-2 rounded-full w-16 ${i === 1 ? 'bg-zinc-600' : 'bg-zinc-200'}`} />
                    </div>
                ))}
            </div>

            {/* Main Content */}
            <div className="flex-1 p-2 sm:p-4 md:p-6 flex flex-col bg-white relative">
                {/* Header Mockup */}
                <div className="flex justify-between items-center mb-4 sm:mb-8">
                    <div className="hidden sm:flex items-center gap-3 bg-white rounded-lg p-2 px-3 border border-slate-200 w-64 shadow-sm">
                        <Search className="w-3 h-3 text-zinc-400" />
                        <div className="h-2 w-24 bg-zinc-100 rounded-full" />
                    </div>
                    <div className="flex gap-2 ml-auto">
                        <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-zinc-100 border border-zinc-200" />
                    </div>
                </div>

                {/* Dashboard Stats */}
                <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-8">
                    {[
                        { label: "Total", val: "1.240", color: "bg-zinc-50 text-zinc-600 border-zinc-100" },
                        { label: "Saídas", val: "42", color: "bg-zinc-50 text-zinc-600 border-zinc-100" },
                        { label: "Alertas", val: "3", color: "bg-zinc-50 text-zinc-600 border-zinc-100" }
                    ].map((stat, i) => (
                        <div key={i} className="p-2 sm:p-3 rounded-lg sm:rounded-xl border border-slate-200 bg-white hover:bg-zinc-50 transition-colors flex flex-col gap-1 sm:gap-2">
                            <div className="flex justify-between items-start">
                                <div className={`w-5 h-5 sm:w-8 sm:h-8 rounded-md sm:rounded-lg flex items-center justify-center border border-zinc-200 bg-white text-zinc-600`}>
                                    <BarChart3 className="w-2.5 h-2.5 sm:w-4 sm:h-4" />
                                </div>
                                {i === 1 && (
                                    <motion.div
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        key={step}
                                        className="text-[8px] sm:text-[10px] font-bold text-zinc-600 bg-zinc-100 percent-badge px-1.5 sm:px-2 py-0.5 rounded-full flex items-center gap-0.5 border border-zinc-200"
                                    >
                                        <ArrowUpRight className="w-2 h-2" /> +2
                                    </motion.div>
                                )}
                            </div>
                            <div className="space-y-1 sm:space-y-2 mt-0.5 sm:mt-1">
                                <div className="h-1.5 sm:h-2 w-6 sm:w-8 bg-zinc-200 rounded-full" />
                                <div className="h-2 sm:h-3 w-10 sm:w-16 bg-zinc-100 rounded-full" />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Live List */}
                <div className="flex-1 border border-slate-200 rounded-xl overflow-hidden flex flex-col">
                    <div className="bg-[#F7F7F5] border-b border-slate-200 p-3 flex gap-4">
                        <div className="h-2 w-20 bg-zinc-300 rounded-full" />
                        <div className="h-2 w-20 bg-zinc-200 rounded-full" />
                        <div className="h-2 w-20 bg-zinc-200 rounded-full ml-auto" />
                    </div>

                    <div className="p-2 space-y-2 relative overflow-hidden">
                        {/* New Item Animation */}
                        <motion.div
                            initial={{ height: 0, opacity: 0, scale: 0.95 }}
                            animate={step >= 2 ? { height: 48, opacity: 1, scale: 1 } : { height: 0, opacity: 0, scale: 0.95 }}
                            transition={{ type: "spring", stiffness: 100, damping: 15 }}
                            className="bg-zinc-50 border border-zinc-200 rounded-lg flex items-center px-3 gap-3 overflow-hidden"
                        >
                            <div className="w-8 h-8 rounded-full bg-white border border-zinc-200 flex items-center justify-center flex-shrink-0">
                                <motion.div
                                    className="w-4 h-4 bg-zinc-800 rounded-full"
                                    animate={{ scale: [1, 1.2, 1] }}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                />
                            </div>
                            <div className="space-y-2 flex-1">
                                <div className="h-2 w-32 bg-zinc-300 rounded-full" />
                                <div className="h-2 w-20 bg-zinc-200 rounded-full" />
                            </div>
                            <div className="h-2 w-16 bg-zinc-200 rounded-full ml-auto" />
                        </motion.div>


                        {[1, 2, 3].map((row) => (
                            <div key={row} className="h-12 border border-slate-100 rounded-lg flex items-center px-3 gap-3 bg-white">
                                <div className="w-8 h-8 rounded-full bg-zinc-100 flex-shrink-0" />
                                <div className="space-y-2 flex-1">
                                    <div className="h-2 w-28 bg-zinc-100 rounded-full" />
                                    <div className="h-2 w-16 bg-zinc-50 rounded-full" />
                                </div>
                                <div className="h-2 w-12 bg-zinc-50 rounded-full ml-auto" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Floating "Add" Button Mockup */}
                <motion.div
                    animate={step === 1 ? { scale: 0.9 } : { scale: 1 }}
                    className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 w-8 h-8 sm:w-12 sm:h-12 bg-zinc-900 rounded-full shadow-lg shadow-zinc-900/10 flex items-center justify-center z-10 hover:bg-zinc-800 transition-colors"
                >
                    <Plus className="text-white w-4 h-4 sm:w-6 sm:h-6" />
                </motion.div>
            </div>

            {/* Simulated Cursor */}
            <motion.div
                animate={
                    step === 0 ? { x: 50, y: 100, opacity: 1 } :
                        step === 1 ? { x: "88%", y: "88%", opacity: 1 } : // Moves to FAB
                            { x: "50%", y: "40%", opacity: 0 } // Disappears
                }
                transition={{ duration: 1.2, ease: "anticipate" }}
                className="absolute top-0 left-0 pointer-events-none z-50 drop-shadow-xl"
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 3L10.07 19.97L12.58 12.58L19.97 10.07L3 3Z" fill="#18181B" stroke="white" strokeWidth="2" strokeLinejoin="round" />
                </svg>
            </motion.div>

            {/* Success Toast Interaction */}
            <motion.div
                initial={{ y: 50, opacity: 0, x: "-50%" }}
                animate={step === 3 ? { y: 0, opacity: 1, x: "-50%" } : { y: 20, opacity: 0, x: "-50%" }}
                className="absolute bottom-4 sm:bottom-8 left-1/2 bg-zinc-900 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-md shadow-xl flex items-center gap-2 sm:gap-3 text-xs sm:text-sm font-medium z-40 whitespace-nowrap"
            >
                <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-white/20 flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
                </div>
                <span>Produto Registrado</span>
            </motion.div>
        </div>
    )
}
