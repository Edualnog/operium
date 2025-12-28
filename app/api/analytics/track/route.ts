import { NextResponse } from "next/server"
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { telemetry } from '@/lib/telemetry'
import type { AnalyticsEventName } from '@/lib/telemetry/analyticsEvents'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function createApiClient() {
  const cookieStore = await cookies()

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {
            // Cookie already set
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch {
            // Cookie doesn't exist
          }
        },
      },
    }
  )
}

interface AnalyticsEvent {
  event_name: AnalyticsEventName;
  props: Record<string, unknown>;
  timestamp: string;
}

interface TrackRequest {
  events: AnalyticsEvent[];
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as TrackRequest
    const { events } = body

    if (!events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ error: "No events provided" }, { status: 400 })
    }

    // Get user if authenticated (optional - analytics can work without auth)
    const supabase = await createApiClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Process events and forward to telemetry
    const telemetryEvents = events.map(event => ({
      profile_id: user?.id || 'anonymous',
      entity_type: 'generic' as const,
      event_name: event.event_name,
      props: {
        ...event.props,
        client_timestamp: event.timestamp,
      },
      context: {
        flow: 'analytics',
        screen: event.props.page_path as string | undefined,
      },
      privacy: {
        contains_pii: false,
        data_category: 'behavioral' as const,
      },
    }))

    // Send all events in batch
    telemetry.emitBatch(telemetryEvents)

    return NextResponse.json({
      ok: true,
      processed: events.length,
    })
  } catch (error: any) {
    console.error("Analytics track error:", error)
    // Don't expose internal errors, just acknowledge receipt
    return NextResponse.json({ ok: true, processed: 0 })
  }
}
