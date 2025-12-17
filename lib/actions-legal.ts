"use server"

import { createServerComponentClient } from "@/lib/supabase-server"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { AGREEMENT_TYPES, LEGAL_VERSIONS } from "./legal-constants"

export interface LegalStatus {
    hasAcceptedTerms: boolean
    hasAcceptedPrivacy: boolean
    hasAcceptedDataPolicy: boolean
    allAccepted: boolean
}

// ============================================
// RATE LIMITER (In-Memory, per-instance)
// ============================================
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 5 // Max 5 acceptance attempts per minute

function checkRateLimit(userId: string): boolean {
    const now = Date.now()
    const entry = rateLimitMap.get(userId)

    if (!entry || now > entry.resetAt) {
        rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
        return true
    }

    if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
        return false // Rate limited
    }

    entry.count++
    return true
}

// ============================================
// IP EXTRACTION (Vercel/Cloudflare compatible)
// ============================================
function getClientIp(headersList: Headers): string {
    // Priority order for reliable IP detection:
    // 1. x-real-ip (Vercel's trusted header)
    // 2. cf-connecting-ip (Cloudflare)
    // 3. x-forwarded-for (first IP in chain)
    // 4. Fallback
    const realIp = headersList.get('x-real-ip')
    if (realIp) return realIp

    const cfIp = headersList.get('cf-connecting-ip')
    if (cfIp) return cfIp

    const forwardedFor = headersList.get('x-forwarded-for')
    if (forwardedFor) {
        // x-forwarded-for can be "client, proxy1, proxy2" - take the first
        return forwardedFor.split(',')[0].trim()
    }

    return 'unknown'
}

// ============================================
// STRUCTURED LOGGING
// ============================================
function logLegalEvent(
    event: 'LEGAL_ACCEPT_SUCCESS' | 'LEGAL_ACCEPT_FAILURE' | 'LEGAL_RATE_LIMITED',
    userId: string,
    meta?: Record<string, unknown>
) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        event,
        userId: userId.substring(0, 8) + '...', // Partial ID for privacy
        ...meta
    }

    if (event === 'LEGAL_ACCEPT_FAILURE' || event === 'LEGAL_RATE_LIMITED') {
        console.error('[LEGAL_AUDIT]', JSON.stringify(logEntry))
    } else {
        console.log('[LEGAL_AUDIT]', JSON.stringify(logEntry))
    }
}

// ============================================
// MAIN FUNCTIONS
// ============================================

export async function checkLegalStatus(): Promise<LegalStatus> {
    const supabase = await createServerComponentClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return {
            hasAcceptedTerms: false,
            hasAcceptedPrivacy: false,
            hasAcceptedDataPolicy: false,
            allAccepted: false
        }
    }

    const { data: agreements } = await supabase
        .from('legal_agreements')
        .select('agreement_type, version')
        .eq('profile_id', user.id)

    const hasAccepted = (type: string, version: string) => {
        return !!agreements?.some(a => a.agreement_type === type && a.version === version)
    }

    const status = {
        hasAcceptedTerms: hasAccepted(AGREEMENT_TYPES.TERMS, LEGAL_VERSIONS.TERMS),
        hasAcceptedPrivacy: hasAccepted(AGREEMENT_TYPES.PRIVACY, LEGAL_VERSIONS.PRIVACY),
        hasAcceptedDataPolicy: hasAccepted(AGREEMENT_TYPES.DATA_POLICY, LEGAL_VERSIONS.DATA_POLICY),
    }

    return {
        ...status,
        allAccepted: status.hasAcceptedTerms && status.hasAcceptedPrivacy && status.hasAcceptedDataPolicy
    }
}

export async function acceptLegalDocuments() {
    const supabase = await createServerComponentClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error("Unauthorized")

    // Rate Limiting Check
    if (!checkRateLimit(user.id)) {
        logLegalEvent('LEGAL_RATE_LIMITED', user.id)
        throw new Error("Too many requests. Please wait a moment.")
    }

    const headersList = headers()
    const ip = getClientIp(headersList)
    const userAgent = headersList.get('user-agent') || 'unknown'

    // Insert agreements individually to allow granular tracking
    const insertions = [
        {
            profile_id: user.id,
            agreement_type: AGREEMENT_TYPES.TERMS,
            version: LEGAL_VERSIONS.TERMS,
            ip_address: ip,
            user_agent: userAgent
        },
        {
            profile_id: user.id,
            agreement_type: AGREEMENT_TYPES.PRIVACY,
            version: LEGAL_VERSIONS.PRIVACY,
            ip_address: ip,
            user_agent: userAgent
        },
        {
            profile_id: user.id,
            agreement_type: AGREEMENT_TYPES.DATA_POLICY,
            version: LEGAL_VERSIONS.DATA_POLICY,
            ip_address: ip,
            user_agent: userAgent
        }
    ]

    const { error } = await supabase
        .from('legal_agreements')
        .upsert(insertions, { onConflict: 'profile_id, agreement_type, version' })

    if (error) {
        logLegalEvent('LEGAL_ACCEPT_FAILURE', user.id, {
            error: error.message,
            code: error.code
        })
        throw new Error("Failed to save acceptance")
    }

    logLegalEvent('LEGAL_ACCEPT_SUCCESS', user.id, {
        ip,
        versions: {
            terms: LEGAL_VERSIONS.TERMS,
            privacy: LEGAL_VERSIONS.PRIVACY,
            data: LEGAL_VERSIONS.DATA_POLICY
        }
    })

    revalidatePath('/dashboard')
    return { success: true }
}
