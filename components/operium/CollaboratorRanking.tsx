"use client"

import { useState, useEffect } from "react"
import { Star, ChevronDown, ChevronUp, Trophy, Medal, Award, User } from "lucide-react"
import { getFullRanking, RankingCollaborator } from "@/app/app/actions"

interface CollaboratorRankingProps {
    currentScore: number | null
    currentPercentile: number | null
}

/**
 * Expandable ranking component for field app
 * Shows current user's score with option to view full ranking
 */
export function CollaboratorRanking({ currentScore, currentPercentile }: CollaboratorRankingProps) {
    const [isExpanded, setIsExpanded] = useState(false)
    const [ranking, setRanking] = useState<RankingCollaborator[]>([])
    const [loading, setLoading] = useState(false)

    // Fetch ranking when expanded
    useEffect(() => {
        if (isExpanded && ranking.length === 0) {
            setLoading(true)
            getFullRanking()
                .then(data => setRanking(data))
                .finally(() => setLoading(false))
        }
    }, [isExpanded, ranking.length])

    if (currentScore === null) return null

    const getMedalIcon = (position: number) => {
        switch (position) {
            case 1:
                return <Trophy className="h-5 w-5 text-yellow-500" />
            case 2:
                return <Medal className="h-5 w-5 text-gray-400" />
            case 3:
                return <Award className="h-5 w-5 text-amber-600" />
            default:
                return <span className="w-5 h-5 flex items-center justify-center text-[12px] font-bold text-neutral-400">#{position}</span>
        }
    }

    const getPositionBg = (position: number, isCurrentUser: boolean) => {
        if (isCurrentUser) return "bg-blue-50 border-blue-200"
        switch (position) {
            case 1: return "bg-yellow-50 border-yellow-200"
            case 2: return "bg-gray-50 border-gray-200"
            case 3: return "bg-amber-50 border-amber-200"
            default: return "bg-white border-neutral-100"
        }
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
            {/* Header - Always visible */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-4 py-3 flex items-center justify-between active:bg-neutral-50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 rounded-full">
                        <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                        <span className="text-[14px] font-bold text-amber-700">
                            {currentScore}
                        </span>
                    </div>
                    {currentPercentile !== null && currentPercentile <= 25 && (
                        <span className="text-[12px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                            Top {currentPercentile}%
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1.5 text-neutral-400">
                    <span className="text-[13px] font-medium">
                        {isExpanded ? "Fechar" : "Ver ranking"}
                    </span>
                    {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                    ) : (
                        <ChevronDown className="h-4 w-4" />
                    )}
                </div>
            </button>

            {/* Expanded ranking list */}
            {isExpanded && (
                <div className="border-t border-neutral-100 animate-in slide-in-from-top-2 duration-200">
                    {/* Title */}
                    <div className="px-4 py-2 bg-neutral-50 flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-amber-500" />
                        <span className="text-[13px] font-semibold text-neutral-700">
                            Ranking de Colaboradores
                        </span>
                    </div>

                    {/* Loading state */}
                    {loading && (
                        <div className="py-8 flex items-center justify-center">
                            <div className="h-5 w-5 border-2 border-neutral-200 border-t-neutral-500 rounded-full animate-spin" />
                        </div>
                    )}

                    {/* Ranking list */}
                    {!loading && ranking.length > 0 && (
                        <div className="max-h-[300px] overflow-y-auto overscroll-contain">
                            {ranking.map((colaborador, index) => (
                                <div
                                    key={colaborador.id}
                                    className={`flex items-center gap-3 px-4 py-2.5 border-b transition-colors ${getPositionBg(colaborador.position, colaborador.is_current_user)}`}
                                >
                                    {/* Position */}
                                    {getMedalIcon(colaborador.position)}

                                    {/* Avatar */}
                                    <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                        {colaborador.photo_url ? (
                                            <img
                                                src={colaborador.photo_url}
                                                alt={colaborador.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <User className="h-4 w-4 text-neutral-400" />
                                        )}
                                    </div>

                                    {/* Name */}
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-[14px] font-medium truncate ${colaborador.is_current_user ? 'text-blue-700' : 'text-neutral-900'}`}>
                                            {colaborador.name}
                                            {colaborador.is_current_user && (
                                                <span className="ml-1.5 text-[11px] font-semibold text-blue-500">(você)</span>
                                            )}
                                        </p>
                                    </div>

                                    {/* Score */}
                                    <div className="flex-shrink-0">
                                        <span className={`text-[15px] font-bold ${colaborador.is_current_user ? 'text-blue-700' : 'text-neutral-700'}`}>
                                            {colaborador.score}
                                        </span>
                                        <span className="text-[11px] text-neutral-400 ml-0.5">pts</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Empty state */}
                    {!loading && ranking.length === 0 && (
                        <div className="py-8 text-center">
                            <p className="text-[13px] text-neutral-400">
                                Nenhum colaborador encontrado
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
