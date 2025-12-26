import { NextRequest, NextResponse } from "next/server"
import { createServerComponentClient } from "@/lib/supabase-server"
import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3"

// CRITICAL: Only founder can access
const FOUNDER_EMAIL = process.env.FOUNDER_EMAIL || "edualnog@gmail.com"

// Cloudflare R2 credentials (S3-compatible)
const R2_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "operium-telemetry-raw"

// Create S3 client for R2
function getR2Client() {
    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
        return null
    }

    return new S3Client({
        region: "auto",
        endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: R2_ACCESS_KEY_ID,
            secretAccessKey: R2_SECRET_ACCESS_KEY,
        },
    })
}

// Parse NDJSON content
function parseNDJSON(content: string): any[] {
    return content
        .split("\n")
        .filter(line => line.trim())
        .map(line => {
            try {
                return JSON.parse(line)
            } catch {
                return null
            }
        })
        .filter(Boolean)
}

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
        const limit = parseInt(searchParams.get("limit") || "200")

        const r2Client = getR2Client()

        if (!r2Client) {
            return NextResponse.json({
                success: false,
                date,
                r2_configured: false,
                events: [],
                message: "R2 não configurado. Configure CLOUDFLARE_ACCOUNT_ID, R2_ACCESS_KEY_ID e R2_SECRET_ACCESS_KEY.",
                total: 0
            })
        }

        // List objects for the given date
        // Pattern: orgs/{org_id}/date={YYYY-MM-DD}/hour={HH}/...
        const listCommand = new ListObjectsV2Command({
            Bucket: R2_BUCKET_NAME,
            Prefix: `orgs/`,
            MaxKeys: 100,
        })

        const listResult = await r2Client.send(listCommand)
        const objects = listResult.Contents || []

        // Filter objects by date
        const datePattern = `date=${date}`
        const matchingObjects = objects.filter(obj =>
            obj.Key?.includes(datePattern)
        )

        console.log(`[Telemetry API] Found ${matchingObjects.length} objects for date ${date}`)

        // Fetch and parse events from matching objects
        const allEvents: any[] = []

        for (const obj of matchingObjects.slice(0, 10)) { // Limit to 10 files
            if (!obj.Key) continue

            try {
                const getCommand = new GetObjectCommand({
                    Bucket: R2_BUCKET_NAME,
                    Key: obj.Key,
                })

                const getResult = await r2Client.send(getCommand)
                const content = await getResult.Body?.transformToString()

                if (content) {
                    const events = parseNDJSON(content)
                    allEvents.push(...events)
                }
            } catch (err) {
                console.error(`Error fetching ${obj.Key}:`, err)
            }
        }

        // Sort by timestamp descending and limit
        const sortedEvents = allEvents
            .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
            .slice(0, limit)

        return NextResponse.json({
            success: true,
            date,
            r2_configured: true,
            events: sortedEvents,
            message: `${sortedEvents.length} eventos encontrados para ${date}`,
            total: sortedEvents.length,
            files_scanned: matchingObjects.length
        })
    } catch (error: any) {
        console.error("Telemetry API error:", error)
        return NextResponse.json(
            {
                error: error.message || "Internal error",
                success: false,
                events: [],
                r2_configured: true
            },
            { status: 500 }
        )
    }
}
