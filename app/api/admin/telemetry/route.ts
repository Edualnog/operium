import { NextRequest, NextResponse } from "next/server"
import { createServerComponentClient } from "@/lib/supabase-server"

// CRITICAL: Only founder can access
const FOUNDER_EMAIL = process.env.FOUNDER_EMAIL || "edualnog@gmail.com"

// Cloudflare R2 credentials
const R2_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "operium-telemetry-raw"

export async function GET(request: NextRequest) {
    try {
        // Verify authentication
        const supabase = await createServerComponentClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user || user.email !== FOUNDER_EMAIL) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Get query parameters
        const searchParams = request.nextUrl.searchParams
        const date = searchParams.get("date") || new Date().toISOString().split("T")[0]
        const limit = parseInt(searchParams.get("limit") || "100")

        // For now, return mock data since R2 API requires S3-compatible SDK
        // TODO: Implement actual R2 fetching with @aws-sdk/client-s3
        const mockEvents = [
            {
                event_id: "mock-1",
                ts: new Date().toISOString(),
                event_name: "MOVEMENT_CHECKOUT",
                entity_type: "movement",
                props: {
                    quantidade: 2,
                    org_industry: "CONSTRUCTION",
                    org_size: "MEDIUM"
                }
            },
            {
                event_id: "mock-2",
                ts: new Date(Date.now() - 3600000).toISOString(),
                event_name: "COLLABORATOR_CREATED",
                entity_type: "collaborator",
                props: {
                    nome: "João Silva",
                    role_function: "Eletricista",
                    org_industry: "CONSTRUCTION",
                    org_size: "MEDIUM"
                }
            }
        ]

        // Return info about R2 setup needed
        const r2Configured = !!(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY)

        return NextResponse.json({
            success: true,
            date,
            r2_configured: r2Configured,
            events: r2Configured ? [] : mockEvents,
            message: r2Configured
                ? "R2 configurado. Implemente fetch real com @aws-sdk/client-s3"
                : "R2 não configurado. Mostrando dados de exemplo. Configure R2_ACCESS_KEY_ID e R2_SECRET_ACCESS_KEY.",
            total: mockEvents.length
        })
    } catch (error: any) {
        console.error("Telemetry API error:", error)
        return NextResponse.json(
            { error: error.message || "Internal error" },
            { status: 500 }
        )
    }
}
