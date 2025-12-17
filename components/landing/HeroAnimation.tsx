"use client"

import { motion } from "framer-motion"

export function HeroAnimation() {
    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.3,
            },
        },
    }

    const item = {
        hidden: { opacity: 0, y: 10 },
        show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 50 } as any },
    }

    return (
        <div className="w-full aspect-video bg-[#F7F7F5] rounded-xl border border-slate-200 overflow-hidden relative shadow-sm flex select-none">
            {/* Sidebar */}
            <div className="w-16 sm:w-48 h-full bg-[#f0f0f0] border-r border-slate-200 p-3 hidden sm:flex flex-col gap-3">
                <div className="w-8 h-8 rounded-md bg-white border border-slate-200 mb-2" />
                <div className="h-4 w-24 rounded bg-slate-200 mb-6" />

                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-6 w-full rounded bg-transparent hover:bg-slate-200/50 flex items-center gap-2">
                        <div className="w-4 h-4 rounded-sm bg-slate-300/50" />
                        <div className="h-2 w-16 bg-slate-300/50 rounded" />
                    </div>
                ))}
            </div>

            {/* Main Content */}
            <div className="flex-1 p-4 sm:p-8 flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div className="h-6 w-32 bg-slate-900/10 rounded" />
                    <div className="flex gap-2">
                        <div className="h-6 w-6 rounded-full bg-slate-200" />
                        <div className="h-6 w-6 rounded-full bg-slate-200" />
                    </div>
                </div>

                {/* Stats Grid */}
                <motion.div
                    className="grid grid-cols-3 gap-4 mb-8"
                    variants={container}
                    initial="hidden"
                    animate="show"
                >
                    {[1, 2, 3].map((i) => (
                        <motion.div
                            key={i}
                            variants={item}
                            className="h-20 rounded-lg border border-slate-200 bg-white p-3 shadow-sm flex flex-col justify-between"
                        >
                            <div className="w-6 h-6 rounded bg-slate-100" />
                            <div className="h-4 w-12 bg-slate-200 rounded" />
                        </motion.div>
                    ))}
                </motion.div>

                {/* List/Table */}
                <motion.div
                    className="space-y-3 flex-1"
                    variants={container}
                    initial="hidden"
                    animate="show"
                >
                    <div className="flex gap-4 mb-2 border-b border-slate-100 pb-2">
                        <div className="h-3 w-1/4 bg-slate-200 rounded" />
                        <div className="h-3 w-1/4 bg-slate-200 rounded" />
                        <div className="h-3 w-1/4 bg-slate-200 rounded" />
                    </div>

                    {[1, 2, 3, 4].map((i) => (
                        <motion.div
                            key={i}
                            variants={item}
                            className="h-10 w-full bg-white border border-slate-100 rounded flex items-center px-4 gap-4"
                        >
                            <div className="w-4 h-4 rounded bg-slate-100" />
                            <div className="h-2 w-1/4 bg-slate-100 rounded" />
                            <div className="h-2 w-1/4 bg-slate-100 rounded" />
                            <div className="h-2 w-12 bg-blue-100 rounded ml-auto" />
                        </motion.div>
                    ))}

                    {/* Animated Cursor or "Live" Element */}
                    <motion.div
                        initial={{ opacity: 0, x: 20, y: 50 }}
                        animate={{ opacity: 1, x: 150, y: 100 }}
                        transition={{ duration: 2, delay: 1, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
                        className="absolute pointer-events-none z-10"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 3L10.07 19.97L12.58 12.58L19.97 10.07L3 3Z" fill="#37352f" stroke="white" strokeWidth="2" strokeLinejoin="round" />
                        </svg>
                    </motion.div>
                </motion.div>
            </div>
        </div>
    )
}
